import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HARKAS_PLAYWRIGHT_PACKAGE || import.meta.url)("playwright");
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "harkas-extension-app-"));
const extension = path.join(dir, "extension");
await fs.cp(path.join(root,"browser-extension"), extension,{recursive:true});
const admin = "https://www.harkasit.nl";
const auth = "https://harkas-fixture.supabase.example.test";
const target = "https://login.example.test";
const uid = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000002";
const username = "demo@example.test";
const password = "fictional-app-test-password";
const now = Math.floor(Date.now()/1000);
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
const user = {id:uid,aud:"authenticated",role:"authenticated",email:"admin@example.test",app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:new Date().toISOString()};
const session = {access_token:b64({alg:"HS256",typ:"JWT"})+"."+b64({sub:uid,aud:"authenticated",role:"authenticated",iat:now,exp:now+3600})+".fixture",refresh_token:"synthetic-refresh",token_type:"bearer",expires_in:3600,expires_at:now+3600,user};
const manifest=JSON.parse(await fs.readFile(path.join(extension,"manifest.json"),"utf8"));
manifest.host_permissions=[target+"/*"];
await fs.writeFile(path.join(extension,"manifest.json"),JSON.stringify(manifest));
const ctx = await chromium.launchPersistentContext(path.join(dir,"profile"),{
  executablePath:path.join(process.env["ProgramFiles(x86)"],"Microsoft","Edge","Application","msedge.exe"),
  headless:true,args:["--disable-extensions-except="+extension,"--load-extension="+extension,"--no-first-run","--disable-background-networking"]
});
let decryptCalls=0;
let metadataCalls=0;
const contentType=f=>({".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".html":"text/html",".json":"application/json",".wasm":"application/wasm"}[path.extname(f)]||"application/octet-stream");
const json=(route,body,status=200)=>route.fulfill({status,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"*","content-type":"application/json"},body:JSON.stringify(body)});
try {
 await ctx.route("https://**/*",async route=>{
   const u=new URL(route.request().url());
   if(route.request().method()==="OPTIONS") return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"*"}});
   if(u.origin===target) return route.fulfill({contentType:"text/html",body:'<!doctype html><html><body><form action="/login" method="post"><input name="email" type="email" autocomplete="username"><input name="password" type="password" autocomplete="current-password"><button>Inloggen</button></form></body></html>'});
   if(u.origin===auth){
     if(u.pathname==="/auth/v1/token")return json(route,session);
     if(u.pathname==="/auth/v1/user")return json(route,user);
     if(u.pathname==="/rest/v1/user_roles")return json(route,[{role:"admin"}]);
     if(u.pathname==="/rest/v1/user_module_access")return json(route,[]);
     if(u.pathname==="/functions/v1/decrypt-password"){
       const p=route.request().postDataJSON();
       if(p.id!==id||p.expected_origin!==target)return json(route,{error:"Origin mismatch"},403);
       decryptCalls++;
       return json(route,{origin:target,username,password});
     }
     return json(route,[]);
   }
   if(u.origin===admin){
     if(u.pathname==="/api/ha-db"){
       const b=route.request().postDataJSON();
       if(b.table==="password_vault"){
         metadataCalls++;
         assert.equal(b.columns,"id,title,website_url,username");
         return json(route,{data:[{id,title:"Fictief demo-account",website_url:target+"/login",username},{id:"other",title:"Niet passend account",website_url:"https://other.example.test",username:"other@example.test"}],error:null,count:2});
       }
       return json(route,{data:[],error:null,count:0});
     }
     let f=u.pathname.startsWith("/assets/")||u.pathname.includes(".")?path.join(dist,decodeURIComponent(u.pathname).replace(/^\//,"")):path.join(dist,"index.html");
     if(!f.startsWith(dist+path.sep))return route.abort();
     try{return route.fulfill({contentType:contentType(f),body:await fs.readFile(f)})}catch{return route.fulfill({status:404,body:"not found"})}
   }
   return route.abort();
 });
 await ctx.route("http://**/*",r=>r.abort());
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker",{timeout:15000});
 const eid=worker.url().split("/")[2];
 const popup=await ctx.newPage();
 await popup.goto("chrome-extension://"+eid+"/popup.html");
 async function openBridge(type){
   const pending=ctx.waitForEvent("page",{timeout:15000});
   const r=await popup.evaluate(type=>chrome.runtime.sendMessage({type}),type);
   assert.equal(r.ok,true);
   const p=await pending;await p.waitForURL(admin+"/admin/password-extension**");return p;
 }
 let bridge=await openBridge("sync");
 await bridge.getByText("Log eerst in via Harkas Admin en open daarna de extensie opnieuw.").waitFor({timeout:12000});
 assert.equal(metadataCalls,0);
 await bridge.getByRole("button",{name:"Annuleren"}).click();
 await bridge.close();
 console.log("PASS unauthenticated bridge refuses vault");
 const login=await ctx.newPage();
 await login.goto(admin+"/admin/login");
 await login.getByLabel("E-mail",{exact:true}).fill(user.email);
 await login.getByLabel("Wachtwoord",{exact:true}).fill("synthetic-admin-login");
 await login.getByRole("button",{name:"Inloggen",exact:true}).click();
 await login.waitForURL(admin+"/admin",{timeout:15000});
 console.log("PASS actual Harkas Admin login UI with simulated Auth API");
 bridge=await openBridge("sync");
 await bridge.getByRole("button",{name:"Websiteherkenning toestaan"}).click({timeout:15000});
 await bridge.getByText(/Websites gesynchroniseerd/).waitFor({timeout:10000});
 await bridge.close();
 await popup.reload();
 await popup.getByText("2 gekoppelde HTTPS-websites").waitFor({timeout:10000});
 const registered=await popup.evaluate(()=>chrome.runtime.sendMessage({type:"enable"}));
 assert.equal(registered.count,1);
 console.log("PASS real bridge synchronizes only domain metadata");
 const p=await ctx.newPage();await p.goto(target+"/login");
 const host=p.locator('html > div').last();
 await host.waitFor({state:"visible",timeout:10000});
 const bridgePromise=ctx.waitForEvent("page",{timeout:15000});
 await host.click();
 const fill=await bridgePromise;await fill.waitForURL(admin+"/admin/password-extension**");
 await fill.getByText("Fictief demo-account",{exact:true}).waitFor({timeout:12000});
 assert.equal(await fill.getByText("Niet passend account",{exact:true}).count(),0);
 assert.equal(decryptCalls,0);
 await fill.getByRole("button",{name:"Gegevens invullen",exact:true}).click();
 await fill.getByText(/Gegevens ingevuld/).waitFor({timeout:10000});
 assert.equal(await p.locator('[name=email]').inputValue(),username);
 assert.equal(await p.locator('[name=password]').inputValue(),password);
 assert.equal(p.url(),target+"/login");
 assert.equal(decryptCalls,1);
 console.log("PASS actual built Harkas Admin bridge + Edge + synthetic vault full fill; no submit");
 console.log("PASS all app integration cases");
} finally {
 await ctx.close();
 await fs.rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:250}).catch(()=>{});
}
