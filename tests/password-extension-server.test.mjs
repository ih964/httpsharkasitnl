import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const secret = "synthetic-vault-key-test-only";
const userId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000002";
const origin = "https://login.example.test";
const username = "demo@example.test";
const password = "fictional-test-password";
const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(password));
const encrypted = "v1:"+Buffer.from(iv).toString("base64")+":"+Buffer.from(ciphertext).toString("base64");
let state;
let handler;
let vaultReads=0;
globalThis.Deno = {env:{get:name=>({VAULT_ENCRYPTION_KEY:secret,SUPABASE_URL:"https://supabase.example.test",SUPABASE_ANON_KEY:"test-anon",SUPABASE_SERVICE_ROLE_KEY:"test-role"})[name]},serve:fn=>{handler=fn}};
globalThis.createMockClient = (_url,key) => ({
  auth:{getClaims:async token=>({data: token==="test-token" ? {claims:{sub:userId}} : null,error:token==="test-token"?null:new Error("unauthorized")})},
  from(table){
    assert.equal(key,"test-role");
    const filters={};
    const q={select(columns){q.columns=columns;return q},eq(k,v){filters[k]=v;return q},
      async maybeSingle(){
        if(table==="user_roles"){assert.equal(filters.user_id,userId);return {data:state.admin?{role:"admin"}:null}}
        assert.equal(table,"password_vault");vaultReads++;
        assert.equal(filters.id,id);
        return {data:state.row};
      },
      then(resolve,reject){
        assert.equal(table,"user_module_access");
        assert.equal(filters.user_id,userId);
        return Promise.resolve({data:state.module?[{module_key:"passwords"}]:[]}).then(resolve,reject);
      }
    };
    return q;
  }
});
const raw=await readFile(new URL("../supabase/functions/decrypt-password/index.ts",import.meta.url),"utf8");
const source=stripTypeScriptTypes(raw.replace(/^import .*?;\s*/,"const createClient = globalThis.createMockClient;\n"),{mode:"strip"});
await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
assert.equal(typeof handler,"function");
function reset(overrides={}){
  state={admin:true,module:false,row:{encrypted_password:encrypted,website_url:origin+"/login",username},...overrides};vaultReads=0;
}
async function request(body,token="test-token"){
 const response=await handler(new Request("https://supabase.example.test/functions/v1/decrypt-password",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
}
test("anonymous and invalid sessions rejected before reading the vault",async()=>{
 reset();
 assert.equal((await request({id,expected_origin:origin},null)).status,401);
 assert.equal((await request({id,expected_origin:origin},"invalid")).status,401);
 assert.equal(vaultReads,0);
});
test("unrelated role cannot decrypt",async()=>{
 reset({admin:false,module:false});
 assert.equal((await request({id,expected_origin:origin})).status,403);
 assert.equal(vaultReads,0);
});
test("authorized admin decrypts selected exact-origin row",async()=>{
 reset();
 const r=await request({id,expected_origin:origin});
 assert.equal(r.status,200);
 assert.deepEqual(r.body,{password,origin,username});
 assert.equal(r.cache,"no-store");
});
test("passwords module access remains supported",async()=>{
 reset({admin:false,module:true});
 assert.equal((await request({id,expected_origin:origin})).status,200);
});
test("lookalike, sibling subdomain, http, invalid and changed row URL fail closed",async()=>{
 reset();
 for(const target of ["https://login.example.test.evil.test","https://www.login.example.test","http://login.example.test",null,"","https://login.example.test:444"]){
   const r=await request({id,expected_origin:target});
   assert.equal(r.status,403);
   assert.equal("password" in r.body,false);
 }
 reset({row:{encrypted_password:encrypted,website_url:"https://other.example.test",username}});
 assert.equal((await request({id,expected_origin:origin})).status,403);
});
test("original Admin password reveal retains its old response shape",async()=>{
 reset();
 const r=await request({id});
 assert.equal(r.status,200);
 assert.deepEqual(r.body,{password});
});
test("deleted entry returns not found",async()=>{
 reset({row:null});
 assert.equal((await request({id,expected_origin:origin})).status,404);
});
