import { ADMIN, BRIDGE, TTL, originOf, isBridge, canFill, hostPattern } from "./security.js";
import { loginForm } from "./form.js";
const inflight = new Set();
const pendingPrefix = "request:";
const knownKey = "recognizedOrigins";
const enabledKey = "recognitionEnabled";
let serial = Promise.resolve();
function serialized(work){const result=serial.then(work);serial=result.catch(()=>{});return result;}
const prefix = "harkas-recognition-";
const fail = message => ({ok:false,message});
async function known() {
  const v = (await chrome.storage.local.get(knownKey))[knownKey];
  return Array.isArray(v) ? v.filter(x => originOf(x) === x) : [];
}
async function pending(nonce) {
  if (typeof nonce !== "string" || !/^[0-9a-f-]{36}$/.test(nonce)) return null;
  const key = pendingPrefix + nonce;
  const r = (await chrome.storage.session.get(key))[key];
  if (!r || Date.now() >= r.expires) { await chrome.storage.session.remove(key); return null; }
  return r;
}
async function prune() {
  const values = await chrome.storage.session.get(null);
  const expired = Object.keys(values).filter(k=>k.startsWith(pendingPrefix) && values[k]?.expires <= Date.now());
  if (expired.length) await chrome.storage.session.remove(expired);
}
async function start(mode, target) {
  await prune();
  let origin = null, documentId = null;
  if (mode === "fill" || mode === "save") {
    origin = originOf(target?.url);
    if (!origin || !target?.url?.startsWith("https://") || target.id == null) return fail("Open eerst een HTTPS-inlogpagina.");
    if(mode === "fill"){
    const [result] = await chrome.scripting.executeScript({target:{tabId:target.id,frameIds:[0]},func:loginForm,args:[origin]});
    if (!result?.result || !result.documentId) return fail("Geen eenduidig, leeg en veilig inlogformulier gevonden.");
    documentId = result.documentId;
    if (target.documentId && target.documentId !== documentId) return fail("De pagina is veranderd.");
    }
  }
  const nonce = crypto.randomUUID();
  let bridge, compact=false;
  if(mode !== "sync" && chrome.windows?.create){
    let win;
    try{win=await chrome.windows.create({url:"about:blank",type:"popup",width:490,height:720,focused:true});bridge=win.tabs?.[0]||(await chrome.tabs.query({windowId:win.id}))[0];compact=bridge?.id!=null;}catch{}
    if(!compact&&win?.id!=null)await chrome.windows.remove(win.id).catch(()=>{});
  }
  if(bridge?.id==null)bridge=await chrome.tabs.create({url:"about:blank",active:true});
  const req = {mode,origin,documentId,targetTab:target?.id??null,targetWindow:target?.windowId??null,compact,bridgeTab:bridge.id,expires:Date.now()+TTL};
  await chrome.storage.session.set({[pendingPrefix+nonce]:req});
  try { await chrome.tabs.update(bridge.id,{url:ADMIN+BRIDGE+"#"+new URLSearchParams({extension:chrome.runtime.id,nonce})}); }
  catch { await chrome.storage.session.remove(pendingPrefix+nonce); throw new Error("Harkas Admin openen mislukt."); }
  return {ok:true};
}
async function disableRecognition() {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const ids = scripts.filter(s=>s.id.startsWith(prefix)).map(s=>s.id);
  if (ids.length) await chrome.scripting.unregisterContentScripts({ids});
  const required = chrome.runtime.getManifest().host_permissions || [];
  const origins = ((await chrome.permissions.getAll()).origins || []).filter(p=>!required.includes(p));
  if (origins.length) await chrome.permissions.remove({origins});
  await chrome.storage.local.remove(enabledKey);
}
async function enableRecognition() {
  const origins = await known();
  const patterns = [...new Set(origins.map(hostPattern).filter(Boolean))];
  const allowed = [];
  for (const p of patterns) if (await chrome.permissions.contains({origins:[p]})) allowed.push(p);
  const existing = await chrome.scripting.getRegisteredContentScripts();
  const ids = existing.filter(s=>s.id.startsWith(prefix)).map(s=>s.id);
  const current=existing.find(x=>x.id===prefix+"sites");
  const unchanged=ids.length===1 && current && allowed.length===current.matches?.length &&
    allowed.every(p=>current.matches.includes(p));
  if(!unchanged){
    if(ids.length)await chrome.scripting.unregisterContentScripts({ids});
    if(allowed.length)await chrome.scripting.registerContentScripts([{id:prefix+"sites",matches:allowed,js:["hint.js"],runAt:"document_idle",allFrames:false,persistAcrossSessions:true}]);
  }
  await chrome.storage.local.set({[enabledKey]:true});
  return {ok:true,count:allowed.length};
}
function validOrigins(origins){return Array.isArray(origins)&&origins.length<=1000&&origins.every(x=>typeof x==="string"&&originOf(x)===x);}
async function updateOrigins(origins){
  if(!validOrigins(origins))return fail("Ongeldige domeinlijst.");
  const previous=await known();
  const scripts=await chrome.scripting.getRegisteredContentScripts();
  const active=!!(await chrome.storage.local.get(enabledKey))[enabledKey]||scripts.some(s=>s.id.startsWith(prefix));
  const next=[...new Set(origins)];
  const wanted=new Set(next.map(hostPattern).filter(Boolean));
  const required=new Set(chrome.runtime.getManifest().host_permissions||[]);
  const granted=new Set((await chrome.permissions.getAll()).origins||[]);
  const stale=[...new Set(previous.map(hostPattern).filter(Boolean))].filter(p=>!wanted.has(p)&&!required.has(p)&&granted.has(p));
  await chrome.storage.local.set({[knownKey]:next});
  if(stale.length)await chrome.permissions.remove({origins:stale});
  if(active)await enableRecognition();
  return {ok:true};
}
async function status(){
  const origins=await known();
  const patterns=[...new Set(origins.map(hostPattern).filter(Boolean))];
  const allowed=[];
  for(const p of patterns)if(await chrome.permissions.contains({origins:[p]}))allowed.push(p);
  const active=new Set((await chrome.scripting.getRegisteredContentScripts()).filter(s=>s.id.startsWith(prefix)).flatMap(s=>s.matches||[]).filter(p=>allowed.includes(p)));
  return {ok:true,origins,activeCount:active.size,missingPatterns:patterns.filter(p=>!allowed.includes(p))};
}
function trustedAdminVault(sender){
  try{const u=new URL(sender.url);return sender.tab?.id!=null&&sender.frameId===0&&sender.origin===ADMIN&&u.origin===ADMIN&&u.pathname==="/admin/wachtwoorden";}catch{return false;}
}
const internalPage = sender => sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL("popup.html");
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  (async()=>{
    if (internalPage(sender)) {
      if (msg.type === "sync") return start("sync",null);
      if (msg.type === "fill" || msg.type === "save") {
        const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
        return start(msg.type,tab);
      }
      if (msg.type === "status") return serialized(status);
      if (msg.type === "enable") return serialized(enableRecognition);
      if (msg.type === "forget") return serialized(async()=>{
        await disableRecognition(); await chrome.storage.local.remove(knownKey);
        const all = await chrome.storage.session.get(null);
        await chrome.storage.session.remove(Object.keys(all).filter(k=>k.startsWith(pendingPrefix)));
        return {ok:true};
      });
    }
    if (sender.id === chrome.runtime.id && sender.tab?.id != null && sender.frameId === 0 && sender.documentId) {
      const origin = originOf(sender.url);
      if (!origin || sender.origin !== origin || !(await known()).includes(origin) ||
        !(await chrome.permissions.contains({origins:[hostPattern(origin) || "https://invalid.invalid/*"]}))) return fail("Herkenning niet actief.");
      if (msg.type === "recognized") return {ok:true};
      if (msg.type === "hintFill") return start("fill",{id:sender.tab.id,url:sender.url,documentId:sender.documentId,windowId:sender.tab.windowId});
    }
    return fail("Onbekend verzoek.");
  })().then(reply,()=>reply(fail("Actie mislukt. Open de extensie opnieuw.")));
  return true;
});
chrome.runtime.onMessageExternal.addListener((msg,sender,reply)=>{
  (async()=>{
    if(msg?.type==="adminSync"){
      if(!trustedAdminVault(sender)||!validOrigins(msg.origins))return fail("Ongeldige synchronisatie.");
      return serialized(async()=>{
        if(!Array.isArray((await chrome.storage.local.get(knownKey))[knownKey]))return fail("Koppel de extensie eerst.");
        return updateOrigins(msg.origins);
      });
    }
    const r = await pending(msg?.nonce);
    if (!isBridge(sender,r)) return fail("Ongeldige of verlopen koppeling.");
    if (msg.type === "hello") return {ok:true,mode:r.mode,origin:r.origin,compact:!!r.compact};
    if (msg.type === "cancel") { await chrome.storage.session.remove(pendingPrefix+msg.nonce); return {ok:true}; }
    if (inflight.has(msg.nonce)) return fail("Verzoek al verwerkt.");
    inflight.add(msg.nonce);
    try {
      if (!(await pending(msg.nonce))) return fail("Verzoek verlopen.");
      if (msg.type === "syncResult" && r.mode === "sync") {
        if (!Array.isArray(msg.origins) || msg.origins.length > 1000 || msg.origins.some(x=>originOf(x)!==x)) return fail("Ongeldige domeinlijst.");
        await chrome.storage.session.remove(pendingPrefix+msg.nonce);
        return serialized(()=>updateOrigins(msg.origins));
      }
      if(msg.type==="saveResult"&&r.mode==="save"&&msg.origin===r.origin){
        await chrome.storage.session.remove(pendingPrefix+msg.nonce);
        return serialized(async()=>updateOrigins([...new Set([...(await known()),r.origin])]));
      }
      if (msg.type !== "fillResult" || !canFill(r,msg)) return fail("Account past niet bij de website.");
      await chrome.storage.session.remove(pendingPrefix+msg.nonce);
      const [result] = await chrome.scripting.executeScript({target:{tabId:r.targetTab,documentIds:[r.documentId]},func:loginForm,args:[r.origin,{username:msg.username,password:msg.password}]});
      if (!result?.result) return fail("Inlogpagina veranderd, formulier niet veilig of al ingevuld.");
      await chrome.tabs.update(r.targetTab,{active:true});
      if(r.targetWindow!=null)await chrome.windows.update(r.targetWindow,{focused:true}).catch(()=>{});
      return {ok:true};
    } finally { inflight.delete(msg.nonce); }
  })().then(reply,()=>reply(fail("Verzoek gestopt. Open de inlogpagina opnieuw.")));
  return true;
});
chrome.storage.local.setAccessLevel?.({accessLevel:"TRUSTED_CONTEXTS"}).catch(()=>{});
chrome.storage.session.setAccessLevel?.({accessLevel:"TRUSTED_CONTEXTS"}).catch(()=>{});

async function restoreRecognition(){
  const state=await chrome.storage.local.get([knownKey,enabledKey]);
  if(!Array.isArray(state[knownKey]))return;
  // The old extension may not have the explicit enabled flag. Restore only
  // the existing linked origins for which the browser already granted access.
  const patterns=[...new Set((await known()).map(hostPattern).filter(Boolean))];
  let granted=false;
  for(const p of patterns){if(await chrome.permissions.contains({origins:[p]})){granted=true;break;}}
  if(state[enabledKey]||granted)await enableRecognition();
}
chrome.runtime.onInstalled.addListener(()=>{void serialized(restoreRecognition).catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{void serialized(restoreRecognition).catch(()=>{});});
