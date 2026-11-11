import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { accounts, type Account } from '@/lib/mail-accounts';

type SelectableMail = { account: Account; uid: number; validity: string; subject: string };
type MoveResult = { moved: boolean; movedUids: number[] };
type Props<T extends SelectableMail> = {
  rows: T[];
  compact: boolean;
  loading: boolean;
  scope: string;
  onBusy: (busy: boolean) => void;
  onMove: (account: Account, validity: string, uids: number[]) => Promise<MoveResult>;
  onRefresh: () => void;
  children: (row: T) => ReactNode;
};
const keyOf = (row: SelectableMail) => `${row.account}:${row.validity}:${row.uid}`;

/** Selection is session-only, scoped to the visible filter, mailbox and UIDVALIDITY. */
export default function OneMailList<T extends SelectableMail>({ rows, compact, loading, scope, onBusy, onMove, onRefresh, children }: Props<T>) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<T[]>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const lock = useRef(false);
  const lifecycle = useRef({ active: true });
  const allBox = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const onBusyRef = useRef(onBusy);
  onBusyRef.current = onBusy;
  useEffect(() => () => onBusyRef.current(false), []);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const signature = rows.map(keyOf).join('|');
  const selectedRows = rows.filter(row => checked.has(keyOf(row)));
  const count = selectedRows.length;
  const allChecked = rows.length > 0 && count === rows.length;

  useEffect(() => {
    const current = { active: true };
    lifecycle.current = current;
    setChecked(new Set());
    setReview(undefined);
    return () => { current.active = false; };
  }, [scope]);

  useEffect(() => {
    const visible = new Set(rowsRef.current.map(keyOf));
    setChecked(previous => new Set([...previous].filter(key => visible.has(key))));
    setReview(undefined); // New data always requires a new explicit confirmation.
  }, [signature]);

  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = count > 0 && !allChecked;
  }, [count, allChecked]);

  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);

  useEffect(() => {
    if (!busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if ((event.target as Element)?.closest?.('a')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [busy]);

  const toggle = (row: T) => {
    if (lock.current) return;
    setReview(undefined);
    setFeedback(undefined);
    setChecked(previous => {
      const next = new Set(previous), key = keyOf(row);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const moveSelected = async () => {
    if (!review?.length || lock.current) return;
    const current = lifecycle.current;
    const visible = new Set(rowsRef.current.map(keyOf));
    if (!current.active || review.some(row => !visible.has(keyOf(row)) || !checked.has(keyOf(row)))) {
      setReview(undefined);
      setFeedback({ error: true, text: 'De selectie is gewijzigd. Selecteer de berichten opnieuw.' });
      return;
    }
    const snapshot = [...review];
    const groups = new Map<string, T[]>();
    for (const row of snapshot) {
      const key = `${row.account}:${row.validity}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    lock.current = true;
    setBusy(true); onBusy(true); setFeedback(undefined);
    let confirmed = 0;
    try {
      // One mailbox/chunk at a time: no connection burst and no automatic write retries.
      for (const group of groups.values()) {
        for (let offset = 0; offset < group.length; offset += 100) {
          if (!current.active) return;
          const batch = group.slice(offset, offset + 100);
          setProgress(`${confirmed} van ${snapshot.length} bevestigd. Verplaatsen uit ${accounts[batch[0].account]}…`);
          const uids = batch.map(row => row.uid);
          const result = await onMove(batch[0].account, batch[0].validity, uids);
          if (!current.active) return;
          if (!result.moved || !Array.isArray(result.movedUids) || result.movedUids.length !== uids.length || uids.some(uid => !result.movedUids.includes(uid))) {
            throw new Error('De server heeft de verplaatsing niet volledig bevestigd.');
          }
          confirmed += batch.length;
        }
      }
      setFeedback({ error: false, text: `${confirmed} ${confirmed === 1 ? 'e-mail is' : 'e-mails zijn'} naar de prullenbak verplaatst.` });
    } catch (error) {
      if (current.active) setFeedback({ error: true, text: `${confirmed} van ${snapshot.length} e-mails bevestigd verplaatst. ${error instanceof Error ? error.message : 'Verplaatsen is niet bevestigd.'} Er wordt niets automatisch opnieuw geprobeerd. De lijst wordt vernieuwd; controleer ook de prullenbak voordat je opnieuw selecteert.` });
    } finally {
      lock.current = false;
      if (current.active) {
        setBusy(false); onBusy(false); setProgress(''); setReview(undefined); setChecked(new Set()); onRefresh();
      }
    }
  };

  return <>
    {!compact && <section className="one-mail-selection" aria-label="E-mails selecteren en verwijderen" aria-busy={busy}>
      <div className="one-selection-actions">
        <label className="one-select-all"><input ref={allBox} type="checkbox" aria-label="Alle getoonde e-mails selecteren" checked={allChecked} disabled={busy || loading || !rows.length} onChange={() => { setReview(undefined); setFeedback(undefined); setChecked(allChecked ? new Set() : new Set(rows.map(keyOf))); }} /><span>Alles selecteren</span></label>
        <span className="one-selection-count" aria-live="polite">{count} geselecteerd</span>
        <button className="one-button one-danger" disabled={busy || loading || !count} onClick={() => { setFeedback(undefined); setReview([...selectedRows]); }}><Trash2 />Verwijderen{count ? ` (${count})` : ''}</button>
        {count > 0 && <button className="one-icon-button" aria-label="Selectie wissen" disabled={busy} onClick={() => { setChecked(new Set()); setReview(undefined); }}><X /></button>}
      </div>
      <p className="one-muted">Alles selecteren geldt alleen voor de {rows.length} getoonde, ingeladen berichten. Bij een ander filter of een zoekopdracht vervalt je selectie.</p>
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'one-error' : 'one-notice'}>{feedback.text}</p>}
      {review && <section className="one-trash-confirm" aria-labelledby="one-bulk-trash-title">
        <h2 id="one-bulk-trash-title" ref={reviewHeading} tabIndex={-1}>Geselecteerde e-mails verwijderen?</h2>
        <p>Je verplaatst {review.length} {review.length === 1 ? 'bericht' : 'berichten'} naar de prullenbak van de bijbehorende mailbox. Niets wordt definitief gewist.</p>
        <ul className="one-trash-accounts">{Object.keys(accounts).map(account => {
          const amount = review.filter(row => row.account === account).length;
          return amount ? <li key={account}>{accounts[account as Account]}: {amount}</li> : null;
        })}</ul>
        <div className="one-actions"><button className="one-button" disabled={busy} onClick={() => setReview(undefined)}>Annuleren</button><button className="one-button one-danger" disabled={busy} onClick={() => void moveSelected()}>{busy ? <Loader2 className="one-spin" /> : <Trash2 />}{busy ? 'Verplaatsen…' : `Naar prullenbak (${review.length})`}</button></div>
      </section>}
      {busy && <p role="status" className="one-muted">{progress} Laat deze pagina open tot dit klaar is.</p>}
    </section>}
    <div className="one-mail-list">
      {rows.map(row => compact ? <Fragment key={keyOf(row)}>{children(row)}</Fragment> : <div key={keyOf(row)} className={`one-mail-entry${checked.has(keyOf(row)) ? ' one-mail-entry-selected' : ''}`}>
        <label className="one-mail-check"><input type="checkbox" checked={checked.has(keyOf(row))} disabled={busy || loading} aria-label={`Selecteer ${row.subject} in ${accounts[row.account]}`} onChange={() => toggle(row)} /></label>
        {children(row)}
      </div>)}
    </div>
  </>;
}
