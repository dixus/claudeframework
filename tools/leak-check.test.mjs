#!/usr/bin/env node
// leak-check.test.mjs — real `git push` runs against a throwaway bare remote.
// Usage: node tools/leak-check.test.mjs
// Each case states the push outcome it expects; a guard that never says "no"
// fails the injected-term cases.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('./leak-check.mjs', import.meta.url));
const TERM = 'acme-secret-customer';

function sh(cwd, args, env = {}) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leak-check-'));
  const remote = path.join(dir, 'remote.git');
  const work = path.join(dir, 'work');
  execFileSync('git', ['init', '-q', '--bare', remote]);
  execFileSync('git', ['init', '-q', '-b', 'main', work]);
  const cfg = [['user.name', 'Test'], ['user.email', 'test@example.invalid'], ['core.autocrlf', 'false']];
  for (const [k, v] of cfg) execFileSync('git', ['config', k, v], { cwd: work });
  fs.mkdirSync(path.join(work, 'tools'));
  fs.copyFileSync(tool, path.join(work, 'tools', 'leak-check.mjs'));
  fs.writeFileSync(path.join(work, 'README.md'), 'clean\n');
  execFileSync('git', ['add', '-A'], { cwd: work });
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: work });
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: work });
  execFileSync('node', [path.join(work, 'tools', 'leak-check.mjs'), '--install'], { cwd: work, stdio: 'pipe' });
  fs.writeFileSync(path.join(work, '.git', 'info', 'blocklist.txt'), `# private terms\n${TERM}\n`);
  return { dir, work };
}

function commit(work, file, content, env = {}) {
  fs.writeFileSync(path.join(work, file), content);
  sh(work, ['add', '-A']);
  const res = sh(work, ['commit', '-qm', `change ${file}`], env);
  if (res.status !== 0) throw new Error(res.stderr);
}

function push(work) {
  return sh(work, ['push', '-q', 'origin', 'HEAD:main']);
}

const cases = {
  'clean push passes': () => {
    const { work } = fixture();
    const res = push(work);
    return res.status === 0 ? null : `expected exit 0, got ${res.status}: ${res.stderr}`;
  },
  'term in a file is refused': () => {
    const { work } = fixture();
    commit(work, 'notes.md', `Customer: ${TERM.toUpperCase()}\n`);
    const res = push(work);
    if (res.status === 0) return 'push went through';
    return res.stderr.includes('notes.md') ? null : `stderr does not name the file: ${res.stderr}`;
  },
  'term in the author email is refused': () => {
    const { work } = fixture();
    commit(work, 'a.md', 'clean\n', { GIT_AUTHOR_EMAIL: `dev@${TERM}.example` });
    const res = push(work);
    if (res.status === 0) return 'push went through';
    return /commit [0-9a-f]+: message or author/.test(res.stderr) ? null : `stderr: ${res.stderr}`;
  },
  'term removed again in a later commit is still refused': () => {
    const { work } = fixture();
    commit(work, 'b.md', `${TERM}\n`);
    commit(work, 'b.md', 'clean\n');
    const res = push(work);
    // The tip tree is clean, but the history would publish the term.
    if (res.status === 0) return 'push went through although the history carries the term';
    return /added line matches/.test(res.stderr) ? null : `stderr: ${res.stderr}`;
  },
  'missing blocklist refuses (fail closed)': () => {
    const { work } = fixture();
    fs.rmSync(path.join(work, '.git', 'info', 'blocklist.txt'));
    const res = push(work);
    if (res.status === 0) return 'push went through without a blocklist';
    return res.stderr.includes('fail closed') ? null : `stderr: ${res.stderr}`;
  },
  'stderr never prints the blocklist terms themselves for commit hits': () => {
    const { work } = fixture();
    commit(work, 'c.md', 'clean\n', { GIT_AUTHOR_EMAIL: `dev@${TERM}.example` });
    const res = push(work);
    return res.stderr.includes(`@${TERM}`) ? 'stderr leaks the author email' : null;
  },
};

let failed = 0;
for (const [name, run] of Object.entries(cases)) {
  let problem;
  try {
    problem = run();
  } catch (error) {
    problem = String(error);
  }
  if (problem) failed++;
  console.log(`${problem ? 'FAIL' : 'PASS'} ${name}${problem ? ` — ${problem}` : ''}`);
}
process.exit(failed ? 1 : 0);
