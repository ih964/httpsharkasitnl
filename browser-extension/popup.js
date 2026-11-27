import { hostPattern } from "./security.js";
const $=id=>document.getElementById(id);
let patterns=[];
function show(text){$("status").textContent=text;}
async function call(type){const r=await chrome.runtime.sendMessage({type});if(!r?.ok) throw new Error(r?.message||"Actie mislukt");return r;}
async function refresh(){const r=await call("status");patterns=[...new Set(r.origins.map(hostPattern).filter(Boolean))];$("enable").disabled=!patterns.length;show(r.origins.length+" gekoppelde HTTPS-websites");}
async function act(fn){try{await fn()}catch(e){show(e.message||"Actie mislukt");}}
$("fill").onclick=()=>act(async()=>{await call("fill");window.close()});
$("sync").onclick=()=>act(async()=>{await call("sync");window.close()});
$("enable").onclick=()=>act(async()=>{
  if(!patterns.length)return;
  const granted=await chrome.permissions.request({origins:patterns});
  if(!granted){show("Geen toestemming verleend.");return}
  const r=await call("enable");show("Herkenning actief voor "+r.count+" websites. Herlaad de inlogpagina.");
});
$("forget").onclick=()=>act(async()=>{await call("forget");await refresh()});
refresh().catch(()=>show("Extensie niet beschikbaar."));
