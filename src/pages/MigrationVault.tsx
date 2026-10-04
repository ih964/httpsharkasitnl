import { useState } from "react";
import { supabase as source } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://uqkrxzlkvjdmebsbdrmb.supabase.co";

export default function MigrationVault() {
  const [targetKey, setTargetKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const run = async () => {
    if (running) return;
    setRunning(true); setLogs([]);
    try {
      if (!targetKey.trim()) throw new Error("Vul de publishable/anon key van uqkr... in.");
      const target = createClient(TARGET_URL, targetKey.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: srcUser } = await source.auth.getUser();
      if (!srcUser.user) throw new Error("Log eerst in op de oude Harkas IT omgeving.");
      const { data: srcRole } = await source.from("user_roles").select("role").eq("user_id", srcUser.user.id).eq("role","admin").maybeSingle();
      if (!srcRole) throw new Error("Oude account is geen administrator.");
      setLogs(x=>[...x,"Oude admin-sessie gecontroleerd."]);
      const { data: login, error: loginError } = await target.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError || !login.user) throw new Error(loginError?.message || "Nieuwe admin-login mislukt.");
      const { data: targetRole } = await target.from("user_roles").select("role").eq("user_id", login.user.id).eq("role","admin").maybeSingle();
      if (!targetRole) throw new Error("Nieuwe account heeft geen adminrol.");
      setLogs(x=>[...x,"Nieuwe admin-sessie gecontroleerd."]);
      const { data: rows, error } = await source.from("password_vault").select("id");
      if (error) throw error;
      if ((rows?.length ?? 0)!==60) throw new Error("Bron-vault bevat niet precies 60 items.");
      let n=0;
      for (const row of rows ?? []) {
        const { data: dec, error: de } = await source.functions.invoke("decrypt-password",{body:{id:row.id}});
        if (de || !dec?.password) throw new Error("Oude vault kon niet worden ontsleuteld.");
        const { data: enc, error: ee } = await target.functions.invoke("encrypt-password",{body:{password:dec.password}});
        if (ee || !enc?.encrypted) throw new Error("Nieuwe vault kon niet worden versleuteld.");
        const { error: we } = await target.from("password_vault").update({encrypted_password:enc.encrypted,updated_at:new Date().toISOString()}).eq("id",row.id);
        if (we) throw new Error("Nieuwe vault kon niet worden bijgewerkt.");
        n++; setProgress(`Vault ${n}/60`);
      }
      setLogs(x=>[...x,"60/60 wachtwoorden opnieuw versleuteld."]);
      const { data: invs, error: ie } = await source.from("invoices").select("pdf_storage_path").not("pdf_storage_path","is",null);
      if (ie) throw ie;
      let f=0;
      for (const inv of invs ?? []) {
        const path=String(inv.pdf_storage_path);
        const {data:file,error:de}=await source.storage.from("invoices").download(path);
        if(de||!file) throw new Error("PDF kon niet worden gelezen.");
        const {error:ue}=await target.storage.from("invoices").upload(path,file,{upsert:true,contentType:"application/pdf"});
        if(ue) throw new Error("PDF kon niet worden opgeslagen.");
        f++; setProgress(`Bestanden ${f}/19`);
      }
      const {data:brands,error:be}=await source.storage.from("branding").list("",{limit:100});
      if(be) throw be;
      for(const item of brands ?? []) {
        if(!item.name) continue;
        const {data:file,error:de}=await source.storage.from("branding").download(item.name);
        if(de||!file) throw new Error("Logo kon niet worden gelezen.");
        const {error:ue}=await target.storage.from("branding").upload(item.name,file,{upsert:true,contentType:file.type||undefined});
        if(ue) throw new Error("Logo kon niet worden opgeslagen.");
        f++; setProgress(`Bestanden ${f}/19`);
      }
      setLogs(x=>[...x,`Storage overgezet: ${f} bestanden.`]);
      const {data:check,error:ce}=await target.from("password_vault").select("id");
      if(ce || (check?.length??0)!==60) throw new Error("Eindcontrole vault mislukt.");
      setLogs(x=>[...x,"Eindcontrole geslaagd. Productie is nog niet omgezet."]);
      setProgress("Klaar.");
      setPassword("");
    } catch(e) {
      setLogs(x=>[...x,e instanceof Error?e.message:"Onbekende fout"]);
      setProgress("Gestopt — bron is niet gewijzigd.");
    } finally { setRunning(false); }
  };

  return <main style={{maxWidth:760,margin:"40px auto",padding:24,fontFamily:"system-ui"}}>
    <h1>Harkas IT — eenmalige migratie</h1>
    <p>De oude Lovable-database wordt alleen gelezen. Er wordt niets verwijderd.</p>
    <label>Nieuwe Supabase publishable/anon key</label>
    <input value={targetKey} onChange={e=>setTargetKey(e.target.value)} disabled={running} style={{display:"block",width:"100%",padding:10,margin:"6px 0 14px"}} />
    <label>Nieuw admin e-mailadres</label>
    <input value={email} onChange={e=>setEmail(e.target.value)} disabled={running} style={{display:"block",width:"100%",padding:10,margin:"6px 0 14px"}} />
    <label>Nieuw admin wachtwoord</label>
    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} disabled={running} style={{display:"block",width:"100%",padding:10,margin:"6px 0 14px"}} />
    <button onClick={run} disabled={running||!targetKey||!email||!password} style={{padding:"12px 18px"}}>{running?"Bezig...":"Start migratie"}</button>
    <p>{progress}</p>
    <pre style={{whiteSpace:"pre-wrap",background:"#111",color:"#fff",padding:16,borderRadius:8}}>{logs.join("\n")}</pre>
  </main>;
}