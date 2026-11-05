import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { MAX_FILE_SIZE, MAX_PAGES, uid, type EditorPage } from './model';

GlobalWorkerOptions.workerSrc = workerUrl;
export type PdfSource = { id: string; name: string; bytes: Uint8Array; pdf: PDFDocumentProxy };

export async function readPdf(file: File): Promise<{ source: PdfSource; pages: EditorPage[] }> {
  if (!file.size || file.size > MAX_FILE_SIZE) throw new Error('Kies een PDF-bestand van maximaal 50 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error(`${file.name} is geen geldig PDF-bestand.`);
  // Reject encryption before opening the viewer, so export cannot fail later on it.
  try { await PDFDocument.load(bytes); } catch (error) {
    if (String(error).toLowerCase().includes('encrypt')) throw new Error('Deze PDF is beveiligd. Open eerst een onbeveiligde kopie.');
    throw new Error('Dit PDF-bestand is beschadigd of wordt niet ondersteund.');
  }
  const task = getDocument({ data: bytes.slice(), isEvalSupported: false, stopAtErrors: true,
    standardFontDataUrl: '/pdfjs-assets/standard_fonts/', cMapUrl: '/pdfjs-assets/cmaps/', cMapPacked: true, wasmUrl: '/pdfjs-assets/wasm/' });
  let pdf: PDFDocumentProxy;
  try { pdf = await task.promise; } catch { await task.destroy(); throw new Error('De PDF kon niet worden geopend. Controleer het bestand en probeer opnieuw.'); }
  try {
    if (pdf.numPages > MAX_PAGES) throw new Error(`Maximaal ${MAX_PAGES} pagina’s per werkdocument.`);
    const id = uid(), pages: EditorPage[] = [];
    for (let index = 0; index < pdf.numPages; index++) {
      const p = await pdf.getPage(index + 1), view = p.getViewport({ scale: 1 });
      if (view.width < 1 || view.height < 1 || view.width > 15000 || view.height > 15000) throw new Error('Deze PDF heeft een niet-ondersteund paginaformaat.');
      pages.push({ id: uid(), sourceId: id, index, width: view.width, height: view.height, baseRotation: p.rotate, rotation: 0, transform: view.transform, marks: [] });
    }
    return { source: { id, name: file.name, bytes, pdf }, pages };
  } catch (error) { await pdf.destroy(); throw error; }
}

export async function blankPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([595.28, 841.89]);
  return new File([new Uint8Array(await pdf.save())], 'Nieuw document.pdf', { type: 'application/pdf' });
}
