import test from "node:test";
import assert from "node:assert/strict";
import { formatAssessmentActivity } from "./assessmentActivity.ts";

test("formats submitted activity", () => {
  assert.equal(formatAssessmentActivity({ id: "1", event_type: "submitted", metadata: {}, created_at: "2026-07-14T20:00:00Z" }), "IT-scan ingediend");
});

test("formats status changes with Dutch labels", () => {
  assert.equal(formatAssessmentActivity({ id: "2", event_type: "status_updated", metadata: { status_from: "new", status_to: "qualified" }, created_at: "2026-07-14T20:00:00Z" }), "Status gewijzigd van Nieuw naar Gekwalificeerd");
});

test("formats combined follow-up changes", () => {
  assert.equal(formatAssessmentActivity({ id: "3", event_type: "follow_up_updated", metadata: { notes_changed: true, follow_up_from: null, follow_up_to: "2026-07-16T09:00:00Z" }, created_at: "2026-07-14T20:00:00Z" }), "Notities en opvolgdatum bijgewerkt");
});

test("formats conversion to a new customer", () => {
  assert.equal(formatAssessmentActivity({ id: "4", event_type: "converted_to_customer", metadata: { reused_existing_customer: false }, created_at: "2026-07-14T20:00:00Z" }), "Lead omgezet naar nieuwe klant");
});

test("formats linking to an existing customer", () => {
  assert.equal(formatAssessmentActivity({ id: "5", event_type: "converted_to_customer", metadata: { reused_existing_customer: true }, created_at: "2026-07-14T20:00:00Z" }), "Lead gekoppeld aan bestaande klant");
});

test("formats a saved proposal draft with totals", () => {
  const text = formatAssessmentActivity({
    id: "6",
    event_type: "proposal_draft_saved",
    metadata: { line_count: 3, total: 1210 },
    created_at: "2026-07-14T20:00:00Z",
  });

  assert.match(text, /Conceptofferte opgeslagen met 3 regels/);
  assert.match(text, /1\.210,00/);
});

test("formats proposal status changes", () => {
  assert.equal(
    formatAssessmentActivity({
      id: "7",
      event_type: "proposal_status_updated",
      metadata: { status_from: "draft", status_to: "approved" },
      created_at: "2026-07-14T20:00:00Z",
    }),
    "Offertestatus gewijzigd van Concept naar Goedgekeurd",
  );
});

test("formats manual sending and customer outcomes", () => {
  assert.equal(
    formatAssessmentActivity({
      id: "8",
      event_type: "proposal_lifecycle_updated",
      metadata: { status_from: "approved", status_to: "sent", sent_to: "klant@example.nl" },
      created_at: "2026-07-15T09:00:00Z",
    }),
    "Offerte handmatig verzonden naar klant@example.nl",
  );
  assert.equal(
    formatAssessmentActivity({
      id: "9",
      event_type: "proposal_lifecycle_updated",
      metadata: { status_from: "sent", status_to: "accepted" },
      created_at: "2026-07-16T09:00:00Z",
    }),
    "Offerte door klant geaccepteerd",
  );
  assert.equal(
    formatAssessmentActivity({
      id: "10",
      event_type: "proposal_lifecycle_updated",
      metadata: { status_from: "sent", status_to: "rejected" },
      created_at: "2026-07-16T09:00:00Z",
    }),
    "Offerte door klant geweigerd",
  );
});
