import { getDocument, type RenderTask } from 'pdfjs-dist';
import type { PdfTextRun } from './text-engine';

/** Render the changed PDF itself, including its real embedded font, in a bounded preview. */
export async function renderTextPreview(bytes: Uint8Array, index: number, run: PdfTextRun, canvas: HTMLCanvasElement, signal: AbortSignal) {
  const loading = getDocument({ data: bytes.slice(), isEvalSupported: false, standardFontDataUrl: '/pdfjs-assets/standard_fonts/', cMapUrl: '/pdfjs-assets/cmaps/', cMapPacked: true, wasmUrl: '/pdfjs-assets/wasm/' });
  let task: RenderTask | undefined;
  const abort = () => { task?.cancel(); void loading.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const pdf = await loading.promise, page = await pdf.getPage(index + 1);
    signal.throwIfAborted();
    const viewport = page.getViewport({ scale: 1 }), [l,b,r,t] = run.bounds;
    const rect = viewport.convertToViewportRectangle([l,b,r,t]);
    const x = Math.max(0, Math.min(rect[0],rect[2]) - 12), y = Math.max(0, Math.min(rect[1],rect[3]) - 16);
    const width = Math.min(viewport.width - x, 700), height = Math.min(viewport.height - y, Math.max(72, Math.abs(rect[3]-rect[1]) + 36));
    const scale = Math.min(2, 1000 / width);
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    task = page.render({ canvas, viewport: page.getViewport({ scale }), transform: [1,0,0,1,-x*scale,-y*scale] });
    await task.promise;
  } finally { signal.removeEventListener('abort', abort); await loading.destroy(); }
}
