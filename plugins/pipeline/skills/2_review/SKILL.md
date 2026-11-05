---
name: 2_review
description: Review implementation changes and write a report to .claude/reviews/. Use after implementation is complete, before merging or committing.
disable-model-invocation: true
argument-hint: "[spec-name]"
model: claude-opus-5
effort: high
allowed-tools: Read, Write, Glob, Grep, WebFetch, WebSearch, Agent
---

Review the current implementation changes and produce a written review report.

IMPORTANT: For best results, run this skill in a fresh session (/clear first) so the review is unbiased by the implementation context.

Use a subagent to do the file investigation so the reading does not consume the main session's context. The subagent should return its findings and you write the report from those findings.

Steps:

1. Read CLAUDE.md for project context and conventions
2. If $ARGUMENTS is provided, treat it as a spec filename and read `.claude/specs/<name>.md` to understand what was intended
3. **Phase awareness**: check if `.claude/specs/<name>-phases.md` exists. If it does:
   - Read it and identify the current phase (the phase with status `in-progress`, or the latest `done` phase)
   - Scope all review lenses to the current phase's requirements and its assigned contract items only
   - Requirements belonging to later phases (status: `pending`) are explicitly **out of scope** — do not flag them as missing in Correctness, PM, or Spec validation
   - State at the top of the review report: "**Reviewing Phase N of M** — later-phase items are out of scope"
   - On the **final phase** (no `pending` phases remain), review against the **full spec** to catch cross-phase integration issues
4. Read all files in `.claude/context/` if the directory exists — for additional project context when evaluating correctness
5. **Detect review mode** — check if `.claude/reviews/<name>-review.md` already exists from a previous cycle:
   - **If no previous review exists → full review mode** (steps 6-8 below)
   - **If a previous review exists → delta review mode** (step 9 below)

### Full Review Mode (first review cycle)

