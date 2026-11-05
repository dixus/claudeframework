import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { unzipSync } from "fflate";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureDevOpsClient } from "../client.js";
import { artifactDir, resolveInside } from "../files.js";
import {
  errorContextExcerpt,
  findFailedTests,
  readEmbeddedReport,
  redact,
  selectFailedTests,
  stripAnsi,
  summarizeTrace,
  traceSecrets,
} from "../playwrightReport.js";
import type { AdoArtifactResponse, AdoBuildResponse } from "../types.js";

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function mapBuild(build: AdoBuildResponse) {
  return {
    id: build.id,
    pipeline: build.definition.name,
    buildNumber: build.buildNumber,
    status: build.status,
    result: build.result ?? null,
    branch: build.sourceBranch.replace(/^refs\/heads\//, ""),
    commit: build.sourceVersion.slice(0, 9),
    reason: build.reason,
    requestedFor: build.requestedFor?.displayName ?? "",
    queueTime: build.queueTime ?? null,
    finishTime: build.finishTime ?? null,
    url: build._links?.web?.href ?? "",
  };
}

async function requireArtifact(
  client: AzureDevOpsClient,
  buildId: number,
  name: string,
): Promise<AdoArtifactResponse> {
  const artifacts = await client.listBuildArtifacts(buildId);
  const artifact = artifacts.find((candidate) => candidate.name === name);
  if (!artifact) {
    const available = artifacts.map((candidate) => candidate.name).join(", ") || "none";
    throw new Error(`Build ${buildId} has no artifact "${name}" (available: ${available})`);
  }
  return artifact;
}

function lastLines(log: string, count: number): string {
  // Strip the ISO timestamp ADO prefixes to every log line.
  const lines = log
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z /, ""))
    .filter((line) => line.trim() !== "");
  return lines.slice(-count).join("\n");
}

