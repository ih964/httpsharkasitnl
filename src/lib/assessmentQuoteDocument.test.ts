import assert from "node:assert/strict";
import test from "node:test";
import { buildAssessmentQuoteDocument, sanitizeQuoteFilenamePart } from "./assessmentQuoteDocument.ts";

const validInput = {
  companyName: "Voorbeeld & Zonen B.V.",
  contactName: "Jan Jansen",
  email: "JAN@EXAMPLE.COM",
  title: "Conceptvoorstel IT-beheer",
  introduction: "Voorstel na aanleiding van de IT Quick Scan.",
  validUntil: "2026-08-01",
  notes: "Alleen intern.",
  lines: [
    { id: "1", description: "Microsoft 365 beveiligingsinrichting", quantity: 2, unitPrice: 100, vatPercentage: 21 as const },
    { id: "2", description: "Back-upcontrole", quantity: 1, unitPrice: 50, vatPercentage: 9 as const },
  ],
};

test("builds a normalized quote document with totals", () => {
  const result = buildAssessmentQuoteDocument(validInput);

  assert.equal(result.valid, true);
  assert.equal(result.document?.email, "jan@example.com");
  assert.equal(result.document?.subtotal, 250);
  assert.equal(result.document?.vatTotal, 46.5);
  assert.equal(result.document?.total, 296.5);
  assert.equal(result.document?.filename, "Conceptofferte-Voorbeeld-Zonen-B-V.pdf");
  assert.equal(result.document?.lines[0].lineSubtotal, 200);
});

test("keeps manually entered zero prices without inventing amounts", () => {
  const result = buildAssessmentQuoteDocument({
    ...validInput,
    lines: [{ id: "1", description: "Technische intake", quantity: 1, unitPrice: 0, vatPercentage: 21 as const }],
  });

  assert.equal(result.valid, true);
  assert.equal(result.document?.total, 0);
});

test("rejects invalid customer data and quote lines", () => {
  const result = buildAssessmentQuoteDocument({
    ...validInput,
    companyName: "",
    email: "geen-email",
    title: "x",
    lines: [{ id: "1", description: "", quantity: 0, unitPrice: -1, vatPercentage: 21 as const }],
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 4);
});

test("sanitizes customer names for safe filenames", () => {
  assert.equal(sanitizeQuoteFilenamePart("  Café / Test?!  "), "Cafe-Test");
  assert.equal(sanitizeQuoteFilenamePart("***"), "klant");
});
