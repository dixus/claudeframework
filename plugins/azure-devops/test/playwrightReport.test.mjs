import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, sep } from "node:path";
import { strToU8, zipSync } from "fflate";
import {
  MASK,
  errorContextExcerpt,
  findFailedTests,
  readEmbeddedReport,
  selectFailedTests,
  redact,
  stripAnsi,
  summarizeTrace,
  traceSecrets,
} from "../.test-build/playwrightReport.js";
import { resolveInside } from "../.test-build/files.js";
import { isTrustedAzureDevOpsUrl } from "../.test-build/client.js";

const SECRET = "S3cr3t-Pa55";
const USER = "test.user.admin";

const ndjson = (events) => strToU8(events.map((event) => JSON.stringify(event)).join("\n"));

/**
 * A trace carrying the fill value everywhere the real login trace of build
 * 5133 did (fill params, step title, login POST body, cookie header), plus
 * in every free-text field the summary passes through.
 */
function traceWithSecrets() {
  return zipSync({
    "test.trace": ndjson([{ type: "before", callId: "pw:api@1", title: `Fill "${SECRET}" locator('#Password')` }]),
    "0-trace.trace": ndjson([
      { type: "before", callId: "call@1", method: "goto", params: { url: "https://demo.example/login?code=abc&token=xyz" }, startTime: 0 },
      { type: "after", callId: "call@1", endTime: 100 },
      { type: "before", callId: "call@2", method: "fill", params: { selector: "input[name=Username]", value: USER }, startTime: 100 },
      { type: "after", callId: "call@2", endTime: 110 },
      { type: "before", callId: "call@3", method: "fill", params: { selector: "input[name=Password]", value: SECRET }, startTime: 110 },
      { type: "log", callId: "call@3", message: `fill("${SECRET}")` },
      { type: "after", callId: "call@3", endTime: 120 },
      { type: "before", callId: "call@4", method: "click", params: { selector: `text=${SECRET}` }, startTime: 120 },
      { type: "after", callId: "call@4", endTime: 130, error: { message: `Timeout waiting for ${SECRET}\n    at stack` } },
      { type: "console", messageType: "error", text: `login failed for ${USER} with ${SECRET}` },
      { type: "before", callId: "call@5", method: "title", params: {} },
      { type: "after", callId: "call@5", endTime: 140, result: { value: `Welcome ${USER}` } },
    ]),
    "0-trace.network": ndjson([
      {
        type: "resource-snapshot",
        snapshot: {
          request: {
            method: "POST",
            url: `https://demo.example/connect/login?password=${SECRET}`,
            headers: [{ name: "cookie", value: `session=${SECRET}` }],
            postData: { text: `Username=${USER}&Password=${SECRET}` },
          },
          response: { status: 500, content: { mimeType: "text/html" }, headers: [{ name: "set-cookie", value: "x=1" }] },
        },
      },
      {
        type: "resource-snapshot",
        snapshot: {
          request: { method: "GET", url: "https://demo.example/app.js" },
          response: { status: 200, content: { mimeType: "application/javascript" } },
        },
      },
    ]),
  });
}

// ── Redaction ────────────────────────────────────────────────────────

test("trace summary never contains a fill value, a cookie or a query string", () => {
  const output = JSON.stringify(summarizeTrace(traceWithSecrets(), 50));
  assert.equal(output.includes(SECRET), false, "password leaked");
  assert.equal(output.includes(USER), false, "username leaked");
  assert.equal(output.includes("session="), false, "cookie leaked");
  assert.equal(output.includes("code=abc"), false, "query string leaked");
});

test("free-text fields are masked, not dropped", () => {
  const summary = summarizeTrace(traceWithSecrets(), 50);
  assert.ok(summary.consoleErrors[0].includes(MASK));
  assert.ok(summary.failedActions[0].error.includes(MASK));
  assert.equal(summary.pageTitles[0], `Welcome ${MASK}`);
  assert.equal(summary.maskedValues, 2);
});

