#!/usr/bin/env node
/**
 * PreToolUse hook — auto-approve Edit/Write on safe .claude/ subdirectories.
 *
 * Workaround for https://github.com/anthropics/claude-code/issues/37516
 * The .claude/ path is hardcoded as protected in Claude Code, so permission
 * rules like Edit(*) don't suppress the prompt. This hook overrides that
 * for safe subdirectories while keeping hooks/ and settings protected.
 *
 * Output uses hookSpecificOutput.permissionDecision per the workaround in #37516.
 * If Claude Code ignores this format, change to: { continue: true, suppressOutput: true }
 *
 * Event:   PreToolUse
 * Matcher: Edit|Write
 */

const SAFE_SEGMENTS = [
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

// Also allow specific files in .claude/ root
const SAFE_ROOT_FILES = [
  "todo.md",
  "metrics-pipeline.csv",
  "metrics-scout.csv",
  "learn-proposals.md",
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

function normalize(filePath) {
  return filePath.replace(/\\/g, "/").toLowerCase();
}

function isSafeClaudePath(filePath) {
  const norm = normalize(filePath);

  // Must be a .claude/ path
  const idx = norm.lastIndexOf("/.claude/");
  if (idx === -1) return false;

  const relative = norm.slice(idx + "/.claude/".length);

  // Check safe subdirectories
  for (const seg of SAFE_SEGMENTS) {
    if (relative.startsWith(seg + "/") || relative === seg) return true;
  }

  // Check safe root files
  for (const f of SAFE_ROOT_FILES) {
    if (relative === f) return true;
  }

  return false;
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const tool = input.tool_name || "";
  if (tool !== "Edit" && tool !== "Write") {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  if (!filePath) {
    process.exit(0);
  }

  if (isSafeClaudePath(filePath)) {
    // Try both output formats — hookSpecificOutput for #37516 workaround,
    // continue:true as standard fallback
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason:
            ".claude safe subdirectory auto-approved (workaround #37516)",
        },
        continue: true,
        suppressOutput: true,
      }),
    );
    process.exit(0);
  }

  // Not a .claude/ path or not safe — pass through
  process.exit(0);
}

main();
