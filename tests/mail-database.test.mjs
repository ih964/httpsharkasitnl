import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Pure configuration tests; no credentials or external connections are used.
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../server/mail-database.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL });
const { mailDatabaseOptions, mailFailureCode, isMailDatabaseBusy } = exports;
const base = 'postgresql://role.project:p%40ss%3Aword@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require';
const result = mailDatabaseOptions(base), url = new URL(result.connectionString), before = new URL(base);
assert.equal(url.port, '6543');
for (const field of ['hostname','username','password','pathname','search']) assert.equal(url[field], before[field], field+' must be preserved');
assert.equal(result.max, 2);
assert.equal(result.idleTimeoutMillis, 1000);
assert.equal(result.connectionTimeoutMillis, 8000);
assert.equal(result.maxLifetimeSeconds, 60);
assert.equal(result.allowExitOnIdle, true);
assert.equal(result.ssl, undefined, 'TLS must not be weakened or overridden');
assert.equal(base.includes(':5432/'), true, 'source env remains unchanged');
for (const source of [
  base.replace(':5432', ':6543'),
  'postgres://local:synthetic@127.0.0.1:5432/db',
  'postgresql://local:synthetic@db.project.supabase.co:5432/postgres?sslmode=require',
  'postgresql://local:synthetic@db.pooler.supabase.com.attacker.invalid:5432/db',
  'postgresql://local:synthetic@custom.example.invalid:5432/db',
  base.replace(':5432', ':7777'),
]) assert.equal(mailDatabaseOptions(source).connectionString, source, 'do not redirect non-shared or custom endpoints');
assert.equal(new URL(mailDatabaseOptions(base.replace(':5432','')).connectionString).port, '6543');
assert.equal(new URL(mailDatabaseOptions(base+'&port=5432').connectionString).searchParams.get('port'), '6543');
for (const bad of [undefined,'','not-a-url-with-a-secret','https://private.invalid/password']) {
  assert.throws(() => mailDatabaseOptions(bad), /Mail database/);
  try { mailDatabaseOptions(bad); } catch(error) { if (bad) assert(!error.message.includes(bad)); }
}
for (const code of ['XX000','42501','53300','ECONNRESET','EAUTH']) assert.equal(mailFailureCode({code}),code);
for (const code of ['postgres://secret','password with spaces','x'.repeat(60),5432,undefined]) assert.equal(mailFailureCode({code}),'MAIL_FAILURE');
assert.equal(isMailDatabaseBusy({code:'XX000',message:'(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15'}),true);
assert.equal(isMailDatabaseBusy({code:'53300'}),true);
assert.equal(isMailDatabaseBusy({message:'MaxClientsInSessionMode'}),true);
for (const error of [undefined,null,{},new Error('private password'),{code:'EAUTH'}]) assert.equal(isMailDatabaseBusy(error),false);
console.log('PASS shared-pooler transaction routing, unchanged credentials/TLS/HA env, two-client bounds, lifecycle settings, invalid configuration and sanitized diagnostics.');
