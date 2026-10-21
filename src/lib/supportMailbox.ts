import { portalSupabase } from "@/integrations/supabase/client";
export async function mailboxRequest(
  path = "",
  body?: Record<string, unknown>,
) {
  const {
    data: { session },
  } = await portalSupabase.auth.getSession();
  if (!session) throw new Error("Niet aangemeld");
  const response = await fetch("/api/support-mailbox" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + session.access_token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Mailboxverzoek mislukt");
  }
  return response;
}
