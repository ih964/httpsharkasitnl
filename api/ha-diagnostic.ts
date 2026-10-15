import { Pool } from "pg";

/**
 * Temporary, protected and read-only HA connectivity check.
 * Never return raw errors, credentials, database hosts or connection strings.
 * A mismatching/missing private token returns 404.
 */
const token = process.env.HARKAS_DIAG_TOKEN || "";

function shape(value: string | undefined, kind: "supabase" | "neon") {
  if (!value) return { configured: false };
  try {
    const uri = new URL(value);
    const secret = decodeURIComponent(uri.password || "");
    return {
      configured: true,
      validScheme: uri.protocol === "postgresql:" || uri.protocol === "postgres:",
      hasPassword: secret.length > 0,
      placeholderPassword: /^\[.+\]$|^<.+>$|YOUR.PASSWORD|YOUR_PASSWORD/i.test(secret),
      expectedPoolerHost: kind === "supabase" ? uri.hostname === "aws-1-eu-west-3.pooler.supabase.com" : undefined,
      expectedProjectUsername: kind === "supabase" ? uri.username === "postgres.uqkrxzlkvjdmebsbdrmb" : undefined,
      expectedDatabase: kind === "supabase" ? uri.pathname === "/postgres" : uri.pathname === "/harkas_admin_backup",
      port: uri.port,
      sslmode: uri.searchParams.get("sslmode") || "default",
    };
  } catch {
    return { configured: true, parseError: true };
  }
}

function codeFor(error: unknown) {
  const err = error as { code?: string; message?: string; errors?: Array<{ code?: string }> };
  const rawCode = String(err?.code || err?.errors?.[0]?.code || "");
  const code = /^[A-Z0-9_]{2,24}$/.test(rawCode) ? rawCode : "UNKNOWN";
  const msg = String(err?.message || "").toLowerCase();
  const reason = code === "28P01" ? "authentication" :
    code === "3D000" ? "database_not_found" :
    code === "42P01" ? "missing_state_table" :
    code === "ENOTFOUND" || code === "EAI_AGAIN" ? "dns" :
    code === "ETIMEDOUT" || code === "ETIMEOUT" ? "network_timeout" :
    code === "ECONNREFUSED" || code === "ENETUNREACH" ? "network_connection" :
    msg.includes("certificate") || msg.includes("ssl") || msg.includes("tls") ? "tls" :
    msg.includes("password") || msg.includes("sasl") ? "credentials_format" :
    msg.includes("timeout") ? "timeout" :
    msg.includes("no pg_hba") ? "database_access" : "other";
  return { code, reason };
}

async function probe(kind: "supabase" | "neon", connectionString?: string) {
  const config = shape(connectionString, kind);
  if (!connectionString) return { config, reachable: false, failure: { code: "NOT_CONFIGURED" } };
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000 });
  try {
    const r = await pool.query("select role, epoch from public.harkas_resilience_state where singleton=true");
    return { config, reachable: true, role: String(r.rows[0]?.role ?? "MISSING"), epoch: Number(r.rows[0]?.epoch ?? -1) };
  } catch (error) {
    return { config, reachable: false, failure: codeFor(error) };
  } finally {
    await pool.end().catch(() => {});
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "GET" || !token || req.query?.token !== token) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [supabase, neon] = await Promise.all([
    probe("supabase", process.env.HARKAS_SUPABASE_DSN),
    probe("neon", process.env.HARKAS_NEON_DSN),
  ]);
  const healthyPrimary = (supabase.reachable && supabase.role === "primary") ||
    (neon.reachable && neon.role === "primary");
  res.status(healthyPrimary ? 200 : 503).json({
    healthyPrimary,
    supabase,
    neon,
  });
}
