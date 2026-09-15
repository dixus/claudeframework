#!/usr/bin/env node
// =============================================================================
// lesson-cycle.mjs — report / validate / close / graduate for the lesson cycle
//
// SYNOPSIS
//   Checks and maintains .claude/context/lessons.md against the error-class
//   taxonomy in .claude/context/lesson-cycle.md. The taxonomy table and the
//   ## Config yaml block in that file are the only source of valid class ids
//   and cycle parameters — this script reads them, it does not define a
//   second list.
//
// MODES (--mode)
//   report    One line per taxonomy class (id · count · newest date), classes
//             with 0 hits printed explicitly as 0, followed by the cycle
//             status line (cycle · entries · close due). Exit 0 — a report is
//             never a gate.
//   validate  Exit 1 with a check id + line + reason when a check fails:
//               V1  Taxonomy well-formed: parsable class table, every row
//                   with a non-empty definition AND a non-empty example,
//                   config block with cycle_length, nudge_entry_threshold,
//                   archive_dir.
//               V2  Every entry carries a class: line.
//               V3  Every class: value exists in the taxonomy (`unclassified`
//                   is not a value).
//               V4  lessons.md starts with the cycle header line.
//               V5  No entry is older than the start of the open cycle
//                   (otherwise an archive run is overdue or incomplete).
//               V6  Every non-fenced "## " line that is not a well-formed
//                   entry heading (## YYYY-MM-DD — <title>) is reported
//                   instead of silently merging into the previous entry
//                   (otherwise V2/V3/V5 would skip that entry).
//   close     Archive run (triggered manually, never automatically): moves
//             every entry dated before the start of the month following the
//             open cycle losslessly to <archive_dir>/<cycle>.md (head block
//             with cycle id, period, count per class; appends when the file
//             exists). The header line in lessons.md advances to the next
//             month only when the calendar month has already turned; on a
//             threshold-triggered close mid-month (nudge_entry_threshold) the
//             same cycle and its opened date stay — otherwise every new
//             lesson dated today would violate V5. No due entries: no-op,
//             exit 0.
//   graduate  Graduation of one entry (called by /ship Step 4b): moves the
//             entry named by --entry (heading text without "## ", exact
//             match) verbatim to <archive_dir>/graduated.md (head block as
//             for a cycle archive; appends when the file exists) and appends
//             the one-line rule passed via --rule to "## Learned Rules" in
//             CLAUDE.md. Nothing is deleted — the narrative survives in the
//             archive and the no-entry-lost test stays maximally strict.
//             Entry not found or rule empty/multi-line: exit 1, no file
//             touched (write order archive → CLAUDE.md → lessons.md, so an
//             abort leaves at worst a duplicate, never a loss).
//
// PARAMETERS
//   --path <file>         Lessons file (default: .claude/context/lessons.md)
//   --taxonomy <file>     Taxonomy file (default: .claude/context/lesson-cycle.md)
//   --archive-dir <dir>   Archive directory (default: archive_dir from
//                         ## Config, relative to the repo root)
//   --claude-md <file>    CLAUDE.md for --mode graduate (default: CLAUDE.md
//                         in the repo root)
//   --entry <heading>     graduate: heading text of the entry without "## "
//   --rule <text>         graduate: one-line rule for ## Learned Rules
//   --today <YYYY-MM-DD>  Overrides "today" for report/close — ONLY for
//                         fixture tests (deterministic check of the
//                         month-change logic), never set in a real run.
//
// The repo root is the current working directory — run the script from the
// project root (which is where the skills invoke it).
//
// EXAMPLES
//   node .claude/scripts/lesson-cycle.mjs --mode report
//   node .claude/scripts/lesson-cycle.mjs --mode validate
//   node .claude/scripts/lesson-cycle.mjs --mode close
//   node .claude/scripts/lesson-cycle.mjs --mode graduate --entry "2026-08-05 — <title>" --rule "<rule text>"
//
// Node rather than a shell script: lessons.md must be written back
// byte-faithfully — CRLF or LF as found, UTF-8 without BOM, umlauts and
// em-dashes intact. Encoding damage from careless rewrites is exactly the
// kind of silent loss this tool exists to prevent.
// Tests: node .claude/scripts/tests/lesson-cycle.test.mjs
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const HEADER_RE = /^<!--\s*lesson-cycle:\s*(\d{4}-\d{2})\s*\|\s*opened:\s*(\d{4}-\d{2}-\d{2})\s*-->\s*$/;
const ENTRY_RE = /^## (\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.*)$/;
const SCOPE_RE = /^(?:\*\*scope:\*\*|scope:)\s*(.+?)\s*$/;
// Legacy tolerance when reading: bold normal form AND plain legacy form.
const CLASS_RE = /^(?:\*\*class:\*\*|class:)\s*(.+?)\s*$/;
const REQUIRED_CONFIG_KEYS = ['cycle_length', 'nudge_entry_threshold', 'archive_dir'];

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { mode: null, path: null, taxonomy: null, archiveDir: null, claudeMd: null, entry: null, rule: null, today: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) {
      exitWithUsage(`Missing value for ${key}`);
    }
    switch (key) {
      case '--mode': args.mode = value; break;
      case '--path': args.path = path.resolve(value); break;
      case '--taxonomy': args.taxonomy = path.resolve(value); break;
      case '--archive-dir': args.archiveDir = path.resolve(value); break;
      case '--claude-md': args.claudeMd = path.resolve(value); break;
      case '--entry': args.entry = value; break;
      case '--rule': args.rule = value; break;
      case '--today':
        // Fixture tests only (see script header).
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          exitWithUsage(`--today must be YYYY-MM-DD (was: ${value})`);
        }
        args.today = value;
        break;
      default: exitWithUsage(`Unknown argument: ${key}`);
    }
  }
  if (!['report', 'validate', 'close', 'graduate'].includes(args.mode)) {
    exitWithUsage(`--mode must be report, validate, close or graduate (was: ${args.mode})`);
  }
  args.path ??= path.join(repoRoot, '.claude', 'context', 'lessons.md');
  args.taxonomy ??= path.join(repoRoot, '.claude', 'context', 'lesson-cycle.md');
  args.claudeMd ??= path.join(repoRoot, 'CLAUDE.md');
  return args;
}

