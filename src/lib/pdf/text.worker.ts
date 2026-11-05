import { createTextEngine, type PdfTextRun } from './text-engine';
import { buildFontDocument, inspectFontFile } from './font-files';

let engine: ReturnType<typeof createTextEngine> | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; action: 'inspect' | 'replace' | 'font-info'; bytes: Uint8Array; index: number; run?: PdfTextRun; value?: string; fallback?: Uint8Array; customFont?: Uint8Array }>) => {
  const { id, action, bytes, index, run, value, fallback, customFont } = event.data;
  try {
    if (action === 'font-info') { self.postMessage({ id, result: inspectFontFile(bytes) }); return; }
    engine ??= fetch('/pdf-editor-assets/pdfium.wasm').then(async response => {
      if (!response.ok) throw new Error('De teksteditor kon niet worden geladen.');
      return createTextEngine(await response.arrayBuffer());
    }).catch(error => { engine = undefined; throw error; });
    const api = await engine;
    const fontDocument = customFont && value?.trim() ? await buildFontDocument(customFont, value) : undefined;
    const result = action === 'inspect' ? api.inspect(bytes, index) : api.replace(bytes, index, run!, value!, fallback, fontDocument);
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Tekstbewerking is mislukt.' }); }
};
