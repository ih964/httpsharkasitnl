import assert from "node:assert/strict";
import test from "node:test";
import { buildAssessmentProposal } from "./assessmentProposal.ts";

test("builds a proposal without inventing prices", () => {
  const proposal = buildAssessmentProposal({
    companyName: "Voorbeeld BV",
    contactName: "Jan",
    totalScore: 42,
    employeeCount: 12,
    recommendations: [
      { category: "Beveiliging", recommendation: "Maak MFA verplicht.", answer_score: 0 },
      { category: "Back-up", recommendation: "Richt een onafhankelijke back-up in.", answer_score: 50 },
    ],
  });

  assert.equal(proposal.subject, "Vervolg op IT Quick Scan - Voorbeeld BV");
  assert.equal(proposal.scopeItems[0].priority, "direct");
  assert.equal(proposal.scopeItems[1].priority, "hoog");
  assert.match(proposal.summary, /12 medewerkers/);
  assert.match(proposal.emailBody, /concrete aanpak en prijsopgave/);
  assert.doesNotMatch(proposal.emailBody, /€|euro|EUR/);
});

test("deduplicates identical recommendations", () => {
  const proposal = buildAssessmentProposal({
    companyName: "Voorbeeld BV",
    contactName: "Jan",
    totalScore: 75,
    employeeCount: null,
    recommendations: [
      { category: "Werkplekken", recommendation: "Beheer apparaten centraal.", answer_score: 50 },
      { category: "Werkplekken", recommendation: "Beheer apparaten centraal.", answer_score: 50 },
    ],
  });

  assert.equal(proposal.scopeItems.length, 1);
  assert.match(proposal.summary, /aantal medewerkers nog niet opgegeven/);
});

test("creates a safe fallback when no recommendations exist", () => {
  const proposal = buildAssessmentProposal({
    companyName: "Voorbeeld BV",
    contactName: "Jan",
    totalScore: 100,
    employeeCount: 1,
    recommendations: [],
  });

  assert.equal(proposal.scopeItems.length, 0);
  assert.match(proposal.emailBody, /periodieke technische controle/);
});
