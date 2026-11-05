#!/usr/bin/env node
/**
 * SessionStart hook — load the framework instincts into the session.
 *
 * Event:   SessionStart
 * Scope:   plugin (hooks/hooks.json)
 *
 * Plugins cannot ship rules or CLAUDE.md content that Claude Code loads by
 * itself, so the instincts travel as `additionalContext` of this hook.
 * `${CLAUDE_PLUGIN_ROOT}` inside the rule text is replaced with the real
 * plugin path, because Claude Code substitutes it only in skills and hooks,
 * not in hook output.
 *
 * A project that still keeps its own `.claude/rules/instincts.md` gets that
 * file natively; the hook then stays silent so the rules do not appear twice.
 */

const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function emit(context) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } })
  );
}

if (fs.existsSync(path.join(PROJECT_DIR, ".claude", "rules", "instincts.md"))) {
  process.exit(0);
}

let rules;
try {
  rules = fs.readFileSync(path.join(PLUGIN_ROOT, "rules", "instincts.md"), "utf8");
} catch {
  process.exit(0);
}

const pluginRoot = PLUGIN_ROOT.replace(/\\/g, "/");
emit(
  "Project rules from the pipeline plugin (apply them like rules in .claude/rules/):\n\n" +
    rules.split("${CLAUDE_PLUGIN_ROOT}").join(pluginRoot)
);
