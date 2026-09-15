#!/usr/bin/env node
// =============================================================================
// lesson-cycle.test.mjs — case-driven test script for .claude/scripts/lesson-cycle.mjs
// Usage: node .claude/scripts/tests/lesson-cycle.test.mjs [--case <name>]
//
// Every case builds its fixtures in a temporary directory from template
// literals (no separate fixture files, no drift) and cleans up in finally.
// Without --case all cases run. Exit 1 as soon as one case fails.
//
// Asserting on the check id (V1…V6) is not cosmetic: without it every
// negative case would already be green on any unrelated error.
// =============================================================================

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const tool = path.join(repoRoot, '.claude', 'scripts', 'lesson-cycle.mjs');

const CRLF = '\r\n';
const crlf = (text) => text.replace(/\r?\n/g, CRLF);

const TAXONOMY_IDS = [
  'test-does-not-prove',
  'platform-contract-unknown',
  'silent-semantic-regression',
  'incomplete-sweep',
  'convention-violation',
  'guard-fail-open',
  'measurement-mismatch',
  'scope-drift',
];

// ---------------------------------------------------------------------------
// Fixture building blocks
// ---------------------------------------------------------------------------

function taxonomyFixture({ emptyExampleFor = null, omitConfigKey = null } = {}) {
  const rows = TAXONOMY_IDS.map((id) => {
    const example = id === emptyExampleFor ? '' : `2026-08-18 — example for ${id}`;
    return `| \`${id}\` | Name ${id} | Definition for ${id} in one sentence. | ${example} |`;
  });
  const configLines = [
    'cycle_length: month',
    'nudge_entry_threshold: 40',
    'archive_dir: .claude/context/lessons-archive',
  ].filter((line) => !omitConfigKey || !line.startsWith(`${omitConfigKey}:`));
  return crlf(`# Fixture taxonomy

## Error classes

| id | Name | Definition (one sentence) | Example (lesson) |
|---|---|---|---|
${rows.join('\n')}

## Config

\`\`\`yaml
${configLines.join('\n')}
\`\`\`
`);
}

function entryFixture({ date, title, scope = 'project', cls, body = 'X happened.' }) {
  const lines = [`## ${date} — ${title}`, `**scope:** ${scope}`];
  if (cls) {
    lines.push(`**class:** ${cls}`);
  }
  lines.push('', `**What went wrong**: ${body}`, '**Rule**: The rule for it.', '');
  return crlf(lines.join('\n'));
}

function lessonsFixture(cycle, entryTexts, { withHeader = true } = {}) {
  const header = withHeader ? `<!-- lesson-cycle: ${cycle} | opened: ${cycle}-01 -->${CRLF}${CRLF}` : '';
  return header + entryTexts.join(CRLF);
}

function withTmpDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-cycle-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixtures(dir, { taxonomy, lessons }) {
  const taxonomyPath = path.join(dir, 'lesson-cycle.md');
  const lessonsPath = path.join(dir, 'lessons.md');
  fs.writeFileSync(taxonomyPath, taxonomy);
  fs.writeFileSync(lessonsPath, lessons);
  return { taxonomyPath, lessonsPath, archiveDir: path.join(dir, 'lessons-archive') };
}

function runTool(args) {
  const res = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', cwd: repoRoot });
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

function runGit(args, { allowFail = false } = {}) {
  const res = spawnSync('git', args, { encoding: 'utf8', cwd: repoRoot });
  if (res.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  }
  return res.status === 0 ? res.stdout : '';
}

// Base commit for the inventory checks: the merge-base with the remote default
// branch when one exists, otherwise HEAD (uncommitted edits are then compared
// against the last commit).
function resolveBase() {
  for (const ref of ['origin/main', 'origin/master']) {
    const base = runGit(['merge-base', 'HEAD', ref], { allowFail: true }).trim();
    if (base) {
      return base;
    }
  }
  return runGit(['rev-parse', 'HEAD']).trim();
}

// Count headings — fence-aware so ```-blocks do not yield phantom entries.
function collectHeadings(text) {
  const headings = [];
  let inFence = false;
  for (const rawLine of text.split(/\r\n|\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^## \d{4}-\d{2}-\d{2}\s*[—–-]\s/.test(line)) {
      headings.push(line);
    }
  }
  return headings;
}

// ---------------------------------------------------------------------------
// Cases — validator (negative cases check exit 1 AND the check id V1…V5)
// ---------------------------------------------------------------------------

function caseUnknownClass() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'Valid entry', cls: 'test-does-not-prove' }),
        entryFixture({ date: '2026-08-06', title: 'Unknown class', cls: 'does-not-exist' }),
      ]),
    });
    const { status, out } = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(status, 1, `validator must exit 1 (was ${status}). Output: ${out}`);
    assert.match(out, /V3/, `output must contain the check id V3. Output: ${out}`);
    assert.match(out, /does-not-exist/, 'output must name the invalid class value');

    // `unclassified` is explicitly not a valid value.
    fs.writeFileSync(lessonsPath, lessonsFixture('2026-08', [
      entryFixture({ date: '2026-08-05', title: 'Unclassified', cls: 'unclassified' }),
    ]));
    const second = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(second.status, 1, 'unclassified must be rejected');
    assert.match(second.out, /V3/, 'unclassified must be rejected as V3');
  });
}

