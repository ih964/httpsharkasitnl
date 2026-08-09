import { calculateQuoteTotals, validateQuoteLines, type AssessmentQuoteLine } from "./assessmentQuote.ts";

export type AssessmentQuoteDocumentInput = {
  companyName: string;
  contactName: string;
  email: string;
  title: string;
  introduction: string;
  validUntil: string;
  notes: string;
  lines: AssessmentQuoteLine[];
};

export type AssessmentQuoteDocumentLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercentage: 0 | 9 | 21;
  lineSubtotal: number;
};

export type AssessmentQuoteDocument = {
  companyName: string;
  contactName: string;
  email: string;
  title: string;
  introduction: string;
  validUntil: string | null;
  notes: string;
  lines: AssessmentQuoteDocumentLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  filename: string;
};

export type AssessmentQuoteDocumentResult = {
  valid: boolean;
  errors: string[];
  document?: AssessmentQuoteDocument;
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const sanitizeQuoteFilenamePart = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "klant";
};

export const buildAssessmentQuoteDocument = (
  input: AssessmentQuoteDocumentInput,
): AssessmentQuoteDocumentResult => {
  const errors: string[] = [];
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const email = input.email.trim().toLowerCase();
  const title = input.title.trim();
  const introduction = input.introduction.trim();
  const notes = input.notes.trim();
  const lineValidation = validateQuoteLines(input.lines);

  if (companyName.length < 2) errors.push("Bedrijfsnaam ontbreekt.");
  if (contactName.length < 2) errors.push("Contactnaam ontbreekt.");
  if (!email.includes("@")) errors.push("E-mailadres ontbreekt of is ongeldig.");
  if (title.length < 3 || title.length > 180) errors.push("Titel moet tussen 3 en 180 tekens bevatten.");
  errors.push(...lineValidation.errors);

  let validUntil: string | null = null;
  if (input.validUntil) {
    const parsed = new Date(`${input.validUntil}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) errors.push("Geldigheidsdatum is ongeldig.");
    else validUntil = input.validUntil;
  }

  if (errors.length > 0) return { valid: false, errors };

  const totals = calculateQuoteTotals(lineValidation.lines);
  const lines = lineValidation.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    vatPercentage: line.vatPercentage,
    lineSubtotal: roundMoney(line.quantity * line.unitPrice),
  }));

  return {
    valid: true,
    errors: [],
    document: {
      companyName,
      contactName,
      email,
      title,
      introduction,
      validUntil,
      notes,
      lines,
      ...totals,
      filename: `Conceptofferte-${sanitizeQuoteFilenamePart(companyName)}.pdf`,
    },
  };
};
