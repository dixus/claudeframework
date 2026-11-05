# Lesson cycle and error classes

Machine-readable authority for the error-class taxonomy and the improvement cycle of `.claude/context/lessons.md`. The table under `## Error classes` and the `yaml` block under `## Config` are read by `${CLAUDE_PLUGIN_ROOT}/scripts/lesson-cycle.mjs` — there is no second source for the valid class ids. The prose around them explains the schema, how the numbers are measured, and how the list is changed.

Guiding idea: *the unit of improvement is the error class, not the single defect.* A lesson names one mistake; the class names the mechanism behind it. Counting per class shows which mechanisms the pipeline keeps producing — that is what a rule, a skill change, or a hook should target.

---

## Error classes

Closed list. Every lesson entry carries exactly one `class:` from this table. `unclassified` is **not** a valid value — whoever cannot assign an entry proposes a change to this table (see "When and how the list is changed" below) instead of reaching for a catch-all bucket.

| id | Name | Definition (one sentence) | Example (lesson) |
|---|---|---|---|
| `test-does-not-prove` | Test does not prove what it claims | A test or measurement is green without proving the claimed property — vacuous assertion, proof via the wrong path, fixture never reaches the case. | A negative test asserting on an error message that an earlier guard also emits — green with and without the change under test |
| `platform-contract-unknown` | Platform / framework behaviour not known | A behaviour or restriction of a framework, library, runtime, or environment configuration was unknown and assumed wrongly. | 2026-03-22 — Test file inside Next.js dynamic route directory breaks vitest glob collection |
| `silent-semantic-regression` | Silent semantic regression for untouched callers or states | A locally correct-looking change shifts the semantics for callers, tenants, or states nobody looked at. | 2026-03-21 — Falsy-zero bug in Likert selection state |
| `incomplete-sweep` | Incomplete sweep (one of N similar places) | The change was made at one of several similar places; further call sites, render paths, spec items, or documentation statements stayed on the old state. | 2026-03-23 — Component-level spec test cases omitted during implementation |
| `convention-violation` | Convention violated despite a documented rule | A convention already written down in the repo was violated (module boundaries, naming, language of comments, file placement, no dead code). | 2026-03-22 — Circular import from defining a utility in the wrong module |
| `guard-fail-open` | Guard does not fire (fail-open or disarmed) | An existing guard or gate does not trigger — disarmed by another change, swallowed by a discarded result, documented instead of implemented, or short-circuited before the decision. | 2026-03-22 — Missing catch block leaves PDF export failures silent |
| `measurement-mismatch` | Measurement over the wrong reference set | A number or verification is produced over the wrong reference set, the wrong slice, or a stale artifact state. | 2026-03-21 — Review identified missing tests that already existed |
| `scope-drift` | Scope drift in the agent / subagent run | The agent does more or less than instructed: changes outside the spec, removal of apparent redundancy, softening a criterion instead of fixing the code. | 2026-03-22 — Scope creep: out-of-spec files modified during implementation |

### Entry format

`**class:**` goes directly under `**scope:**`:

```
## YYYY-MM-DD — <topic>
**scope:** framework | project
**class:** <id from this table>

**What went wrong**: ...
**Rule**: ...
```

`scope` and `class` are two different fields: `scope` is the routing flag for graduation (framework → CLAUDE.md, project → stays local), `class` is the unit of improvement (which error mechanism was at work). The parser also accepts the plain legacy form when reading (`scope: x`, `class: x`); writing sites (`3_fix` Step 12, `instincts.md` "Capture corrections") produce only the bold form.

### When and how the list is changed

- **Who may:** A class change (new class, merge, rename) is a decision made in the scope of a ticket/PR — never a side effect of a lesson entry. The proposal goes into the report of the run that could not classify.
- **What holds:** Every row needs a non-empty definition **and** a non-empty example (`--mode validate`, check V1). Ids are stable; a removed class requires re-classifying its entries in the same commit.
- **How it is measured:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/lesson-cycle.mjs" --mode report` prints "lessons per class". A class with 0 hits is printed explicitly as `0` — so it stays visible which error mechanisms the cycle did not produce at all.

---

## The improvement cycle

- **A cycle is one calendar month.** The cycle id is `YYYY-MM`.
- **The open cycle is recorded in `lessons.md` itself**, as its first line: `<!-- lesson-cycle: YYYY-MM | opened: YYYY-MM-01 -->`. There is no second state store.
- **A close is due** when the calendar month has turned relative to the header line **or** the number of entries exceeds `nudge_entry_threshold`. This is reported automatically: `--mode report` prints the status line (`cycle: YYYY-MM · entries: N · close due: yes/no`), and `/pipeline:ship` Step 4b forwards it.
- **The close is manual.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/lesson-cycle.mjs" --mode close` performs the archive run. Nothing closes automatically — the close is the moment a human looks at the classes, and that is not a side effect of a script run. `/pipeline:ship` Step 4b only **reports**; an archive run in the middle of a ticket would fill that ticket's diff with unrelated moves.
- **Archive procedure:** `--mode close` moves every entry dated before the start of the month following the open cycle to `.claude/context/lessons-archive/<cycle>.md` and writes a head block there (cycle id, period, count per class). The header line in `lessons.md` advances to the next month **only** when the calendar month has already turned; on a threshold-triggered close mid-month (trigger `nudge_entry_threshold`) the same cycle stays open with its `opened` date unchanged — otherwise the header would name the next month while the current one is still running, and every new lesson dated today would violate V5. The next run after the month change appends to the same archive file and only then advances the header. No entry is rewritten or shortened (lossless, the `no-entry-lost` test case checks it); the order of the remaining entries is unchanged. Without due entries the run is a no-op with a notice.
- **Graduation (move, never delete):** A matured lesson graduates via `node "${CLAUDE_PLUGIN_ROOT}/scripts/lesson-cycle.mjs" --mode graduate --entry "<heading text without '## '>" --rule "<rule text>"` — called from `/pipeline:ship` Step 4b, never as a hand edit. The full entry moves verbatim to `lessons-archive/graduated.md` (head block as for the cycle archives; appended when the file exists), the rule is appended as one line to `## Learned Rules` in `CLAUDE.md`. The "What went wrong" narrative therefore survives in the archive, and the `no-entry-lost` check stays maximally strict: a deletion — even with the justification "already enforced by code" — is not a valid way to remove an entry.
- **Enforcement:** `--mode validate` exits non-zero when the taxonomy, the `class:` fields, or the cycle boundary are violated (checks V1–V6, see the script header).
- **History:** Entries written before the cycle was introduced sit as one block in `lessons-archive/2026-pre-cycle.md` — deliberately not split into retroactively invented monthly cycles.

---

## Config

Read by `${CLAUDE_PLUGIN_ROOT}/scripts/lesson-cycle.mjs`; paths relative to the repo root.

```yaml
cycle_length: month
nudge_entry_threshold: 40
archive_dir: .claude/context/lessons-archive
```

- **`cycle_length`** — cycle duration; currently fixed to `month` (calendar month, id `YYYY-MM`).
- **`nudge_entry_threshold`** — entry count above which `--mode report` says `close due: yes` even without a month change.
- **`archive_dir`** — location of the archive files, a sibling of what is archived (never a new top-level `.claude/archive/`).
