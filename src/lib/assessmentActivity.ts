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

  if (event.event_type === "lead_updated") return "Leadgegevens bijgewerkt";
  return "Activiteit geregistreerd";
};
