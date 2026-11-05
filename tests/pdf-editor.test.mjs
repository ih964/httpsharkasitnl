import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import { DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
globalThis.DOMMatrix = DOMMatrix; globalThis.ImageData = ImageData; globalThis.Path2D = Path2D;
const { getDocument: loadDocument, Util } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const getDocument = options => loadDocument({standardFontDataUrl:resolve('node_modules/pdfjs-dist/standard_fonts')+'/', ...options});
const temp = await mkdtemp(resolve('.pdf-editor-test-'));
try {
  await build({ entryPoints: ['src/lib/pdf/export.ts','src/lib/pdf/model.ts'], outdir: temp, bundle: true, platform: 'node', format: 'esm', packages: 'external', outExtension: { '.js': '.mjs' }, logLevel: 'silent' });
  const { exportPdf } = await import(`${temp}/export.mjs`);
  const { overlayTransform, movePage, normalizeRotation, pdfFilename } = await import(`${temp}/model.mjs`);
  const font = new Uint8Array(await readFile('public/fonts/pdf-editor-sans.ttf'));
  const original = await PDFDocument.create(), originalFont = await original.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 4; i++) {
    const page = original.addPage([500, 700]); page.setCropBox(20, 30, 400, 600); page.setRotation(degrees(i * 90));
    page.drawText(`Original page ${i + 1}`, { x: 70, y: 350, font: originalFont, size: 16, color: rgb(0,0,0) });
  }
  const sourceBytes = await original.save();
  const inputCopy = Buffer.from(sourceBytes);
  const renderer = await getDocument({ data: sourceBytes.slice(), isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 0; i < 4; i++) {
    const p = await renderer.getPage(i + 1), viewport = p.getViewport({ scale: 1 });
    pages.push({ id: String(i), sourceId: 'source', index: i, width: viewport.width, height: viewport.height, baseRotation: p.rotate, rotation: 0, transform: viewport.transform, marks: [
      { id:'text',kind:'text',x:40,y:50,width:200,height:30,color:'#172554',size:16,text:`Edited ${i+1}: café €` },
      { id:'highlight',kind:'highlight',x:30,y:100,width:150,height:20,color:'#facc15',size:2 },
      { id:'rect',kind:'rectangle',x:40,y:150,width:100,height:60,color:'#2563eb',size:2 },
      { id:'draw',kind:'draw',x:30,y:230,width:40,height:20,color:'#172554',size:2,points:[{x:0,y:0},{x:20,y:20},{x:40,y:0}] },
    ]});
  }
  for (const extraRotation of [0,90,180,270]) {
    const exported = await exportPdf(pages.map(p => ({...p,rotation:extraRotation})),new Map([['source',sourceBytes]]),font,'PDF integration test');
    const output = await getDocument({ data: exported }).promise;
    assert.equal(output.numPages,4);
    for(let i=0;i<4;i++) {
      const p=await output.getPage(i+1), content=await p.getTextContent();
      assert(content.items.some(t=>t.str===`Original page ${i+1}`),'original selectable text must survive');
      const text=content.items.find(t=>t.str===`Edited ${i+1}: café €`); assert(text,'new Unicode text must be extractable');
      const xy=Util.transform(p.getViewport({scale:1}).transform,text.transform);
      const base=pages[i], expected=extraRotation===0?[40,66]:extraRotation===90?[base.height-66,40]:extraRotation===180?[base.width-40,base.height-66]:[66,base.width-40];
      assert(Math.abs(xy[4]-expected[0])<.1 && Math.abs(xy[5]-expected[1])<.1,`position for base ${i*90}, extra ${extraRotation}: ${xy.slice(4)} expected ${expected}`);
    }
    await output.destroy();
  }
  const second = await PDFDocument.create(); second.addPage([300,400]).drawText('Merged source');
  const secondBytes=await second.save();
  const reordered=[pages[2],{...pages[0],id:'duplicate'},pages[0],{...pages[0],id:'merge',sourceId:'second',index:0,width:300,height:400,baseRotation:0,rotation:0,transform:[1,0,0,-1,0,400],marks:[]}];
  const merged=await exportPdf(reordered,new Map([['source',sourceBytes],['second',secondBytes]]),font,'Merged test');
  const mergedRenderer=await getDocument({data:merged}).promise;
  assert.equal(mergedRenderer.numPages,4);
  for(const [index,expected] of ['Original page 3','Original page 1','Original page 1','Merged source'].entries()) {
    const text=await (await mergedRenderer.getPage(index+1)).getTextContent(); assert(text.items.some(t=>t.str===expected));
  }
  assert.deepEqual(Buffer.from(sourceBytes),inputCopy,'export must not mutate the original');
  assert.deepEqual(movePage(pages,'2',-1).map(p=>p.id),['0','2','1','3']);
  assert.equal(movePage(pages,'0',-1),pages);
  assert.equal(normalizeRotation(-90),270);
  assert.equal(pdfFilename('../invoice:2026.pdf'),'..-invoice-2026.pdf');
  assert.throws(()=>overlayTransform([0,0,0,0,0,0],100));
  await assert.rejects(()=>exportPdf([],new Map(),font,'Empty'),/minimaal/);
  await assert.rejects(()=>exportPdf([{...pages[0],marks:[{...pages[0].marks[0],text:'Unsupported 🫠'}]}],new Map([['source',sourceBytes]]),font,'Unsupported'),/niet ondersteund/);
  await renderer.destroy(); await mergedRenderer.destroy();
  console.log('PASS: all 16 rotation/crop combinations, Unicode text, original content, merging, reordering, duplication, immutability, and invalid export handling.');
} finally { await rm(temp,{recursive:true,force:true}); }
