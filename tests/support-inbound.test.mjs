import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { simpleParser } from "mailparser";
const dir = resolve(".inbound-test-tmp");
await mkdir(dir, { recursive: true });
try {
  await build({
    entryPoints: ["server/support-inbound.ts"],
    outfile: dir + "/inbound.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "silent",
  });
  const {
    cleanReply,
    isAutomatic,
    mailReferences,
    importInbound,
    isNewRequest,
    createTicketFromInbound,
  } = await import(pathToFileURL(dir + "/inbound.mjs"));
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed++;
    console.log("PASS " + name);
  };
  await test("plain reply removes quoted history", () =>
    assert.equal(
      cleanReply("Nieuw antwoord\r\n\r\n> oude mail\r\n> nog meer"),
      "Nieuw antwoord",
    ));
  await test("signature and reply length bounded", () => {
    assert.equal(cleanReply("Bedankt\n-- \nHandtekening"), "Bedankt");
    assert.equal(cleanReply("a".repeat(20000)).length, 10000);
  });
  await test("Outlook quote header is removed", () =>
    assert.equal(
      cleanReply(
        "Mijn antwoord\n\nVan: Servicedesk\nVerzonden: woensdag\nOnderwerp: Ticket",
      ),
      "Mijn antwoord",
    ));
  const raw =
    "From: Contact <contact@example.invalid>\r\nTo: support@harkasit.nl\r\nSubject: Re: [HIT-00002] Test\r\nIn-Reply-To: <hit.test@harkasit.nl>\r\nReferences: <hit.first@harkasit.nl> <hit.test@harkasit.nl>\r\nMessage-ID: <new@sender.invalid>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nDit is mijn antwoord.\r\n";
  const mail = await simpleParser(raw);
  await test("real MIME references are retained for exact matching", () => {
    assert.ok(mailReferences(mail).includes("<hit.test@harkasit.nl>"));
    assert.equal(isAutomatic(mail), false);
  });
  await test("automated notifications and bounces are ignored", async () => {
    assert.equal(
      isAutomatic(
        await simpleParser(
          raw.replace("Subject:", "Auto-Submitted: auto-replied\r\nSubject:"),
        ),
      ),
      true,
    );
    assert.equal(
      isAutomatic(
        await simpleParser(
          raw.replace("Subject:", "X-Harkas-Support: notification\r\nSubject:"),
        ),
      ),
      true,
    );
    assert.equal(
      isAutomatic(
        await simpleParser(
          raw.replace(
            "contact@example.invalid",
            "mailer-daemon@example.invalid",
          ),
        ),
      ),
      true,
    );
  });
  const fixture = (opts = {}) => {
    const queries = [];
    const client = {
      query: async (sql, args) => {
        queries.push({ sql, args });
        if (sql.includes("SELECT EXISTS"))
          return { rows: [{ allowed: opts.primary !== false }] };
        if (sql.includes("SELECT * FROM harkas_support_private.inbound"))
          return {
            rows: [
              {
                status: opts.status ?? "review",
                sender: "contact@example.invalid",
                body: "Klantantwoord",
              },
            ],
          };
        if (sql.includes("SELECT * FROM public.support_tickets"))
          return {
            rows: [
              {
                id: "t",
                customer_id: "c",
                status: opts.closed ? "gesloten" : "wacht_op_klant",
              },
            ],
          };
        if (sql.includes("SELECT 1 FROM public.support_portal_access"))
          return { rows: opts.allowed ? [{ ok: true }] : [] };
        if (sql.includes("SELECT id FROM public.support_email_events"))
          return { rows: [{ id: "old-event" }] };
        if (sql.includes("SELECT filename")) return { rows: [] };
        return { rows: [] };
      },
    };
    return { queries, client };
  };
  await test("unapproved sender never becomes a ticket message", async () => {
    const f = fixture();
    assert.equal(await importInbound(f.client, "i", "t"), false);
    assert.ok(
      !f.queries.some((q) =>
        q.sql.startsWith("INSERT INTO public.support_ticket_messages"),
      ),
    );
  });
  await test("closed tickets enter review instead of silently reopening", async () => {
    const f = fixture({ allowed: true, closed: true });
    assert.equal(await importInbound(f.client, "i", "t"), false);
  });
  await test("approved contact is imported and confirmation is directed to that sender", async () => {
    const f = fixture({ allowed: true });
    assert.equal(await importInbound(f.client, "i", "t"), true);
    assert.ok(
      f.queries.some(
        (q) =>
          q.sql.startsWith("INSERT INTO public.support_ticket_messages") &&
          q.args[2] === "Klantantwoord",
      ),
    );
    const update = f.queries.find((q) => q.sql.includes("jsonb_set"));
    assert.equal(update.args[1], "contact@example.invalid");
    assert.deepEqual(update.args[2], ["old-event"]);
  });
  await test("duplicate import is rejected before any new message", async () => {
    const f = fixture({ allowed: true, status: "imported" });
    await assert.rejects(() => importInbound(f.client, "i", "t"));
    assert.ok(
      !f.queries.some((q) =>
        q.sql.startsWith("INSERT INTO public.support_ticket_messages"),
      ),
    );
  });
  await test("fenced database cannot import email", async () => {
    const f = fixture({ allowed: true, primary: false });
    await assert.rejects(() => importInbound(f.client, "i", "t"));
    assert.ok(!f.queries.some((q) => q.sql.startsWith("INSERT")));
  });
  await test("Outlook separator before quoted header is removed", () => {
    assert.equal(
      cleanReply(
        "Antwoord\n________________________________\nVan: Support\nVerzonden: vandaag\nOnderwerp: Ticket",
      ),
      "Antwoord",
    );
  });
  await test("standalone mail only: replies and ticket subjects stay in review", async () => {
    const fresh = await simpleParser(
      "From: contact@example.invalid\r\nSubject: Nieuwe storing\r\n\r\nMijn probleem.",
    );
    assert.equal(isNewRequest(fresh), true);
    assert.equal(isNewRequest(mail), false);
    for (const subject of [
      "Re: Nieuwe storing",
      "Fwd: Bericht",
      "[HIT-00003] Test",
    ]) {
      assert.equal(isNewRequest({ ...fresh, subject }), false);
    }
  });
  const newFixture = (opts = {}) => {
    const queries = [];
    const client = {
      query: async (sql, args) => {
        queries.push({ sql, args });
        if (sql.includes("SELECT EXISTS"))
          return { rows: [{ allowed: opts.primary !== false }] };
        if (sql.includes("SELECT * FROM harkas_support_private.inbound"))
          return {
            rows: [
              {
                status: opts.status ?? "review",
                sender: "contact@example.invalid",
                subject: "Nieuwe storing",
                body: "De printer werkt niet.",
              },
            ],
          };
        if (sql.includes("SELECT DISTINCT customer_id"))
          return {
            rows: Array.from({ length: opts.contacts ?? 1 }, (_, i) => ({
              customer_id: "c" + i,
            })),
          };
        if (sql.includes("count(*)::int"))
          return { rows: [{ count: opts.recent ?? 0 }] };
        if (sql.startsWith("INSERT INTO public.support_tickets"))
          return { rows: [{ id: "new-ticket" }] };
        if (sql.includes("SELECT filename"))
          return { rows: [{ filename: "test.pdf" }] };
        return { rows: [] };
      },
    };
    return { client, queries };
  };
  await test("known unique customer opens one ticket and retains attachments", async () => {
    const f = newFixture();
    assert.equal(await createTicketFromInbound(f.client, "i"), true);
    assert.equal(
      f.queries.filter((q) =>
        q.sql.startsWith("INSERT INTO public.support_tickets"),
      ).length,
      1,
    );
    assert.ok(
      f.queries.some(
        (q) =>
          q.sql.includes("support_enqueue_notification_pair") &&
          q.args[1] === "test.pdf",
      ),
    );
    assert.ok(
      f.queries.some(
        (q) =>
          q.sql.includes("status='imported'") && q.args[1] === "new-ticket",
      ),
    );
  });
  for (const [name, opts] of [
    ["unknown sender", { contacts: 0 }],
    ["ambiguous customer", { contacts: 2 }],
    ["already imported", { status: "imported" }],
    ["rate limit", { recent: 10 }],
  ]) {
    await test(name + " cannot open a new ticket", async () => {
      const f = newFixture(opts);
      assert.equal(await createTicketFromInbound(f.client, "i"), false);
      assert.ok(!f.queries.some((q) => q.sql.startsWith("INSERT")));
    });
  }
  await test("fenced primary cannot create tickets", async () => {
    const f = newFixture({ primary: false });
    await assert.rejects(() => createTicketFromInbound(f.client, "i"));
    assert.ok(!f.queries.some((q) => q.sql.startsWith("INSERT")));
  });
  console.log(passed + " inbound tests passed");
} finally {
  await rm(dir, { recursive: true, force: true });
}
