export type AssessmentActivityEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "Nieuw",
  contacted: "Benaderd",
  qualified: "Gekwalificeerd",
  won: "Klant",
  lost: "Verloren",
};

const proposalStatusLabels: Record<string, string> = {
  draft: "Concept",
  reviewed: "Gecontroleerd",
  approved: "Goedgekeurd",
  sent: "Verzonden",
  accepted: "Geaccepteerd",
  rejected: "Geweigerd",
};

const formatCurrency = (value: unknown): string | null => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
};

const formatProposalTransition = (metadata: Record<string, unknown>): string => {
  const from = proposalStatusLabels[String(metadata.status_from)] ?? String(metadata.status_from ?? "onbekend");
  const to = proposalStatusLabels[String(metadata.status_to)] ?? String(metadata.status_to ?? "onbekend");
  const recipient = String(metadata.sent_to ?? "").trim();

  if (metadata.status_to === "sent") {
    return recipient ? `Offerte handmatig verzonden naar ${recipient}` : "Offerte handmatig verzonden";
  }
  if (metadata.status_to === "accepted") return "Offerte door klant geaccepteerd";
  if (metadata.status_to === "rejected") return "Offerte door klant geweigerd";
  return `Offertestatus gewijzigd van ${from} naar ${to}`;
};

export const formatAssessmentActivity = (event: AssessmentActivityEvent): string => {
  const metadata = event.metadata ?? {};

  if (event.event_type === "submitted") return "IT-scan ingediend";

  if (event.event_type === "status_updated") {
    const from = statusLabels[String(metadata.status_from)] ?? String(metadata.status_from ?? "onbekend");
    const to = statusLabels[String(metadata.status_to)] ?? String(metadata.status_to ?? "onbekend");
    return `Status gewijzigd van ${from} naar ${to}`;
  }

  if (event.event_type === "follow_up_updated") {
    const notesChanged = metadata.notes_changed === true;
    const followUpChanged = metadata.follow_up_from !== metadata.follow_up_to;
    if (notesChanged && followUpChanged) return "Notities en opvolgdatum bijgewerkt";
    if (notesChanged) return "Interne notities bijgewerkt";
    if (followUpChanged) return "Opvolgdatum bijgewerkt";
    return "Opvolging bijgewerkt";
  }

  if (event.event_type === "converted_to_customer") {
    return metadata.reused_existing_customer === true
      ? "Lead gekoppeld aan bestaande klant"
      : "Lead omgezet naar nieuwe klant";
  }

  if (event.event_type === "proposal_draft_saved") {
    const total = formatCurrency(metadata.total);
    const lineCount = Number(metadata.line_count);
    const lines = Number.isFinite(lineCount) ? ` met ${lineCount} ${lineCount === 1 ? "regel" : "regels"}` : "";
    return total ? `Conceptofferte opgeslagen${lines} · ${total}` : `Conceptofferte opgeslagen${lines}`;
  }

  if (event.event_type === "proposal_status_updated" || event.event_type === "proposal_lifecycle_updated") {
    return formatProposalTransition(metadata);
  }

  if (event.event_type === "lead_updated") return "Leadgegevens bijgewerkt";
  return "Activiteit geregistreerd";
};
