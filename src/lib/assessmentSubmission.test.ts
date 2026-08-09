import assert from "node:assert/strict";
import test from "node:test";
import { buildItQuickScanSubmission } from "./assessmentSubmission.ts";

test("builds normalized and security-hardened RPC arguments", () => {
  const payload = buildItQuickScanSubmission({
    submissionKey: "11111111-1111-4111-8111-111111111111",
    honeypot: "",
    privacyNoticeVersion: "2026-07-15",
    normalizedLead: {
      companyName: "Voorbeeld BV",
      contactName: "Ilias Harkati",
      email: "info@voorbeeld.nl",
      phone: "+31 6 12345678",
      employeeCount: 12,
      consentReport: true,
      consentMarketing: false,
    },
    totalScore: 63,
    riskLevel: "medium",
    answers: { mfa: 100, backup: 25 },
    categoryScores: [
      { category: "Beveiliging", value: 75 },
      { category: "Back-up", value: 25 },
    ],
    recommendations: [
      { category: "Back-up", questionId: "backup", recommendation: "Maak een onafhankelijke back-up.", answerScore: 25 },
    ],
  });

  assert.deepEqual(payload, {
    p_submission_key: "11111111-1111-4111-8111-111111111111",
    p_honeypot: "",
    p_privacy_notice_version: "2026-07-15",
    p_company_name: "Voorbeeld BV",
    p_contact_name: "Ilias Harkati",
    p_email: "info@voorbeeld.nl",
    p_phone: "+31 6 12345678",
    p_employee_count: 12,
    p_consent_report: true,
    p_consent_marketing: false,
    p_total_score: 63,
    p_risk_level: "medium",
    p_answers: { mfa: 100, backup: 25 },
    p_category_scores: { Beveiliging: 75, "Back-up": 25 },
    p_recommendations: [
      { category: "Back-up", question_id: "backup", recommendation: "Maak een onafhankelijke back-up.", answer_score: 25 },
    ],
  });
});
