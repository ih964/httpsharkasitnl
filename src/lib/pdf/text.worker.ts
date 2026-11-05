import { createTextEngine, type PdfTextRun, type TextLayoutOptions } from './text-engine';
import type { PageArea, TextMove } from './text-layout';
import { buildFontDocument, inspectFontFile } from './font-files';

let engine: ReturnType<typeof createTextEngine> | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; action: 'inspect' | 'replace' | 'move' | 'font-info'; bytes: Uint8Array; index: number; run?: PdfTextRun; value?: string; fallback?: Uint8Array; customFont?: Uint8Array; layout?: TextLayoutOptions; moves?: TextMove[]; area?: PageArea }>) => {
  const { id, action, bytes, index, run, value, fallback, customFont, layout, moves, area } = event.data;
  try {
    if (action === 'font-info') { self.postMessage({ id, result: inspectFontFile(bytes) }); return; }
    engine ??= fetch('/pdf-editor-assets/pdfium.wasm').then(async response => {
      if (!response.ok) throw new Error('De teksteditor kon niet worden geladen.');
      return createTextEngine(await response.arrayBuffer());
    }).catch(error => { engine = undefined; throw error; });
    const api = await engine;
    const fontDocument = customFont && value?.trim() ? await buildFontDocument(customFont, value) : undefined;
    const result = action === 'inspect' ? api.inspect(bytes, index) : action === 'move' ? api.move(bytes,index,moves!,area) : api.replace(bytes, index, run!, value!, fallback, fontDocument, layout);
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Tekstbewerking is mislukt.' }); }
};
