import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dir = await mkdtemp(resolve('.ha-auth-test-'));
try {
  await build({ entryPoints: ['api/ha-db.ts'], outfile: `${dir}/api.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  const { authorizeRequest, buildWhere, executeAuthorized, default: handler } = await import(pathToFileURL(`${dir}/api.mjs`).href);
  const access = (...modules) => ({ is_admin: false, modules });
  const admin = { is_admin: true, modules: [] };
  const request = (table, action = 'select', other = {}) => ({ action, table, ...other });
  let passed = 0;
  const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };

  await test('quotes-only users retain customer and branding lookup, but cannot reach finance or credentials', () => {
    for (const table of ['customers', 'settings']) assert.doesNotThrow(() => authorizeRequest(access('quotes'), request(table)));
    for (const table of ['invoices', 'invoice_items', 'invoice_counters', 'password_vault', 'user_roles', 'user_module_access', 'managed_users', 'linkedin_connections']) {
      for (const action of ['select', 'insert', 'update', 'delete', 'upsert']) {
        assert.throws(() => authorizeRequest(access('quotes'), request(table, action)), /Forbidden/);
      }
    }
    assert.throws(() => authorizeRequest(access('quotes'), request('settings', 'update')), /Forbidden/);
    assert.throws(() => authorizeRequest(access('quotes'), request('customers', 'insert')), /Forbidden/);
  });

  await test('unrelated and forged module grants cannot grant admin or vault access', () => {
    for (const modules of [[], ['factuur_maker'], ['tankprijzen'], ['tickets'], ['admin'], ['settings']]) {
      assert.throws(() => authorizeRequest(access(...modules), request('user_roles', 'upsert', { is_admin: true, modules: ['invoices'] })), /Forbidden/);
      assert.throws(() => authorizeRequest(access(...modules), request('password_vault')), /Forbidden/);
    }
    assert.doesNotThrow(() => authorizeRequest(access('passwords'), request('password_vault', 'update')));
    assert.throws(() => authorizeRequest(access('passwords'), request('invoices')), /Forbidden/);
  });

  await test('dashboard and VAT access is read-only and nested relations require their own permission', () => {
    for (const table of ['customers', 'invoices', 'domains']) assert.doesNotThrow(() => authorizeRequest(access('dashboard'), request(table)));
    assert.throws(() => authorizeRequest(access('dashboard'), request('invoices', 'update')), /Forbidden/);
    assert.doesNotThrow(() => authorizeRequest(access('btw_overzicht'), request('invoices', 'select', { columns: 'id,total' })));
    assert.throws(() => authorizeRequest(access('btw_overzicht'), request('invoices', 'select', { columns: 'id,customers(email)' })), /Forbidden/);
    assert.doesNotThrow(() => authorizeRequest(access('invoices'), request('invoices', 'select', { columns: 'id,customers(name,email)' })));
  });

  await test('invoice-producing workflows keep their scoped write and return permissions', () => {
    for (const module of ['domains', 'time_entries']) {
      assert.doesNotThrow(() => authorizeRequest(access(module), request('invoices', 'insert', { returning: '*' })));
      assert.doesNotThrow(() => authorizeRequest(access(module), request('invoice_items', 'insert')));
      assert.doesNotThrow(() => authorizeRequest(access(module), request('activity_logs', 'insert')));
      assert.throws(() => authorizeRequest(access(module), request('invoice_items', 'upsert')), /Forbidden/);
      assert.throws(() => authorizeRequest(access(module), request('invoices', 'delete')), /Forbidden/);
      assert.throws(() => authorizeRequest(access(module), request('activity_logs', 'insert', { returning: '*' })), /Forbidden/);
    }
    assert.doesNotThrow(() => authorizeRequest(access('time_entries'), request('time_entries', 'select', { columns: 'id,invoices(invoice_number)' })));
  });

  await test('admin access remains bounded to known tables, actions and RPCs', () => {
    for (const table of ['invoices', 'password_vault', 'managed_users', 'user_roles']) assert.doesNotThrow(() => authorizeRequest(admin, request(table, 'update')));
    assert.throws(() => authorizeRequest(admin, request('auth.users')), /not allowed/);
    assert.throws(() => authorizeRequest(admin, { action: 'execute_sql', sql: 'select 1' }), /Unsupported/);
    assert.throws(() => authorizeRequest(admin, { action: 'rpc', fn: 'arbitrary_function' }), /not allowed/);
  });

  await test('invoice-number RPC requires an invoice-producing module', () => {
    const rpc = { action: 'rpc', fn: 'generate_invoice_number', args: { p_year: 2026 } };
    for (const module of ['invoices', 'domains', 'time_entries']) assert.doesNotThrow(() => authorizeRequest(access(module), rpc));
    for (const module of ['quotes', 'dashboard', 'btw_overzicht', 'factuur_maker']) assert.throws(() => authorizeRequest(access(module), rpc), /Forbidden/);
  });
  await test('atomic invoice save requires invoice access and cannot be invoked by quote-only users', () => {
    const rpc = { action: 'rpc', fn: 'save_invoice', args: { p_invoice: {} } };
    assert.doesNotThrow(() => authorizeRequest(access('invoices'), rpc));
    assert.doesNotThrow(() => authorizeRequest(admin, rpc));
    for (const module of ['quotes', 'domains', 'time_entries', 'dashboard']) assert.throws(() => authorizeRequest(access(module), rpc), /Forbidden/);
  });
  await test('mutation RETURNING aliases and single-row responses work for invoice uploads', async () => {
    const calls = [];
    const db = { async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('array(select module_key')) return { rows: [{ is_admin: false, modules: ['invoices'] }] };
      return { rows: [{ id: 'saved-invoice' }] };
    } };
    for (const action of ['insert', 'update', 'delete', 'upsert']) {
      const result = await executeAuthorized('supabase', '0e161dba-150e-451f-adca-16001610511c', request('invoices', action, { values: { id: 'saved-invoice' }, filters: [], returning: 'id', singleMode: 'single' }), db);
      assert.equal(result.data.id, 'saved-invoice');
      assert.match(calls.at(-1).sql, /public\."invoices" as t/);
      assert.match(calls.at(-1).sql, /returning t\."id"/);
    }
  });

  await test('IS accepts only literal null/booleans and rejects SQL-bearing strings and objects', () => {
    for (const [value, keyword] of [[null, 'NULL'], [true, 'TRUE'], [false, 'FALSE']]) {
      assert.deepEqual(buildWhere([{ op: 'is', column: 'deleted_at', value }]), { where: ` where "deleted_at" IS ${keyword}`, params: [], next: 1 });
    }
    for (const value of ['NULL OR TRUE --', 'NULL; SELECT 1', 'true', 'false', 0, 1, undefined, {}, []]) {
      assert.throws(() => buildWhere([{ op: 'is', column: 'deleted_at', value }]), /Invalid IS/);
    }
  });

  await test('ordinary filters bind hostile input as data and reject hostile identifiers', () => {
    const hostile = "x' OR TRUE --";
    assert.deepEqual(buildWhere([{ op: 'eq', column: 'invoice_number', value: hostile }]), { where: ' where "invoice_number" = $1', params: [hostile], next: 2 });
    assert.throws(() => buildWhere([{ op: 'eq', column: 'id; SELECT 1', value: 1 }]), /Invalid identifier/);
  });

  await test('unauthorized operations never execute a data query or set caller claims', async () => {
    const calls = [];
    const db = { async query(sql, params) { calls.push({ sql, params }); return { rows: [{ is_admin: false, modules: ['quotes'] }] }; } };
    await assert.rejects(() => executeAuthorized('supabase', '0e161dba-150e-451f-adca-16001610511c', request('invoices', 'delete'), db), /Forbidden/);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /array\(select module_key/);
  });

  await test('RPC receives verified caller claims before execution, never request-supplied roles', async () => {
    const userId = '0e161dba-150e-451f-adca-16001610511c';
    const calls = [];
    const db = { async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('array(select module_key')) return { rows: [{ is_admin: false, modules: ['invoices'] }] };
      return { rows: [{ value: '2026-1000' }] };
    } };
    const result = await executeAuthorized('supabase', userId, { action: 'rpc', fn: 'generate_invoice_number', args: { p_year: 2026, sub: 'forged', role: 'service_role' } }, db);
    assert.equal(result.data, '2026-1000');
    assert.equal(calls.length, 3);
    assert.match(calls[1].sql, /set_config\('request.jwt.claim.sub',\$1,true\)/);
    assert.deepEqual(calls[1].params, [userId, JSON.stringify({ sub: userId, role: 'authenticated' })]);
    assert.match(calls[2].sql, /public.generate_invoice_number/);
    assert.deepEqual(calls[2].params, [2026]);
  });

  await test('unauthenticated and wrong-method requests stop without database connections', async () => {
    for (const [method, expected] of [['GET', 405], ['POST', 401]]) {
      let status;
      const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
      await handler({ method, headers: {}, body: request('invoices') }, res);
      assert.equal(status, expected);
    }
  });
  console.log(`${passed} HA authorization tests passed`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
