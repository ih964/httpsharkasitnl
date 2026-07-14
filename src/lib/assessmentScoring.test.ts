import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCategoryScores,
  calculateTotalScore,
  getPriorities,
  getRiskLevel,
  getScoreLabel,
} from "./assessmentScoring.ts";

const questions = [
  { id: "mfa", category: "Security", recommendation: "Enable MFA" },
  { id: "updates", category: "Security", recommendation: "Centralize updates" },
  { id: "backup", category: "Backup", recommendation: "Add independent backup" },
  { id: "restore", category: "Backup", recommendation: "Test restores" },
];

test("calculates the average total score", () => {
  assert.equal(calculateTotalScore(questions, { mfa: 100, updates: 50, backup: 0, restore: 50 }), 50);
});

test("treats missing answers as zero and clamps invalid values", () => {
  assert.equal(calculateTotalScore(questions, { mfa: 150, updates: -10 }), 25);
});

test("calculates scores per category", () => {
  assert.deepEqual(
    calculateCategoryScores(
      questions,
      { mfa: 100, updates: 50, backup: 0, restore: 100 },
      ["Security", "Backup"],
    ),
    [
      { category: "Security", value: 75 },
      { category: "Backup", value: 50 },
    ],
  );
});

test("uses stable risk thresholds", () => {
  assert.equal(getRiskLevel(80), "low");
  assert.equal(getRiskLevel(79), "medium");
  assert.equal(getRiskLevel(60), "medium");
  assert.equal(getRiskLevel(59), "high");
  assert.equal(getScoreLabel(80), "Goed op weg");
  assert.equal(getScoreLabel(60), "Aandacht nodig");
  assert.equal(getScoreLabel(20), "Verhoogd risico");
});

test("returns the lowest scoring recommendations first", () => {
  assert.deepEqual(
    getPriorities(questions, { mfa: 100, updates: 50, backup: 0, restore: 50 }, 2),
    [
      { category: "Backup", questionId: "backup", recommendation: "Add independent backup", answerScore: 0 },
      { category: "Security", questionId: "updates", recommendation: "Centralize updates", answerScore: 50 },
    ],
  );
});
