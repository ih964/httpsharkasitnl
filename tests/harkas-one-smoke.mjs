// Run against an isolated local build only: npm run preview -- --host 127.0.0.1 --port 4173
// Test dependency: npm install --no-save --ignore-scripts @playwright/test@1.64.1
// Browser: npx playwright install --with-deps chromium
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const origin = process.env.HARKAS_ONE_TEST_ORIGIN || 'http://127.0.0.1:4173';
assert.equal(new URL(origin).hostname, '127.0.0.1', 'browser tests must stay on isolated loopback');
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'synthetic-test-signature'].join('.');
const ticket = { id: '22222222-2222-4222-8222-222222222222', subject: 'Test: printerinstellingen', ticket_no: 42, status: 'nieuw', priority: 'normaal', customer_id: user.id, last_activity_at: '2026-11-04T10:00:00Z' };
const accounts = ['info', 'administratie', 'support'];
let sent = 0, privateCalls = 0, failingAccount, failSend = false, sendAttempts = 0, trashCalls = 0;
const trashed = new Set();
const errors = [];
async function setup(admin = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Expose-Headers': 'content-range', ...headers }, body: JSON.stringify(body) });
    if (url.hostname.endsWith('.supabase.co')) {
      if (req.method() === 'OPTIONS') return json({});
      if (url.pathname === '/auth/v1/token') return json({ access_token: jwt, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user });
      if (url.pathname === '/auth/v1/user') return json(user);
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      if (url.pathname.endsWith('/user_roles')) return json(admin ? { role: 'admin' } : null);
      if (url.pathname.endsWith('/user_module_access')) return json([]);
      if (url.pathname.endsWith('/support_tickets')) return json(req.method() === 'HEAD' ? null : [ticket], 200, { 'content-range': '0-0/3' });
      return json([]);
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      privateCalls++;
      if (url.pathname === '/api/ha-db') {
        const payload = req.postDataJSON();
        return json({ data: payload.head ? null : [], error: null, count: payload.table === 'customers' ? 12 : 4 });
      }
      if (url.pathname === '/api/admin-mail') {
        const account = url.searchParams.get('account'), action = url.searchParams.get('action');
        if (action === 'list' && account === failingAccount) return json({ error: 'Test: mailbox niet bereikbaar' }, 503);
        if (action === 'list') return json({ account: account+'@harkasit.nl', folder: 'INBOX', page: 1, total: trashed.has(account) ? 0 : 1, uidValidity: '12345', folders: [{ path: 'INBOX', name: 'Postvak IN' }], messages: [{ uid: 100 + accounts.indexOf(account), subject: 'Bericht voor '+account, from: [{ name: 'Testafzender', address: 'reply@example.invalid' }], date: '2026-11-04T10:30:00Z', unread: true }].filter(() => !trashed.has(account)) });
        if (action === 'message') return json({ uid: Number(url.searchParams.get('uid')), account: account+'@harkasit.nl', subject: 'Bericht voor '+account, from: [{ name: 'Testafzender', address: 'reply@example.invalid' }], to: [{ name: '', address: account+'@harkasit.nl' }], replyTo: [{ name: '', address: 'reply@example.invalid' }], date: '2026-11-04T10:30:00Z', text: '<img src=x onerror="window.XSS=true">\nDit is veilige testtekst.', attachments: [] });
        if (action === 'send') {
          assert.equal(req.method(), 'POST'); assert.equal(req.postDataJSON().to, 'reply@example.invalid'); sendAttempts++;
          if (failSend) return json({ error: 'Test: de mailserver heeft het bericht geweigerd.' }, 503);
          sent++; return json({ sent: true, saved: true });
        }
        if (action === 'trash') {
          assert.equal(req.method(), 'POST'); assert.equal(url.searchParams.get('uidValidity'), '12345');
          assert.equal(Number(url.searchParams.get('uid')), 100 + accounts.indexOf(account));
          trashCalls++; trashed.add(account); return json({ moved: true, folder: 'Trash' });
        }
        throw new Error('Unexpected mail action '+action);
      }
      if (url.pathname === '/api/support-mailbox') return json({ awaitingReply: [] });
      return json({});
    }
    if (url.origin !== origin) return route.abort(); // No live credentials, customer data or writes leave this isolated test.
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { page, context };
}
async function login(page) {
  await page.goto(origin + '/admin/one/');
  await page.getByLabel('E-mailadres', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Wachtwoord', { exact: true }).fill('synthetic-not-a-real-password');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
}
try {
  const { page, context } = await setup();
  await page.goto(origin+'/admin/one/');
  await page.getByRole('heading', { name: /Alles voor je werkdag/ }).waitFor();
  assert.equal(privateCalls, 0, 'logged-out route must not fetch business data');
  console.log('PASS logged-out mobile login: no private requests');
  await login(page);
  await page.getByRole('heading', { name: /Grip op je werkdag/ }).waitFor({ timeout: 15000 });
  await page.getByText('Bericht voor support', { exact: true }).waitFor();
  assert.equal(await page.locator('.one-metric').count(), 3);
  assert.equal(await page.locator('.one-mail-row').count(), 3);
  assert.equal(await page.locator('.one-metric').first().locator('strong').innerText(), '3');
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `dashboard overflow at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('PASS authenticated dashboard, three mailbox sources, 360/390/768/1280px widths');
  await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Mail', exact: true }).click();
  await page.getByText('Bericht voor info', { exact: true }).waitFor();
  await page.getByText('Bericht voor info', { exact: true }).click();
  await page.getByRole('heading', { name: 'Bericht voor info', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.XSS), undefined);
  assert.equal(await page.locator('.one-mail-body img').count(), 0);
  await page.getByRole('button', { name: 'Beantwoorden', exact: true }).click();
  assert.equal(await page.getByLabel('Aan', { exact: true }).inputValue(), 'reply@example.invalid');
  assert.equal(await page.getByLabel('Versturen vanaf').inputValue(), 'info');
  await page.getByRole('button', { name: 'Controleren en versturen' }).click();
  await page.getByRole('heading', { name: 'E-mail versturen?', exact: true }).waitFor();
  assert.equal(sent, 0, 'review must never send');
  await page.getByRole('button', { name: 'Terug naar bericht', exact: true }).click();
  assert.equal(await page.getByLabel('Aan', { exact: true }).inputValue(), 'reply@example.invalid');
  assert.equal(sent, 0, 'return from review must never send');
  await page.getByRole('button', { name: 'Versturen', exact: true }).click();
  await page.getByRole('heading', { name: 'E-mail versturen?', exact: true }).waitFor();
  failSend = true;
  await page.getByRole('button', { name: 'Versturen', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Test: de mailserver heeft het bericht geweigerd.' }).waitFor();
  assert.equal(sent, 0, 'server failure must not show sent');
  assert.ok(await page.locator('.one-send-preview').innerText(), 'draft remains after failure');
  failSend = false;
  await page.getByRole('button', { name: 'Versturen', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'E-mail verzonden.' }).waitFor();
  assert.equal(sent, 1, 'explicit confirmation sends exactly once to the test endpoint');
  assert.equal(sendAttempts, 2, 'only explicit confirmations submit, no automatic retries');
  console.log('PASS send review, cancellation, server error, draft retention, explicit retry and one accepted send');
  await page.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await page.getByRole('heading', { name: 'Naar de prullenbak?', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Annuleren', exact: true }).click();
  assert.equal(trashCalls, 0, 'cancel must never move a message');
  await page.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await page.getByRole('button', { name: 'Naar prullenbak', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'E-mail verplaatst naar de prullenbak van info@harkasit.nl.' }).waitFor();
  await page.getByText('Bericht voor info', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(trashCalls, 1, 'confirmation moves exactly the selected message');
  console.log('PASS trash confirmation, cancel, correct account/UID/validity and inbox refresh');
  await page.getByPlaceholder('Zoek afzender of onderwerp…').fill('no-match');
  await page.getByText('Geen resultaten in de ingeladen berichten.').waitFor();
  await page.getByPlaceholder('Zoek afzender of onderwerp…').fill('');
  failingAccount = 'administratie';
  await page.getByRole('button', { name: 'Mailboxen vernieuwen' }).click();
  await page.getByRole('alert').filter({ hasText: 'Test: mailbox niet bereikbaar' }).waitFor();
  assert.equal(await page.locator('.one-mail-row').count(), 1);
  console.log('PASS partial mailbox failure is explicit and leaves other mailboxes usable');
  failingAccount = undefined;
  await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Meer', exact: true }).click();
  await page.getByRole('heading', { name: 'Alles binnen bereik.' }).waitFor();
  assert.equal(await page.locator('.one-module').count(), 8);
  await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Tickets', exact: true }).click();
  await page.getByText('Test: printerinstellingen', { exact: true }).first().waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'tickets mobile overflow');
  console.log('PASS module navigation and embedded live-component ticket view');
  await page.goto(origin + '/admin/one/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).filter(key => key.startsWith('harkas-one-')).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat());
  assert.deepEqual(cached, ['/admin/one/offline.html']);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Even geen verbinding.' }).waitFor();
  console.log('PASS offline fallback; cache contains only public offline notice, not private data');
  await context.close();
  const restricted = await setup(false);
  const before = privateCalls;
  await login(restricted.page);
  await restricted.page.getByRole('heading', { name: 'Alleen voor beheerders' }).waitFor();
  assert.equal(privateCalls, before, 'non-admin must not fetch business APIs');
  await restricted.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS non-admin denied and no JavaScript runtime errors');
  console.log('ALL HARKAS ONE SMOKE TESTS PASSED. All mail/auth/business responses were synthetic fixtures. No live e-mail was sent.');
} finally { await browser.close(); }
