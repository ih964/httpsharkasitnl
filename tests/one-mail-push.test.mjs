// Synthetic metadata and database/IMAP doubles only. No real mailboxes or push services.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../api/one-mail-poll.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const outputs = {}, calls = [], connections = [];
const now = new Date('2026-11-05T14:00:00Z');
const token = 'a'.repeat(64);
const config = { cron_secret: token, mail_poll_enabled: true };
let cursor = null, messages = [], connectionCount = 0;
const database = { query: async (sql, args) => {
  calls.push({ sql, args });
  if (sql.includes('cron_secret')) return { rows: [config] };
  if (sql.includes('pg_try_advisory')) return { rows: [{ locked: true }] };
  if (sql.includes('decrypted_secret')) return { rows: [{ decrypted_secret: JSON.stringify({ password: 'synthetic-only' }) }] };
  if (sql.includes('select uid_validity')) return { rows: cursor ? [cursor] : [] };
  return { rows: [] };
}, release() {} };
class FakePool { async connect() { connectionCount++; return database; } async query(...args) { return database.query(...args); } }
class FakeImap {
  constructor(options) { connections.push(options); }
  on() {} async connect() {} close() {}
  async mailboxOpen(folder, options) { assert.equal(folder, 'INBOX'); assert.equal(options.readOnly, true); return { uidValidity: 123n, uidNext: 20 }; }
  async fetchAll(range, fields, options) { assert.equal(options.uid, true); assert.deepEqual(Object.keys(fields).sort(), ['internalDate', 'uid']); return messages; }
}
const env = { HARKAS_SUPABASE_DSN: 'synthetic-only', VERCEL_ENV: 'production' };
vm.runInNewContext(code, { exports: outputs, require: name => name === 'pg' ? { Pool: FakePool } : name === 'imapflow' ? { ImapFlow: FakeImap } : require(name), process: { env }, Buffer, console, Date, AbortSignal });
const { newArrivals, default: handler } = outputs;
const arrivals = newArrivals([
 { uid: 9, internalDate: '2026-11-05T13:59:00Z' },
 { uid: 11, internalDate: '2026-11-05T13:58:00Z' },
 { uid: 12, internalDate: '2026-11-01T13:00:00Z' },
 { uid: 13, internalDate: '2026-11-05T14:01:00Z' },
 { uid: 14 }, { uid: 21, internalDate: '2026-11-05T13:59:00Z' },
], 10, 20, new Date('2026-11-05T13:50:00Z'), now);
assert.deepEqual(JSON.parse(JSON.stringify(arrivals)), [{ uid: 11, received_at: '2026-11-05T13:58:00.000Z' }]);
function response() { return { code: 200, data: null, setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; }
let res = response(); await handler({ method: 'GET', headers: {} }, res); assert.equal(res.code, 405);
res = response(); await handler({ method: 'POST', headers: {} }, res); assert.equal(res.code, 401); assert.equal(calls.length, 0);
res = response(); await handler({ method: 'POST', headers: { 'x-one-cron': 'b'.repeat(64) } }, res); assert.equal(res.code, 401); assert.equal(connectionCount, 0);
env.VERCEL_ENV = 'preview';
res = response(); await handler({ method: 'POST', headers: { 'x-one-cron': token }, body: { sharedPassword: 'synthetic-only', mailboxPasswords: { webbuilder_info: 'builder-info-only', webbuilder_admin: 'builder-admin-only' } } }, res); assert.equal(res.code, 409); assert.equal(connectionCount, 0);
env.VERCEL_ENV = 'production';
calls.length = 0;
res = response(); await handler({ method: 'POST', headers: { 'x-one-cron': token }, body: { sharedPassword: 'synthetic-only', mailboxPasswords: { webbuilder_info: 'builder-info-only', webbuilder_admin: 'builder-admin-only' } } }, res);
assert.equal(res.code, 200); assert.equal(res.data.results.length, 5);
assert.equal(calls.some(x => x.sql.includes('insert into public.one_mail_events')), false, 'initial baseline never notifies old mail');
assert.equal(connections.every(x => x.secure && x.logger === false), true);
cursor = { uid_validity: '123', last_uid: '10', initialized_at: new Date(Date.now() - 120000) };
messages = [{ uid: 11, internalDate: new Date() }, { uid: 12, internalDate: new Date(Date.now() - 86400000) }];
calls.length = 0;
res = response(); await handler({ method: 'POST', headers: { 'x-one-cron': token }, body: { sharedPassword: 'synthetic-only', mailboxPasswords: { webbuilder_info: 'builder-info-only', webbuilder_admin: 'builder-admin-only' } } }, res);
assert.equal(res.code, 200);
const insertions = calls.filter(x => x.sql.includes('insert into public.one_mail_events'));
assert.equal(insertions.length, 5);
for (const insert of insertions) { assert.match(insert.sql, /on conflict\(account,uid_validity,uid\) do nothing/); assert.equal(JSON.parse(insert.args[2]).length, 1); assert.equal(JSON.parse(insert.args[2])[0].uid, 11); }
assert.equal(JSON.stringify(res.data).includes('synthetic-only'), false);
const edge = readFileSync(new URL('../supabase/functions/harkas-one-push/index.ts', import.meta.url), 'utf8');
assert.ok(edge.includes('${e.offset_minutes}:${sub.id}'), 'each reminder offset gets an independent delivery key');
assert.ok(edge.includes('e.reminder_offsets.includes(item.offset)'), 'removed reminders are checked before delivery');
assert.ok(edge.includes(".gte('received_at', current.mail_enabled_at)"), 'email preferences are rechecked immediately before sending');
console.log('PASS mail baseline, new-only arrivals, UID bounds, readonly metadata, duplicate INSERT protection, scheduler authentication, preview isolation and secret-free responses.');

// A missing builder credential must fail only that mailbox, not substitute the IT password.
const beforePartial = connections.length;
res = response();
await handler({ method: 'POST', headers: { 'x-one-cron': token }, body: { sharedPassword: 'synthetic-only', mailboxPasswords: { webbuilder_info: 'builder-info-only' } } }, res);
assert.equal(res.code, 503);
assert.equal(res.data.results.filter(r => r.failed).length, 1);
assert.equal(res.data.results.find(r => r.failed).account, 'webbuilder_admin');
assert.equal(connections.length - beforePartial, 4);
assert.equal(connections.find(c => c.auth.user === 'info@harkaswebbuilder.nl').auth.pass, 'builder-info-only');
assert.equal(connections.find(c => c.auth.user === 'admin@harkaswebbuilder.nl').auth.pass, 'builder-admin-only');
for (const secret of ['builder-info-only', 'builder-admin-only']) assert.equal(JSON.stringify(res.data).includes(secret), false);

// Verify runtime allowlists remain identical across UI, API, polling and push payloads.
const expected = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' };
function evaluate(relative) {
 const result = {};
 const text = readFileSync(new URL(relative, import.meta.url), 'utf8');
 vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports: result, encodeURIComponent });
 return result;
}
const ui = evaluate('../src/lib/mail-accounts.ts');
assert.deepEqual(JSON.parse(JSON.stringify(ui.accounts)), expected);
for (const alias of Object.keys(expected)) assert.equal(ui.isAccount(alias), true);
for (const alias of [null,'constructor','__proto__','admin','info@harkaswebbuilder.nl']) assert.equal(ui.isAccount(alias), false);
const { mailPayload } = evaluate('../supabase/functions/harkas-one-push/mail-payload.ts');
for (const [account,address] of Object.entries(expected)) {
 const payload = mailPayload({ account, uid: 41, uid_validity: '99' }, 'synthetic-tag');
 assert.equal(payload.body, 'Nieuwe e-mail in '+address+'. Open de app om het bericht te lezen.');
 assert.equal(payload.url, '/admin/one/mail?account='+account+'&uid=41&validity=99');
}
for (const account of ['constructor','__proto__','unknown']) assert.equal(mailPayload({account,uid:41,uid_validity:'99'}, 'test'),null);
assert.equal(mailPayload({account:'webbuilder_info',uid:'1&evil=1',uid_validity:'99'}, 'test'),null);
console.log('PASS five mailbox credential isolation, partial failures, domain-correct push payloads and fixed-account validation.');
