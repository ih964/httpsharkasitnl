import { PDFDocument, degrees, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, LineCapStyle } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { overlayTransform, normalizeRotation, type EditorPage } from './model';

const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

/** Copies vector pages; annotations are written into the PDF, not a screenshot. */
export async function exportPdf(pages: EditorPage[], sources: Map<string, Uint8Array>, fontBytes: Uint8Array, title: string) {
  if (!pages.length) throw new Error('Het document moet minimaal één pagina bevatten.');
  const result = await PDFDocument.create();
  result.registerFontkit(fontkit);
  const font = await result.embedFont(fontBytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const documents = new Map<string, PDFDocument>();
  for (const id of new Set(pages.map(p => p.sourceId))) {
    const bytes = sources.get(id);
    if (!bytes) throw new Error('Bronbestand ontbreekt. Open het document opnieuw.');
    const doc = await PDFDocument.load(bytes);
    // Filled form values remain visible after copying/reordering pages.
    const form = doc.getForm();
    if (form.getFields().length) form.flatten({ updateFieldAppearances: false });
    documents.set(id, doc);
  }
  for (const item of pages) {
    const [page] = await result.copyPages(documents.get(item.sourceId)!, [item.index]);
    result.addPage(page);
    page.setRotation(degrees(normalizeRotation(item.baseRotation + item.rotation)));
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...overlayTransform(item.transform, item.height)));
    for (const mark of item.marks) {
      const ink = color(mark.color);
      const bottom = item.height - mark.y - mark.height;
      if (mark.kind === 'text') {
        const value = mark.text || '';
        for (const char of value.replace(/[\r\n\t]/g, '')) {
          if (!supported.has(char.codePointAt(0)!)) throw new Error(`Het teken “${char}” wordt niet ondersteund. Pas deze tekst aan voordat je opslaat.`);
        }
        value.split('\n').forEach((line, i) => page.drawText(line.replace(/\t/g, '    '), {
          x: mark.x, y: item.height - mark.y - mark.size - i * mark.size * 1.3,
          size: mark.size, font, color: ink,
        }));
      } else if (mark.kind === 'image' && mark.image) {
        const image = mark.image.startsWith('data:image/png') ? await result.embedPng(mark.image) : await result.embedJpg(mark.image);
        page.drawImage(image, { x: mark.x, y: bottom, width: mark.width, height: mark.height });
      } else if (mark.kind === 'draw') {
        const points = mark.points || [];
        for (let i = 1; i < points.length; i++) page.drawLine({
          start: { x: mark.x + points[i - 1].x, y: item.height - mark.y - points[i - 1].y },
          end: { x: mark.x + points[i].x, y: item.height - mark.y - points[i].y },
          color: ink, thickness: mark.size, lineCap: LineCapStyle.Round,
        });
      } else if (mark.kind === 'highlight') {
        page.drawRectangle({ x: mark.x, y: bottom, width: mark.width, height: mark.height, color: ink, opacity: 0.3 });
      } else if (mark.kind === 'rectangle') {
        page.drawRectangle({ x: mark.x, y: bottom, width: mark.width, height: mark.height, borderColor: ink, borderWidth: mark.size });
      }
    }
    page.pushOperators(popGraphicsState());
  }
  result.setTitle(title);
  result.setCreator('Harkas IT PDF-editor');
  return result.save();
}
