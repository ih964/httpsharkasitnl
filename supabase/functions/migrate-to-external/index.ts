// Server-side migration runner: Lovable Cloud (source) -> external Supabase (target).
// SAFETY: source is READ-ONLY (only SELECTs). Secrets come from env only and are never returned.
// Modes: "preflight" | "dry-run" (default) | "migrate" (needs confirm phrase) | "verify".
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import postgres from "npm:postgres@3.4.4";
import { TARGET_SCHEMA_STEPS } from "./schema.ts";

const SOURCE_REF = "bvydvymlvbwebtwemzds";
const TARGET_REF = "uqkrxzlkvjdmebsbdrmb";
const CONFIRM_PHRASE = `MIGRATE-${TARGET_REF}`;
const EXCLUDED_EMAIL_DOMAINS = ["recla.me"];
const EXPECTED_ADMINS = 3;

// FK-safe order. Key column used for ON CONFLICT DO NOTHING (re-runnable).
const TABLES: [string, string][] = [
  ["customers", "id"], ["invoice_counters", "invoice_year"], ["invoices", "id"], ["invoice_items", "id"],
  ["domains", "id"], ["time_entries", "id"], ["settings", "id"], ["activity_logs", "id"],
  ["password_vault", "id"], ["keep_alive", "id"],
];
const FK_CHECKS: [string, string][] = [
  ["invoices.customer_id", "select count(*)::int n from public.invoices c where customer_id is not null and not exists (select 1 from public.customers p where p.id=c.customer_id)"],
  ["invoice_items.invoice_id", "select count(*)::int n from public.invoice_items c where not exists (select 1 from public.invoices p where p.id=c.invoice_id)"],
  ["domains.customer_id", "select count(*)::int n from public.domains c where customer_id is not null and not exists (select 1 from public.customers p where p.id=c.customer_id)"],
  ["time_entries.customer_id", "select count(*)::int n from public.time_entries c where customer_id is not null and not exists (select 1 from public.customers p where p.id=c.customer_id)"],
  ["time_entries.invoice_id", "select count(*)::int n from public.time_entries c where invoice_id is not null and not exists (select 1 from public.invoices p where p.id=c.invoice_id)"],
  ["user_roles.user_id", "select count(*)::int n from public.user_roles c where not exists (select 1 from auth.users u where u.id=c.user_id)"],
];
const BUCKETS = ["invoices", "branding"];
const EXPECTED_FUNCTIONS = ["generate-invoice-pdf", "send-invoice-email", "send-domain-reminders", "encrypt-password", "decrypt-password", "keep-alive", "smtp-send"];

const REQUIRED_SECRETS = [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "VAULT_ENCRYPTION_KEY", // source (already present)
  "TARGET_SUPABASE_URL", "TARGET_SERVICE_ROLE_KEY", "TARGET_DB_URL", "TARGET_ANON_KEY", "TARGET_VAULT_ENCRYPTION_KEY",
];
const OPTIONAL_SECRETS = ["TARGET_MANAGEMENT_TOKEN"]; // to verify Edge Functions + secrets on target

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const env = (k: string) => Deno.env.get(k) ?? "";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
// Scrub anything secret-like from error text before returning it.
const scrub = (e: unknown) => {
  let m = e instanceof Error ? e.message : String(e);
  for (const k of [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS]) { const v = env(k); if (v && v.length > 6) m = m.split(v).join(`<${k}>`); }
  return m.replace(/postgres(ql)?:\/\/[^\s"']+/g, "<db-url>").slice(0, 500);
};

// ---- Vault crypto (format v1:<b64 iv>:<b64 ct>, AES-256-GCM, key = SHA-256(secret)) ----
const b64d = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64e = (b: Uint8Array) => { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
async function aesKey(secret: string, use: KeyUsage) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", h, { name: "AES-GCM" }, false, [use]);
}
async function decryptV1(key: CryptoKey, v: string) {
  const [ver, iv, ct] = v.split(":");
  if (ver !== "v1" || !iv || !ct) throw new Error("unsupported format");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(iv) }, key, b64d(ct)));
}
async function encryptV1(key: CryptoKey, plain: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  return `v1:${b64e(iv)}:${b64e(ct)}`;
}

