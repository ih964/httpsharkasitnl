import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileDown, Copy, Pencil, Save, ArrowLeft, Trash2, RefreshCw, FileText } from 'lucide-react';
import logoUrl from '@/assets/logo.png';
import { addDays, calculateQuote, effectiveQuoteStatus, euro, newQuoteDraft, newQuoteLine, nlDate, quoteStatuses, todayNL, validateDraft, type Quote, type QuoteDraft, type QuoteParty, type QuoteStatus } from '@/lib/quotes';

type Customer = QuoteParty & { id: string };
type Action = { quote: Quote; status?: QuoteStatus; convert?: boolean };
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const customerName = (c: QuoteParty) => c.company_name || c.name || 'Klant';
const errorMessage = (e: unknown) => e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'De actie is niet gelukt.';
const rpc = async (fn: string, args: Record<string, unknown>): Promise<Quote> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Geen bevestiging ontvangen. Vernieuw het overzicht voordat je opnieuw probeert.');
  return data as Quote;
};

export default function AdminQuotes() {
  const { canAccess } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(''), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState<QuoteDraft | null>(null), [saved, setSaved] = useState<Quote | null>(null);
  const [dirty, setDirty] = useState(false), [action, setAction] = useState<Action | null>(null);
  const [view, setView] = useState<Quote | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [q, c] = await Promise.all([
        supabase.from('quotes').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id,name,company_name,email,address,postal_code,city').order('name'),
      ]);
      if (q.error || c.error) throw new Error(q.error?.message || c.error?.message);
      setQuotes(q.data ?? []); setCustomers(c.data ?? []);
    } catch (e) { setLoadError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    // Protect in-app links as well as refresh/closing the tab.
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href]');
      if (a && !window.confirm('Er zijn niet-opgeslagen wijzigingen. Toch deze pagina verlaten?')) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', leave); document.removeEventListener('click', click, true); };
  }, [dirty]);
  const totals = useMemo(() => {
    try { return draft ? { value: calculateQuote(draft.items, draft.discount_percentage), error: '' } : null; }
    catch (e) { return { value: null, error: errorMessage(e) }; }
  }, [draft]);
  const filtered = quotes.filter(q => {
    const term = search.toLocaleLowerCase('nl-NL');
    return (filter === 'all' || effectiveQuoteStatus(q) === filter) && `${q.quote_number} ${q.title} ${customerName(q.customer_snapshot)}`.toLocaleLowerCase('nl-NL').includes(term);
  });
  const acceptLeave = () => !dirty || window.confirm('Niet-opgeslagen wijzigingen weggooien?');
  const edit = (q?: Quote, duplicate = false) => {
    if (!acceptLeave()) return;
    const fresh = newQuoteDraft();
    if (q) {
      setDraft({ ...fresh, ...q, items: q.items.map(i => ({ ...i })), ...(duplicate ? { id: fresh.id, version: 0, quote_date: fresh.quote_date, valid_until: fresh.valid_until } : {}) });
      setSaved(duplicate ? null : q);
    } else { setDraft(fresh); setSaved(null); }
    setDirty(Boolean(q && duplicate));
  };
  const patch = (change: Partial<QuoteDraft>) => { setDraft(d => d ? { ...d, ...change } : d); setDirty(true); };
  const remember = (q: Quote) => { setQuotes(old => [q, ...old.filter(o => o.id !== q.id)]); };
  const save = async () => {
    if (!draft || busy) return;
    const validation = validateDraft(draft); if (validation) { toast.error(validation); return; }
    setBusy(true);
    try {
      const q = await rpc('save_quote', { p_quote: draft }); remember(q); setSaved(q); setDraft(q); setDirty(false);
      toast.success(`Offerte ${q.quote_number} opgeslagen`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const pdf = async (q: Quote) => {
    setBusy(true);
    try {
      const { buildQuotePdf } = await import('@/lib/quotePdf');
      const response = await fetch(logoUrl); if (!response.ok) throw new Error('Het Harkas IT-logo kon niet worden geladen.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      buildQuotePdf(q, bytes).save(`${q.quote_number}.pdf`);
    } catch (e) { toast.error(`PDF maken mislukt: ${errorMessage(e)}`); } finally { setBusy(false); }
  };
  const confirmAction = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      const q = action.convert
        ? await rpc('convert_quote_to_invoice', { p_id: action.quote.id, p_version: action.quote.version })
        : await rpc('set_quote_status', { p_id: action.quote.id, p_version: action.quote.version, p_status: action.status });
      remember(q); if (view?.id === q.id) setView(q); setAction(null);
      toast.success(action.convert ? `Conceptfactuur ${q.invoice_number} aangemaakt. Niet automatisch verstuurd.` : `Status gewijzigd naar ${quoteStatuses[q.status]}`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const statusButtons = (q: Quote) => <div className="flex flex-wrap gap-2">
    {['concept', 'verzonden'].includes(q.status) && <>
      {q.status === 'concept' && <Button size="sm" variant="outline" disabled={busy || effectiveQuoteStatus(q) === 'verlopen'} onClick={() => setAction({ quote: q, status: 'verzonden' })}>Markeer verzonden</Button>}
      <Button size="sm" variant="outline" disabled={busy || effectiveQuoteStatus(q) === 'verlopen'} onClick={() => setAction({ quote: q, status: 'geaccepteerd' })}>Akkoord registreren</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setAction({ quote: q, status: 'afgewezen' })}>Afgewezen</Button>
    </>}
    {q.status === 'geaccepteerd' && canAccess('invoices') && <Button size="sm" disabled={busy} onClick={() => setAction({ quote: q, convert: true })}>Omzetten naar conceptfactuur</Button>}
    {q.invoice_id && canAccess('invoices') && <Button asChild size="sm" variant="outline"><Link to="/admin/invoices">Factuur {q.invoice_number}</Link></Button>}
  </div>;

  if (draft) return <div className="space-y-6 max-w-7xl mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Button variant="ghost" onClick={() => { if (acceptLeave()) { setDraft(null); setDirty(false); } }} disabled={busy}><ArrowLeft className="h-4 w-4 mr-2" />Alle offertes</Button>
        <h1 className="text-2xl font-bold">{saved?.quote_number || 'Nieuwe offerte'}</h1><p className="text-sm text-muted-foreground">{dirty ? 'Niet-opgeslagen wijzigingen' : saved ? 'Opgeslagen als concept' : 'Het offertenummer wordt bij opslaan toegekend.'}</p></div>
      <div className="flex gap-2"><Button variant="outline" disabled={busy || dirty || !saved} onClick={() => saved && void pdf(saved)}><FileDown className="mr-2 h-4 w-4" />PDF</Button><Button disabled={busy || (!dirty && Boolean(saved))} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{busy ? 'Bezig…' : 'Opslaan'}</Button></div>
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Offertegegevens</CardTitle></CardHeader><CardContent><fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 sm:col-span-2"><span className="text-sm font-medium">Klant *</span><select aria-label="Klant" className={selectClass} value={draft.customer_id} onChange={e => patch({ customer_id: e.target.value })}><option value="">Kies een klant</option>{customers.map(c => <option key={c.id} value={c.id}>{customerName(c)}{c.company_name && c.name ? ` — ${c.name}` : ''}</option>)}</select></label>
          {draft.customer_id && <p className="text-sm text-muted-foreground sm:col-span-2">{[customers.find(c => c.id === draft.customer_id)?.address, customers.find(c => c.id === draft.customer_id)?.email].filter(Boolean).join(' · ')}</p>}
          {customers.length === 0 && <p className="text-sm sm:col-span-2">Maak eerst een klant aan onder Klanten.</p>}
          <label className="space-y-1 sm:col-span-2"><span className="text-sm font-medium">Onderwerp *</span><Input maxLength={200} value={draft.title} onChange={e => patch({ title: e.target.value })} placeholder="Bijvoorbeeld: Microsoft 365 inrichting" /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Offertedatum *</span><Input type="date" value={draft.quote_date} onChange={e => patch({ quote_date: e.target.value })} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Geldig tot *</span><Input type="date" min={draft.quote_date} value={draft.valid_until} onChange={e => patch({ valid_until: e.target.value })} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Referentie</span><Input maxLength={200} value={draft.reference} onChange={e => patch({ reference: e.target.value })} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Korting over alle regels (%)</span><Input type="number" min="0" max="100" step="0.01" value={draft.discount_percentage} onChange={e => patch({ discount_percentage: Number(e.target.value) })} /></label>
        </fieldset></CardContent></Card>
        <Card><CardHeader><CardTitle>Diensten en producten</CardTitle><p className="text-sm text-muted-foreground">Prijzen zijn exclusief btw. Aantallen mogen maximaal 3 decimalen bevatten.</p></CardHeader><CardContent className="space-y-4">
          {draft.items.map((item, index) => <fieldset key={index} disabled={busy} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Regel {index + 1}</span><Button variant="ghost" size="icon" aria-label={`Regel ${index + 1} verwijderen`} disabled={draft.items.length === 1 || busy} onClick={() => patch({ items: draft.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button></div>
            <label className="block space-y-1"><span className="text-sm">Omschrijving *</span><Textarea maxLength={2000} value={item.description} rows={2} onChange={e => patch({ items: draft.items.map((v, i) => i === index ? { ...v, description: e.target.value } : v) })} /></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="space-y-1"><span className="text-sm">Aantal / uren</span><Input aria-label={`Aantal regel ${index + 1}`} type="number" min="0.001" max="100000" step="0.001" value={item.quantity} onChange={e => patch({ items: draft.items.map((v, i) => i === index ? { ...v, quantity: Number(e.target.value) } : v) })} /></label>
              <label className="space-y-1"><span className="text-sm">Prijs excl. btw</span><Input type="number" min="0" max="10000000" step="0.01" value={item.price} onChange={e => patch({ items: draft.items.map((v, i) => i === index ? { ...v, price: Number(e.target.value) } : v) })} /></label>
              <label className="space-y-1"><span className="text-sm">Btw</span><select className={selectClass} value={item.vat_percentage} onChange={e => patch({ items: draft.items.map((v, i) => i === index ? { ...v, vat_percentage: Number(e.target.value) } : v) })}>{[21, 9, 0].map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select></label>
              <div className="space-y-1"><span className="text-sm">Bedrag excl.</span><p className="h-10 flex items-center font-medium">{totals?.value ? euro(totals.value.items[index].subtotal) : '—'}</p></div>
            </div>
          </fieldset>)}
          <Button variant="outline" disabled={busy || draft.items.length >= 200} onClick={() => patch({ items: [...draft.items, newQuoteLine()] })}><Plus className="mr-2 h-4 w-4" />Regel toevoegen</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Toelichting en voorwaarden</CardTitle></CardHeader><CardContent className="space-y-4"><label className="block space-y-1"><span className="text-sm font-medium">Opmerkingen op de offerte</span><Textarea disabled={busy} maxLength={4000} rows={3} value={draft.notes} onChange={e => patch({ notes: e.target.value })} /></label><label className="block space-y-1"><span className="text-sm font-medium">Voorwaarden / planning</span><Textarea disabled={busy} maxLength={8000} rows={5} value={draft.terms} onChange={e => patch({ terms: e.target.value })} placeholder="Bijvoorbeeld: scope, oplevering en afspraken over betaling." /></label></CardContent></Card>
      </div>
      <Card className="h-fit xl:sticky xl:top-4"><CardHeader><CardTitle>Totaal</CardTitle></CardHeader><CardContent className="space-y-3">
        {totals?.error ? <p role="alert" className="text-destructive text-sm">{totals.error}</p> : totals?.value && <>
          {draft.discount_percentage > 0 && <><div className="flex justify-between text-sm"><span>Voor korting</span><span>{euro(totals.value.before_discount)}</span></div><div className="flex justify-between text-sm"><span>Korting {draft.discount_percentage}%</span><span>− {euro(totals.value.discount_total)}</span></div></>}
          <div className="flex justify-between"><span>Exclusief btw</span><span>{euro(totals.value.subtotal)}</span></div>
          {Object.entries(totals.value.byRate).map(([rate, value]) => <div className="flex justify-between text-sm" key={rate}><span>Btw {rate}%</span><span>{euro(value)}</span></div>)}
          <div className="flex justify-between font-bold text-lg border-t pt-3"><span>Inclusief btw</span><span>{euro(totals.value.total)}</span></div>
        </>}
        <p className="text-xs text-muted-foreground">Sla de offerte op voordat je de PDF downloadt. De database controleert en berekent alle bedragen opnieuw.</p>
        <Button className="w-full" disabled={busy} onClick={() => void save()}>{busy ? 'Bezig…' : 'Offerte opslaan'}</Button>
      </CardContent></Card>
    </div>
  </div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between items-center gap-4"><div><h1 className="text-2xl font-bold">Offertes</h1><p className="text-muted-foreground">Maak offertes, download de PDF en zet een akkoord om naar een conceptfactuur.</p></div><Button disabled={loading || Boolean(loadError)} onClick={() => edit()}><Plus className="h-4 w-4 mr-2" />Nieuwe offerte</Button></div>
    <div className="flex flex-wrap gap-3"><Input aria-label="Offertes zoeken" className="max-w-md" placeholder="Zoeken op nummer, klant of onderwerp…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter op status" className={`${selectClass} sm:w-48`} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Alle statussen</option>{Object.entries(quoteStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Button variant="outline" onClick={() => void load()} disabled={loading || busy}><RefreshCw className="h-4 w-4 mr-2" />Vernieuwen</Button></div>
    {loadError ? <Card><CardContent className="p-6"><p role="alert" className="text-destructive">Offertes laden mislukt: {loadError}</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Opnieuw proberen</Button></CardContent></Card> : loading ? <p role="status">Offertes laden…</p> : filtered.length === 0 ? <Card><CardContent className="p-10 text-center"><FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground" /><h2 className="font-semibold">{quotes.length ? 'Geen overeenkomende offertes' : 'Maak je eerste offerte'}</h2><p className="text-muted-foreground mt-2">{quotes.length ? 'Pas de zoekopdracht of statusfilter aan.' : 'Gebruik je bestaande klanten. Nummering en btw worden automatisch geregeld.'}</p></CardContent></Card> : <div className="grid gap-4">{filtered.map(q => <Card key={q.id}><CardContent className="p-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><button onClick={() => setView(q)} className="font-semibold text-primary hover:underline">{q.quote_number}</button><h2 className="font-medium mt-1">{q.title}</h2><p className="text-sm text-muted-foreground">{customerName(q.customer_snapshot)} · {nlDate(q.quote_date)} · geldig tot {nlDate(q.valid_until)}</p></div><div className="text-right"><p className="font-bold text-lg">{euro(Number(q.total))}</p><Badge variant="secondary">{quoteStatuses[effectiveQuoteStatus(q)]}</Badge></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setView(q)}>Bekijken</Button>{q.status === 'concept' && <Button variant="outline" size="sm" disabled={busy} onClick={() => edit(q)}><Pencil className="h-4 w-4 mr-2" />Bewerken</Button>}<Button variant="outline" size="sm" disabled={busy} onClick={() => void pdf(q)}><FileDown className="h-4 w-4 mr-2" />PDF</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => edit(q, true)}><Copy className="h-4 w-4 mr-2" />Dupliceren</Button></div>{statusButtons(q)}</CardContent></Card>)}</div>}
    <Dialog open={Boolean(view)} onOpenChange={open => { if (!open) setView(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{view?.quote_number} — {view?.title}</DialogTitle><DialogDescription>{view && `${customerName(view.customer_snapshot)} · ${quoteStatuses[effectiveQuoteStatus(view)]}`}</DialogDescription></DialogHeader>{view && <div className="space-y-4"><p className="text-sm">{nlDate(view.quote_date)} · Geldig tot {nlDate(view.valid_until)}{view.reference && ` · ${view.reference}`}</p><div className="space-y-3">{view.items.map((i, n) => <div key={n} className="border-b pb-3"><p className="whitespace-pre-wrap break-words">{i.description}</p><p className="text-sm text-muted-foreground">{i.quantity} × {euro(i.price)} · btw {i.vat_percentage}% · {euro(Number(i.subtotal))} excl.</p></div>)}</div>{view.discount_percentage > 0 && <p>Korting: {view.discount_percentage}%</p>}<p className="font-semibold">{euro(Number(view.subtotal))} excl. + {euro(Number(view.vat_total))} btw = {euro(Number(view.total))}</p>{view.notes && <p className="whitespace-pre-wrap break-words">{view.notes}</p>}{view.terms && <div><h3 className="font-medium">Voorwaarden</h3><p className="whitespace-pre-wrap break-words text-sm">{view.terms}</p></div>}<Button disabled={busy} onClick={() => void pdf(view)}>PDF downloaden</Button>{statusButtons(view)}</div>}</DialogContent></Dialog>
    <Dialog open={Boolean(action)} onOpenChange={open => { if (!open && !busy) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action?.convert ? 'Conceptfactuur aanmaken?' : 'Status wijzigen?'}</DialogTitle><DialogDescription>{action?.convert ? `Offerte ${action.quote.quote_number} wordt één keer omgezet naar een conceptfactuur. Er wordt niets per e-mail verstuurd.` : action?.status === 'verzonden' ? 'Dit registreert dat je de offerte zelf hebt verstuurd. Deze knop verstuurt GEEN e-mail. Download de PDF en verstuur deze zelf.' : action?.status === 'geaccepteerd' ? 'Registreer alleen een akkoord als de klant de offerte daadwerkelijk heeft geaccepteerd.' : 'Je registreert dat de klant de offerte heeft afgewezen. Voor een aangepast voorstel kun je de offerte dupliceren.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Annuleren</Button><Button disabled={busy} onClick={() => void confirmAction()}>{busy ? 'Bezig…' : 'Bevestigen'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
