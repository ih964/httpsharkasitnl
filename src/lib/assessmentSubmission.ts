import type { AssessmentAnswerMap, AssessmentRecommendation, CategoryScore } from "./assessmentScoring";
import type { AssessmentLeadValidationResult } from "./assessmentLeadValidation";

export type SubmitItQuickScanArgs = {
  p_submission_key: string;
  p_honeypot: string;
  p_privacy_notice_version: string;
  p_company_name: string;
  p_contact_name: string;
  p_email: string;
  p_phone: string | null;
  p_employee_count: number | null;
  p_consent_report: true;
  p_consent_marketing: boolean;
  p_total_score: number;
  p_risk_level: "low" | "medium" | "high";
  p_answers: AssessmentAnswerMap;
  p_category_scores: Record<string, number>;
  p_recommendations: Array<{
    category: string;
    question_id: string;
    recommendation: string;
    answer_score: number;
  }>;
};

type BuildSubmissionInput = {
  submissionKey: string;
  honeypot: string;
  privacyNoticeVersion: string;
  normalizedLead: NonNullable<AssessmentLeadValidationResult["normalized"]>;
  totalScore: number;
  riskLevel: "low" | "medium" | "high";
  answers: AssessmentAnswerMap;
  categoryScores: CategoryScore[];
  recommendations: AssessmentRecommendation[];
};

export const buildItQuickScanSubmission = ({
  submissionKey,
  honeypot,
  privacyNoticeVersion,
  normalizedLead,
  totalScore,
  riskLevel,
  answers,
  categoryScores,
  recommendations,
}: BuildSubmissionInput): SubmitItQuickScanArgs => ({
  p_submission_key: submissionKey,
  p_honeypot: honeypot,
  p_privacy_notice_version: privacyNoticeVersion,
  p_company_name: normalizedLead.companyName,
  p_contact_name: normalizedLead.contactName,
  p_email: normalizedLead.email,
  p_phone: normalizedLead.phone,
  p_employee_count: normalizedLead.employeeCount,
  p_consent_report: true,
  p_consent_marketing: normalizedLead.consentMarketing,
  p_total_score: totalScore,
  p_risk_level: riskLevel,
  p_answers: { ...answers },
  p_category_scores: Object.fromEntries(categoryScores.map(({ category, value }) => [category, value])),
  p_recommendations: recommendations.map((item) => ({
    category: item.category,
    question_id: item.questionId,
    recommendation: item.recommendation,
    answer_score: item.answerScore,
  })),
});
