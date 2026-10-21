import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const dir = resolve('.invoice-integrity-test-tmp');
await mkdir(dir, { recursive: true });
const oldDeno = globalThis.Deno;
let passed = 0;
try {
  await build({ entryPoints: ['src/lib/invoiceAmounts.ts'], outfile: `${dir}/amounts.mjs`, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { invoiceLineAmounts, invoiceTotals } = await import(pathToFileURL(`${dir}/amounts.mjs`).href);
  const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  await test('discounted unit prices and fractional quantities round like NUMERIC', () => {
    assert.equal(invoiceLineAmounts({ quantity: 1, price: 1.005, vat_percentage: 21 }).subtotal, 1.01);
    assert.equal(invoiceLineAmounts({ quantity: 2, price: 1.005, vat_percentage: 21 }).subtotal, 2.01);
    assert.equal(invoiceLineAmounts({ quantity: 0.001, price: 5, vat_percentage: 21 }).subtotal, 0.01);
    assert.equal(invoiceLineAmounts({ quantity: 1.125, price: 80, vat_percentage: 9 }).total, 98.1);
  });
  await test('persisted subtotals survive displaying or editing description-only fields', () => {
    assert.equal(invoiceLineAmounts({ quantity: 1, price: 1.005, vat_percentage: 21, subtotal: 1.01 }).subtotal, 1.01);
    assert.deepEqual(invoiceTotals([{ quantity: 1, price: 0.1, vat_percentage: 0 }, { quantity: 1, price: 0.2, vat_percentage: 0 }]), { subtotal: 0.3, vat_total: 0, total: 0.3 });
    assert.ok(Number.isNaN(invoiceTotals([{ quantity: 1, price: Infinity, vat_percentage: 21 }]).total));
  });
  let handler, uploaded, updatePath, staleOnAttach = false, linesError = false, uploadError = false;
  let invoice;
  const reset = () => {
    uploaded = undefined; updatePath = undefined; staleOnAttach = false; linesError = false; uploadError = false;
    invoice = { id: 'test-invoice', invoice_number: '2099-TEST', invoice_date: '2099-01-01', due_date: '2099-01-15', edit_version: 1, customer_id: null, subtotal: 1.01, vat_total: 0.21, total: 1.22, has_damage: false, damage_amount: 0, source_type: 'generated', pdf_storage_path: 'old-valid.pdf' };
  };
  class Query {
    constructor(table) { this.table = table; this.filters = {}; }
    select() { return this; } in() { return this; } order() { return this; } limit() { return this; }
    eq(key, value) { this.filters[key] = value; return this; }
    single() { return this; } maybeSingle() { return this; }
    update(values) { this.values = values; return this; }
    then(resolve) {
      if (this.table === 'user_roles') return Promise.resolve({ data: { role: 'admin' } }).then(resolve);
      if (this.table === 'user_module_access') return Promise.resolve({ data: [] }).then(resolve);
      if (this.table === 'invoices') {
        if (this.values) {
          if (this.filters.edit_version !== invoice.edit_version) return Promise.resolve({ data: null, error: null }).then(resolve);
          updatePath = this.values.pdf_storage_path;
          return Promise.resolve({ data: { id: invoice.id }, error: null }).then(resolve);
        }
        return Promise.resolve({ data: { ...invoice }, error: null }).then(resolve);
      }
      if (this.table === 'invoice_items') return Promise.resolve(linesError ? { data: null, error: { message: 'offline' } } : { data: [{ description: 'Volledige omschrijving die langer is dan veertig tekens en daarom moet doorlopen tot FINAL_MARKER', quantity: 1, price: 1.005, vat_percentage: 21, subtotal: 1.01 }], error: null }).then(resolve);
      if (this.table === 'settings') return Promise.resolve({ data: { company_name: 'Testbedrijf', iban: 'TEST-IBAN', payment_terms: 14 }, error: null }).then(resolve);
      return Promise.resolve({ data: null, error: null }).then(resolve);
    }
  }
  globalThis.__invoiceTestClient = () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'test-admin' } }, error: null }) },
    from: table => new Query(table),
    storage: { from: () => ({
      remove: () => { throw new Error('Must never delete the previous PDF before upload succeeds'); },
      upload: async (path, bytes) => { uploaded = { path, bytes: Buffer.from(bytes) }; if (staleOnAttach) invoice.edit_version++; return { error: uploadError ? { message: 'storage offline' } : null }; },
    }) },
  });
  globalThis.Deno = { serve: fn => { handler = fn; }, env: { get: () => 'test-only' } };
  await build({ entryPoints: ['supabase/functions/generate-invoice-pdf/index.ts'], outfile: `${dir}/edge.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent', plugins: [{ name: 'edge-test-imports', setup(b) {
    b.onResolve({ filter: /^https:\/\/esm.sh\/@supabase\/supabase-js/ }, () => ({ path: 'supabase-test', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const createClient = (...args) => globalThis.__invoiceTestClient(...args);', loader: 'js' }));
    b.onResolve({ filter: /^https:\/\/esm.sh\/jspdf/ }, () => ({ path: 'jspdf', external: true }));
  } }] });
  await import(pathToFileURL(`${dir}/edge.mjs`).href);
  const request = () => new Request('https://example.invalid/functions/v1/generate-invoice-pdf', { method: 'POST', headers: { Authorization: 'Bearer test-only', 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: 'test-invoice' }) });
  await test('invoice PDF uses stored cents and retains full descriptions and precise unit prices', async () => {
    reset(); const response = await handler(request()); assert.equal(response.status, 200);
    assert.equal(uploaded.path, 'invoices/test-invoice-v1.pdf'); assert.equal(updatePath, uploaded.path);
    const pdf = uploaded.bytes.toString('latin1'); assert.ok(pdf.includes('1,01')); assert.ok(pdf.includes('1,005')); assert.ok(pdf.includes('FINAL_MARKER'));
  });
  await test('concurrent invoice edit prevents attaching an outdated PDF', async () => {
    reset(); staleOnAttach = true; const response = await handler(request()); assert.equal(response.status, 409); assert.equal(updatePath, undefined);
  });
  await test('missing invoice lines or failed storage never replace the existing PDF', async () => {
    reset(); linesError = true; assert.equal((await handler(request())).status, 500); assert.equal(uploaded, undefined);
    reset(); uploadError = true; assert.equal((await handler(request())).status, 500); assert.equal(updatePath, undefined); assert.equal(invoice.pdf_storage_path, 'old-valid.pdf');
  });
  console.log(`${passed} invoice regression tests passed; no live data changed`);
} finally {
  globalThis.Deno = oldDeno; delete globalThis.__invoiceTestClient;
  await rm(dir, { recursive: true, force: true });
}
