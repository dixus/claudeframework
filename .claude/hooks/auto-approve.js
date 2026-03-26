#!/usr/bin/env node
/**
 * PermissionRequest hook — auto-approve safe operations, block destructive ones.
 *
 * Event:   PermissionRequest
 * Matcher: * (all tools)
 * Scope:   project (.claude/settings.json)
 *
 * Tier 1 — auto-approve:  Read, Glob, Grep, WebFetch, WebSearch, TodoWrite,
 *                          Task, NotebookEdit
 * Tier 2 — auto-deny:     known destructive Bash patterns
 * Tier 3 — auto-approve:  Bash commands not matching deny patterns
 * Tier 4 — pass through:  anything else (falls back to normal prompt)
 *
 * Note: Edit/Write are NOT auto-approved here — they are handled by
 * PreToolUse hooks (protect-secrets.js, allow-claude-edits.js) which
 * provide file-level granularity.
 */

const ALWAYS_ALLOW_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  "Task",
  "NotebookEdit",
]);

const ALWAYS_DENY_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/, // rm -rf /
  /rm\s+-rf\s+[~.*]/, // rm -rf ~ / rm -rf . / rm -rf *
  /rm\s+-rf\s+\$HOME/, // rm -rf $HOME
  /rm\s+-rf\s+["']\//, // rm -rf "/" or rm -rf '/
  /git\s+push\s+.*--force/, // any force push
  /git\s+reset\s+--hard/, // hard reset
  /mkfs/,
  /:\(\)\s*\{.*\}/, // fork bomb
  /dd\s+if=.*of=\/dev\/(s|h)d/, // disk overwrite
  /curl\s+.*\|\s*(?:bash|sh)/, // pipe to shell
  /wget\s+.*\|\s*(?:bash|sh)/, // pipe to shell
  /chmod\s+-R\s+777/, // world-writable recursion
  />\s*\/etc\//, // overwrite system files
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

  const tool = input.tool_name || "";
  const command = (input.tool_input && input.tool_input.command) || "";

  // Tier 2/3: Bash — deny destructive patterns, approve the rest
  if (tool === "Bash") {
    for (const pattern of ALWAYS_DENY_PATTERNS) {
      if (pattern.test(command)) {
        process.stdout.write(
          JSON.stringify({
            continue: false,
            additionalContext: `Auto-denied: command matches destructive pattern (${pattern}). Review before proceeding.`,
          }),
        );
        return;
      }
    }
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }),
    );
    return;
  }

  // Tier 1: auto-approve safe read-only tools
  if (ALWAYS_ALLOW_TOOLS.has(tool)) {
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }),
    );
    return;
  }

  // Tier 4: pass through (Edit, Write, and anything else — let PreToolUse hooks decide)
  process.stdout.write(JSON.stringify({ continue: true }));
}

main();
