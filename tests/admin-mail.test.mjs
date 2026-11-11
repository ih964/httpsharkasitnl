import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// No sockets, live mailboxes or real authentication: every external dependency is mocked.
const source = readFileSync(new URL('../api/admin-mail.ts', import.meta.url), 'utf8');
const recipient = 'recipient@example.invalid';
const draft = { to: recipient, subject: 'Test onderwerp', text: 'Testbericht' };
const trashQuery = { account: 'info', action: 'trash', uid: '71', uidValidity: '77' };
const plain = value => JSON.parse(JSON.stringify(value));
let requests = 0;
const accounts = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' };
const vaultIds = { info: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', administratie: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', webbuilder_info: '07b1de96-f2ea-406b-abe5-8e6619576abb', webbuilder_admin: 'c4e70f1e-407a-4a41-a42a-ee91e77c14d7' };

async function fixture(options = {}) {
  const calls = [], warnings = [];
  const context = vm.createContext({
    Buffer, URL, AbortSignal,
    console: { warn: (...args) => warnings.push(args) },
    process: { env: { HARKAS_SUPABASE_DSN: 'test', HARKAS_SUPABASE_PUBLISHABLE_KEY: 'public' } },
    fetch: async (url, fetchOptions) => {
      calls.push(['fetch', url]);
      if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: '11111111-1111-4111-8111-111111111111', user_metadata: { role: 'admin' } }) };
      assert(url.endsWith('/functions/v1/decrypt-password'));
      assert.equal(JSON.parse(fetchOptions.body).id, vaultIds[options.account || 'info'], 'each mailbox must resolve its own configured vault credential');
      return { ok: !options.failCredential, json: async () => ({ password: 'never-expose-me' }) };
    },
  });
  class Pool {
    async query(sql) {
      calls.push(['sql', sql]);
      return { rows: sql.includes('user_roles') ? (options.admin ? [{ id: 1 }] : []) : [{ decrypted_secret: '{"password":"support-private"}' }] };
    }
  }
  class ImapFlow {
    constructor(config) {
      calls.push(['imap', config]);
      this.capabilities = new Map(options.capabilities || [['MOVE', true], ['UIDPLUS', true]]);
      this.enabled = new Set(options.enabled || []);
    }
    async connect() {
      calls.push(['connect']);
      if (options.failImap) throw Object.assign(new Error('never-expose-me'), options.imapError || {});
    }
    async list() {
      calls.push(['list']);
      if (options.failList) throw new Error('never-expose-me');
      return [
        { path: 'INBOX', name: 'Postvak IN', flags: new Set() },
        // A folder name alone must not be trusted as the actual trash destination.
        { path: 'Trash', name: 'Trash', flags: new Set() },
        ...(!options.noSent ? [{ path: 'INBOX.Sent', name: 'Verzonden', specialUse: '\\Sent', flags: new Set() }] : []),
        ...(!options.noTrash ? [{ path: 'INBOX.Verwijderd', name: 'Verwijderd', specialUse: '\\Trash', flags: new Set(options.trashNoSelect ? ['\\Noselect'] : []) }] : []),
      ];
    }
    async mailboxOpen(folder, config) {
      calls.push(['open', folder, config]);
      return { path: folder, exists: 1, uidValidity: 77n, readOnly: options.forceReadOnly || config.readOnly };
    }
    async fetchAll() {
      return [{ uid: 71, envelope: { subject: 'Test' }, flags: new Set(), internalDate: '2026-10-23' }];
    }
    async fetchOne(uid, fields, config) {
      calls.push(['fetchOne', uid, fields, config]);
      return options.missingMessage ? false : { uid: options.wrongUid ? 72 : uid, size: 10, source: Buffer.from('test') };
    }
    async append(path, raw, flags) {
      calls.push(['append', path, raw, flags]);
      if (options.failAppend) throw new Error('never-expose-me');
      return options.appendFalse ? false : { uid: 10 };
    }
    async messageMove(uid, destination, config) {
      calls.push(['move', uid, destination, config]);
      if (options.failMove) throw new Error('never-expose-me');
      if (options.moveFalse) return false;
      return { path: 'INBOX', destination, uidMap: new Map(options.emptyMove ? [] : [[uid, 91]]) };
    }
    async messageDelete() { calls.push(['permanent-delete']); throw new Error('Permanent deletion is forbidden'); }
    async messageFlagsAdd() { calls.push(['flag-delete']); throw new Error('Flag-based deletion is forbidden'); }
    async expunge() { calls.push(['expunge']); throw new Error('Expunge is forbidden'); }
    async logout() { calls.push(['logout']); }
  }
  const nodemailer = {
    createTransport(config) {
      if (config.streamTransport) {
        return { sendMail: async mail => {
          calls.push(['compose', mail]);
          if (options.failCompose) throw new Error('never-expose-me');
          return { message: options.invalidComposition ? 'not-a-buffer' : Buffer.from('RFC822 test message') };
        } };
      }
      calls.push(['smtp', config]);
      return {
        sendMail: async mail => {
          calls.push(['smtpSend', mail]);
          if (options.smtpError) throw Object.assign(new Error('never-expose-me'), options.smtpError);
          if (options.rejected) return { accepted: [], rejected: [recipient] };
          if (options.noAcceptance) return { accepted: [], rejected: [] };
          return { accepted: options.accepted || [recipient], rejected: [] };
        },
        close() {
          calls.push(['smtpClose']);
          if (options.failClose) throw new Error('never-expose-me');
        },
      };
    },
  };
  const mocks = {
    pg: { Pool }, imapflow: { ImapFlow },
    mailparser: { simpleParser: async () => ({ subject: 'Test', text: '<script>untrusted</script>', attachments: [] }) },
    nodemailer: { default: nodemailer },
  };
  const module = new vm.SourceTextModule(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText, { context });
  await module.link(async name => {
    const values = mocks[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  const run = async (query = { account: 'info' }, authorization = 'Bearer valid-token', method = 'GET', body) => {
    const res = { code: 200, headers: {}, data: null,
      setHeader(key, value) { this.headers[key] = value; },
      status(code) { this.code = code; return this; },
      json(data) { this.data = data; return this; },
      send(data) { this.data = data; return this; },
    };
    await module.namespace.default({ query, headers: { authorization }, method, body }, res);
    requests++;
    for (const secret of ['never-expose-me', 'support-private']) {
      assert(!JSON.stringify(res.data).includes(secret), 'response must redact credentials');
      assert(!JSON.stringify(warnings).includes(secret), 'logs must redact credentials');
    }
    assert(!calls.some(call => ['permanent-delete', 'flag-delete', 'expunge'].includes(call[0])));
    return res;
  };
  return { run, calls, warnings };
}

for (const action of ['list', 'send', 'trash']) {
  const query = action === 'trash' ? trashQuery : { account: 'info', action };
  const method = action === 'list' ? 'GET' : 'POST';
  const unauthenticated = await fixture();
  assert.equal((await unauthenticated.run(query, '', method, draft)).code, 403);
  assert.equal(unauthenticated.calls.length, 0);
  const nonAdmin = await fixture();
  assert.equal((await nonAdmin.run(query, undefined, method, draft)).code, 403);
  assert(!nonAdmin.calls.some(call => ['imap', 'smtp', 'compose'].includes(call[0])));
}
for (const account of Object.keys(accounts)) {
  const f = await fixture({ admin: true, account });
  const r = await f.run({ account });
  assert.equal(r.code, 200); assert.equal(r.data.account, accounts[account]);
  const config = f.calls.find(call => call[0] === 'imap')[1];
  assert.equal(config.auth.user, accounts[account]);
  assert.equal(config.host, 'shared70.cloud86-host.nl');
  assert.equal(config.secure, true); assert.equal(config.logger, false);
  assert.equal(f.calls.find(call => call[0] === 'open')[2].readOnly, true);
  if (account === 'support') assert(!f.calls.some(call => String(call[1]).includes('decrypt-password')));
  assert.equal(r.headers['Cache-Control'], 'no-store, private');
  assert(f.calls.some(call => call[0] === 'logout'));
}
{
  const f = await fixture({ admin: true });
  assert.equal((await f.run({ account: 'constructor' })).code, 400);
  assert.equal((await f.run({ account: 'info', action: 'send' })).code, 405);
  assert.equal((await f.run(trashQuery)).code, 405);
  assert.equal((await f.run({ account: 'info' }, undefined, 'POST')).code, 405);
  assert.equal((await f.run({ account: 'info' }, undefined, 'DELETE')).code, 405);
  assert.equal((await f.run({ account: 'info', action: 'delete' }, undefined, 'POST')).code, 400);
  assert(!f.calls.some(call => ['imap', 'smtp'].includes(call[0])));
}
{
  const f = await fixture({ admin: true });
  assert.equal((await f.run({ account: 'info', action: 'message', uid: '71', uidValidity: '78' })).code, 409);
  const r = await f.run({ account: 'info', action: 'message', uid: '71', uidValidity: '77' });
  assert.equal(r.code, 200); assert.equal(r.data.text, '<script>untrusted</script>'); assert.equal(r.data.html, undefined);
}
{
  const f = await fixture({ admin: true, failImap: true });
  assert.equal((await f.run()).code, 503);
  assert(f.calls.some(call => call[0] === 'logout'));
}
console.log('PASS admin authorization, method boundaries, read-only access, stale UID rejection and credential redaction');

for (const account of Object.keys(accounts)) {
  const f = await fixture({ admin: true, account });
  const r = await f.run({ account, action: 'send' }, undefined, 'POST', { ...draft, from: 'wrong@example.invalid' });
  assert.equal(r.code, 200); assert.equal(r.data.sent, true); assert.equal(r.data.saved, true);
  const composed = f.calls.find(call => call[0] === 'compose')[1];
  assert.equal(composed.from.address, accounts[account]);
  assert.equal(composed.from.name, account.startsWith("webbuilder_") ? "Harkas Webbuilder" : "Harkas IT");
  const config = f.calls.find(call => call[0] === 'smtp')[1];
  assert.equal(config.host, 'shared70.cloud86-host.nl'); assert.equal(config.port, 465); assert.equal(config.secure, true);
  assert.equal(config.auth.user, accounts[account]);
  const delivered = f.calls.find(call => call[0] === 'smtpSend')[1];
  assert.deepEqual(plain(delivered.envelope), { from: accounts[account], to: [recipient] });
  assert(Buffer.isBuffer(delivered.raw));
  assert.equal(f.calls.filter(call => call[0] === 'smtpSend').length, 1);
  assert(f.calls.findIndex(call => call[0] === 'smtpSend') < f.calls.findIndex(call => call[0] === 'connect'));
  const archived = f.calls.find(call => call[0] === 'append');
  assert.equal(archived[1], 'INBOX.Sent'); assert.equal(archived[2], delivered.raw);
  assert.deepEqual(plain(archived[3]), ['\\Seen']);
}
for (const options of [{ failImap: true }, { failList: true }, { noSent: true }, { failAppend: true }, { appendFalse: true }]) {
  const f = await fixture({ admin: true, ...options });
  const r = await f.run({ account: 'info', action: 'send' }, undefined, 'POST', draft);
  assert.equal(r.code, 200); assert.equal(r.data.sent, true); assert.equal(r.data.saved, false);
  assert.equal(f.calls.filter(call => call[0] === 'smtpSend').length, 1, 'archive failure must not resend');
}
for (const options of [{ failClose: true }, { accepted: [{ address: recipient.toUpperCase() }] }]) {
  const f = await fixture({ admin: true, ...options });
  const r = await f.run({ account: 'info', action: 'send' }, undefined, 'POST', draft);
  assert.equal(r.data.sent, true);
}
for (const [options, status] of [
  [{ smtpError: { code: 'EAUTH' } }, 503], [{ smtpError: { code: 'ETIMEDOUT' } }, 503],
  [{ rejected: true }, 422], [{ noAcceptance: true }, 503], [{ accepted: ['other@example.invalid'] }, 503],
]) {
  const f = await fixture({ admin: true, ...options });
  const r = await f.run({ account: 'info', action: 'send' }, undefined, 'POST', draft);
  assert.equal(r.code, status); assert.notEqual(r.data.sent, true);
  assert(!f.calls.some(call => call[0] === 'imap'), 'unaccepted delivery must not create a Sent copy');
  assert(f.calls.some(call => call[0] === 'smtpClose'));
  if (options.smtpError?.code === 'ETIMEDOUT') {
    assert.match(r.data.error, /Controleer eerst Verzonden/);
    assert.equal(f.warnings[0][1].stage, 'smtp');
  }
}
for (const body of [
  { ...draft, to: 'one@example.invalid,two@example.invalid' },
  { ...draft, to: 'user@example.invalid\r\nBcc: attacker@example.invalid' },
  { ...draft, subject: 'bad\r\nheader' }, { ...draft, subject: '' }, { ...draft, text: '   ' },
]) {
  const f = await fixture({ admin: true });
  assert.equal((await f.run({ account: 'info', action: 'send' }, undefined, 'POST', body)).code, 400);
  assert(!f.calls.some(call => ['compose', 'smtp', 'imap'].includes(call[0])));
}
for (const options of [{ failCompose: true }, { invalidComposition: true }, { failCredential: true }]) {
  const f = await fixture({ admin: true, ...options });
  assert.equal((await f.run({ account: 'info', action: 'send' }, undefined, 'POST', draft)).code, 503);
  assert(!f.calls.some(call => ['smtp', 'imap'].includes(call[0])));
}
console.log('PASS all five SMTP senders, same-message Sent copy, rejection handling, SMTP-first delivery and accepted-but-unsaved outcomes');

for (const account of Object.keys(accounts)) {
  const f = await fixture({ admin: true, account });
  const r = await f.run({ ...trashQuery, account }, undefined, 'POST', {});
  assert.equal(r.code, 200);
  assert.deepEqual(plain(r.data), { moved: true, folder: 'INBOX.Verwijderd' });
  assert.equal(f.calls.find(call => call[0] === 'open')[2].readOnly, false);
  const fetch = f.calls.find(call => call[0] === 'fetchOne');
  assert.equal(fetch[1], 71); assert.deepEqual(plain(fetch[3]), { uid: true });
  assert.deepEqual(plain(f.calls.find(call => call[0] === 'move')), ['move', 71, 'INBOX.Verwijderd', { uid: true }]);
  assert.equal(f.calls.filter(call => call[0] === 'move').length, 1);
}
for (const [key, value] of [
  ...[undefined, '', 0, -1, '1:9', '*', '1e2', '1.5', 4294967296, ['71']].map(value => ['uid', value]),
  ...[undefined, '', 'old', '0', '1:77', 4294967296, ['77']].map(value => ['uidValidity', value]),
]) {
  const f = await fixture({ admin: true });
  assert.equal((await f.run({ ...trashQuery, [key]: value }, undefined, 'POST', {})).code, 400);
  assert(!f.calls.some(call => ['imap', 'move'].includes(call[0])), 'invalid identifiers must be rejected before mailbox access');
}
for (const [options, query, status] of [
  [{}, { ...trashQuery, uidValidity: '78' }, 409],
  [{ noTrash: true }, trashQuery, 503],
  [{ trashNoSelect: true }, trashQuery, 503],
  [{}, { ...trashQuery, folder: 'INBOX.Verwijderd' }, 409],
  [{ forceReadOnly: true }, trashQuery, 403],
  [{ missingMessage: true }, trashQuery, 404],
  [{ wrongUid: true }, trashQuery, 404],
  [{ capabilities: [['UIDPLUS', true]] }, trashQuery, 503],
  [{ capabilities: [['IMAP4rev2', true], ['IMAP4rev1', true]] }, trashQuery, 503],
]) {
  const f = await fixture({ admin: true, ...options });
  const r = await f.run(query, undefined, 'POST', {});
  assert.equal(r.code, status);
  assert(!f.calls.some(call => call[0] === 'move'), 'unsafe or stale requests must not move anything');
}
for (const options of [
  { capabilities: [['IMAP4rev2', true]] },
  { capabilities: [['IMAP4rev2', true], ['IMAP4rev1', true]], enabled: ['IMAP4REV2'] },
]) {
  const f = await fixture({ admin: true, ...options });
  assert.equal((await f.run(trashQuery, undefined, 'POST', {})).data.moved, true);
}
for (const options of [{ moveFalse: true }, { failMove: true }, { emptyMove: true }]) {
  const f = await fixture({ admin: true, ...options });
  const r = await f.run(trashQuery, undefined, 'POST', {});
  assert.equal(r.code, 503); assert.notEqual(r.data.moved, true);
  assert.match(r.data.error, /niet bevestigd/);
  assert.equal(f.calls.filter(call => call[0] === 'move').length, 1);
}
console.log('PASS UID-scoped native trash moves, special-use folder selection, stale/missing identifiers, read-only/no-MOVE safeguards and failed-move handling');
console.log('ALL ADMIN MAIL TESTS PASSED (' + requests + ' mocked requests; no real e-mail sent or moved).');