function exitWithUsage(message) {
  console.error(`${message}\nUsage: node .claude/scripts/lesson-cycle.mjs --mode <report|validate|close|graduate> [--path <file>] [--taxonomy <file>] [--archive-dir <dir>] [--claude-md <file>] [--entry <heading>] [--rule <text>] [--today <YYYY-MM-DD>]`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Parse the taxonomy (## Error classes + ## Config)
// ---------------------------------------------------------------------------

function parseTaxonomy(text, fileLabel) {
  const errors = [];
  const classes = [];

  const sectionMatch = text.match(/^## Error classes\s*$([\s\S]*?)(?=^## |\n*$(?![\s\S]))/m);
  if (!sectionMatch) {
    errors.push(`V1 ${fileLabel}: section "## Error classes" is missing`);
  } else {
    const tableLines = sectionMatch[1]
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith('|'));
    // Skip the header row and the separator row, parse the data rows.
    const dataLines = tableLines.filter((line) => !/^\s*\|[\s\-:|]+\|\s*$/.test(line)).slice(1);
    for (const line of dataLines) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.length < 4) {
        errors.push(`V1 ${fileLabel}: table row has fewer than 4 columns (id · name · definition · example): ${line.trim()}`);
        continue;
      }
      const id = cells[0].replace(/`/g, '').trim();
      const [, name, definition, example] = cells;
      if (!id) {
        errors.push(`V1 ${fileLabel}: table row without a class id: ${line.trim()}`);
        continue;
      }
      if (!definition) {
        errors.push(`V1 ${fileLabel}: class "${id}" has no definition`);
      }
      if (!example) {
        errors.push(`V1 ${fileLabel}: class "${id}" has no example`);
      }
      classes.push({ id, name, definition, example });
    }
    if (classes.length === 0) {
      errors.push(`V1 ${fileLabel}: no parsable class table under "## Error classes"`);
    }
  }

  const config = {};
  const configMatch = text.match(/^## Config\s*$[\s\S]*?```yaml\r?\n([\s\S]*?)```/m);
  if (!configMatch) {
    errors.push(`V1 ${fileLabel}: "## Config" with a yaml block is missing (required: ${REQUIRED_CONFIG_KEYS.join(', ')})`);
  } else {
    for (const line of configMatch[1].split(/\r?\n/)) {
      const keyValue = line.match(/^([A-Za-z_]+):\s*(.+?)\s*$/);
      if (keyValue) {
        config[keyValue[1]] = keyValue[2];
      }
    }
    for (const key of REQUIRED_CONFIG_KEYS) {
      if (!(key in config)) {
        errors.push(`V1 ${fileLabel}: config key "${key}" is missing from the ## Config block`);
      }
    }
  }

  return { classes, config, errors };
}

// ---------------------------------------------------------------------------
// Parse lessons — line-faithful (slices stay byte-identical to the original)
// ---------------------------------------------------------------------------

const stripEol = (line) => line.replace(/\r?\n$/, '');

// Fence-aware search for entry headings. Every non-fenced "## " line that
// does not match ENTRY_RE is recorded as malformed instead of silently
// merging into the previous entry (V6).
function scanBoundaries(lines, startIndex) {
  const boundaries = [];
  const malformed = [];
  let inFence = false;
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = stripEol(lines[i]);
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const entryMatch = line.match(ENTRY_RE);
    if (entryMatch) {
      boundaries.push({ index: i, date: entryMatch[1], title: entryMatch[2].trim() });
    } else if (/^##\s/.test(line)) {
      malformed.push({ index: i, raw: line });
    }
  }
  return { boundaries, malformed };
}

