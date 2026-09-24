import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQuoteTotals,
  createSuggestedQuoteLines,
  toQuoteRpcLines,
  validateQuoteLines,
} from "./assessmentQuote.ts";

test("creates price-free suggestions from unique recommendations", () => {
  const lines = createSuggestedQuoteLines([
    { question_id: "mfa", recommendation: "MFA verplicht instellen" },
    { question_id: "mfa-2", recommendation: "MFA verplicht instellen" },
    { question_id: "backup", recommendation: "Onafhankelijke back-up inrichten" },
  ]);

  assert.equal(lines.length, 2);
  assert.equal(lines[0].unitPrice, 0);
  assert.equal(lines[0].quantity, 1);
  assert.equal(lines[0].vatPercentage, 21);
});

test("calculates subtotal, vat and total without floating point drift", () => {
  const totals = calculateQuoteTotals([
    { id: "1", description: "Beheer", quantity: 2, unitPrice: 99.95, vatPercentage: 21 },
    { id: "2", description: "Training", quantity: 1, unitPrice: 50, vatPercentage: 9 },
  ]);

  assert.deepEqual(totals, {
    subtotal: 249.9,
    vatTotal: 46.48,
    total: 296.38,
  });
});

test("rejects unsafe or incomplete lines", () => {
  const result = validateQuoteLines([
    { id: "1", description: "", quantity: 0, unitPrice: -1, vatPercentage: 21 },
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test("maps validated lines to RPC field names", () => {
  assert.deepEqual(toQuoteRpcLines([
    { id: "1", description: "Werkplekbeheer", quantity: 3, unitPrice: 75, vatPercentage: 21 },
  ]), [{
    id: "1",
    description: "Werkplekbeheer",
    quantity: 3,
    unit_price: 75,
    vat_percentage: 21,
  }]);
});