test("control: without fill events the same free text passes unmasked", () => {
  const trace = zipSync({
    "0-trace.trace": ndjson([{ type: "console", messageType: "error", text: `login failed for ${USER}` }]),
  });
  assert.deepEqual(summarizeTrace(trace).consoleErrors, [`login failed for ${USER}`]);
});

test("traceSecrets finds the fill values longest first", () => {
  assert.deepEqual(traceSecrets(traceWithSecrets()), [USER, SECRET].sort((a, b) => b.length - a.length));
});

test("error-context excerpt keeps error and page snapshot, drops test source, masks values", () => {
  const markdown = [
    "# Instructions\n\n- explain\n\n",
    "# Test info\n\n- Name: x\n\n",
    `# Error details\n\nTimeout waiting for ${SECRET}\n\n`,
    `# Page snapshot\n\n- textbox "Password": ${SECRET}\n\n`,
    "# Test source\n\nconst password = process.env.E2E_PASSWORD;\n",
  ].join("");
  const excerpt = errorContextExcerpt(markdown, [SECRET]);
  assert.match(excerpt, /^# Error details/);
  assert.match(excerpt, /# Page snapshot/);
  assert.equal(excerpt.includes("# Test source"), false);
  assert.equal(excerpt.includes("# Instructions"), false);
  assert.equal(excerpt.includes(SECRET), false);
});

test("redact masks every occurrence and ignores an empty list", () => {
  assert.equal(redact("a S b S", ["S"]), `a ${MASK} b ${MASK}`);
  assert.equal(redact("unchanged", []), "unchanged");
});

// ── Trace structure ──────────────────────────────────────────────────

test("summary reports failed actions, HTTP >= 400 and page loads, and strips query strings", () => {
  const summary = summarizeTrace(traceWithSecrets(), 50);
  assert.deepEqual(summary.network, [
    { status: 500, method: "POST", url: "https://demo.example/connect/login", document: true },
  ]);
  assert.equal(summary.actions[0].target, "https://demo.example/login");
  assert.equal(summary.failedActions.length, 1);
  assert.equal(summary.failedActions[0].method, "click");
});

test("actions of all browser contexts are collected in context order", () => {
  // One trace.zip can hold several contexts, each numbering its calls from call@1.
  const trace = zipSync({
    "0-trace.trace": ndjson([
      { type: "before", callId: "call@1", method: "goto", params: { url: "https://a.example/" }, startTime: 0 },
      { type: "after", callId: "call@1", endTime: 10 },
    ]),
    "1-trace.trace": ndjson([
      { type: "before", callId: "call@1", method: "click", params: { selector: "#b" }, startTime: 0 },
      { type: "after", callId: "call@1", endTime: 20, error: { message: "boom" } },
    ]),
  });
  const summary = summarizeTrace(trace);
  assert.deepEqual(
    summary.actions.map((action) => [action.method, action.target, action.error]),
    [
      ["goto", "https://a.example/", undefined],
      ["click", "#b", "boom"],
    ],
  );
});

test("lastActions keeps the newest actions", () => {
  const events = [];
  for (let index = 0; index < 5; index++) {
    events.push({ type: "before", callId: `c${index}`, method: "click", params: { selector: `#${index}` }, startTime: index });
    events.push({ type: "after", callId: `c${index}`, endTime: index + 1 });
  }
  const summary = summarizeTrace(zipSync({ "0-trace.trace": ndjson(events) }), 2);
  assert.deepEqual(summary.actions.map((action) => action.target), ["#3", "#4"]);
  assert.equal(summary.totalActions, 5);
});

// ── Report ───────────────────────────────────────────────────────────

function indexHtmlWith(files) {
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(JSON.stringify(content))])));
  const base64 = Buffer.from(zip).toString("base64");
  return `<html><body><template id="playwrightReportBase64">data:application/zip;base64,${base64}</template></body></html>`;
}