function buildEntries(lines, boundaries) {
  return boundaries.map((boundary, order) => {
    const end = order + 1 < boundaries.length ? boundaries[order + 1].index : lines.length;
    let scope = null;
    let cls = null;
    let entryFence = false;
    for (let i = boundary.index + 1; i < end; i += 1) {
      const line = stripEol(lines[i]);
      if (/^\s*```/.test(line)) {
        entryFence = !entryFence;
        continue;
      }
      if (entryFence) {
        continue;
      }
      scope ??= line.match(SCOPE_RE)?.[1] ?? null;
      cls ??= line.match(CLASS_RE)?.[1] ?? null;
    }
    return {
      date: boundary.date,
      title: boundary.title,
      lineNumber: boundary.index + 1,
      raw: lines.slice(boundary.index, end).join(''),
      scope,
      class: cls,
    };
  });
}

function parseLessons(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/(?<=\n)/);

  let header = null;
  let bodyStart = 0;
  if (lines.length > 0) {
    const headerMatch = stripEol(lines[0]).match(HEADER_RE);
    if (headerMatch) {
      header = { cycle: headerMatch[1], opened: headerMatch[2], raw: lines[0] };
      bodyStart = 1;
    }
  }

  const { boundaries, malformed } = scanBoundaries(lines, bodyStart);
  const preludeRaw = lines.slice(bodyStart, boundaries.length > 0 ? boundaries[0].index : lines.length).join('');
  const entries = buildEntries(lines, boundaries);

  return { header, entries, eol, preludeRaw, malformedHeadings: malformed };
}

// Like parseLessons but without the cycle header — for re-reading an
// existing archive file (close append, see below).
function extractEntries(text) {
  const lines = text.split(/(?<=\n)/);
  const { boundaries } = scanBoundaries(lines, 0);
  return buildEntries(lines, boundaries);
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

function validate(lessons, taxonomy, fileLabel) {
  const errors = [...taxonomy.errors];
  const validIds = new Set(taxonomy.classes.map((cls) => cls.id));

  if (!lessons.header) {
    errors.push(`V4 ${fileLabel}: first line is not a cycle header (<!-- lesson-cycle: YYYY-MM | opened: YYYY-MM-DD -->)`);
  }

  for (const heading of lessons.malformedHeadings) {
    errors.push(`V6 ${fileLabel}:${heading.index + 1}: line "${heading.raw}" is not a well-formed entry heading (## YYYY-MM-DD — <title>) — it would otherwise silently merge into the previous entry`);
  }

  for (const entry of lessons.entries) {
    if (!entry.class) {
      errors.push(`V2 ${fileLabel}:${entry.lineNumber}: entry "${entry.date} — ${entry.title}" has no class: line`);
    } else if (validIds.size > 0 && !validIds.has(entry.class)) {
      errors.push(`V3 ${fileLabel}:${entry.lineNumber}: class "${entry.class}" is not in the taxonomy (entry "${entry.date} — ${entry.title}")`);
    }
  }

  if (lessons.header) {
    const cycleStart = `${lessons.header.cycle}-01`;
    for (const entry of lessons.entries) {
      if (entry.date < cycleStart) {
        errors.push(`V5 ${fileLabel}:${entry.lineNumber}: entry dated ${entry.date} predates the open cycle ${lessons.header.cycle} (boundary ${cycleStart}) — archive run overdue or incomplete`);
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    return 1;
  }
  console.log(`OK: ${lessons.entries.length} entries, open cycle ${lessons.header.cycle}, ${taxonomy.classes.length} classes`);
  return 0;
}

function currentMonth() {
  // --today overrides the system clock — fixture tests only.
  if (args.today) {
    return args.today.slice(0, 7);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function report(lessons, taxonomy) {
  if (!lessons.header) {
    console.error('Report not possible: lessons.md has no cycle header (--mode validate shows details)');
    return 1;
  }
  const counts = new Map(taxonomy.classes.map((cls) => [cls.id, { count: 0, newest: null }]));
  for (const entry of lessons.entries) {
    const bucket = counts.get(entry.class);
    if (bucket) {
      bucket.count += 1;
      if (bucket.newest === null || entry.date > bucket.newest) {
        bucket.newest = entry.date;
      }
    }
  }
  for (const [id, bucket] of counts) {
    console.log(`${id} · ${bucket.count} · ${bucket.newest ?? '—'}`);
  }
  const threshold = Number(taxonomy.config.nudge_entry_threshold ?? Number.POSITIVE_INFINITY);
  const total = lessons.entries.length;
  const due = currentMonth() > lessons.header.cycle || total > threshold;
  console.log(`cycle: ${lessons.header.cycle} · entries: ${total} · close due: ${due ? 'yes' : 'no'}`);
  return 0;
}

function nextMonth(cycle) {
  const [year, month] = cycle.split('-').map(Number);
  const nextDate = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return `${nextDate.year}-${String(nextDate.month).padStart(2, '0')}`;
}

function buildArchiveHead(title, moved, taxonomy, eol) {
  const dates = moved.map((entry) => entry.date).sort();
  const counts = new Map();
  for (const entry of moved) {
    const key = entry.class ?? '(no class)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const orderedIds = [
    ...taxonomy.classes.map((cls) => cls.id).filter((id) => counts.has(id)),
    ...[...counts.keys()].filter((id) => !taxonomy.classes.some((cls) => cls.id === id)),
  ];
  const lines = [
    `# Lessons archive — ${title}`,
    '',
    `**Period:** ${dates[0]} – ${dates[dates.length - 1]}`,
    `**Entries:** ${moved.length}`,
    '**Per class:**',
    ...orderedIds.map((id) => `- ${id}: ${counts.get(id)}`),
    '',
    '',
  ];
  return lines.join(eol);
}

// Shared archive write path for close and graduate. Blocks are copied
// verbatim; only missing trailing line breaks are added so that appended
// blocks do not run into each other.
function writeArchive(archivePath, title, moved, taxonomy, eol) {
  const movedRaw = moved
    .map((entry) => (entry.raw.endsWith('\n') ? entry.raw : entry.raw + eol))
    .join('');
  if (fs.existsSync(archivePath)) {
    // Append, never overwrite — but the head block has to be recomputed from
    // the FULL file content (existing + newly moved entries), otherwise it
    // contradicts itself: **Entries:** and the per-class counts would stay
    // at the state of the very first run although the file holds more.
    const existing = fs.readFileSync(archivePath, 'utf8');
    const archiveEol = existing.includes('\r\n') ? '\r\n' : eol;
    const existingEntries = extractEntries(existing);
    const existingBodyRaw = existingEntries
      .map((entry) => (entry.raw.endsWith('\n') ? entry.raw : entry.raw + archiveEol))
      .join('');
    const allEntries = [...existingEntries, ...moved];
    fs.writeFileSync(
      archivePath,
      buildArchiveHead(title, allEntries, taxonomy, archiveEol) + existingBodyRaw + movedRaw,
    );
  } else {
    fs.writeFileSync(archivePath, buildArchiveHead(title, moved, taxonomy, eol) + movedRaw);
  }
}

function close(lessons, taxonomy, lessonsPath, archiveDir) {
  if (!lessons.header) {
    console.error('Close not possible: lessons.md has no cycle header (--mode validate shows details)');
    return 1;
  }
  const cycle = lessons.header.cycle;
  // Everything that accrued in the cycle is moved — regardless of the trigger
  // (month change or threshold) the boundary is always the start of the
  // following month.
  const boundary = `${nextMonth(cycle)}-01`;
  const eol = lessons.eol;

  const moved = lessons.entries.filter((entry) => entry.date < boundary);
  const remaining = lessons.entries.filter((entry) => entry.date >= boundary);
  if (moved.length === 0) {
    console.log(`Nothing to archive — no entry dated before ${boundary} (no-op).`);
    return 0;
  }

  fs.mkdirSync(archiveDir, { recursive: true });
  const archivePath = path.join(archiveDir, `${cycle}.md`);
  writeArchive(archivePath, `Cycle ${cycle}`, moved, taxonomy, eol);

  // The header advances to the next month ONLY when the calendar month has
  // already turned. On a threshold-triggered close mid-month
  // (nudge_entry_threshold) the same cycle and its opened date stay —
  // otherwise the header would name the next month while the current one is
  // still running, and every new lesson dated today would violate V5.
  const monthTurned = currentMonth() > cycle;
  const newCycle = monthTurned ? nextMonth(cycle) : cycle;
  const headerRaw = monthTurned
    ? `<!-- lesson-cycle: ${newCycle} | opened: ${boundary} -->${eol}`
    : (lessons.header.raw.endsWith('\n') ? lessons.header.raw : lessons.header.raw + eol);
  const remainingRaw = remaining.map((entry) => entry.raw).join('');
  fs.writeFileSync(lessonsPath, headerRaw + lessons.preludeRaw + remainingRaw);

  const cycleNote = monthTurned
    ? `open cycle is now ${newCycle}`
    : `open cycle stays ${cycle} (calendar month has not turned yet, opened unchanged)`;
  console.log(`Cycle ${cycle}: ${moved.length} entries → ${archivePath}; ${remaining.length} remain; ${cycleNote}.`);
  return 0;
}

// Insert the rule as the last line of the "## Learned Rules" section
// (fence-aware, before the next ## section). If the section is missing it is
// created at the end of the file (behaviour of /ship Step 4b).
function appendLearnedRule(text, rule) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/(?<=\n)/);
  let inFence = false;
  let sectionStart = -1;
  let sectionEnd = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const line = stripEol(lines[i]);
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (sectionStart === -1) {
      if (/^## Learned Rules\s*$/.test(line)) {
        sectionStart = i;
      }
    } else if (/^## /.test(line)) {
      sectionEnd = i;
      break;
    }
  }
  if (sectionStart === -1) {
    const base = text.length === 0 || text.endsWith('\n') ? text : text + eol;
    return `${base}${eol}## Learned Rules${eol}${eol}- ${rule}${eol}`;
  }
  let insertAfter = sectionStart;
  for (let i = sectionStart + 1; i < sectionEnd; i += 1) {
    if (stripEol(lines[i]).trim() !== '') {
      insertAfter = i;
    }
  }
  if (!lines[insertAfter].endsWith('\n')) {
    lines[insertAfter] += eol;
  }
  lines.splice(insertAfter + 1, 0, `- ${rule}${eol}`);
  return lines.join('');
}

function graduate(lessons, taxonomy, lessonsPath, archiveDir, claudeMdPath, entryArg, ruleArg, fileLabel) {
  if (!entryArg || entryArg.trim() === '') {
    console.error('Graduate not possible: --entry is missing (heading text of the entry without "## ").');
    return 1;
  }
  const rule = (ruleArg ?? '').trim();
  if (rule === '' || /[\r\n]/.test(rule)) {
    console.error('Graduate not possible: --rule must be a non-empty, single-line rule for ## Learned Rules.');
    return 1;
  }
  if (!lessons.header) {
    console.error('Graduate not possible: lessons.md has no cycle header (--mode validate shows details)');
    return 1;
  }
  if (!fs.existsSync(claudeMdPath)) {
    console.error(`Graduate not possible: CLAUDE.md not found: ${claudeMdPath}`);
    return 1;
  }
  const wanted = entryArg.trim();
  const headingOf = (entry) => stripEol(entry.raw.split(/(?<=\n)/)[0]).replace(/^##\s*/, '').trim();
  const index = lessons.entries.findIndex((entry) => headingOf(entry) === wanted);
  if (index === -1) {
    console.error(`Graduate not possible: entry "${wanted}" was not found in ${fileLabel} (exact comparison with the heading text after "## ").`);
    return 1;
  }

  const eol = lessons.eol;
  const moved = lessons.entries[index];
  const remaining = lessons.entries.filter((_, order) => order !== index);

  // Compute every output BEFORE the first write; loss-safe write order: archive
  // first, then CLAUDE.md, lessons.md last — if a step aborts the entry is at
  // worst duplicated, never gone (no-entry-lost holds in every intermediate
  // state).
  const newClaudeText = appendLearnedRule(fs.readFileSync(claudeMdPath, 'utf8'), rule);
  const headerRaw = lessons.header.raw.endsWith('\n') ? lessons.header.raw : lessons.header.raw + eol;
  const remainingText = headerRaw + lessons.preludeRaw + remaining.map((entry) => entry.raw).join('');

  fs.mkdirSync(archiveDir, { recursive: true });
  const graduatedPath = path.join(archiveDir, 'graduated.md');
  writeArchive(graduatedPath, 'Graduated lessons', [moved], taxonomy, eol);
  fs.writeFileSync(claudeMdPath, newClaudeText);
  fs.writeFileSync(lessonsPath, remainingText);

  console.log(`Lesson "${wanted}" graduated: entry → ${graduatedPath}; rule appended to ## Learned Rules in ${claudeMdPath}; ${remaining.length} entries remain.`);
  return 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

if (!fs.existsSync(args.taxonomy)) {
  console.error(`V1 taxonomy file not found: ${args.taxonomy}`);
  process.exit(1);
}
if (!fs.existsSync(args.path)) {
  console.error(`Lessons file not found: ${args.path}`);
  process.exit(1);
}

const taxonomy = parseTaxonomy(fs.readFileSync(args.taxonomy, 'utf8'), path.basename(args.taxonomy));
const lessons = parseLessons(fs.readFileSync(args.path, 'utf8'));
const fileLabel = path.basename(args.path);
const archiveDir = args.archiveDir
  ?? (taxonomy.config.archive_dir ? path.resolve(repoRoot, taxonomy.config.archive_dir) : null);

let exitCode;
switch (args.mode) {
  case 'validate':
    exitCode = validate(lessons, taxonomy, fileLabel);
    break;
  case 'report':
    exitCode = report(lessons, taxonomy);
    break;
  case 'close':
    if (!archiveDir) {
      console.error('Close not possible: no archive directory (neither --archive-dir nor archive_dir in the ## Config block)');
      exitCode = 1;
      break;
    }
    exitCode = close(lessons, taxonomy, args.path, archiveDir);
    break;
  case 'graduate':
    if (!archiveDir) {
      console.error('Graduate not possible: no archive directory (neither --archive-dir nor archive_dir in the ## Config block)');
      exitCode = 1;
      break;
    }
    exitCode = graduate(lessons, taxonomy, args.path, archiveDir, args.claudeMd, args.entry, args.rule, fileLabel);
    break;
  default:
    exitCode = 2;
}
process.exit(exitCode);