function caseMissingClass() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'With class', cls: 'guard-fail-open' }),
        entryFixture({ date: '2026-08-07', title: 'Without class', cls: null }),
      ]),
    });
    const { status, out } = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(status, 1, `validator must exit 1 (was ${status}). Output: ${out}`);
    assert.match(out, /V2/, `output must contain the check id V2. Output: ${out}`);
    assert.match(out, /Without class/, 'output must name the title of the entry without class');
  });
}

function casePreCycleEntry() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'In cycle', cls: 'incomplete-sweep' }),
        entryFixture({ date: '2026-07-14', title: 'Before the cycle', cls: 'incomplete-sweep' }),
      ]),
    });
    const { status, out } = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(status, 1, `validator must exit 1 (was ${status}). Output: ${out}`);
    assert.match(out, /V5/, `output must contain the check id V5. Output: ${out}`);
    assert.match(out, /2026-07-14/, 'output must name the date of the pre-cycle entry');
    assert.match(out, /2026-08/, 'output must name the cycle boundary');
  });
}

function caseMalformedTaxonomy() {
  withTmpDir((dir) => {
    // (a) empty example cell
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture({ emptyExampleFor: 'measurement-mismatch' }),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'Valid', cls: 'measurement-mismatch' }),
      ]),
    });
    const first = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(first.status, 1, `empty example must exit 1. Output: ${first.out}`);
    assert.match(first.out, /V1/, `output must contain the check id V1. Output: ${first.out}`);
    assert.match(first.out, /measurement-mismatch/, 'output must name the affected class');

    // (b) config block without archive_dir
    fs.writeFileSync(taxonomyPath, taxonomyFixture({ omitConfigKey: 'archive_dir' }));
    const second = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(second.status, 1, `missing config key must exit 1. Output: ${second.out}`);
    assert.match(second.out, /V1/, `output must contain the check id V1. Output: ${second.out}`);
    assert.match(second.out, /archive_dir/, 'output must name the missing key');
  });
}

// ---------------------------------------------------------------------------
// Cases — close
// ---------------------------------------------------------------------------

function caseCloseRoundtrip() {
  withTmpDir((dir) => {
    // Two entries before the cycle boundary (2026-08-01), three after it in
    // NON-chronological order. One moved entry carries an em-dash, umlauts
    // and backticks for the verbatim check.
    const moved1 = entryFixture({
      date: '2026-07-10',
      title: 'Old entry with special characters',
      cls: 'test-does-not-prove',
      body: 'Em-dash — umlauts äöüß and `backticks` must survive byte-identically.',
    });
    const moved2 = entryFixture({ date: '2026-07-20', title: 'Second old entry', cls: 'guard-fail-open' });
    const stay1 = entryFixture({ date: '2026-08-15', title: 'Stays one', cls: 'incomplete-sweep' });
    const stay2 = entryFixture({ date: '2026-08-03', title: 'Stays two', cls: 'incomplete-sweep' });
    const stay3 = entryFixture({ date: '2026-08-10', title: 'Stays three', cls: 'scope-drift' });

    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-07', [moved1, stay1, moved2, stay2, stay3]),
    });

    const { status, out } = runTool([
      '--mode', 'close',
      '--path', lessonsPath,
      '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir,
    ]);
    assert.equal(status, 0, `close must exit 0. Output: ${out}`);

    const archivePath = path.join(archiveDir, '2026-07.md');
    assert.ok(fs.existsSync(archivePath), 'archive file lessons-archive/2026-07.md must exist');

    const archiveBuffer = fs.readFileSync(archivePath);
    const archive = archiveBuffer.toString('utf8');
    const lessons = fs.readFileSync(lessonsPath, 'utf8');

    // Exactly the pre-cycle entries, verbatim, in the archive.
    assert.ok(archive.includes(moved1), 'archive must contain the first moved entry verbatim');
    assert.ok(archive.includes(moved2), 'archive must contain the second moved entry verbatim');
    assert.ok(archive.includes('Em-dash — umlauts äöüß and `backticks`'), 'special characters must be intact');
    assert.ok(!archive.includes('�') && !lessons.includes('�'), 'no U+FFFD (encoding damage)');
    assert.equal(archiveBuffer[0] === 0xef && archiveBuffer[1] === 0xbb, false, 'archive must not carry a BOM');
    assert.ok(archive.includes(CRLF), 'archive must keep CRLF line endings');
    assert.ok(!/(^|[^\r])\n/.test(lessons), 'lessons.md must not contain bare LF (CRLF preserved)');

    // Archive head block: cycle id, period, count per class.
    assert.match(archive, /2026-07/, 'archive head must name the cycle id');
    assert.match(archive, /test-does-not-prove:\s*1/, 'head block must carry the class count test-does-not-prove: 1');
    assert.match(archive, /guard-fail-open:\s*1/, 'head block must carry the class count guard-fail-open: 1');

    // Source file: exactly the remaining entries, unchanged order, header advanced.
    assert.ok(lessons.startsWith('<!-- lesson-cycle: 2026-08 | opened: 2026-08-01 -->'), `header must be advanced to 2026-08. File starts with: ${lessons.slice(0, 60)}`);
    assert.ok(lessons.includes(stay1) && lessons.includes(stay2) && lessons.includes(stay3), 'remaining entries must be preserved verbatim');
    assert.ok(!lessons.includes('Old entry with special characters') && !lessons.includes('Second old entry'), 'moved entries must no longer be in lessons.md');
    const i1 = lessons.indexOf('Stays one');
    const i2 = lessons.indexOf('Stays two');
    const i3 = lessons.indexOf('Stays three');
    assert.ok(i1 < i2 && i2 < i3, 'order of the remaining entries must stay unchanged (non-chronological)');

    // No entry lost: 2 + 3 = 5.
    assert.equal(collectHeadings(archive).length, 2, 'archive must contain exactly 2 entries');
    assert.equal(collectHeadings(lessons).length, 3, 'lessons.md must contain exactly 3 entries');

    // No-op: fixture without due entries — exit 0, no file, notice.
    const noopDir = path.join(dir, 'noop-archive');
    const noopLessons = path.join(dir, 'noop-lessons.md');
    fs.writeFileSync(noopLessons, lessonsFixture('2026-07', [
      entryFixture({ date: '2026-08-05', title: 'Still open', cls: 'incomplete-sweep' }),
    ]));
    const noop = runTool(['--mode', 'close', '--path', noopLessons, '--taxonomy', taxonomyPath, '--archive-dir', noopDir]);
    assert.equal(noop.status, 0, `no-op close must exit 0. Output: ${noop.out}`);
    assert.ok(!fs.existsSync(path.join(noopDir, '2026-07.md')), 'no-op must not create an archive file');
    assert.match(noop.out, /[Nn]othing/, 'no-op must print a notice');
  });
}

