export type AssessmentLeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  employeeCount?: string | number | null;
  consentReport: boolean;
  consentMarketing: boolean;
};

export type AssessmentLeadValidationResult = {
  valid: boolean;
  errors: Partial<Record<"companyName" | "contactName" | "email" | "phone" | "employeeCount" | "consentReport", string>>;
  normalized?: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    employeeCount: number | null;
    consentReport: true;
    consentMarketing: boolean;
  };
};

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const phonePattern = /^[0-9+()\-\s.]{7,40}$/;

export const validateAssessmentLead = (input: AssessmentLeadInput): AssessmentLeadValidationResult => {
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = (input.phone ?? "").trim();
  const errors: AssessmentLeadValidationResult["errors"] = {};

  if (companyName.length < 2 || companyName.length > 120) {
    errors.companyName = "Vul een geldige bedrijfsnaam in.";
  }

  if (contactName.length < 2 || contactName.length > 120) {
    errors.contactName = "Vul een geldige contactnaam in.";
  }

  if (!emailPattern.test(email) || email.length > 180) {
    errors.email = "Vul een geldig e-mailadres in.";
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = "Vul een geldig telefoonnummer in.";
  }

  let employeeCount: number | null = null;
  if (input.employeeCount !== undefined && input.employeeCount !== null && String(input.employeeCount).trim() !== "") {
    employeeCount = Number(input.employeeCount);
    if (!Number.isInteger(employeeCount) || employeeCount < 1 || employeeCount > 10000) {
      errors.employeeCount = "Aantal medewerkers moet tussen 1 en 10.000 liggen.";
    }
  }

  if (!input.consentReport) {
    errors.consentReport = "Toestemming voor het verwerken van het rapport is verplicht.";
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: {},
    normalized: {
      companyName,
      contactName,
      email,
      phone: phone || null,
      employeeCount,
      consentReport: true,
      consentMarketing: input.consentMarketing,
    },
  };
};
