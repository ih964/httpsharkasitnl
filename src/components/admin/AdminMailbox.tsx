import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Loader2, Mail, PenLine, RefreshCw, Reply, Send, X } from "lucide-react";
import { toast } from "sonner";

const accounts = { info: "info@harkasit.nl", administratie: "administratie@harkasit.nl", support: "support@harkasit.nl" } as const;
type Address = { name: string; address: string };
type Entry = { uid: number; subject: string; from: Address[]; date: string; unread: boolean };
type Folder = { path: string; name: string; specialUse?: string };
type Message = { uid: number; account: string; subject: string; from: Address[]; to: Address[]; replyTo: Address[]; date: string; text: string; attachments: { index: number; filename: string; size: number }[] };
type Listing = { messages: Entry[]; folders?: Folder[]; total: number; account: string; uidValidity: string };
const names = (items: Address[]) => items.map(x => x.name ? `${x.name} <${x.address}>` : x.address).join(", ");
const date = (value: string) => value && !isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" }) : "";
const folderName = (folder: Folder) => ({ "\\Inbox": "Postvak IN", "\\Sent": "Verzonden", "\\Drafts": "Concepten", "\\Trash": "Prullenbak", "\\Junk": "Ongewenst" }[folder.specialUse || ""] || (folder.path === "INBOX" ? "Postvak IN" : folder.name));