// Close append: an archive file for the cycle already exists (from a previous
// close run) — the second run must append, not overwrite, AND the head block
// must be recomputed from the FULL file content (both runs together) instead
// of staying at the state of the first run.
function caseCloseAppend() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-07', [
        entryFixture({ date: '2026-06-05', title: 'First old entry', cls: 'guard-fail-open' }),
        entryFixture({ date: '2026-08-01', title: 'Stays in cycle', cls: 'incomplete-sweep' }),
      ]),
    });

    // First close run: creates the archive file with a head block for 1 entry.
    const first = runTool(['--mode', 'close', '--path', lessonsPath, '--taxonomy', taxonomyPath, '--archive-dir', archiveDir]);
    assert.equal(first.status, 0, `first close must exit 0. Output: ${first.out}`);
    const archivePath = path.join(archiveDir, '2026-07.md');
    assert.ok(fs.existsSync(archivePath), 'archive file must exist after the first close');
    assert.match(fs.readFileSync(archivePath, 'utf8'), /\*\*Entries:\*\*\s*1/, 'head block after the first run must count 1 entry');

    // Second close run: header in lessons.md set to 2026-07 again (e.g. a
    // second batch of pre-cycle entries submitted late) — the archive file
    // from the first run already exists.
    fs.writeFileSync(lessonsPath, lessonsFixture('2026-07', [
      entryFixture({ date: '2026-06-20', title: 'Second old entry', cls: 'scope-drift' }),
      entryFixture({ date: '2026-08-02', title: 'Stays in cycle, second round', cls: 'incomplete-sweep' }),
    ]));
    const second = runTool(['--mode', 'close', '--path', lessonsPath, '--taxonomy', taxonomyPath, '--archive-dir', archiveDir]);
    assert.equal(second.status, 0, `second close (append) must exit 0. Output: ${second.out}`);

    const archive = fs.readFileSync(archivePath, 'utf8');

    // Appended, not overwritten: entries from both runs present verbatim.
    assert.ok(archive.includes('First old entry'), 'entry from the first close run must not vanish on append');
    assert.ok(archive.includes('Second old entry'), 'entry from the second close run must be appended');

    // Head block must reflect the FULL content — 2 entries, both classes.
    assert.match(archive, /\*\*Entries:\*\*\s*2/, `head block must count 2 entries after the append (both runs together). Archive:\n${archive}`);
    assert.match(archive, /guard-fail-open:\s*1/, 'head block must still count guard-fail-open from the first run');
    assert.match(archive, /scope-drift:\s*1/, 'head block must count scope-drift from the second run');

    // Exactly one head block — no second "**Entries:**" from naively concatenating two headers.
    const headCount = (archive.match(/\*\*Entries:\*\*/g) ?? []).length;
    assert.equal(headCount, 1, `exactly one head block must exist (was ${headCount})`);

    // Order: the entry archived first still precedes the one appended later.
    assert.ok(archive.indexOf('First old entry') < archive.indexOf('Second old entry'), 'order of archive entries must be preserved (first before second run)');
  });
}

