import { Pool, type PoolClient } from 'pg';
import { mailDatabaseOptions, mailFailureCode } from '../server/mail-database.js';
import { ImapFlow } from 'imapflow';
import { timingSafeEqual } from 'node:crypto';

// Internal scheduler only. Never accept user-supplied hosts, mailbox addresses or commands.
const ACCOUNTS = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' } as const;
let pool: Pool | undefined;
function database() {
  if (!pool) {
    pool = new Pool(mailDatabaseOptions(process.env.HARKAS_SUPABASE_DSN));
    pool.on('error', error => console.warn('Mail database idle connection failed', { code: mailFailureCode(error) }));
  }
  return pool;
}
export function newArrivals(messages: { uid: number; internalDate?: Date | string }[], last: number, upper: number, since: Date, now: Date) {
  const floor = Math.max(since.getTime(), now.getTime() - 15 * 60000);
  return messages.filter(m => Number.isSafeInteger(m.uid) && m.uid > last && m.uid <= upper && m.internalDate && new Date(m.internalDate).getTime() >= floor && new Date(m.internalDate).getTime() <= now.getTime())
    .map(m => ({ uid: m.uid, received_at: new Date(m.internalDate!).toISOString() }));
}
async function pollAccount(account: keyof typeof ACCOUNTS, sharedPassword: string, mailboxPasswords: Record<string, unknown>) {
  let sql: PoolClient | undefined;
  let imap: ImapFlow | undefined;
  try {
    let password = account === 'info' || account === 'administratie' ? sharedPassword : mailboxPasswords[account];
    if (account === 'support') {
      const row = (await database().query('select v.decrypted_secret from harkas_support_private.mailbox m join vault.decrypted_secrets v on v.id=m.secret_id where m.singleton')).rows[0];
      password = row && JSON.parse(row.decrypted_secret).password;
    }
    if (typeof password !== 'string' || !password || password.length > 4096) throw new Error('mailbox_not_configured');
    imap = new ImapFlow({ host: 'shared70.cloud86-host.nl', port: 993, secure: true, auth: { user: ACCOUNTS[account], pass: password }, logger: false, disableAutoIdle: true, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    imap.on('error', () => { /* Errors are surfaced by awaited commands; never log credentials or server text. */ });
    await imap.connect();
    // Connect to IMAP before reserving a database transaction. Slow mail servers
    // must not pin scarce database backends. The cursor and deduplication writes
    // remain protected together by the same transaction-local advisory lock.
    sql = await database().connect();
    await sql.query('begin');
    const lock = await sql.query("select pg_try_advisory_xact_lock(hashtext('harkas-one-mail'),hashtext($1)) as locked", [account]);
    if (!lock.rows[0].locked) { await sql.query('rollback'); return { account, skipped: true }; }
    // Read the high-water mark only after the lock; an overlapping run must not
    // mistake an older snapshot for a rebuilt mailbox and reset its cursor.
    const box = await imap.mailboxOpen('INBOX', { readOnly: true });
    const validity = String(box.uidValidity), high = Number(box.uidNext) - 1;
    if (!/^[0-9]+$/.test(validity) || !Number.isSafeInteger(high) || high < 0) throw new Error('invalid_mailbox_state');
    const previous = (await sql.query('select uid_validity,last_uid,initialized_at from public.one_mail_cursors where account=$1 for update', [account])).rows[0];
    // First activation / rebuilt IMAP folder establishes a baseline, not a historical mail storm.
    if (!previous || previous.uid_validity !== validity || Number(previous.last_uid) > high) {
      await sql.query('insert into public.one_mail_cursors(account,uid_validity,last_uid) values($1,$2,$3) on conflict(account) do update set uid_validity=excluded.uid_validity,last_uid=excluded.last_uid,initialized_at=now(),last_checked_at=now()', [account, validity, high]);
      await sql.query('commit');
      return { account, initialized: true, queued: 0 };
    }
    const last = Number(previous.last_uid), upper = Math.min(high, last + 2000);
    const messages = upper > last ? await imap.fetchAll(`${last + 1}:${upper}`, { uid: true, internalDate: true }, { uid: true }) : [];
    const arrivals = newArrivals(messages as { uid: number; internalDate?: Date | string }[], last, upper, new Date(previous.initialized_at), new Date());
    if (arrivals.length) await sql.query('insert into public.one_mail_events(account,uid_validity,uid,received_at) select $1,$2,x.uid,x.received_at from jsonb_to_recordset($3::jsonb) as x(uid bigint,received_at timestamptz) on conflict(account,uid_validity,uid) do nothing', [account, validity, JSON.stringify(arrivals)]);
    await sql.query('update public.one_mail_cursors set last_uid=$2,last_checked_at=now() where account=$1', [account, upper]);
    await sql.query('commit');
    return { account, queued: arrivals.length };
  } catch (error) {
    if (sql) await sql.query('rollback').catch(() => {});
    console.warn('harkas_one_mail_account_failed', { account, code: mailFailureCode(error) });
    return { account, failed: true };
  } finally { imap?.close(); sql?.release(); }
}
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode niet toegestaan.' });
  const token = req.headers['x-one-cron'];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ error: 'Niet geautoriseerd.' });
  if (Number(req.headers['content-length'] || 0) > 24576) return res.status(413).json({ error: 'Verzoek te groot.' });
  try {
    const config = (await database().query('select cron_secret,mail_poll_enabled from public.one_push_config where singleton')).rows[0];
    if (!config || token.length !== config.cron_secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(config.cron_secret))) return res.status(401).json({ error: 'Niet geautoriseerd.' });
    // Previews must never poll production mail or write arrival metadata.
    if (process.env.VERCEL_ENV !== 'production' || !config.mail_poll_enabled) return res.status(409).json({ error: 'Mailcontrole niet actief.' });
    const sharedPassword = req.body?.sharedPassword;
    if (typeof sharedPassword !== 'string' || !sharedPassword || sharedPassword.length > 4096) return res.status(400).json({ error: 'Ongeldig intern verzoek.' });
    const mailboxPasswords = req.body?.mailboxPasswords && typeof req.body.mailboxPasswords === 'object' && !Array.isArray(req.body.mailboxPasswords) ? req.body.mailboxPasswords : {};
    const results = await Promise.all((Object.keys(ACCOUNTS) as (keyof typeof ACCOUNTS)[]).map(account => pollAccount(account, sharedPassword, mailboxPasswords)));
    const ok = results.every(result => !('failed' in result) && !('skipped' in result));
    return res.status(ok ? 200 : 503).json({ ok, results });
  } catch (error) {
    console.warn('harkas_one_mail_poll_failed', { code: mailFailureCode(error) });
    return res.status(503).json({ error: 'Mailcontrole tijdelijk niet beschikbaar.' });
  }
}
