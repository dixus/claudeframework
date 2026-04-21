#!/usr/bin/env node
/**
 * PreToolUse hook — validate that git commit messages contain a ticket ID.
 *
 * Event:   PreToolUse
 * Matcher: Bash
 * Scope:   project (.claude/settings.json)
 *
 * Convention: commit messages must contain `#<number>` (but NOT at the start,
 * because git treats leading `#` as a comment).
 *
 * Exceptions:
 * - Commits on `master` or `main` (merge commits, etc.)
 * - `git commit --amend` without a new `-m` message
 * - Merge commits (messages starting with "Merge")
 *
 * Exit code 2 = block the tool call entirely.
 */

const { execSync } = require("child_process");

function ok() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}

function block(msg) {
  process.stdout.write(JSON.stringify({ continue: false, additionalContext: msg }));
  process.exit(2);
}

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
    ok();
    return;
  }

  // Only intercept Bash tool calls that contain `git commit`
  if (input.tool_name !== "Bash") {
    ok();
    return;
  }

  const command = (input.tool_input && input.tool_input.command) || "";

  // Only validate git commit commands with a -m flag
  if (!/\bgit\s+commit\b/.test(command) || !/-m\s/.test(command)) {
    ok();
    return;
  }

  // Skip validation on master/main branches
  let branch = "";
  try {
    branch = execSync("git branch --show-current", { encoding: "utf8", stdio: "pipe", timeout: 5000 }).trim();
  } catch {
    ok();
    return;
  }

  if (branch === "master" || branch === "main") {
    ok();
    return;
  }

  // Extract commit message from -m flag
  // Handles: -m "message", -m 'message', -m word
  const msgMatch = command.match(/-m\s+(?:"([\s\S]*?)(?<!\\)"|'([\s\S]*?)'|(\S+))/);
  if (!msgMatch) {
    ok();
    return;
  }

  const message = msgMatch[1] || msgMatch[2] || msgMatch[3] || "";

  // Allow merge commits
  if (/^Merge\s/i.test(message)) {
    ok();
    return;
  }

  // Validate: message must not start with #
  if (/^#/.test(message.trim())) {
    block(
      "Commit message starts with '#' — git will treat it as a comment and the commit will be empty. " +
      "Move the ticket reference to the end of the message. " +
      "Format: '<emoji> <type>(<scope>): <description> #<ticketId>'"
    );
    return;
  }

  // Validate: message must contain #<number>
  if (!/#\d+/.test(message)) {
    const branchMatch = branch.match(/^(\d+)\./);
    const hint = branchMatch
      ? " Current branch suggests ticket #" + branchMatch[1] + "."
      : "";

    block(
      "Commit message must contain a ticket reference in the format '#<ticketId>' (e.g. '#1234'). " +
      "Append it to the end of the message." + hint + " " +
      "Format: '<emoji> <type>(<scope>): <description> #<ticketId>'"
    );
    return;
  }

  // Validation passed
  ok();
}

main();
