import json, tempfile, pathlib, shutil, sys, os, time
from playwright.sync_api import sync_playwright, expect
from pathlib import Path

ROOT=Path(os.environ["TEMP"])/"harkas-password-extension-src"
TARGET="https://login.example.test"
ADMIN="https://www.harkasit.nl/admin/password-extension"
LOGIN="""<!doctype html><html><body><form action="/login" method="post"><input name="email" type="email" autocomplete="username"><input name="password" type="password" autocomplete="current-password"><button>Inloggen</button></form></body></html>"""
BRIDGE="""<!doctype html><html><body><p id="status">waiting</p><button id="confirm">Confirm test account</button><script>
const params=new URLSearchParams(location.hash.slice(1));
function send(message){return new Promise((resolve,reject)=>chrome.runtime.sendMessage(params.get("extension"),{...message,nonce:params.get("nonce")},r=>{if(chrome.runtime.lastError||!r)reject(Error(chrome.runtime.lastError?.message||"empty"));else resolve(r)}));}
let request;send({type:"hello"}).then(r=>{request=r;document.querySelector("#status").textContent=r.ok?"ready:"+r.mode:r.message}).catch(e=>document.querySelector("#status").textContent=e.message);
document.querySelector("#confirm").onclick=async()=>{const message=request.mode==="sync"?{type:"syncResult",origins:["https://login.example.test"]}:{type:"fillResult",origin:request.origin,username:"demo@example.test",password:"dummy-test-password"};
const r=await send(message);document.querySelector("#status").textContent=r.ok?"done":r.message;
const replay=await send(message);document.body.dataset.replay=String(replay.ok);
};
</script></body></html>"""
def test_browser(p, label, executable=None):
    with tempfile.TemporaryDirectory(prefix="harkas-ext-test-") as tmp:
        tmp=Path(tmp); ext=tmp/"extension"; shutil.copytree(ROOT/"browser-extension",ext)
        manifest=json.loads((ext/"manifest.json").read_text(encoding="utf-8"))
        # Only in this isolated test profile: grant the single synthetic test site
        # statically so Playwright can exercise the extension without a native prompt.
        manifest["host_permissions"]=[TARGET+"/*"]
        (ext/"manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
        args=["--disable-extensions-except="+str(ext),"--load-extension="+str(ext),"--no-first-run","--disable-background-networking"]
        kwargs={"executable_path":executable} if executable else {"channel":"chromium"}
        ctx=p.chromium.launch_persistent_context(str(tmp/"profile"),headless=True,args=args,timeout=20000,**kwargs)
        try:
            def route(r):
                url=r.request.url
                if url.startswith(TARGET+"/"):
                    return r.fulfill(status=200,content_type="text/html",body=LOGIN)
                if url.startswith(ADMIN):
                    return r.fulfill(status=200,content_type="text/html",body=BRIDGE)
                return r.abort()
            ctx.route("https://**/*",route)
            ctx.route("http://**/*",lambda r:r.abort())
            worker=ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker",timeout=10000)
            eid=worker.url.split("/")[2]
            popup=ctx.new_page();popup.goto("chrome-extension://"+eid+"/popup.html")
            result=popup.evaluate("chrome.runtime.sendMessage({type:'sync'})")
            assert result.get("ok"), "sync failed: "+str(result)
            bridge=None
            for _ in range(30):
                popup.wait_for_timeout(250)
                bridge=next((x for x in ctx.pages if x.url.startswith(ADMIN)),None)
                if bridge:break
            assert bridge, "sync bridge did not open: "+str([x.url for x in ctx.pages])
            bridge.locator("#status").wait_for()
            bridge.wait_for_timeout(1000);print("sync status",bridge.locator("#status").inner_text(),flush=True)
            bridge.wait_for_function("document.querySelector('#status').textContent === 'ready:sync'",timeout=8000)
            bridge.locator("#confirm").click()
            bridge.wait_for_timeout(1000);print("sync after confirm",bridge.locator("#status").inner_text(),flush=True)
            bridge.wait_for_function("document.querySelector('#status').textContent === 'done'",timeout=8000)
            bridge.wait_for_function("document.body.dataset.replay === 'false'",timeout=8000)
            # register content script after sync (test-only required host permission).
            popup=ctx.new_page();popup.goto("chrome-extension://"+eid+"/popup.html")
            popup.wait_for_timeout(500);print("popup status",popup.locator("#status").inner_text(),flush=True)
            expect(popup.locator("#enable")).to_be_enabled(timeout=8000)
            result=popup.evaluate("chrome.runtime.sendMessage({type:'enable'})")
            assert result.get("ok") and result.get("count")==1, str(result)
            print("registered",result,flush=True)
            target=ctx.new_page();target.goto(TARGET+"/login")
            # Closed shadow root: click the visible overlay by its host geometry.
            target.wait_for_function("Array.from(document.documentElement.children).some(e=>e.style.zIndex==='2147483647')",timeout=8000)
            host=target.locator("html > div").last
            host.click()
            fillbridge=None
            for _ in range(30):
                target.wait_for_timeout(250)
                candidates=[x for x in ctx.pages if x.url.startswith(ADMIN) and x!=bridge]
                if candidates:fillbridge=candidates[-1];break
            assert fillbridge, "fill bridge did not open: "+str([x.url for x in ctx.pages])
            fillbridge.wait_for_timeout(1000);print("fill status",fillbridge.locator("#status").inner_text(),flush=True)
            fillbridge.wait_for_function("document.querySelector('#status').textContent === 'ready:fill'",timeout=8000)
            fillbridge.locator("#confirm").click()
            fillbridge.wait_for_timeout(1000);print("fill after confirm",fillbridge.locator("#status").inner_text(),flush=True)
            fillbridge.wait_for_function("document.querySelector('#status').textContent === 'done'",timeout=8000)
            fillbridge.wait_for_function("document.body.dataset.replay === 'false'",timeout=8000)
            assert target.locator("input[name=email]").input_value()=="demo@example.test"
            assert target.locator("input[name=password]").input_value()=="dummy-test-password"
            assert target.url==TARGET+"/login"
            print(label+": sync, automatic hint, selected-account fill, and replay rejection PASS",flush=True)
        finally:
            ctx.close()
with sync_playwright() as p:
    paths=[("Playwright Chromium",None)]
    for name,location in [("Chrome",Path(os.environ["ProgramFiles"])/"Google/Chrome/Application/chrome.exe"),("Edge",Path(os.environ["ProgramFiles(x86)"])/"Microsoft/Edge/Application/msedge.exe"),("Opera",Path(os.environ["LOCALAPPDATA"])/"Programs/Opera/opera.exe")]:
        if location.exists(): paths.append((name,str(location)))
    results=[]
    for label,path in paths:
        try:test_browser(p,label,path);results.append((label,True))
        except Exception as exc:
            import traceback;traceback.print_exc();print(label+": NOT VERIFIED: "+str(exc).splitlines()[0],flush=True);results.append((label,False))
    print("RESULTS",json.dumps(results),flush=True)
    sys.exit(0 if all(x[1] for x in results) else 1)
