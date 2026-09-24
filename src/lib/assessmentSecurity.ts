export const IT_QUICK_SCAN_PRIVACY_VERSION = "2026-07-15";

export const createAssessmentSubmissionKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(16).slice(2);
  return `fallback-${Date.now()}-${random}`;
};

export const getAssessmentSubmissionErrorMessage = (message?: string): string => {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("rate limit exceeded")) {
    return "Er zijn te veel scanverzoeken gedaan. Probeer het over ongeveer een uur opnieuw.";
  }
  if (normalized.includes("bot submission rejected")) {
    return "De inzending is door de spambeveiliging geblokkeerd. Vernieuw de pagina en probeer opnieuw.";
  }
  if (normalized.includes("privacy notice version required")) {
    return "De privacytoestemming kon niet worden vastgelegd. Vernieuw de pagina en probeer opnieuw.";
  }
  if (normalized.includes("payload") || normalized.includes("invalid answers")) {
    return "De scan bevat ongeldige of te grote gegevens. Start de scan opnieuw.";
  }
  if (normalized.includes("submission key required")) {
    return "De beveiligde inzendsessie is verlopen. Start de scan opnieuw.";
  }

  return "Opslaan is niet gelukt. Probeer het later opnieuw of neem contact op via info@harkasit.nl.";
};
