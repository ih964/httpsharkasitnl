import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { originOf } from "../../../browser-extension/security.js";
import { generatePassword } from "../../../browser-extension/generator.js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type RequestInfo = { mode: "fill" | "sync" | "save"; origin: string | null; compact?: boolean };
type Entry = { id: string; title: string; website_url: string | null; username: string | null; updated_at?: string };

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
  const [saveChoice, setSaveChoice] = useState("new");
  const [saveTitle, setSaveTitle] = useState("");
  const [saveUsername, setSaveUsername] = useState("");
  const [savePassword, setSavePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const writing = useRef(false);
  const allowed = !!session && canAccess("passwords");

  useEffect(() => {
    let live = true;
    send({ type: "hello" }).then(r => {
      if (!live) return;
      if (r.mode !== "sync" && (!["fill","save"].includes(r.mode) || originOf(r.origin) !== r.origin)) throw new Error("Ongeldige koppeling.");
      setRequest({ mode: r.mode, origin: r.origin, compact: !!r.compact });
      if(r.mode === "save") setSaveTitle(new URL(r.origin).hostname);
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
          .select(request.mode === "save" ? "id,title,website_url,username,updated_at" : "id,title,website_url,username").order("id").range(offset, offset + 249);
        if (error) throw new Error("Wachtwoordkluis laden mislukt.");
        all.push(...(data || []));
        if (!data || data.length < 250) break;
        if (offset === 9750) throw new Error("Te veel records voor deze versie.");
      }
      if (!live) return;
      setEntries(request.mode !== "sync" ? all.filter(x => originOf(x.website_url) === request.origin) : all);
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
  async function saveAccount() {
    if(!request || request.mode!=="save" || !request.origin || !allowed || !loaded || busy || writing.current) return;
    const title=saveTitle.trim(), username=saveUsername.trim(), password=savePassword;
    const existing=saveChoice==="new" ? null : entries.find(e=>e.id===saveChoice);
    if(!password || password.length>4096){setError("Voer een geldig nieuw wachtwoord in.");return;}
    if(saveChoice==="new" && (!title || title.length>200 || username.length>4096)){setError("Controleer de accountnaam en gebruikersnaam.");return;}
    if(saveChoice!=="new" && (!existing || originOf(existing.website_url)!==request.origin)){setError("Kies opnieuw een passend account.");return;}
    if(!existing && entries.some(e=>(e.username||"")===username)){setError("Dit account bestaat al. Kies bijwerken.");return;}
    writing.current=true;
    setBusy(true);setError("");
    let committed=false;
    try {
      const active=await send({type:"hello"});
      if(active.mode!=="save" || active.origin!==request.origin) throw new Error("Koppeling gewijzigd. Open de extensie opnieuw.");
      const enc=await supabase.functions.invoke("encrypt-password",{body:{password}});
      if(enc.error || typeof enc.data?.encrypted!=="string" || !enc.data.encrypted) throw new Error("Versleuteling mislukt. Er is niets opgeslagen.");
      const again=await send({type:"hello"});
      if(again.mode!=="save" || again.origin!==request.origin) throw new Error("Koppeling verlopen.");
      if(existing){
        // Read only this selected encrypted record in the first-party Admin page.
        // Compare the original snapshot, then guard the write against concurrent changes.
        const current=await supabase.from("password_vault").select("id,title,website_url,username,updated_at,encrypted_password").eq("id",existing.id).maybeSingle();
        const row=current.data;
        if(current.error || !row || row.website_url!==existing.website_url || row.username!==existing.username || row.title!==existing.title ||
          row.updated_at!==existing.updated_at || originOf(row.website_url)!==request.origin || typeof row.encrypted_password!=="string"){
          throw new Error("Dit account is ondertussen gewijzigd. Open de extensie opnieuw.");
        }
        let query=supabase.from("password_vault").update({encrypted_password:enc.data.encrypted})
          .eq("id",row.id).eq("website_url",row.website_url).eq("title",row.title).eq("encrypted_password",row.encrypted_password);
        query=row.username===null ? query.is("username",null) : query.eq("username",row.username);
        const result=await query.select("id").maybeSingle();
        if(result.error || result.data?.id!==row.id) throw new Error("Bijwerken niet bevestigd. Controleer de kluis voordat je opnieuw probeert.");
      }else{
        // Check the current metadata as well, rather than relying on an old browser list.
        const fresh=await supabase.from("password_vault").select("id,website_url,username").order("id").limit(10001);
        if(fresh.error || !Array.isArray(fresh.data) || fresh.data.length>10000) throw new Error("De kluis kon niet opnieuw worden gecontroleerd.");
        if(fresh.data.some((e:any)=>originOf(e.website_url)===request.origin&&(e.username||"")===username))
          throw new Error("Dit account is inmiddels toegevoegd. Open de extensie opnieuw en kies bijwerken.");
        const newId=crypto.randomUUID();
        const result=await supabase.from("password_vault").insert({id:newId,title,website_url:request.origin,username:username||null,encrypted_password:enc.data.encrypted}).select("id").maybeSingle();
        if(result.error || result.data?.id!==newId) throw new Error("Opslaan niet bevestigd. Controleer de kluis voordat je opnieuw probeert.");
      }
      committed=true;
      setSavePassword("");setShowPassword(false);
      try {await send({type:"saveResult",origin:request.origin});setSaveNotice("Website gekoppeld. Geef zo nodig via de extensie toestemming voor nieuwe websites.");}
      catch {setSaveNotice("Account opgeslagen. Synchroniseer de websites opnieuw als de herkenning ontbreekt.");}
      setDone(true);
    }catch(e:any){setError(committed?"Account opgeslagen; controleer de synchronisatie.":(e?.message||"Opslaan mislukt."));}
    finally{writing.current=false;setBusy(false);}
  }
  return <main className="min-h-screen bg-background p-5 flex items-center justify-center">
    <Card className="w-full max-w-lg">
      <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /><CardTitle>Harkas Password Manager</CardTitle></div></CardHeader>
      <CardContent className="space-y-4">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {done ? <p role="status">{request?.mode === "sync" ? "Websites gesynchroniseerd. Bestaande sitepermissies zijn behouden." : request?.mode === "save" ? "Account veilig opgeslagen in Harkas Admin. " + saveNotice : "Gegevens ingevuld. Controleer de inlogpagina en meld je zelf aan."} Je kunt dit venster sluiten.</p> :
         !request ? <p className="text-sm">Beveiligde koppeling controleren…</p> :
         isLoading ? <p>Toegang controleren…</p> :
         !session ? <div className="space-y-3"><p>Log eerst in via Harkas Admin en open daarna de extensie opnieuw.</p><a className="underline text-primary" href="/admin/login" target="_blank" rel="noreferrer">Harkas Admin openen</a></div> :
         !allowed ? <p role="alert">Je hebt geen toegang tot de wachtwoordenmodule.</p> :
         !loaded ? <p>Accounts laden…</p> :
         request.mode === "sync" ? <><p>Deel alleen de {origins.length} unieke HTTPS-websites met deze browser. Er worden geen gebruikersnamen, wachtwoorden of sessietokens opgeslagen door de extensie.</p><Button disabled={busy} onClick={sync}>Websiteherkenning toestaan</Button></> :
         request.mode === "save" ? <div className="space-y-3">
           <p>Account beheren voor:</p><p className="font-mono break-all font-semibold">{request.origin}</p>
           <p className="text-sm text-muted-foreground">Voer het wachtwoord hier zelf in nadat je het account hebt aangemaakt of gewijzigd. De extensie leest geen ingevoerde wachtwoorden van websites uit.</p>
           <Label htmlFor="save-choice">Account</Label>
           <select id="save-choice" value={saveChoice} disabled={busy} className="w-full border rounded-md bg-background p-2 text-sm" onChange={e=>{setSaveChoice(e.target.value);setSavePassword("");setShowPassword(false);setError("");}}>
             <option value="new">Nieuw account</option>
             {entries.map(e=><option key={e.id} value={e.id}>Bijwerken: {e.title} ({e.username||"geen gebruikersnaam"})</option>)}
           </select>
           {saveChoice==="new" && <>
             <Label htmlFor="save-title">Accountnaam</Label><Input id="save-title" value={saveTitle} maxLength={200} disabled={busy} onChange={e=>setSaveTitle(e.target.value)} />
             <Label htmlFor="save-user">Gebruikersnaam</Label><Input id="save-user" value={saveUsername} maxLength={4096} autoComplete="off" disabled={busy} onChange={e=>setSaveUsername(e.target.value)} />
           </>}
           <Label htmlFor="save-password">Nieuw wachtwoord</Label><Input id="save-password" type={showPassword?"text":"password"} value={savePassword} maxLength={4096} autoComplete="new-password" disabled={busy} onChange={e=>setSavePassword(e.target.value)} />
           <div className="flex flex-wrap gap-2">
             <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>{setSavePassword(generatePassword(24));setShowPassword(false);}}>Genereer</Button>
             <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>setShowPassword(!showPassword)}>{showPassword?"Verbergen":"Tonen"}</Button>
           </div>
           <Button className="w-full" disabled={busy || !savePassword} onClick={saveAccount}>{saveChoice==="new"?"Nieuw account opslaan":"Bevestig wachtwoordwijziging"}</Button>
         </div> :
         <><p>Gegevens invullen op:</p><p className="font-mono break-all font-semibold">{request.origin}</p>
         {entries.length === 0 ? <p>Geen exact gekoppeld account gevonden.</p> : entries.map(entry => <div key={entry.id} className="border rounded-lg p-3 space-y-2">
           <p className="font-semibold break-words">{entry.title}</p><p className="text-sm break-all text-muted-foreground">{entry.username || "Geen gebruikersnaam"}</p>
           <Button className="w-full" disabled={busy} onClick={() => fill(entry)}>Gegevens invullen</Button>
         </div>)}</>}
        {!done && request && <Button variant="outline" disabled={busy} onClick={async () => { try { await send({type:"cancel"}); } catch {} setSavePassword(""); setShowPassword(false); setRequest(null); setError("Verzoek geannuleerd."); }}>Annuleren</Button>}
      </CardContent>
    </Card>
  </main>;
}
