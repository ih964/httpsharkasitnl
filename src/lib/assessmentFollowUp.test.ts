import assert from "node:assert/strict";
import test from "node:test";
import { classifyFollowUp, formatFollowUpLabel } from "./assessmentFollowUp.ts";

const now = new Date("2026-07-15T10:00:00.000Z");

test("classifies missing follow-up as unscheduled", () => {
  assert.equal(classifyFollowUp(null, now), "unscheduled");
});

test("classifies overdue, today, upcoming and later follow-ups", () => {
  assert.equal(classifyFollowUp("2026-07-14T12:00:00.000Z", now), "overdue");
  assert.equal(classifyFollowUp("2026-07-15T15:00:00.000Z", now), "today");
  assert.equal(classifyFollowUp("2026-07-20T09:00:00.000Z", now), "upcoming");
  assert.equal(classifyFollowUp("2026-07-30T09:00:00.000Z", now), "later");
});

test("formats user-facing follow-up labels", () => {
  assert.equal(formatFollowUpLabel("2026-07-14T12:00:00.000Z", now), "Te laat");
  assert.equal(formatFollowUpLabel("2026-07-15T15:00:00.000Z", now), "Vandaag");
  assert.equal(formatFollowUpLabel(null, now), "Niet gepland");
});
