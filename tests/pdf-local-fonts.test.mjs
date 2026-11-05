import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
const temp = await mkdtemp(resolve('.pdf-local-font-test-'));
try {
  await build({ entryPoints: ['src/lib/pdf/local-fonts.ts','src/lib/pdf/font-files.ts','src/lib/pdf/font-session.ts'], outdir: temp, bundle: true, platform: 'node', format: 'esm', packages: 'external', outExtension: {'.js': '.mjs'}, logLevel: 'silent' });
  const { createLocalFontAccess, localFontError } = await import(`${temp}/local-fonts.mjs`);
  const { inspectFontFile } = await import(`${temp}/font-files.mjs`);
  const { fontNameMatches, MAX_FONT_BYTES } = await import(`${temp}/font-session.mjs`);
  const bytes = new Uint8Array(await readFile('public/fonts/pdf-editor-sans.ttf')), info = inspectFontFile(bytes);
  let state = 'prompt', queries = 0, reads = 0, wrongReads = 0;
  const face = { ...info, blob: async () => { reads++; return new Blob([bytes]); } };
  const bold = { ...info, postscriptName: 'DejaVuSans-Bold', fullName: 'DejaVu Sans Bold', style: 'Bold', blob: async () => { wrongReads++; throw Error('wrong variant'); } };
  const access = createLocalFontAccess({ supported: () => true, permission: async () => state, query: async () => { queries++; state = 'granted'; return [bold,face]; } });
  assert.equal(await access.activate(false), false); assert.equal(queries,0,'no prompt on first visit');
  const enabling = access.activate(true); assert.equal(queries,1,'query must start directly in click handler'); await enabling;
  assert.equal(reads,0,'enumerating metadata must not read all font files');
  const font = await access.resolve('ABCDEF+DejaVuSans-12345', async b => inspectFontFile(b));
  assert.equal(font.info.postscriptName,info.postscriptName); assert.deepEqual(font.bytes,bytes); assert.equal(reads,1); assert.equal(wrongReads,0);
  assert.equal(await access.resolve('Verdana', async b => inspectFontFile(b)),null); assert.equal(reads,1,'no substitute or unnecessary blob reads');
  state = 'denied'; assert.equal(await access.resolve('DejaVuSans',async b => inspectFontFile(b)),null); assert.equal(reads,1,'revocation blocks new reads');
  assert.equal(await access.activate(false),false); assert.equal(queries,1,'denied permission never re-prompts automatically');
  state = 'granted'; assert.equal(await access.activate(false),true); assert.equal(queries,2,'permission can be reused on next document click');
  const unsupported = createLocalFontAccess({ supported: () => false, permission: async () => { throw Error('must not query permission'); }, query: async () => { throw Error('must not query fonts'); } });
  assert.equal(await unsupported.activate(true),false);
  const denied = createLocalFontAccess({ supported: () => true, permission: async () => 'denied', query: async () => { throw new DOMException('denied','NotAllowedError'); } });
  await assert.rejects(denied.activate(true),{name:'NotAllowedError'}); assert.match(localFontError(new DOMException('denied','NotAllowedError')),/Geen toegang/);
  const make = async faces => { const item=createLocalFontAccess({supported:()=>true,permission:async()=>'granted',query:async()=>faces});await item.activate(true);return item; };
  await assert.rejects((await make([face,{...face}])).resolve('DejaVuSans',async b=>inspectFontFile(b)),/meerdere varianten/);
  await assert.rejects((await make([{...face,blob:async()=>new Blob([new Uint8Array(MAX_FONT_BYTES+1)])}])).resolve('DejaVuSans',async b=>inspectFontFile(b)),/20 MB/);
  await assert.rejects((await make([face])).resolve('DejaVuSans',async()=>({...info,postscriptName:'Wrong',fullName:'Wrong',family:'Wrong'})),/niet overeen/);
  // Separate provider proves permission is checked again after the async byte read.
  state='granted'; const revoke=createLocalFontAccess({supported:()=>true,permission:async()=>state,query:async()=>[{...face,blob:async()=>{state='denied';return new Blob([bytes]);}}]});await revoke.activate(true);
  await assert.rejects(revoke.resolve('DejaVuSans',async b=>inspectFontFile(b)),/ingetrokken/);
  assert(!fontNameMatches({...info,postscriptName:'字体甲',fullName:'字体甲',family:'字体甲'},'字体乙'));
  assert(!fontNameMatches(info,'---')); assert(!fontNameMatches(bold,'DejaVu Sans'));
  console.log('PASS: local font permission opt-in/reuse/denial/revocation, lazy byte access, exact face/style matching, no silent substitutes, ambiguity, metadata verification and file size limits.');
} finally { await rm(temp,{recursive:true,force:true}); }
