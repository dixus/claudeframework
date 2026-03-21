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
 */

const { execSync } = require("child_process");
const path = require("path");

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

/**
 * Walk up from a file path to find the nearest directory containing a config file.
 * Falls back to PROJECT_DIR if nothing is found.
 */
function findNearestConfigDir(filePath, configNames) {
  const fs = require("fs");
  let dir = path.dirname(filePath);
  const root = path.parse(dir).root;
  while (dir !== root) {
    for (const name of configNames) {
      if (fs.existsSync(path.join(dir, name))) return dir;
    }
    dir = path.dirname(dir);
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

function tryExec(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: "pipe", timeout: 10000 });
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
    tryExec(`ruff format "${filePath}"`, cwd);
    tryExec(`ruff check --fix --quiet "${filePath}"`, cwd);
  } else if (PRETTIER_EXTENSIONS.has(ext)) {
    const cwd = findNearestConfigDir(filePath, [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.js",
      "prettier.config.js",
      ".prettierrc.yaml",
      ".prettierrc.toml",
    ]);
    tryExec(`npx prettier --write "${filePath}"`, cwd);
  }
}

main();
