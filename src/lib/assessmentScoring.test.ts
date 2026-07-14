import { describe, expect, it } from "vitest";
import {
  calculateCategoryScores,
  calculateTotalScore,
  getPriorities,
  getRiskLevel,
  getScoreLabel,
} from "./assessmentScoring";

const questions = [
  { id: "mfa", category: "Security", recommendation: "Enable MFA" },
  { id: "updates", category: "Security", recommendation: "Centralize updates" },
  { id: "backup", category: "Backup", recommendation: "Add independent backup" },
  { id: "restore", category: "Backup", recommendation: "Test restores" },
];

describe("assessment scoring", () => {
  it("calculates the average total score", () => {
    expect(calculateTotalScore(questions, { mfa: 100, updates: 50, backup: 0, restore: 50 })).toBe(50);
  });

  it("treats missing answers as zero and clamps invalid values", () => {
    expect(calculateTotalScore(questions, { mfa: 150, updates: -10 })).toBe(25);
  });

  it("calculates scores per category", () => {
    expect(calculateCategoryScores(
      questions,
      { mfa: 100, updates: 50, backup: 0, restore: 100 },
      ["Security", "Backup"],
    )).toEqual([
      { category: "Security", value: 75 },
      { category: "Backup", value: 50 },
    ]);
  });

  it("uses stable risk thresholds", () => {
    expect(getRiskLevel(80)).toBe("low");
    expect(getRiskLevel(79)).toBe("medium");
    expect(getRiskLevel(60)).toBe("medium");
    expect(getRiskLevel(59)).toBe("high");
    expect(getScoreLabel(80)).toBe("Goed op weg");
    expect(getScoreLabel(60)).toBe("Aandacht nodig");
    expect(getScoreLabel(20)).toBe("Verhoogd risico");
  });

  it("returns the lowest scoring recommendations first", () => {
    expect(getPriorities(questions, { mfa: 100, updates: 50, backup: 0, restore: 50 }, 2)).toEqual([
      { category: "Backup", questionId: "backup", recommendation: "Add independent backup", answerScore: 0 },
      { category: "Security", questionId: "updates", recommendation: "Centralize updates", answerScore: 50 },
    ]);
  });
});
