export type AssessmentQuoteLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercentage: 0 | 9 | 21;
};

export type AssessmentQuoteTotals = {
  subtotal: number;
  vatTotal: number;
  total: number;
};

export type AssessmentQuoteValidation = {
  valid: boolean;
  errors: string[];
  lines: AssessmentQuoteLine[];
};

type RecommendationInput = {
  question_id?: string;
  recommendation: string;
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const createSuggestedQuoteLines = (recommendations: RecommendationInput[]): AssessmentQuoteLine[] => {
  const seen = new Set<string>();

  return recommendations
    .filter((item) => {
      const key = item.recommendation.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((item, index) => ({
      id: item.question_id || `suggestion-${index + 1}`,
      description: item.recommendation.trim(),
      quantity: 1,
      unitPrice: 0,
      vatPercentage: 21,
    }));
};

export const validateQuoteLines = (input: AssessmentQuoteLine[]): AssessmentQuoteValidation => {
  const errors: string[] = [];

  if (input.length === 0) errors.push("Voeg minimaal één offertelijn toe.");
  if (input.length > 20) errors.push("Een conceptofferte mag maximaal 20 regels bevatten.");

  const lines = input.slice(0, 20).map((line, index) => {
    const description = line.description.trim();
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const vatPercentage = Number(line.vatPercentage) as AssessmentQuoteLine["vatPercentage"];

    if (description.length < 2 || description.length > 240) {
      errors.push(`Regel ${index + 1}: vul een omschrijving van 2 tot 240 tekens in.`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) {
      errors.push(`Regel ${index + 1}: aantal moet groter dan 0 en maximaal 10.000 zijn.`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1000000) {
      errors.push(`Regel ${index + 1}: prijs moet tussen €0 en €1.000.000 liggen.`);
    }
    if (![0, 9, 21].includes(vatPercentage)) {
      errors.push(`Regel ${index + 1}: kies 0%, 9% of 21% btw.`);
    }

    return {
      id: line.id || `line-${index + 1}`,
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      vatPercentage,
    };
  });

  return { valid: errors.length === 0, errors, lines };
};

export const calculateQuoteTotals = (lines: AssessmentQuoteLine[]): AssessmentQuoteTotals => {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const vatTotal = lines.reduce(
    (sum, line) => sum + (line.quantity * line.unitPrice * line.vatPercentage) / 100,
    0,
  );

  return {
    subtotal: roundMoney(subtotal),
    vatTotal: roundMoney(vatTotal),
    total: roundMoney(subtotal + vatTotal),
  };
};

export const toQuoteRpcLines = (lines: AssessmentQuoteLine[]) => lines.map((line) => ({
  id: line.id,
  description: line.description,
  quantity: line.quantity,
  unit_price: line.unitPrice,
  vat_percentage: line.vatPercentage,
}));
