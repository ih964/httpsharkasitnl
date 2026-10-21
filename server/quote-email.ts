import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { buildQuotePdf } from '../src/lib/quotePdf';
import { euro, nlDate, todayNL, type Quote } from '../src/lib/quotes';

export class QuoteEmailError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const email = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function parseQuoteEmailRequest(args: Record<string, unknown>) {
  const id = String(args.p_id || ''), requestId = String(args.request_id || '');
  const version = Number(args.p_version);
  const to = String(args.recipient_email || '').trim().toLowerCase();
  const cc = [...new Set(String(args.cc_email || '').split(',').map(v => v.trim().toLowerCase()).filter(v => v && v !== to))].sort();
  if (!uuid.test(id) || !uuid.test(requestId) || !Number.isSafeInteger(version) || version < 1) throw new QuoteEmailError('Open de opgeslagen offerte opnieuw.');
  if (!email.test(to) || to.length > 254 || cc.length > 10 || cc.some(v => !email.test(v) || v.length > 254)) throw new QuoteEmailError('Vul geldige e-mailadressen in (maximaal 10 CC-adressen).');
  return { id, requestId, version, to, cc };
}

export function buildQuoteEmailPayload(q: Quote, to: string, cc: string[], logo?: Uint8Array) {
  const name = q.customer_snapshot.company_name || q.customer_snapshot.name || 'klant';
  const company = q.company_snapshot.company_name || 'Harkas IT';
  const text = [
    `Beste ${name},`, '',
    `Hierbij ontvangt u offerte ${q.quote_number} voor ${q.title} als PDF-bijlage.`,
    `Totaal inclusief btw: ${euro(Number(q.total))}`,
    `Geldig tot: ${nlDate(q.valid_until)}`, '',
    'Heeft u vragen of wilt u akkoord geven? Beantwoord dan deze e-mail onder vermelding van het offertenummer.', '',
    'Met vriendelijke groet,', company,
  ].join('\n');
  return {
    from: 'Harkas IT <info@harkasit.nl>', reply_to: 'info@harkasit.nl',
    to: [to], ...(cc.length ? { cc } : {}),
    subject: `Offerte ${q.quote_number} – ${q.title.replace(/[\r\n]/g, ' ')}`,
    text, html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:620px">${text.split('\n\n').map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`,
    attachments: [{ filename: `${q.quote_number}.pdf`, content: Buffer.from(buildQuotePdf(q, logo).output('arraybuffer')).toString('base64') }],
  };
}

type Delivery = { id: string; quote_id: string; quote_version: number; recipient_email: string; cc_emails: string[]; state: string; payload: unknown; created_at: string | Date; provider_id?: string };
type RenewLease = (db: PoolClient, peer: Pool) => Promise<void>;
const pendingMessage = 'De verzending is nog niet bevestigd. Probeer dezelfde verzending opnieuw; de bestaande verzendopdracht wordt hergebruikt.';

