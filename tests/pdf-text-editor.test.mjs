import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
const temp = await mkdtemp(resolve('.pdf-text-test-'));
try {
  await build({entryPoints:['src/lib/pdf/text-engine.ts'],outdir:temp,bundle:true,platform:'node',format:'esm',packages:'external',outExtension:{'.js':'.mjs'},logLevel:'silent'});
  const {createTextEngine}=await import(`${temp}/text-engine.mjs`);
  const engine=await createTextEngine(await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm'));
  const fontBytes=new Uint8Array(await readFile('public/fonts/pdf-editor-sans.ttf'));
  const source=await PDFDocument.create(), font=await source.embedFont(StandardFonts.TimesRomanBoldItalic);
  for(let i=0;i<4;i++){
    const p=source.addPage([500,700]);p.setCropBox(20,30,400,600);p.setRotation(degrees(i*90));
    p.drawRectangle({x:20,y:300,width:360,height:70,color:rgb(.8,.9,1)});
    p.drawText('Original selectable text',{font,size:17.5,x:40,y:330,color:rgb(.2,.3,.4)});
    p.drawText('Keep this untouched',{font,size:11,x:40,y:210});
  }
  const bytes=await source.save(), snapshot=bytes.slice();
  for(let i=0;i<4;i++){
    const before=engine.inspect(bytes,i);assert.equal(before.runs.length,2);
    const run=before.runs.find(r=>r.text==='Original selectable text');
    const edited=engine.replace(bytes,i,run,'Changed café € 125');
    const after=engine.inspect(edited,i), changed=after.runs.find(r=>r.text==='Changed café € 125');
    assert(changed);assert(!after.runs.some(r=>r.text===run.text),'old text must really be removed');
    assert.equal(changed.font,run.font);assert.equal(changed.size,run.size);assert.equal(changed.color,run.color);assert.deepEqual(changed.matrix,run.matrix);
    assert(after.runs.some(r=>r.text==='Keep this untouched'));
    const result=await PDFDocument.load(edited);assert.equal(result.getPage(i).getRotation().angle,i*90);assert.deepEqual(result.getPage(i).getCropBox(),source.getPage(i).getCropBox());
    assert.equal(engine.inspect(edited,(i+1)%4).runs[0].text,'Original selectable text','other pages must not change');
    const removed=engine.replace(bytes,i,run,'');assert.equal(engine.inspect(removed,i).runs.length,1);
    assert.throws(()=>engine.replace(bytes,i,{...run,text:'stale'},'Bad'),/inmiddels/);
    assert.throws(()=>engine.replace(bytes,i,run,'Two\nlines'),/tekstregel/);
  }
  assert.deepEqual(bytes,snapshot,'source bytes immutable, including failed edits');
  const subsetDoc=await PDFDocument.create();subsetDoc.registerFontkit(fontkit);const subsetFont=await subsetDoc.embedFont(fontBytes,{subset:true});subsetDoc.addPage().drawText('ABCDEF',{font:subsetFont,size:19,x:50,y:700});
  const subset=await subsetDoc.save(), run=engine.inspect(subset,0).runs[0];
  assert.equal(engine.inspect(engine.replace(subset,0,run,'FEDCBA'),0).runs[0].text,'FEDCBA');
  assert.throws(()=>engine.replace(subset,0,run,'New letters xyz'),/niet alle benodigde tekens/);
  const fallback=engine.inspect(engine.replace(subset,0,run,'Nieuw café €',fontBytes),0).runs[0];assert.equal(fallback.text,'Nieuw café €');assert.equal(fallback.size,19);assert.deepEqual(fallback.matrix,run.matrix);
  // Form-XObject text is explicitly skipped, rather than risking edits to repeated shared content.
  const nested=await PDFDocument.create();const [embedded]=await nested.embedPdf(bytes,[0]);nested.addPage([500,700]).drawPage(embedded);assert.equal(engine.inspect(await nested.save(),0).runs.length,0);
  console.log('PASS: true text replacement/removal, same font/size/color/matrix, four rotations/crop boxes, other content unchanged, font-subset rejection and explicit fallback, stale edits and nested text safeguards.');
} finally { await rm(temp,{recursive:true,force:true}); }
