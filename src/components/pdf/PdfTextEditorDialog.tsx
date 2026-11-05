import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Monitor, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PdfTextRun } from '@/lib/pdf/text-engine';
import { inspectPdfFont, replacePdfText } from '@/lib/pdf/text-client';
import { fontNameMatches, getSessionFonts, MAX_FONT_BYTES, rememberFont } from '@/lib/pdf/font-session';
import type { PdfSource } from '@/lib/pdf/renderer';
import { renderTextPreview } from '@/lib/pdf/text-preview';
import { uid } from '@/lib/pdf/model';
import { localFonts, localFontError } from '@/lib/pdf/local-fonts';

type Props = { run: PdfTextRun; source: PdfSource; pageIndex: number; onClose: () => void; onApply: (bytes: Uint8Array) => Promise<void> };
export function PdfTextEditorDialog({ run, source, pageIndex, onClose, onApply }: Props) {
  const [text, setText] = useState(run.text), [choice, setChoice] = useState('original');
  const [fonts, setFonts] = useState(getSessionFonts), [loadingFont, setLoadingFont] = useState(false), [fontError, setFontError] = useState('');
  const [localReady, setLocalReady] = useState(false), [autoNote, setAutoNote] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<{ text: string; choice: string; bytes: Uint8Array } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null), fallbackFont = useRef<Uint8Array>(), fileInput = useRef<HTMLInputElement>(null), alive = useRef(true);
  const selectedFont = fonts.find(font => font.id === choice);
  const localSupported = localFonts.supported();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    // Never prompt on opening a dialog; reuse a permission that was already granted.
    void localFonts.activate(false).then(ready => { if (active) setLocalReady(ready); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const useComputerFonts = async () => {
    setLoadingFont(true); setFontError(''); setAutoNote('');
    try {
      if (!await localFonts.activate(true)) throw new Error('Deze browser ondersteunt automatisch ophalen niet. Gebruik Chrome of Edge op een computer, of laad een TTF/OTF-bestand.');
      if (!alive.current) return;
      setLocalReady(true);
      const font = await localFonts.resolve(run.font, inspectPdfFont);
      if (!font) throw new Error(`${run.font} is niet gevonden tussen de toegestane lettertypen op deze computer. Laad het volledige originele TTF/OTF-bestand.`);
      if (!alive.current) return;
      const id = uid(); setFonts(rememberFont({ ...font, id })); setChoice(id);
      setAutoNote('Het originele lettertype is automatisch van deze computer geladen.');
    } catch (e) { if (alive.current) setFontError(localFontError(e)); }
    finally { if (alive.current) setLoadingFont(false); }
  };

  const loadFont = async (file?: File) => {
    if (!file) return;
    setLoadingFont(true); setFontError(''); setAutoNote('');
    try {
      if (!/\.(ttf|otf)$/i.test(file.name) || !file.size || file.size > MAX_FONT_BYTES) throw new Error('Kies een volledig TTF- of OTF-bestand van maximaal 20 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer()), info = await inspectPdfFont(bytes);
      const id = uid();
      if (!alive.current) return;
      setFonts(rememberFont({ id, filename: file.name, bytes, info })); setChoice(id);
    } catch (e) { if (alive.current) setFontError(e instanceof Error ? e.message : 'Het lettertype kon niet worden geladen.'); }
    finally { if (alive.current) setLoadingFont(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    setPreparing(true); setPreview(null); setError('');
    if (loadingFont) return () => { controller.abort(); };
    const timer = setTimeout(() => { void (async () => {
      try {
        if (choice === 'fallback' && !fallbackFont.current) {
          const response = await fetch('/fonts/pdf-editor-sans.ttf', { signal: controller.signal });
          if (!response.ok) throw new Error('Het vervangende lettertype kon niet worden geladen.');
          fallbackFont.current = new Uint8Array(await response.arrayBuffer());
        }
        if (!['original', 'fallback'].includes(choice) && !selectedFont) throw new Error('Laad dit lettertype opnieuw.');
        const bytes = text === run.text && choice === 'original' ? source.bytes : await replacePdfText(
          source.bytes, pageIndex, run, text, choice === 'fallback' ? fallbackFont.current : undefined, selectedFont?.bytes,
        );
        controller.signal.throwIfAborted();
        if (canvas.current) await renderTextPreview(bytes, pageIndex, run, canvas.current, controller.signal);
        if (!controller.signal.aborted) setPreview({ text, choice, bytes });
      } catch (e) {
        if (controller.signal.aborted) return;
        if (choice === 'original' && text.trim() && e instanceof Error && /lettertype/i.test(e.message)) {
          try {
            // Recover only a missing-font failure; never silently substitute a different face.
            let match = getSessionFonts().find(font => fontNameMatches(font.info, run.font));
            if (!match && localReady) {
              const local = await localFonts.resolve(run.font, inspectPdfFont);
              controller.signal.throwIfAborted();
              if (local) { match = { ...local, id: uid() }; rememberFont(match); }
            }
            controller.signal.throwIfAborted();
            if (match) {
              setFonts(getSessionFonts()); setChoice(match.id);
              setAutoNote('Het volledige bijpassende lettertype is automatisch gekozen voor de nieuwe tekens.');
              return;
            }
          } catch (fontFailure) { if (!controller.signal.aborted) setError(localFontError(fontFailure)); return; }
        }
        setError(e instanceof Error ? e.message : 'Het voorbeeld kon niet worden gemaakt.');
      }
      finally { if (!controller.signal.aborted) setPreparing(false); }
    })(); }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, choice, selectedFont, pageIndex, run, source, localReady, loadingFont]);

  const apply = async () => {
    if (loadingFont || fontError || !preview || preview.text !== text || preview.choice !== choice) return;
    setBusy(true); setError('');
    try { await onApply(preview.bytes); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Tekst aanpassen is mislukt. Het origineel is behouden.'); }
    finally { setBusy(false); }
  };
  const shownFont = selectedFont?.info.fullName || (choice === 'fallback' ? 'DejaVu Sans · vervangend lettertype' : run.font);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto overflow-x-hidden [&>*]:min-w-0">
      <DialogHeader><DialogTitle>Bestaande tekst aanpassen</DialogTitle><DialogDescription>Gebruik het originele lettertype uit de PDF of van je computer. Grootte, kleur en positie blijven behouden.</DialogDescription></DialogHeader>
      <div className="pdf-detected-font"><strong className="break-words">{shownFont}</strong><span>{Math.round(run.size * Math.hypot(run.matrix[2], run.matrix[3]) * 100) / 100} pt</span></div>
      <div className="space-y-2">
        <label htmlFor="pdf-font-choice" className="text-sm font-medium">Lettertype</label>
        <select id="pdf-font-choice" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={choice} disabled={busy || loadingFont} onChange={e => { setChoice(e.target.value); setFontError(''); setAutoNote(''); }}>
          <option value="original">{run.font} · ingesloten in PDF</option>
          {fonts.map(font => <option key={font.id} value={font.id}>{font.info.fullName} · {font.filename}</option>)}
          <option value="fallback">DejaVu Sans · vervangend lettertype</option>
        </select>
        <input ref={fileInput} type="file" accept=".ttf,.otf" className="hidden" aria-label="TTF- of OTF-lettertypebestand" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; void loadFont(file); }} />
        <div className="flex flex-wrap gap-2">
          {localSupported && <Button type="button" variant="outline" disabled={busy || loadingFont} onClick={() => void useComputerFonts()}><Monitor className="mr-2 h-4 w-4" />Automatisch ophalen</Button>}
          <Button type="button" variant="outline" disabled={busy || loadingFont} onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" />TTF/OTF laden</Button>
        </div>
        {loadingFont && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Lettertype ophalen en controleren…</p>}
        <p className="text-xs text-muted-foreground">{localSupported ? localReady ? 'Automatisch ophalen is actief voor toegestane lettertypen op deze computer.' : 'Geef je browser toestemming om het juiste geïnstalleerde lettertype te vinden. Je hoeft dan geen bestand te zoeken.' : 'Automatisch ophalen is hier niet beschikbaar. Gebruik Chrome of Edge op een computer, of laad een TTF/OTF-bestand.'} Een ontbrekend lettertype moet je alsnog laden.</p>
        {!selectedFont && <p className="text-xs text-muted-foreground">Handmatig laden: dezelfde variant (normaal, vet of cursief), maximaal 20 MB. Geladen fonts blijven beschikbaar tot je de pagina vernieuwt.</p>}
        {autoNote && <p role="status" className="text-xs text-muted-foreground">{autoNote}</p>}
        {selectedFont && <p role="status" className="rounded-md bg-blue-50 p-2 text-xs text-blue-900">{selectedFont.info.format} · {selectedFont.info.style} · {fontNameMatches(selectedFont.info, run.font) ? 'De lettertypenaam komt overeen met het origineel.' : `De naam wijkt af van ${run.font}. Controleer of dit de juiste variant is.`} Het volledige geladen bestand wordt in de PDF ingesloten.</p>}
        {fontError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{fontError}</p>}
      </div>
      <label htmlFor="pdf-existing-text" className="text-sm font-medium">Tekstregel</label>
      <textarea id="pdf-existing-text" className="pdf-text-input" rows={2} value={text} maxLength={3000} disabled={busy} autoFocus onChange={e => setText(e.target.value)} />
      <p className="text-xs text-muted-foreground">Langere tekst kan naastliggende inhoud overlappen. Controleer het voorbeeld. Leegmaken verwijdert deze tekstregel.</p>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div hidden={!!error}><div className="mb-2 text-xs text-muted-foreground">{preparing ? 'Voorbeeld bijwerken…' : 'Voorbeeld uit de PDF met de werkelijke opmaak'}</div><div className="pdf-live-text-preview" style={{ opacity: preparing ? .35 : 1 }}><canvas ref={canvas} aria-label="Voorbeeld van de gewijzigde tekst" /></div></div>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Annuleren</Button><Button disabled={busy || loadingFont || !!fontError || preparing || !preview || preview.text !== text || preview.choice !== choice || (text === run.text && choice === 'original')} onClick={() => void apply()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{busy ? 'Tekst aanpassen…' : 'Wijziging toepassen'}</Button></div>
    </DialogContent>
  </Dialog>;
}
