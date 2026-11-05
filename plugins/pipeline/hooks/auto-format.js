#!/usr/bin/env node
/**
 * PostToolUse hook — auto-format files after Edit or Write.
 *
 * Event:   PostToolUse
 * Matcher: Edit|Write
 *
 * Detects file type from tool_input.file_path and runs the appropriate formatter:
 *   .py          → ruff format + ruff check --fix
 *   .ts/.tsx/.js/.jsx/.json/.css/.md → prettier --write
 *
 * Silently skips if the formatter is not installed or the file doesn't match.
 * Uses execFileSync (no shell) to prevent path injection.
 */

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PYTHON_EXTENSIONS = new Set([".py"]);
const PRETTIER_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".md",
]);

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MAX_CONFIG_SEARCH_DEPTH = 10;

/**
 * Walk up from a file path to find the nearest directory containing a config file.
 * Falls back to PROJECT_DIR if nothing is found. Capped at MAX_CONFIG_SEARCH_DEPTH.
 */
function findNearestConfigDir(filePath, configNames) {
  let dir = path.dirname(filePath);
  const root = path.parse(dir).root;
  let depth = 0;
  while (dir !== root && depth < MAX_CONFIG_SEARCH_DEPTH) {
    for (const name of configNames) {
      if (fs.existsSync(path.join(dir, name))) return dir;
    }
    dir = path.dirname(dir);
    depth++;
  }
  return PROJECT_DIR;
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

function tryExecFile(bin, args, cwd) {
  try {
    execFileSync(bin, args, { cwd, stdio: "pipe", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  if (!filePath) return;

  const ext = path.extname(filePath).toLowerCase();

  if (PYTHON_EXTENSIONS.has(ext)) {
    const cwd = findNearestConfigDir(filePath, [
      "pyproject.toml",
      "ruff.toml",
      ".ruff.toml",
      "setup.cfg",
    ]);
    tryExecFile("ruff", ["format", filePath], cwd);
    tryExecFile("ruff", ["check", "--fix", "--quiet", filePath], cwd);
  } else if (PRETTIER_EXTENSIONS.has(ext)) {
    const cwd = findNearestConfigDir(filePath, [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.js",
      "prettier.config.js",
      ".prettierrc.yaml",
      ".prettierrc.toml",
    ]);
    tryExecFile("npx", ["prettier", "--write", filePath], cwd);
  }
}

main();
