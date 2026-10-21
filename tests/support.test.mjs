import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const dir = resolve(".support-test-tmp");
await mkdir(dir, { recursive: true });
process.env.CRON_SECRET = "unit-test-only";
process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
process.env.HARKAS_SUPABASE_DSN = "postgres://test.invalid/db";
process.env.RESEND_API_KEY = "unit-test-only";
const id = "11111111-1111-4111-8111-111111111111";
const seen = new Set();
let queries = [],
  events = [],
  sendMode = "success",
  sent = [];
globalThis.__supportTestQuery = async (sql, args) => {
  queries.push({ sql, args });
  if (sql.includes("worker_invocations")) {
    const [nonce, issued, signature] = args;
    const key = nonce + ":" + issued;
    const valid =
      createHmac("sha256", "test-secret")
        .update(issued + ":" + nonce)
        .digest("hex") === signature && !seen.has(key);
    if (valid) seen.add(key);
    return { rows: valid ? [{ nonce }] : [] };
  }
  if (sql.includes("SELECT s.role"))
    return {
      rows: [
        {
          role: "primary",
          writer: "supabase",
          state_epoch: 1,
          control_epoch: 1,
        },
      ],
    };
  if (sql.includes("SELECT EXISTS")) return { rows: [{ allowed: true }] };
  if (sql.includes("SELECT e.id")) return { rows: events };
  return { rows: [] };
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (url.includes("/auth/v1/user"))
    return new Response(JSON.stringify({ id }), { status: 200 });
  if (url === "https://api.resend.com/emails") {
    sent.push({ payload: JSON.parse(opts.body), headers: opts.headers });
    return new Response(
      JSON.stringify(
        sendMode === "success"
          ? { id: "provider-test" }
          : { error: "rate limited" },
      ),
      { status: sendMode === "success" ? 200 : 429 },
    );
  }
  throw new Error("Unexpected request " + url);
};
try {
  await build({
    entryPoints: ["api/support-notify.ts"],
    outfile: dir + "/api.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "fake-db",
        setup(b) {
          b.onResolve({ filter: /^pg$/ }, () => ({
            path: "pg",
            namespace: "fake",
          }));
          b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
            contents:
              "export class Pool { async connect(){return {query:(...args)=>globalThis.__supportTestQuery(...args),release(){}}} async query(...args){return globalThis.__supportTestQuery(...args)} }",
            loader: "js",
          }));
        },
      },
    ],
    logLevel: "silent",
  });
  await build({
    entryPoints: ["src/lib/support.ts"],
    outfile: dir + "/support.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const {
    default: handler,
    supportMailTitle,
    supportMailBody,
  } = await import(pathToFileURL(dir + "/api.mjs"));
  const { ticketNumber, isOverdue } = await import(
    pathToFileURL(dir + "/support.mjs")
  );
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed++;
    console.log("PASS " + name);
  };
  const event = {
    id,
    ticket_id: id,
    ticket_no: "123456",
    kind: "staff_reply",
    recipient_type: "customer",
    payload: {
      subject: "Test\r\nHeader",
      status: "wacht_op_leverancier",
      requester_email: "customer@example.invalid",
      message: "Exacte eerste reactie <script>",
    },
  };
  const call = async (req) => {
    let status, body;
    await handler(req, {
      setHeader() {},
      status(s) {
        status = s;
        return this;
      },
      json(b) {
        body = b;
      },
    });
    return { status, body };
  };
  await test("numbering grows without truncating", () => {
    assert.equal(ticketNumber(1), "HIT-00001");
    assert.equal(ticketNumber(123456), "HIT-123456");
  });
  await test("closed tickets do not become overdue", () => {
    assert.equal(
      isOverdue({ status: "gesloten", due_at: "2020-01-01" }),
      false,
    );
    assert.equal(isOverdue({ status: "nieuw", due_at: "2020-01-01" }), true);
  });
  await test("customer mail has exact response, ticket link and readable status", () => {
    const body = supportMailBody(event);
    assert.match(body, /Exacte eerste reactie/);
    assert.match(body, /Wacht op leverancier/);
    assert.match(body, new RegExp("/support\\?ticket=" + id));
    assert.doesNotMatch(supportMailTitle(event), /[\r\n]/);
  });
  await test("group change has readable labels", () => {
    assert.match(
      supportMailBody({
        ...event,
        kind: "details_changed",
        payload: {
          ...event.payload,
          field: "behandelgroep",
          old: "cloud",
          new: "werkplek",
        },
      }),
      /Cloud & Microsoft 365[\s\S]*Werkplek & netwerk/,
    );
  });
  await test("endpoint rejects anonymous GET and POST", async () => {
    assert.equal((await call({ method: "GET", headers: {} })).status, 401);
    assert.equal(
      (await call({ method: "POST", headers: {}, body: { ticketId: id } }))
        .status,
      401,
    );
  });
  await test("endpoint rejects invalid methods and IDs", async () => {
    assert.equal((await call({ method: "DELETE", headers: {} })).status, 405);
    assert.equal(
      (
        await call({
          method: "POST",
          headers: { authorization: "Bearer test" },
          body: { ticketId: "unsafe" },
        })
      ).status,
      400,
    );
  });
  await test("scheduler signature requires a match and rejects replay", async () => {
    events = [];
    const issued = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", "test-secret")
      .update(issued + ":" + id)
      .digest("hex");
    const headers = {
      "x-harkas-worker-nonce": id,
      "x-harkas-worker-issued": issued,
      "x-harkas-worker-signature": signature,
    };
    assert.equal(
      (
        await call({
          method: "GET",
          headers: { ...headers, "x-harkas-worker-signature": "b".repeat(64) },
        })
      ).status,
      401,
    );
    assert.equal((await call({ method: "GET", headers })).status, 200);
    assert.equal((await call({ method: "GET", headers })).status, 401);
  });
  await test("worker sends from support, escapes HTML and marks accepted", async () => {
    events = [event];
    queries = [];
    sent = [];
    const r = await call({
      method: "GET",
      headers: { authorization: "Bearer unit-test-only" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.accepted_by_provider, 1);
    assert.equal(
      sent[0].payload.from,
      "Harkas IT Servicedesk <support@harkasit.nl>",
    );
    assert.equal(sent[0].payload.reply_to, "support@harkasit.nl");
    assert.match(sent[0].payload.html, /&lt;script&gt;/);
    assert.ok(queries.some((q) => q.sql.includes("SET state='sent'")));
    assert.equal(
      sent[0].headers["Idempotency-Key"],
      "support-notification-" + id,
    );
  });
  await test("429 is persisted for retry with same event key", async () => {
    sendMode = "retry";
    queries = [];
    sent = [];
    const r = await call({
      method: "GET",
      headers: { authorization: "Bearer unit-test-only" },
    });
    assert.equal(r.body.accepted_by_provider, 0);
    assert.ok(queries.some((q) => q.sql.includes("state=CASE WHEN attempts")));
    assert.equal(
      sent[0].headers["Idempotency-Key"],
      "support-notification-" + id,
    );
  });
  console.log(passed + " support tests passed");
} finally {
  globalThis.fetch = nativeFetch;
  delete globalThis.__supportTestQuery;
  await rm(dir, { recursive: true, force: true });
}