// ---- Preflight ----
async function preflight() {
  const missing = REQUIRED_SECRETS.filter((k) => !env(k));
  const optional_missing = OPTIONAL_SECRETS.filter((k) => !env(k));
  const problems: string[] = [];
  if (missing.length) problems.push(`Missing secrets: ${missing.join(", ")}`);
  const tUrl = env("TARGET_SUPABASE_URL");
  if (tUrl && !tUrl.includes(TARGET_REF)) problems.push(`TARGET_SUPABASE_URL does not point to ${TARGET_REF}`);
  if (tUrl.includes(SOURCE_REF) || env("TARGET_DB_URL").includes(SOURCE_REF)) problems.push("Target points at the SOURCE project – refusing");
  if (env("TARGET_DB_URL") && !env("TARGET_DB_URL").includes(TARGET_REF)) problems.push(`TARGET_DB_URL does not reference ${TARGET_REF}`);
  if (env("TARGET_VAULT_ENCRYPTION_KEY") && env("TARGET_VAULT_ENCRYPTION_KEY").length < 32) problems.push("TARGET_VAULT_ENCRYPTION_KEY must be at least 32 characters");

  const reach: Record<string, string> = {};
  if (tUrl && env("TARGET_SERVICE_ROLE_KEY")) {
    try {
      const r = await fetch(`${tUrl}/auth/v1/health`, { headers: { apikey: env("TARGET_SERVICE_ROLE_KEY") }, signal: AbortSignal.timeout(8000) });
      reach.target_api = r.ok ? "ok" : `HTTP ${r.status}`;
      if (!r.ok) problems.push(`Target API not reachable (HTTP ${r.status})`);
    } catch (e) { reach.target_api = "unreachable"; problems.push(`Target API unreachable: ${scrub(e)}`); }
  }
  if (env("TARGET_DB_URL")) {
    const t = postgres(env("TARGET_DB_URL"), { max: 1, prepare: false, connect_timeout: 10 });
    try { await t`select 1`; reach.target_db = "ok"; }
    catch (e) { reach.target_db = "unreachable"; problems.push(`Target DB unreachable: ${scrub(e)}`); }
    finally { await t.end({ timeout: 2 }); }
  }
  return { ok: problems.length === 0, missing_secrets: missing, optional_missing, reachability: reach, problems };
}

// ---- Source inventory (read-only) ----
async function sourceInventory(src: ReturnType<typeof postgres>) {
  const counts: Record<string, number> = {};
  for (const [t] of [...TABLES, ["user_roles", "id"] as [string, string]]) counts[t] = (await src.unsafe(`select count(*)::int n from public.${t}`))[0].n;
  const users = await src`select id, email from auth.users`;
  const excluded = users.filter((u) => EXCLUDED_EMAIL_DOMAINS.some((d) => String(u.email).toLowerCase().endsWith("@" + d)));
  const admins = await src`select distinct r.user_id from public.user_roles r where r.role='admin'`;
  const adminIds = admins.map((a) => a.user_id).filter((id) => !excluded.some((x) => x.id === id));
  const storage = await src`select bucket_id, name from storage.objects where bucket_id = any(${BUCKETS})`;
  const crons = await src`select jobname, schedule from cron.job`;
  return { counts, adminIds, excludedUserCount: excluded.length, totalUsers: users.length, storage, crons };
}

async function vaultCheck(src: ReturnType<typeof postgres>) {
  const oldKey = await aesKey(env("VAULT_ENCRYPTION_KEY"), "decrypt");
  const rows = await src`select id, encrypted_password from public.password_vault`;
  let ok = 0; const failed: string[] = [];
  for (const r of rows) { try { await decryptV1(oldKey, r.encrypted_password); ok++; } catch { failed.push(r.id); } }
  return { total: rows.length, decryptable: ok, failed_ids: failed };
}