const rawTest = (title, outcome, extra = {}) => ({
  title,
  projectName: "supply-monitor",
  location: { file: "regression/a.spec.ts", line: extra.line ?? 1 },
  outcome,
  path: ["Suite"],
  results: [
    { retry: 0, status: "failed", errors: [{ message: "first try" }], attachments: [] },
    ...(outcome === "unexpected"
      ? [{ retry: 1, status: "failed", errors: [{ message: "second try" }], attachments: [{ name: "trace", contentType: "application/zip", path: "data/t.zip" }] }]
      : [{ retry: 1, status: "passed", errors: [], attachments: [] }]),
  ],
});

test("report: failed and flaky tests are found, passed and skipped ones are not", () => {
  const html = indexHtmlWith({
    "report.json": { files: [] },
    "a.json": {
      tests: [
        rawTest("passes", "expected"),
        rawTest("skipped", "skipped"),
        rawTest("flaky one", "flaky", { line: 5 }),
        rawTest("fails", "unexpected", { line: 9 }),
      ],
    },
  });
  const failed = findFailedTests(readEmbeddedReport(html));
  assert.deepEqual(failed.map((test) => [test.title, test.outcome]), [
    ["fails", "unexpected"],
    ["flaky one", "flaky"],
  ]);
  const lastAttempt = failed[0].attempts.at(-1);
  assert.deepEqual(lastAttempt.errors, ["second try"]);
  assert.equal(lastAttempt.attachments[0].path, "data/t.zip");
});

test("report: index.html without embedded data fails loudly", () => {
  assert.throws(() => readEmbeddedReport("<html></html>"), /no embedded Playwright report/);
});

// ── Paths and hosts ──────────────────────────────────────────────────

test("resolveInside accepts nested entries", () => {
  const root = resolve("tmp-root");
  assert.equal(resolveInside(root, "data/a.zip"), resolve(root, "data", "a.zip"));
});

for (const entry of ["../evil.txt", "data/../../evil.txt", "..\\evil.txt", "/etc/passwd", "C:\\Windows\\x", "C:/x", "."]) {
  test(`resolveInside rejects ${JSON.stringify(entry)}`, () => {
    assert.throws(() => resolveInside(resolve("tmp-root"), entry));
  });
}

test("resolveInside keeps the result below the root", () => {
  const root = resolve("tmp-root");
  assert.ok(resolveInside(root, "a/b/../c.txt").startsWith(root + sep));
});

test("credentials go only to https Azure DevOps hosts", () => {
  assert.equal(isTrustedAzureDevOpsUrl("https://dev.azure.com/org/_apis/x"), true);
  assert.equal(isTrustedAzureDevOpsUrl("https://artprodweu2.artifacts.visualstudio.com/A/_apis/artifact/x"), true);
  assert.equal(isTrustedAzureDevOpsUrl("https://evilvisualstudio.com/x"), false);
  assert.equal(isTrustedAzureDevOpsUrl("https://dev.azure.com.evil.example/x"), false);
  assert.equal(isTrustedAzureDevOpsUrl("https://devXazure.com/x"), false);
  assert.equal(isTrustedAzureDevOpsUrl("http://dev.azure.com/x"), false);
});

test("error-context excerpt is capped and says so", () => {
  const markdown = `# Error details\n\nboom\n\n# Page snapshot\n\n${"- generic\n".repeat(1000)}`;
  const excerpt = errorContextExcerpt(markdown, [], 200);
  assert.ok(excerpt.length < 300);
  assert.match(excerpt, /truncated, \d+ characters in total/);
});

test("stripAnsi removes colour codes and keeps the text", () => {
  assert.equal(stripAnsi("\u001b[2m  - waiting for x\u001b[22m"), "  - waiting for x");
});

// ── selectFailedTests ────────────────────────────────────────
// The tool had no `testFilter` at all; a caller passing one got it silently
// dropped by Zod and the first N failures analysed regardless. Diagnosing the
// eight red checkout tests of one build was therefore impossible — the two
// other failures came back every time.

