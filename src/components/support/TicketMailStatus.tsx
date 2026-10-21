import { useCallback, useEffect, useState } from "react";
import { portalSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { notifySupportChange } from "@/lib/supportNotify";
export default function TicketMailStatus({
  ticketId,
  version,
}: {
  ticketId: string;
  version: string;
}) {
  const [rows, setRows] = useState<{ state: string; total: number }[]>([]),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await portalSupabase.rpc("support_mail_status", {
      p_ticket_id: ticketId,
    });
    setError(!!error);
    setRows(data ?? []);
  }, [ticketId]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load, version]);
  const labels: Record<string, string> = {
    pending: "In wachtrij",
    processing: "Bezig met verzenden",
    sent: "Geaccepteerd door mailprovider",
    failed: "Verzending mislukt – onderzoek nodig",
  };
  return (
    <div className="rounded-xl border p-3 text-xs">
      <p className="font-semibold">E-mailcommunicatie · support@harkasit.nl</p>
      {error ? (
        <p role="alert">Mailstatus ophalen mislukt.</p>
      ) : rows.length ? (
        rows.map((r) => (
          <p
            key={r.state}
            className={
              r.state === "failed"
                ? "text-destructive"
                : "text-muted-foreground"
            }
          >
            {labels[r.state] ?? r.state}: {r.total}
          </p>
        ))
      ) : (
        <p className="text-muted-foreground">Nog geen e-mailgebeurtenissen.</p>
      )}
      <Button
        className="mt-2"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await notifySupportChange(ticketId);
            await load();
          } finally {
            setBusy(false);
          }
        }}
      >
        Wachtrij verwerken / status verversen
      </Button>
    </div>
  );
}
