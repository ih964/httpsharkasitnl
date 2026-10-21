import { Pool, type PoolClient } from "pg";
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

type Action = "select" | "insert" | "update" | "delete" | "upsert";
type Access = { is_admin: boolean; modules: string[] };
type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: any };
type Queryable = Pick<PoolClient, "query">;
const ACTIONS = new Set(["select", "insert", "update", "delete", "upsert", "rpc"]);

// The router also serves the DR database, whose application connections are
// privileged. Enforce the same module boundaries as the public-table policies
// explicitly; the presence of any unrelated module is never authorization.
// Tables without an entry (ACLs, integration credentials and internal state)
// remain admin-only. Support uses its separate RLS-protected API.
const MODULE_ACCESS: Record<string, Partial<Record<Exclude<Action, "upsert">, readonly string[]>>> = {
  customers: {
    select: ["customers", "dashboard", "invoices", "domains", "time_entries", "quotes"],
    insert: ["customers"], update: ["customers"], delete: ["customers"],
  },
  invoices: {
    select: ["invoices", "dashboard", "domains", "time_entries", "btw_overzicht"],
    insert: ["invoices", "domains", "time_entries"],
    update: ["invoices", "domains", "time_entries"], delete: ["invoices"],
  },
  invoice_items: {
    select: ["invoices"], insert: ["invoices", "domains", "time_entries"],
    update: ["invoices"], delete: ["invoices"],
  },
  invoice_counters: {
    select: ["invoices"], insert: ["invoices"], update: ["invoices"], delete: ["invoices"],
  },
  domains: {
    select: ["domains", "dashboard"], insert: ["domains"], update: ["domains"], delete: ["domains"],
  },
  time_entries: {
    select: ["time_entries"], insert: ["time_entries"], update: ["time_entries"], delete: ["time_entries"],
  },
  password_vault: {
    select: ["passwords"], insert: ["passwords"], update: ["passwords"], delete: ["passwords"],
  },
  settings: {
    select: ["settings", "time_entries", "quotes"],
    insert: ["settings"], update: ["settings"], delete: ["settings"],
  },
  activity_logs: { insert: ["invoices", "domains", "time_entries"] },
};

function requireTableAccess(access: Access, table: string, action: Action) {
  if (!TABLES.has(table)) throw new Error("Table not allowed");
  if (access.is_admin) return;
  const operations = action === "upsert" ? ["insert", "update"] as const : [action];
  if (!operations.every(operation =>
    MODULE_ACCESS[table]?.[operation]?.some(module => access.modules.includes(module))
  )) throw new Error("Forbidden: geen toegang tot deze gegevensactie");
}

/** Check both the base action and every table included in the response. */
export function authorizeRequest(access: Access, body: any) {
  if (!body || typeof body !== "object" || !ACTIONS.has(body.action)) throw new Error("Unsupported action");
  if (body.action === "rpc") {
    if (body.fn === "save_invoice") {
      if (!access.is_admin && !access.modules.includes("invoices")) throw new Error("Forbidden: geen toegang tot Facturen");
      return;
    }
    if (body.fn !== "generate_invoice_number") throw new Error("RPC not allowed");
    if (!access.is_admin && !["invoices", "domains", "time_entries"].some(module => access.modules.includes(module))) {
      throw new Error("Forbidden: geen toegang tot factuurnummers");
    }
    return;
  }
  requireTableAccess(access, body.table, body.action);
  const responseColumns = body.action === "select" ? body.columns || "*" : body.returning;
  if (responseColumns) {
    requireTableAccess(access, body.table, "select");
    for (const related of parseSelect(body.table, responseColumns).relations) {
      requireTableAccess(access, related, "select");
    }
  }
}

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

async function authenticate(req:Request, kind:"supabase"|"neon") {
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

  const verified=await jwtVerify(token,JWKS,{issuer:`${SUPABASE_URL}/auth/v1`,audience:"authenticated"});
  const sub=String(verified.payload.sub||"");
  if (!sub) throw new Error("Unauthorized");
  return {id:sub};
}

async function loadAccess(pool:Queryable,userId:string): Promise<Access> {
  const r=await pool.query(`
    select
      exists(select 1 from public.user_roles where user_id=$1 and role='admin') as is_admin,
      array(select module_key from public.user_module_access where user_id=$1) as modules
  `,[userId]);
  return { is_admin: r.rows[0]?.is_admin === true, modules: r.rows[0]?.modules ?? [] };
}

function ident(v:string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) throw new Error("Invalid identifier");
  return '"' + v + '"';
}