// Close within month: the threshold trigger (nudge_entry_threshold) can make a
// close necessary mid-month. Then the header must NOT blindly jump to the next
// month: the running month is still open, and every new lesson dated today
// would violate V5. --today is the test-side override of "today" (fixture
// tests only, see the script header of lesson-cycle.mjs).
function caseCloseWithinMonth() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'Threshold one', cls: 'incomplete-sweep' }),
        entryFixture({ date: '2026-08-15', title: 'Threshold two', cls: 'guard-fail-open' }),
      ]),
    });

    const { status, out } = runTool([
      '--mode', 'close', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--today', '2026-08-28',
    ]);
    assert.equal(status, 0, `close within the running month must exit 0. Output: ${out}`);

    // The move boundary stays the start of the following month: both entries
    // are archived although the month is still running.
    const archivePath = path.join(archiveDir, '2026-08.md');
    assert.ok(fs.existsSync(archivePath), 'entries must be archived despite the running month');
    const lessons = fs.readFileSync(lessonsPath, 'utf8');
    assert.equal(collectHeadings(lessons).length, 0, 'both entries must be archived');

    // Core assertion: the same cycle stays open, opened unchanged.
    assert.ok(
      lessons.startsWith('<!-- lesson-cycle: 2026-08 | opened: 2026-08-01 -->'),
      `header must stay at 2026-08 (opened 2026-08-01) on a close within the month. File starts with: ${lessons.slice(0, 60)}`,
    );

    // A new lesson dated "today" does not violate V5 afterwards.
    fs.appendFileSync(lessonsPath, entryFixture({ date: '2026-08-30', title: 'After the threshold close', cls: 'scope-drift' }));
    const validateRun = runTool(['--mode', 'validate', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(validateRun.status, 0, `new lesson in the still-open cycle must not violate V5. Output: ${validateRun.out}`);

    // The next run after the month change appends to the SAME archive file
    // and only now advances the header.
    const second = runTool([
      '--mode', 'close', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--today', '2026-09-02',
    ]);
    assert.equal(second.status, 0, `second close after the month change must exit 0. Output: ${second.out}`);
    const archive = fs.readFileSync(archivePath, 'utf8');
    assert.equal(collectHeadings(archive).length, 3, 'all three entries of the cycle must be in the same archive file');
    assert.match(archive, /\*\*Entries:\*\*\s*3/, 'head block must count 3 entries after the append');
    const after = fs.readFileSync(lessonsPath, 'utf8');
    assert.ok(
      after.startsWith('<!-- lesson-cycle: 2026-09 | opened: 2026-09-01 -->'),
      `after the month change the header must be advanced to 2026-09. File starts with: ${after.slice(0, 60)}`,
    );
  });
}

// Close after month change: the close opens the following month — the
// existing (and still correct) behaviour, now checked deterministically via
// --today instead of implicitly via the system clock.
function caseCloseAfterMonthChange() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'August entry', cls: 'incomplete-sweep' }),
      ]),
    });
    const { status, out } = runTool([
      '--mode', 'close', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--today', '2026-09-03',
    ]);
    assert.equal(status, 0, `close after the month change must exit 0. Output: ${out}`);
    const lessons = fs.readFileSync(lessonsPath, 'utf8');
    assert.ok(
      lessons.startsWith('<!-- lesson-cycle: 2026-09 | opened: 2026-09-01 -->'),
      `header must be advanced to the following month. File starts with: ${lessons.slice(0, 60)}`,
    );
    assert.ok(fs.existsSync(path.join(archiveDir, '2026-08.md')), 'archive file 2026-08.md must exist');
  });
}

// ---------------------------------------------------------------------------
// Cases — graduate (move instead of delete)
// ---------------------------------------------------------------------------

function claudeMdFixture() {
  return crlf(`# Fixture CLAUDE

## Something before

Prose that must stay untouched.

## Learned Rules

- Existing rule one
- Existing rule two

## Something after

This prose stays too.
`);
}

