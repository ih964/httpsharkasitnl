export type QuoteStatus = 'concept' | 'verzonden' | 'geaccepteerd' | 'afgewezen' | 'verlopen' | 'gefactureerd';
export const quoteStatuses: Record<QuoteStatus, string> = {
  concept: 'Concept', verzonden: 'Verzonden', geaccepteerd: 'Geaccepteerd',
  afgewezen: 'Afgewezen', verlopen: 'Verlopen', gefactureerd: 'Gefactureerd',
};
export interface QuoteLine {
  description: string; quantity: number; price: number; vat_percentage: number;
  subtotal?: number; vat_total?: number;
}
export interface QuoteParty {
  name?: string; company_name?: string; email?: string; address?: string;
  postal_code?: string; city?: string; kvk?: string; kvk_number?: string;
  vat_number?: string; logo_url?: string;
}
export interface Quote {
  id: string; quote_number: string; customer_id: string; title: string;
  quote_date: string; valid_until: string; reference: string; notes: string; terms: string;
  discount_percentage: number; items: QuoteLine[]; subtotal: number; vat_total: number; total: number;
  customer_snapshot: QuoteParty; company_snapshot: QuoteParty; status: QuoteStatus;
  version: number; invoice_id: string | null; invoice_number: string | null;
  created_at: string; updated_at: string;
  emailed_at?: string | null; emailed_to?: string | null; emailed_cc?: string[] | null;
  pending_email_to?: string | null; pending_email_cc?: string[] | null;
}
export type QuoteDraft = Pick<Quote, 'id' | 'customer_id' | 'title' | 'quote_date' | 'valid_until' | 'reference' | 'notes' | 'terms' | 'discount_percentage' | 'items' | 'version'>;
export const euro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
export const nlDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}` : d;
export function todayNL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export const newQuoteLine = (): QuoteLine => ({ description: '', quantity: 1, price: 0, vat_percentage: 21 });
export function newQuoteDraft(): QuoteDraft {
  const date = todayNL();
  return { id: crypto.randomUUID(), customer_id: '', title: '', quote_date: date, valid_until: addDays(date, 30), reference: '', notes: '', terms: '', discount_percentage: 0, items: [newQuoteLine()], version: 0 };
}
// Fixed-point arithmetic, matching PostgreSQL NUMERIC and half-up rounding.
function scaled(value: number, places: number): bigint {
  if (!Number.isFinite(value) || value < 0) throw new Error('Gebruik geldige positieve bedragen en aantallen.');
  const parts = String(value).split('.');
  if (!/^\d+$/.test(parts[0]) || (parts[1]?.length ?? 0) > places) throw new Error(`Maximaal ${places} decimalen toegestaan.`);
  return BigInt(parts[0] + (parts[1] ?? '').padEnd(places, '0'));
}
const roundDivide = (n: bigint, d: bigint): bigint => (n + d / 2n) / d;
export function calculateQuote(items: QuoteLine[], discount: number) {
  if (discount < 0 || discount > 100) throw new Error('Korting moet tussen 0 en 100% liggen.');
  const factor = 10000n - scaled(discount, 2);
  let net = 0n, tax = 0n, gross = 0n;
  const byRate: Record<string, number> = {};
  const lines = items.map(item => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 100000 || item.price > 10000000) throw new Error('Controleer aantallen en prijzen.');
    if (![0, 9, 21].includes(item.vat_percentage)) throw new Error('Kies 0, 9 of 21% btw.');
    const base = scaled(item.quantity, 3) * scaled(item.price, 2);
    const subtotal = roundDivide(base * factor, 10000000n);
    const vat = roundDivide(subtotal * BigInt(item.vat_percentage), 100n);
    gross += roundDivide(base, 1000n); net += subtotal; tax += vat;
    byRate[item.vat_percentage] = (byRate[item.vat_percentage] ?? 0) + Number(vat);
    return { ...item, subtotal: Number(subtotal) / 100, vat_total: Number(vat) / 100 };
  });
  return { items: lines, subtotal: Number(net) / 100, vat_total: Number(tax) / 100, total: Number(net + tax) / 100, before_discount: Number(gross) / 100, discount_total: Number(gross - net) / 100, byRate: Object.fromEntries(Object.entries(byRate).map(([rate, cents]) => [rate, cents / 100])) };
}
export function effectiveQuoteStatus(q: Pick<Quote, 'status' | 'valid_until'>, today = todayNL()): QuoteStatus {
  return ['concept', 'verzonden'].includes(q.status) && q.valid_until < today ? 'verlopen' : q.status;
}
export function validateDraft(draft: QuoteDraft): string | null {
  if (!draft.customer_id) return 'Kies eerst een klant.';
  if (!draft.title.trim() || draft.title.length > 200) return 'Vul een onderwerp in (maximaal 200 tekens).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.quote_date) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.valid_until) || draft.valid_until < draft.quote_date) return 'Controleer de offertedatum en geldigheidsdatum.';
  if (draft.items.length < 1 || draft.items.length > 200 || draft.items.some(i => !i.description.trim() || i.description.length > 2000)) return 'Vul iedere regelomschrijving in (1 tot 200 regels).';
  if (draft.notes.length > 4000 || draft.terms.length > 8000 || draft.reference.length > 200) return 'Referentie, opmerkingen of voorwaarden zijn te lang.';
  try { calculateQuote(draft.items, draft.discount_percentage); } catch (e) { return e instanceof Error ? e.message : 'Controleer de bedragen.'; }
  return null;
}
