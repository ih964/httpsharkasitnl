import { createClient } from "npm:@supabase/supabase-js@2.49.8";

// Public pre-login preparation. The gateway requires the project's anon JWT.
// Only contacts explicitly approved by staff can be provisioned. No session,
// confirmation token or account identifier is returned to the caller.
const headers = {
  "Access-Control-Allow-Origin": "https://www.harkasit.nl",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "Methode niet toegestaan" }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 1024) return reply({ error: "Ongeldig verzoek" }, 400);
    const body = JSON.parse(raw);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Vul een geldig e-mailadres in" }, 400);
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.from("support_portal_access").select("email").eq("email", email).limit(1);
    if (error) return reply({ error: "Inloggen voorbereiden mislukt. Probeer het later opnieuw." }, 503);
    // A generic response avoids exposing the customer contact list.
    if (!data?.length) return reply({ ok: true, invited: true });
    const { data: claimed, error: claimError } = await admin.rpc("claim_support_login", { p_email: email });
    if (claimError) return reply({ error: "Inloggen voorbereiden mislukt. Probeer het later opnieuw." }, 503);
    if (!claimed) return reply({ ok: true, invited: true });
    const { error: createError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: "https://www.harkasit.nl/support" });
    if (createError && !["email_exists", "user_already_exists"].includes(createError.code ?? "")) {
      console.error("support_prepare_login_failed", createError.code ?? "unknown");
      return reply({ error: "Inloggen voorbereiden mislukt. Probeer het later opnieuw." }, 503);
    }
    return reply({ ok: true, invited: !createError });
  } catch {
    return reply({ error: "Ongeldig verzoek" }, 400);
  }
});
