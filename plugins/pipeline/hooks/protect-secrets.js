#!/usr/bin/env node
/**
 * PreToolUse hook — block writes to sensitive files.
 *
 * Event:   PreToolUse
 * Matcher: Edit|Write
 * Scope:   plugin (hooks/hooks.json)
 *
 * Blocks edits to files matching secret/credential patterns:
 *   .env, .env.*, credentials.*, *.pem, *.p12, *.pfx,
 *   *.keystore, id_rsa, id_ed25519, id_ecdsa, secrets.*, .npmrc, .pypirc,
 *   service-account*.json
 *
 * Note: .key was removed — too broad (matches i18n files, registry keys, etc.).
 * Private keys are covered by .pem and the ssh key patterns.
 *
 * Blocking contract (verified against Claude Code 2.1.193): for
 * PreToolUse, "Exit code 2 - show stderr to model and block tool call". So the
 * reason goes to STDERR and the exit code is 2 — only this one Edit/Write is
 * blocked and the model sees why. JSON with `continue: false` on stdout (an
 * older form) lost the reason (stdout is not read on exit 2) and, where
 * honoured, stops the whole turn instead of the one tool call.
 */

const path = require("path");

const BLOCKED_PATTERNS = [
  /^\.env$/,
  /^\.env\..+$/,
  /^credentials\..+$/,
  /\.pem$/,
  /\.p12$/,
  /\.pfx$/,
  /\.keystore$/,
  /^id_rsa$/,
  /^id_ed25519$/,
  /^id_ecdsa$/,
  /^secrets\..+$/,
  /^\.npmrc$/,
  /^\.pypirc$/,
  /^service-account.*\.json$/,
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const fileName = path.basename(filePath);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fileName)) {
      process.stderr.write(
        `Blocked write to "${fileName}" — matches credential pattern (${pattern}). The assistant must not write this file; ask the user to make the change themselves.\n`,
      );
      process.exitCode = 2;
      return;
    }
  }

  // Not a sensitive file — allow
  process.stdout.write(
    JSON.stringify({ continue: true, suppressOutput: true }),
  );
}

main();
