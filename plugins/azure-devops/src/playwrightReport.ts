/**
 * Pure helpers for Playwright HTML reports and trace archives.
 * Kept free of network I/O so they can be tested offline.
 *
 * Traces contain secrets in clear text: `fill` values (e.g. a login password),
 * the login POST body, cookies and auth headers. Everything here works on
 * an allowlist — only named fields leave this module — and every `fill`
 * value of a trace is additionally masked in all text it produces.
 */
import { strFromU8, unzipSync } from "fflate";

export const MASK = "***";

/** Values shorter than this are not masked in free text: too many false hits. */
const MIN_MASK_LENGTH = 3;

// ── Report ───────────────────────────────────────────────────────────

export interface ReportAttachment {
  name: string;
  contentType: string;
  path?: string;
}

export interface FailedTest {
  title: string;
  titlePath: string[];
  projectName: string;
  file: string;
  line: number;
  outcome: string;
  /** Attempts in run order; the last one is what the gate saw. */
  attempts: Array<{
    retry: number;
    status: string;
    errors: string[];
    attachments: ReportAttachment[];
  }>;
}

interface RawTest {
  title: string;
  projectName: string;
  location: { file: string; line: number };
  outcome: string;
  path: string[];
  results: Array<{
    retry: number;
    status: string;
    errors?: Array<{ message?: string } | string>;
    attachments?: ReportAttachment[];
  }>;
}

/**
 * Extract the report data the HTML reporter embeds into index.html
 * (`<template id="playwrightReportBase64">data:application/zip;base64,…`).
 * Returns the parsed JSON entries of that zip keyed by file name.
 */
export function readEmbeddedReport(indexHtml: string): Map<string, unknown> {
  const match = indexHtml.match(
    /<(template|script)[^>]*id="playwrightReportBase64"[^>]*>([\s\S]*?)<\/\1>/,
  );
  if (!match) {
    throw new Error("index.html contains no embedded Playwright report (playwrightReportBase64)");
  }
  const base64 = match[2].trim().replace(/^data:application\/zip;base64,/, "");
  const entries = unzipSync(Buffer.from(base64, "base64"));
  const parsed = new Map<string, unknown>();
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith(".json")) parsed.set(name, JSON.parse(strFromU8(bytes)));
  }
  return parsed;
}

/** Tests whose outcome is `unexpected` (failed) or `flaky` (failed, then passed on retry). */
export function findFailedTests(report: Map<string, unknown>): FailedTest[] {
  const failed: FailedTest[] = [];
  for (const [name, content] of report) {
    if (name === "report.json") continue;
    const tests = (content as { tests?: RawTest[] }).tests ?? [];
    for (const test of tests) {
      if (test.outcome !== "unexpected" && test.outcome !== "flaky") continue;
      failed.push({
        title: test.title,
        titlePath: test.path,
        projectName: test.projectName,
        file: test.location.file,
        line: test.location.line,
        outcome: test.outcome,
        attempts: test.results.map((result) => ({
          retry: result.retry,
          status: result.status,
          errors: (result.errors ?? []).map((error) =>
            typeof error === "string" ? error : error.message ?? "",
          ),
          attachments: result.attachments ?? [],
        })),
      });
    }
  }
  // Failures before flakes, then by project and file for a stable order.
  const rank = (test: FailedTest) => (test.outcome === "unexpected" ? 0 : 1);
  return failed.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.projectName.localeCompare(b.projectName) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}

export interface FailedTestSelection {
  /** Analysed in depth. Matched the filter and fit under the cap. */
  analysed: FailedTest[];
  /** Matched the filter but did NOT fit under the cap. */
  overCap: FailedTest[];
  /** How many failures the filter excluded. 0 when no filter was given. */
  filteredOut: number;
}

/**
 * Pick which failed tests get analysed in depth.
 *
 * `overCap` and `filteredOut` are kept apart on purpose. They answer different
 * questions — "this run had more failures than I looked at" versus "I only
 * asked about some of them" — and a caller that merges them reports a subset
 * as if it were the whole run. A filter that matches nothing therefore yields
 * an EMPTY `analysed` with a non-zero `filteredOut`, never a quiet empty list
 * that reads like "no failures".
 *
 * Matching is a case-insensitive substring over the test title, its ancestor
 * titles, the project name and the file path, so both `TC-01` and `checkout`
 * select the checkout failures.
 */
export function selectFailedTests(
  tests: FailedTest[],
  options: { filter?: string; maxTests: number },
): FailedTestSelection {
  const needle = options.filter?.trim().toLowerCase();
  const matches = (test: FailedTest): boolean => {
    if (needle === undefined || needle === "") {
      return true;
    }
    const haystack = [test.title, ...test.titlePath, test.projectName, test.file]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  };

  const matching = tests.filter(matches);
  return {
    analysed: matching.slice(0, options.maxTests),
    overCap: matching.slice(options.maxTests),
    filteredOut: tests.length - matching.length,
  };
}

// ── Trace ────────────────────────────────────────────────────────────

export interface TraceAction {
  method: string;
  /** Selector or URL the action targeted, without query string. */
  target?: string;
  durationMs?: number;
  error?: string;
}

export interface TraceSummary {
  /** The last actions before the end of the trace, oldest first. */
  actions: TraceAction[];
  totalActions: number;
  failedActions: TraceAction[];
  consoleErrors: string[];
  /** HTTP responses with status >= 400 and all document navigations. */
  network: Array<{ status: number; method: string; url: string; document: boolean }>;
  pageTitles: string[];
  /** Number of distinct fill values masked in this summary. */
  maskedValues: number;
}

