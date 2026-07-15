export type ProposalStatus = "draft" | "reviewed" | "approved" | "sent" | "accepted" | "rejected";
export type ProposalValidity = "expired" | "expiring" | "valid" | "no-date";

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Concept",
  reviewed: "Gecontroleerd",
  approved: "Goedgekeurd",
  sent: "Verzonden",
  accepted: "Geaccepteerd",
  rejected: "Geweigerd",
};

const allowedTransitions: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["reviewed"],
  reviewed: ["draft", "approved"],
  approved: ["draft", "reviewed", "sent"],
  sent: ["draft", "accepted", "rejected"],
  accepted: ["draft"],
  rejected: ["draft"],
};

export const formatProposalStatus = (status: ProposalStatus): string => statusLabels[status];

export const getAllowedProposalTransitions = (status: ProposalStatus): ProposalStatus[] => [
  status,
  ...allowedTransitions[status],
];

export const canTransitionProposalStatus = (from: ProposalStatus, to: ProposalStatus): boolean =>
  from === to || allowedTransitions[from].includes(to);

export const isProposalOutcomeStatus = (status: ProposalStatus): boolean =>
  status === "accepted" || status === "rejected";

const startOfDay = (value: Date): Date => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const classifyProposalValidity = (
  validUntil: string | null,
  now = new Date(),
): ProposalValidity => {
  if (!validUntil) return "no-date";

  const parsed = new Date(`${validUntil}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "no-date";

  const diffDays = Math.round(
    (startOfDay(parsed).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring";
  return "valid";
};

export const formatProposalValidity = (
  validUntil: string | null,
  now = new Date(),
): string => {
  const validity = classifyProposalValidity(validUntil, now);
  if (validity === "expired") return "Verlopen";
  if (validity === "expiring") return "Verloopt binnen 7 dagen";
  if (validity === "valid") return "Geldig";
  return "Geen geldigheidsdatum";
};

export const isProposalStatus = (value: string): value is ProposalStatus =>
  ["draft", "reviewed", "approved", "sent", "accepted", "rejected"].includes(value);
