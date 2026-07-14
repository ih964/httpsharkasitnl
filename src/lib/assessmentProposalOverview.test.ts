import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProposalValidity,
  formatProposalStatus,
  formatProposalValidity,
  isProposalStatus,
} from "./assessmentProposalOverview.ts";

const now = new Date("2026-07-15T10:00:00.000Z");

test("formats internal proposal statuses", () => {
  assert.equal(formatProposalStatus("draft"), "Concept");
  assert.equal(formatProposalStatus("reviewed"), "Gecontroleerd");
  assert.equal(formatProposalStatus("approved"), "Goedgekeurd");
});

test("classifies proposal validity", () => {
  assert.equal(classifyProposalValidity(null, now), "no-date");
  assert.equal(classifyProposalValidity("2026-07-14", now), "expired");
  assert.equal(classifyProposalValidity("2026-07-15", now), "expiring");
  assert.equal(classifyProposalValidity("2026-07-22", now), "expiring");
  assert.equal(classifyProposalValidity("2026-07-23", now), "valid");
});

test("formats proposal validity labels", () => {
  assert.equal(formatProposalValidity("2026-07-14", now), "Verlopen");
  assert.equal(formatProposalValidity("2026-07-20", now), "Verloopt binnen 7 dagen");
  assert.equal(formatProposalValidity("2026-08-01", now), "Geldig");
});

test("accepts only supported proposal statuses", () => {
  assert.equal(isProposalStatus("draft"), true);
  assert.equal(isProposalStatus("reviewed"), true);
  assert.equal(isProposalStatus("approved"), true);
  assert.equal(isProposalStatus("sent"), false);
});
