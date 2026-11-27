import { generatePassword } from "./generator.js";
import { hostPattern } from "./security.js";
const $=id=>document.getElementById(id);
let patterns=[], missing=[];
let generation="";
function show(text){$("status").textContent=text;}
async function call(type){const r=await chrome.runtime.sendMessage({type});if(!r?.ok) throw new Error(r?.message||"Actie mislukt");return r;}
async function refresh(){const r=await call("status");patterns=[...new Set(r.origins.map(hostPattern).filter(Boolean))];missing=r.missingPatterns||patterns;$("enable").disabled=!patterns.length;show(r.origins.length+" gekoppelde HTTPS-websites · "+(r.activeCount??0)+" actief");}
async function act(fn){try{await fn()}catch(e){show(e.message||"Actie mislukt");}}
$("fill").onclick=()=>act(async()=>{await call("fill");window.close()});
$("save").onclick=()=>act(async()=>{await call("save");window.close()});
$("generate").onclick=()=>{generation=generatePassword(Number($("length").value));$("generated").value=generation;$("generated").type="password";$("reveal").textContent="Tonen";$("copy").disabled=$("reveal").disabled=false;};
$("reveal").onclick=()=>{const show=$("generated").type==="password";$("generated").type=show?"text":"password";$("reveal").textContent=show?"Verbergen":"Tonen";};
$("copy").onclick=()=>act(async()=>{if(generation){await navigator.clipboard.writeText(generation);show("Gekopieerd. Wis het klembord na gebruik.");}});
window.addEventListener("pagehide",()=>{generation="";$("generated").value="";});
$("sync").onclick=()=>act(async()=>{await call("sync");window.close()});
$("enable").onclick=()=>act(async()=>{
  if(!patterns.length)return;
  const granted=!missing.length||await chrome.permissions.request({origins:missing});
  if(!granted){show("Geen toestemming verleend.");return}
  const r=await call("enable");show("Herkenning actief voor "+r.count+" websites. Herlaad de inlogpagina.");
});
$("forget").onclick=()=>act(async()=>{await call("forget");await refresh()});
refresh().catch(()=>show("Extensie niet beschikbaar."));