6. Identify what changed: use the project's version control system (e.g. `git diff main` or `git diff HEAD~1`); if not in a VCS repo, ask the user which files to review
7. Read each changed file in full
8. Evaluate against these criteria (multi-role review — address each lens):
   - **Correctness**: does it match the spec requirements? Are there logic bugs or missing cases?
   - **Code quality**: does it follow existing patterns? Is anything over-engineered or unnecessarily complex?
   - **Security**: any injection risks, exposed secrets, or missing input validation at system boundaries? OWASP top-10 considerations?
   - **Tests / QA**: are the relevant cases covered? Are there obvious edge-case gaps? Any regression risk to existing behavior? Are component-level rendering tests present (not just pure-function tests)?
   - **UX / Minimal impact**: does the change touch only what's necessary? Any scope creep? Are any fixes patches hiding a root-cause problem that should be fixed properly? For components displaying computed numbers, check for floating-point precision issues (use `.toFixed()` or `Math.round()`). For components with reactive state (useEffect + Zustand/Redux), check that dismissals, resets, and one-time actions cannot be re-triggered by unrelated state changes.
   - **PM**: does the change deliver business value? Does it align with the stated goal in the spec? Is anything built that wasn't asked for?
   - **DevOps**: any CI/CD implications? Environment variables, build config, or deployment steps affected? Any observability gaps (missing logs, metrics)?
   - **Contract validation**: read the spec's `## Contract` section and give a verdict **per item**, never a single global one. This skill has no Bash tool and therefore does **not** execute the `verify` commands — running them is `/pipeline:ship` Step 5's job. What you check here is whether each binding is *real*:
     - `✓ bound` — the command's target exists (the named test file and test function are present in the diff or already in the codebase; the e2e spec path resolves) **and** its assertions actually cover the stated criterion. A test whose name matches the filter but asserts something else is `✗`, not `✓`.
     - `✗ unbound` — the `verify` names a test that does not exist, a filter that would match nothing, or a test that asserts something other than the criterion. **Severity: major.** This is worse than an admitted gap: the Step 5 gate reports green and everyone downstream believes the criterion was proven. Also `✗` at major severity: a `type: e2e` item with no `env` field, or one bound to `env: deployed` whose criterion covers behaviour this diff introduces — that behaviour is not deployed at gate time, so the binding would fail correct code (or, once the old deployment coincidentally satisfies it, pass without proving anything).
     - `manual` — the item declares `manual`. Check whether the stated reason is still true (it claims no snapshot harness exists — has one appeared since?). If the reason has become false, flag **minor**: a criterion is being hand-waved that could now be automated.

     Present the result as a table in the report (see step 10). Keep this lens distinct from **Spec completeness** below to avoid double-counting: if a criterion is *unimplemented*, that is a completeness ❌ (critical). If it is implemented but *unproven*, that is an `✗ unbound` here (major).

     If the spec has no `## Contract` section (legacy spec), fall back to the previous behaviour: check "Validation criteria" in the spec if present — can each criterion be confirmed from the diff? List each criterion and whether it is met or unmet.
   - **Spec completeness**: walk every requirement, contract item, and test case listed in the spec. For each, mark ✅ implemented / ❌ missing / ⚠️ partially implemented. A missing requirement (❌) is automatically **critical** severity. A partial implementation (⚠️) is **major**. Present the full checklist in the Issues section grouped under "Spec completeness gaps". This lens catches the most common error class: code that passes quality review but silently omits spec items.
   - **Test strategy**: read the spec's `## Test strategy` section and record the `Classification:` label. The 7-item `no-test-needed` whitelist is defined once in `${CLAUDE_PLUGIN_ROOT}/skills/0_spec/SKILL.md` `## Test strategy` — do NOT re-declare it here; cross-reference it. This lens emits **soft warnings only** (severity `minor`). Findings here NEVER escalate the verdict — minor-only findings go to Suggestions; they never flip a `pass` to `pass with fixes` or `needs rework`.
     - **Classification is `test-required`**: (a) at least one test file must appear in the diff — match the stack's test-file conventions (`*.test.*`, `*.spec.*`, `*Tests.cs`, `test_*.py`, `__tests__/**`). (b) Grep each new/modified test file for at least one real assertion call (`expect(`, `Assert.`, `assert `). A test whose only assertion matches a vacuous pattern — `Assert.True(true)`, `Assert.False(false)`, `expect(true).toBe(true)`, `expect(1).toBe(1)`, or `Assert.IsNotNull(null)`-style lies — counts as missing. Call out the exact vacuous line in the warning. (c) Cross-check the implement subagent's `Tests added: N` line (from step 18 of `1_implement`) — if the spec listed 5 tests and the summary reports `Tests added: 0`, flag the mismatch.
     - **Classification is `no-test-needed:<category>`**: plausibility-check the declared category against the changed files. Heuristics (loose by design — these are *review signals*, not a re-declaration of the whitelist):
       - `ci-config` → only CI definitions (`.github/workflows/**`, `azure-pipelines*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, pipeline templates)
       - `docs-only` → only `*.md`, `*.txt`, `changelog/**`, and comment-only diffs in source files
       - `style-only` → whitespace-only diff (no non-blank changes)
       - `rename-only` → additions and deletions of equal line counts with matching content (detected via `git diff --find-renames`)
       - `build-system` → project files, `package.json` scripts/deps fields, `tsconfig*.json`, bundler/compiler config
       - `db-migration` → the project's migration/DDL script directory only (as named in CLAUDE.md)
       - `deps-bump` → lockfiles and version fields in `package.json` / project files only
       - If the category is not in the 7-item whitelist (e.g. old or misspelled): emit a soft warning "category `<x>` not recognised — manual check" and stop; do not fabricate a heuristic.
       - If the diff clearly violates the declared category (e.g. `docs-only` but a source file has non-comment edits), cite the mismatch in the soft warning.
     - **Classification is `test-recommended`**: no check required. Absence of new tests is fine.
     - **Spec has no `## Test strategy` section at all** (legacy spec or malformed): emit one soft warning "Test strategy section missing — please backfill classification." No verdict change. Do not retroactively edit old specs.
     - **Classification says `test-required` but diff has zero production-code files** (over-classified by `0_spec` for a tiny change): soft warning "classification looks overstated vs. diff — consider reclassifying to `test-recommended` or `no-test-needed:<category>`." No verdict change.
     - **Test-file-only diff** (no production-code changes): treat as `test-recommended`-style and emit no warning even if the spec said `no-test-needed` — adding more tests is always fine.

### Delta Review Mode (subsequent review cycles)

9. When a previous review file exists, do a **focused delta review** instead of a full re-review. This prevents discovering "new" issues each cycle and ensures convergence:
   a. Read the previous review file (`.claude/reviews/<name>-review.md`)
   b. Identify what changed since the last review: `git diff` against the state before fixes (use commit hashes or stash references from the fix cycle)
   c. **Escalation check**: if the fix diff is large (exceeds `delta_review_escalation_pct` from CLAUDE.md, default: 50% of the original implementation diff) or touches files not mentioned in the previous review, the fixes are too invasive for delta mode — fall back to **full review mode** (steps 6-8) to catch issues the broader changes may have introduced. State "escalating to full review — fix scope was too broad" in the report.
   d. For each issue from the previous review:
   - **Verify the fix**: read the affected code — is the issue actually resolved? Mark as ✅ fixed or ❌ still present
     e. **Regression scan**: review ONLY the lines/files changed by the fix cycle — check for:
   - New bugs introduced by the fix
   - Verify step regressions (did something that was passing now break?)
   - Scope creep (did the fix touch more than necessary?)
   - **Test strategy regression**: if the spec's classification is `test-required`, check that the fix did not delete or weaken assertions (e.g. replacing a real assertion with `Assert.True(true)`). Soft warning only — never blocks.
     f. **Spec completeness re-check**: if the previous review had any ❌ or ⚠️ spec completeness items, re-verify those specific items against the current code — mark them ✅ resolved or ❌ still missing. **Contract re-check**: re-verify every item the previous review marked `✗ unbound` and reproduce the full contract table in the new report — a table that shrinks between cycles reads as "those items passed" when it actually means they were dropped. Also confirm the fix cycle did not weaken a binding (widening a filter, repointing a `verify` at a broader suite, or flipping an item to `manual`); a contract edit made during a fix cycle is a **major** finding, since the gate is supposed to constrain the implementation and not the reverse.
     g. Do NOT re-evaluate unchanged code against the other lens criteria — that was already done in the first cycle
     h. Only flag genuinely new issues that exist in code touched by the fix cycle

### Severity-Based Verdict (applies to both modes)

10. Write the review to `.claude/reviews/<name>-review.md` (use spec name if available, otherwise `latest-review.md`) with sections:

- **Summary**: overall assessment — use the severity-based verdict rules below
- **Contract**: one table row per contract item — `id | criterion | verify binding | ✓ bound / ✗ unbound / manual`. For `manual` rows put the declared reason in the binding column. Close the table with a coverage line: `N items — X bound, Y manual, Z unbound`. Omit this section entirely for legacy specs that have no `## Contract`.
- **Issues**: numbered list, each with severity (critical / major / minor), affected file + line, confidence tag, and a clear description. Tag each finding: 🟢 verified (confirmed by code/tests), 🟡 likely (probable but not confirmed), 🔴 assumed (pattern-based, not evidence-backed)
- **Suggestions**: optional improvements that are not blockers (never block a "pass" verdict)

**Verdict rules:**

- **"pass"** → no critical or major issues. Minor-only issues (if any) go in the Suggestions section, not Issues. The implementation ships as-is.
- **"pass with fixes"** → no critical issues, but 1+ major issues that must be fixed. Minor issues go in Suggestions.
- **"needs rework"** → 1+ critical issues (architectural problems, security vulnerabilities, spec requirements not met, data loss risk).

Key principle: **minor issues never block shipping.** Style nits, optional refactors, "nice to have" improvements, and subjective preferences belong in Suggestions and do not trigger another fix/review cycle.

11. Print the issue list to the chat so the user sees it immediately without opening the file.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

Based on the verdict, perform the applicable action and ask the user a direct question:

- If **"pass"** and **more phases remain**: update the phase manifest (mark current phase status as `done`). Ask: "Phase N passed. Ready to run `/pipeline:1_implement <spec-name>` for Phase N+1 — shall I proceed?"
- If **"pass"** and **no phases remain**: Ask: "Review passed. Shall I mark PRD-XX as done in the backlog and prepare a commit?"
- If **"pass with fixes"** or **"needs rework"**: Ask: "There are [N] issues ([X] major, [Y] critical). Shall I run `/pipeline:3_fix <spec-name>` now, or do you want to review the findings first? (Tip: /clear before fixing gives a cleaner context)"

Do not summarize and stop. Always end with a direct question to the user.
