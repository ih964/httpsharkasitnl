import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionProposalStatus,
  classifyProposalValidity,
  formatProposalStatus,
  formatProposalValidity,
  getAllowedProposalTransitions,
  isProposalOutcomeStatus,
  isProposalStatus,
} from "./assessmentProposalOverview.ts";

const now = new Date("2026-07-15T10:00:00.000Z");

test("formats all proposal lifecycle statuses", () => {
  assert.equal(formatProposalStatus("draft"), "Concept");
  assert.equal(formatProposalStatus("reviewed"), "Gecontroleerd");
  assert.equal(formatProposalStatus("approved"), "Goedgekeurd");
  assert.equal(formatProposalStatus("sent"), "Verzonden");
  assert.equal(formatProposalStatus("accepted"), "Geaccepteerd");
  assert.equal(formatProposalStatus("rejected"), "Geweigerd");
});

test("enforces safe proposal transitions", () => {
  assert.equal(canTransitionProposalStatus("draft", "reviewed"), true);
  assert.equal(canTransitionProposalStatus("draft", "approved"), false);
  assert.equal(canTransitionProposalStatus("reviewed", "approved"), true);
  assert.equal(canTransitionProposalStatus("approved", "sent"), true);
  assert.equal(canTransitionProposalStatus("sent", "accepted"), true);
  assert.equal(canTransitionProposalStatus("sent", "rejected"), true);
  assert.equal(canTransitionProposalStatus("accepted", "sent"), false);
  assert.deepEqual(getAllowedProposalTransitions("sent"), ["sent", "draft", "accepted", "rejected"]);
});

test("recognizes customer outcome statuses", () => {
  assert.equal(isProposalOutcomeStatus("accepted"), true);
  assert.equal(isProposalOutcomeStatus("rejected"), true);
  assert.equal(isProposalOutcomeStatus("sent"), false);
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
  for (const status of ["draft", "reviewed", "approved", "sent", "accepted", "rejected"]) {
    assert.equal(isProposalStatus(status), true);
  }
  assert.equal(isProposalStatus("cancelled"), false);
});
