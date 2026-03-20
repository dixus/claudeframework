#!/usr/bin/env node
/**
 * PostCompact hook — re-inject pipeline state after context compaction.
 *
 * Event:   PostCompact
 * Matcher: (none — fires on every compaction)
 * Scope:   project (.claude/settings.json)
 *
 * When Claude's context window is compacted mid-session, critical pipeline
 * state can be lost. This hook reads the current pipeline state and injects
 * it back as additionalContext so Claude stays oriented.
 *
 * Checks (in order):
 *   1. Most recent handoff file (.claude/handoffs/)
 *   2. Most recent review file (.claude/reviews/)
 *   3. Most recent spec file (.claude/specs/)
 *   4. Current git branch and status
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function getMostRecentFile(dir, ext) {
  const fullDir = path.join(PROJECT_DIR, dir);
  try {
    if (!fs.existsSync(fullDir)) return null;
    const files = fs.readdirSync(fullDir)
      .filter(f => !ext || f.endsWith(ext))
      .filter(f => !f.startsWith('.'))
      .map(f => ({
        name: f,
        path: path.join(fullDir, f),
        mtime: fs.statSync(path.join(fullDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0] : null;
  } catch {
    return null;
  }
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_DIR, stdio: 'pipe', timeout: 5000 }).toString().trim();
  } catch {
    return '';
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  // Consume stdin (required even if we don't use it)
  await readStdin();

  const context = [];

  // Git state
  const branch = tryExec('git branch --show-current');
  const status = tryExec('git status --short');
  if (branch) {
    context.push(`## Git state`);
    context.push(`Branch: ${branch}`);
    if (status) {
      context.push(`Uncommitted changes:\n${status}`);
    }
  }

  // Most recent spec
  const spec = getMostRecentFile('.claude/specs', '.md');
  if (spec) {
    context.push(`## Active spec: ${spec.name}`);
    try {
      const content = fs.readFileSync(spec.path, 'utf8');
      // Extract just the goal and requirements (first ~30 lines)
      const lines = content.split('\n').slice(0, 30);
      context.push(lines.join('\n'));
    } catch {
      context.push(`(could not read ${spec.name})`);
    }
  }

  // Most recent review
  const review = getMostRecentFile('.claude/reviews', '-review.md');
  if (review) {
    context.push(`## Active review: ${review.name}`);
    try {
      const content = fs.readFileSync(review.path, 'utf8');
      // Extract verdict and issue summary (first ~20 lines)
      const lines = content.split('\n').slice(0, 20);
      context.push(lines.join('\n'));
    } catch {
      context.push(`(could not read ${review.name})`);
    }
  }

  // Most recent handoff
  const handoff = getMostRecentFile('.claude/handoffs', '.md');
  if (handoff) {
    context.push(`## Last handoff: ${handoff.name}`);
    try {
      const content = fs.readFileSync(handoff.path, 'utf8');
      context.push(content);
    } catch {
      context.push(`(could not read ${handoff.name})`);
    }
  }

  if (context.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    additionalContext:
      '--- POST-COMPACTION STATE RECOVERY ---\n' +
      'Context was compacted. Here is the current pipeline state:\n\n' +
      context.join('\n\n') +
      '\n\n--- END STATE RECOVERY ---',
  }));
}

main();
