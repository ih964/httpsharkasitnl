import assert from "node:assert/strict";
import test from "node:test";
import {
  IT_QUICK_SCAN_PRIVACY_VERSION,
  createAssessmentSubmissionKey,
  getAssessmentSubmissionErrorMessage,
} from "./assessmentSecurity.ts";

test("uses a fixed privacy notice version", () => {
  assert.equal(IT_QUICK_SCAN_PRIVACY_VERSION, "2026-07-15");
});

test("creates distinct submission keys", () => {
  const first = createAssessmentSubmissionKey();
  const second = createAssessmentSubmissionKey();
  assert.ok(first.length >= 16);
  assert.ok(second.length >= 16);
  assert.notEqual(first, second);
});

test("maps rate limits and bot protection to user-friendly messages", () => {
  assert.match(getAssessmentSubmissionErrorMessage("rate limit exceeded"), /te veel scanverzoeken/i);
  assert.match(getAssessmentSubmissionErrorMessage("bot submission rejected"), /spambeveiliging/i);
});

test("uses a safe generic fallback", () => {
  assert.match(getAssessmentSubmissionErrorMessage("unexpected database failure"), /info@harkasit\.nl/i);
});
