import { portalSupabase } from "@/integrations/supabase/client";

/**
 * Delivery is best-effort here; the database transaction has already created
 * an immutable notification event. A protected scheduled worker retries the outbox.
 */
export async function notifySupportChange(ticketId: string): Promise<void> {
  try {
    const { data: { session } } = await portalSupabase.auth.getSession();
    if (!session?.access_token) return;
    const response = await fetch("/api/support-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token,
      },
      body: JSON.stringify({ ticketId }),
      signal: AbortSignal.timeout(11000),
    });
    if (!response.ok) console.warn("[support] email remains queued", response.status);
  } catch {
    console.warn("[support] email remains queued for retry");
  }
}
