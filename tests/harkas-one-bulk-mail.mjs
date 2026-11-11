// Local-only browser integration tests. All auth, mailbox and write responses are synthetic.
// Start a build preview on loopback before running, as in harkas-one-checks.yml.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const origin = process.env.HARKAS_ONE_TEST_ORIGIN || 'http://127.0.0.1:4173';
assert.equal(new URL(origin).hostname, '127.0.0.1', 'tests must stay on isolated loopback');
const browser = await chromium.launch({ headless: true });
const addresses = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' };
const accounts = Object.keys(addresses);
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'synthetic-test-signature'].join('.');
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync('test-results', { recursive: true });

async function setup({ size = 2, failAccount, incomplete = false, responseDelay = 0 } = {}) {
  const state = { calls: [], reads: 0, lists: 0, active: 0, maxActive: 0, failAccount, incomplete, responseDelay, validity: '12345', inbox: new Map() };
  for (const account of accounts) state.inbox.set(account, Array.from({ length: size }, (_, index) => ({
    // Deliberately reuse the same UIDs across mailboxes to catch account-isolation bugs.
    uid: index + 100, subject: `Test ${account} ${index + 1}`, from: [{ name: 'Testafzender', address: 'sender@example.invalid' }],
    date: '2026-11-11T08:00:00Z', unread: true,
  })));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: JSON.stringify(body) });
    if (url.hostname.endsWith('.supabase.co')) {
      if (req.method() === 'OPTIONS') return json({});
      if (url.pathname === '/auth/v1/token') return json({ access_token: jwt, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user });
      if (url.pathname === '/auth/v1/user') return json(user);
      if (url.pathname.endsWith('/user_roles')) return json({ role: 'admin' });
      return json([]);
    }
    if (url.origin === origin && url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/ha-db') return json({ data: [], error: null, count: 0 });
      if (url.pathname === '/api/support-mailbox') return json({ awaitingReply: [] });
      if (url.pathname !== '/api/admin-mail') return json({});
      const account = url.searchParams.get('account'), action = url.searchParams.get('action');
      assert.ok(accounts.includes(account), 'known account');
      if (action === 'list') {
        state.lists++;
        const page = Number(url.searchParams.get('page') || 1), inbox = state.inbox.get(account);
        return json({ account: addresses[account], folder: 'INBOX', total: inbox.length, uidValidity: state.validity, page, messages: inbox.slice((page - 1) * 30, page * 30) });
      }
      if (action === 'message') {
        state.reads++;
        const message = state.inbox.get(account).find(item => item.uid === Number(url.searchParams.get('uid')));
        return json({ ...message, account: addresses[account], to: [], replyTo: [], text: 'Synthetic test message.', attachments: [] });
      }
      assert.equal(action, 'trash-many', 'no unexpected writes');
      assert.equal(req.method(), 'POST');
      assert.equal(url.searchParams.get('folder'), 'INBOX');
      const { uids } = req.postDataJSON();
      assert.ok(Array.isArray(uids) && uids.length > 0 && uids.length <= 100);
      assert.equal(new Set(uids).size, uids.length);
      assert.ok(uids.every(uid => state.inbox.get(account).some(item => item.uid === uid)), 'only explicit messages in this mailbox');
      state.calls.push({ account, uids, validity: url.searchParams.get('uidValidity') });
      state.active++; state.maxActive = Math.max(state.maxActive, state.active);
      try {
        if (state.responseDelay) await delay(state.responseDelay);
        if (url.searchParams.get('uidValidity') !== state.validity) return json({ error: 'Test: verouderde berichtverwijzing.' }, 409);
        if (account === state.failAccount) return json({ error: 'Test: verbinding onderbroken.' }, 503);
        state.inbox.set(account, state.inbox.get(account).filter(item => !uids.includes(item.uid)));
        return json({ moved: true, movedUids: state.incomplete ? uids.slice(1) : uids, folder: 'Trash' });
      } finally { state.active--; }
    }
    if (url.origin !== origin) return route.abort(); // No network calls to live services.
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/admin/one/');
  await page.getByLabel('E-mailadres', { exact: true }).fill(user.email);
  await page.getByLabel('Wachtwoord', { exact: true }).fill('synthetic-not-a-real-password');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.getByRole('heading', { name: /Grip op je werkdag/ }).waitFor();
  assert.equal(await page.locator('.one-mail-check').count(), 0, 'compact dashboard has no selection');
  await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Mail', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mailboxen vernieuwen', exact: true })).toBeEnabled();
  return { page, context, state };
}
const selectedCount = page => page.locator('.one-selection-count');
const selectAll = page => page.getByRole('checkbox', { name: 'Alle getoonde e-mails selecteren', exact: true });
async function reviewSelection(page, count) {
  await page.getByRole('button', { name: `Verwijderen (${count})`, exact: true }).click();
  await page.getByRole('heading', { name: 'Geselecteerde e-mails verwijderen?', exact: true }).waitFor();
}
async function confirmSelection(page, count) {
  await reviewSelection(page, count);
  await page.getByRole('button', { name: `Naar prullenbak (${count})`, exact: true }).click();
}

