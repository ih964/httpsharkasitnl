import { Pool } from "pg";
import { createRemoteJWKSet, jwtVerify } from "jose";

const SUPABASE_URL = process.env.HARKAS_SUPABASE_URL || "https://uqkrxzlkvjdmebsbdrmb.supabase.co";
const SUPABASE_DSN = process.env.HARKAS_SUPABASE_DSN;
const NEON_DSN = process.env.HARKAS_NEON_DSN;
const JWKS = createRemoteJWKSet(new URL(process.env.HARKAS_SUPABASE_JWKS_URL || `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

const TABLES = new Set([
  "activity_logs","assessment_audit_events","assessment_leads","assessment_proposal_drafts",
  "assessment_runs","assessment_submission_rate_limits","customers","domains","invoice_counters",
  "invoice_items","invoices","keep_alive","linkedin_audit_log","linkedin_connections",
  "linkedin_internal_config","linkedin_organization_analytics","linkedin_organizations",
  "linkedin_post_queue","linkedin_post_snapshots","linkedin_profile_snapshots",
  "linkedin_repost_candidates","managed_users","password_vault","settings","time_entries",
  "user_module_access","user_roles"
]);

const RELATIONS: Record<string, Record<string,{table:string; local:string; remote:string}>> = {
  invoices: {
    customers: { table:"customers", local:"customer_id", remote:"id" },
  },
  time_entries: {
    invoices: { table:"invoices", local:"invoice_id", remote:"id" },
  },
};

let supPool: Pool | null = null;
let neonPool: Pool | null = null;

function poolFor(kind:"supabase"|"neon") {
  if (kind === "supabase") {
    if (!SUPABASE_DSN) throw new Error("HARKAS_SUPABASE_DSN missing");
    supPool ??= new Pool({ connectionString: SUPABASE_DSN, max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 4000 });
    return supPool;
  }
  if (!NEON_DSN) throw new Error("HARKAS_NEON_DSN missing");
  neonPool ??= new Pool({ connectionString: NEON_DSN, max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 4000 });
  return neonPool;
}

async function dbRole(kind:"supabase"|"neon") {
  const pool=poolFor(kind);
  const r=await pool.query("select role from public.harkas_resilience_state where singleton=true");
  return r.rows[0]?.role as string|undefined;
}

async function choosePrimary() {
  try {
    if (await dbRole("supabase") === "primary") return "supabase" as const;
  } catch {}
  try {
    if (await dbRole("neon") === "primary") return "neon" as const;
  } catch {}
  throw new Error("No fenced PRIMARY database is reachable");
}

async function authenticate(req:VercelRequest, kind:"supabase"|"neon") {
  const header=String(req.headers.authorization||"");
  if (!header.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token=header.slice(7);

  if (kind === "supabase") {
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
      headers:{
        apikey: process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        authorization:`Bearer ${token}`,
      },
    });
    if (!r.ok) throw new Error("Unauthorized");
    return await r.json() as {id:string};
  }

  const verified=await jwtVerify(token,JWKS,{issuer:`${SUPABASE_URL}/auth/v1`});
  const sub=String(verified.payload.sub||"");
  if (!sub) throw new Error("Unauthorized");
  return {id:sub};
}

async function authorize(pool:Pool,userId:string) {
  const r=await pool.query(`
    select
      exists(select 1 from public.user_roles where user_id=$1 and role='admin') as is_admin,
      exists(select 1 from public.user_module_access where user_id=$1) as has_module
  `,[userId]);
  if (!r.rows[0]?.is_admin && !r.rows[0]?.has_module) throw new Error("Forbidden");
}

function ident(v:string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) throw new Error("Invalid identifier");
  return '"' + v + '"';
}

function parseSelect(table:string, columns:string, alias="t"): {sql:string; params:unknown[]} {
  const text=(columns||"*").trim();
  if (text==="*" || text==="") return {sql:`${alias}.*`,params:[]};
  const parts:string[]=[]; let depth=0; let start=0;
  for(let i=0;i<text.length;i++){ const ch=text[i]; if(ch==="(") depth++; else if(ch===")") depth--; else if(ch===","&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;} }
  parts.push(text.slice(start).trim());

  const out:string[]=[];
  for(const part of parts){
    const rel=part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/s);
    if(rel){
      const name=rel[1], inner=rel[2], cfg=RELATIONS[table]?.[name];
      if(!cfg) throw new Error(`Unsupported relation ${table}.${name}`);
      const parsed=parseSelect(cfg.table,inner,"r");
      out.push(`(select to_jsonb(r) from (select ${parsed.sql} from public.${ident(cfg.table)} r where r.${ident(cfg.remote)}=${alias}.${ident(cfg.local)} limit 1) r) as ${ident(name)}`);
      continue;
    }
    const aliasMatch=part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/);
    if(aliasMatch) out.push(`${alias}.${ident(aliasMatch[2])} as ${ident(aliasMatch[1])}`);
    else out.push(`${alias}.${ident(part)}`);
  }
  return {sql:out.join(","),params:[]};
}

type Filter={op:string;column:string;value:unknown};

function buildWhere(filters:Filter[], start=1){
  const sqls:string[]=[]; const params:unknown[]=[]; let n=start;
  for(const f of filters){
    const col=f.column.includes(".") ? f.column.split(".").map(ident).join(".") : ident(f.column);
    if(f.op==="is") { sqls.push(`${col} IS ${f.value===null?"NULL":String(f.value).toUpperCase()}`); continue; }
    if(f.op==="in") {
      const values=Array.isArray(f.value)?f.value:[]; if(!values.length){sqls.push("false");continue;}
      sqls.push(`${col} IN (${values.map(()=>`$${n++}`).join(",")})`); params.push(...values); continue;
    }
    const op={eq:"=",neq:"<>",gt:">",gte:">=",lt:"<",lte:"<="}[f.op as "eq"];
    if(!op) throw new Error(`Unsupported filter ${f.op}`);
    sqls.push(`${col} ${op} $${n++}`); params.push(f.value);
  }
  return {where:sqls.length?` where ${sqls.join(" and ")}`:"",params,next:n};
}

async function execute(kind:"supabase"|"neon", body:any) {
  if(!TABLES.has(body.table||"") && body.action!=="rpc") throw new Error("Table not allowed");
  const pool=poolFor(kind);

  if(body.action==="rpc"){
    if(body.fn!=="generate_invoice_number") throw new Error("RPC not allowed");
    const year=Number(body.args?.p_year);
    const r=await pool.query("select public.generate_invoice_number($1) as value",[year]);
    return {data:r.rows[0]?.value??null,error:null};
  }

  const table=body.table as string;
  const filters=(body.filters||[]) as Filter[];
  const where=buildWhere(filters);
  const values:any[]=[...where.params];

  if(body.action==="select"){
    const parsed=parseSelect(table,body.columns||"*");
    let sql=`select ${body.head?"":parsed.sql}${body.head?"count(*) over() as __count":""} from public.${ident(table)} t${where.where}`;
    if(body.order?.length) sql += " order by "+body.order.map((o:any)=>`t.${ident(o.column)} ${o.ascending===false?"desc":"asc"}`).join(",");
    if(Number.isInteger(body.offset)) sql += ` offset ${Number(body.offset)}`;
    if(Number.isInteger(body.limit)) sql += ` limit ${Number(body.limit)}`;
    const r=await pool.query(sql,values);
    const count=body.count==="exact" ? Number(r.rows[0]?.__count||0) : null;
    if(body.head) return {data:null,count,error:null};
    const rows=r.rows.map(({__count,...row}:any)=>row);
    if(body.singleMode==="single") return {data:rows[0]??null,count,error:rows.length===1?null:{message:"JSON object requested, multiple/no rows returned"}};
    if(body.singleMode==="maybeSingle") return {data:rows[0]??null,count,error:rows.length>1?{message:"Multiple rows returned"}:null};
    return {data:rows,count,error:null};
  }

  const returning=body.returning ? parseSelect(table,body.returning).sql : "";
  if(body.action==="insert"){
    const rows=Array.isArray(body.values)?body.values:[body.values];
    if(!rows.length) return {data:[],error:null};
    const cols=Object.keys(rows[0]);
    const sql=`insert into public.${ident(table)} (${cols.map(ident).join(",")}) values ${rows.map((row:any)=>"("+cols.map(c=>`$${values.push(row[c])}`).join(",")+")").join(",")}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return {data:body.returning?r.rows:null,error:null};
  }

  if(body.action==="update"){
    const sets=Object.keys(body.values||{}).map(k=>`${ident(k)}=$${values.push(body.values[k])}`).join(",");
    const sql=`update public.${ident(table)} set ${sets}${where.where}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return {data:body.returning?r.rows:null,error:null};
  }

  if(body.action==="delete"){
    const sql=`delete from public.${ident(table)}${where.where}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return {data:body.returning?r.rows:null,error:null};
  }

  if(body.action==="upsert"){
    const rows=Array.isArray(body.values)?body.values:[body.values];
    const cols=Object.keys(rows[0]||{}); const conflict=(body.onConflict||"id").split(",").map(ident).join(",");
    const nonConflict=cols.filter(c=>!body.onConflict?.split(",").includes(c));
    const sql=`insert into public.${ident(table)} (${cols.map(ident).join(",")}) values ${rows.map((row:any)=>"("+cols.map(c=>`$${values.push(row[c])}`).join(",")+")").join(",")} on conflict (${conflict}) do ${body.ignoreDuplicates?"nothing":"update set "+nonConflict.map(c=>`${ident(c)}=excluded.${ident(c)}`).join(",")}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return {data:body.returning?r.rows:null,error:null};
  }

  throw new Error("Unsupported action");
}

export default async function handler(req:any,res:any){
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  try{
    const primary=await choosePrimary();
    const user=await authenticate(req,primary);
    const pool=poolFor(primary);
    await authorize(pool,user.id);
    const result=await execute(primary,req.body);
    res.setHeader("Cache-Control","no-store");
    res.status(200).json({primary,...result});
  }catch(error:any){
    const message=error?.message||"HA database request failed";
    const status=/Unauthorized/i.test(message)?401:/Forbidden/i.test(message)?403:503;
    res.status(status).json({error:message});
  }
}
