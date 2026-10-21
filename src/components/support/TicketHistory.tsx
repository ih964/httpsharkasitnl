import { useEffect, useState } from "react";
import { portalSupabase } from "@/integrations/supabase/client";
import {
  formatTicketDate,
  ticketStatuses,
  ticketPriorities,
  treatmentGroups,
  ticketCategories,
} from "@/lib/support";

type Entry = {
  id: string;
  kind: string;
  details: Record<string, unknown>;
  created_at: string;
};
const labels: Record<string, string> = {
  created: "Melding aangemaakt",
  customer_reply: "Klantreactie toegevoegd",
  staff_reply: "Antwoord van Harkas IT",
  status_changed: "Status gewijzigd",
  priority_changed: "Prioriteit gewijzigd",
  assignee_changed: "Behandelaar gewijzigd",
  details_changed: "Ticketgegevens gewijzigd",
  attachment_added: "Bijlage toegevoegd",
};
export default function TicketHistory({
  ticketId,
  version,
}: {
  ticketId: string;
  version: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void portalSupabase
      .from("support_ticket_history")
      .select("id,kind,details,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (active) {
          setEntries((data ?? []) as Entry[]);
          setError(!!error);
        }
      });
    return () => {
      active = false;
    };
  }, [ticketId, version]);
  const display = (v: unknown) => {
    const s = v == null ? "Niet ingesteld" : String(v);
    return (
      (
        {
          ...ticketStatuses,
          ...ticketPriorities,
          ...treatmentGroups,
          ...ticketCategories,
        } as Record<string, string>
      )[s] ?? s
    );
  };
  return (
    <details className="rounded-xl border p-3">
      <summary className="cursor-pointer font-semibold">
        Wijzigingshistorie
      </summary>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Historie ophalen mislukt.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nieuwe klantzichtbare gebeurtenissen verschijnen hier.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="border-l-2 pl-3 text-sm">
              <p className="font-medium">{labels[e.kind] ?? e.kind}</p>
              <p className="text-xs text-muted-foreground">
                {formatTicketDate(e.created_at)}
              </p>
              {e.details.field != null && <p>{String(e.details.field)}</p>}
              {e.details.new != null && (
                <p className="whitespace-pre-wrap break-words">
                  {display(e.details.old)} → {display(e.details.new)}
                </p>
              )}
              {e.details.filename != null && (
                <p>{String(e.details.filename)}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
