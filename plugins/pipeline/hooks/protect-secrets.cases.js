#!/usr/bin/env node
/**
 * Cases for protect-secrets.js — run: node hooks/protect-secrets.cases.js
 *
 * PreToolUse contract (verified against Claude Code 2.1.193):
 * "Exit code 2 - show stderr to model and block tool call". A block therefore
 * means exit 2, the reason on STDERR, and NO `continue: false` on stdout —
 * that would end the whole turn instead of the single write.
 *
 * Besides the channel the cases pin WHAT is protected: every pattern has a
 * block case, and near misses (i18n `.key`, `env.ts`, `my.env`) stay allowed.
 *
 * No git fixture needed: the hook decides on the file name alone.
 */

const { spawnSync } = require("child_process");
const path = require("path");

const HOOK = path.join(__dirname, "protect-secrets.js");

function runHook(stdin) {
  const r = spawnSync(process.execPath, [HOOK], { input: stdin, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

const editOf = (filePath, tool = "Write") => JSON.stringify({ tool_name: tool, tool_input: { file_path: filePath } });

// [name, path, file name expected in the reason] — each BLOCKED_PATTERNS entry once.
const blocked = [
  [".env", "D:/Repos/app/.env", ".env"],
  [".env.local", "D:/Repos/app/.env.local", ".env.local"],
  ["credentials.json", "/home/u/.aws/credentials.json", "credentials.json"],
  ["*.pem", "certs/server.pem", "server.pem"],
  ["*.p12", "certs/client.p12", "client.p12"],
  ["*.pfx", "certs/signing.pfx", "signing.pfx"],
  ["*.keystore", "android/release.keystore", "release.keystore"],
  ["id_rsa", "/home/u/.ssh/id_rsa", "id_rsa"],
  ["id_ed25519", "/home/u/.ssh/id_ed25519", "id_ed25519"],
  ["id_ecdsa", "/home/u/.ssh/id_ecdsa", "id_ecdsa"],
  ["secrets.json", "backend/secrets.json", "secrets.json"],
  [".npmrc", "frontend/web/.npmrc", ".npmrc"],
  [".pypirc", "/home/u/.pypirc", ".pypirc"],
  ["service-account*.json", "deploy/service-account-prod.json", "service-account-prod.json"],
  ["Edit instead of Write", "D:/Repos/app/.env", ".env", "Edit"],
];
// Windows path with backslashes as Claude Code passes it; path.basename splits
// backslashes only on win32.
if (process.platform === "win32") {
  blocked.push(["Windows path with backslashes", "D:\\Repos\\My App\\.env.production", ".env.production"]);
}

// [name, stdin] — must pass.
const allowed = [
  ["plain TS file", editOf("frontend/web/src/app/app.component.ts")],
  ["i18n file with .key (deliberately not blocked)", editOf("src/assets/i18n/labels.key")],
  ["env.ts (no leading dot)", editOf("src/environments/env.ts")],
  ["my.env (no start anchor)", editOf("config/my.env")],
  ["environment.prod.ts", editOf("src/environments/environment.prod.ts")],
  ["directory .env/ with a plain file", editOf("D:/Repos/app/.env/readme.md")],
  ["no file_path", JSON.stringify({ tool_name: "Write", tool_input: {} })],
  ["broken stdin", "not json"],
];

let bad = 0;
function report(name, problems) {
  if (problems.length) bad++;
  console.log(`${problems.length ? "XX" : "  "} ${name.padEnd(48)} ${problems.length ? "FAIL: " + problems.join("; ") : "ok"}`);
}

for (const [name, filePath, fileName, tool] of blocked) {
  const r = runHook(editOf(filePath, tool));
  const problems = [];
  if (r.status !== 2) problems.push(`exit ${r.status}, expected 2`);
  if (!r.stderr.includes(`"${fileName}"`)) problems.push(`stderr does not name "${fileName}" (stderr: ${JSON.stringify(r.stderr)})`);
  if (!r.stderr.includes("credential pattern")) problems.push("stderr without reason");
  if (/"continue"\s*:\s*false/.test(r.stdout)) problems.push("stdout carries continue:false (ends the whole turn)");
  // The reason reaches the model; it must not point it at a way to switch the guard off.
  if (/settings\.json/.test(r.stderr)) problems.push("stderr names settings.json (points the model at disabling the guard)");
  report(`blocked: ${name}`, problems);
}

for (const [name, stdin] of allowed) {
  const r = runHook(stdin);
  const problems = [];
  if (r.status !== 0) problems.push(`exit ${r.status}, expected 0`);
  if (r.stderr !== "") problems.push(`stderr not empty: ${JSON.stringify(r.stderr)}`);
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    problems.push(`stdout not JSON: ${JSON.stringify(r.stdout)}`);
  }
  if (json && json.continue !== true) problems.push("stdout without continue:true");
  report(`allowed: ${name}`, problems);
}

const total = blocked.length + allowed.length;
console.log(bad === 0 ? `\nAll ${total} cases correct.` : `\n${bad} FAILED of ${total}`);
process.exit(bad === 0 ? 0 : 1);