/** Called within an authorized, writer-fenced transaction; commits its own work. */
export async function sendQuoteEmail(db: PoolClient, peer: Pool, args: Record<string, unknown>, userId: string, renewLease: RenewLease): Promise<Quote> {
  if (!process.env.RESEND_API_KEY) throw new QuoteEmailError('E-mailverzending is nog niet ingesteld.', 503);
  const input = parseQuoteEmailRequest(args);
  const quote = (await db.query('select to_jsonb(q) as data from public.quotes q where id=$1 for update', [input.id])).rows[0]?.data as Quote | undefined;
  if (!quote) throw new QuoteEmailError('Offerte niet gevonden.', 404);
  let delivery = (await db.query('select * from public.quote_email_deliveries where id=$1', [input.requestId])).rows[0] as Delivery | undefined;
  const sameRecipients = (d: Delivery) => d.quote_id === input.id && d.recipient_email === input.to && JSON.stringify(d.cc_emails) === JSON.stringify(input.cc);
  if (delivery && !sameRecipients(delivery)) throw new QuoteEmailError('Deze verzendopdracht hoort bij andere offertegegevens.', 409);
  if (delivery?.state === 'sent') { await db.query('commit'); return quote; }
  if (delivery?.state === 'failed') throw new QuoteEmailError('De provider heeft deze verzending geweigerd. Sluit het venster en controleer de ontvanger voordat je opnieuw verstuurt.');
  if (!delivery) {
    delivery = (await db.query("select * from public.quote_email_deliveries where quote_id=$1 and state='pending'", [input.id])).rows[0] as Delivery | undefined;
    if (delivery && (!sameRecipients(delivery) || delivery.quote_version !== input.version)) throw new QuoteEmailError('Een eerdere verzending wacht nog op bevestiging. Rond die verzending met dezelfde ontvangers eerst af.', 409);
  }
  if (!delivery) {
    if (quote.version !== input.version) throw new QuoteEmailError('De offerte is elders gewijzigd. Vernieuw het overzicht.', 409);
    if (!['concept', 'verzonden'].includes(quote.status) || quote.valid_until < todayNL()) throw new QuoteEmailError('Alleen geldige concepten of verzonden offertes kunnen worden gemaild.');
    const logo = new Uint8Array(await readFile(join(process.cwd(), 'src/assets/logo.png')));
    const payload = buildQuoteEmailPayload(quote, input.to, input.cc, logo);
    delivery = (await db.query(`insert into public.quote_email_deliveries(id,quote_id,quote_version,recipient_email,cc_emails,payload,created_by)
      values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) returning *`, [input.requestId,input.id,quote.version,input.to,JSON.stringify(input.cc),JSON.stringify(payload),userId])).rows[0] as Delivery;
  }
  // Resend keeps idempotency keys for 24 hours. Never retry beyond that window.
  if (Date.now() - new Date(delivery.created_at).getTime() > 23 * 60 * 60 * 1000) throw new QuoteEmailError('Deze verzending heeft langer dan 23 uur een onzekere status. Controleer eerst de verzendregistratie bij de e-mailprovider; opnieuw versturen is geblokkeerd.', 409);
  await db.query('commit');

  let response: Response, result: { id?: string };
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `quote/${delivery.id}` },
      body: JSON.stringify(delivery.payload), signal: AbortSignal.timeout(15000),
    });
    result = await response.json() as { id?: string };
  } catch { throw new QuoteEmailError(pendingMessage, 503); }
  if (!response.ok || !result.id) {
    // Only definite rejections release the quote. Timeouts/5xx/409 remain pending.
    if ([400,401,403,404,413,422].includes(response.status)) {
      await db.query('begin'); await renewLease(db, peer);
      await db.query("update public.quote_email_deliveries set state='failed' where id=$1 and state='pending'", [delivery.id]);
      await db.query('commit');
      throw new QuoteEmailError('De e-mailprovider heeft de verzending geweigerd. Controleer het ontvangeradres en de afzenderinstellingen.', 502);
    }
    throw new QuoteEmailError(pendingMessage, 503);
  }

  // A process crash after provider acceptance is recovered by the same stored request.
  await db.query('begin'); await renewLease(db, peer);
  await db.query('select id from public.quotes where id=$1 for update', [input.id]);
  const completed = (await db.query("update public.quote_email_deliveries set state='sent',provider_id=$2,sent_at=now() where id=$1 and state='pending' returning id", [delivery.id,result.id])).rowCount;
  if (completed) {
    await db.query(`update public.quotes set status=case when status='concept' then 'verzonden' else status end,
      version=version+1,updated_at=now(),emailed_at=now(),emailed_to=$2,emailed_cc=$3::jsonb where id=$1`, [input.id,input.to,JSON.stringify(input.cc)]);
  }
  const saved = (await db.query('select to_jsonb(q) as data from public.quotes q where id=$1', [input.id])).rows[0].data as Quote;
  await db.query('commit');
  return saved;
}
