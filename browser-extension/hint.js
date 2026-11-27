(() => {
  if (window.top !== window) return;
  let host = null, checking = false;
  async function check() {
    if (checking) return;
    const pw = [...document.querySelectorAll('input[type="password"]')].filter(p=>p.getClientRects().length && !p.disabled && !p.readOnly && !p.value && !p.autocomplete.includes("new-password"));
    if (pw.length !== 1 || !pw[0].form) { host?.remove(); host=null; return; }
    if (host?.isConnected) return;
    checking=true;
    try {
      const status = await chrome.runtime.sendMessage({type:"recognized"});
      if (!status?.ok) return;
      host=document.createElement("div");
      host.style.cssText="position:fixed;right:20px;bottom:20px;z-index:2147483647";
      const shadow=host.attachShadow({mode:"closed"});
      const b=document.createElement("button");
      b.textContent="Harkas · Gegevens invullen";
      b.style.cssText="border:1px solid #29445d;border-radius:12px;background:#102a43;color:white;font:600 14px system-ui;padding:12px 16px;box-shadow:0 6px 25px #0003;cursor:pointer";
      b.addEventListener("click",async event=>{
        if (!event.isTrusted) return;
        b.disabled=true;
        try { const r=await chrome.runtime.sendMessage({type:"hintFill"}); if(!r?.ok) b.textContent=r?.message||"Open de extensie"; }
        catch { b.textContent="Open de extensie"; }
        finally { b.disabled=false; }
      });
      shadow.append(b);document.documentElement.append(host);
    } finally { checking=false; }
  }
  check().catch(()=>{});
  let timer;
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>check().catch(()=>{}),250)});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["type","disabled","hidden","style","class"]});
  window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
})();
