import assert from 'node:assert/strict';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const temp=await mkdtemp(resolve(tmpdir(),'harkas-ocr-'));
let worker;
try {
  for(const lang of ['nld','eng']) await cp(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,resolve(temp,`${lang}.traineddata.gz`));
  GlobalFonts.registerFromPath('public/fonts/pdf-editor-sans.ttf','OcrFixtureSans');
  const canvas=createCanvas(1785,900),context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1785,900);context.fillStyle='black';
  const expected=['HARKAS IT','Controle PDF-editor','Dit is een testdocument zonder klantgegevens.'];
  for(const [i,text] of expected.entries()){context.font=`${[72,48,36][i]}px OcrFixtureSans`;context.fillText(text,144,180+i*170);}
  worker=await createWorker(['nld','eng'],1,{langPath:temp,cacheMethod:'none'});
  const {data}=await worker.recognize(canvas.toBuffer('image/png'),{},{blocks:true,text:true});
  const lines=data.blocks.flatMap(b=>b.paragraphs.flatMap(p=>p.lines));
  for(const text of expected){const line=lines.find(l=>l.text.trim()===text);assert(line,`Recognized line: ${text}`);assert(line.confidence>70);assert(line.bbox.x0>100&&line.bbox.x1<1785);}
  console.log('PASS: local NL/EN OCR recognizes three raster text lines, confidence and usable click bounds.');
} finally {if(worker)await worker.terminate();await rm(temp,{recursive:true,force:true});}