function parseSelect(table:string, columns:string, alias="t"): {sql:string; params:unknown[]; relations:string[]} {
  const text=(columns||"*").trim();
  if (text==="*" || text==="") return {sql:`${alias}.*`,params:[],relations:[]};
  const parts:string[]=[]; let depth=0; let start=0;
  for(let i=0;i<text.length;i++){ const ch=text[i]; if(ch==="(") depth++; else if(ch===")") depth--; else if(ch===","&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;} }
  parts.push(text.slice(start).trim());

  const out:string[]=[]; const relations:string[]=[];
  for(const part of parts){
    const rel=part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/s);
    if(rel){
      const name=rel[1], inner=rel[2], cfg=RELATIONS[table]?.[name];
      if(!cfg) throw new Error(`Unsupported relation ${table}.${name}`);
      const parsed=parseSelect(cfg.table,inner,"r");
      relations.push(cfg.table, ...parsed.relations);
      out.push(`(select to_jsonb(r) from (select ${parsed.sql} from public.${ident(cfg.table)} r where r.${ident(cfg.remote)}=${alias}.${ident(cfg.local)} limit 1) r) as ${ident(name)}`);
      continue;
    }
    const aliasMatch=part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/);
    if(aliasMatch) out.push(`${alias}.${ident(aliasMatch[2])} as ${ident(aliasMatch[1])}`);
    else out.push(`${alias}.${ident(part)}`);
  }
  return {sql:out.join(","),params:[],relations};
}

type Filter={op:string;column:string;value:unknown};

