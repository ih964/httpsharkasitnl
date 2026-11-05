import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const temp=await mkdtemp(resolve('.pdf-layout-test-'));
try {
  await build({entryPoints:['src/lib/pdf/text-engine.ts','src/lib/pdf/text-layout.ts','src/lib/pdf/font-files.ts'],outdir:temp,bundle:true,platform:'node',format:'esm',packages:'external',outExtension:{'.js':'.mjs'},logLevel:'silent'});
  const {createTextEngine}=await import(`${temp}/text-engine.mjs`);
  const {dragTextRuns,screenDelta,alignTextRuns,textBox}=await import(`${temp}/text-layout.mjs`);
  const {buildFontDocument}=await import(`${temp}/font-files.mjs`);
  const engine=await createTextEngine(await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm'));
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
  for(let i=0;i<4;i++){
    const page=doc.addPage([600,800]);page.setCropBox(20,30,560,730);page.setRotation(degrees(i*90));
    page.drawRectangle({x:30,y:590,width:520,height:80,color:rgb(.9,.95,1)});
    page.drawText('Planning',{font,x:50,y:640,size:20});
    page.drawText('21',{font,x:50,y:610,size:14});
    page.drawText('mei',{font,x:70,y:610,size:14,color:rgb(.2,.3,.4)});
    page.drawText('2030',{font,x:96,y:610,size:14});
    page.drawText('10:00',{font,x:132,y:610,size:14});
    page.drawText('Andere kolom',{font,x:350,y:610,size:14});
    page.drawText('Andere regel',{font,x:50,y:560,size:14});
  }
  const bytes=await doc.save(),snapshot=bytes.slice();
  const pdf=await getDocument({data:bytes.slice(),standardFontDataUrl:resolve('node_modules/pdfjs-dist/standard_fonts')+'/'}).promise;
  for(let i=0;i<4;i++) {
    const viewport=(await pdf.getPage(i+1)).getViewport({scale:1});
    const area={transform:viewport.transform,width:viewport.width,height:viewport.height};
    const runs=engine.inspect(bytes,i).runs,month=runs.find(r=>r.text==='mei'),year=runs.find(r=>r.text==='2030');
    const flow=engine.replace(bytes,i,month,'september',undefined,undefined,{flow:true,area});
    const after=engine.inspect(flow,i).runs,changed=after.find(r=>r.text==='september'),shifted=after.find(r=>r.text==='2030');
    assert(changed && shifted);assert(shifted.bounds[0]>changed.bounds[2]+2,'following year must not overlap longer month');
    assert.deepEqual(changed.matrix,month.matrix);assert.equal(changed.font,month.font);assert.equal(changed.color,month.color);
    const shift=shifted.matrix[4]-year.matrix[4];assert(shift>20);
    assert(Math.abs((after.find(r=>r.text==='10:00').matrix[4]-runs.find(r=>r.text==='10:00').matrix[4])-shift)<.01,'contiguous fragments preserve spacing');
    for(const text of ['21','Planning','Andere kolom','Andere regel']) assert.deepEqual(after.find(r=>r.text===text).matrix,runs.find(r=>r.text===text).matrix,'unrelated fragments stay fixed');
    assert.equal(engine.inspect(flow,(i+1)%4).runs.find(r=>r.text==='mei').text,'mei');
    const fixed=engine.inspect(engine.replace(bytes,i,month,'september',undefined,undefined,{flow:false,area}),i).runs;
    assert.deepEqual(fixed.find(r=>r.text==='2030').matrix,year.matrix,'flow can be switched off');
    const overlapBytes=engine.replace(bytes,i,month,'februari'),overlapRun=engine.inspect(overlapBytes,i).runs.find(r=>r.text==='februari');
    const repaired=engine.inspect(engine.replace(overlapBytes,i,overlapRun,'september',undefined,undefined,{flow:true,area}),i).runs;
    assert(repaired.find(r=>r.text==='2030').bounds[0]>repaired.find(r=>r.text==='september').bounds[2]+2,'existing overlap is repaired too');
    assert.throws(()=>engine.replace(bytes,i,month,'september '.repeat(25),undefined,undefined,{flow:true,area}),/past niet/);
    for(const rotation of [0,90,180,270]) {
      const result=dragTextRuns([month,year],runs,area,screenDelta({x:12,y:8},rotation),0);
      const movedBytes=engine.move(bytes,i,result.moves,area), moved=engine.inspect(movedBytes,i).runs;
      for(const original of [month,year]) {
        const target=moved.find(r=>r.text===original.text), start=textBox(original,area), end=textBox(target,area), delta=screenDelta({x:12,y:8},rotation);
        assert(Math.abs(end.x-start.x-delta.x)<.02);assert(Math.abs(end.y-start.y-delta.y)<.02);
        assert.deepEqual(target.matrix.slice(0,4),original.matrix.slice(0,4));assert.equal(target.font,original.font);assert.equal(target.size,original.size);assert.equal(target.color,original.color);
      }
      const saved=await PDFDocument.load(movedBytes);assert.equal(saved.getPage(i).getRotation().angle,i*90);assert.deepEqual(saved.getPage(i).getCropBox(),doc.getPage(i).getCropBox());
    }
    const clamped=dragTextRuns([month,year],runs,area,{x:10000,y:10000},0);
    engine.move(bytes,i,clamped.moves,area);
    assert.throws(()=>engine.move(bytes,i,[{run:month,dx:10000,dy:0}],area),/past niet/);
    assert.throws(()=>engine.move(bytes,i,[{run:{...month,text:'stale'},dx:1,dy:1}],area),/inmiddels/);
    assert.throws(()=>engine.move(bytes,i,[{run:month,dx:NaN,dy:1}],area),/Ongeldige/);
    assert.throws(()=>engine.move(bytes,i,[{run:month,dx:1,dy:1},{run:month,dx:2,dy:2}],area),/Ongeldige/);
    const lower=runs.find(r=>r.text==='Andere regel');
    const aligned=engine.inspect(engine.move(bytes,i,alignTextRuns([month,lower]),area),i).runs.find(r=>r.text===lower.text);
    assert.equal(aligned.matrix[5],month.matrix[5]);assert.equal(aligned.matrix[4],lower.matrix[4]);
    if(i===0){
      const snap=dragTextRuns([lower],runs,area,{x:10,y:-48},5);
      assert(snap.guide);assert.equal(snap.moves[0].dy,50);
      assert.equal(dragTextRuns([lower],runs,area,{x:10,y:-48},0).moves[0].dy,48);
      const fontBytes=new Uint8Array(await readFile('public/fonts/pdf-editor-sans.ttf'));
      const custom=engine.replace(bytes,i,month,'september',undefined,await buildFontDocument(fontBytes,'september'),{flow:true,area});
      const customRuns=engine.inspect(custom,i).runs;
      assert(customRuns.find(r=>r.text==='2030').bounds[0]>customRuns.find(r=>r.text==='september').bounds[2]);
    }
  }
  assert.deepEqual(bytes,snapshot);
  await pdf.destroy();
  console.log('PASS: longer text flows into adjacent fragments without overlap; columns/rows unchanged; full-font flow; movement, alignment, snapping, bounds and stale checks; all 16 native/editor rotation combinations; preserved typography, crops and source bytes.');
} finally {await rm(temp,{recursive:true,force:true});}
