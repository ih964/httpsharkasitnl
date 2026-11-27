import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import { originOf,isBridge,canFill,hostPattern,ADMIN,BRIDGE } from "../browser-extension/security.js";
import { loginForm } from "../browser-extension/form.js";
const example="https://example.com";
test("exact HTTPS origin only",()=>{
  assert.equal(originOf("example.com/wp-admin"),example);
  assert.equal(originOf("https://EXAMPLE.com/login"),example);
  assert.notEqual(originOf("https://example.com.evil.net"),example);
  assert.notEqual(originOf("https://www.example.com"),example);
  assert.equal(originOf("http://example.com"),null);
  assert.equal(originOf("https://example.com@evil.net"),null);
  assert.equal(originOf("javascript:alert(1)"),null);
  assert.equal(originOf(null),null);
  assert.equal(hostPattern(example),"https://example.com/*");
  assert.equal(hostPattern("https://example.com:8443"),null);
});
test("sender bound to exact first-party top frame, tab and lifetime",()=>{
 const req={bridgeTab:42,expires:1000};
 const sender={url:ADMIN+BRIDGE,origin:ADMIN,frameId:0,tab:{id:42}};
 assert.equal(isBridge(sender,req,900),true);
 assert.equal(isBridge({...sender,origin:"https://evil.net"},req,900),false);
 assert.equal(isBridge({...sender,url:ADMIN+"/admin"},req,900),false);
 assert.equal(isBridge({...sender,tab:{id:43}},req,900),false);
 assert.equal(isBridge({...sender,frameId:1},req,900),false);
 assert.equal(isBridge(sender,req,1000),false);
});
test("fill requests cannot cross origins or types",()=>{
 const r={mode:"fill",origin:example};
 const msg={origin:example,username:"demo@example.com",password:"dummy-password"};
 assert.equal(canFill(r,msg),true);
 assert.equal(canFill(r,{...msg,origin:"https://example.com.evil.net"}),false);
 assert.equal(canFill({...r,mode:"sync"},msg),false);
 assert.equal(canFill(r,{...msg,password:""}),false);
});
test("stable extension identity pinned by admin bridge",()=>{
 const m=JSON.parse(fs.readFileSync(new URL("../browser-extension/manifest.json",import.meta.url)));
 const id=crypto.createHash("sha256").update(Buffer.from(m.key,"base64")).digest("hex").slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
 const source=fs.readFileSync(new URL("../src/pages/admin/AdminPasswordExtension.tsx",import.meta.url),"utf8");
 assert.ok(source.includes('extension !== "'+id+'"'));
 assert.deepEqual(m.externally_connectable.matches,[ADMIN+"/*"]);
 assert.ok(!m.host_permissions);
 assert.equal(m.incognito,"not_allowed");
});
class MockInput {
 constructor(type,name,autocomplete=""){this.type=type;this.name=name;this.id=name;this.autocomplete=autocomplete;this._value="";this.events=[]}
 get value(){return this._value}set value(v){this._value=v}
 getClientRects(){return [1]}closest(){return null}
 dispatchEvent(e){this.events.push(e.type)}
}
function setup({origin=example,action=example+"/login",passCount=1,newPassword=false,initialUser="",initialPass="",crossButton=false,usernameCount=1}={}){
 const pw=new MockInput("password","password",newPassword?"section-register new-password":"current-password");
 pw.value=initialPass;
 const user=new MockInput("email","email","username");user.value=initialUser;
 const passwords=[pw,...(passCount===2?[new MockInput("password","confirm")]:[])];
 const users=[user,...(usernameCount===2?[new MockInput("email","email2","username")]:[])];
 const form={action,elements:[...users,...passwords],querySelectorAll(){return crossButton?[{getAttribute(){return "https://evil.net"}}]:[]}};
 pw.form=form;for(const p of passwords)p.form=form;
 globalThis.HTMLInputElement=MockInput;
 globalThis.window={};window.top=window;
 globalThis.location={origin,href:origin+"/login",protocol:"https:"};
 globalThis.document={querySelectorAll(){return passwords}};
 globalThis.getComputedStyle=()=>({visibility:"visible"});
 return {pw,user};
}
const credentials={username:"demo@example.com",password:"fictional-password"};
test("manual fill populates only selected login; does not submit",()=>{
 const {pw,user}=setup();
 assert.equal(loginForm(example),true);assert.equal(pw.value,"");
 assert.equal(loginForm(example,credentials),true);
 assert.equal(user.value,credentials.username);assert.equal(pw.value,credentials.password);
 assert.deepEqual(pw.events,["input","change"]);
});
test("reject navigation, cross-origin action, multi-password, registration and already filled fields",()=>{
 for(const options of [{origin:"https://evil.net"},{action:"https://evil.net/login"},{crossButton:true},{passCount:2},{newPassword:true},{initialUser:"other"},{initialPass:"filled"},{usernameCount:2}]){
   const {pw}=setup(options);
   assert.equal(loginForm(example,credentials),false,JSON.stringify(options));
   assert.notEqual(pw.value,credentials.password);
 }
});
