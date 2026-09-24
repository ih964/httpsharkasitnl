export type FollowUpBucket = "overdue" | "today" | "upcoming" | "later" | "unscheduled";

const startOfDay = (value: Date): Date => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const classifyFollowUp = (
  followUpAt: string | null,
  now = new Date(),
): FollowUpBucket => {
  if (!followUpAt) return "unscheduled";

  const followUp = new Date(followUpAt);
  if (Number.isNaN(followUp.getTime())) return "unscheduled";

  const today = startOfDay(now);
  const followUpDay = startOfDay(followUp);
  const diffDays = Math.round((followUpDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "upcoming";
  return "later";
};

export const formatFollowUpLabel = (followUpAt: string | null, now = new Date()): string => {
  const bucket = classifyFollowUp(followUpAt, now);
  if (bucket === "unscheduled") return "Niet gepland";
  if (bucket === "overdue") return "Te laat";
  if (bucket === "today") return "Vandaag";
  if (bucket === "upcoming") return "Binnen 7 dagen";
  return "Later";
};
