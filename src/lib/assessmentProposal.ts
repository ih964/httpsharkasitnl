export type ProposalRecommendation = {
  category: string;
  recommendation: string;
  answer_score: number;
};

export type AssessmentProposalInput = {
  companyName: string;
  contactName: string;
  totalScore: number;
  employeeCount: number | null;
  recommendations: ProposalRecommendation[];
};

export type AssessmentProposal = {
  subject: string;
  summary: string;
  scopeItems: Array<{
    category: string;
    service: string;
    priority: "direct" | "hoog" | "normaal";
    recommendation: string;
  }>;
  emailBody: string;
};

const serviceByCategory: Record<string, string> = {
  Beveiliging: "Security-basis en accountbeveiliging",
  "Back-up": "Back-up- en herstelvoorzieningen",
  Werkplekken: "Beheer en beveiliging van werkplekken",
  "Microsoft 365": "Microsoft 365-beheer en governance",
};

const priorityForScore = (score: number): "direct" | "hoog" | "normaal" => {
  if (score <= 0) return "direct";
  if (score <= 50) return "hoog";
  return "normaal";
};

export const buildAssessmentProposal = ({
  companyName,
  contactName,
  totalScore,
  employeeCount,
  recommendations,
}: AssessmentProposalInput): AssessmentProposal => {
  const uniqueItems = recommendations
    .filter((item) => item.recommendation.trim().length > 0)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.category === item.category && candidate.recommendation === item.recommendation) === index)
    .slice(0, 5)
    .map((item) => ({
      category: item.category,
      service: serviceByCategory[item.category] ?? `${item.category}-verbetering`,
      priority: priorityForScore(item.answer_score),
      recommendation: item.recommendation,
    }));

  const companyContext = employeeCount
    ? `${companyName} heeft ongeveer ${employeeCount} medewerker${employeeCount === 1 ? "" : "s"}.`
    : `${companyName} heeft het aantal medewerkers nog niet opgegeven.`;

  const summary = `De IT Quick Scan van ${companyName} komt uit op ${totalScore}/100. ${companyContext} De scan is indicatief; een technische intake is nodig om de huidige inrichting, licenties en werkelijke risico's te bevestigen.`;

  const scopeText = uniqueItems.length > 0
    ? uniqueItems.map((item, index) => `${index + 1}. ${item.service} (${item.priority})\n   ${item.recommendation}`).join("\n\n")
    : "Er zijn geen directe verbeterpunten uit de vragenlijst gekomen. Een periodieke technische controle blijft aanbevolen.";

  const subject = `Vervolg op IT Quick Scan - ${companyName}`;
  const emailBody = [
    `Beste ${contactName},`,
    "",
    `Bedankt voor het invullen van de IT Quick Scan. Jullie indicatieve score is ${totalScore}/100.`,
    "",
    "Op basis van de antwoorden adviseren we om de volgende onderdelen te bespreken:",
    "",
    scopeText,
    "",
    "De scan is geen technische audit. Tijdens een vrijblijvende intake controleren we eerst de omgeving en bepalen we welke maatregelen echt nodig zijn. Daarna ontvang je pas een concrete aanpak en prijsopgave.",
    "",
    "Met vriendelijke groet,",
    "Harkas IT",
  ].join("\n");

  return { subject, summary, scopeItems: uniqueItems, emailBody };
};