export function buildWhere(filters:Filter[], start=1){
  const sqls:string[]=[]; const params:unknown[]=[]; let n=start;
  for(const f of filters){
    const col=f.column.includes(".") ? f.column.split(".").map(ident).join(".") : ident(f.column);
    if(f.op==="is") {
      // IS accepts SQL keywords, never arbitrary request text. All other
      // operators use bound values below.
      if (f.value !== null && typeof f.value !== "boolean") throw new Error("Invalid IS filter value");
      sqls.push(`${col} IS ${f.value===null?"NULL":f.value?"TRUE":"FALSE"}`);
      continue;
    }
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

async function execute(kind:"supabase"|"neon", body:any, db?:PoolClient) {
  if(!TABLES.has(body.table||"") && body.action!=="rpc") throw new Error("Table not allowed");
  const pool=db ?? poolFor(kind);

  if(body.action==="rpc"){
    if (body.fn === "save_invoice") {
      const r=await pool.query("select public.save_invoice($1::jsonb) as value",[JSON.stringify(body.args?.p_invoice ?? null)]);
      return {data:r.rows[0]?.value??null,error:null};
    }
    if(body.fn!=="generate_invoice_number") throw new Error("RPC not allowed");
    const year=Number(body.args?.p_year);
    if (!Number.isInteger(year) || year < 2000 || year > 2199) throw new Error("Invalid invoice year");
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
    const sql=`insert into public.${ident(table)} as t (${cols.map(ident).join(",")}) values ${rows.map((row:any)=>"("+cols.map(c=>`$${values.push(row[c])}`).join(",")+")").join(",")}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return mutationResult(r.rows,body);
  }

  if(body.action==="update"){
    const sets=Object.keys(body.values||{}).map(k=>`${ident(k)}=$${values.push(body.values[k])}`).join(",");
    const sql=`update public.${ident(table)} as t set ${sets}${where.where}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return mutationResult(r.rows,body);
  }

  if(body.action==="delete"){
    const sql=`delete from public.${ident(table)} as t${where.where}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return mutationResult(r.rows,body);
  }

  if(body.action==="upsert"){
    const rows=Array.isArray(body.values)?body.values:[body.values];
    const cols=Object.keys(rows[0]||{}); const conflict=(body.onConflict||"id").split(",").map(ident).join(",");
    const nonConflict=cols.filter(c=>!body.onConflict?.split(",").includes(c));
    const sql=`insert into public.${ident(table)} as t (${cols.map(ident).join(",")}) values ${rows.map((row:any)=>"("+cols.map(c=>`$${values.push(row[c])}`).join(",")+")").join(",")} on conflict (${conflict}) do ${body.ignoreDuplicates?"nothing":"update set "+nonConflict.map(c=>`${ident(c)}=excluded.${ident(c)}`).join(",")}${returning?" returning "+returning:""}`;
    const r=await pool.query(sql,values);
    return mutationResult(r.rows,body);
  }

  throw new Error("Unsupported action");
}

function mutationResult(rows:any[],body:any) {
  if (!body.returning) return {data:null,error:null};
  if (body.singleMode === "single") return {data:rows[0]??null,error:rows.length===1?null:{message:"JSON object requested, multiple/no rows returned"}};
  if (body.singleMode === "maybeSingle") return {data:rows[0]??null,error:rows.length>1?{message:"Multiple rows returned"}:null};
  return {data:rows,error:null};
}

/** Only a verified Auth user supplies these claims; request arguments cannot. */
export async function executeAuthorized(kind:"supabase"|"neon", userId:string, body:any, db:PoolClient) {
  authorizeRequest(await loadAccess(db,userId),body);
  // Transaction-local settings cannot survive release to a pooled connection.
  // SECURITY DEFINER RPCs (including invoice numbering) still check auth.uid().
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
    [userId,JSON.stringify({sub:userId,role:"authenticated"})]
  );
  return execute(kind,body,db);
}

async function withRequestTransaction<T>(kind:"supabase"|"neon", perform:(client:PoolClient)=>Promise<T>):Promise<T> {
  const client=await poolFor(kind).connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '12s'");
    const result=await perform(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* release below */ }
    throw error;
  } finally { client.release(); }
}


/**
 * An idle PRIMARY is allowed to let its ten-minute fencing lease expire.
 * On its next authenticated write, verify BOTH database roles and the
 * authoritative failover epoch, then renew only Supabase's own lease.
 *
 * Lock state + lease until the mutation commits. A concurrent fencing
 * transaction cannot demote the source halfway through the write.
 * Do not auto-promote, replay DR events, create missing leases, or bypass
 * the HARKAS_WRITER_FENCED database trigger.
 */
async function withVerifiedPrimaryLease<T>(
  perform:(client:PoolClient)=>Promise<T>
):Promise<T> {
  const client=await poolFor("supabase").connect();
  let inTransaction=false;
  try {
    await client.query("BEGIN");
    inTransaction=true;
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '12s'");

    const state=await client.query(
      "SELECT role, epoch FROM public.harkas_resilience_state WHERE singleton=true FOR UPDATE"
    );
    const source=state.rows[0];
    if (!source || source.role!=="primary") {
      throw new Error("HARKAS_WRITER_FENCED: Supabase is not PRIMARY");
    }

    const control=await client.query(
      "SELECT writer, epoch FROM public.harkas_failover_control "+
      "WHERE resource='harkas-admin-db' FOR UPDATE"
    );
    const owner=control.rows[0];
    if (!owner || owner.writer!=="supabase" ||
        Number(owner.epoch)!==Number(source.epoch)) {
      throw new Error("HARKAS_WRITER_FENCED: writer/epoch authority mismatch");
    }

    // Fail closed if Neon is unreachable or was promoted. Using only the
    // local role could reactivate a stale PRIMARY after split-brain.
    const peer=await poolFor("neon").query(
      "SELECT role, epoch FROM public.harkas_resilience_state WHERE singleton=true"
    );
    const standby=peer.rows[0];
    if (!standby || standby.role!=="standby" ||
        Number(standby.epoch)!==Number(source.epoch)) {
      throw new Error("HARKAS_WRITER_FENCED: standby role/epoch mismatch");
    }

    const leases=await client.query(
      "SELECT node, epoch FROM public.harkas_resilience_lease "+
      "WHERE singleton=true FOR UPDATE"
    );
    const lease=leases.rows[0];
    if (!lease || lease.node!=="supabase" ||
        Number(lease.epoch)!==Number(source.epoch)) {
      throw new Error("HARKAS_WRITER_FENCED: lease belongs to another writer");
    }

    // A renewal and its application mutation commit atomically.
    const renewed=await client.query(
      "UPDATE public.harkas_resilience_lease "+
      "SET expires_at=now()+interval '10 minutes', renewed_at=now() "+
      "WHERE singleton=true AND node='supabase' AND epoch=$1",
      [source.epoch]
    );
    if (renewed.rowCount!==1) {
      throw new Error("HARKAS_WRITER_FENCED: unable to renew PRIMARY lease");
    }

    const result=await perform(client);
    await client.query("COMMIT");
    inTransaction=false;
    return result;
  } catch (error) {
    if (inTransaction) {
      try { await client.query("ROLLBACK"); }
      catch (rollbackError) { console.error("[HA] lease rollback failed", rollbackError instanceof Error ? rollbackError.name : "unknown"); }
    }
    throw error;
  } finally {
    client.release();
  }
}

export default async function handler(req:Request,res:any){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  if (!String(req.headers.authorization||"").startsWith("Bearer ")) { res.status(401).json({error:"Unauthorized"});return; }
  try{
    const primary=await choosePrimary();
    const user=await authenticate(req,primary);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) throw new Error("Unauthorized");
    // Writes require a verified, current PRIMARY lease in the same SQL
    // transaction. Reads do not change leases or require standby availability.
    const result=primary==="supabase" && req.body?.action!=="select"
      ? await withVerifiedPrimaryLease((client)=>executeAuthorized(primary,user.id,req.body,client))
      : await withRequestTransaction(primary,(client)=>executeAuthorized(primary,user.id,req.body,client));
    res.status(200).json({primary,...result});
  }catch(error:any){
    const message=error?.message||"HA database request failed";
    const status=/Unauthorized/i.test(message)?401:error?.code==="42501"||/Forbidden/i.test(message)?403:error?.code==="40001"?409:error?.code==="P0001"||error?.code?.startsWith("22")||/Invalid|Unsupported|not allowed/i.test(message)?400:503;
    res.status(status).json({error:message});
  }
}
