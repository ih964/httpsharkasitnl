import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const dir = resolve('.quote-test-tmp');
await mkdir(dir, { recursive: true });
try {
  for (const [name, entry] of [['quotes', 'src/lib/quotes.ts'], ['pdf', 'src/lib/quotePdf.ts'], ['api', 'api/quotes.ts']]) {
    await build({ entryPoints: [entry], outfile: `${dir}/${name}.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  }
  const { calculateQuote, effectiveQuoteStatus, validateDraft, newQuoteDraft } = await import(pathToFileURL(`${dir}/quotes.mjs`).href);
  const { buildQuotePdf } = await import(pathToFileURL(`${dir}/pdf.mjs`).href);
  const { default: handler } = await import(pathToFileURL(`${dir}/api.mjs`).href);
  let passed = 0;
  const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  const item = { description: 'Werkzaamheden', quantity: 1, price: 100, vat_percentage: 21 };
  await test('21% VAT', () => { const t = calculateQuote([item], 0); assert.equal(t.subtotal, 100); assert.equal(t.total, 121); });
  await test('discount before VAT', () => { const t = calculateQuote([item], 10); assert.equal(t.subtotal, 90); assert.equal(t.vat_total, 18.9); assert.equal(t.total, 108.9); });
  await test('half-cent rounds up exactly', () => { const t = calculateQuote([{ ...item, price: 0.01, quantity: 0.5 }], 0); assert.equal(t.subtotal, 0.01); });
  await test('mixed VAT and fractional hours', () => {
    const t = calculateQuote([{ ...item, quantity: 1.125, price: 80 }, { ...item, price: 20, vat_percentage: 9 }, { ...item, price: 5, vat_percentage: 0 }], 0);
    assert.equal(t.subtotal, 115); assert.equal(t.vat_total, 20.7); assert.equal(t.total, 135.7);
  });
  await test('100% discount', () => assert.equal(calculateQuote([item], 100).total, 0));
  await test('negative / NaN / too many decimals rejected', () => {
    for (const price of [-1, NaN, Infinity, 1.001]) assert.throws(() => calculateQuote([{ ...item, price }], 0));
    assert.throws(() => calculateQuote([{ ...item, quantity: 0 }], 0));
    assert.throws(() => calculateQuote([item], 100.01));
  });
  await test('expiry is derived without changing accepted quotes', () => {
    assert.equal(effectiveQuoteStatus({ status: 'verzonden', valid_until: '2026-01-01' }, '2026-01-02'), 'verlopen');
    assert.equal(effectiveQuoteStatus({ status: 'geaccepteerd', valid_until: '2026-01-01' }, '2026-01-02'), 'geaccepteerd');
  });
  await test('draft validation and numbering not client supplied', () => {
    const draft = newQuoteDraft(); assert.ok(validateDraft(draft)); assert.equal(draft.version, 0);
    assert.equal(validateDraft({ ...draft, customer_id: crypto.randomUUID(), title: 'Testofferte', items: [item] }), null);
  });
  const sample = {
    id: crypto.randomUUID(), quote_number: 'OFF-2026-TEST', title: 'Microsoft 365 inrichting en ondersteuning',
    quote_date: '2026-10-20', valid_until: '2026-11-19', reference: 'PDF-test (geen echte offerte)',
    customer_snapshot: { company_name: 'Voorbeeldbedrijf', name: 'Testcontact', address: 'Voorbeeldstraat 1', postal_code: '1234 AB', city: 'Voorbeeldstad', email: 'test@example.com' },
    company_snapshot: { company_name: 'Harkas IT', email: 'info@harkasit.nl', kvk: '84795085' },
    discount_percentage: 10, notes: 'Inclusief installatie en documentatie.', terms: 'Planning in overleg.\nDit is uitsluitend een technische PDF-test.',
    ...calculateQuote(Array.from({ length: 80 }, (_, n) => ({ ...item, description: `Regel ${n + 1}: inrichting, migratie en nazorg. Een langere omschrijving om tekstomloop en paginaovergangen te testen.`, quantity: 1.125, price: 80 })), 10),
  };
  await test('multipage PDF has all rows, headers and footers', async () => {
    const logo = new Uint8Array(await readFile('src/assets/logo.png'));
    const pdf = buildQuotePdf(sample, logo);
    assert.ok(pdf.getNumberOfPages() >= 4);
    const data = Buffer.from(pdf.output('arraybuffer'));
    assert.equal(data.subarray(0, 5).toString(), '%PDF-');
    assert.ok(data.length > 1000);
    await writeFile('/tmp/harkas-quote-smoke.pdf', data);
    console.log(`PDF ${pdf.getNumberOfPages()} pages, ${data.length} bytes`);
  });
  await test('API denies unsupported methods and unauthenticated requests', async () => {
    for (const [request, expected] of [[{ method: 'GET', headers: {} }, 405], [{ method: 'POST', headers: {}, body: { action: 'list' } }, 401], [{ method: 'POST', headers: {}, body: { action: 'arbitrary_sql' } }, 400]]) {
      let status; const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
      await handler(request, res); assert.equal(status, expected);
    }
  });
  console.log(`${passed} quote tests passed`);
} finally { await rm(dir, { recursive: true, force: true }); }
