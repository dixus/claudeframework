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

const { execSync } = require('child_process');
const path = require('path');

const PYTHON_EXTENSIONS = new Set(['.py']);
const PRETTIER_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md']);

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function tryExec(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', timeout: 10000 });
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

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath) return;

  const ext = path.extname(filePath).toLowerCase();

  if (PYTHON_EXTENSIONS.has(ext)) {
    // Determine the Python app root for ruff config
    const apiDir = path.join(PROJECT_DIR, 'apps', 'api');
    const isApiFile = filePath.replace(/\\/g, '/').includes('apps/api');
    const cwd = isApiFile ? apiDir : PROJECT_DIR;

    tryExec(`ruff format "${filePath}"`, cwd);
    tryExec(`ruff check --fix --quiet "${filePath}"`, cwd);
  } else if (PRETTIER_EXTENSIONS.has(ext)) {
    // Find the nearest prettier config
    const normalizedPath = filePath.replace(/\\/g, '/');
    let cwd = PROJECT_DIR;
    if (normalizedPath.includes('apps/web-buyer')) {
      cwd = path.join(PROJECT_DIR, 'apps', 'web-buyer');
    } else if (normalizedPath.includes('apps/web-supplier')) {
      cwd = path.join(PROJECT_DIR, 'apps', 'web-supplier');
    }

    tryExec(`npx prettier --write "${filePath}"`, cwd);
  }
}

main();
