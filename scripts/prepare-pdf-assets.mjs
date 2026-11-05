import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
// Serve PDF.js resources from our own origin, never an external viewer/CDN.
for (const folder of ['standard_fonts', 'cmaps', 'wasm']) {
  const destination = resolve('public/pdfjs-assets', folder);
  await mkdir(destination, { recursive: true });
  await cp(resolve('node_modules/pdfjs-dist', folder), destination, { recursive: true });
}