// Graduate roundtrip: graduation moves the entry verbatim to graduated.md
// (head block as for the cycle archive, append on existing file) and appends
// the one-line rule to ## Learned Rules — nothing is deleted, the "What went
// wrong" narrative survives in the archive.
function caseGraduateRoundtrip() {
  withTmpDir((dir) => {
    const graduating = entryFixture({
      date: '2026-08-05',
      title: 'Gets graduated',
      scope: 'framework',
      cls: 'test-does-not-prove',
      body: 'Narrative with em-dash — umlauts äöüß and `backticks` that must survive.',
    });
    const staying = entryFixture({ date: '2026-08-10', title: 'Stays put', cls: 'guard-fail-open' });
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [graduating, staying]),
    });
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, claudeMdFixture());

    const { status, out } = runTool([
      '--mode', 'graduate', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--claude-md', claudeMdPath,
      '--entry', '2026-08-05 — Gets graduated',
      '--rule', 'New graduated rule one.',
    ]);
    assert.equal(status, 0, `graduate must exit 0. Output: ${out}`);

    // lessons.md: entry gone, header and remaining entries unchanged.
    const lessons = fs.readFileSync(lessonsPath, 'utf8');
    assert.ok(lessons.startsWith('<!-- lesson-cycle: 2026-08 | opened: 2026-08-01 -->'), 'header must not change through graduate');
    assert.ok(!lessons.includes('Gets graduated'), 'graduated entry must no longer be in lessons.md');
    assert.ok(lessons.includes(staying), 'non-graduated entry must be preserved verbatim');
    assert.ok(!/(^|[^\r])\n/.test(lessons), 'lessons.md must not contain bare LF (CRLF preserved)');

    // graduated.md: entry verbatim + head block as for the cycle archive.
    const graduatedPath = path.join(archiveDir, 'graduated.md');
    assert.ok(fs.existsSync(graduatedPath), 'lessons-archive/graduated.md must exist');
    const graduatedBuffer = fs.readFileSync(graduatedPath);
    const graduated = graduatedBuffer.toString('utf8');
    assert.ok(graduated.includes(graduating), 'graduated.md must contain the entry verbatim (the narrative survives)');
    assert.ok(graduated.includes('em-dash — umlauts äöüß and `backticks`'), 'special characters must be intact');
    assert.ok(!graduated.includes('�'), 'no U+FFFD (encoding damage)');
    assert.equal(graduatedBuffer[0] === 0xef && graduatedBuffer[1] === 0xbb, false, 'graduated.md must not carry a BOM');
    assert.ok(graduated.includes(CRLF), 'graduated.md must keep CRLF line endings');
    assert.match(graduated, /\*\*Entries:\*\*\s*1/, 'head block must count 1 entry');
    assert.match(graduated, /test-does-not-prove:\s*1/, 'head block must count the class of the entry');

    // CLAUDE.md: rule as the last line of the Learned Rules section, before
    // the next ## section; everything else unchanged.
    const claude = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(claude.includes(`- Existing rule two${CRLF}- New graduated rule one.${CRLF}`), `rule must directly follow the last existing rule. CLAUDE.md:\n${claude}`);
    assert.ok(claude.indexOf('- New graduated rule one.') < claude.indexOf('## Something after'), 'rule must be inside the Learned Rules section, not after it');
    assert.ok(claude.includes('Prose that must stay untouched.') && claude.includes('This prose stays too.'), 'remaining CLAUDE.md content must stay untouched');
    assert.ok(!/(^|[^\r])\n/.test(claude), 'CLAUDE.md must not contain bare LF (CRLF preserved)');

    // Second graduation: append to graduated.md with a recomputed head block
    // (like close append), rule after the first one.
    const second = runTool([
      '--mode', 'graduate', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--claude-md', claudeMdPath,
      '--entry', '2026-08-10 — Stays put',
      '--rule', 'New graduated rule two.',
    ]);
    assert.equal(second.status, 0, `second graduation (append) must exit 0. Output: ${second.out}`);
    const graduated2 = fs.readFileSync(graduatedPath, 'utf8');
    assert.ok(graduated2.includes('Gets graduated') && graduated2.includes('Stays put'), 'both graduated entries must be in graduated.md');
    assert.ok(graduated2.indexOf('Gets graduated') < graduated2.indexOf('Stays put'), 'order of graduations must be preserved');
    assert.match(graduated2, /\*\*Entries:\*\*\s*2/, 'head block must count 2 entries after the append');
    assert.match(graduated2, /guard-fail-open:\s*1/, 'head block must count the class of the second graduation');
    assert.equal((graduated2.match(/\*\*Entries:\*\*/g) ?? []).length, 1, 'exactly one head block must exist');
    assert.equal(collectHeadings(fs.readFileSync(lessonsPath, 'utf8')).length, 0, 'lessons.md must have 0 entries after both graduations');
    const claude2 = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(claude2.indexOf('rule one.') < claude2.indexOf('rule two.'), 'rules must be appended in graduation order');
  });
}

// Graduate unknown: unknown heading text → exit 1 with a clear message, NO
// half state (none of the three files touched).
function caseGraduateUnknownEntry() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'Only entry', cls: 'incomplete-sweep' }),
      ]),
    });
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, claudeMdFixture());
    const before = { lessons: fs.readFileSync(lessonsPath, 'utf8'), claude: fs.readFileSync(claudeMdPath, 'utf8') };

    const { status, out } = runTool([
      '--mode', 'graduate', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--claude-md', claudeMdPath,
      '--entry', '2026-08-05 — Does not exist',
      '--rule', 'Rule that must never land.',
    ]);
    assert.equal(status, 1, `unknown entry must exit 1 (was ${status}). Output: ${out}`);
    assert.match(out, /not found/, 'output must clearly report that the entry was not found');
    assert.match(out, /Does not exist/, 'output must name the heading text that was searched for');
    assert.equal(fs.readFileSync(lessonsPath, 'utf8'), before.lessons, 'lessons.md must stay unchanged');
    assert.equal(fs.readFileSync(claudeMdPath, 'utf8'), before.claude, 'CLAUDE.md must stay unchanged');
    assert.ok(!fs.existsSync(path.join(archiveDir, 'graduated.md')), 'graduated.md must not be created');
  });
}