const failure = (title, projectName, file) => ({
  title,
  titlePath: ["", "Suite"],
  projectName,
  file,
  line: 1,
  outcome: "unexpected",
  attempts: [{ retry: 0, status: "failed", errors: [], attachments: [] }],
});

const FAILURES = [
  failure("TC-XX-01: logout and re-login", "cross-app", "regression/cross-app.regression.spec.ts"),
  failure("TC-XX-02: switch language", "cross-app", "regression/cross-app.regression.spec.ts"),
  failure("TC-SH-01: shop home page loads", "checkout", "smoke/checkout.smoke.spec.ts"),
  failure("TC-SH-02: catalog view lists articles", "checkout", "smoke/checkout.smoke.spec.ts"),
  failure("TC-SH-03: cart page loads", "checkout", "smoke/checkout.smoke.spec.ts"),
];

test("selectFailedTests without a filter analyses the first N and caps the rest", () => {
  const selection = selectFailedTests(FAILURES, { maxTests: 2 });

  assert.deepEqual(selection.analysed.map((each) => each.title.slice(0, 8)), ["TC-XX-01", "TC-XX-02"]);
  assert.equal(selection.overCap.length, 3);
  // Nothing was excluded, so nothing may be reported as excluded.
  assert.equal(selection.filteredOut, 0);
});

test("selectFailedTests selects by test title", () => {
  const selection = selectFailedTests(FAILURES, { filter: "TC-SH-01", maxTests: 5 });

  assert.deepEqual(selection.analysed.map((each) => each.projectName), ["checkout"]);
  assert.equal(selection.analysed[0].title.slice(0, 8), "TC-SH-01");
  // The discriminating half: the four non-matching failures must be counted as
  // EXCLUDED, not as "capped". Without this, a filter that silently matches
  // everything would pass the assertion above just as well.
  assert.equal(selection.filteredOut, 4);
  assert.equal(selection.overCap.length, 0);
});

test("selectFailedTests selects by project name", () => {
  const selection = selectFailedTests(FAILURES, { filter: "checkout", maxTests: 5 });

  assert.equal(selection.analysed.length, 3);
  assert.ok(selection.analysed.every((each) => each.projectName === "checkout"));
  assert.equal(selection.filteredOut, 2);
});

test("selectFailedTests keeps the cap and the filter apart", () => {
  // Three match, only two fit. The third is over the cap — it was NOT excluded
  // by the filter, and reporting it as excluded would misstate the run.
  const selection = selectFailedTests(FAILURES, { filter: "checkout", maxTests: 2 });

  assert.equal(selection.analysed.length, 2);
  assert.equal(selection.overCap.length, 1);
  assert.equal(selection.overCap[0].title.slice(0, 8), "TC-SH-03");
  assert.equal(selection.filteredOut, 2);
});

test("selectFailedTests matches case-insensitively and on the file path", () => {
  assert.equal(selectFailedTests(FAILURES, { filter: "tc-sh", maxTests: 5 }).analysed.length, 3);
  assert.equal(selectFailedTests(FAILURES, { filter: "SMOKE/", maxTests: 5 }).analysed.length, 3);
});

test("selectFailedTests reports a filter that matches nothing as excluding everything", () => {
  const selection = selectFailedTests(FAILURES, { filter: "TC-ZZ-99", maxTests: 5 });

  assert.equal(selection.analysed.length, 0);
  // An empty `analysed` must never be readable as "this run had no failures".
  // filteredOut carries that distinction.
  assert.equal(selection.filteredOut, FAILURES.length);
  assert.equal(selection.overCap.length, 0);
});

test("selectFailedTests treats an empty filter as no filter", () => {
  // The MCP layer may hand through an empty string; that must not select nothing.
  const selection = selectFailedTests(FAILURES, { filter: "   ", maxTests: 5 });

  assert.equal(selection.analysed.length, 5);
  assert.equal(selection.filteredOut, 0);
});
