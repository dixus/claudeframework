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
 * Tier 4 — auto-approve:  Edit/Write on safe .claude/ subdirectories
 * Tier 5 — pass through:  anything else (falls back to normal prompt)
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

// Safe .claude/ subdirectories that can be auto-approved for Edit/Write
const SAFE_CLAUDE_SEGMENTS = [
  "skills",
  "agents",
  "rules",
  "context",
  "references",
  "docs",
  "specs",
  "reviews",
  "input",
  "handoffs",
  "plans",
  "commands",
];

const SAFE_CLAUDE_ROOT_FILES = [
  "todo.md",
  "metrics-pipeline.csv",
  "metrics-scout.csv",
  "learn-proposals.md",
];

function isSafeClaudePath(filePath) {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  const idx = norm.lastIndexOf("/.claude/");
  if (idx === -1) return false;
  const relative = norm.slice(idx + "/.claude/".length);
  for (const seg of SAFE_CLAUDE_SEGMENTS) {
    if (relative.startsWith(seg + "/") || relative === seg) return true;
  }
  for (const f of SAFE_CLAUDE_ROOT_FILES) {
    if (relative === f) return true;
  }
  return false;
}

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

  // Tier 4: Edit/Write on safe .claude/ paths — auto-approve
  if ((tool === "Edit" || tool === "Write") && input.tool_input) {
    const filePath = input.tool_input.file_path || "";
    if (filePath && isSafeClaudePath(filePath)) {
      process.stdout.write(
        JSON.stringify({ continue: true, suppressOutput: true }),
      );
      return;
    }
  }

  // Tier 5: pass through (everything else — falls back to normal prompt)
  process.stdout.write(JSON.stringify({ continue: true }));
}

main();