// Graduate empty rule: empty / whitespace-only rule → exit 1, NO half state —
// in particular the entry must not already be moved before the rule check
// fires (atomicity probe).
function caseGraduateEmptyRule() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath, archiveDir } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-05', title: 'Only entry', cls: 'incomplete-sweep' }),
      ]),
    });
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, claudeMdFixture());
    const before = { lessons: fs.readFileSync(lessonsPath, 'utf8'), claude: fs.readFileSync(claudeMdPath, 'utf8') };

    const { status, out } = runTool([
      '--mode', 'graduate', '--path', lessonsPath, '--taxonomy', taxonomyPath,
      '--archive-dir', archiveDir, '--claude-md', claudeMdPath,
      '--entry', '2026-08-05 — Only entry',
      '--rule', '   ',
    ]);
    assert.equal(status, 1, `empty rule must exit 1 (was ${status}). Output: ${out}`);
    assert.match(out, /[Rr]ule/, 'output must name the empty rule as the reason');
    assert.equal(fs.readFileSync(lessonsPath, 'utf8'), before.lessons, 'lessons.md must stay unchanged (no half state)');
    assert.equal(fs.readFileSync(claudeMdPath, 'utf8'), before.claude, 'CLAUDE.md must stay unchanged (no half state)');
    assert.ok(!fs.existsSync(path.join(archiveDir, 'graduated.md')), 'graduated.md must not be created (no half state)');
  });
}

// ---------------------------------------------------------------------------
// Cases — report
// ---------------------------------------------------------------------------

function caseReportCounts() {
  withTmpDir((dir) => {
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', [
        entryFixture({ date: '2026-08-03', title: 'TDNP one', cls: 'test-does-not-prove' }),
        entryFixture({ date: '2026-08-11', title: 'TDNP two', cls: 'test-does-not-prove' }),
        entryFixture({ date: '2026-08-07', title: 'TDNP three', cls: 'test-does-not-prove' }),
        entryFixture({ date: '2026-08-09', title: 'GFO one', cls: 'guard-fail-open' }),
      ]),
    });
    const { status, out } = runTool(['--mode', 'report', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(status, 0, `a report is never a gate — exit 0 expected. Output: ${out}`);

    // Exactly one line per taxonomy class, also for classes with 0 hits.
    const counts = {};
    for (const id of TAXONOMY_IDS) {
      const matches = out.split(/\r?\n/).filter((line) => line.startsWith(`${id} `) || line.startsWith(`${id}\t`) || line.startsWith(`${id} ·`));
      assert.equal(matches.length, 1, `exactly one line expected for class ${id} (were ${matches.length}). Output: ${out}`);
      const m = matches[0].match(/·\s*(\d+)\s*·/);
      assert.ok(m, `line for ${id} must carry a count: ${matches[0]}`);
      counts[id] = Number(m[1]);
    }
    assert.equal(counts['test-does-not-prove'], 3, 'test-does-not-prove must count 3');
    assert.equal(counts['guard-fail-open'], 1, 'guard-fail-open must count 1');
    assert.equal(counts['scope-drift'], 0, 'a class without hits must explicitly count 0');
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    assert.equal(sum, 4, `sum of counts (${sum}) must equal the entry count (4)`);

    // Newest date per class + status line (format/cycle/entries here; the
    // truth value of "close due" itself is NOT checked here — the alternation
    // (yes|no) would stay green even for a hard-wired value. That is the
    // deliberate job of report-status below.)
    assert.match(out, /test-does-not-prove\s*·\s*3\s*·\s*2026-08-11/, 'the "newest date" column must carry the latest date');
    assert.match(out, /cycle: 2026-08 · entries: 4 · close due: (yes|no)/, 'cycle status line must be printed in the right format with cycle/entries');
  });
}

function currentMonthLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// report-status: the "close due" truth value itself is checked (not just its
// presence) — otherwise a hard-wired `due = false` would go unnoticed. The
// first half uses the threshold condition (74 > 40), which is deterministic
// regardless of the current calendar month; the second half uses the real
// running month so the month-change branch is also checked sharply without
// going stale as the date advances.
function caseReportStatus() {
  withTmpDir((dir) => {
    // Header 2026-08, 74 entries, threshold 40 → close due: yes.
    const manyEntries = [];
    for (let i = 1; i <= 74; i += 1) {
      const day = String((i % 28) + 1).padStart(2, '0');
      manyEntries.push(entryFixture({ date: `2026-08-${day}`, title: `Entry ${i}`, cls: 'incomplete-sweep' }));
    }
    const { taxonomyPath, lessonsPath } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture('2026-08', manyEntries),
    });
    const { status, out } = runTool(['--mode', 'report', '--path', lessonsPath, '--taxonomy', taxonomyPath]);
    assert.equal(status, 0, `a report is never a gate. Output: ${out}`);
    assert.match(out, /cycle: 2026-08 · entries: 74 · close due: yes/, '74 entries above the threshold 40 must yield "close due: yes"');

    // Header on the running month, 3 entries → close due: no.
    const currentCycle = currentMonthLabel();
    const { taxonomyPath: taxonomyPath2, lessonsPath: lessonsPath2 } = writeFixtures(dir, {
      taxonomy: taxonomyFixture(),
      lessons: lessonsFixture(currentCycle, [
        entryFixture({ date: `${currentCycle}-02`, title: 'Fresh one', cls: 'incomplete-sweep' }),
        entryFixture({ date: `${currentCycle}-03`, title: 'Fresh two', cls: 'guard-fail-open' }),
        entryFixture({ date: `${currentCycle}-04`, title: 'Fresh three', cls: 'scope-drift' }),
      ]),
    });
    const second = runTool(['--mode', 'report', '--path', lessonsPath2, '--taxonomy', taxonomyPath2]);
    assert.equal(second.status, 0, `a report is never a gate. Output: ${second.out}`);
    assert.match(
      second.out,
      new RegExp(`cycle: ${currentCycle} · entries: 3 · close due: no`),
      'running month, 3 entries below the threshold must yield "close due: no"',
    );
  });
}

