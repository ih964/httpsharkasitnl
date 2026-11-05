import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { pollMail } from './poll-mail.ts';

// Never log or expose signing secrets, subscription keys, endpoints or appointment content.
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = new Set(['https://www.harkasit.nl', 'https://harkasit.nl']);
const providers = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']);
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
function check(result: any) { if (result.error) throw new Error('database_operation_failed'); return result.data; }
function constantEqual(a: string, b: string) { let mismatch = a.length ^ b.length; for (let i = 0; i < b.length; i++) mismatch |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i); return mismatch === 0; }
function dateKey(value: string) { const parts = Object.fromEntries(dateFormat.formatToParts(new Date(value)).map(p => [p.type, p.value])); return `${parts.year}-${parts.month}-${parts.day}`; }
function endpoint(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) throw new RequestError(400, 'Ongeldig apparaat.');
  let u: URL; try { u = new URL(value); } catch { throw new RequestError(400, 'Ongeldig apparaat.'); }
  if (u.protocol !== 'https:' || u.port || u.username || u.password || u.hash || !providers.has(u.hostname) || u.pathname.length < 2) throw new RequestError(400, 'Deze pushdienst wordt nog niet ondersteund.');
  return value;
}
function bytes(value: unknown, length: number) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(value) || value.length > 128) throw new RequestError(400, 'Ongeldige apparaatsleutel.');
  try { const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/')); if (raw.length !== length || (length === 65 && raw.charCodeAt(0) !== 4)) throw 0; } catch { throw new RequestError(400, 'Ongeldige apparaatsleutel.'); }
  return value;
}
async function config(initialize = false) {
  let row = check(await db.from('one_push_config').select('*').eq('singleton', true).single());
  if (initialize && !row.vapid_public) {
    const pair = webpush.generateVAPIDKeys();
    check(await db.from('one_push_config').update({ vapid_public: pair.publicKey, vapid_private: pair.privateKey }).eq('singleton', true).is('vapid_public', null));
    row = check(await db.from('one_push_config').select('*').eq('singleton', true).single());
  }
  return row;
}
async function ownSubscription(userId: string, ep: string) { return check(await db.from('one_push_subscriptions').select('*').eq('user_id', userId).eq('endpoint', ep).maybeSingle()); }
async function deliver(sub: any, cfg: any, payload: object, ttl = 300) {
  try {
    await webpush.sendNotification({ endpoint: endpoint(sub.endpoint), keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify(payload), { vapidDetails: { subject: 'mailto:info@harkasit.nl', publicKey: cfg.vapid_public, privateKey: cfg.vapid_private }, TTL: Math.max(1, Math.min(900, ttl)), urgency: 'high', timeout: 4000 });
    return 'accepted';
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 410) { check(await db.from('one_push_subscriptions').delete().eq('id', sub.id)); return 'expired'; }
    return 'retry';
  }
}
async function dispatch(cfg: any) {
  const now = new Date(), floor = new Date(now.getTime() - 15 * 60000).toISOString();
  check(await db.from('one_push_config').update({ last_run_at: now.toISOString() }).eq('singleton', true));
  const subs = check(await db.from('one_push_subscriptions').select('*').order('created_at').limit(200));
  const admins = new Set(check(await db.from('user_roles').select('user_id').eq('role', 'admin')).map((x: any) => x.user_id));
  let accepted = 0, failed = 0, attempted = 0;
  const mailOk = !cfg.mail_poll_enabled || !subs.some((s: any) => s.mail_enabled && admins.has(s.user_id)) || await pollMail(db, cfg);
  for (const sub of subs) {
    if (!admins.has(sub.user_id)) { check(await db.from('one_push_subscriptions').delete().eq('id', sub.id)); continue; }
    const candidates: any[] = [];
    if (sub.calendar_enabled) {
      const rows = check(await db.rpc('one_due_calendar_reminders', { p_user: sub.user_id, p_now: now.toISOString() }));
      for (const e of rows) candidates.push({ type: 'calendar', id: e.id, version: e.reminder_version, offset: e.offset_minutes, at: e.remind_at, key: `calendar:${e.id}:${e.reminder_version}:${e.offset_minutes}:${sub.id}` });
    }
    if (sub.tickets_enabled) {
      const rows = check(await db.from('support_tickets').select('id,created_at').gte('created_at', sub.created_at > floor ? sub.created_at : floor).lte('created_at', now.toISOString()).order('created_at').limit(50));
      for (const t of rows) candidates.push({ type: 'ticket', id: t.id, at: t.created_at, key: `ticket:${t.id}:${sub.id}` });
    }
    if (sub.mail_enabled && sub.mail_enabled_at) {
      const since = sub.mail_enabled_at > floor ? sub.mail_enabled_at : floor;
      const rows = check(await db.from('one_mail_events').select('id,received_at').gte('received_at', since).lte('received_at', new Date().toISOString()).order('received_at').limit(100));
      for (const m of rows) candidates.push({ type: 'mail', id: m.id, at: m.received_at, key: `mail:${m.id}:${sub.id}` });
    }
    const existing = candidates.length ? check(await db.from('one_push_deliveries').select('delivery_key,state,lease_until,attempts').in('delivery_key', candidates.map(x => x.key))) : [];
    const skipped = new Set(existing.filter((x: any) => x.state !== 'processing' || x.attempts >= 4 || new Date(x.lease_until).getTime() > Date.now()).map((x: any) => x.delivery_key));
    for (const item of candidates) {
      if (attempted >= 10) break;
      if (skipped.has(item.key) || !check(await db.rpc('one_push_claim', { p_key: item.key, p_subscription: sub.id }))) continue;
      attempted++;
      const current = check(await db.from('one_push_subscriptions').select('id,calendar_enabled,tickets_enabled,mail_enabled,mail_enabled_at').eq('id', sub.id).eq('user_id', sub.user_id).maybeSingle());
      let payload: any = null;
      if (current && item.type === 'calendar' && current.calendar_enabled) {
        const e = check(await db.from('one_calendar_events').select('id,starts_at,all_day,reminder_offsets,reminder_version').eq('id', item.id).eq('user_id', sub.user_id).eq('reminder_version', item.version).maybeSingle());
        if (e && e.reminder_offsets.includes(item.offset) && new Date(item.at).getTime() <= Date.now() && new Date(item.at).getTime() > Date.now() - 15 * 60000) payload = { title: 'Harkas One · Afspraak', body: e.all_day ? 'Herinnering aan een dagafspraak. Open je agenda voor de details.' : `Je hebt een afspraak op ${dateKey(e.starts_at).split('-').reverse().join('-')} om ${timeFormat.format(new Date(e.starts_at))}. Open je agenda voor de details.`, url: `/admin/one/agenda?date=${dateKey(e.starts_at)}&event=${e.id}`, tag: item.key };
      } else if (current && item.type === 'ticket' && current.tickets_enabled) {
        const ticket = check(await db.from('support_tickets').select('id').eq('id', item.id).maybeSingle());
        if (ticket) payload = { title: 'Harkas One · Support', body: 'Er is een nieuw supportticket. Open de servicedesk voor de details.', url: `/admin/one/tickets?ticket=${item.id}`, tag: item.key };
      }
      if (current && item.type === 'mail' && current.mail_enabled && current.mail_enabled_at) {
        const message = check(await db.from('one_mail_events').select('account,uid,uid_validity,received_at').eq('id', item.id).gte('received_at', current.mail_enabled_at).maybeSingle());
        if (message && ['info', 'administratie', 'support'].includes(message.account)) payload = { title: 'Harkas One · E-mail', body: `Nieuwe e-mail in ${message.account}@harkasit.nl. Open de app om het bericht te lezen.`, url: `/admin/one/mail?account=${message.account}&uid=${encodeURIComponent(message.uid)}&validity=${encodeURIComponent(message.uid_validity)}`, tag: item.key };
      }
      if (!payload) { check(await db.from('one_push_deliveries').update({ state: 'obsolete' }).eq('delivery_key', item.key)); continue; }
      const ttl = Math.ceil((new Date(item.at).getTime() + 15 * 60000 - Date.now()) / 1000);
      if (ttl <= 0) { check(await db.from('one_push_deliveries').update({ state: 'obsolete' }).eq('delivery_key', item.key)); continue; }
      const outcome = await deliver(sub, cfg, payload, ttl);
      if (outcome === 'accepted') { accepted++; check(await db.from('one_push_deliveries').update({ state: 'accepted', accepted_at: new Date().toISOString() }).eq('delivery_key', item.key)); }
      else if (outcome === 'retry') failed++;
      else break;
    }
    if (attempted >= 10) break;
  }
  check(await db.from('one_push_deliveries').delete().lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString()));
  check(await db.from('one_mail_events').delete().lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString()));
  if (!failed) check(await db.from('one_push_config').update({ last_success_at: new Date().toISOString() }).eq('singleton', true));
  return { ok: failed === 0, accepted, failed, mailOk };
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers });
  try {
    if (origin && !origins.has(origin)) return json({ error: 'Origin niet toegestaan.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405);
    if (Number(req.headers.get('content-length') || 0) > 8192) return json({ error: 'Verzoek te groot.' }, 413);
    const text = await req.text(); if (text.length > 8192) return json({ error: 'Verzoek te groot.' }, 413);
    let body: any; try { body = JSON.parse(text); } catch { throw new RequestError(400, 'Ongeldig verzoek.'); }
    if (!body || typeof body !== 'object') throw new RequestError(400, 'Ongeldig verzoek.');
    if (body.action === 'dispatch') {
      const cfg = await config();
      if (!constantEqual(req.headers.get('x-one-cron') || '', cfg.cron_secret)) return json({ error: 'Niet geautoriseerd.' }, 401);
      return json(await dispatch(cfg.vapid_public ? cfg : await config(true)));
    }
    const bearer = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/.test(bearer)) return json({ error: 'Log opnieuw in.' }, 401);
    const identity = await db.auth.getUser(bearer.slice(7));
    if (identity.error || !identity.data.user) return json({ error: 'Log opnieuw in.' }, 401);
    const userId = identity.data.user.id;
    if (!check(await db.from('user_roles').select('user_id').eq('user_id', userId).eq('role', 'admin').maybeSingle())) return json({ error: 'Alleen voor beheerders.' }, 403);
    if (!['status', 'subscribe', 'unsubscribe', 'preferences', 'test'].includes(body.action)) throw new RequestError(400, 'Onbekende actie.');
    const cfg = await config(true);
    if (body.action === 'status') {
      const sub = body.endpoint ? await ownSubscription(userId, endpoint(body.endpoint)) : null;
      return json({ publicKey: cfg.vapid_public, lastRunAt: cfg.last_run_at, lastSuccessAt: cfg.last_success_at, mailReady: cfg.mail_poll_enabled, mailLastSuccessAt: cfg.mail_last_success_at, subscription: sub ? { calendar: sub.calendar_enabled, tickets: sub.tickets_enabled, mail: sub.mail_enabled } : null });
    }
    if (body.action === 'subscribe') {
      const s = body.subscription, ep = endpoint(s?.endpoint), p256dh = bytes(s?.keys?.p256dh, 65), auth_key = bytes(s?.keys?.auth, 16);
      const existing = check(await db.from('one_push_subscriptions').select('id,user_id').eq('endpoint', ep).maybeSingle());
      if (existing && existing.user_id !== userId) throw new RequestError(409, 'Dit apparaat is aan een ander account gekoppeld. Verwijder de apparaatkoppeling en schakel meldingen opnieuw in.');
      if (!existing) {
        const count = await db.from('one_push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        check(count); if ((count.count || 0) >= 10) throw new RequestError(409, 'Maximaal tien apparaten per account. Verwijder eerst een oude koppeling.');
        check(await db.from('one_push_subscriptions').insert({ user_id: userId, endpoint: ep, p256dh, auth_key }));
      } else check(await db.from('one_push_subscriptions').update({ p256dh, auth_key, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('user_id', userId));
      return json({ ok: true });
    }
    const ep = endpoint(body.endpoint), sub = await ownSubscription(userId, ep);
    if (body.action === 'unsubscribe') { check(await db.from('one_push_subscriptions').delete().eq('endpoint', ep).eq('user_id', userId)); return json({ ok: true, detached: Boolean(sub) }); }
    if (!sub) throw new RequestError(404, 'Dit apparaat is niet gekoppeld. Schakel meldingen opnieuw in.');
    if (body.action === 'preferences') {
      if (typeof body.calendar !== 'boolean' || typeof body.tickets !== 'boolean' || (body.mail !== undefined && typeof body.mail !== 'boolean')) throw new RequestError(400, 'Ongeldige instellingen.');
      check(await db.from('one_push_subscriptions').update({ calendar_enabled: body.calendar, tickets_enabled: body.tickets, ...(typeof body.mail === 'boolean' ? { mail_enabled: body.mail, mail_enabled_at: body.mail ? (sub.mail_enabled ? sub.mail_enabled_at : new Date().toISOString()) : null } : {}), updated_at: new Date().toISOString() }).eq('id', sub.id).eq('user_id', userId));
      return json({ ok: true });
    }
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const test = check(await db.from('one_push_subscriptions').update({ last_test_at: new Date().toISOString() }).eq('id', sub.id).eq('user_id', userId).or(`last_test_at.is.null,last_test_at.lt.${cutoff}`).select('id'));
    if (!test.length) throw new RequestError(429, 'Wacht 30 seconden tussen testmeldingen.');
    const result = await deliver(sub, cfg, { title: 'Harkas One', body: 'Je testmelding is aangekomen. Meldingen voor dit apparaat zijn gekoppeld.', url: '/admin/one/meldingen', tag: 'harkas-one-test' });
    if (result === 'expired') throw new RequestError(410, 'De apparaatkoppeling is verlopen. Schakel meldingen opnieuw in.');
    if (result !== 'accepted') throw new RequestError(503, 'De pushdienst heeft de test niet bevestigd. Probeer later opnieuw.');
    return json({ accepted: true });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error('harkas_one_push_request_failed');
    return json({ error: 'Meldingen zijn tijdelijk niet bereikbaar. Probeer opnieuw.' }, 503);
  }
});
