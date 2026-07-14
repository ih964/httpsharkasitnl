export type ProposalStatus = "draft" | "reviewed" | "approved";
export type ProposalValidity = "expired" | "expiring" | "valid" | "no-date";

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Concept",
  reviewed: "Gecontroleerd",
  approved: "Goedgekeurd",
};

export const formatProposalStatus = (status: ProposalStatus): string => statusLabels[status];

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
  value === "draft" || value === "reviewed" || value === "approved";
