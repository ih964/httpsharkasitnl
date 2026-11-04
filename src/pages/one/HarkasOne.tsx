import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Bell, CalendarDays, Check, Clock3, Download, FileText, FolderOpen, Globe, Home, LayoutGrid, LifeBuoy, Loader2, LockKeyhole, LogOut, Mail, RefreshCw, ShieldCheck, Smartphone, Users, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { portalSupabase, supabase } from '@/integrations/supabase/client';
import OneMailbox from './OneMailbox';
import { OneAgenda, OneNotifications, UpcomingAgenda } from './OnePlanner';
import { disablePush } from './one-push';
import './one.css';

const Tickets = lazy(() => import('@/pages/admin/AdminTickets'));
const Customers = lazy(() => import('@/pages/admin/AdminCustomers'));
const Invoices = lazy(() => import('@/pages/admin/AdminInvoicesWithStatus'));
const Quotes = lazy(() => import('@/pages/admin/AdminQuotes'));
const Hours = lazy(() => import('@/pages/admin/AdminTimeEntriesWithPeriod'));
const Documents = lazy(() => import('@/pages/admin/AdminDocuments'));
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const base = '/admin/one';

function useInstall() {
  const [prompt, setPrompt] = useState<InstallEvent>();
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [help, setHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstall = () => { setInstalled(true); setPrompt(undefined); setHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstall);
    const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = '/admin/one/manifest.webmanifest'; document.head.appendChild(manifest);
    const theme = document.createElement('meta'); theme.name = 'theme-color'; theme.content = '#10252b'; document.head.appendChild(theme);
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,nofollow'; document.head.appendChild(robots);
    const oldTitle = document.title; document.title = 'Harkas One · Jouw werkdag';
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/admin/one/sw.js', { scope: '/admin/one/', updateViaCache: 'none' }).catch(() => { /* Online use remains available if installation is restricted by the browser. */ });
    }
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstall); manifest.remove(); theme.remove(); robots.remove(); document.title = oldTitle; };
  }, []);
  const install = async () => {
    if (installing) return;
    if (!prompt) { setHelp(value => !value); return; }
    setInstalling(true);
    try { await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === 'accepted') setHelp(false); }
    catch { setHelp(true); }
    finally { setPrompt(undefined); setInstalling(false); }
  };
  return { installed, help, installing, install };
}
function Loading() { return <div className="one-empty" role="status"><Loader2 className="one-spin" />Overzicht laden…</div>; }
function Login() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (submitting || isLoading) return;
    setSubmitting(true); setError('');
    try { const result = await signIn(email.trim(), password); if (result.error) setError('Aanmelden mislukt. Controleer je Harkas Admin-account en probeer opnieuw.'); }
    catch { setError('Aanmelden is nu niet mogelijk. Controleer je verbinding en probeer opnieuw.'); }
    finally { setSubmitting(false); }
  };
  return <div className="one-login"><div className="one-brand-symbol" aria-hidden="true">H<span>1</span></div><p className="one-eyebrow">HARKAS IT · MOBIEL BEHEER</p><h1>Alles voor je werkdag.<br /><em>Op één plek.</em></h1><p className="one-muted">Je mail, klanten en administratie. Meld je aan met je bestaande Harkas Admin-account.</p><form className="one-panel" onSubmit={submit}><label>E-mailadres<input name="username" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} disabled={submitting || isLoading} /></label><label>Wachtwoord<input name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={submitting || isLoading} /></label>{error && <p role="alert" className="one-error">{error}</p>}<button className="one-button one-primary" type="submit" disabled={submitting || isLoading}>{submitting || isLoading ? <Loader2 className="one-spin" /> : <LockKeyhole />}Inloggen</button></form><p className="one-login-note"><ShieldCheck />Dezelfde beveiligde omgeving. Geen extra account.</p><Link className="one-text-link" to="/admin/login">Naar de bestaande beheerlogin <ArrowUpRight /></Link></div>;
}
type Metric = { value: number | null; error: boolean; loading: boolean };
type Ticket = { id: string; subject: string; ticket_no: number; status: string; priority: string };
function Today() {
  const [version, setVersion] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketError, setTicketError] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [updated, setUpdated] = useState<Date>();
  useEffect(() => {
    let active = true;
    setMetrics({}); setTickets([]); setTicketError(false); setTicketLoading(true); setUpdated(undefined);
    const jobs = [
      ['tickets', portalSupabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['nieuw', 'toegewezen', 'wacht_op_leverancier', 'in_behandeling', 'wacht_op_klant'])],
      ['invoices', supabase.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'verzonden')],
      ['customers', supabase.from('customers').select('id', { count: 'exact', head: true })],
    ] as const;
    void Promise.allSettled(jobs.map(async ([key, request]) => {
      try { const result = await request; if (active) setMetrics(previous => ({ ...previous, [key]: { value: result.error ? null : result.count, error: Boolean(result.error || result.count === null), loading: false } })); }
      catch { if (active) setMetrics(previous => ({ ...previous, [key]: { value: null, error: true, loading: false } })); }
    })).then(() => { if (active) setUpdated(new Date()); });
    void Promise.resolve(portalSupabase.from('support_tickets').select('id,subject,ticket_no,status,priority').in('status', ['nieuw', 'toegewezen', 'wacht_op_leverancier', 'in_behandeling', 'wacht_op_klant']).order('last_activity_at', { ascending: false }).limit(4))
      .then((result: { data: Ticket[] | null; error: unknown }) => { if (active) { setTicketError(Boolean(result.error)); setTickets(result.error ? [] : result.data || []); } })
      .catch(() => { if (active) setTicketError(true); })
      .finally(() => { if (active) setTicketLoading(false); });
    return () => { active = false; };
  }, [version]);
  const hour = Number(new Intl.DateTimeFormat('nl-NL', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Amsterdam' }).format(new Date()));
  const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  return <div className="one-today">
    <section className="one-hero"><div><p className="one-eyebrow">{new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })}</p><h1>{greeting}.<br /><span>Grip op je werkdag.</span></h1><p>Je onderneming, zonder het wisselen tussen schermen.</p></div><div className="one-hero-mark" aria-hidden="true">H<span>1</span></div><Link to={`${base}/mail`} className="one-button one-primary"><Mail />Open alle mail <ArrowUpRight /></Link></section>
    <UpcomingAgenda key={version} />
    <div className="one-section-title one-section-small"><h2>Nu in Harkas Admin</h2><button className="one-icon-button" aria-label="Administratie vernieuwen" onClick={() => setVersion(value => value + 1)}><RefreshCw /></button></div>
    <div className="one-metrics">{[{ key: 'tickets', label: 'Open tickets', detail: 'Inclusief wachtende tickets', icon: LifeBuoy }, { key: 'invoices', label: 'Verzonden facturen', detail: 'Nog niet als betaald gemarkeerd', icon: FileText }, { key: 'customers', label: 'Klanten', detail: 'In je administratie', icon: Users }].map(item => <Link to={`${base}/${item.key}`} className="one-metric" key={item.key}><item.icon /><span>{item.label}</span><strong>{!metrics[item.key] ? '…' : metrics[item.key].error ? '—' : metrics[item.key].value}</strong><small>{metrics[item.key]?.error ? 'Niet beschikbaar · probeer vernieuwen' : item.detail}</small></Link>)}</div>
    <p className="one-updated">{updated ? `Gecontroleerd om ${updated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}. Mail wordt apart opgehaald.` : 'Administratie ophalen…'}</p>
    <div className="one-quick-actions"><Link to={`${base}/uren`}><Clock3 /><span>Uren invullen</span><ArrowUpRight /></Link><Link to={`${base}/documenten`}><FolderOpen /><span>Documenten</span><ArrowUpRight /></Link></div>
    <OneMailbox compact />
    <section className="one-panel"><div className="one-section-title"><div><p className="one-eyebrow">SERVICEDESK</p><h2>Actuele tickets</h2></div><Link to={`${base}/tickets`} className="one-text-link">Alle <ArrowUpRight /></Link></div>{ticketLoading ? <Loading /> : ticketError ? <p role="alert" className="one-error">Tickets konden niet worden opgehaald. Vernieuw het overzicht of open de servicedesk.</p> : tickets.length ? <div className="one-ticket-list">{tickets.map(ticket => <Link key={ticket.id} to={`${base}/tickets?ticket=${encodeURIComponent(ticket.id)}`}><span className="one-ticket-number">#{ticket.ticket_no}</span><strong>{ticket.subject}</strong><span className={ticket.priority === 'spoed' || ticket.priority === 'hoog' ? 'one-priority' : 'one-muted'}>{ticket.priority}</span><span aria-hidden="true">›</span></Link>)}</div> : <div className="one-empty"><Check /><p>Geen open tickets.</p></div>}</section>
  </div>;
}
const modules = [
  { label: 'Klanten', description: 'Contactgegevens en klantbeheer', path: `${base}/customers`, icon: Users },
  { label: 'Facturen', description: 'Overzicht, status en factuurbeheer', path: `${base}/invoices`, icon: FileText },
  { label: 'Offertes', description: 'Opstellen en opvolgen', path: `${base}/offertes`, icon: FileText },
  { label: 'Urenregistratie', description: 'Werkzaamheden en gewerkte uren', path: `${base}/uren`, icon: Clock3 },
  { label: 'Documenten', description: 'Je zakelijke bestanden', path: `${base}/documenten`, icon: FolderOpen },
  { label: 'Mail & hosting', description: 'Alle mailmappen, websites en Plesk', path: '/admin/snelle-toegang', icon: Globe },
  { label: 'Wachtwoordkluis', description: 'Open je bestaande beveiligde kluis', path: '/admin/wachtwoorden', icon: LockKeyhole },
  { label: 'Volledig beheer', description: 'Alle onderdelen van Harkas Admin', path: '/admin', icon: LayoutGrid },
];
function More() {
  return <><div className="one-page-heading"><p className="one-eyebrow">JE ONDERNEMING</p><h1>Alles binnen bereik.</h1><p className="one-muted">Dezelfde gegevens en modules als op je laptop.</p></div><div className="one-module-grid">{modules.map(item => <Link to={item.path} key={item.path} className="one-module"><span className="one-module-icon"><item.icon /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight /></Link>)}</div><section className="one-panel one-roadmap"><h2>Je agenda en meldingen</h2><p>Voeg privé- en zakelijke afspraken toe via Agenda. Schakel via het belletje afspraakherinneringen en meldingen voor nieuwe supporttickets in op dit apparaat.</p><div className="one-actions"><Link className="one-button" to={`${base}/agenda`}><CalendarDays />Agenda</Link><Link className="one-button" to={`${base}/meldingen`}><Bell />Meldingen</Link></div><p>Mailpush, externe agenda-synchronisatie, marketing, back-upmeldingen en de slimme assistent zijn nog niet aangesloten. Voor actuele gegevens is internet nodig.</p></section></>;
}
function ModulePage({ children }: { children: React.ReactNode }) {
  return <div className="one-existing"><Link className="one-text-link" to={`${base}/more`}><ArrowLeft />Alle onderdelen</Link><Suspense fallback={<Loading />}>{children}</Suspense></div>;
}
function Shell() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const logout = async () => {
    if (!window.confirm('Uitloggen bij Harkas One en Harkas Admin? Meldingen op dit apparaat worden ook uitgeschakeld.')) return;
    setLeaving(true); setLogoutError('');
    try { await disablePush(); await signOut(); } catch { setLogoutError('Uitloggen of het uitschakelen van meldingen is niet bevestigd. Probeer opnieuw.'); } finally { setLeaving(false); }
  };
  return <><header className="one-topbar"><Link to={`${base}/`} className="one-wordmark"><span className="one-mark">H<span>1</span></span><span>Harkas <b>One</b><small>Jouw onderneming. Eén overzicht.</small></span></Link><div className="one-header-actions"><Link className="one-icon-button" to={`${base}/meldingen`} aria-label="Meldingen" title="Meldingen"><Bell /></Link><button className="one-icon-button" aria-label="Uitloggen" title="Uitloggen" disabled={leaving} onClick={() => void logout()}><LogOut /></button></div></header>{logoutError && <p className="one-error" role="alert">{logoutError}</p>}<main id="one-main" className="one-main"><Suspense fallback={<Loading />}><Routes><Route index element={<Today />} /><Route path="mail" element={<OneMailbox />} /><Route path="agenda" element={<OneAgenda />} /><Route path="meldingen" element={<OneNotifications />} /><Route path="tickets" element={<ModulePage><Tickets /></ModulePage>} /><Route path="customers" element={<ModulePage><Customers /></ModulePage>} /><Route path="invoices" element={<ModulePage><Invoices /></ModulePage>} /><Route path="offertes" element={<ModulePage><Quotes /></ModulePage>} /><Route path="uren" element={<ModulePage><Hours /></ModulePage>} /><Route path="documenten" element={<ModulePage><Documents /></ModulePage>} /><Route path="more" element={<More />} /><Route path="*" element={<Navigate to={`${base}/`} replace />} /></Routes></Suspense></main><nav className="one-bottom-nav" aria-label="Hoofdnavigatie">{[{ to: `${base}/`, label: 'Vandaag', icon: Home, end: true }, { to: `${base}/mail`, label: 'Mail', icon: Mail }, { to: `${base}/agenda`, label: 'Agenda', icon: CalendarDays }, { to: `${base}/tickets`, label: 'Tickets', icon: LifeBuoy }, { to: `${base}/more`, label: 'Meer', icon: LayoutGrid }].map(item => <NavLink key={item.label} to={item.to} end={item.end}><item.icon /><span>{item.label}</span></NavLink>)}</nav></>;
}
export default function HarkasOne() {
  const { session, user, isAdmin, isLoading, signOut } = useAuth();
  const pwa = useInstall();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <div className="harkas-one"><a className="one-skip" href="#one-main">Naar de inhoud</a><div className="one-install-bar"><span><Smartphone />Harkas One voor je telefoon</span>{pwa.installed ? <span><Check />Geïnstalleerd</span> : <button disabled={pwa.installing} onClick={() => void pwa.install()}><Download />{pwa.installing ? 'Installeren…' : 'Installeer app'}</button>}</div>{pwa.help && <p className="one-install-help" role="status">Open deze pagina in Chrome op je telefoon. Kies ⋮ → Toevoegen aan startscherm → Installeren. Zie je alleen ‘Snelkoppeling maken’, vernieuw dan eerst de pagina. Op iPhone: Safari → Deel → Zet op beginscherm.</p>}{!online && <div role="status" className="one-offline"><WifiOff />Je bent offline. Getoonde gegevens kunnen verouderd zijn; vernieuw ze zodra je weer verbinding hebt.</div>}{!session ? <Login /> : isLoading ? <Loading /> : !isAdmin ? <div className="one-login"><ShieldCheck /><h1>Alleen voor beheerders</h1><p>Je account heeft geen toegang tot Harkas One.</p><Link className="one-button" to="/admin">Naar je eigen modules</Link><button className="one-button" onClick={() => void signOut()}>Uitloggen</button></div> : <Shell key={user?.id} />}</div>;
}
