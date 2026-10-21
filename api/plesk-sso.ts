import { isIP } from "node:net";
import { Pool } from "pg";

const PLESK_ORIGIN = "https://shared70.cloud86-host.nl:8443";
const SUPABASE_URL =
  process.env.HARKAS_SUPABASE_URL ||
  "https://uqkrxzlkvjdmebsbdrmb.supabase.co";

let pool: Pool | undefined;
const db = () => {
  if (!process.env.HARKAS_SUPABASE_DSN) {
    throw new Error("Admin-autorisatie is niet beschikbaar");
  }
  return (pool ??= new Pool({
    connectionString: process.env.HARKAS_SUPABASE_DSN,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  }));
};

const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function authorizedAdmin(header: unknown): Promise<boolean> {
  const bearer = typeof header === "string" ? header : "";
  if (!/^Bearer [^\s]+$/.test(bearer)) return false;

  const authResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      Authorization: bearer,
      apikey:
        process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!authResponse.ok) return false;
  const user = await authResponse.json();
  if (!validId(user.id)) return false;

  const { rows } = await db().query(
    "SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role='admin' LIMIT 1",
    [user.id],
  );
  return rows.length > 0;
}

function requestIp(req: any): string | undefined {
  const forwarded = req.headers["x-vercel-forwarded-for"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "")
    .split(",")[0]
    .trim();
  return isIP(ip) ? ip : undefined;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Methode niet toegestaan" });
  }

  try {
    if (!(await authorizedAdmin(req.headers.authorization))) {
      return res.status(403).json({ error: "Alleen voor beheerders" });
    }
  } catch {
    return res.status(503).json({ error: "Admincontrole tijdelijk niet beschikbaar" });
  }

  const apiKey = process.env.HARKAS_PLESK_API_KEY;
  const login = process.env.HARKAS_PLESK_LOGIN;
  const configured = Boolean(apiKey && login);

  if (req.method === "GET") {
    return res.status(200).json({ configured });
  }

  if (!configured) {
    return res.status(503).json({ error: "Plesk SSO moet nog worden gekoppeld" });
  }

  try {
    // API key is server-only. Never put credentials, API keys or passwords in a URL.
    const userIp = requestIp(req);
    const reply = await fetch(PLESK_ORIGIN + "/api/v2/server/session", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        login,
        ...(userIp ? { user_ip: userIp } : {}),
        skip_mfa: false,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    if (reply.status !== 201) {
      return res.status(502).json({
        error: "Plesk heeft geen automatische sessie aangemaakt. Controleer API-toegang.",
      });
    }

    const body = await reply.json();
    const token = body?.id;
    if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(token)) {
      return res.status(502).json({ error: "Ongeldig Plesk-sessietoken" });
    }

    const url = new URL("/enterprise/rsession_init.php", PLESK_ORIGIN);
    url.searchParams.set("PLESKSESSID", token);
    url.searchParams.set("success_redirect_url", "/smb/web/view");
    return res.status(200).json({ url: url.toString() });
  } catch {
    return res.status(502).json({ error: "Plesk is tijdelijk niet beschikbaar" });
  }
}
