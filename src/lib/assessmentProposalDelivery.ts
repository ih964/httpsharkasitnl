import type { ProposalStatus } from "./assessmentProposalOverview";

export type AssessmentProposalDeliveryInput = {
  companyName: string;
  contactName: string;
  email: string;
  title: string;
  total: number;
  validUntil: string | null;
  status: ProposalStatus;
};

export type AssessmentProposalDelivery = {
  valid: boolean;
  approvedForSending: boolean;
  errors: string[];
  subject: string;
  body: string;
  mailto: string;
  attachmentReminder: string;
};

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const formatCurrency = (value: number): string => new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
}).format(value);

const formatDate = (value: string | null): string => {
  if (!value) return "zoals onderling afgestemd";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "zoals onderling afgestemd";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(parsed);
};

export const buildAssessmentProposalDelivery = (
  input: AssessmentProposalDeliveryInput,
): AssessmentProposalDelivery => {
  const errors: string[] = [];
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const email = input.email.trim().toLowerCase();
  const title = input.title.trim();
  const total = Number(input.total);

  if (companyName.length < 2) errors.push("Bedrijfsnaam ontbreekt.");
  if (contactName.length < 2) errors.push("Contactnaam ontbreekt.");
  if (!emailPattern.test(email)) errors.push("E-mailadres ontbreekt of is ongeldig.");
  if (title.length < 3) errors.push("Offertetitel ontbreekt.");
  if (!Number.isFinite(total) || total < 0) errors.push("Offertetotaal is ongeldig.");

  const approvedForSending = input.status === "approved";
  const subject = `Offerte ${title} | Harkas IT`;
  const attachmentReminder = "Download eerst de PDF en voeg deze handmatig als bijlage toe voordat je de e-mail verstuurt.";
  const body = [
    `Beste ${contactName || "relatie"},`,
    "",
    `Naar aanleiding van onze IT Quick Scan en het vervolggesprek stuur ik je hierbij de offerte voor ${companyName || "jullie organisatie"}.`,
    "",
    `Offerte: ${title || "IT-dienstverlening"}`,
    `Totaal inclusief btw: ${Number.isFinite(total) ? formatCurrency(total) : "controle vereist"}`,
    `Geldig tot: ${formatDate(input.validUntil)}`,
    "",
    "De exacte uitvoering, planning en technische randvoorwaarden stemmen we vóór de start samen af.",
    "",
    "Let op: voeg de gedownloade offerte-PDF handmatig als bijlage toe aan deze e-mail.",
    "",
    "Met vriendelijke groet,",
    "Ilias Harkati",
    "Harkas IT",
    "info@harkasit.nl",
    "085 124 9091",
  ].join("\n");

  return {
    valid: errors.length === 0,
    approvedForSending,
    errors,
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    attachmentReminder,
  };
};