try {
  const { page, context, state } = await setup({ responseDelay: 180 });
  await expect(page.locator('.one-mail-check input')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Verwijderen', exact: true })).toBeDisabled();
  const first = page.getByRole('checkbox', { name: 'Selecteer Test info 1 in info@harkasit.nl', exact: true });
  await first.check();
  await expect(selectedCount(page)).toHaveText('1 geselecteerd');
  assert.equal(state.reads, 0, 'checking a row must not open the message');
  assert.equal(await selectAll(page).evaluate(el => el.indeterminate), true);
  await page.getByRole('button', { name: 'Selectie wissen', exact: true }).click();
  await expect(selectedCount(page)).toHaveText('0 geselecteerd');
  await selectAll(page).check();
  await expect(selectedCount(page)).toHaveText('10 geselecteerd');
  await reviewSelection(page, 10);
  for (const address of Object.values(addresses)) await expect(page.locator('.one-trash-accounts')).toContainText(address + ': 2');
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'selection/review overflow at ' + width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/one-bulk-selection-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Annuleren', exact: true }).click();
  assert.equal(state.calls.length, 0, 'cancel makes no write requests');
  await expect(selectedCount(page)).toHaveText('10 geselecteerd');
  await page.getByRole('button', { name: 'Mailbox info@harkaswebbuilder.nl', exact: true }).click();
  await expect(selectedCount(page)).toHaveText('0 geselecteerd');
  await selectAll(page).check();
  await expect(selectedCount(page)).toHaveText('2 geselecteerd');
  await page.getByPlaceholder('Zoek afzender of onderwerp…').fill('2');
  await expect(selectedCount(page)).toHaveText('0 geselecteerd');
  await selectAll(page).check();
  await expect(selectedCount(page)).toHaveText('1 geselecteerd');
  await page.getByPlaceholder('Zoek afzender of onderwerp…').fill('no-match');
  await expect(selectedCount(page)).toHaveText('0 geselecteerd');
  await expect(selectAll(page)).toBeDisabled();
  await page.getByPlaceholder('Zoek afzender of onderwerp…').fill('');
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await selectAll(page).check();
  await confirmSelection(page, 10);
  await expect(page.getByRole('button', { name: 'Mailboxen vernieuwen', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Nieuwe e-mail', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Alle', exact: true })).toBeDisabled();
  await expect(page.getByPlaceholder('Zoek afzender of onderwerp…')).toBeDisabled();
  await expect(page.locator('.one-mail-check input').first()).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: '10 e-mails zijn naar de prullenbak verplaatst.' })).toBeVisible();
  await expect(page.locator('.one-mail-row')).toHaveCount(0);
  await expect(selectedCount(page)).toHaveText('0 geselecteerd');
  assert.equal(state.calls.length, 5, 'one request per mailbox, not per message');
  assert.equal(state.maxActive, 1, 'mailboxes are processed sequentially');
  assert.deepEqual(state.calls.map(call => call.account), accounts);
  assert.ok(state.calls.every(call => call.validity === '12345' && JSON.stringify(call.uids) === '[100,101]'));
  console.log('PASS five-account selection, same-UID isolation, select all, filters/search, cancel, responsive review, busy controls, sequential confirmed moves and refresh');
  await context.close();

  const partial = await setup({ failAccount: 'support' });
  await selectAll(partial.page).check();
  await confirmSelection(partial.page, 10);
  await expect(partial.page.getByRole('alert').filter({ hasText: '4 van 10 e-mails bevestigd verplaatst.' })).toBeVisible();
  await expect(partial.page.locator('.one-mail-row')).toHaveCount(6);
  await expect(selectedCount(partial.page)).toHaveText('0 geselecteerd');
  assert.equal(partial.state.calls.length, 3, 'first error stops later mailboxes');
  assert.deepEqual(partial.state.calls.map(call => call.account), ['info', 'administratie', 'support']);
  partial.state.failAccount = undefined;
  await partial.page.getByRole('checkbox', { name: 'Selecteer Test support 2 in support@harkasit.nl', exact: true }).check();
  await confirmSelection(partial.page, 1);
  await expect(partial.page.getByRole('status').filter({ hasText: '1 e-mail is naar de prullenbak verplaatst.' })).toBeVisible();
  assert.deepEqual(partial.state.calls.at(-1).uids, [101], 'manual retry only moves newly selected message');
  await partial.context.close();
  console.log('PASS partial failure reports confirmed count, stops queue without retries, clears selection and allows an explicit new single-message action');

  const ambiguous = await setup({ incomplete: true });
  await selectAll(ambiguous.page).check();
  await confirmSelection(ambiguous.page, 10);
  await expect(ambiguous.page.getByRole('alert').filter({ hasText: '0 van 10 e-mails bevestigd verplaatst.' })).toBeVisible();
  await expect(ambiguous.page.locator('.one-mail-row')).toHaveCount(8);
  assert.equal(ambiguous.state.calls.length, 1, 'incomplete confirmation must not continue or retry');
  await ambiguous.context.close();
  console.log('PASS incomplete delivery confirmation is not reported as success and is not retried');

  const stale = await setup();
  await selectAll(stale.page).check();
  await reviewSelection(stale.page, 10);
  stale.state.validity = '23456';
  await stale.page.getByRole('button', { name: 'Naar prullenbak (10)', exact: true }).click();
  await expect(stale.page.getByRole('alert').filter({ hasText: 'Test: verouderde berichtverwijzing.' })).toBeVisible();
  await expect(stale.page.locator('.one-mail-row')).toHaveCount(10);
  await expect(selectedCount(stale.page)).toHaveText('0 geselecteerd');
  assert.equal(stale.state.calls.length, 1, 'a stale reference stops all following writes');
  await selectAll(stale.page).check();
  await reviewSelection(stale.page, 10);
  await stale.page.getByRole('button', { name: 'Mailboxen vernieuwen', exact: true }).click();
  await expect(stale.page.getByRole('heading', { name: 'Geselecteerde e-mails verwijderen?', exact: true })).toHaveCount(0);
  await expect(selectedCount(stale.page)).toHaveText('0 geselecteerd');
  assert.equal(stale.state.calls.length, 1, 'refreshing a review does not execute it');
  await stale.context.close();
  console.log('PASS stale UIDVALIDITY and explicit refresh invalidate the selection and require new confirmation');

  const large = await setup({ size: 125 });
  await large.page.getByRole('button', { name: 'Mailbox info@harkasit.nl', exact: true }).click();
  await selectAll(large.page).check();
  await expect(selectedCount(large.page)).toHaveText('30 geselecteerd');
  await reviewSelection(large.page, 30);
  await large.page.getByRole('button', { name: 'Meer uit Info', exact: true }).click();
  await expect(large.page.locator('.one-mail-row')).toHaveCount(60);
  await expect(large.page.getByRole('heading', { name: 'Geselecteerde e-mails verwijderen?', exact: true })).toHaveCount(0);
  await expect(selectedCount(large.page)).toHaveText('30 geselecteerd');
  for (const count of [90,120,125]) {
    await large.page.getByRole('button', { name: 'Meer uit Info', exact: true }).click();
    await expect(large.page.locator('.one-mail-row')).toHaveCount(count);
  }
  await selectAll(large.page).check();
  await expect(selectedCount(large.page)).toHaveText('125 geselecteerd');
  await confirmSelection(large.page, 125);
  await expect(large.page.getByRole('status').filter({ hasText: '125 e-mails zijn naar de prullenbak verplaatst.' })).toBeVisible();
  await expect(large.page.locator('.one-mail-row')).toHaveCount(0);
  assert.deepEqual(large.state.calls.map(call => call.uids.length), [100,25]);
  assert.ok(large.state.calls.every(call => call.account === 'info'));
  assert.equal(new Set(large.state.calls.flatMap(call => call.uids)).size, 125);
  for (const account of accounts.slice(1)) assert.equal(large.state.inbox.get(account).length,125, 'hidden mailboxes remain untouched');
  await large.context.close();
  console.log('PASS select-all is limited to loaded/visible messages, loading more invalidates review, and 125 selections use bounded non-overlapping 100/25 batches');

  const abandoned = await setup({ responseDelay: 800 });
  await selectAll(abandoned.page).check();
  await confirmSelection(abandoned.page, 10);
  await expect.poll(() => abandoned.state.calls.length).toBe(1);
  await abandoned.page.goBack();
  await abandoned.page.getByRole('heading', { name: /Grip op je werkdag/ }).waitFor();
  await delay(1000);
  assert.equal(abandoned.state.calls.length, 1, 'leaving the list never starts the next mailbox');
  await abandoned.page.getByRole('navigation', { name: 'Hoofdnavigatie' }).getByRole('link', { name: 'Mail', exact: true }).click();
  await expect(abandoned.page.getByRole('button', { name: 'Mailboxen vernieuwen', exact: true })).toBeEnabled();
  await expect(selectedCount(abandoned.page)).toHaveText('0 geselecteerd');
  await abandoned.context.close();
  console.log('PASS browser-back/unmount stops remaining batches and leaves no stale selection or disabled controls');
  assert.deepEqual(errors, [], 'no JavaScript runtime errors');
  console.log('ALL HARKAS ONE BULK MAIL BROWSER TESTS PASSED. Synthetic data only; no live messages moved or sent.');
} finally { await browser.close(); }
