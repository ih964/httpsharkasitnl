import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("VAULT_ENCRYPTION_KEY");
  if (!secret) throw new Error("VAULT_ENCRYPTION_KEY missing");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: roleRow }, { data: moduleRows }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      admin.from("user_module_access").select("module_key").eq("user_id", userId).eq("module_key", "passwords"),
    ]);
    if (!roleRow && !moduleRows?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { id, expected_origin } = await req.json();
    if (typeof id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: row, error } = await admin.from("password_vault").select("encrypted_password,website_url,username").eq("id", id).maybeSingle();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // An extension request must match the origin of the very same row being decrypted.
    // Old Harkas Admin calls omit expected_origin and retain their existing response.
    if (expected_origin !== undefined) {
      let origin: string | null = null;
      try {
        const input = String(row.website_url || "").trim();
        const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : "https://" + input);
        if (u.protocol === "https:" && !u.username && !u.password && u.hostname.includes(".")) origin = u.origin;
      } catch { /* reject malformed or missing URLs */ }
      if (typeof expected_origin !== "string" || !origin || origin !== expected_origin) {
        return new Response(JSON.stringify({ error: "Origin mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    const parts = (row.encrypted_password as string).split(":");
    if (parts.length !== 3 || parts[0] !== "v1") {
      return new Response(JSON.stringify({ error: "Invalid ciphertext" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const iv = fromB64(parts[1]);
    const ct = fromB64(parts[2]);
    const key = await getKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    const password = new TextDecoder().decode(plain);

    return new Response(JSON.stringify(expected_origin === undefined ? { password } : { password, origin: expected_origin, username: row.username || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("decrypt error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
