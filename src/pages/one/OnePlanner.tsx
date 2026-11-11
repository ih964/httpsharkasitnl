import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, LockKeyhole, MapPin, Plus, RefreshCw } from 'lucide-react';
import { portalSupabase } from '@/integrations/supabase/client';
import { addDays, eventValues, monthGrid, safeAgendaDay, shiftMonth, toInstant, wallTime, ZONE, REMINDER_OPTIONS, ALL_DAY_REMINDERS, reminderLabel, eventReminders } from './calendar-time.mjs';
import { currentPush, disablePush, enablePush, pushRequest, pushSupported } from './one-push';
import './planner.css';

type EventRow = { id: string; title: string; kind: 'private' | 'business'; starts_at: string; ends_at: string; all_day: boolean; location: string; notes: string; reminder_minutes: number | null; reminder_offsets?: number[]; updated_at: string };
type Draft = { id: string; original?: EventRow; title: string; kind: 'private' | 'business'; startDate: string; endDate: string; startTime: string; endTime: string; allDay: boolean; location: string; notes: string; reminders: number[] };
const columns = 'id,title,kind,starts_at,ends_at,all_day,location,notes,reminder_minutes,reminder_offsets,updated_at';
const shortDate = (day: string) => new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONE }).format(new Date(day + 'T12:00:00Z'));
const today = () => wallTime(Date.now()).slice(0, 10);
const label = (event: EventRow) => event.all_day ? 'Hele dag' : `${wallTime(event.starts_at).slice(11)} – ${wallTime(event.ends_at).slice(11)}`;
function draftFor(day: string, event?: EventRow): Draft {
  if (event) {
    const start = wallTime(event.starts_at), end = wallTime(event.ends_at);
    return { id: event.id, original: event, title: event.title, kind: event.kind, startDate: start.slice(0, 10), endDate: event.all_day ? addDays(end.slice(0, 10), -1) : end.slice(0, 10), startTime: start.slice(11), endTime: end.slice(11), allDay: event.all_day, location: event.location, notes: event.notes, reminders: eventReminders(event) };
  }
  return { id: crypto.randomUUID(), title: '', kind: 'business', startDate: day, endDate: day, startTime: '09:00', endTime: '10:00', allDay: false, location: '', notes: '', reminders: [15] };
}
function useEvents(start: string, end: string, revision = 0) {
  const [events, setEvents] = useState<EventRow[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let live = true; setLoading(true); setError(''); setEvents([]);
    void (async () => {
      try {
        const result = await portalSupabase.from('one_calendar_events').select(columns).lt('starts_at', end).gt('ends_at', start).order('starts_at').limit(1000);
        if (result.error) throw new Error('De agenda kon niet worden opgehaald. Probeer te vernieuwen.');
        if (live) { setEvents(result.data || []); if ((result.data || []).length === 1000) setError('Er zijn veel afspraken. Niet alle afspraken in deze periode kunnen worden weergegeven.'); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : 'De agenda is niet bereikbaar.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [start, end, revision]);
  return { events, loading, error };
}
export function UpcomingAgenda() {
  const startDay = today(), endDay = addDays(startDay, 7);
  const { events, loading, error } = useEvents(toInstant(startDay + 'T00:00'), toInstant(endDay + 'T00:00'));
  const upcoming = events.filter(event => new Date(event.ends_at).getTime() > Date.now()).slice(0, 3);
  return <section className="one-panel one-planner"><div className="one-section-title"><div><p className="one-eyebrow">PRIVÉ & ZAKELIJK</p><h2>Je komende afspraken</h2></div><Link className="one-text-link" to="/admin/one/agenda">Agenda <CalendarDays /></Link></div>{loading ? <p role="status" className="one-muted">Agenda laden…</p> : error ? <p className="one-error" role="alert">{error}</p> : !upcoming.length ? <p className="one-muted">Geen afspraken in de komende zeven dagen.</p> : upcoming.map(event => <Link className="one-agenda-preview" key={event.id} to={`/admin/one/agenda?date=${wallTime(event.starts_at).slice(0, 10)}&event=${event.id}`}><span className={`one-kind one-kind-${event.kind}`}>{event.kind === 'private' ? 'Privé' : 'Zakelijk'}</span><span><strong>{event.title}</strong><small>{shortDate(wallTime(event.starts_at).slice(0, 10))} · {label(event)}</small></span></Link>)}</section>;
}
export function OneAgenda() {
  const [params] = useSearchParams();
  const initial = useMemo(() => safeAgendaDay(params.get('date'), today()), [params]);
  const [selected, setSelected] = useState(initial), [month, setMonth] = useState(initial.slice(0, 7)), [view, setView] = useState<'month' | 'list'>('month');
  const [filter, setFilter] = useState('all'), [revision, setRevision] = useState(0), [editor, setEditor] = useState<Draft | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setSelected(initial); setMonth(initial.slice(0, 7)); setEditor(null); }, [initial]);
  const days: string[] = useMemo(() => monthGrid(month), [month]);
  const { events, loading, error: loadError } = useEvents(toInstant(days[0] + 'T00:00'), toInstant(addDays(days[41], 1) + 'T00:00'), revision);
  const filtered = events.filter(event => filter === 'all' || event.kind === filter);
  const onDay = (day: string) => { const start = toInstant(day + 'T00:00'), end = toInstant(addDays(day, 1) + 'T00:00'); return filtered.filter(e => new Date(e.starts_at) < new Date(end) && new Date(e.ends_at) > new Date(start)); };
  const shown = view === 'month' ? onDay(selected) : filtered.filter(e => wallTime(e.starts_at).slice(0, 7) <= month && wallTime(new Date(e.ends_at).getTime() - 1).slice(0, 7) >= month);
  useEffect(() => { if (editor) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [editor?.id]);
  const edit = (event?: EventRow) => { setEditor(draftFor(selected, event)); setError(''); setNotice(''); };
  const field = (key: keyof Draft, value: unknown) => setEditor(prev => prev ? { ...prev, [key]: value } : prev);
  const changeMonth = (offset: number) => { const next = shiftMonth(month, offset); if (next < '2000-01' || next > '2100-11') return; setMonth(next); setSelected(next + '-01'); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editor || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const values = eventValues(editor);
      const request = editor.original ? portalSupabase.from('one_calendar_events').update(values).eq('id', editor.id).eq('updated_at', editor.original.updated_at) : portalSupabase.from('one_calendar_events').insert({ id: editor.id, ...values });
      const result = await request.select(columns);
      if (result.error) throw new Error('Opslaan is niet bevestigd. Vernieuw de agenda voordat je opnieuw probeert; zo voorkom je dubbele afspraken.');
      if (!result.data?.length) throw new Error('Deze afspraak is ondertussen gewijzigd of verwijderd. Vernieuw en open de afspraak opnieuw.');
      setSelected(editor.startDate); setMonth(editor.startDate.slice(0, 7)); setEditor(null); setRevision(x => x + 1); setNotice('Afspraak opgeslagen.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Opslaan is niet bevestigd.'); }
    finally { setBusy(false); }
  };
  const remove = async (event: EventRow) => {
    if (busy || !window.confirm(`Afspraak “${event.title}” verwijderen? De herinnering vervalt ook.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await portalSupabase.from('one_calendar_events').delete().eq('id', event.id).eq('updated_at', event.updated_at).select('id');
      if (result.error || !result.data?.length) throw new Error('Verwijderen is niet bevestigd, of de afspraak is gewijzigd. Vernieuw de agenda.');
      setEditor(null); setRevision(x => x + 1); setNotice('Afspraak verwijderd.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Verwijderen is niet bevestigd.'); }
    finally { setBusy(false); }
  };
  return <div className="one-planner"><div className="one-page-heading"><p className="one-eyebrow">RUIMTE VOOR WERK EN PRIVÉ</p><h1>Jouw agenda.</h1><p className="one-muted">Eén overzicht, twee soorten afspraken. Alleen zichtbaar voor jouw account. Tijden: Nederland.</p></div><div className="one-actions"><button className="one-button one-primary" onClick={() => edit()} disabled={busy}><Plus />Afspraak toevoegen</button><Link className="one-button" to="/admin/one/meldingen"><Bell />Herinneringen</Link><button className="one-icon-button" aria-label="Agenda vernieuwen" onClick={() => setRevision(x => x + 1)}><RefreshCw /></button></div>{notice && <p className="one-notice" role="status">{notice}</p>}{error && !editor && <p className="one-error" role="alert">{error}</p>}{loadError && <p className="one-error" role="alert">{loadError}</p>}
    {editor && <div className="one-panel one-agenda-editor" ref={editorRef}><h2>{editor.original ? 'Afspraak wijzigen' : 'Nieuwe afspraak'}</h2><form onSubmit={save}><fieldset disabled={busy}><label>Titel<input required maxLength={200} value={editor.title} onChange={e => field('title', e.target.value)} autoFocus /></label><label>Soort afspraak<select value={editor.kind} onChange={e => field('kind', e.target.value)}><option value="business">Zakelijk</option><option value="private">Privé</option></select></label><label className="one-check"><input type="checkbox" checked={editor.allDay} onChange={e => setEditor(prev => prev ? { ...prev, allDay: e.target.checked, reminders: e.target.checked ? [...new Set(prev.reminders.map(n => ALL_DAY_REMINDERS.includes(n) ? n : 0))] : prev.reminders } : prev)} />Hele dag</label><div className="one-form-pair"><label>Begindatum<input type="date" required min="2000-01-01" max="2100-11-30" value={editor.startDate} onChange={e => { const next = e.target.value; setEditor(prev => prev ? { ...prev, startDate: next, endDate: prev.endDate < next ? next : prev.endDate } : prev); }} /></label><label>{editor.allDay ? 'Laatste dag (inclusief)' : 'Einddatum'}<input type="date" required min={editor.startDate} max="2100-11-30" value={editor.endDate} onChange={e => field('endDate', e.target.value)} /></label></div>{!editor.allDay && <div className="one-form-pair"><label>Begintijd<input type="time" required value={editor.startTime} onChange={e => field('startTime', e.target.value)} /></label><label>Eindtijd<input type="time" required value={editor.endTime} onChange={e => field('endTime', e.target.value)} /></label></div>}<div className="one-reminders" role="group" aria-labelledby="one-reminders-label"><h3 id="one-reminders-label">Herinneringen</h3><p className="one-muted">Kies meerdere momenten. Bijvoorbeeld 5 dagen, 24 uur én 1 uur van tevoren.</p><div className="one-reminder-grid">{(editor.allDay ? ALL_DAY_REMINDERS : REMINDER_OPTIONS).map((minutes: number) => <label className="one-check" key={minutes}><input type="checkbox" checked={editor.reminders.includes(minutes)} onChange={e => field('reminders', e.target.checked ? [...editor.reminders, minutes] : editor.reminders.filter(n => n !== minutes))} /><span>{reminderLabel(minutes, editor.allDay)}</span></label>)}</div><button type="button" className="one-text-link" onClick={() => field('reminders', [])}>Geen herinneringen</button><p className="one-muted" role="status">{editor.reminders.length} herinnering{editor.reminders.length === 1 ? '' : 'en'} geselecteerd.</p>{editor.allDay && <p className="one-muted">Bij hele-dagafspraken gebruiken we 09:00 Nederlandse tijd als uitgangspunt.</p>}</div><p className="one-muted">Pushherinneringen werken nadat je meldingen hebt ingeschakeld op dit apparaat. Een herinnering die al voorbij is, kan niet op tijd worden bezorgd.</p><label>Locatie<input maxLength={300} value={editor.location} onChange={e => field('location', e.target.value)} /></label><label>Notities<textarea maxLength={4000} rows={3} value={editor.notes} onChange={e => field('notes', e.target.value)} /></label>{error && <p className="one-error" role="alert">{error}</p>}<div className="one-actions"><button className="one-button one-primary" type="submit">{busy ? 'Opslaan…' : 'Afspraak opslaan'}</button><button className="one-button" type="button" onClick={() => setEditor(null)}>Annuleren</button></div></fieldset></form></div>}
    <div className="one-agenda-controls"><div className="one-mail-accounts" aria-label="Agenda filter">{[['all', 'Alles'], ['private', 'Privé'], ['business', 'Zakelijk']].map(([key, text]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{text}</button>)}</div><div className="one-mail-accounts" aria-label="Weergave"><button aria-pressed={view === 'month'} onClick={() => setView('month')}>Maand</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>Lijst</button></div></div><section className="one-panel"><div className="one-agenda-month"><button className="one-icon-button" aria-label="Vorige maand" onClick={() => changeMonth(-1)}><ChevronLeft /></button><h2>{new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: ZONE }).format(new Date(month + '-01T12:00:00Z'))}</h2><button className="one-icon-button" aria-label="Volgende maand" onClick={() => changeMonth(1)}><ChevronRight /></button><button className="one-button" onClick={() => { setSelected(today()); setMonth(today().slice(0, 7)); }}>Vandaag</button></div>{view === 'month' && <><div className="one-calendar-grid one-weekdays" aria-hidden="true">{['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(x => <span key={x}>{x}</span>)}</div><div className="one-calendar-grid">{days.map(day => { const rows = onDay(day); return <button key={day} className={`one-day ${day.slice(0, 7) !== month ? 'one-other-month' : ''}`} aria-label={`${shortDate(day)}, ${rows.length} afspraken`} aria-pressed={day === selected} aria-current={day === today() ? 'date' : undefined} onClick={() => setSelected(day)}><span>{Number(day.slice(8))}</span><span className="one-day-marks">{rows.some(e => e.kind === 'private') && <i className="one-private-dot" />}{rows.some(e => e.kind === 'business') && <i className="one-business-dot" />}</span></button>; })}</div></>}</section>
    <section className="one-agenda-list"><div className="one-section-title"><h2>{view === 'month' ? shortDate(selected) : 'Afspraken deze maand'}</h2><span className="one-muted">{shown.length} afspraken</span></div>{loading ? <p role="status" className="one-empty">Agenda laden…</p> : !shown.length ? <div className="one-panel one-empty"><CalendarDays /><p>Geen afspraken in deze selectie.</p><button className="one-text-link" onClick={() => edit()}>Afspraak toevoegen</button></div> : shown.map(event => <article className={`one-panel one-event one-event-${event.kind}`} key={event.id} data-event-id={event.id}><div className="one-event-heading"><span className={`one-kind one-kind-${event.kind}`}>{event.kind === 'private' ? 'Privé' : 'Zakelijk'}</span><time>{label(event)}</time></div><h3>{event.title}</h3><p className="one-muted">{shortDate(wallTime(event.starts_at).slice(0, 10))}{wallTime(event.starts_at).slice(0, 10) !== wallTime(new Date(event.ends_at).getTime() - 1).slice(0, 10) ? ` t/m ${shortDate(wallTime(new Date(event.ends_at).getTime() - 1).slice(0, 10))}` : ''}</p>{event.location && <p className="one-event-location"><MapPin />{event.location}</p>}{event.notes && <p className="one-event-notes">{event.notes}</p>}<p className="one-muted">{eventReminders(event).length ? 'Herinneringen: ' + eventReminders(event).map((n: number) => reminderLabel(n, event.all_day)).join(' · ') : 'Geen herinneringen'}</p><div className="one-actions"><button className="one-button" disabled={busy} onClick={() => edit(event)}>Wijzigen</button><button className="one-button" disabled={busy} onClick={() => void remove(event)}>Verwijderen</button></div></article>)}</section><p className="one-muted one-agenda-privacy"><LockKeyhole />Privé én zakelijk zijn alleen voor jouw account. Nog geen synchronisatie met Outlook of Google Agenda en geen uitnodigingen naar anderen.</p></div>;
}
export function OneNotifications() {
  const supported = pushSupported();
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [active, setActive] = useState(false), [known, setKnown] = useState(false), [hasDevice, setHasDevice] = useState(false), [calendar, setCalendar] = useState(true), [tickets, setTickets] = useState(true), [mail, setMail] = useState(false), [mailReady, setMailReady] = useState(false), [mailLastRun, setMailLastRun] = useState<string | null>(null), [lastRun, setLastRun] = useState<string | null>(null);
  const [permission, setPermission] = useState(supported ? Notification.permission : 'default');
  const load = useCallback(async () => {
    setLoading(true); setKnown(false);
    try {
      const sub = await currentPush(); setHasDevice(Boolean(sub));
      const result = await pushRequest({ action: 'status', endpoint: sub?.endpoint });
      const granted = supported && Notification.permission === 'granted';
      setPermission(supported ? Notification.permission : 'default'); setActive(Boolean(sub && result.subscription && granted)); setKnown(true);
      setCalendar(result.subscription?.calendar ?? true); setTickets(result.subscription?.tickets ?? true); setMail(result.subscription?.mail ?? false); setMailReady(result.mailReady === true); setMailLastRun(result.mailLastSuccessAt || null); setLastRun(result.lastSuccessAt || null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Instellingen konden niet worden geladen.'); }
    finally { setLoading(false); }
  }, [supported]);
  useEffect(() => { void load(); }, [load]);
  const run = async (action: 'enable' | 'disable' | 'save' | 'test') => {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'enable') { await enablePush(); setNotice('Dit apparaat is gekoppeld. Gebruik Testmelding om ontvangst te controleren.'); }
      else if (action === 'disable') { await disablePush(); setNotice('Meldingen voor dit apparaat zijn uitgeschakeld.'); }
      else {
        const sub = await currentPush(); if (!sub) throw new Error('Schakel meldingen eerst in.');
        if (action === 'save') { await pushRequest({ action: 'preferences', endpoint: sub.endpoint, calendar, tickets, mail }); setNotice('Meldingsvoorkeuren opgeslagen.'); }
        else { await pushRequest({ action: 'test', endpoint: sub.endpoint }); setNotice('De pushdienst heeft de test geaccepteerd. Controleer nu of de melding op je telefoon verschijnt.'); }
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'De actie is niet bevestigd.'); }
    finally { setPermission(supported ? Notification.permission : 'default'); setBusy(false); }
  };
  const healthy = lastRun && Date.now() - new Date(lastRun).getTime() < 5 * 60000;
  return <div className="one-planner"><div className="one-page-heading"><p className="one-eyebrow">ALLEEN WAT JIJ NODIG HEBT</p><h1>Meldingen.</h1><p className="one-muted">Deze instellingen gelden voor dit apparaat. Titels, klantnamen en notities worden niet op je vergrendelscherm getoond.</p></div>{error && <p className="one-error" role="alert">{error}</p>}{notice && <p className="one-notice" role="status">{notice}</p>}<section className="one-panel"><div className="one-section-title"><h2>{loading ? 'Meldingsstatus controleren…' : !known ? 'Meldingsstatus niet bevestigd' : active ? 'Meldingen zijn ingeschakeld' : 'Meldingen staan uit'}</h2>{active ? <Bell /> : <BellOff />}</div>{!supported && <p className="one-error">Push is niet beschikbaar in deze browser. Open de app in Chrome op Android. Op iPhone is installatie op het beginscherm nodig.</p>}{permission === 'denied' && <p className="one-error">De browser blokkeert meldingen. Open de site-instellingen van harkasit.nl en zet Meldingen op Toestaan. Vernieuw daarna dit scherm.</p>}{loading ? <p role="status" className="one-muted">Instellingen controleren…</p> : <div className="one-actions"><button className="one-button one-primary" disabled={busy || !supported} onClick={() => void run(active ? 'disable' : 'enable')}>{active ? 'Meldingen uitschakelen' : 'Meldingen inschakelen'}</button><button className="one-button" disabled={busy || !active || !known} onClick={() => void run('test')}>Testmelding</button>{hasDevice && !active && <button className="one-button" disabled={busy} onClick={() => void run('disable')}>Apparaatkoppeling verwijderen</button>}<button className="one-icon-button" aria-label="Meldingsstatus vernieuwen" disabled={busy} onClick={() => { setError(''); void load(); }}><RefreshCw /></button></div>}<p className="one-muted one-push-health">{healthy ? 'Automatische verzender actief.' : 'Automatische verzender nog niet recent bevestigd. Gebruik Vernieuwen om opnieuw te controleren.'}{lastRun && ` Laatste controle: ${new Date(lastRun).toLocaleString('nl-NL', { timeZone: ZONE })}.`}</p></section><section className="one-panel one-push-preferences"><h2>Waarvoor wil je meldingen?</h2><label className="one-check"><input type="checkbox" checked={calendar} disabled={busy || !active || !known} onChange={e => setCalendar(e.target.checked)} /><span><strong>Afspraakherinneringen</strong><small>Privé en zakelijk. Kies één of meerdere herinneringsmomenten bij elke afspraak.</small></span></label><label className="one-check"><input type="checkbox" checked={tickets} disabled={busy || !active || !known} onChange={e => setTickets(e.target.checked)} /><span><strong>Nieuwe supporttickets</strong><small>Alleen nieuwe tickets vanaf het koppelen van dit apparaat.</small></span></label><label className="one-check"><input type="checkbox" checked={mail} disabled={busy || !active || !known || !mailReady} onChange={e => setMail(e.target.checked)} /><span><strong>Nieuwe e-mails</strong><small>Alle vijf postvakken van Harkas IT en Harkas Webbuilder. Alleen nieuwe berichten in Postvak IN; geen spam of oude mails.</small></span></label>{mail && <p className="one-muted">{mailLastRun && Date.now() - new Date(mailLastRun).getTime() < 5 * 60000 ? 'Mailcontrole actief. Laatste controle: ' + new Date(mailLastRun).toLocaleTimeString('nl-NL', { timeZone: ZONE }) : 'Mailcontrole nog niet recent bevestigd. Vernieuw de status; bestaande mails worden niet opnieuw gemeld.'}</p>}{!mailReady && <p className="one-muted">Mailmeldingen worden nog aangesloten.</p>}<button className="one-button" disabled={busy || !active || !known} onClick={() => void run('save')}>Voorkeuren opslaan</button></section><p className="one-muted">Herinneringen worden ongeveer elke minuut verwerkt. Internet, browsertoestemming en de meldingsinstellingen van je telefoon blijven nodig. Push kan vertraagd zijn; gebruik voor kritieke afspraken ook een telefoonalarm. Ook nieuwe e-mails worden ongeveer elke minuut gecontroleerd. Externe agenda-synchronisatie is nog niet aangesloten.</p></div>;
}
