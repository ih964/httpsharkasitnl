export type AssessmentQuestion = {
  id: string;
  category: string;
  recommendation: string;
};

export type AssessmentAnswerMap = Record<string, number>;

export type CategoryScore = {
  category: string;
  value: number;
};

export type AssessmentRecommendation = {
  category: string;
  questionId: string;
  recommendation: string;
  answerScore: number;
};

export const clampScore = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

export const calculateTotalScore = (
  questions: AssessmentQuestion[],
  answers: AssessmentAnswerMap,
): number => {
  if (questions.length === 0) return 0;
  const total = questions.reduce((sum, question) => sum + clampScore(answers[question.id] ?? 0), 0);
  return Math.round(total / questions.length);
};

export const calculateCategoryScores = (
  questions: AssessmentQuestion[],
  answers: AssessmentAnswerMap,
  categories: string[],
): CategoryScore[] => categories.map((category) => {
  const categoryQuestions = questions.filter((question) => question.category === category);
  if (categoryQuestions.length === 0) return { category, value: 0 };

  const total = categoryQuestions.reduce(
    (sum, question) => sum + clampScore(answers[question.id] ?? 0),
    0,
  );

  return { category, value: Math.round(total / categoryQuestions.length) };
});

export const getRiskLevel = (score: number): "low" | "medium" | "high" => {
  const normalized = clampScore(score);
  if (normalized >= 80) return "low";
  if (normalized >= 60) return "medium";
  return "high";
};

export const getScoreLabel = (score: number): string => {
  const risk = getRiskLevel(score);
  if (risk === "low") return "Goed op weg";
  if (risk === "medium") return "Aandacht nodig";
  return "Verhoogd risico";
};

export const getPriorities = (
  questions: AssessmentQuestion[],
  answers: AssessmentAnswerMap,
  limit = 5,
): AssessmentRecommendation[] => questions
  .filter((question) => clampScore(answers[question.id] ?? 0) < 100)
  .sort((a, b) => clampScore(answers[a.id] ?? 0) - clampScore(answers[b.id] ?? 0))
  .slice(0, Math.max(0, limit))
  .map((question) => ({
    category: question.category,
    questionId: question.id,
    recommendation: question.recommendation,
    answerScore: clampScore(answers[question.id] ?? 0),
  }));