// ---------------------------------------------------------------------------
// Cases — inventory (runs against the real repo)
// ---------------------------------------------------------------------------

function caseNoEntryLost() {
  const base = resolveBase();
  assert.ok(base, 'base commit must be resolvable');

  const baseLessons = runGit(['show', `${base}:.claude/context/lessons.md`], { allowFail: true });
  const baseArchiveFiles = runGit(
    ['ls-tree', '-r', '--name-only', base, '.claude/context/lessons-archive'],
    { allowFail: true },
  ).split(/\r?\n/).filter((f) => f.endsWith('.md'));
  let baseArchiveText = '';
  for (const file of baseArchiveFiles) {
    baseArchiveText += `\n${runGit(['show', `${base}:${file}`])}`;
  }

  const currentLessons = fs.readFileSync(path.join(repoRoot, '.claude/context/lessons.md'), 'utf8');
  const archiveDir = path.join(repoRoot, '.claude/context/lessons-archive');
  let currentArchiveText = '';
  if (fs.existsSync(archiveDir)) {
    for (const file of fs.readdirSync(archiveDir).filter((f) => f.endsWith('.md'))) {
      currentArchiveText += `\n${fs.readFileSync(path.join(archiveDir, file), 'utf8')}`;
    }
  }

  const baseHeadings = [...collectHeadings(baseLessons), ...collectHeadings(baseArchiveText)];
  const currentHeadings = [...collectHeadings(currentLessons), ...collectHeadings(currentArchiveText)];

  // Multiset inclusion: every base heading must still exist (with
  // multiplicity) — stronger than plain count equality, which would mask a
  // loss hidden by a simultaneous new entry.
  const multiset = new Map();
  for (const heading of currentHeadings) {
    multiset.set(heading, (multiset.get(heading) ?? 0) + 1);
  }
  const lost = [];
  for (const heading of baseHeadings) {
    const left = multiset.get(heading) ?? 0;
    if (left === 0) {
      lost.push(heading);
    } else {
      multiset.set(heading, left - 1);
    }
  }
  assert.deepEqual(lost, [], `Lost entries relative to base commit ${base.slice(0, 9)}: ${lost.join(' | ')}`);
  assert.ok(
    currentHeadings.length >= baseHeadings.length,
    `total (${currentHeadings.length}) must not drop below the base count (${baseHeadings.length})`,
  );
  console.log(`  base ${base.slice(0, 9)}: ${baseHeadings.length} headings · current: ${currentHeadings.length} (lessons.md ${collectHeadings(currentLessons).length} + archive ${collectHeadings(currentArchiveText).length})`);
}

// deletion-detected: a REAL deletion (entry gone, no graduation) must still be
// recognised as a loss by no-entry-lost — this is the check that must not be
// softened (graduation moves to graduated.md precisely SO THAT no-entry-lost
// can stay maximally strict). The case transiently mutates a real inventory
// file (removes one heading), calls caseNoEntryLost and restores the file
// byte-identically in finally.
function caseDeletionDetected() {
  const base = resolveBase();
  assert.ok(base, 'base commit must be resolvable');
  const candidates = [
    '.claude/context/lessons.md',
    ...runGit(['ls-tree', '-r', '--name-only', base, '.claude/context/lessons-archive'], { allowFail: true })
      .split(/\r?\n/).filter((f) => f.endsWith('.md')),
  ];
  let target = null;
  for (const relative of candidates) {
    const absolute = path.join(repoRoot, relative);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    const baseHeadings = collectHeadings(runGit(['show', `${base}:${relative}`], { allowFail: true }));
    if (baseHeadings.length === 0) {
      continue;
    }
    const diskHeadings = collectHeadings(fs.readFileSync(absolute, 'utf8'));
    const heading = baseHeadings.find((candidate) => diskHeadings.includes(candidate));
    if (heading) {
      target = { absolute, heading };
      break;
    }
  }
  if (!target) {
    // The base headings may all live in a file that only exists in the
    // working tree (first migration into the archive). Fall back to any
    // current file that still holds a base heading.
    const baseLessonsHeadings = collectHeadings(runGit(['show', `${base}:.claude/context/lessons.md`], { allowFail: true }));
    const archiveDir = path.join(repoRoot, '.claude/context/lessons-archive');
    if (fs.existsSync(archiveDir)) {
      for (const file of fs.readdirSync(archiveDir).filter((f) => f.endsWith('.md'))) {
        const absolute = path.join(archiveDir, file);
        const diskHeadings = collectHeadings(fs.readFileSync(absolute, 'utf8'));
        const heading = baseLessonsHeadings.find((candidate) => diskHeadings.includes(candidate));
        if (heading) {
          target = { absolute, heading };
          break;
        }
      }
    }
  }
  assert.ok(target, 'no base entry found whose deletion could be simulated');

  const originalBuffer = fs.readFileSync(target.absolute);
  const mutated = originalBuffer.toString('utf8')
    .split(/(?<=\n)/)
    .filter((line) => line.replace(/\s+$/, '') !== target.heading)
    .join('');
  assert.notEqual(mutated, originalBuffer.toString('utf8'), 'mutation must actually remove the heading');
  try {
    fs.writeFileSync(target.absolute, mutated);
    assert.throws(
      () => caseNoEntryLost(),
      /Lost entries/,
      'no-entry-lost must report a real deletion (entry gone, no graduation) as a loss',
    );
  } finally {
    fs.writeFileSync(target.absolute, originalBuffer);
  }
}

