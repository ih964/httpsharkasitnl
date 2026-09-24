import assert from "node:assert/strict";
import test from "node:test";
import { buildAssessmentProposalDelivery } from "./assessmentProposalDelivery.ts";

test("prepares an approved customer email without claiming automatic delivery", () => {
  const result = buildAssessmentProposalDelivery({
    companyName: "Voorbeeld BV",
    contactName: "Jan Jansen",
    email: "JAN@VOORBEELD.NL",
    title: "IT-beheer en Microsoft 365",
    total: 1210,
    validUntil: "2026-08-01",
    status: "approved",
  });

  assert.equal(result.valid, true);
  assert.equal(result.approvedForSending, true);
  assert.match(result.subject, /Offerte IT-beheer/);
  assert.match(result.body, /1\.210,00/);
  assert.match(result.body, /handmatig als bijlage/);
  assert.doesNotMatch(result.body, /automatisch verzonden/i);
});

test("does not mark draft or reviewed proposals as ready for sending", () => {
  for (const status of ["draft", "reviewed"] as const) {
    const result = buildAssessmentProposalDelivery({
      companyName: "Voorbeeld BV",
      contactName: "Jan Jansen",
      email: "jan@voorbeeld.nl",
      title: "IT-voorstel",
      total: 0,
      validUntil: null,
      status,
    });
    assert.equal(result.approvedForSending, false);
  }
});

test("rejects incomplete customer data", () => {
  const result = buildAssessmentProposalDelivery({
    companyName: "",
    contactName: "",
    email: "niet-geldig",
    title: "x",
    total: Number.NaN,
    validUntil: null,
    status: "approved",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 4);
});
