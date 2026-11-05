#!/usr/bin/env node
// =============================================================================
// leak-check.mjs — refuse a push that carries a term from a private blocklist.
//
// The blocklist is NOT part of the repository: it lives in
// <git-common-dir>/info/blocklist.txt (one case-insensitive extended regex per
// line, `#` comments and blank lines ignored). `.git/info/` is never pushed, so
// the terms it protects are never published by the guard itself.
//
// What is checked for every ref being pushed:
//   1. the complete tree of the pushed commit (text and binary files)
//   2. message, author and committer of every commit not yet on any remote
//
// Fail closed: without a blocklist the push is refused.
//
// Usage
//   as git pre-push hook:  node tools/leak-check.mjs --pre-push <remote> <url>  (refs on stdin)
//   manual check of a rev: node tools/leak-check.mjs --rev HEAD
// Install the hook:        node tools/leak-check.mjs --install
// Tests:                   node tools/leak-check.test.mjs
// =============================================================================

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ZERO = /^0+$/;

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
}

function blocklistPath() {
  const common = path.resolve(git(['rev-parse', '--git-common-dir']).trim());
  return process.env.LEAK_CHECK_BLOCKLIST || path.join(common, 'info', 'blocklist.txt');
}

function loadPatterns(file) {
  if (!fs.existsSync(file)) return null;
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

// git grep over the tree of one commit; returns "path:line" hits, never the term list itself.
function scanTree(rev, patternFile) {
  const res = spawnSync('git', ['grep', '-n', '-i', '-E', '-a', '-f', patternFile, rev, '--'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.status === 1) return [];
  if (res.status !== 0) throw new Error(`git grep failed: ${res.stderr}`);
  return res.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(`${rev}:`, '').slice(0, 200));
}

function scanCommits(rev, patterns) {
  const range = git(['rev-list', rev, '--not', '--remotes']).split(/\r?\n/).filter(Boolean);
  const regexes = patterns.map((p) => new RegExp(p, 'i'));
  const hits = [];
  for (const sha of range) {
    const meta = git(['show', '-s', '--format=%an <%ae>%n%cn <%ce>%n%B', sha]);
    for (const re of regexes) {
      if (re.test(meta)) {
        hits.push(`commit ${sha.slice(0, 10)}: message or author/committer matches /${re.source}/`);
        break;
      }
    }
    // A term added in one commit and removed in the next is gone from the tip
    // but still published with the history — so every added line counts.
    const patch = git(['show', '--format=', '--no-color', '--text', '-U0', sha]);
    for (const line of patch.split(/\r?\n/)) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      const re = regexes.find((candidate) => candidate.test(line));
      if (re) {
        hits.push(`commit ${sha.slice(0, 10)}: added line matches /${re.source}/`);
        break;
      }
    }
  }
  return hits;
}

function check(revs) {
  const file = blocklistPath();
  const patterns = loadPatterns(file);
  if (!patterns) {
    console.error(`leak-check: no blocklist at ${file} — push refused (fail closed).`);
    return 1;
  }
  if (patterns.length === 0) {
    console.error(`leak-check: blocklist ${file} is empty — push refused (fail closed).`);
    return 1;
  }
  let hits = [];
  for (const rev of revs) {
    hits = hits.concat(scanTree(rev, file), scanCommits(rev, patterns));
  }
  if (hits.length) {
    console.error(`leak-check: ${hits.length} blocklisted occurrence(s) — push refused:`);
    for (const hit of hits.slice(0, 50)) console.error(`  ${hit}`);
    if (hits.length > 50) console.error(`  … ${hits.length - 50} more`);
    return 1;
  }
  console.error(`leak-check: ${revs.length} ref(s) clean against ${patterns.length} pattern(s).`);
  return 0;
}

function install() {
  const hooksDir = path.join(path.resolve(git(['rev-parse', '--git-common-dir']).trim()), 'hooks');
  const target = path.join(hooksDir, 'pre-push');
  const script = path.relative(git(['rev-parse', '--show-toplevel']).trim(), fileURLToPath(import.meta.url)).replace(/\\/g, '/');
  fs.writeFileSync(
    target,
    `#!/bin/sh\n# Installed by ${script} --install\nexec node "$(git rev-parse --show-toplevel)/${script}" --pre-push "$@"\n`,
  );
  fs.chmodSync(target, 0o755);
  console.error(`leak-check: pre-push hook installed at ${target}`);
  return 0;
}

const argv = process.argv.slice(2);
let code;
if (argv[0] === '--install') {
  code = install();
} else if (argv[0] === '--rev') {
  code = check([argv[1] || 'HEAD']);
} else if (argv[0] === '--pre-push') {
  const input = fs.readFileSync(0, 'utf8');
  const revs = input
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(' ')[1])
    .filter((sha) => sha && !ZERO.test(sha));
  code = revs.length ? check(revs) : 0;
} else {
  console.error('usage: leak-check.mjs --pre-push <remote> <url> | --rev <rev> | --install');
  code = 2;
}
process.exit(code);
