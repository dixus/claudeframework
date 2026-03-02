#!/usr/bin/env node
/**
 * PermissionRequest hook — auto-approve safe operations, block destructive ones.
 *
 * Event:   PermissionRequest
 * Matcher: * (all tools)
 * Scope:   project (.claude/settings.json)
 *
 * Tier 1 — auto-approve:  Read, Write, Edit, MultiEdit, Glob, Grep, WebFetch,
 *                          WebSearch, TodoWrite, Task, NotebookEdit, Bash (safe)
 * Tier 2 — auto-deny:     known destructive Bash patterns
 * Tier 3 — pass through:  anything else (falls back to normal prompt)
 */

const ALWAYS_ALLOW_TOOLS = new Set([
  'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep',
  'WebFetch', 'WebSearch', 'TodoWrite', 'Task', 'NotebookEdit',
]);

const ALWAYS_DENY_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/,
  /git\s+push\s+--force\s+origin\s+main/,
  /git\s+push\s+--force\s+origin\s+master/,
  /mkfs/,
  /:\(\)\s*\{.*\}/,  // fork bomb
  /dd\s+if=.*of=\/dev\/(s|h)d/,
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
    // If we can't parse, pass through to normal flow
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const tool = input.tool_name || '';
  const command = (input.tool_input && input.tool_input.command) || '';

  // Tier 2: block known destructive Bash patterns
  if (tool === 'Bash') {
    for (const pattern of ALWAYS_DENY_PATTERNS) {
      if (pattern.test(command)) {
        process.stdout.write(JSON.stringify({
          continue: false,
          additionalContext: `Auto-denied: command matches a destructive pattern (${pattern}). Review before proceeding.`,
        }));
        return;
      }
    }
    // All other Bash: approve
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Tier 1: auto-approve safe tools
  if (ALWAYS_ALLOW_TOOLS.has(tool)) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Tier 3: pass through (let Claude Code decide)
  process.stdout.write(JSON.stringify({ continue: true }));
}

main();
