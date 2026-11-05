import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
// Serve PDF.js resources from our own origin, never an external viewer/CDN.
for (const folder of ['standard_fonts', 'cmaps', 'wasm']) {
  const destination = resolve('public/pdfjs-assets', folder);
  await mkdir(destination, { recursive: true });
  await cp(resolve('node_modules/pdfjs-dist', folder), destination, { recursive: true });
}

await mkdir('public/pdf-editor-assets/ocr/lang', { recursive: true });
await cp('node_modules/@embedpdf/pdfium/dist/pdfium.wasm', 'public/pdf-editor-assets/pdfium.wasm');
await cp('node_modules/tesseract.js/dist/worker.min.js', 'public/pdf-editor-assets/ocr/worker.min.js');
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (file.endsWith('.wasm') || file.endsWith('.wasm.js') || file === 'LICENSE')
    await cp(resolve('node_modules/tesseract.js-core', file), resolve('public/pdf-editor-assets/ocr', file));
}
for (const language of ['nld', 'eng']) {
  await cp(`node_modules/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`, `public/pdf-editor-assets/ocr/lang/${language}.traineddata.gz`);
}