interface TraceEvent {
  type: string;
  callId?: string;
  method?: string;
  class?: string;
  params?: Record<string, unknown>;
  startTime?: number;
  endTime?: number;
  error?: { message?: string };
  result?: { value?: unknown };
  messageType?: string;
  text?: string;
  snapshot?: {
    request: { method: string; url: string };
    response: { status: number; content?: { mimeType?: string } };
  };
}

function stripQuery(url: string): string {
  const index = url.search(/[?#]/);
  return index === -1 ? url : url.slice(0, index);
}

function parseLines(text: string): TraceEvent[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as TraceEvent);
}

export function collectSecrets(events: TraceEvent[]): string[] {
  const values = new Set<string>();
  for (const event of events) {
    if (event.type !== "before") continue;
    if (event.method !== "fill" && event.method !== "type" && event.method !== "press") continue;
    const value = event.params?.value ?? event.params?.text;
    if (typeof value === "string" && value.length >= MIN_MASK_LENGTH) values.add(value);
  }
  // Longest first, so a value that contains another is masked whole.
  return [...values].sort((a, b) => b.length - a.length);
}

export function redact(text: string, secrets: string[]): string {
  let result = text;
  for (const secret of secrets) result = result.split(secret).join(MASK);
  return result;
}

const IGNORED_METHODS = new Set(["newPage", "title", "screenshot", "innerText"]);

const TRACE_FILE = /(^|\/)\d*-?trace\.trace$/;
const NETWORK_FILE = /(^|\/)\d*-?trace\.network$/;

interface ContextFindings {
  actions: TraceAction[];
  pageTitles: string[];
  consoleErrors: string[];
}

/** Walk one browser context's events; call ids are only unique within one context. */
function readContext(events: TraceEvent[], clean: (text: string) => string): ContextFindings {
  const starts = new Map<string, TraceEvent>();
  const findings: ContextFindings = { actions: [], pageTitles: [], consoleErrors: [] };

  for (const event of events) {
    if (event.type === "before" && event.callId) {
      starts.set(event.callId, event);
      continue;
    }
    if (event.type === "console" && event.messageType === "error" && event.text) {
      findings.consoleErrors.push(clean(event.text).slice(0, 300));
      continue;
    }
    if (event.type !== "after" || !event.callId) continue;

    const start = starts.get(event.callId);
    if (!start?.method) continue;
    if (start.method === "title" && typeof event.result?.value === "string") {
      findings.pageTitles.push(clean(event.result.value));
    }
    if (IGNORED_METHODS.has(start.method)) continue;

    const selector = start.params?.selector;
    const url = start.params?.url;
    const target =
      typeof selector === "string" ? selector : typeof url === "string" ? stripQuery(url) : undefined;
    findings.actions.push({
      method: start.method,
      target: target !== undefined ? clean(target) : undefined,
      durationMs:
        start.startTime !== undefined && event.endTime !== undefined
          ? Math.round(event.endTime - start.startTime)
          : undefined,
      error: event.error?.message ? clean(event.error.message.split("\n")[0]) : undefined,
    });
  }
  return findings;
}

/** Summarize a Playwright trace.zip (bytes) using only allowlisted fields. */
export function summarizeTrace(zipBytes: Uint8Array, lastActions = 15): TraceSummary {
  const entries = unzipSync(zipBytes, {
    filter: (file) => TRACE_FILE.test(file.name) || NETWORK_FILE.test(file.name),
  });
  const names = Object.keys(entries).sort();
  const contexts = names
    .filter((name) => TRACE_FILE.test(name))
    .map((name) => parseLines(strFromU8(entries[name])));
  const networkEvents = names
    .filter((name) => NETWORK_FILE.test(name))
    .flatMap((name) => parseLines(strFromU8(entries[name])));

  const secrets = collectSecrets(contexts.flat());
  const clean = (text: string) => redact(text, secrets);
  const findings = contexts.map((events) => readContext(events, clean));
  const actions = findings.flatMap((finding) => finding.actions);

  const network = networkEvents
    .filter((event) => event.snapshot)
    .map((event) => {
      const snapshot = event.snapshot!;
      return {
        status: snapshot.response.status,
        method: snapshot.request.method,
        url: clean(stripQuery(snapshot.request.url)),
        document: (snapshot.response.content?.mimeType ?? "").startsWith("text/html"),
      };
    })
    .filter((entry) => entry.status >= 400 || entry.document);

  return {
    actions: actions.slice(-lastActions),
    totalActions: actions.length,
    failedActions: actions.filter((action) => action.error !== undefined),
    consoleErrors: [...new Set(findings.flatMap((finding) => finding.consoleErrors))],
    network,
    pageTitles: [...new Set(findings.flatMap((finding) => finding.pageTitles))],
    maskedValues: secrets.length,
  };
}

/** The fill values of a trace, for masking companion files (error-context.md). */
export function traceSecrets(zipBytes: Uint8Array): string[] {
  const entries = unzipSync(zipBytes, { filter: (file) => TRACE_FILE.test(file.name) });
  return collectSecrets(Object.values(entries).flatMap((bytes) => parseLines(strFromU8(bytes))));
}

/**
 * The parts of an error-context.md worth reading: "Error details" and
 * "Page snapshot" (the page's accessibility tree at failure time). The test
 * source is left out — it is in the repository — and fill values are masked.
 */
export function errorContextExcerpt(markdown: string, secrets: string[], maxLength = 4000): string {
  const sections = markdown.split(/^(?=# )/m);
  const wanted = sections.filter((section) => /^# (Error details|Page snapshot)\b/.test(section));
  const excerpt = stripAnsi(redact(wanted.join("").trim(), secrets));
  return excerpt.length <= maxLength
    ? excerpt
    : `${excerpt.slice(0, maxLength)}\n… (truncated, ${excerpt.length} characters in total)`;
}

/** Remove terminal colour codes Playwright writes into error messages. */
export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}
