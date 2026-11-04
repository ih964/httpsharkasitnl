// All auth, calendar, mail and push responses are synthetic. No production writes or push delivery.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { wallTime, toInstant, addDays } from '../src/pages/one/calendar-time.mjs';
const origin = 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'synthetic-test-signature'].join('.');
const day = wallTime(Date.now()).slice(0, 10);
const errors = [], records = [];
let writes = 0, failSave = false, failRead = false, pushState = null, subscribeCalls = 0, testCalls = 0, unsubscribeCalls = 0;
async function setup(permissionChoice = 'granted') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, timezoneId: 'America/Los_Angeles' });
  await context.addInitScript(({ permissionChoice }) => {
    window.__permissionRequests = 0;
    let permission = 'default', current = null;
    const pushManager = { getSubscription: async () => current, subscribe: async () => {
      current = { endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic-device', toJSON: () => ({ endpoint: current.endpoint, keys: { p256dh: 'synthetic', auth: 'synthetic' } }), unsubscribe: async () => { current = null; return true; } }; return current;
    } };
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => permission });
    Notification.requestPermission = async () => { window.__permissionRequests++; permission = permissionChoice; return permission; };
    window.PushManager = function () {};
    const registration = { pushManager, getNotifications: async () => [] };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: async () => registration, getRegistration: async () => registration, ready: Promise.resolve(registration) } });
  }, { permissionChoice });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Expose-Headers': 'content-range', ...headers }, body: JSON.stringify(body) });
    if (url.hostname.endsWith('.supabase.co')) {
      if (req.method() === 'OPTIONS') return json({});
      if (url.pathname === '/auth/v1/token') return json({ access_token: jwt, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user });
      if (url.pathname === '/auth/v1/user') return json(user);
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      if (url.pathname.endsWith('/user_roles')) return json({ role: 'admin' });
      if (url.pathname.endsWith('/user_module_access')) return json([]);
      if (url.pathname.endsWith('/support_tickets')) return json(req.method() === 'HEAD' ? null : [], 200, { 'content-range': '*/0' });
      if (url.pathname.endsWith('/one_calendar_events')) {
        assert.match(req.headers().authorization, /^Bearer /);
        if (req.method() === 'GET') {
          if (failRead) return json({ message: 'synthetic unavailable' }, 503);
          return json(records);
        }
        writes++;
        if (failSave) return json({ message: 'synthetic save failure' }, 503);
        const body = req.method() === 'DELETE' ? null : req.postDataJSON();
        if (req.method() === 'POST') {
          assert.equal(body.user_id, undefined, 'owner is assigned by database, not supplied by UI');
          const row = { ...body, user_id: user.id, updated_at: new Date().toISOString() }; records.push(row); return json([row], 201);
        }
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const index = records.findIndex(row => row.id === id);
        assert.ok(url.searchParams.get('updated_at')?.startsWith('eq.'), 'optimistic concurrency required');
        if (req.method() === 'PATCH') { records[index] = { ...records[index], ...body, updated_at: new Date().toISOString() }; return json([records[index]]); }
        if (req.method() === 'DELETE') { records.splice(index, 1); return json([{ id }]); }
      }
      if (url.pathname.endsWith('/functions/v1/harkas-one-push')) {
        const body = req.postDataJSON();
        if (body.action === 'status') return json({ publicKey: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), subscription: pushState, lastSuccessAt: new Date().toISOString() });
        if (body.action === 'subscribe') { subscribeCalls++; pushState = { calendar: true, tickets: true }; return json({ ok: true }); }
        if (body.action === 'unsubscribe') { unsubscribeCalls++; pushState = null; return json({ ok: true }); }
        if (body.action === 'preferences') { pushState = { calendar: body.calendar, tickets: body.tickets }; return json({ ok: true }); }
        if (body.action === 'test') { testCalls++; return json({ accepted: true }); }
        throw new Error('Unexpected push action');
      }
      if (/one_push_/.test(url.pathname)) throw new Error('Browser must not access private push tables');
      return json([]);
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/admin-mail') return json({ account: 'fixture@example.invalid', messages: [], total: 0, folders: [] });
      if (url.pathname === '/api/ha-db') return json({ data: [], count: 0, error: null });
      return json({});
    }
    if (url.origin !== origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/admin/one/');
  await page.getByLabel('E-mailadres', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Wachtwoord', { exact: true }).fill('synthetic');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.getByRole('heading', { name: /Grip op je werkdag/ }).waitFor();
  return { context, page };
}
try {
  const { page, context } = await setup();
  assert.equal(await page.evaluate(() => window.__permissionRequests), 0);
  assert.equal(await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link').count(), 5);
  await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Agenda', exact: true }).click();
  await page.getByRole('heading', { name: 'Jouw agenda.' }).waitFor();
  for (const width of [360, 390, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `agenda overflow ${width}`); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Afspraak toevoegen', exact: true }).first().click();
  await page.getByLabel('Titel', { exact: true }).fill('Zakelijke testafspraak');
  assert.equal(await page.getByLabel('Begindatum', { exact: true }).inputValue(), day, 'Amsterdam date even on a foreign-timezone handset');
  failSave = true;
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('alert').filter({ hasText: 'Opslaan is niet bevestigd' }).waitFor();
  assert.equal(records.length, 0);
  failSave = false;
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('status').filter({ hasText: 'Afspraak opgeslagen.' }).waitFor();
  assert.equal(records[0].starts_at, toInstant(day + 'T09:00'));
  assert.equal(records[0].kind, 'business');
  await page.getByRole('button', { name: 'Afspraak toevoegen', exact: true }).first().click();
  await page.getByLabel('Titel', { exact: true }).fill('Privé testafspraak');
  await page.getByLabel('Soort afspraak').selectOption('private');
  await page.getByLabel('Begintijd', { exact: true }).fill('11:00');
  await page.getByLabel('Eindtijd', { exact: true }).fill('10:00');
  const before = writes;
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('alert').filter({ hasText: 'eindtijd moet na' }).waitFor();
  assert.equal(writes, before, 'invalid interval must never reach server');
  await page.getByLabel('Eindtijd', { exact: true }).fill('12:00');
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('heading', { name: 'Privé testafspraak', exact: true }).waitFor();
  mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/one-agenda.png', fullPage: true });
  await page.locator('[aria-label="Agenda filter"]').getByRole('button', { name: 'Privé', exact: true }).click();
  assert.equal(await page.locator('article.one-event').count(), 1);
  await page.locator('article.one-event').getByRole('button', { name: 'Wijzigen' }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Privé afspraak gewijzigd');
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('heading', { name: 'Privé afspraak gewijzigd' }).waitFor();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('article.one-event').getByRole('button', { name: 'Verwijderen' }).click();
  assert.equal(records.length, 2);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('article.one-event').getByRole('button', { name: 'Verwijderen' }).click();
  await page.getByRole('status').filter({ hasText: 'Afspraak verwijderd.' }).waitFor();
  assert.equal(records.length, 1);
  await page.locator('[aria-label="Agenda filter"]').getByRole('button', { name: 'Alles', exact: true }).click();
  await page.getByRole('button', { name: 'Afspraak toevoegen', exact: true }).first().click();
  await page.getByLabel('Titel', { exact: true }).fill('Hele dag test');
  await page.getByLabel('Hele dag', { exact: true }).check();
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.getByRole('heading', { name: 'Hele dag test', exact: true }).waitFor();
  assert.equal(records[1].ends_at, toInstant(addDays(day, 1) + 'T00:00'));
  assert.equal(records[1].reminder_minutes, 0);
  failRead = true; await page.getByRole('button', { name: 'Agenda vernieuwen' }).click();
  await page.getByRole('alert').filter({ hasText: 'agenda kon niet worden opgehaald' }).waitFor(); failRead = false;
  console.log('PASS calendar CRUD, private/business filters, interval validation, all-day, foreign device timezone, explicit failure states and mobile widths');
  await page.getByRole('link', { name: 'Meldingen', exact: true }).first().click();
  await page.getByRole('button', { name: 'Meldingen inschakelen' }).waitFor();
  assert.equal(await page.evaluate(() => window.__permissionRequests), 0, 'no prompt without a gesture');
  await page.getByRole('button', { name: 'Meldingen inschakelen' }).click();
  await page.getByRole('heading', { name: 'Meldingen zijn ingeschakeld' }).waitFor();
  assert.equal(subscribeCalls, 1);
  await page.getByRole('button', { name: 'Testmelding', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'pushdienst heeft de test geaccepteerd' }).waitFor();
  assert.equal(testCalls, 1);
  await page.getByLabel('Nieuwe supporttickets', { exact: false }).uncheck();
  await page.getByRole('button', { name: 'Voorkeuren opslaan' }).click();
  await page.getByRole('status').filter({ hasText: 'Meldingsvoorkeuren opgeslagen.' }).waitFor();
  assert.deepEqual(pushState, { calendar: true, tickets: false });
  await page.screenshot({ path: 'test-results/one-meldingen.png', fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Uitloggen', exact: true }).click();
  await page.getByRole('button', { name: 'Inloggen', exact: true }).waitFor();
  assert.equal(unsubscribeCalls, 1, 'logout detaches push');
  assert.equal(pushState, null);
  await context.close();
  const denied = await setup('denied');
  await denied.page.getByRole('link', { name: 'Meldingen', exact: true }).first().click();
  await denied.page.getByRole('button', { name: 'Meldingen inschakelen' }).click();
  await denied.page.getByRole('alert').filter({ hasText: 'Meldingen zijn geblokkeerd' }).waitFor();
  assert.equal(subscribeCalls, 1, 'denied permission cannot register a device');
  await denied.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS explicit push opt-in, preferences, mocked test acceptance, logout unsubscribe and denied permission. No actual push sent.');
} finally { await browser.close(); }
