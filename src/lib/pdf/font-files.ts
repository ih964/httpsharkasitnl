import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';
import { MAX_FONT_BYTES, type PdfFontInfo } from './font-session';

function parseFont(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes.length > MAX_FONT_BYTES) throw new Error('Kies een geldig TTF- of OTF-bestand van maximaal 20 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), signature = view.getUint32(0);
  if (![0x00010000, 0x74727565, 0x4f54544f].includes(signature)) throw new Error('Dit is geen ondersteund TTF- of OTF-bestand. Kies een los lettertypebestand, geen WOFF, collectie of archief.');
  const count = view.getUint16(4), tables = new Map<string, { offset: number; length: number }>();
  if (!count || count > 256 || 12 + count * 16 > bytes.length) throw new Error('Het lettertypebestand is beschadigd.');
  for (let i = 0; i < count; i++) {
    const start = 12 + i * 16, tag = String.fromCharCode(...bytes.slice(start, start + 4));
    const offset = view.getUint32(start + 8), length = view.getUint32(start + 12);
    if (tables.has(tag) || offset < 12 + count * 16 || offset + length > bytes.length) throw new Error('Het lettertypebestand is beschadigd.');
    tables.set(tag, { offset, length });
  }
  if (tables.has('fvar') || tables.has('CFF2')) throw new Error('Kies een statische TTF- of OTF-variant van dit variabele lettertype.');
  if (!tables.has('glyf') && !tables.has('CFF ')) throw new Error('Dit lettertype bevat geen ondersteunde lettervormen. Kies een TTF- of OTF-lettertype met contouren.');
  const os2 = tables.get('OS/2');
  if (os2 && os2.length >= 10) {
    const permissions = view.getUint16(os2.offset + 8), usage = permissions & 0x000e;
    if ((usage && !(usage & 8)) || (permissions & 0x0200)) throw new Error('Dit lettertypebestand staat geen bewerkbare insluiting in een PDF toe. Kies een lettertype waarvoor dat wel is toegestaan.');
  }
  try {
    const font = fontkit.create(bytes);
    if (!font.characterSet.length || !font.numGlyphs) throw new Error();
    return { font, cff: tables.has('CFF '), info: {
      family: font.familyName || font.postscriptName || 'Lettertype', style: font.subfamilyName || 'Regular',
      fullName: font.fullName || font.postscriptName || 'Lettertype', postscriptName: font.postscriptName || 'UploadedFont',
      format: signature === 0x4f54544f ? 'OTF' : 'TTF', glyphCount: font.numGlyphs,
    } as PdfFontInfo };
  } catch { throw new Error('Dit lettertype kon niet worden gelezen. Kies een compleet en geldig TTF- of OTF-bestand.'); }
}

export function inspectFontFile(bytes: Uint8Array) { return parseFont(bytes).info; }

/** A temporary one-page carrier gives PDFium a correctly embedded, complete font. */
export async function buildFontDocument(bytes: Uint8Array, value: string) {
  const { font, info, cff } = parseFont(bytes);
  const missing = [...new Set([...value].filter(char => {
    if (/\s/u.test(char)) return false;
    const code = char.codePointAt(0)!;
    return !font.hasGlyphForCodePoint(code) || !font.glyphForCodePoint(code).path.toSVG();
  }))];
  if (missing.length) throw new Error(`Het geladen lettertype bevat niet alle benodigde tekens: ${missing.slice(0, 12).map(char => `“${char}”`).join(', ')}. Kies een ander volledig lettertypebestand.`);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const embedded = await doc.embedFont(bytes, { subset: false, customName: info.postscriptName, features: { liga: false, clig: false } });
  const sample = [...value].find(char => !/\s/u.test(char)) || String.fromCodePoint(font.characterSet.find(code => code > 32 && code < 0xffff)!);
  doc.addPage([100, 100]).drawText(sample, { font: embedded, size: 12, x: 10, y: 50 });
  await doc.flush();
  if (cff) {
    const dictionary = doc.context.lookup(embedded.ref, PDFDict);
    const descendant = dictionary.lookup(PDFName.of('DescendantFonts'), PDFArray).lookup(0, PDFDict);
    const descriptor = descendant.lookup(PDFName.of('FontDescriptor'), PDFDict);
    // A full OTF file is an OpenType stream, not a raw, subsetted CFF program.
    const fontFile = descriptor.get(PDFName.of('FontFile3')) || descriptor.get(PDFName.of('FontFile2'));
    if (!fontFile) throw new Error('Het OTF-lettertype kon niet volledig worden ingesloten.');
    const stream = doc.context.lookup(fontFile);
    if (!(stream instanceof PDFRawStream)) throw new Error('Het OTF-lettertype kon niet volledig worden ingesloten.');
    stream.dict.set(PDFName.of('Subtype'), PDFName.of('OpenType'));
    descriptor.set(PDFName.of('FontFile3'), fontFile); descriptor.delete(PDFName.of('FontFile2'));
    descendant.set(PDFName.of('Subtype'), PDFName.of('CIDFontType0'));
    descendant.delete(PDFName.of('CIDToGIDMap'));
  }
  return doc.save();
}
