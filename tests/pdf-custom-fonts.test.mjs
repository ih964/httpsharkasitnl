import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRawStream, decodePDFRawStream, StandardFonts, rgb, degrees } from 'pdf-lib';
import { cffFont } from './fixtures/pdf-font-cff.mjs';
const temp = await mkdtemp(resolve('.pdf-custom-font-test-'));
try {
  await build({ entryPoints: ['src/lib/pdf/font-files.ts', 'src/lib/pdf/font-session.ts', 'src/lib/pdf/text-engine.ts'], outdir: temp, bundle: true, platform: 'node', format: 'esm', packages: 'external', outExtension: { '.js': '.mjs' }, logLevel: 'silent' });
  const { createTextEngine } = await import(`${temp}/text-engine.mjs`);
  const { inspectFontFile, buildFontDocument } = await import(`${temp}/font-files.mjs`);
  const { fontNameMatches, rememberFont, getSessionFonts, MAX_FONT_BYTES } = await import(`${temp}/font-session.mjs`);
  const engine = await createTextEngine(await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm'));
  const ttf = new Uint8Array(await readFile('public/fonts/pdf-editor-sans.ttf'));
  const info = inspectFontFile(ttf);
  assert.equal(info.format, 'TTF'); assert.equal(inspectFontFile(cffFont).format, 'OTF');
  assert(fontNameMatches(info, 'ABCDEF+DejaVuSans-9742'));
  assert(!fontNameMatches(info, 'DejaVuSans-Bold'));
  assert.throws(() => inspectFontFile(new Uint8Array()), /geldig/);
  assert.throws(() => inspectFontFile(new Uint8Array(MAX_FONT_BYTES + 1)), /20 MB/);
  assert.throws(() => inspectFontFile(new TextEncoder().encode('wOFFnot a supported font')), /geen ondersteund/);
  const damaged = ttf.slice(); new DataView(damaged.buffer).setUint32(20, damaged.length + 100);
  assert.throws(() => inspectFontFile(damaged), /beschadigd/);
  const restricted = ttf.slice(), view = new DataView(restricted.buffer);
  for (let i = 0; i < view.getUint16(4); i++) {
    const p = 12 + i * 16;
    if (String.fromCharCode(...restricted.slice(p, p + 4)) === 'OS/2') view.setUint16(view.getUint32(p + 8) + 8, 2);
  }
  assert.throws(() => inspectFontFile(restricted), /geen bewerkbare insluiting/);
  await assert.rejects(buildFontDocument(cffFont, 'Unsupported \u{10ffff}'), /niet alle benodigde tekens/);
  const source = await PDFDocument.create(), originalFont = await source.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 4; i++) {
    const page = source.addPage([500, 700]); page.setCropBox(20, 30, 400, 600); page.setRotation(degrees(i * 90));
    page.drawText('Original', { font: originalFont, size: 17.5, x: 40, y: 330, color: rgb(.2, .3, .4) });
    page.drawText('Neighbor unchanged', { font: originalFont, size: 10, x: 40, y: 250 });
  }
  const bytes = await source.save(), snapshot = bytes.slice();
  for (const fontBytes of [ttf, cffFont]) {
    const metadata = inspectFontFile(fontBytes), carrier = await buildFontDocument(fontBytes, 'YEAR café € 2026');
    for (let i = 0; i < 4; i++) {
      const run = engine.inspect(bytes, i).runs[0];
      const result = engine.replace(bytes, i, run, 'YEAR café € 2026', undefined, carrier);
      const after = engine.inspect(result, i).runs[0];
      assert.equal(after.text, 'YEAR café € 2026'); assert.equal(after.font, metadata.postscriptName);
      assert.equal(after.size, run.size); assert.equal(after.color, run.color); assert.deepEqual(after.matrix, run.matrix);
      assert.equal(engine.inspect(result, i).runs[1].text, 'Neighbor unchanged');
      assert.equal(engine.inspect(result, (i + 1) % 4).runs[0].text, 'Original');
      const doc = await PDFDocument.load(result); assert.equal(doc.getPageCount(), 4, 'temporary carrier page must be removed');
      assert.equal(doc.getPage(i).getRotation().angle, i * 90); assert.deepEqual(doc.getPage(i).getCropBox(), source.getPage(i).getCropBox());
      let verifiedFullFont = false;
      for (const [, object] of doc.context.enumerateIndirectObjects()) {
        if (!(object instanceof PDFDict) || object.get(PDFName.of('Subtype'))?.toString() !== '/Type0') continue;
        const descendant = object.lookup(PDFName.of('DescendantFonts'), PDFArray).lookup(0, PDFDict);
        const descriptor = descendant.lookup(PDFName.of('FontDescriptor'), PDFDict);
        const stream = descriptor.lookup(PDFName.of(metadata.format === 'OTF' ? 'FontFile3' : 'FontFile2'));
        if (!(stream instanceof PDFRawStream)) continue;
        assert.deepEqual(decodePDFRawStream(stream).decode(), fontBytes, 'entire original font program must be embedded byte-for-byte');
        if (metadata.format === 'OTF') { assert.equal(stream.dict.get(PDFName.of('Subtype')).toString(), '/OpenType'); assert.equal(descendant.get(PDFName.of('Subtype')).toString(), '/CIDFontType0'); }
        verifiedFullFont = true;
      }
      assert(verifiedFullFont);
      // Re-open and introduce another character: full coverage survives saving.
      assert.equal(engine.inspect(engine.replace(result, i, after, 'Zebra 2026'), i).runs[0].text, 'Zebra 2026');
    }
  }
  assert.deepEqual(bytes, snapshot);
  // PDFium's object text getter can append a separator belonging to the next
  // fragment after a shorter replacement. That is layout, not a missing glyph.
  for (const gap of [0, 3, 15]) {
    const adjacent = await PDFDocument.create(), face = await adjacent.embedFont(StandardFonts.Helvetica);
    const page = adjacent.addPage([500,700]);
    page.drawText('Code:', {font:face,size:8.5,x:40,y:600});
    page.drawText('2026', {font:face,size:8.5,x:80,y:600});
    page.drawText('Next', {font:face,size:8.5,x:80+face.widthOfTextAtSize('2026',8.5)+gap,y:600});
    const input = await adjacent.save(), run = engine.inspect(input,0).runs.find(item=>item.text==='2026');
    assert(run, 'inspection must exclude neighboring generated spaces');
    for (const value of ['21', ' 2 1 ']) {
      for (const fontBytes of [null, ttf, cffFont]) {
        const carrier = fontBytes ? await buildFontDocument(fontBytes,value) : undefined;
        const result = engine.replace(input,0,run,value,undefined,carrier);
        assert.deepEqual(engine.inspect(result,0).runs.map(item=>item.text), ['Code:',value,'Next'], 'preserve real spaces and neighboring text while ignoring inferred separators');
      }
    }
  }
  for (let i = 0; i < 10; i++) rememberFont({ id: String(i), filename: `test-${i}.ttf`, bytes: ttf, info });
  assert.equal(getSessionFonts().length, 8); assert.equal(getSessionFonts()[0].id, '2');
  console.log('PASS: complete TTF and OTF/CFF embedding, saved font-byte equality, reopen/new glyphs, size/color/matrix/crops/rotations, neighboring fragments and real whitespace, page count/order, invalid/oversized/restricted fonts, missing characters, style matching and bounded session cache.');
} finally { await rm(temp, { recursive: true, force: true }); }
