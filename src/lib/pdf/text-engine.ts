import { init } from '@embedpdf/pdfium';
import fontkit from '@pdf-lib/fontkit';

export type PdfTextRun = {
  index: number; text: string; font: string; size: number;
  bounds: [number, number, number, number]; matrix: number[]; color: string;
};
export type TextInspection = { runs: PdfTextRun[]; skipped: number };

/** Native text-object editing. No white rectangles are used for digital text. */
export async function createTextEngine(wasmBinary: ArrayBuffer | Uint8Array) {
  const api = await init({ wasmBinary });
  api.PDFiumExt_Init();
  const mem = api.pdfium as typeof api.pdfium & { HEAPU8: Uint8Array }, allocate = mem.wasmExports.malloc, free = mem.wasmExports.free;
  function withPage<T>(bytes: Uint8Array, index: number, fn: (doc: number, page: number) => T): T {
    const data = allocate(bytes.length);
    let doc = 0, page = 0;
    try {
      mem.HEAPU8.set(bytes, data);
      doc = api.FPDF_LoadMemDocument(data, bytes.length, '');
      if (!doc) throw new Error('Deze PDF kan niet voor tekstbewerking worden geopend.');
      page = api.FPDF_LoadPage(doc, index);
      if (!page) throw new Error('De PDF-pagina kon niet worden gelezen.');
      return fn(doc, page);
    } finally { if (page) api.FPDF_ClosePage(page); if (doc) api.FPDF_CloseDocument(doc); free(data); }
  }
  function textOf(object: number, textPage: number) {
    const length = api.FPDFTextObj_GetText(object, textPage, 0, 0);
    if (length < 2 || length > 100_000) return '';
    const buffer = allocate(length);
    try { api.FPDFTextObj_GetText(object, textPage, buffer, length); return mem.UTF16ToString(buffer); }
    finally { free(buffer); }
  }
  function describe(object: number, textPage: number, index: number): PdfTextRun | null {
    if (api.FPDFPageObj_GetType(object) !== 1) return null;
    const text = textOf(object, textPage);
    // Invisible OCR layers, clipping text and complex multiline objects are not editable as a line.
    if (!text.trim() || /[\r\n]/.test(text) || ![0, 1, 2].includes(api.FPDFTextObj_GetTextRenderMode(object))) return null;
    const font = api.FPDFTextObj_GetFont(object), buffer = allocate(1024);
    try {
      if (!api.FPDFPageObj_GetBounds(object, buffer, buffer + 4, buffer + 8, buffer + 12) ||
          !api.FPDFTextObj_GetFontSize(object, buffer + 16) || !api.FPDFPageObj_GetMatrix(object, buffer + 20)) return null;
      const bounds = [0, 4, 8, 12].map(offset => mem.getValue(buffer + offset, 'float')) as PdfTextRun['bounds'];
      const size = mem.getValue(buffer + 16, 'float');
      const matrix = [20, 24, 28, 32, 36, 40].map(offset => mem.getValue(buffer + offset, 'float'));
      if (![...bounds, ...matrix, size].every(Number.isFinite) || size <= 0) return null;
      api.FPDFFont_GetBaseFontName(font, buffer + 64, 512);
      const name = mem.UTF8ToString(buffer + 64).replace(/^[A-Z]{6}\+/, '') || 'Oorspronkelijk lettertype';
      const ok = api.FPDFPageObj_GetFillColor(object, buffer, buffer + 4, buffer + 8, buffer + 12);
      const color = ok ? '#' + [0, 4, 8].map(offset => mem.getValue(buffer + offset, 'i32').toString(16).padStart(2, '0')).join('') : '#000000';
      return { index, text, font: name, size, bounds, matrix, color };
    } finally { free(buffer); }
  }
  function inspect(bytes: Uint8Array, index: number): TextInspection {
    return withPage(bytes, index, (_doc, page) => {
      const textPage = api.FPDFText_LoadPage(page), runs: PdfTextRun[] = [];
      let skipped = 0;
      try {
        const count = api.FPDFPage_CountObjects(page);
        if (count > 30_000) throw new Error('Deze pagina is te complex om tekst veilig te bewerken.');
        for (let i = 0; i < count; i++) {
          const object = api.FPDFPage_GetObject(page, i), type = api.FPDFPageObj_GetType(object);
          const run = describe(object, textPage, i);
          if (run) runs.push(run);
          else if (type === 1 || type === 5) skipped++;
        }
        return { runs, skipped };
      } finally { api.FPDFText_ClosePage(textPage); }
    });
  }
  function save(doc: number) {
    const writer = api.PDFiumExt_OpenFileWriter();
    try {
      if (!writer || !api.PDFiumExt_SaveAsCopy(doc, writer)) throw new Error('De tekstwijziging kon niet worden opgeslagen.');
      const length = api.PDFiumExt_GetFileWriterSize(writer), buffer = allocate(length);
      try {
        if (api.PDFiumExt_GetFileWriterData(writer, buffer, length) !== length) throw new Error('De PDF kon niet volledig worden opgeslagen.');
        return mem.HEAPU8.slice(buffer, buffer + length);
      } finally { free(buffer); }
    } finally { if (writer) api.PDFiumExt_CloseFileWriter(writer); }
  }
  function verifyEmbeddedCharacters(object: number, value: string, previousText: string) {
    const font = api.FPDFTextObj_GetFont(object);
    // PDF mappings may differ from the font's Unicode cmap. Existing characters
    // retain their original mapping; newly introduced characters need coverage.
    const introduced = [...new Set([...value].filter(char => !previousText.includes(char) && !/\s/u.test(char)))];
    if (!introduced.length || api.FPDFFont_GetIsEmbedded(font) !== 1) return;
    const lengthPointer = allocate(4);
    let data = 0;
    try {
      if (!api.FPDFFont_GetFontData(font, 0, 0, lengthPointer)) throw new Error();
      const length = mem.getValue(lengthPointer, 'i32');
      if (length <= 0 || length > 50 * 1024 * 1024) throw new Error();
      data = allocate(length);
      if (!api.FPDFFont_GetFontData(font, data, length, lengthPointer)) throw new Error();
      // PDFium can fall back to another font for GetGlyphPath and text extraction
      // can round-trip a character even when the embedded font cannot draw it.
      // Inspect the actual embedded bytes instead of trusting those two signals.
      const embedded = fontkit.create(mem.HEAPU8.slice(data, data + length));
      const missing = introduced.filter(char => {
        const code = char.codePointAt(0)!;
        if (!embedded.hasGlyphForCodePoint(code)) return true;
        const glyph = embedded.glyphForCodePoint(code);
        return !glyph.id || !glyph.path.toSVG();
      });
      if (missing.length) return missing;
      return;
    } catch {
      throw new Error('Nieuwe tekens in dit ingesloten lettertype kunnen niet betrouwbaar worden gecontroleerd. Kies het vervangende lettertype of gebruik tekens uit de oorspronkelijke regel.');
    } finally { if (data) free(data); free(lengthPointer); }
  }
  function replace(bytes: Uint8Array, pageIndex: number, run: PdfTextRun, value: string, fallback?: Uint8Array) {
    if (value.length > 3000 || /[\r\n\t\u0000-\u001f]/.test(value)) throw new Error('Bewerk één tekstregel tegelijk, zonder regeleinden.');
    if (/[\u0590-\u08ff\u0900-\u0dff]/.test(value)) throw new Error('Direct bewerken van dit schrift wordt nog niet ondersteund. Het origineel is behouden.');
    return withPage(bytes, pageIndex, (doc, page) => {
      let object = api.FPDFPage_GetObject(page, run.index), textPage = api.FPDFText_LoadPage(page), loadedFont = 0;
      const buffer = allocate(Math.max(1024, (value.length + 1) * 2));
      try {
        if (!object || textOf(object, textPage) !== run.text) throw new Error('Deze tekst is inmiddels gewijzigd. Selecteer de regel opnieuw.');
        const current = describe(object, textPage, run.index);
        if (!current) throw new Error('Dit tekstobject kan niet veilig worden aangepast.');
        api.FPDFText_ClosePage(textPage); textPage = 0;
        if (!value.trim()) {
          if (!api.FPDFPage_RemoveObject(page, object)) throw new Error('Tekst verwijderen is mislukt.');
          api.FPDFPageObj_Destroy(object);
        } else {
          if (fallback) {
            const fontData = allocate(fallback.length);
            try { mem.HEAPU8.set(fallback, fontData); loadedFont = api.FPDFText_LoadFont(doc, fontData, fallback.length, 2, true); }
            finally { free(fontData); }
            if (!loadedFont) throw new Error('Het vervangende lettertype kon niet worden geladen.');
            const replacement = api.FPDFPageObj_CreateTextObj(doc, loadedFont, current.size);
            if (!replacement) throw new Error('Tekst aanmaken is mislukt.');
            current.matrix.forEach((n, i) => mem.setValue(buffer + i * 4, n, 'float'));
            api.FPDFPageObj_SetMatrix(replacement, buffer);
            const rgb = current.color.match(/[a-f\d]{2}/gi)!.map(n => parseInt(n, 16));
            api.FPDFPageObj_SetFillColor(replacement, rgb[0], rgb[1], rgb[2], 255);
            // Keep object ordering, including overlapping graphics.
            if (!api.FPDFPage_InsertObjectAtIndex(page, replacement, run.index)) { api.FPDFPageObj_Destroy(replacement); throw new Error('Tekst vervangen is mislukt.'); }
            api.FPDFPage_RemoveObject(page, object); api.FPDFPageObj_Destroy(object); object = replacement;
          }
          mem.stringToUTF16(value, buffer, (value.length + 1) * 2);
          if (!api.FPDFText_SetText(object, buffer)) throw new Error('Deze tekst kon niet worden aangepast.');
          textPage = api.FPDFText_LoadPage(page);
          // Embedded subsets often lack new letters: reject a lossy encoding instead of silently changing the font.
          if (textOf(object, textPage) !== value) throw new Error('Het oorspronkelijke lettertype bevat niet alle benodigde tekens. Kies bewust het vervangende lettertype of pas de tekst aan.');
          const missing = verifyEmbeddedCharacters(object, value, fallback ? '' : current.text);
          if (missing?.length) throw new Error(`Het lettertype bevat niet alle benodigde tekens: ${missing.slice(0, 12).map(char => `“${char}”`).join(', ')}. Kies ‘Vervangend lettertype gebruiken’ om alle letters zichtbaar te maken. De tekstvorm kan daarbij veranderen.`);
          api.FPDFText_ClosePage(textPage); textPage = 0;
        }
        if (!api.FPDFPage_GenerateContent(page)) throw new Error('De pagina kon niet worden bijgewerkt.');
        return save(doc);
      } finally { if (textPage) api.FPDFText_ClosePage(textPage); if (loadedFont) api.FPDFFont_Close(loadedFont); free(buffer); }
    });
  }
  return { inspect, replace };
}
