import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Download, Inbox, Loader2, Mail, PenLine, RefreshCw, Reply, Search, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const accounts = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl' } as const;
type Account = keyof typeof accounts;
type Address = { name: string; address: string };
type Entry = { uid: number; subject: string; from: Address[]; date: string; unread: boolean };
type Listing = { messages: Entry[]; total: number; uidValidity: string };
type MailMessage = { uid: number; subject: string; from: Address[]; to: Address[]; replyTo: Address[]; date: string; text: string; attachments: { index: number; filename: string; size: number }[] };
type Box = { loading: boolean; data?: Listing; error?: string; page: number; updated?: number };
type Draft = { account: Account; to: string; subject: string; text: string };
const accountKeys = Object.keys(accounts) as Account[];
const initialBoxes = (): Record<Account, Box> => ({ info: { loading: true, page: 1 }, administratie: { loading: true, page: 1 }, support: { loading: true, page: 1 } });
export const isAccount = (value: string | null): value is Account => value !== null && Object.prototype.hasOwnProperty.call(accounts, value);
const sender = (from: Address[]) => from.map(a => a.name || a.address).join(', ') || 'Onbekende afzender';
const addresses = (items: Address[]) => items.map(a => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
const dateText = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Amsterdam' }) : '';

/** Only this same-origin, admin-authorized API is used. Mail credentials never reach this client. */
async function mailRequest<T>(token: string, account: Account, action: string, params: Record<string, string> = {}, body?: Record<string, unknown>, signal?: AbortSignal, download = false): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) throw new DOMException('Geannuleerd', 'AbortError');
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = window.setTimeout(cancel, 45000);
  try {
    const query = new URLSearchParams({ account, action, folder: 'INBOX', ...params });
    const response = await fetch('/api/admin-mail?' + query, {
      method: body ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || (response.status === 403 ? 'Meld je opnieuw aan als beheerder.' : 'De mailbox is tijdelijk niet bereikbaar.'));
    }
    return (download ? await response.blob() : await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('De mailserver antwoordt niet op tijd. Probeer opnieuw.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export default function OneMailbox({ compact = false }: { compact?: boolean }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [params, setParams] = useSearchParams();
  const [boxes, setBoxes] = useState<Record<Account, Box>>(initialBoxes);
  const [filter, setFilter] = useState<Account | 'all'>('all');
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState<MailMessage>();
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [draft, setDraft] = useState<Draft>();
  const [sending, setSending] = useState(false);
  const [sendReview, setSendReview] = useState(false);
  const [trashReview, setTrashReview] = useState(false);
  const [removing, setRemoving] = useState(false);
  const trashLock = useRef(false);
  const selectionRef = useRef('');
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const composerTo = useRef<HTMLInputElement>(null);
  const wasReview = useRef(false);
  const [sendError, setSendError] = useState('');
  const [notice, setNotice] = useState('');
  const [downloading, setDownloading] = useState<number>();
  const sendLock = useRef(false);
  const lifetime = useRef<AbortController>();
  const accountParam = params.get('account');
  const selectedAccount = !compact && isAccount(accountParam) ? accountParam : undefined;
  const uid = !compact ? params.get('uid') : null;
  const validity = !compact ? params.get('validity') : null;
  const selected = Boolean(selectedAccount && uid && validity);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setBoxes(initialBoxes());
    if (token) accountKeys.forEach(account => {
      void mailRequest<Listing>(token, account, 'list', { page: '1' }, undefined, controller.signal)
        .then(data => { if (!controller.signal.aborted) setBoxes(previous => ({ ...previous, [account]: { data, loading: false, page: 1, updated: Date.now() } })); })
        .catch(error => { if (!controller.signal.aborted) setBoxes(previous => ({ ...previous, [account]: { loading: false, page: 1, error: error instanceof Error ? error.message : 'Ophalen mislukt.' } })); });
    });
    return () => controller.abort();
  }, [token, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const selection = `${selectedAccount || ''}/${uid || ''}/${validity || ''}`;
    selectionRef.current = selection;
    setMessage(undefined); setReadError(''); setTrashReview(false);
    if (!token || !selected || !selectedAccount) { setReading(false); return; }
    if (!/^\d+$/.test(uid || '') || !/^\d+$/.test(validity || '')) { setReadError('Ongeldige berichtverwijzing. Open het bericht opnieuw vanuit je inbox.'); setReading(false); return; }
    setReading(true);
    void mailRequest<MailMessage>(token, selectedAccount, 'message', { uid: uid!, uidValidity: validity! }, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setMessage(data); })
      .catch(error => { if (!controller.signal.aborted) setReadError(error instanceof Error ? error.message : 'Openen mislukt.'); })
      .finally(() => { if (!controller.signal.aborted) setReading(false); });
    return () => { controller.abort(); if (selectionRef.current === selection) selectionRef.current = ''; };
  }, [token, selected, selectedAccount, uid, validity, refresh]);

  useEffect(() => {
    if (sendReview) reviewHeading.current?.focus();
    else if (wasReview.current) composerTo.current?.focus();
    wasReview.current = sendReview;
  }, [sendReview]);

  useEffect(() => {
    if (!draft || !(draft.to || draft.subject || draft.text)) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a');
      if (anchor && anchor.href !== window.location.href && !window.confirm('Dit concept is nog niet opgeslagen. Deze pagina verlaten?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [draft]);

  const rows = useMemo(() => accountKeys.filter(account => filter === 'all' || filter === account).flatMap(account =>
    (boxes[account].data?.messages || []).map(item => ({ ...item, account, validity: boxes[account].data!.uidValidity })))
    .filter(item => !query.trim() || `${item.subject} ${addresses(item.from)}`.toLocaleLowerCase('nl-NL').includes(query.trim().toLocaleLowerCase('nl-NL')))
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)), [boxes, filter, query]);
  const loading = accountKeys.some(account => boxes[account].loading);
  const failed = accountKeys.filter(account => boxes[account].error);

  const loadMore = async (account: Account) => {
    const box = boxes[account];
    if (!token || !box.data || box.loading || !lifetime.current) return;
    const controller = lifetime.current;
    setBoxes(previous => ({ ...previous, [account]: { ...previous[account], loading: true, error: undefined } }));
    try {
      const result = await mailRequest<Listing>(token, account, 'list', { page: String(box.page + 1) }, undefined, controller.signal);
      if (controller.signal.aborted) return;
      if (result.uidValidity !== box.data.uidValidity) throw new Error('De mailbox is gewijzigd. Vernieuw de lijst voordat je verder leest.');
      const messages = [...new Map([...box.data.messages, ...result.messages].map(item => [item.uid, item])).values()];
      setBoxes(previous => ({ ...previous, [account]: { loading: false, page: box.page + 1, data: { ...result, messages }, updated: Date.now() } }));
    } catch (error) {
      if (!controller.signal.aborted) setBoxes(previous => ({ ...previous, [account]: { ...previous[account], loading: false, error: error instanceof Error ? error.message : 'Meer laden mislukt.' } }));
    }
  };
  const compose = (account: Account, replying = false, forward = false) => {
    setSendError(''); setNotice(''); setSendReview(false);
    setDraft({ account, to: replying ? message?.replyTo[0]?.address || '' : '',
      subject: message && (replying || forward) ? ((replying ? (/^re:/i.test(message.subject) ? '' : 'Re: ') : 'Fwd: ') + message.subject).slice(0, 250) : '',
      text: message && (replying || forward) ? `\n\nOp ${dateText(message.date)} schreef ${addresses(message.from)}:\n${message.text.slice(0, 80000).split('\n').map(line => '> ' + line).join('\n').slice(0, 95000)}` : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelDraft = () => {
    if (sending) return;
    if (draft && (draft.to || draft.subject || draft.text) && !window.confirm('Dit concept verwijderen? Het is nog niet opgeslagen.')) return;
    setDraft(undefined); setSendError(''); setSendReview(false);
  };
  const reviewSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || sending || !draft.to.trim() || !draft.text.trim() || !draft.subject.trim()) return;
    setSendReview(true); setSendError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const send = async () => {
    if (!draft || !token || !sendReview || sendLock.current || !draft.text.trim() || !draft.subject.trim()) return;
    sendLock.current = true; setSending(true); setSendError('');
    try {
      const result = await mailRequest<{ sent: boolean; saved: boolean }>(token, draft.account, 'send', {}, draft);
      if (!result.sent) throw new Error('Geen verzendbevestiging ontvangen.');
      setDraft(undefined); setSendReview(false);
      setNotice(result.saved ? 'E-mail verzonden. Een kopie staat in Verzonden.' : 'E-mail verzonden. Opslaan van de kopie in Verzonden is niet gelukt. Verstuur niet opnieuw.');
    } catch (error) {
      setSendError(`${error instanceof Error ? error.message : 'Verzenden niet bevestigd.'} Controleer eerst Verzonden of webmail voordat je opnieuw verstuurt, om dubbele e-mails te voorkomen.`);
    } finally { setSending(false); sendLock.current = false; }
  };
  const moveToTrash = async () => {
    if (!token || !selectedAccount || !uid || !validity || !message || !trashReview || trashLock.current) return;
    const requestSelection = selectionRef.current;
    trashLock.current = true; setRemoving(true); setReadError('');
    try {
      const result = await mailRequest<{ moved: boolean; folder: string }>(token, selectedAccount, 'trash', { uid, uidValidity: validity }, {});
      if (!result.moved) throw new Error('Verplaatsen naar de prullenbak is niet bevestigd. Vernieuw eerst je mailbox.');
      setNotice(`E-mail verplaatst naar de prullenbak van ${accounts[selectedAccount]}.`);
      if (selectionRef.current === requestSelection) { setTrashReview(false); setMessage(undefined); setParams({}); }
      setRefresh(value => value + 1);
    } catch (error) {
      setReadError(error instanceof Error ? error.message : 'Verplaatsen naar de prullenbak is niet bevestigd. Vernieuw eerst je mailbox.');
    } finally { setRemoving(false); trashLock.current = false; }
  };
  const download = async (index: number, filename: string) => {
    if (!token || !selectedAccount || !uid || !validity || downloading !== undefined) return;
    setDownloading(index); setReadError('');
    try {
      const blob = await mailRequest<Blob>(token, selectedAccount, 'attachment', { uid, uidValidity: validity, attachment: String(index) }, undefined, undefined, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename.replace(/[\r\n/\\]/g, '_'); link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) { setReadError(error instanceof Error ? error.message : 'Download mislukt.'); }
    finally { setDownloading(undefined); }
  };

  if (draft && sendReview && !compact) return <section className="one-panel one-compose">
    <div className="one-section-title"><div><p className="one-eyebrow">CONTROLEER JE E-MAIL</p><h1 ref={reviewHeading} tabIndex={-1}>E-mail versturen?</h1></div></div>
    <dl className="one-send-summary"><dt>Van</dt><dd>{accounts[draft.account]}</dd><dt>Aan</dt><dd>{draft.to.trim()}</dd><dt>Onderwerp</dt><dd>{draft.subject.trim()}</dd></dl>
    <div className="one-send-preview">{draft.text}</div>
    {sendError && <p role="alert" className="one-error">{sendError}</p>}
    <div className="one-actions"><button className="one-button" disabled={sending} onClick={() => setSendReview(false)}><ArrowLeft />Terug naar bericht</button><button className="one-button one-primary" disabled={sending} onClick={() => void send()}>{sending ? <Loader2 className="one-spin" /> : <Send />}{sending ? 'Verzenden…' : 'Versturen'}</button></div>
  </section>;

  if (draft && !compact) return <section className="one-panel one-compose">
    <div className="one-section-title"><div><p className="one-eyebrow">E-MAIL OPSTELLEN</p><h1>Nieuw bericht</h1></div><div className="one-actions"><button type="submit" form="one-mail-compose" className="one-button one-primary" disabled={sending}><Send />Versturen</button><button className="one-icon-button" aria-label="Concept sluiten" onClick={cancelDraft} disabled={sending}><X /></button></div></div>
    <form id="one-mail-compose" onSubmit={reviewSend}>
      <label>Versturen vanaf<select value={draft.account} disabled={sending} onChange={event => setDraft({ ...draft, account: event.target.value as Account })}>{accountKeys.map(account => <option key={account} value={account}>{accounts[account]}</option>)}</select></label>
      <label>Aan<input ref={composerTo} type="email" autoComplete="off" required maxLength={254} value={draft.to} disabled={sending} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
      <label>Onderwerp<input required maxLength={250} value={draft.subject} disabled={sending} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>
      <label>Bericht<textarea required rows={12} maxLength={100000} value={draft.text} disabled={sending} onChange={event => setDraft({ ...draft, text: event.target.value })} /></label>
      <p className="one-muted">Concepten blijven alleen op dit scherm. Bijlagen worden bij doorsturen niet automatisch meegestuurd.</p>
      {sendError && <p role="alert" className="one-error">{sendError}</p>}
      <button type="submit" className="one-button one-primary" disabled={sending}>{sending ? <Loader2 className="one-spin" /> : <Send />}{sending ? 'Verzenden…' : 'Controleren en versturen'}</button>
    </form>
  </section>;

  if (selected && !compact) return <section className="one-reader">
    <button className="one-button" disabled={removing} onClick={() => setParams({})}><ArrowLeft />Terug naar alle mail</button>
    {notice && <p role="status" className="one-notice">{notice}</p>}
    {readError && <div role="alert" className="one-error">{readError}<button className="one-button" onClick={() => setRefresh(value => value + 1)}>Mailbox vernieuwen</button></div>}
    {reading && <div role="status" className="one-empty"><Loader2 className="one-spin" />Bericht openen…</div>}
    {message && <article className="one-panel">
      <span className={`one-account one-account-${selectedAccount}`}>{accounts[selectedAccount!]}</span>
      <h1 className="one-message-subject">{message.subject}</h1>
      <div className="one-mail-meta"><p><strong>Van</strong> {addresses(message.from)}</p><p><strong>Aan</strong> {addresses(message.to)}</p><time>{dateText(message.date)}</time></div>
      <div className="one-actions"><button className="one-button one-primary" disabled={removing} onClick={() => compose(selectedAccount!, true)}><Reply />Beantwoorden</button><button className="one-button" disabled={removing} onClick={() => compose(selectedAccount!, false, true)}><ArrowUpRight />Doorsturen</button><button className="one-button one-danger" disabled={removing} onClick={() => { setTrashReview(true); setReadError(''); }}><Trash2 />Verwijderen</button></div>
      {trashReview && <section className="one-trash-confirm" aria-labelledby="one-trash-title">
        <h2 id="one-trash-title">Naar de prullenbak?</h2><p>Dit verplaatst deze e-mail naar de prullenbak van {accounts[selectedAccount!]}. Het bericht wordt niet definitief gewist.</p>
        <div className="one-actions"><button className="one-button" disabled={removing} onClick={() => setTrashReview(false)}>Annuleren</button><button className="one-button one-danger" disabled={removing} onClick={() => void moveToTrash()}>{removing ? <Loader2 className="one-spin" /> : <Trash2 />}{removing ? 'Verplaatsen…' : 'Naar prullenbak'}</button></div>
      </section>}
      <div className="one-mail-body">{message.text}</div>
      {message.attachments.length > 0 && <section className="one-attachments"><h2>Bijlagen</h2>{message.attachments.map(attachment => <button className="one-button" key={attachment.index} disabled={downloading !== undefined} onClick={() => void download(attachment.index, attachment.filename)}>{downloading === attachment.index ? <Loader2 className="one-spin" /> : <Download />}<span>{attachment.filename} · {Math.ceil(attachment.size / 1024)} KB</span></button>)}</section>}
      <p className="one-muted">Veilige tekstweergave: externe afbeeldingen en scripts worden niet geladen.</p>
    </article>}
  </section>;

  return <section className={compact ? 'one-panel one-inbox-compact' : 'one-inbox'}>
    <div className="one-section-title"><div><p className="one-eyebrow">{compact ? 'DRIE POSTVAKKEN, ÉÉN PLEK' : 'INFO · ADMINISTRATIE · SUPPORT'}</p><h2>{compact ? 'Laatste e-mails' : 'Alle mail'}</h2></div><div className="one-actions"><button className="one-icon-button" title="Mailboxen vernieuwen" aria-label="Mailboxen vernieuwen" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw className={loading ? 'one-spin' : ''} /></button>{!compact && <button className="one-button one-primary" onClick={() => compose(filter === 'all' ? 'info' : filter)}><PenLine /><span>Nieuwe e-mail</span></button>}</div></div>
    {notice && <p role="status" className="one-notice">{notice}</p>}
    <div className="one-mail-accounts" aria-label="Mailboxfilter">{!compact && <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>Alle</button>}{accountKeys.map(account => <button key={account} onClick={() => { if (!compact) setFilter(account); }} disabled={compact} aria-pressed={!compact && filter === account}><span className={`one-dot one-dot-${account}`} />{account === 'administratie' ? 'Admin' : account === 'support' ? 'Support' : 'Info'}<span>{boxes[account].loading && !boxes[account].data ? '…' : boxes[account].data?.total ?? '—'}</span></button>)}</div>
    {failed.map(account => <p role="alert" key={account} className="one-error"><strong>{accounts[account]}:</strong> {boxes[account].error}</p>)}
    {!compact && <><label className="one-search"><Search /><span className="one-sr-only">Zoeken in ingeladen e-mails</span><input type="search" placeholder="Zoek afzender of onderwerp…" value={query} onChange={event => setQuery(event.target.value)} /></label><p className="one-muted">Zoekt in ingeladen berichten. Per mailbox worden eerst de laatste 30 opgehaald. De aantallen hierboven zijn alle berichten in Postvak IN.</p></>}
    <div className="one-mail-list">
      {(compact ? rows.slice(0, 4) : rows).map(item => <Link className="one-mail-row" key={`${item.account}-${item.validity}-${item.uid}`} to={`/admin/one/mail?${new URLSearchParams({ account: item.account, uid: String(item.uid), validity: item.validity })}`}>
        <span className={`one-mail-avatar one-avatar-${item.account}`} aria-hidden="true">{sender(item.from).slice(0, 1).toUpperCase()}</span>
        <span className="one-mail-content"><span className="one-mail-row-top"><strong>{sender(item.from)}</strong><time>{dateText(item.date)}</time></span><span className={item.unread ? 'one-mail-subject one-unread' : 'one-mail-subject'}>{item.subject}</span><span className={`one-account one-account-${item.account}`}>{accounts[item.account]}{item.unread ? ' · Ongelezen' : ''}</span></span>
        <span className="one-row-arrow" aria-hidden="true">›</span>
      </Link>)}
    </div>
    {loading && <p role="status" className="one-empty"><Loader2 className="one-spin" />{rows.length ? 'Mailboxen bijwerken…' : 'Mailboxen verbinden…'}</p>}
    {!loading && rows.length === 0 && <div className="one-empty"><Inbox /><p>{query ? 'Geen resultaten in de ingeladen berichten.' : failed.length ? 'Niet alle mailboxen konden worden geladen.' : 'Geen berichten in deze inbox.'}</p></div>}
    {compact ? <Link className="one-text-link" to="/admin/one/mail">Alle mail bekijken <ArrowUpRight /></Link> : <><div className="one-more-mail">{accountKeys.filter(account => filter === 'all' || filter === account).map(account => boxes[account].data && boxes[account].page * 30 < boxes[account].data!.total && <button key={account} className="one-button" disabled={boxes[account].loading} onClick={() => void loadMore(account)}>Meer uit {account}{boxes[account].loading && <Loader2 className="one-spin" />}</button>)}</div><div className="one-panel one-folder-links"><h2>Alle mappen</h2><p className="one-muted">Ook Verzonden, archief en je eigen mappen zijn beschikbaar in Harkas Admin.</p>{accountKeys.map(account => <Link className="one-button" key={account} to={`/admin/snelle-toegang?mailbox=${account}`}><Mail />{account}<ArrowUpRight /></Link>)}</div></>}
  </section>;
}
