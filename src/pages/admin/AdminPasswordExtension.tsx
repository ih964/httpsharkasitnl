import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { originOf } from "../../../browser-extension/security.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type RequestInfo = { mode: "fill" | "sync"; origin: string | null };
type Entry = { id: string; title: string; website_url: string | null; username: string | null };

function send(message: Record<string, unknown>): Promise<any> {
  const params = new URLSearchParams(location.hash.slice(1));
  const extension = params.get("extension") || "";
  const nonce = params.get("nonce") || "";
  const runtime = (window as any).chrome?.runtime;
  if (location.origin !== "https://www.harkasit.nl" || window.top !== window ||
      extension !== "gfklpaehpogdijpdbgfpbgeoaghkbdki" || !/^[0-9a-f-]{36}$/.test(nonce) || !runtime?.sendMessage) {
    return Promise.reject(new Error("Open deze pagina vanuit Harkas Password Manager."));
  }
  return new Promise((resolve, reject) => {
    runtime.sendMessage(extension, { ...message, nonce }, (response: any) => {
      if (runtime.lastError || !response?.ok) {
        reject(new Error(response?.message || "Koppeling verlopen. Open de extensie opnieuw."));
      } else resolve(response);
    });
  });
}

export default function AdminPasswordExtension() {
  const { session, isLoading, canAccess } = useAuth();
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const allowed = !!session && canAccess("passwords");

  useEffect(() => {
    let live = true;
    send({ type: "hello" }).then(r => {
      if (!live) return;
      if (r.mode !== "sync" && (r.mode !== "fill" || originOf(r.origin) !== r.origin)) throw new Error("Ongeldige koppeling.");
      setRequest({ mode: r.mode, origin: r.origin });
    }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    setEntries([]); setLoaded(false);
    if (!request || isLoading || !allowed) return;
    (async () => {
      // Only non-secret metadata; never load ciphertext or notes for the extension.
      const all: Entry[] = [];
      for (let offset = 0; offset < 10000; offset += 250) {
        const { data, error } = await supabase.from("password_vault")
          .select("id,title,website_url,username").order("id").range(offset, offset + 249);
        if (error) throw new Error("Wachtwoordkluis laden mislukt.");
        all.push(...(data || []));
        if (!data || data.length < 250) break;
        if (offset === 9750) throw new Error("Te veel records voor deze versie.");
      }
      if (!live) return;
      setEntries(request.mode === "fill" ? all.filter(x => originOf(x.website_url) === request.origin) : all);
      setLoaded(true);
    })().catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [request, allowed, isLoading, session?.user?.id]);

  const origins = [...new Set(entries.map(e => originOf(e.website_url)).filter(Boolean))] as string[];
  async function sync() {
    if (!request || request.mode !== "sync" || !allowed || busy || !loaded) return;
    setBusy(true); setError("");
    try { await send({ type: "syncResult", origins }); setDone(true); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function fill(entry: Entry) {
    if (!request || request.mode !== "fill" || !request.origin || !allowed || busy || !loaded ||
        originOf(entry.website_url) !== request.origin) return;
    setBusy(true); setError("");
    try {
      // Validate the live extension request before decrypting. The server rechecks the
      // origin against the same vault row as the ciphertext, not a caller-supplied title.
      const active = await send({ type: "hello" });
      if (active.mode !== "fill" || active.origin !== request.origin) throw new Error("Koppeling gewijzigd.");
      const { data, error } = await supabase.functions.invoke("decrypt-password", {
        body: { id: entry.id, expected_origin: request.origin },
      });
      if (error || data?.origin !== request.origin || data?.username !== (entry.username || "") ||
          typeof data?.password !== "string" || !data.password) throw new Error("Account gewijzigd of beveiligde koppeling niet beschikbaar.");
      await send({ type: "fillResult", origin: request.origin, username: data.username, password: data.password });
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background p-5 flex items-center justify-center">
    <Card className="w-full max-w-lg">
      <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /><CardTitle>Harkas Password Manager</CardTitle></div></CardHeader>
      <CardContent className="space-y-4">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {done ? <p role="status">{request?.mode === "sync" ? "Websites gesynchroniseerd. Open de extensie opnieuw om herkenning te activeren." : "Gegevens ingevuld. Controleer de inlogpagina en meld je zelf aan."} Je kunt dit tabblad sluiten.</p> :
         !request ? <p className="text-sm">Beveiligde koppeling controleren…</p> :
         isLoading ? <p>Toegang controleren…</p> :
         !session ? <div className="space-y-3"><p>Log eerst in via Harkas Admin en open daarna de extensie opnieuw.</p><a className="underline text-primary" href="/admin/login" target="_blank" rel="noreferrer">Harkas Admin openen</a></div> :
         !allowed ? <p role="alert">Je hebt geen toegang tot de wachtwoordenmodule.</p> :
         !loaded ? <p>Accounts laden…</p> :
         request.mode === "sync" ? <><p>Deel alleen de {origins.length} unieke HTTPS-websites met deze browser. Er worden geen gebruikersnamen, wachtwoorden of sessietokens opgeslagen door de extensie.</p><Button disabled={busy} onClick={sync}>Websiteherkenning toestaan</Button></> :
         <><p>Gegevens invullen op:</p><p className="font-mono break-all font-semibold">{request.origin}</p>
         {entries.length === 0 ? <p>Geen exact gekoppeld account gevonden.</p> : entries.map(entry => <div key={entry.id} className="border rounded-lg p-3 space-y-2">
           <p className="font-semibold break-words">{entry.title}</p><p className="text-sm break-all text-muted-foreground">{entry.username || "Geen gebruikersnaam"}</p>
           <Button className="w-full" disabled={busy} onClick={() => fill(entry)}>Gegevens invullen</Button>
         </div>)}</>}
        {!done && request && <Button variant="outline" disabled={busy} onClick={async () => { try { await send({type:"cancel"}); } catch {} setRequest(null); setError("Verzoek geannuleerd."); }}>Annuleren</Button>}
      </CardContent>
    </Card>
  </main>;
}
