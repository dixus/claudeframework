#!/usr/bin/env node
/**
 * PreToolUse hook — block writes to sensitive files.
 *
 * Event:   PreToolUse
 * Matcher: Edit|Write
 * Scope:   project (.claude/settings.json)
 *
 * Blocks edits to files matching secret/credential patterns:
 *   .env, .env.*, credentials.*, *.pem, *.key, *.p12, *.pfx,
 *   *.keystore, id_rsa, id_ed25519, secrets.*, .npmrc (with auth),
 *   .pypirc, service-account*.json
 *
 * Exit code 2 = block the tool call entirely.
 */

const path = require('path');

const BLOCKED_PATTERNS = [
  /^\.env$/,
  /^\.env\..+$/,
  /^credentials\..+$/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /\.keystore$/,
  /^id_rsa$/,
  /^id_ed25519$/,
  /^secrets\..+$/,
  /^\.npmrc$/,
  /^\.pypirc$/,
  /^service-account.*\.json$/,
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
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

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const fileName = path.basename(filePath);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fileName)) {
      // Exit code 2 blocks the tool call
      process.stderr.write(
        `BLOCKED: write to "${fileName}" denied — matches secret/credential pattern (${pattern}). ` +
        `If intentional, temporarily disable this hook in .claude/settings.json.`
      );
      process.exit(2);
    }
  }

  // Not a sensitive file — allow
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}

main();
