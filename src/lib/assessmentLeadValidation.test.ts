import assert from "node:assert/strict";
import test from "node:test";
import { validateAssessmentLead } from "./assessmentLeadValidation.ts";

test("accepts and normalizes a valid lead", () => {
  const result = validateAssessmentLead({
    companyName: "  Voorbeeld BV  ",
    contactName: "  Jan Jansen ",
    email: " JAN@EXAMPLE.COM ",
    phone: "+31 6 12345678",
    employeeCount: "12",
    consentReport: true,
    consentMarketing: false,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.normalized, {
    companyName: "Voorbeeld BV",
    contactName: "Jan Jansen",
    email: "jan@example.com",
    phone: "+31 6 12345678",
    employeeCount: 12,
    consentReport: true,
    consentMarketing: false,
  });
});

test("rejects missing required fields and consent", () => {
  const result = validateAssessmentLead({
    companyName: "",
    contactName: "",
    email: "niet-geldig",
    consentReport: false,
    consentMarketing: false,
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.companyName);
  assert.ok(result.errors.contactName);
  assert.ok(result.errors.email);
  assert.ok(result.errors.consentReport);
});

test("rejects invalid employee counts", () => {
  for (const value of ["0", "1.5", "10001", "abc"]) {
    const result = validateAssessmentLead({
      companyName: "Voorbeeld BV",
      contactName: "Jan Jansen",
      email: "jan@example.com",
      employeeCount: value,
      consentReport: true,
      consentMarketing: false,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.employeeCount);
  }
});

test("allows an empty optional phone number but rejects malformed values", () => {
  const valid = validateAssessmentLead({
    companyName: "Voorbeeld BV",
    contactName: "Jan Jansen",
    email: "jan@example.com",
    phone: "",
    consentReport: true,
    consentMarketing: false,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized?.phone, null);

  const invalid = validateAssessmentLead({
    companyName: "Voorbeeld BV",
    contactName: "Jan Jansen",
    email: "jan@example.com",
    phone: "bel-mij",
    consentReport: true,
    consentMarketing: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.phone);
});
