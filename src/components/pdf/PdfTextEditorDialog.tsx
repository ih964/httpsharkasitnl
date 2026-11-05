import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PdfTextRun } from '@/lib/pdf/text-engine';
import { replacePdfText } from '@/lib/pdf/text-client';
import type { PdfSource } from '@/lib/pdf/renderer';
import { renderTextPreview } from '@/lib/pdf/text-preview';

type Props = { run: PdfTextRun; source: PdfSource; pageIndex: number; onClose: () => void; onApply: (bytes: Uint8Array) => Promise<void> };
export function PdfTextEditorDialog({ run, source, pageIndex, onClose, onApply }: Props) {
  const [text, setText] = useState(run.text), [fallback, setFallback] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null), font = useRef<Uint8Array>();
  const [preview, setPreview] = useState<{ text: string; fallback: boolean; bytes: Uint8Array } | null>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPreparing(true); setPreview(null); setError('');
    const timer = setTimeout(() => { void (async () => {
      try {
        if (fallback && !font.current) {
          const response = await fetch('/fonts/pdf-editor-sans.ttf', { signal: controller.signal });
          if (!response.ok) throw new Error('Het vervangende lettertype kon niet worden geladen.');
          font.current = new Uint8Array(await response.arrayBuffer());
        }
        const bytes = text === run.text && !fallback ? source.bytes : await replacePdfText(source.bytes, pageIndex, run, text, fallback ? font.current : undefined);
        controller.signal.throwIfAborted();
        if (canvas.current) await renderTextPreview(bytes, pageIndex, run, canvas.current, controller.signal);
        if (!controller.signal.aborted) setPreview({ text, fallback, bytes });
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Het voorbeeld kon niet worden gemaakt.'); }
      finally { if (!controller.signal.aborted) setPreparing(false); }
    })(); }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, fallback, pageIndex, run, source]);
  const apply = async () => {
    if (!preview || preview.text !== text || preview.fallback !== fallback) return;
    setBusy(true); setError('');
    try {
      await onApply(preview.bytes); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Tekst aanpassen is mislukt. Het origineel is behouden.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto overflow-x-hidden [&>*]:min-w-0"><DialogHeader><DialogTitle>Bestaande tekst aanpassen</DialogTitle><DialogDescription>De tekst wordt in de PDF vervangen. Het oorspronkelijke lettertype, de grootte, kleur en positie blijven standaard behouden.</DialogDescription></DialogHeader>
    <div className="pdf-detected-font"><strong>{fallback ? 'DejaVu Sans · vervangend lettertype' : run.font}</strong><span>{Math.round(run.size * Math.hypot(run.matrix[2], run.matrix[3]) * 100) / 100} pt</span></div>
    <label htmlFor="pdf-existing-text" className="text-sm font-medium">Tekstregel</label><textarea id="pdf-existing-text" className="pdf-text-input" rows={3} value={text} maxLength={3000} disabled={busy} autoFocus onChange={e => setText(e.target.value)} />
    <p className="text-xs text-muted-foreground">Langere tekst kan naastliggende inhoud overlappen. Controleer de pagina na het toepassen. Leegmaken verwijdert deze tekstregel.</p>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div hidden={!!error}><div className="mb-2 text-xs text-muted-foreground">{preparing ? 'Voorbeeld bijwerken…' : 'Voorbeeld uit de PDF met de werkelijke opmaak'}</div><div className="pdf-live-text-preview" style={{ opacity: preparing ? .35 : 1 }}><canvas ref={canvas} aria-label="Voorbeeld van de gewijzigde tekst" /></div></div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={fallback} disabled={busy} onChange={e => setFallback(e.target.checked)} /><span>Vervangend lettertype gebruiken<small className="block text-muted-foreground">Alleen nodig als het oorspronkelijke lettertype nieuwe letters mist. De vorm en breedte van de tekst kunnen veranderen.</small></span></label>
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Annuleren</Button><Button disabled={busy || preparing || !preview || preview.text !== text || preview.fallback !== fallback || (text === run.text && !fallback)} onClick={() => void apply()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{busy ? 'Tekst aanpassen…' : 'Wijziging toepassen'}</Button></div>
  </DialogContent></Dialog>;
}
