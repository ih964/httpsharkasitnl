import { createWorker } from 'tesseract.js';
import type { EditorPage } from './model';
import type { PdfSource } from './renderer';

export type OcrLine = { id: string; text: string; x: number; y: number; width: number; height: number; size: number; confidence: number; textY: number };

export async function recognizePage(source: PdfSource, page: EditorPage, signal: AbortSignal, progress: (value: number) => void): Promise<OcrLine[]> {
  const canvas = document.createElement('canvas');
  const original = await source.pdf.getPage(page.index + 1);
  const scale = Math.min(3, Math.sqrt(12_000_000 / (page.width * page.height)));
  const viewport = original.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const render = original.render({ canvas, viewport });
  const cancelRender = () => render.cancel();
  signal.addEventListener('abort', cancelRender, { once: true });
  try { await render.promise; } finally { signal.removeEventListener('abort', cancelRender); }
  signal.throwIfAborted();
  const worker = await createWorker(['nld', 'eng'], 1, {
    workerPath: '/pdf-editor-assets/ocr/worker.min.js',
    corePath: '/pdf-editor-assets/ocr', langPath: '/pdf-editor-assets/ocr/lang',
    workerBlobURL: false,
    logger: message => { if (message.status === 'recognizing text') progress(Math.round(message.progress * 100)); },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = () => { void worker.terminate(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    const result = await Promise.race([
      worker.recognize(canvas, {}, { blocks: true, text: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { abort(); reject(new Error('Tekstherkenning duurt te lang. Probeer een kleinere scan.')); }, 120_000);
        signal.addEventListener('abort', () => reject(new DOMException('Geannuleerd', 'AbortError')), { once: true });
      }),
    ]);
    signal.throwIfAborted();
    const lines = (result.data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines));
    await document.fonts.load('100px HarkasPdfSans');
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = '100px HarkasPdfSans';
    return lines.filter(line => line.text.trim()).slice(0, 1500).map((line, index) => {
      const text = line.text.trim(), { x0, y0, x1, y1 } = line.bbox;
      const width = (x1 - x0) / scale, height = (y1 - y0) / scale, metrics = measure.measureText(text);
      // OCR gives pixel bounds, not a reliable font identity. Estimate a matching size using both bounds.
      const size = Math.max(4, Math.min(144, width * 100 / Math.max(1, metrics.width), height * 100 / Math.max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)));
      return { id: `${page.sourceId}-${page.index}-${index}`, text, x: x0 / scale, y: y0 / scale, width, height, size: Math.round(size * 10) / 10, confidence: Math.round(line.confidence), textY: y1 / scale - size * (1 + metrics.actualBoundingBoxDescent / 100) };
    });
  } finally { if (timer) clearTimeout(timer); signal.removeEventListener('abort', abort); await worker.terminate(); canvas.width = canvas.height = 0; }
}