// ---------------------------------------------------------------------------
// Cases — writing sites
// ---------------------------------------------------------------------------

function readRepoFile(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}

function caseWriter3Fix() {
  const text = readRepoFile('.claude/skills/3_fix/SKILL.md');
  const step12 = text.match(/12\.\s+Self-improvement gate[\s\S]*?(?=\r?\n13\.)/);
  assert.ok(step12, '3_fix Step 12 (Self-improvement gate) must exist');
  // Do not check the whole Step 12 passage (the "Class guidelines" prose also
  // contains the string **class:** and would keep the assertion green even if
  // the template line itself were missing). Isolate the fenced template block
  // and anchor there.
  const fenced = step12[0].match(/```\r?\n([\s\S]*?)```/);
  assert.ok(fenced, '3_fix Step 12 must contain a fenced lesson template block');
  assert.match(fenced[1], /^\s*\*\*class:\*\* /m, '3_fix Step 12 template (in the fenced block) must prescribe a **class:** line');
  assert.ok(step12[0].includes('lesson-cycle.md'), '3_fix Step 12 must reference lesson-cycle.md');
}

function caseWriterInstincts() {
  const text = readRepoFile('.claude/rules/instincts.md');
  const bullet = text.split(/\r?\n/).find((line) => line.includes('Capture corrections'));
  assert.ok(bullet, 'instincts.md must contain the "Capture corrections" bullet');
  assert.ok(bullet.includes('class'), '"Capture corrections" must demand a class from the taxonomy');
  assert.ok(bullet.includes('lesson-cycle.md'), '"Capture corrections" must reference lesson-cycle.md');
}

function caseWriterShip() {
  const text = readRepoFile('.claude/skills/ship/SKILL.md');
  const step4b = text.match(/## Step 4b[\s\S]*?(?=\r?\n## Step 4c)/);
  assert.ok(step4b, 'ship Step 4b must exist');
  assert.ok(step4b[0].includes('lesson-cycle.mjs --mode report'), 'ship Step 4b must call lesson-cycle.mjs --mode report');
  assert.ok(/not Step 4b/.test(step4b[0]), 'ship Step 4b must state that closing the cycle is not the job of Step 4b');
  // Graduation runs through the tool (move instead of delete) — never as a
  // hand edit, and without a delete clause: a silent deletion is the second
  // way to violate the inventory.
  assert.ok(step4b[0].includes('lesson-cycle.mjs --mode graduate'), 'ship Step 4b must handle graduation via lesson-cycle.mjs --mode graduate (no hand edit)');
  assert.ok(!step4b[0].includes('already enforced by code'), 'ship Step 4b must no longer contain a delete clause ("already enforced by code")');
  assert.ok(!/\*\*Delete\*\*/.test(step4b[0]), 'ship Step 4b must no longer contain a Delete branch — entries are moved, never deleted');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const cases = {
  'unknown-class': caseUnknownClass,
  'missing-class': caseMissingClass,
  'pre-cycle-entry': casePreCycleEntry,
  'malformed-taxonomy': caseMalformedTaxonomy,
  'close-roundtrip': caseCloseRoundtrip,
  'close-append': caseCloseAppend,
  'close-within-month': caseCloseWithinMonth,
  'close-after-month-change': caseCloseAfterMonthChange,
  'graduate-roundtrip': caseGraduateRoundtrip,
  'graduate-unknown-entry': caseGraduateUnknownEntry,
  'graduate-empty-rule': caseGraduateEmptyRule,
  'report-counts': caseReportCounts,
  'report-status': caseReportStatus,
  'no-entry-lost': caseNoEntryLost,
  'deletion-detected': caseDeletionDetected,
  'writer-3fix': caseWriter3Fix,
  'writer-instincts': caseWriterInstincts,
  'writer-ship': caseWriterShip,
};

const argv = process.argv.slice(2);
const caseIndex = argv.indexOf('--case');
const selected = caseIndex !== -1 ? [argv[caseIndex + 1]] : Object.keys(cases);

let failed = 0;
for (const name of selected) {
  if (!cases[name]) {
    console.error(`Unknown case: ${name}. Available: ${Object.keys(cases).join(', ')}`);
    process.exit(2);
  }
  try {
    cases[name]();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
