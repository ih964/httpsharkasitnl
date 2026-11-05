import type { PdfTextRun, TextInspection } from './text-engine';
import type { PdfFontInfo } from './font-session';

let worker: Worker | undefined, nextId = 0;
const pending = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
export function disposeTextEngine() {
  worker?.terminate(); worker = undefined;
  pending.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Tekstbewerking is onderbroken. Probeer opnieuw.')); }); pending.clear();
}
function request<T>(data: Record<string, unknown>): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./text.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      const item = pending.get(event.data.id); if (!item) return;
      pending.delete(event.data.id); clearTimeout(item.timer);
      if (event.data.error) item.reject(new Error(event.data.error)); else item.resolve(event.data.result);
    };
    worker.onerror = disposeTextEngine;
  }
  const id = ++nextId;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(disposeTextEngine, 60_000);
    pending.set(id, { resolve: result => resolve(result as T), reject, timer });
    worker!.postMessage({ ...data, id });
  });
}
export const inspectPdfText = (bytes: Uint8Array, index: number) => request<TextInspection>({ action: 'inspect', bytes, index });
export const inspectPdfFont = (bytes: Uint8Array) => request<PdfFontInfo>({ action: 'font-info', bytes });
export const replacePdfText = (bytes: Uint8Array, index: number, run: PdfTextRun, value: string, fallback?: Uint8Array, customFont?: Uint8Array) => request<Uint8Array>({ action: 'replace', bytes, index, run, value, fallback, customFont });
