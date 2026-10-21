import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { euro, nlDate, type Quote } from '@/lib/quotes';

export default function QuoteEmailDialog({ quote, onClose, onSent }: { quote: Quote | null; onClose: () => void; onSent: (quote: Quote) => void }) {
  const [recipient, setRecipient] = useState(''), [cc, setCc] = useState('');
  const [requestId, setRequestId] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (!quote) return;
    setRecipient(quote.pending_email_to || quote.emailed_to || quote.customer_snapshot.email || '');
    setCc((quote.pending_email_cc || []).join(', '));
    setRequestId(crypto.randomUUID()); setError('');
  }, [quote]);
  const send = async () => {
    if (!quote || sending) return;
    setSending(true); setError('');
    try {
      const { data, error: failure } = await supabase.rpc('send_quote_email', {
        p_id: quote.id, p_version: quote.version, request_id: requestId,
        recipient_email: recipient, cc_email: cc,
      });
      if (failure || !data?.emailed_at) throw new Error(failure?.message || 'Geen verzendbevestiging ontvangen. Probeer dezelfde verzending opnieuw.');
      onSent(data as Quote); onClose();
      toast.success(`Offerte ${data.quote_number} aangeboden aan de e-mailprovider voor ${data.emailed_to}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Verzending niet bevestigd.'); }
    finally { setSending(false); }
  };
  return <Dialog open={Boolean(quote)} onOpenChange={open => { if (!open && !sending) onClose(); }}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Offerte per e-mail versturen</DialogTitle><DialogDescription>Controleer de ontvangers. De opgeslagen offerte wordt als PDF bijgevoegd.</DialogDescription></DialogHeader>
      {quote && <form onSubmit={e => { e.preventDefault(); void send(); }} className="space-y-4">
        <p className="text-sm"><strong>Van:</strong> Harkas IT &lt;info@harkasit.nl&gt;</p>
        <label className="block space-y-1"><span className="text-sm font-medium">Aan *</span><Input aria-label="Ontvanger offerte" type="email" required maxLength={254} value={recipient} disabled={sending || Boolean(quote.pending_email_to)} onChange={e => { setRecipient(e.target.value); setRequestId(crypto.randomUUID()); }} /></label>
        <label className="block space-y-1"><span className="text-sm font-medium">CC (optioneel, gescheiden door komma’s)</span><Input aria-label="CC offerte" maxLength={2550} value={cc} disabled={sending || Boolean(quote.pending_email_to)} onChange={e => { setCc(e.target.value); setRequestId(crypto.randomUUID()); }} /></label>
        <div className="rounded-md border bg-muted/30 p-4 space-y-3 text-sm">
          <p><strong>Onderwerp:</strong> Offerte {quote.quote_number} – {quote.title}</p>
          <p>Beste {quote.customer_snapshot.company_name || quote.customer_snapshot.name || 'klant'},</p>
          <p>Hierbij ontvangt u offerte {quote.quote_number} voor {quote.title} als PDF-bijlage.</p>
          <p>Totaal inclusief btw: {euro(Number(quote.total))}<br />Geldig tot: {nlDate(quote.valid_until)}</p>
          <p>Heeft u vragen of wilt u akkoord geven? Beantwoord dan deze e-mail onder vermelding van het offertenummer.</p>
          <p>Met vriendelijke groet,<br />{quote.company_snapshot.company_name || 'Harkas IT'}</p>
          <p className="border-t pt-3"><strong>Bijlage:</strong> {quote.quote_number}.pdf</p>
        </div>
        {quote.pending_email_to ? <p className="text-sm text-muted-foreground">Er staat nog een verzending open. Deze knop haalt de bevestiging op of hervat dezelfde verzending.</p> : quote.emailed_at && <p className="text-sm text-muted-foreground">Deze offerte is eerder gemaild naar {quote.emailed_to}. Met de knop hieronder verstuur je een nieuwe kopie.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={sending} onClick={onClose}>Sluiten</Button><Button type="submit" disabled={sending || !recipient.trim()}><Mail className="mr-2 h-4 w-4" />{sending ? 'Verzending bevestigen…' : quote.pending_email_to ? 'Verzending afronden' : quote.emailed_at ? 'Opnieuw versturen' : 'Offerte e-mailen'}</Button></DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>;
}