export function registerBuildTools(server: McpServer, client: AzureDevOpsClient): void {
  // ── ado_list_builds ─────────────────────────────────────────────────
  server.tool(
    "ado_list_builds",
    "List pipeline runs, newest first. Filter by pipeline (name, e.g. 'CI', or definition id), branch and result.",
    {
      pipeline: z.string().optional().describe("Pipeline name (exact, case-insensitive) or numeric definition id"),
      branch: z.string().optional().describe("Branch without refs/heads/ (e.g. main)"),
      result: z.enum(["succeeded", "partiallySucceeded", "failed", "canceled"]).optional().describe("Only runs with this result"),
      top: z.number().int().min(1).max(50).default(10).describe("Maximum number of runs"),
    },
    async ({ pipeline, branch, result, top }) => {
      let definitionId: number | undefined;
      if (pipeline !== undefined) {
        if (/^\d+$/.test(pipeline)) {
          definitionId = Number(pipeline);
        } else {
          const definitions = await client.findBuildDefinitions(pipeline);
          if (definitions.length === 0) return text(`No pipeline named "${pipeline}".`);
          definitionId = definitions[0].id;
        }
      }
      const builds = await client.listBuilds({ definitionId, branch, result, top });
      return text(JSON.stringify(builds.map(mapBuild), null, 2));
    },
  );

  // ── ado_get_build_failures ──────────────────────────────────────────
  server.tool(
    "ado_get_build_failures",
    "Failed steps of a pipeline run: step name, error messages and the last lines of the step's log. Returns an empty list for a run without failed steps.",
    {
      buildId: z.number().int().positive().describe("Build (run) id"),
      logLines: z.number().int().min(0).max(200).default(40).describe("Log lines per failed step (0 = none)"),
    },
    async ({ buildId, logLines }) => {
      const [build, records] = await Promise.all([client.getBuild(buildId), client.getBuildTimeline(buildId)]);
      const failedTasks = records
        .filter((record) => record.type === "Task" && record.result === "failed")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const failures = [];
      for (const task of failedTasks) {
        const errors = (task.issues ?? []).filter((issue) => issue.type === "error").map((issue) => issue.message);
        const logTail =
          logLines > 0 && task.log ? lastLines(await client.getBuildLog(buildId, task.log.id), logLines) : undefined;
        failures.push({ step: task.name, errors, logTail });
      }
      return text(JSON.stringify({ build: mapBuild(build), failedSteps: failures }, null, 2));
    },
  );

  // ── ado_get_test_failures ───────────────────────────────────────────
  server.tool(
    "ado_get_test_failures",
    "Failed test results published by a pipeline run (PublishTestResults), with error message and stack trace. Returns an empty list when the run published no failed results.",
    {
      buildId: z.number().int().positive().describe("Build (run) id"),
      top: z.number().int().min(1).max(200).default(25).describe("Maximum failed results per test run"),
    },
    async ({ buildId, top }) => {
      const build = await client.getBuild(buildId);
      const runs = await client.getTestRunsForBuild(build.uri);
      const result = [];
      for (const run of runs) {
        const failed = await client.getFailedTestResults(run.id, top);
        result.push({
          run: run.name,
          total: run.totalTests,
          passed: run.passedTests,
          failed: failed.map((test) => ({
            title: test.testCaseTitle,
            automatedTestName: test.automatedTestName,
            durationMs: test.durationInMs ?? null,
            errorMessage: (test.errorMessage ?? "").slice(0, 1000),
            stackTrace: (test.stackTrace ?? "").slice(0, 1500),
          })),
        });
      }
      return text(JSON.stringify({ build: mapBuild(build), testRuns: result }, null, 2));
    },
  );

  // ── ado_download_build_artifact ─────────────────────────────────────
  server.tool(
    "ado_download_build_artifact",
    "Download a pipeline artifact into <project>/.claude/artifacts/build-<id>/<name>/ (keep it gitignored). With path, only that one file (relative to the artifact root, e.g. 'index.html'); without, the whole artifact — which can be hundreds of MB for an E2E report. Playwright traces in it can contain secrets (e.g. typed passwords) in clear text: never copy them out of that directory or quote their raw content.",
    {
      buildId: z.number().int().positive().describe("Build (run) id"),
      name: z.string().min(1).describe("Artifact name (e.g. playwright-report)"),
      path: z.string().min(1).optional().describe("Single file inside the artifact, relative to its root"),
    },
    async ({ buildId, name, path }) => {
      const artifact = await requireArtifact(client, buildId, name);
      const targetDir = artifactDir(buildId, name);

      if (path !== undefined) {
        const target = resolveInside(targetDir, path);
        const bytes = await client.downloadArtifact(artifact, `/${path.replace(/^\/+/, "")}`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
        return text(`Downloaded ${path} (${bytes.length} bytes) to ${target}`);
      }

      const zip = await client.downloadArtifact(artifact);
      const entries = unzipSync(zip);
      let files = 0;
      for (const [entryName, bytes] of Object.entries(entries)) {
        if (entryName.endsWith("/")) continue;
        // Artifact zips wrap everything in a top-level folder named after the artifact.
        const inner = entryName.startsWith(`${name}/`) ? entryName.slice(name.length + 1) : entryName;
        const target = resolveInside(targetDir, inner);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
        files++;
      }
      return text(`Extracted ${files} files (${zip.length} bytes zipped) to ${targetDir}`);
    },
  );

  // ── ado_get_playwright_failures ─────────────────────────────────────
  server.tool(
    "ado_get_playwright_failures",
    "Diagnose failed Playwright tests of a pipeline run from its HTML-report artifact, without downloading the whole report: reads the report index, then fetches only the failed tests' trace, screenshot and error-context. Per test it returns the error, a trace summary (last actions, failed actions, console errors, HTTP >= 400 and page loads, page titles), the error-context excerpt (error + page snapshot) and the local screenshot path. Fill values (passwords) are masked; headers, cookies and request bodies are never read.",
    {
      buildId: z.number().int().positive().describe("Build (run) id"),
      artifact: z.string().min(1).default("playwright-report").describe("Name of the HTML-report artifact"),
      maxTests: z.number().int().min(1).max(20).default(5).describe("Failed tests to analyse in depth; the rest are listed by title"),
      testFilter: z.string().min(1).optional().describe("Analyse only failures whose test title, suite, project name or file path contains this text (case-insensitive), e.g. 'TC-01' or 'checkout'. Without it the first maxTests failures are analysed, which on a run with many failures may never reach the ones you are after."),
      lastActions: z.number().int().min(1).max(50).default(12).describe("Trace actions to show per test"),
    },
    async ({ buildId, artifact: artifactName, maxTests, testFilter, lastActions }) => {
      const artifact = await requireArtifact(client, buildId, artifactName);
      const targetDir = artifactDir(buildId, artifactName);
      const indexHtml = (await client.downloadArtifact(artifact, "/index.html")).toString("utf8");
      const failedTests = findFailedTests(readEmbeddedReport(indexHtml));

      const fetchAttachment = async (attachmentPath: string) => {
        const bytes = await client.downloadArtifact(artifact, `/${attachmentPath}`);
        const target = resolveInside(targetDir, attachmentPath);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
        return { bytes, target };
      };

      const selection = selectFailedTests(failedTests, { filter: testFilter, maxTests });

      const analysed = [];
      for (const test of selection.analysed) {
        const attempt = test.attempts[test.attempts.length - 1];
        const byName = (name: string) => attempt.attachments.find((attachment) => attachment.name === name && attachment.path);

        const trace = byName("trace");
        const traceBytes = trace?.path ? (await fetchAttachment(trace.path)).bytes : undefined;
        const secrets = traceBytes ? traceSecrets(traceBytes) : [];

        const errorContext = byName("error-context");
        const errorContextFile = errorContext?.path ? await fetchAttachment(errorContext.path) : undefined;
        const errorContextText = errorContextFile
          ? errorContextExcerpt(errorContextFile.bytes.toString("utf8"), secrets)
          : undefined;

        const screenshot = byName("screenshot");
        const screenshotPath = screenshot?.path ? (await fetchAttachment(screenshot.path)).target : undefined;

        analysed.push({
          test: [...test.titlePath.filter((part) => part !== ""), test.title].join(" › "),
          project: test.projectName,
          location: `${test.file}:${test.line}`,
          outcome: test.outcome,
          attempts: test.attempts.map((each) => `${each.retry}:${each.status}`).join(", "),
          errors: attempt.errors.map((error) =>
            stripAnsi(redact(error, secrets)).split("\n").filter((line) => line.trim() !== "").slice(0, 6).join("\n"),
          ),
          trace: traceBytes ? summarizeTrace(traceBytes, lastActions) : "no trace attachment",
          errorContext: errorContextText ?? "no error-context attachment",
          errorContextFile: errorContextFile?.target ?? null,
          screenshot: screenshotPath ?? "no screenshot attachment",
        });
      }

      const summary = {
        buildId,
        failed: failedTests.filter((test) => test.outcome === "unexpected").length,
        flaky: failedTests.filter((test) => test.outcome === "flaky").length,
        analysed: analysed.length,
        downloadedTo: targetDir,
        // Separate from `filteredOut` on purpose: these matched and were merely
        // capped, so raising maxTests reaches them. See selectFailedTests().
        notAnalysed: selection.overCap
          .map((test) => `${test.outcome} [${test.projectName}] ${test.title} (${test.file}:${test.line})`),
        ...(testFilter === undefined
          ? {}
          : {
              testFilter,
              filteredOut: selection.filteredOut,
              // An empty result under a filter must not read like "no failures".
              ...(analysed.length === 0 && failedTests.length > 0
                ? {
                    note: `No failed test matches ${JSON.stringify(testFilter)}. This run HAS ${failedTests.length} failed test(s) — they are all excluded by the filter, not absent. Drop testFilter or widen it.`,
                    allFailures: failedTests.map(
                      (test) => `${test.outcome} [${test.projectName}] ${test.title} (${test.file}:${test.line})`,
                    ),
                  }
                : {}),
            }),
        tests: analysed,
      };
      return text(JSON.stringify(summary, null, 2));
    },
  );
}
