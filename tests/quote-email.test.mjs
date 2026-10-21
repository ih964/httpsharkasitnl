import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const dir = resolve('.quote-email-test-tmp');
const originalFetch = globalThis.fetch;
const originalKey = process.env.RESEND_API_KEY;
await mkdir(dir, { recursive: true });
process.env.RESEND_API_KEY = 'test-only-never-sent';
let passed = 0;
try {
  await build({ entryPoints: ['server/quote-email.ts'], outfile: `${dir}/email.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  const { parseQuoteEmailRequest, buildQuoteEmailPayload, sendQuoteEmail } = await import(pathToFileURL(`${dir}/email.mjs`).href);
  const quoteId = '11111111-1111-4111-8111-111111111111';
  const requestId = '22222222-2222-4222-8222-222222222222';
  const userId = '33333333-3333-4333-8333-333333333333';
  const input = { p_id: quoteId, p_version: 1, request_id: requestId, recipient_email: 'customer@example.test', cc_email: '' };
  const sample = () => ({ id: quoteId, quote_number: 'OFF-2099-TEST', title: 'Test <offerte>', quote_date: '2099-01-01', valid_until: '2099-12-31', status: 'concept', version: 1,
    customer_snapshot: { name: 'Voorbeeld <contact>', email: 'customer@example.test' }, company_snapshot: { company_name: 'Harkas IT' }, discount_percentage: 0,
    items: [{ description: 'Testregel', quantity: 1, price: 100, vat_percentage: 21, subtotal: 100, vat_total: 21 }], subtotal: 100, vat_total: 21, total: 121, notes: '', terms: '', reference: '' });
  class Database {
    quote = sample(); deliveries = new Map(); log = []; backup; failFinalUpdate = false;
    async query(sql, values = []) {
      const s = sql.replace(/\s+/g, ' ').trim(); this.log.push(s);
      if (s === 'begin') { this.backup = structuredClone({ quote: this.quote, deliveries: this.deliveries }); return { rows: [] }; }
      if (s === 'commit') { this.backup = undefined; return { rows: [] }; }
      if (s === 'rollback') { if (this.backup) { this.quote = this.backup.quote; this.deliveries = this.backup.deliveries; } this.backup = undefined; return { rows: [] }; }
      if (s.startsWith('select to_jsonb(q)')) return { rows: [{ data: structuredClone(this.quote) }] };
      if (s.startsWith('select id from public.quotes')) return { rows: [{ id: this.quote.id }] };
      if (s.startsWith('select * from public.quote_email_deliveries where id=')) return { rows: this.deliveries.has(values[0]) ? [structuredClone(this.deliveries.get(values[0]))] : [] };
      if (s.startsWith('select * from public.quote_email_deliveries where quote_id=')) return { rows: [...this.deliveries.values()].filter(d => d.quote_id === values[0] && d.state === 'pending').map(d => structuredClone(d)) };
      if (s.startsWith('insert into public.quote_email_deliveries')) {
        const [id, quote_id, quote_version, recipient_email, cc, payload, created_by] = values;
        const d = { id, quote_id, quote_version, recipient_email, cc_emails: JSON.parse(cc), payload: JSON.parse(payload), created_by, state: 'pending', created_at: new Date().toISOString() };
        this.deliveries.set(id, d); return { rows: [structuredClone(d)], rowCount: 1 };
      }
      if (s.startsWith('update public.quote_email_deliveries')) {
        const d = this.deliveries.get(values[0]); if (d?.state !== 'pending') return { rows: [], rowCount: 0 };
        d.state = s.includes("state='sent'") ? 'sent' : 'failed'; d.provider_id = values[1]; return { rows: [{ id: d.id }], rowCount: 1 };
      }
      if (s.startsWith('update public.quotes')) {
        if (this.failFinalUpdate) { this.failFinalUpdate = false; throw new Error('Simulated database loss after provider accepted'); }
        this.quote = { ...this.quote, status: 'verzonden', version: this.quote.version + 1, emailed_to: values[1], emailed_cc: JSON.parse(values[2]), emailed_at: new Date().toISOString() };
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected test query: ${s}`);
    }
  }
  const run = async (db, args = input) => {
    await db.query('begin');
    try { return await sendQuoteEmail(db, {}, args, userId, async () => {}); }
    catch (e) { await db.query('rollback'); throw e; }
  };
  const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };

  await test('recipients are validated, normalized and deduplicated', () => {
    assert.deepEqual(parseQuoteEmailRequest({ ...input, recipient_email: ' CUSTOMER@example.test ', cc_email: 'b@example.test, a@example.test,b@example.test, customer@example.test' }).cc, ['a@example.test', 'b@example.test']);
    for (const recipient_email of ['x@example.test\r\nBcc:steal@example.test', 'x@example.test,y@example.test', 'not-email']) assert.throws(() => parseQuoteEmailRequest({ ...input, recipient_email }));
    assert.throws(() => parseQuoteEmailRequest({ ...input, request_id: 'invalid' }));
  });
  await test('PDF and email are deterministic, escaped and based on saved totals', () => {
    const a = buildQuoteEmailPayload(sample(), input.recipient_email, []);
    const b = buildQuoteEmailPayload(sample(), input.recipient_email, []);
    assert.deepEqual(a, b); assert.match(a.html, /&lt;contact&gt;/); assert.match(a.text, /121,00/);
    assert.equal(Buffer.from(a.attachments[0].content, 'base64').subarray(0, 5).toString(), '%PDF-');
    assert.equal(a.from, 'Harkas IT <info@harkasit.nl>');
  });
  await test('request is durable before sending; status changes only after provider acceptance', async () => {
    const db = new Database(); let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++; assert.equal(url, 'https://api.resend.com/emails'); assert.equal(db.log.at(-1), 'commit'); assert.equal(db.quote.status, 'concept');
      assert.equal(db.deliveries.get(requestId).state, 'pending'); assert.equal(options.headers['Idempotency-Key'], `quote/${requestId}`);
      return Response.json({ id: 'provider-test-id' });
    };
    const q = await run(db); assert.equal(q.status, 'verzonden'); assert.equal(q.version, 2); assert.equal(db.deliveries.get(requestId).state, 'sent');
    await run(db); assert.equal(calls, 1); assert.equal(db.quote.version, 2);
  });
  await test('timeout after acceptance safely reuses the exact request on reopening', async () => {
    const db = new Database(); const seen = new Map(); let requests = 0;
    globalThis.fetch = async (_url, options) => {
      requests++; const key = options.headers['Idempotency-Key'];
      if (!seen.has(key)) { seen.set(key, options.body); throw new Error('Connection lost after acceptance'); }
      assert.equal(options.body, seen.get(key)); return Response.json({ id: 'already-accepted' });
    };
    await assert.rejects(run(db), /nog niet bevestigd/); assert.equal(db.deliveries.get(requestId).state, 'pending');
    await run(db, { ...input, request_id: crypto.randomUUID() });
    assert.equal(requests, 2); assert.equal(seen.size, 1); assert.equal(db.deliveries.size, 1); assert.equal(db.quote.status, 'verzonden');
  });
  await test('database failure after provider success is recovered without another email', async () => {
    const db = new Database(); db.failFinalUpdate = true; const accepted = new Set();
    globalThis.fetch = async (_url, options) => { accepted.add(options.headers['Idempotency-Key']); return Response.json({ id: 'accepted-before-db-loss' }); };
    await assert.rejects(run(db), /Simulated database loss/); assert.equal(db.deliveries.get(requestId).state, 'pending');
    await run(db); assert.equal(accepted.size, 1); assert.equal(db.quote.version, 2);
  });
  await test('pending request blocks different recipients and retries after provider dedupe expiry', async () => {
    const db = new Database(); let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('timeout'); };
    await assert.rejects(run(db));
    await assert.rejects(run(db, { ...input, request_id: crypto.randomUUID(), recipient_email: 'other@example.test' }), /eerdere verzending/);
    db.deliveries.get(requestId).created_at = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await assert.rejects(run(db), /23 uur/); assert.equal(calls, 1);
  });
  await test('definite rejection releases pending state but never marks quote sent', async () => {
    const db = new Database(); globalThis.fetch = async () => Response.json({ error: 'invalid sender' }, { status: 422 });
    await assert.rejects(run(db), /geweigerd/); assert.equal(db.deliveries.get(requestId).state, 'failed'); assert.equal(db.quote.status, 'concept');
  });
  await test('stale versions and closed quotes never call the provider', async () => {
    const db = new Database(); let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ id: 'unexpected' }); };
    await assert.rejects(run(db, { ...input, p_version: 2 }), /elders gewijzigd/);
    db.quote.status = 'gefactureerd'; await assert.rejects(run(db), /Alleen geldige/); assert.equal(calls, 0);
  });
  console.log(`${passed} quote email tests passed; no email sent`);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  await rm(dir, { recursive: true, force: true });
}
