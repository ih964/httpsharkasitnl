// Test the Edge-to-Node credential handoff using synthetic AES-GCM data only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
const source = readFileSync(new URL('../supabase/functions/harkas-one-push/poll-mail.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const secret = 'synthetic-encryption-key-not-used-in-production';
const ids = { sharedPassword: '8aec51a9-3504-447e-99cf-2e5cb6cdea5f', webbuilder_info: '07b1de96-f2ea-406b-abe5-8e6619576abb', webbuilder_admin: 'c4e70f1e-407a-4a41-a42a-ee91e77c14d7' };
const passwords = { sharedPassword: 'synthetic-it-password', webbuilder_info: 'synthetic-builder-info-password', webbuilder_admin: 'synthetic-builder-admin-password' };
const hash = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
const key = await webcrypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt']);
const encrypted = {};
for (const [account,id] of Object.entries(ids)) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(passwords[account]));
  encrypted[id] = `v1:${Buffer.from(iv).toString('base64')}:${Buffer.from(ciphertext).toString('base64')}`;
}
async function fixture({ missing, noKey = false, apiOk = true } = {}) {
  const updates = [], lookups = [], requests = [];
  const db = { from(table) {
    if (table === 'one_push_config') return { update(value) { updates.push(value); return { eq: async () => ({ error: null }) }; } };
    assert.equal(table, 'password_vault');
    return { select(columns) { assert.equal(columns,'encrypted_password'); return { eq(field,id) {
      assert.equal(field,'id'); lookups.push(id);
      return { single: async () => id === ids[missing] ? { error: 'missing' } : { data: { encrypted_password: encrypted[id] } } };
    } }; } };
  } };
  const exports = {};
  vm.runInNewContext(compiled, { exports, Deno: { env: { get(name) { assert.equal(name, 'VAULT_ENCRYPTION_KEY'); return noKey ? undefined : secret; } } },
    crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, atob, AbortSignal, Date,
    fetch: async (url, options) => {
      assert.equal(url, 'https://www.harkasit.nl/api/one-mail-poll');
      assert.equal(options.redirect, 'error'); assert.equal(options.method, 'POST');
      assert.equal(options.headers['x-one-cron'], 'a'.repeat(64));
      requests.push(JSON.parse(options.body));
      return { ok: apiOk, json: async () => ({ ok: apiOk }) };
    },
  });
  const ok = await exports.pollMail(db, { cron_secret: 'a'.repeat(64) });
  return { ok, requests, lookups, updates };
}
const good = await fixture();
assert.equal(good.ok, true);
assert.deepEqual(good.lookups.sort(), Object.values(ids).sort());
assert.deepEqual(good.requests, [{ sharedPassword: passwords.sharedPassword, mailboxPasswords: { webbuilder_info: passwords.webbuilder_info, webbuilder_admin: passwords.webbuilder_admin } }]);
assert.equal(good.updates.filter(x => x.mail_last_success_at).length,1);
const partial = await fixture({ missing: 'webbuilder_admin', apiOk: false });
assert.equal(partial.ok,false);
assert.equal(partial.requests[0].sharedPassword, passwords.sharedPassword);
assert.equal(partial.requests[0].mailboxPasswords.webbuilder_info, passwords.webbuilder_info);
assert.equal(partial.requests[0].mailboxPasswords.webbuilder_admin, undefined);
assert.equal(partial.updates.some(x => x.mail_last_success_at), false);
const noKey = await fixture({ noKey: true });
assert.equal(noKey.ok,false); assert.equal(noKey.requests.length,0);
assert.equal(source.includes('console.'),false, 'credential handoff must not log secrets');
console.log('PASS fixed vault identifiers, isolated credentials, AES-GCM decryption, fixed TLS endpoint, redirect rejection and partial-failure health. No live credentials or network calls.');
