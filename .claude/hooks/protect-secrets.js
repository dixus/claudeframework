#!/usr/bin/env node
/**
 * PreToolUse hook — block writes to sensitive files.
 *
 * Event:   PreToolUse
 * Matcher: Edit|Write
 * Scope:   project (.claude/settings.json)
 *
 * Blocks edits to files matching secret/credential patterns:
 *   .env, .env.*, credentials.*, *.pem, *.p12, *.pfx,
 *   *.keystore, id_rsa, id_ed25519, secrets.*, .npmrc, .pypirc,
 *   service-account*.json
 *
 * Note: .key was removed — too broad (matches i18n files, registry keys, etc.).
 * Private keys are covered by .pem and the ssh key patterns.
 *
 * Exit code 2 = block the tool call entirely.
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
      process.stdout.write(
        JSON.stringify({
          continue: false,
          additionalContext: `Blocked write to "${fileName}" — matches credential pattern (${pattern}). Disable in .claude/settings.json if intentional.`,
        }),
      );
      process.exit(2);
    }
  }

  // Not a sensitive file — allow
  process.stdout.write(
    JSON.stringify({ continue: true, suppressOutput: true }),
  );
}

main();