export default function AdminMailbox({ account }: { account: keyof typeof accounts }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [folder, setFolder] = useState("INBOX"), [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([{ path: "INBOX", name: "Postvak IN" }]);
  const [listing, setListing] = useState<Listing>(), [message, setMessage] = useState<Message>();
  const [loading, setLoading] = useState(true), [reading, setReading] = useState(false), [sending, setSending] = useState(false);
  const [error, setError] = useState(""), [compose, setCompose] = useState<{ to: string; subject: string; text: string }>();
  const readController = useRef<AbortController>();
  const request = useCallback(async (action: string, parameters: Record<string, string> = {}, body?: Record<string, unknown>, signal?: AbortSignal) => {
    if (!token) throw new Error("Je bent niet aangemeld.");
    const query = new URLSearchParams({ account, action, folder, ...parameters });
    const response = await fetch("/api/admin-mail?" + query, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: signal || AbortSignal.timeout(45000) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Mailboxverzoek mislukt."); }
    return response;
  }, [account, folder, token]);

  useEffect(() => {
    const controller = new AbortController();
    readController.current?.abort();
    setLoading(true); setError(""); setMessage(undefined); setListing(undefined); setReading(false);
    if (!token) { setLoading(false); setError("Meld je opnieuw aan bij Harkas Admin."); return; }
    void request("list", { page: String(page) }, undefined, controller.signal).then(r => r.json()).then((data: Listing) => {
      if (controller.signal.aborted) return;
      setListing(data); if (data.folders) setFolders(data.folders);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Ophalen mislukt."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); readController.current?.abort(); };
  }, [request, page, refresh, token]);

  const open = async (uid: number) => {
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    setReading(true); setError(""); setMessage(undefined);
    try { const result = await (await request("message", { uid: String(uid), uidValidity: listing?.uidValidity || "" }, undefined, controller.signal)).json(); if (!controller.signal.aborted) setMessage(result); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Bericht openen mislukt."); }
    finally { if (!controller.signal.aborted) setReading(false); }
  };
  const download = async (attachment: Message["attachments"][number]) => {
    if (!message) return;
    try {
      const response = await request("attachment", { uid: String(message.uid), attachment: String(attachment.index), uidValidity: listing?.uidValidity || "" });
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = attachment.filename; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Download mislukt."); }
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!compose || sending) return;
    setSending(true); setError("");
    try {
      const result = await (await request("send", {}, compose)).json();
      setCompose(undefined);
      toast.success("E-mail verzonden", { description: result.saved ? "Een kopie staat in Verzonden." : "De e-mail is verzonden, maar een kopie opslaan in Verzonden is niet gelukt." });
      setRefresh(x => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Verzenden mislukt."); }
    finally { setSending(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-5">
    <Button variant="ghost" asChild><Link to="/admin/snelle-toegang"><ArrowLeft className="mr-2 h-4 w-4" /> Mail & Hosting</Link></Button>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="break-all text-2xl font-bold">{accounts[account]}</h1><p className="mt-1 text-sm text-muted-foreground">Direct verbonden via je Harkas Admin-account</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setRefresh(x => x + 1)} disabled={loading || sending}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Vernieuwen</Button><Button onClick={() => setCompose({ to: "", subject: "", text: "" })} disabled={sending}><PenLine className="mr-2 h-4 w-4" />Nieuwe e-mail</Button></div>
    </div>
    <nav aria-label="Mailbox kiezen" className="flex flex-wrap gap-2">{Object.entries(accounts).map(([key, address]) => <Button key={key} variant={key === account ? "secondary" : "ghost"} size="sm" asChild><Link to={`/admin/snelle-toegang?mailbox=${key}`}>{address}</Link></Button>)}</nav>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}<Button variant="link" className="ml-2 h-auto p-0" onClick={() => setRefresh(x => x + 1)}>Opnieuw proberen</Button>{account !== "support" && <Button variant="link" asChild className="ml-3 h-auto p-0"><Link to="/admin/wachtwoorden">Wachtwoordkluis openen</Link></Button>}</div>}
    {compose && <form onSubmit={send} className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Nieuwe e-mail</h2><Button type="button" variant="ghost" size="icon" aria-label="E-mail sluiten" disabled={sending} onClick={() => setCompose(undefined)}><X className="h-4 w-4" /></Button></div>
      <p className="text-sm text-muted-foreground">Van: {accounts[account]}</p>
      <div><Label htmlFor="mail-to">Aan</Label><Input id="mail-to" type="email" required value={compose.to} disabled={sending} onChange={e => setCompose({ ...compose, to: e.target.value })} /></div>
      <div><Label htmlFor="mail-subject">Onderwerp</Label><Input id="mail-subject" required maxLength={250} value={compose.subject} disabled={sending} onChange={e => setCompose({ ...compose, subject: e.target.value })} /></div>
      <div><Label htmlFor="mail-text">Bericht</Label><Textarea id="mail-text" required rows={9} maxLength={100000} value={compose.text} disabled={sending} onChange={e => setCompose({ ...compose, text: e.target.value })} /></div>
      <Button type="submit" disabled={sending}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{sending ? "Verzenden…" : "Verzenden"}</Button>
    </form>}
    <div className="grid items-start gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="Mailmappen" className="flex flex-wrap gap-1 rounded-xl border bg-card p-2 lg:flex-col">{folders.map(f => <Button key={f.path} variant={folder === f.path ? "secondary" : "ghost"} className="justify-start" onClick={() => { setFolder(f.path); setPage(1); }} disabled={sending}><Mail className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{folderName(f)}</span></Button>)}</nav>
      <div className="min-w-0 space-y-4">
        <section aria-label="Berichten" className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h2 className="font-semibold">{folderName(folders.find(f => f.path === folder) || { path: folder, name: folder })}</h2><span className="text-sm text-muted-foreground">{listing ? `${listing.total} berichten` : "Verbinden…"}</span></div>
          {loading ? <div role="status" className="flex items-center gap-2 p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Mailbox openen…</div> : listing?.messages.length ? <ul className="divide-y">{listing.messages.map(m => <li key={m.uid}><button type="button" aria-pressed={message?.uid === m.uid} onClick={() => void open(m.uid)} className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${message?.uid === m.uid ? "bg-primary/5" : ""}`}><div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><span className={`truncate text-sm ${m.unread ? "font-bold" : "font-medium"}`}>{names(m.from) || "Onbekende afzender"}</span><span className="text-xs text-muted-foreground">{date(m.date)}</span></div><div className={`mt-1 truncate text-sm ${m.unread ? "font-semibold" : "text-muted-foreground"}`}>{m.subject}</div></button></li>)}</ul> : !error ? <p className="p-8 text-sm text-muted-foreground">Deze map is leeg.</p> : null}
          <div className="flex items-center justify-between border-t p-3"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage(x => x - 1)}>Vorige</Button><span className="text-sm">Pagina {page}</span><Button size="sm" variant="outline" disabled={loading || !listing || page * 30 >= listing.total} onClick={() => setPage(x => x + 1)}>Volgende</Button></div>
        </section>
        {reading && <div role="status" className="flex items-center gap-2 rounded-xl border p-6"><Loader2 className="h-5 w-5 animate-spin" />Bericht openen…</div>}
        {message && <article className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="break-words text-xl font-semibold">{message.subject}</h2><Button variant="outline" size="sm" onClick={() => { setCompose({ to: message.replyTo[0]?.address || "", subject: (/^re:/i.test(message.subject) ? message.subject : "Re: " + message.subject).slice(0, 250), text: `\n\nOp ${date(message.date)} schreef ${names(message.from)}:\n${message.text.split("\n").map(l => "> " + l).join("\n")}` }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Reply className="mr-2 h-4 w-4" />Beantwoorden</Button></div>
          <div className="space-y-1 break-words border-b pb-4 text-sm text-muted-foreground"><p>Van: {names(message.from)}</p><p>Aan: {names(message.to)}</p><p>{date(message.date)}</p></div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</div>
          {message.attachments.length > 0 && <section aria-label="Bijlagen" className="space-y-2 border-t pt-4"><h3 className="font-semibold">Bijlagen</h3>{message.attachments.map(a => <Button key={a.index} variant="outline" className="mr-2 max-w-full" onClick={() => void download(a)}><Download className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{a.filename} ({Math.ceil(a.size / 1024)} KB)</span></Button>)}</section>}
        </article>}
      </div>
    </div>
  </div>;
}
