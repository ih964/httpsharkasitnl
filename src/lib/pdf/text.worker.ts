import { createTextEngine, type PdfTextRun } from './text-engine';

let engine: ReturnType<typeof createTextEngine> | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; action: 'inspect' | 'replace'; bytes: Uint8Array; index: number; run?: PdfTextRun; value?: string; fallback?: Uint8Array }>) => {
  const { id, action, bytes, index, run, value, fallback } = event.data;
  try {
    engine ??= fetch('/pdf-editor-assets/pdfium.wasm').then(async response => {
      if (!response.ok) throw new Error('De teksteditor kon niet worden geladen.');
      return createTextEngine(await response.arrayBuffer());
    }).catch(error => { engine = undefined; throw error; });
    const api = await engine;
    const result = action === 'inspect' ? api.inspect(bytes, index) : api.replace(bytes, index, run!, value!, fallback);
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Tekstbewerking is mislukt.' }); }
};
