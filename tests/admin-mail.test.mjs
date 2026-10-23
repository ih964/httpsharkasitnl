import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../api/admin-mail.ts', import.meta.url), 'utf8');
async function fixture({ admin = false, failImap = false } = {}) {
  const calls = [];
  const context = vm.createContext({ Buffer, URL, AbortSignal, process: { env: { HARKAS_SUPABASE_DSN: 'test', HARKAS_SUPABASE_PUBLISHABLE_KEY: 'public' } }, fetch: async (url, options) => {
    calls.push(['fetch',url]);
    if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: '11111111-1111-4111-8111-111111111111', user_metadata: { role: 'admin' } }) };
    assert(url.endsWith('/functions/v1/decrypt-password'));
    assert.equal(JSON.parse(options.body).id, '8aec51a9-3504-447e-99cf-2e5cb6cdea5f');
    return { ok: true, json: async () => ({ password: 'never-expose-me' }) };
  } });
  class Pool { async query(sql) { calls.push(['sql',sql]); return { rows: sql.includes('user_roles') ? (admin ? [{ id: 1 }] : []) : [{ decrypted_secret: '{"password":"support-private"}' }] }; } }
  class ImapFlow {
    constructor(config) { calls.push(['imap',config]); }
    async connect() { if (failImap) throw new Error('never-expose-me'); }
    async list() { return [{ path: 'INBOX', name: 'INBOX', flags: new Set() }]; }
    async mailboxOpen(folder, options) { assert.equal(options.readOnly,true); return { exists: 1, uidValidity: 77 }; }
    async fetchAll() { return [{ uid: 1, envelope: { subject: 'Test' }, flags: new Set(), internalDate: '2026-10-23' }]; }
    async fetchOne() { return { size: 10, source: Buffer.from('test') }; }
    async logout() { calls.push(['logout']); }
  }
  const mocks = { pg: { Pool }, imapflow: { ImapFlow }, mailparser: { simpleParser: async () => ({ subject: 'Test', text: '<script>untrusted</script>', attachments: [] }) }, nodemailer: { default: {} } };
  const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText, { context });
  await module.link(async name => { const values=mocks[name]; const dependency = new vm.SyntheticModule(Object.keys(values),function(){for (const [key,value] of Object.entries(values)) this.setExport(key,value);},{context}); return dependency; });
  await module.evaluate();
  const run = async (query = { account:'info' }, authorization = 'Bearer valid-token', method = 'GET', body) => {
    const res = { code:200, headers:{}, data:null, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;}, json(data){this.data=data;return this;}, send(data){this.data=data;return this;} };
    await module.namespace.default({ query, headers:{authorization}, method, body },res);
    assert(!JSON.stringify(res.data).includes('never-expose-me'));
    assert(!JSON.stringify(res.data).includes('support-private'));
    return res;
  };
  return { run,calls };
}
{
  const f=await fixture(); const r=await f.run(undefined,''); assert.equal(r.code,403); assert.equal(f.calls.length,0);
}
{
  const f=await fixture(); const r=await f.run(); assert.equal(r.code,403); assert(!f.calls.some(c=>c[0]==='imap')); assert(!f.calls.some(c=>String(c[1]).includes('decrypt-password')));
}
for (const account of ['info','administratie','support']) {
  const f=await fixture({admin:true}); const r=await f.run({account}); assert.equal(r.code,200); assert.equal(r.data.account,account+'@harkasit.nl');
  const config=f.calls.find(c=>c[0]==='imap')[1]; assert.equal(config.auth.user,account+'@harkasit.nl'); assert.equal(config.host,'shared70.cloud86-host.nl'); assert.equal(config.secure,true); assert.equal(config.logger,false);
  if(account==='support') assert(!f.calls.some(c=>String(c[1]).includes('decrypt-password')));
  assert.equal(r.headers['Cache-Control'],'no-store, private'); assert(f.calls.some(c=>c[0]==='logout'));
}
{
  const f=await fixture({admin:true}); assert.equal((await f.run({account:'constructor'})).code,400); assert(!f.calls.some(c=>c[0]==='imap'));
  assert.equal((await f.run({account:'info',action:'send'})).code,405);
  assert.equal((await f.run({account:'info'},undefined,'POST')).code,405);
}
{
  const f=await fixture({admin:true}); assert.equal((await f.run({account:'info',action:'message',uid:'1',uidValidity:'old'})).code,409);
  const r=await f.run({account:'info',action:'message',uid:'1',uidValidity:'77'}); assert.equal(r.code,200); assert.equal(r.data.text,'<script>untrusted</script>'); assert.equal(r.data.html,undefined);
}
{
  const f=await fixture({admin:true,failImap:true}); const r=await f.run(); assert.equal(r.code,503); assert(f.calls.some(c=>c[0]==='logout'));
}
console.log('Admin mail: authorization, fixed account boundaries, server-only credentials, read-only access, stale UID rejection and error redaction passed.');