// ---- Target state ----
async function targetState(tgt: ReturnType<typeof postgres>) {
  const tables = await tgt`select table_name from information_schema.tables where table_schema='public'`;
  const existing = new Set(tables.map((t) => t.table_name));
  const counts: Record<string, number | null> = {};
  for (const [t] of [...TABLES, ["user_roles", "id"] as [string, string]]) counts[t] = existing.has(t) ? (await tgt.unsafe(`select count(*)::int n from public.${t}`))[0].n : null;
  return { schema_present: existing.has("invoices"), counts };
}

// ---- Migration steps (writes ONLY to target) ----
async function migrate(src: ReturnType<typeof postgres>, tgt: ReturnType<typeof postgres>, inv: Awaited<ReturnType<typeof sourceInventory>>) {
  const log: Record<string, unknown> = {};
  const ts = await targetState(tgt);

  // (6) schema / RLS / triggers / functions / buckets
  if (!ts.schema_present) {
    for (let i = 0; i < TARGET_SCHEMA_STEPS.length; i++) await tgt.begin(async (tx) => { await tx.unsafe(TARGET_SCHEMA_STEPS[i]); });
    log.schema = `applied ${TARGET_SCHEMA_STEPS.length} steps`;
  } else log.schema = "already present – skipped";

  // (3) admin auth users with original ids + password hashes (never leave server memory)
  const users = await src`select * from auth.users where id = any(${inv.adminIds})`;
  const idents = await src`select * from auth.identities where user_id = any(${inv.adminIds})`;
  const userCols = ["instance_id","id","aud","role","email","encrypted_password","email_confirmed_at","confirmed_at","last_sign_in_at","raw_app_meta_data","raw_user_meta_data","is_super_admin","created_at","updated_at","phone","phone_confirmed_at","is_sso_user","is_anonymous"];
  await tgt.begin(async (tx) => {
    for (const u of users) {
      const row: Record<string, unknown> = {};
      for (const c of userCols) if (c in u && c !== "confirmed_at") row[c] = u[c];
      row.instance_id = "00000000-0000-0000-0000-000000000000";
      for (const k of ["confirmation_token","recovery_token","email_change_token_new","email_change"]) row[k] = "";
      await tx`insert into auth.users ${tx(row)} on conflict (id) do nothing`;
    }
    for (const i of idents) {
      const row = { id: i.id, user_id: i.user_id, provider: i.provider, provider_id: i.provider_id, identity_data: i.identity_data, last_sign_in_at: i.last_sign_in_at, created_at: i.created_at, updated_at: i.updated_at };
      await tx`insert into auth.identities ${tx(row)} on conflict do nothing`;
    }
  });
  log.auth_users = users.length;
  users.length = 0; // drop hash references

  // (2) application data with original ids; (4) vault re-encrypted in memory
  const oldKey = await aesKey(env("VAULT_ENCRYPTION_KEY"), "decrypt");
  const newKey = await aesKey(env("TARGET_VAULT_ENCRYPTION_KEY"), "encrypt");
  const tUrl = env("TARGET_SUPABASE_URL");
  for (const [t, key] of TABLES) {
    let rows = await src.unsafe(`select * from public.${t}`);
    if (t === "password_vault") {
      rows = await Promise.all(rows.map(async (r: Record<string, unknown>) => {
        let plain: Uint8Array | null = await decryptV1(oldKey, String(r.encrypted_password));
        const enc = await encryptV1(newKey, plain); plain.fill(0); plain = null;
        return { ...r, encrypted_password: enc };
      }));
    }
    if (t === "settings") rows = rows.map((r: Record<string, unknown>) => ({ ...r, logo_url: typeof r.logo_url === "string" ? r.logo_url.split(SOURCE_REF).join(TARGET_REF).replace(/https:\/\/[^/]+\.supabase\.co/, tUrl) : r.logo_url }));
    if (rows.length) await tgt.begin(async (tx) => {
      await tx.unsafe(`insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $1::jsonb) on conflict (${key}) do nothing`, [JSON.stringify(rows)]);
    });
    log[`rows_${t}`] = rows.length;
  }
  const roles = await src`select * from public.user_roles where user_id = any(${inv.adminIds})`;
  if (roles.length) await tgt.unsafe(`insert into public.user_roles select * from jsonb_populate_recordset(null::public.user_roles, $1::jsonb) on conflict do nothing`, [JSON.stringify(roles)]);
  log.rows_user_roles = roles.length;
  // Advance counters past existing invoice numbers (counter rows already copied as-is).

  // (5) storage with identical paths
  const s = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const t = createClient(tUrl, env("TARGET_SERVICE_ROLE_KEY"));
  let copied = 0; const storageErrors: string[] = [];
  for (const o of inv.storage) {
    const { data, error } = await s.storage.from(o.bucket_id).download(o.name);
    if (error || !data) { storageErrors.push(`${o.bucket_id}/${o.name}: download failed`); continue; }
    const up = await t.storage.from(o.bucket_id).upload(o.name, data, { upsert: true, contentType: data.type || undefined });
    if (up.error) storageErrors.push(`${o.bucket_id}/${o.name}: ${up.error.message}`); else copied++;
  }
  log.storage = { copied, errors: storageErrors };

  // (7) cron jobs on target (anon key is publishable; stored only in target DB)
  const anon = env("TARGET_ANON_KEY");
  const fn = (name: string) => `${tUrl}/functions/v1/${name}`;
  await tgt`select cron.unschedule(jobname) from cron.job where jobname in ('send-domain-reminders-daily','keep-alive-daily')`;
  await tgt`select cron.schedule('send-domain-reminders-daily', '0 8 * * *', ${`select net.http_post(url := '${fn("send-domain-reminders")}', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ${anon}'), body := '{}'::jsonb);`})`;
  await tgt`select cron.schedule('keep-alive-daily', '0 9 * * *', ${`select net.http_post(url := '${fn("keep-alive")}', headers := jsonb_build_object('Content-Type','application/json','apikey','${anon}'), body := '{}'::jsonb);`})`;
  log.cron_jobs = 2;
  return log;
}

// ---- (9) Verification (target vs source) ----
async function verify(src: ReturnType<typeof postgres>, tgt: ReturnType<typeof postgres>, inv: Awaited<ReturnType<typeof sourceInventory>>) {
  const ts = await targetState(tgt);
  const counts: Record<string, { source: number; target: number | null; match: boolean }> = {};
  for (const [t] of TABLES) counts[t] = { source: inv.counts[t], target: ts.counts[t], match: inv.counts[t] === ts.counts[t] };
  const roleTarget = ts.counts.user_roles;
  counts.user_roles = { source: EXPECTED_ADMINS, target: roleTarget, match: roleTarget === inv.adminIds.length };

  const fk: Record<string, number | string> = {};
  if (ts.schema_present) for (const [n, q] of FK_CHECKS) fk[n] = (await tgt.unsafe(q))[0].n;

  const authIds = await tgt`select id from auth.users where id = any(${inv.adminIds}) and encrypted_password is not null and encrypted_password <> ''`;
  const authAdmins = ts.schema_present ? await tgt`select count(distinct user_id)::int n from public.user_roles where role='admin'` : [{ n: 0 }];

  let vault = { total: 0, decryptable: 0, failed: 0 };
  if (ts.schema_present) {
    const k = await aesKey(env("TARGET_VAULT_ENCRYPTION_KEY"), "decrypt");
    const rows = await tgt`select encrypted_password from public.password_vault`;
    for (const r of rows) { vault.total++; try { (await decryptV1(k, r.encrypted_password)).fill(0); vault.decryptable++; } catch { vault.failed++; } }
  }

  const t = createClient(env("TARGET_SUPABASE_URL"), env("TARGET_SERVICE_ROLE_KEY"));
  const missingObjects: string[] = [];
  if (ts.schema_present) for (const o of inv.storage) {
    const dir = o.name.includes("/") ? o.name.slice(0, o.name.lastIndexOf("/")) : "";
    const file = o.name.slice(o.name.lastIndexOf("/") + 1);
    const { data } = await t.storage.from(o.bucket_id).list(dir, { search: file, limit: 10 });
    if (!data?.some((x) => x.name === file)) missingObjects.push(`${o.bucket_id}/${o.name}`);
  }

  const crons = ts.schema_present ? await tgt`select jobname from cron.job` : [];
  let functions: unknown = "skipped (TARGET_MANAGEMENT_TOKEN not set)";
  if (env("TARGET_MANAGEMENT_TOKEN")) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${TARGET_REF}/functions`, { headers: { Authorization: `Bearer ${env("TARGET_MANAGEMENT_TOKEN")}` } });
      const list = r.ok ? (await r.json()).map((f: { slug: string }) => f.slug) : [];
      functions = { deployed: list, missing: EXPECTED_FUNCTIONS.filter((f) => !list.includes(f)) };
    } catch (e) { functions = `error: ${scrub(e)}`; }
  }

  const passed = Object.values(counts).every((c) => c.match) && Object.values(fk).every((n) => n === 0)
    && authIds.length === inv.adminIds.length && authAdmins[0].n === inv.adminIds.length
    && vault.total === inv.counts.password_vault && vault.failed === 0 && missingObjects.length === 0
    && ["send-domain-reminders-daily", "keep-alive-daily"].every((j) => crons.some((c) => c.jobname === j));
  return { passed, counts, orphan_rows: fk, admin_users_with_hash: authIds.length, admin_roles: authAdmins[0].n, vault, storage: { expected: inv.storage.length, missing: missingObjects }, cron_jobs: crons.map((c) => c.jobname), edge_functions: functions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Admin-only caller
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "dry-run";

    const pf = await preflight();
    if (mode === "preflight") return json({ mode, ...pf, required_secret_names: REQUIRED_SECRETS, optional_secret_names: OPTIONAL_SECRETS });
    if (!pf.ok) return json({ mode, refused: true, reason: "preflight failed", ...pf }, 412);

    const src = postgres(env("SUPABASE_DB_URL"), { max: 1, prepare: false });
    const tgt = postgres(env("TARGET_DB_URL"), { max: 1, prepare: false });
    try {
      await src`set session characteristics as transaction read only`; // hard guarantee: source is never written
      const inv = await sourceInventory(src);
      const invOut = { counts: inv.counts, admin_users_to_migrate: inv.adminIds.length, excluded_users: inv.excludedUserCount, total_source_users: inv.totalUsers, storage_objects: inv.storage.length, source_cron_jobs: inv.crons.map((c) => c.jobname) };
      if (inv.adminIds.length !== EXPECTED_ADMINS) return json({ mode, refused: true, reason: `expected ${EXPECTED_ADMINS} admin users, found ${inv.adminIds.length}`, inventory: invOut }, 412);

      if (mode === "dry-run") {
        const vault = await vaultCheck(src);
        const target = await targetState(tgt);
        const blockers: string[] = [];
        if (vault.failed_ids.length) blockers.push(`${vault.failed_ids.length} vault entries cannot be decrypted with the source key`);
        if (target.schema_present && Object.values(target.counts).some((n) => (n ?? 0) > 0)) blockers.push("target already contains data – migration is re-runnable (skips existing ids) but review first");
        const conflictUsers = await tgt`select count(*)::int n from auth.users where id <> all(${inv.adminIds}) and email in (select unnest(${(await src`select email from auth.users where id = any(${inv.adminIds})`).map((r) => r.email)}::text[]))`;
        if (conflictUsers[0].n) blockers.push("target has different users with the same admin email addresses");
        return json({ mode, ready: blockers.length === 0, inventory: invOut, vault: { total: vault.total, decryptable: vault.decryptable, failed: vault.failed_ids.length }, target, schema_steps: TARGET_SCHEMA_STEPS.length, blockers, next: `POST {"mode":"migrate","confirm":"${CONFIRM_PHRASE}"}` });
      }
      if (mode === "migrate") {
        if (body.confirm !== CONFIRM_PHRASE) return json({ refused: true, reason: `confirm must equal ${CONFIRM_PHRASE}` }, 400);
        const result = await migrate(src, tgt, inv);
        const verification = await verify(src, tgt, inv);
        return json({ mode, result, verification });
      }
      if (mode === "verify") return json({ mode, ...(await verify(src, tgt, inv)) });
      return json({ error: "unknown mode" }, 400);
    } finally { await src.end({ timeout: 2 }); await tgt.end({ timeout: 2 }); }
  } catch (e) { return json({ error: scrub(e) }, 500); }
});
