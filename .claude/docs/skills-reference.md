# Skills Reference

Generated and maintained by `/doc`. Last updated: 2026-09-15.

Each skill is defined in `.claude/skills/<name>/SKILL.md`. Skills are technology-agnostic — they read project commands from `CLAUDE.md` rather than hardcoding tools.

---

## `/decompose`

**Purpose**: Break a concept document, draft, or product brief into independent PRDs that each feed into `/ship`.

**When to use**: When input in `.claude/input/` contains multiple features, a big-picture vision, or a concept too large for a single `/ship` run. Run this before `/fleet`.

**Input**: Files in `.claude/input/` — documents, images, screenshots, PDFs, markdown. Optional `$ARGUMENTS` as a name or focus hint.

**Output**: Individual PRDs in `.claude/input/<feature-name>.md` + a decomposition manifest in `.claude/specs/decomposition-<name>.md`.

**What it does**:

1. Reads all files in `.claude/input/`, `CLAUDE.md`, and `.claude/context/` to build a mental model of the concept
2. **Identifies feature boundaries** — independent units of work that have a single purpose, can be implemented and tested in isolation, and touch mostly different files
3. **Dependency analysis** — builds a graph with three edge types: independent, soft dependency (benefits from ordering), hard dependency (must be sequenced). Groups independent features at the same level.
4. **Surfaces ambiguities** — asks clarifying questions about scope conflicts, priority, dependencies, and missing context before writing PRDs. Skipped if unambiguous.
5. Writes a **self-contained PRD** per feature with: problem, requirements, out of scope, user stories, acceptance criteria, expected files (new + modified), technical hints, and asset references
6. Archives original input to `.claude/input/archive/` (copies assets referenced by PRDs instead of moving)
7. Writes a **decomposition manifest** to `.claude/specs/decomposition-<name>.md` with the dependency graph, feature table, and next-step commands
8. Reports: feature count, dependency summary, size estimates (S/M/L), and suggested next step

**Key design decisions**:

- Each PRD lists `## Expected files` — specific paths for new and modified files. This is critical: `/fleet` uses these for conflict analysis.
- PRDs cross-reference siblings in their "Out of scope" section so boundaries are explicit.
- PRDs are concise — they feed into `/0_spec` which expands them into full specs.

**Usage**:

```
/decompose
/decompose payment system
```

**After running**: Review the manifest at `.claude/specs/decomposition-<name>.md`, then run `/fleet` to ship in parallel or `/ship <feature>` one at a time.

---

## `/fleet`

**Purpose**: Ship decomposed PRDs in parallel with conflict-aware batching, isolated worktrees, and sequential merging.

**When to use**: After `/decompose` has produced a decomposition manifest with multiple pending features. Replaces running `/ship` manually for each feature.

**Input**: Optional decomposition name (matches `.claude/specs/decomposition-<name>.md`). Flags: `--dry-run`, `--max-parallel N` (default: 5), `--batch-only` (run batch 1 only).

**Output**: All features merged to `main`, decomposition manifest updated.

**What it does**:

1. Loads the decomposition manifest, filters to `pending` features
2. **Collects file claims** from existing specs (`## Affected files` + `## New files`). If specs don't exist yet, offers to generate them via `/ship --dry-run` in parallel.
3. **Conflict analysis** — the core algorithm:
   - **Direct overlap**: intersects file claim sets between every feature pair
   - **Heuristic detection**: catches six indirect conflict patterns — barrel/index files, migration ordering, shared type definitions, config files (`package.json`, `tsconfig.json`, etc.), shared state (`store/*.ts`), and route registration files
   - **Dependency overlay**: hard dependencies force serialization; soft dependencies prefer adjacent batches
4. **Batch partitioning** — topological sort by hard dependencies, then greedy graph coloring by file conflicts. Features with the same color run in parallel. Respects `--max-parallel`.
5. Prints the **execution plan** with batch tables showing file counts and conflict reasons. Asks: run all / batch 1 only / adjust / dry-run only.
6. **Batch execution loop** — for each batch:
   - Launches all features in a single message with parallel Agent calls, each using `isolation: "worktree"` and `/ship --no-finalize`
   - Prints status as each agent completes
   - Merges completed branches to `main` sequentially (`git merge --no-ff`)
   - On merge conflict (should be rare): aborts merge, defers feature to triage
   - Failed features don't block the batch
7. **Final integration verify** — runs full verify suite on `main` after all batches
8. **Failure triage** — presents failed features with retry / skip / investigate options
9. **Fleet report** — summary table with per-feature outcome, files, review cycles.

**Key design decisions**:

- Fleet is a thin orchestrator — it never reads code, only manifests and spec metadata
- Each `/ship` runs with `--no-finalize` so fleet controls all merges centrally
- Merge conflicts are caught and deferred, not silent — the batch plan is optimistic but the merge step is safe
- Next batch branches from the updated `main` (includes all successfully merged features from prior batches)

**Usage**:

```
/fleet
/fleet payment-system
/fleet --dry-run
/fleet --batch-only --max-parallel 3
```

**After running**: Check the decomposition manifest for any failed/skipped features. Run `/fleet` again to retry pending features.

---

## `/ship`

**Purpose**: Orchestrate the full spec-to-commit pipeline in a single command.

**When to use**: When shipping a complete feature end-to-end with minimal manual intervention. Requirements should be in `.claude/input/` or passed as arguments.

**Input**: `$ARGUMENTS` — a work-item ID (`/ship 1234`), a PRD reference (`/ship 02a-foundation`), or a free-text feature description. Flags: `--dry-run` (questions + spec only), `--no-finalize` (no push, no state change — used by `/fleet`), `--auto-finalize` (skip the confirmation gate), `--fast` / `--full` (override the complexity classifier).

**Output**: Feature branch pushed to origin with atomic commits, a per-ticket `changelog/<branch>.md`, and — if a tracker is configured — the work item moved to its development-complete state. `/ship` never merges to the main branch itself; merges go through reviewed PRs.

**What it does**:

1. **Branch setup** (Step 0) — fetches `origin`, stays on the current feature branch or defers branch creation until ticket metadata is known
2. **Ticket resolution** (Step 0b) — loads the work item, comments, and linked items from the tracker (if an MCP tool is configured); inspects prior work on linked branches/commits; moves the ticket to "in progress". PRD-mode (non-numeric arg) resolves a PRD from `.claude/input/**` and makes no tracker mutations at all.
3. **Complexity classifier** (Step 0c) — scores the ticket on 4 signals and picks the **fast path** (single implement subagent, no spec/review) or the **full pipeline**
4. Front-loads all clarifying questions in a single batch — the only user interruption before the finalize gate
5. Launches a **spec subagent** (opus) — writes `.claude/specs/<name>.md` including the machine-checkable `## Contract`
6. **Complexity gate**: stops if the **production** file count exceeds the threshold (default: 10) — test files are reported but not counted
7. **Decision review** (Step 2b) — auto-accepts medium/low decisions, waits for confirmation on `(high)` ones
8. _Dry-run exit_: if `--dry-run`, prints a scope report and stops here
9. Launches an **implement subagent** (fable) — writes source and tests, runs verify, runs the contract gate
10. Launches a **review subagent** (opus) — writes `.claude/reviews/<name>-review.md`, including a per-item contract table
11. If issues found, launches a **fix subagent** (sonnet for major, opus for critical) — loops review/fix up to 3 cycles
12. **Lesson graduation** (Step 4b) — moves mature lessons from `lessons.md` to `lessons-archive/graduated.md` and appends the rule to `CLAUDE.md`; reports the lesson-cycle status
13. **Cross-phase integration check** (Step 4c) — only for phased implementations; verifies data flow, interface contracts, and glue code across phases
14. **Contract gate + final verify** (Step 5) — runs typecheck/lint/tests/build **and** every `verify` command from the spec's `## Contract`, gating on each exit code. Skipped only when there is no contract (fast path or legacy spec), and then the skip is printed with its reason.
15. **Changelog entry** (Step 5b) — writes `changelog/<branch>.md` with a summary and a mandatory `## Manual Steps` section (format owned by `/changelog`)
16. Launches a **commit subagent** (sonnet) — creates atomic conventional commits
17. **Tracker feedback** (Step 6b/6d) — syncs derived work-item fields from the changelog (manual-steps flag, UAT decision — if the project defines them), posts a comment only when there is non-derivable context, and attaches the changelog to the work item if the tracker supports uploads
18. **Finalize gate** (Step 7a) — prints a summary with the contract coverage and recommended smoke-tests, then waits for explicit confirmation
19. **Push + finalize** (Step 7b) — pushes the branch, transitions the ticket to its development-complete state, closes the parent epic if all siblings are done, deletes the checkpoint branch

**Usage**:

```
/ship 1234
/ship 02a-foundation
/ship add export feature --dry-run
/ship 1234 --fast
```

---

## `/0_spec`

**Purpose**: Translate raw requirements into a structured spec.

**When to use**: Before starting any non-trivial feature. Do not implement without a spec.

**Input**: Files in `.claude/input/` (requirements, wireframes, docs). Optional `$ARGUMENTS` as a focus hint.

**Output**: `.claude/specs/<kebab-name>.md`

**What it does**:

1. Reads CLAUDE.md, context files, and all input materials
2. Explores codebase to find affected files and patterns
3. Checks completed work status before assuming dependencies are missing
4. **Asks 2-3 clarifying questions** (with selectable options) before writing — skips if requirements are unambiguous
5. Surfaces UI/UX and architectural decisions not in the PRD as explicit questions
6. Writes the spec with sections: Goal, Requirements, Out of scope, Affected files, New files, **Patterns to mirror**, Implementation notes, **UX concept** (component tree, interaction flows, state/data flow, responsive behavior, accessibility, reuse check), **Contract**, **Test cases**, **Test strategy**, **Decisions made by Claude**
7. **Contract**: binds every acceptance criterion to an executable check — a YAML block where each item carries an `id`, a `criterion`, and either a `verify` command (with `cwd` when it does not run from the repo root) or a `manual` reason naming the missing harness. `type: e2e` bindings additionally declare `env: local|deployed`: criteria about behaviour the ticket introduces must be `local` (the change is not deployed at gate time), `deployed` is only for regression guards on already-deployed behaviour. This replaces the older prose-only `Validation criteria` section and is what `/ship` Step 5 actually executes — with a reachability pre-check before `env: local` runs, so a stopped local stack escalates as an infrastructure blocker instead of masquerading as a failed criterion.
8. **Test strategy**: declares exactly one classification — `test-required`, `test-recommended`, or `no-test-needed:<category>` from a 7-item whitelist. Paths under CLAUDE.md `## Restricted Areas` force `test-required` plus a negative-test hint.
9. **Self-checks before returning**: rejects a malformed test-strategy label (8b) and a malformed contract (8c — missing or double bindings, `type: manual` colliding with a `verify`, a command without a needed `cwd`, an untraceable requirement, or a bare full-suite `verify` that proves nothing specific)
10. **Flags complexity**: adds a warning section if total affected + new files exceeds 10, suggesting decomposition
11. Suggests moving processed files into an `archive/` directory next to them

**Usage**:

```
/0_spec
/0_spec user authentication
```

**After running**: Read the spec before proceeding — in particular the `## Contract`, since those bindings are what the pipeline will gate on. Move the processed input files into the `archive/` directory alongside them.

---

## `/1_implement`

**Purpose**: Implement a spec with a mandatory plan approval gate.

**When to use**: After reviewing and approving a spec from `/0_spec`.

**Input**: `.claude/specs/<name>.md`. Defaults to most recently modified spec.

**What it does**:

1. Reads spec, context, affected files, and **"Patterns to mirror"** files from the spec
2. **Context budget check**: if total files exceed 15, reads patterns in full and remaining files partially
3. **Decomposition gate**: if total files > 10 or spec has complexity flag, asks whether to proceed or break into sub-specs
4. Creates a named git checkpoint branch (`checkpoint/<spec-name>`) as a safe rollback point
5. Proposes a step-by-step plan — **waits for your approval**
6. **Phase management**: creates or resumes a phase manifest (`.claude/specs/<name>-phases.md`) for multi-phase implementations
7. Implements step by step using the **TDD loop**: write test (from spec's Test cases) -> run to confirm it fails (red) -> implement -> run to confirm it passes (green)
8. **Impact check**: before modifying shared function signatures, greps for all call sites and test mocks, updates them in the same step
9. **Contract bindings must resolve**: when creating the tests a contract item's `verify` names, runs that command once immediately to confirm it selects a non-zero number of tests and goes red-then-green. A filter matching zero tests can exit 0 on some runners, and the step-14 gate cannot tell that apart from a real pass.
10. Runs: typecheck -> lint -> tests -> build
11. Fixes any failures (max 2 attempts, then escalates — and writes the blocker to `.claude/blockers/<spec>.md`)
12. **Contract gate**: **runs** each contract item's `verify` command and treats a non-zero exit as a failure; confirms `manual` items by inspection. Editing the contract to make it pass is never a valid fix — an unachievable criterion is a blocker for the user to decide. Legacy specs without a `## Contract` fall back to confirming the prose `Validation criteria`.
13. **Artifact inventory check**: verifies every spec file was touched in the changeset
14. **Pre-flight self-review**: reviews own changes against review lenses before handoff
15. Optionally runs `/simplify` for a quality pass
16. Suggests atomic commits if multiple concerns were touched; reports `Tests added: N` for the review to cross-check

**Usage**:

```
/1_implement zustand-store
/1_implement                  # uses most recent spec
```

**After running**: Start a fresh session (`/clear`) before running `/2_review`.

---

## `/2_review`

**Purpose**: Unbiased code review against the spec.

**When to use**: After `/1_implement` or `/3_fix`. **Always run in a fresh session.**

**Why fresh session**: Claude is biased toward code it wrote in the same session. A clean context produces more honest reviews.

**Input**: Git diff. Optional `$ARGUMENTS` to load the corresponding spec for context.

**Output**: `.claude/reviews/<name>-review.md`

**Review criteria** (10 lenses):

- **Correctness**: does it match the spec? Logic bugs, missing cases?
- **Code quality**: follows existing patterns? Over-engineered or unnecessarily complex?
- **Security**: injection risks, exposed secrets, missing input validation, OWASP top-10?
- **Tests / QA**: relevant cases covered? Edge-case gaps? Regression risk?
- **UX / Minimal impact**: does the change touch only what's necessary? Scope creep? Patches hiding root causes?
- **PM**: does the change deliver business value? Aligned with spec goal? Anything built that wasn't asked for?
- **DevOps**: CI/CD implications? Environment variables, build config, or deployment steps affected? Observability gaps?
- **Contract validation**: gives a verdict **per contract item**, not a global one. This skill has no Bash tool, so it does not execute the `verify` commands (that is `/ship` Step 5) — it checks that each binding is real: `✓ bound` when the named test exists and its assertions actually cover the criterion, `✗ unbound` (**major**) when it names a missing test, a filter that matches nothing, or a test asserting something else, and `manual` when the item declares one — flagging **minor** if the stated reason has since become false. Legacy specs without a `## Contract` fall back to checking the prose `Validation criteria`.
- **Spec completeness**: walks every requirement, contract item, and test case — marks each as implemented / missing / partial. Missing = critical, partial = major. Kept distinct from Contract validation to avoid double-counting: unimplemented is a completeness ❌, implemented-but-unproven is an `✗ unbound`.
- **Test strategy**: records the spec's `Classification:` label and plausibility-checks it against the diff — missing tests for `test-required`, vacuous assertions, or a `no-test-needed` category the changed files contradict. **Soft warnings only** — never escalates the verdict.

**Review modes**:

- **Full review mode** (first cycle): reads all changed files, evaluates all 10 lenses
- **Delta review mode** (subsequent cycles): only re-checks previous issues and code touched by fixes; escalates to full review if fix diff is too large

**Verdict rules**:

- **"pass"**: no critical or major issues; ships as-is
- **"pass with fixes"**: no critical, but 1+ major issues
- **"needs rework"**: 1+ critical issues

**Usage**:

```
/clear
/2_review zustand-store
/2_review                     # reviews latest changes without spec context
```

---

## `/3_fix`

**Purpose**: Fix review issues in severity order (critical -> major -> minor) while keeping spec and code in sync.

**When to use**: After `/2_review` has produced a report.

**Input**: `.claude/reviews/<name>-review.md`. Defaults to most recently modified review.

**What it does**:

1. Reads the review report and corresponding spec (if available)
2. **Phase awareness**: respects current phase scope; skips issues belonging to later phases
3. Fixes each issue in severity order — minimal change only, no refactoring
4. **Circuit breaker**: if the same issue has recurred across 2+ review cycles, escalates to user instead of attempting a third fix
5. **Scope gate**: only touches files mentioned in the Issues section
6. Runs: typecheck -> lint -> tests -> build
7. Fixes any verify failures (max 2 attempts)
8. **Contract re-check**: re-runs every contract item's `verify` command — the fixes may have broken a criterion that was green before. Catching it here costs one re-run; letting `/ship` Step 5 catch it costs a whole review/fix cycle.
9. **Self-check against review items**: re-reads each affected file to verify the fix actually resolves the issue
10. **Spec-anchored check**: if fixes diverged from the spec, **does not touch the spec** — the spec is ground truth. The divergence is documented in the report and flagged for the user; only the user may approve a spec change. This explicitly covers the `## Contract`: widening a filter, repointing a `verify` at a broader suite, or flipping an item to `manual` is a spec change disguised as a fix.
11. **Self-improvement gate**: writes recurrence-prevention lessons to `lessons.md` with a mandatory `class:` from the taxonomy in `lesson-cycle.md`
12. Reports what was fixed, what was skipped, any flagged spec divergence, the per-item contract status, and recurrence-prevention suggestions

**Usage**:

```
/3_fix zustand-store
/3_fix                        # uses most recent review
```

---

## `/test`

**Purpose**: Full verification suite — report only, no fixes.

**When to use**: As a final gate before shipping, after a merge/rebase, or to check baseline health at any time.

**What it runs** (in order, reads commands from `CLAUDE.md`):

1. Typecheck
2. Lint
3. Tests
4. Build

**Output**: Pass/Fail status per command, failure details with file + line references.

**Does not apply fixes** — diagnosis only. Routes to `/3_fix` or `/debug` on failure.

**Usage**:

```
/test
/test src/lib/scoring/engine.test.ts   # specific file only
```

---

## `/impact`

**Purpose**: Analyze the blast radius of a code change before making it. Read-only analysis — does not modify any code.

**When to use**: Before modifying shared functions, interfaces, classes, or modules. Especially valuable when changing function signatures, return types, or API contracts.

**Input**: `$ARGUMENTS` — a function name, file path, class name, or method name.

**Output**: Structured report printed to chat (not written to a file).

**What it does**:

1. **Resolves the target** — locates the definition via Grep, reads the file to understand the signature
2. **Finds all call sites** — greps for the function/class name across the entire codebase, groups by module (API, routes, workers, tests, frontend)
3. **Finds all test mocks** — greps for `patch()`, `vi.mock`, `vi.fn`, `AsyncMock` references
4. **Finds frontend consumers** — if the target backs an API route, locates frontend hooks and TypeScript types that consume it
5. **Finds downstream dependencies** — functions that depend on the target's return value, queries that read the same tables
6. **Reports** a structured summary: definition location, call sites table, test mocks table, frontend consumers table, downstream dependencies, and a risk assessment (small/medium/large blast radius with recommended approach)

**Usage**:

```
/impact enqueue_email
/impact src/modules/documents/services.py
/impact SupplierInvitation
/impact Tender.clone
```

---

## `/scout`

**Purpose**: Search the web and GitHub for recent Claude Code developments, release notes, community patterns, and interesting repos. Compare against the current framework and report optimization opportunities.

**When to use**: Periodically (e.g., weekly or monthly) to check for new Claude Code features, breaking changes, community skills, or repos that could improve the framework.

**Input**: Optional `--quick` flag to skip page fetching and return titles/links only.

**Output**: `.claude/references/blogs/scout-<YYYY-MM-DD>.md`

**What it does**:

1. Reads CLAUDE.md, all skill files, and context files to understand current capabilities
2. **Release notes phase**: fetches the official Claude Code changelog, extracts entries from the last 60 days, compares each against the framework's 21 skills and hooks
3. **Official skills repo phase**: checks the Anthropic skills repo and Agent Skills spec for gaps
4. **Registry phase**: reads `references/scout-registry.md` to avoid re-fetching known URLs
5. **Adaptive query phase**: reads pending proposals from `learn-proposals.md`, generates targeted searches to find supporting evidence
6. **Search phase**: runs 4-6 web searches for best practices, GitHub skills, hooks/subagents, and CLAUDE.md patterns
7. **Repo discovery phase**: runs 3 GitHub-targeted searches for Claude Code repos and frameworks; discovered repos are added to the registry as `queued-repo` for `/harvest`
   (skipped with `--quick`): fetches top 5 results, prioritized by source tier (T1 official > T2 established > T3 general)
8. **Diff phase**: compares against previous scout report — highlights new findings, resolved items, and carried-over items
9. **Reports** a structured analysis: release notes, skills repo gaps, new features, improvable skills, breaking changes, worth investigating links, repos worth harvesting, and patterns already implemented correctly
10. Updates `references/scout-registry.md` and appends metrics to `metrics-scout.csv`

**Usage**:

```
/scout
/scout --quick
```

---

## `/smoke`

**Purpose**: Write and run smoke tests against a running Docker stack to verify end-to-end behavior for a spec's API routes.

**When to use**: After deploying to a Docker environment, or before/after `/ship` to validate that API routes respond correctly under real conditions.

**Input**: Optional `$ARGUMENTS` — the spec name. Defaults to most recently modified spec.

**Prerequisites**: Docker stack running (`docker compose up -d`), `smoke_test.py` in project root, spec's API routes already implemented.

**What it does**:

1. **Health check** — verifies all containers are running, polls the health endpoint (up to 60 seconds). Does NOT attempt to fix Docker infrastructure.
2. **Writes smoke tests** — reads `smoke_test.py`, the spec, and Pydantic response schemas. Adds happy-path coverage for the spec's API routes, matching existing patterns and field names exactly.
3. **Run and fix loop** (max 3 attempts) — runs `smoke_test.py`, fixes only test assertions on failure (never modifies API code). Restores original file via `git checkout` if all 3 attempts fail.
4. **Final verify** — runs the full verify suite to ensure smoke test changes didn't introduce regressions
5. **Reports** which routes were tested, which assertions were added, pass/fail status, and any routes that could not be tested

**Usage**:

```
/smoke
/smoke prd-45-file-virus-scanning
```

---

## `/commit`

**Purpose**: Create one or more well-structured atomic commits from current working tree changes.

**When to use**: Whenever you're ready to commit — especially after `/1_implement` when multiple concerns were touched.

**Input**: Current git working tree. Optional `--all` flag to skip split analysis and commit everything as one.

**What it does**:

1. Runs `git status` + `git diff HEAD` to understand scope
2. **Analyses the diff for distinct concerns** — proposes splitting into atomic commits if multiple unrelated things changed
3. Confirms the split with the user (or proceeds as single commit)
4. **Backlog check**: if the commit references a task identifier, marks it done in the backlog file
5. Runs pre-commit checks per CLAUDE.md: typecheck -> lint (no tests — those are for `/test`)
6. Stages the appropriate files and writes the commit message in **conventional commit format**: `<emoji> <type>(<scope>): <short description>`
7. Creates each commit; repeats for multi-commit splits

**Type -> emoji**: `feat` -> `fix` -> `docs` -> `refactor` -> `test` -> `chore` -> `perf` -> `style` -> `ci` -> `revert`

**Usage**:

```
/commit
/commit --all     # skip split analysis, commit everything
```

---

## `/debug`

**Purpose**: Diagnose and fix a specific failing test, type error, or runtime error with a structured root-cause approach.

**When to use**: When a verify step fails and you want a systematic diagnosis rather than ad-hoc guessing.

**Input**: Optional `$ARGUMENTS` — an error message, test name, or file path to focus on. Without arguments, runs the full verify suite to find the first failure.

**What it does**:

1. Identifies the failure — from `$ARGUMENTS` or by running verify
2. Reads the failing file(s) in full
3. **Forms and validates a hypothesis** before touching code — checks similar patterns in the codebase to confirm
4. Applies the minimal fix — only what the root cause demands, no defensive code or refactoring
5. Re-runs the specific failing command to confirm the fix
6. Runs the full verify suite to confirm no regressions
7. If still failing, revises the hypothesis and repeats — does **not** stack fixes on top of each other
8. Reports: root cause (one sentence), files changed, before/after verify status

**Key constraints**:

- Hypothesis must be validated before any code is changed
- If the fix requires touching more than 3 files, pauses and reports — the bug may be systemic
- Never applies a second fix on top of an unresolved first fix

**Usage**:

```
/debug
/debug "TypeError: Cannot read properties of undefined"
/debug src/lib/scoring/engine.test.ts
```

---

## `/changelog`

**Purpose**: Write or refresh the per-ticket changelog `changelog/<branch>.md` — the single source of truth for what a ticket changed and which manual deployment steps it needs.

**When to use**: Before committing or pushing work on a ticket branch when you are **not** running `/ship` (which writes the changelog itself in Step 5b). Without it, the manual-steps flag on the work item, the tracker comment, and the release notes all silently stay empty.

**Input**: Optional spec name (PRD-mode — one changelog per PRD on a shared epic branch).

**Output**: `changelog/<branch>.md` with `## Summary`, a mandatory `## Manual Steps` section (default `_None._`), and `## Changed files`.

**What it does**:

1. Resolves the ticket from the branch name (convention from `branch-management.md`; asks if it cannot)
2. Collects the changed files from `git diff origin/<main>...HEAD` plus uncommitted changes
3. Inspects the diff against the manual-steps triggers (schema changes without automatic migration, routing/gateway config, cache flushes, per-environment settings, feature flags, external dependencies) and writes one bullet per step — when in doubt, writes the step
4. Writes the file idempotently (overwrite, never append)
5. Names the derived actions the user still has to perform standalone: the tracker's manual-steps flag and the mirroring comment

**Usage**:

```
/changelog
/changelog prd07-document-upload
```

---

## `/release`

**Purpose**: Cut a quarterly release branch with generated notes and a tag.

**When to use**: Once per quarter, on top of the per-ticket `/ship` pipeline.

**Input**: `$ARGUMENTS` — the quarter (e.g. `2026-Q2`). Flags: `--dry-run`, `--tag <name>`, `--no-tag`, `--since <ref>`.

**Output**: A `Q<N>-Release-<YYYY>` branch cut from the main branch, `releases/<quarter>.md`, and an annotated tag on the cut commit (default tag name = branch name).

**What it does**:

1. Validates state — clean tree, on the main branch, up to date with origin, target branch and tag do not exist yet
2. Cuts the release branch
3. Generates the release notes by calling `/release-notes` internally and commits the file on the release branch
4. Tags the cut commit
5. Pushes branch + tag — behind a confirmation gate, nothing is pushed without an explicit yes

**Note**: Triggering build/release pipelines stays a manual next step listed in the final report. Hotfix branches follow `<ticket>-on-<release-branch>` and merge into the release branch, not the main branch.

**Usage**:

```
/release 2026-Q2
/release 2026-Q2 --dry-run
```

---

## `/release-notes`

**Purpose**: Aggregate per-ticket changelogs into one quarterly document for the people who deploy the release.

**When to use**: Called internally by `/release`. Can be re-run standalone to refresh the notes after more tickets land.

**Input**: `$ARGUMENTS` — the quarter. Flags: `--since <git-ref>`, `--dry-run`.

**Output**: `releases/<quarter>.md`

**What it does**:

1. Reads every `changelog/<branch>.md` added in the given git range (default: since the previous release file's recorded range end)
2. Extracts each file's `## Manual Steps` section — the steps the automatic release pipeline does **not** perform
3. Groups the result by module, lists all tickets in an appendix, and writes the quarterly file idempotently

**Why it matters**: the per-ticket changelog is the single source of truth for manual deployment steps. A tracker flag, the comment posted by `/ship` Step 6b, and this file are all derived from it, so they cannot drift.

**Usage**:

```
/release-notes 2026-Q2
/release-notes 2026-Q2 --since v2026.04.0 --dry-run
```

---

## `/audit`

**Purpose**: Find and fix vulnerable dependencies.

**When to use**: Periodically, or when `npm audit` / equivalent reports vulnerabilities.

**What it does**:

1. Detects package manager from lockfiles (npm / yarn / pnpm / bun / pip / cargo / go)
2. Runs the appropriate audit command
3. Applies safe (non-breaking) fixes automatically
4. Reports breaking-change fixes separately — asks before applying
5. Runs tests to verify nothing broke

**Usage**:

```
/audit
```

---

## `/healthcheck`

**Purpose**: Scan Docker container logs for errors, crashes, and warnings.

**When to use**: When services are misbehaving, after a deployment, or as a periodic health check.

**Input**: Optional `$ARGUMENTS` — a service name to check only that service.

**Output**: Summary table printed to chat with per-service status and issue counts.

**What it does**:

1. Runs `docker compose ps` to see container status (healthy, unhealthy, restarting, exited)
2. Collects recent logs (last 100 lines) for each app service
3. Scans for error patterns: ERROR, CRITICAL, FATAL, Exception, Traceback, panic, HTTP 500, container restarts, OOM kills, connection errors, import errors, syntax errors
4. Classifies each finding: **BUG** (code defect), **CONFIG** (missing/invalid configuration), **EXPECTED** (acceptable in local dev)
5. For BUG findings: reads the source file, identifies root cause, provides file path + line + fix description
6. Reports a summary table and detailed issue list

**Usage**:

```
/healthcheck
/healthcheck api
```

---

## `/learn`

**Purpose**: Process new references, distill insights into the knowledge base, and propose skill improvements.

**When to use**: After dropping new blog posts or repo files into `.claude/references/`, after running `/scout` or `/harvest`, or periodically to review if skills need updating even without new references.

**How to add material**:

- Blog posts / articles: paste full text as `.md` or `.pdf` into `.claude/references/blogs/`
- Repositories: clone via `/harvest <url>` or copy into `.claude/references/repos/<name>/`
- URLs: pass directly as argument — `/learn <url>` fetches and ingests it

**What it does**:

1. **URL ingestion** (when argument is a URL): fetches the page, saves as markdown to `references/blogs/`, then processes it
2. Detects unprocessed items in `references/` using filesystem markers (not the index table)
3. For **blog files**: reads full content, extracts actionable insights, routes to appropriate context file, moves to `processed/` subfolder
4. For **repo directories**: checks for a `harvest-report.md` first (written by `/harvest`) — if present, uses the structured report instead of re-scanning. Otherwise selectively reads key files. Creates `processed/.done` marker when done.
5. **Staleness updates**: when processing scout reports, updates contradicted context sections in-place rather than appending duplicates
6. Appends durable, actionable insights to context files under dated section headings, tagged with `**Affects:** [skill1, skill2]`
7. **Reviews affected skills** against accumulated context knowledge — writes improvement proposals to `.claude/reviews/learn-proposals.md` (does NOT modify skills directly). Also includes skills targeted by harvest-sourced proposals.
8. Updates `references/index.md` with processing status
9. Conditionally runs `/doc` to regenerate documentation (only if context files changed)

**Usage**:

```
/learn
/learn https://example.com/blog-post
```

---

## `/harvest`

**Purpose**: Clone and analyze a Git repo's Claude Code setup — skills, hooks, agents, rules, CLAUDE.md — then generate adoption proposals.

**When to use**: After `/scout` discovers interesting repos (listed in "Repos worth harvesting"), or directly on any repo URL you find interesting.

**Input**: `$ARGUMENTS` — a Git-cloneable URL. Optional flags: `--clean` (delete clone after analysis), `--deep` (line-level comparison).

**Output**: `references/repos/<slug>/harvest-report.md` + proposals appended to `reviews/learn-proposals.md`

**What it does**:

1. **Validate**: parses URL, checks idempotency (`processed/.done` marker + registry), loads framework inventory
2. **Clone**: shallow clone (`--depth 1`) to `references/repos/<owner>-<repo>/`
3. **Assess**: checks for `.claude/`, `CLAUDE.md`, MCP config; fetches repo metadata via `gh api`; classifies source tier (T1 Anthropic / T2 popular / T3 other)
4. **Inventory**: scans skills, agents, hooks, rules, CLAUDE.md, MCP config, package.json scripts; classifies each as **new** / **enhancement** / **duplicate** / **incompatible** against our framework
5. **Deep analysis** (with `--deep`): detailed side-by-side comparison for `new` and `enhancement` items, assesses adaptation effort (trivial / moderate / significant)
6. **Proposals**: generates adoption proposals in learn-proposals format for `new` and `enhancement` items
7. **Report**: writes structured harvest report with inventory table, key findings, and proposals summary
8. **Finalize**: updates scout-registry (type `repo`, status `fetched`), creates `processed/.done` marker, appends metrics. If `--clean`, preserves report but deletes clone.

**Non-framework repos**: If no `.claude/` or `CLAUDE.md` found, writes a minimal report noting interesting patterns (scripts, CI, MCP) and registers as processed.

**Usage**:

```
/harvest https://github.com/anthropics/skills
/harvest https://github.com/someone/cool-claude-setup --deep
/harvest https://github.com/someone/large-repo --clean
```

---

## `/deploy`

**Purpose**: Deploy the framework to a target project by replacing shared directories with symlinks (junctions on Windows) back to this repo.

**When to use**: After copying `.claude/` to a new project, run once to convert shared directories into symlinks so all projects stay in sync.

**Input**: `$ARGUMENTS` — path to the target project.

**What it does**:

1. Detects OS (Windows → junctions via `mklink /J`, Linux/Mac → symlinks via `ln -s`)
2. For each shared directory (`skills/`, `agents/`, `rules/`, `commands/`): backs up the existing copy and creates a symlink/junction back to the framework repo
3. Leaves project-specific directories local (`context/`, `specs/`, `reviews/`, `input/`, `references/`, `hooks/`, `handoffs/`, `docs/`)
4. Ensures all local directories exist, cleans up stale files

**Usage**:

```
/deploy /path/to/my-project
```

---

## `/apply-proposals`

**Purpose**: Review and apply accepted proposals from `learn-proposals.md` to skill and rule files. Closes the scout→learn→apply loop.

**When to use**: After reviewing proposals in `.claude/reviews/learn-proposals.md` and marking them as accepted. Or interactively to review and apply in one step.

**Input**: Optional flags: `--all` (apply all accepted), `--proposal <N>` (apply specific proposal). No arguments = interactive mode.

**Output**: Modified skill/rule files, updated proposal statuses in `learn-proposals.md`.

**What it does**:

1. Reads and parses all proposals from `learn-proposals.md`
2. **Interactive mode**: presents a numbered table of all proposals with status, lets you select which to apply
3. **Validates diffs** before applying — checks if the "old" text still exists in the target file. Stale proposals (where the file has changed) are auto-deferred, not force-applied.
4. Applies changes: edits existing files or creates new skill/rule files
5. **Syntax checks** modified files: valid YAML frontmatter, required fields present, no duplicates
6. Updates proposal statuses in `learn-proposals.md` (pending→accepted, stale→deferred)
7. **Proposal aging**: auto-defers proposals that have been pending for 3+ scout cycles; flags proposals deferred for 30+ days for potential rejection

**Usage**:

```
/apply-proposals                  # interactive — review and select
/apply-proposals --all            # apply all accepted proposals
/apply-proposals --proposal 3     # apply proposal #3 only
```

---

## `/doc`

**Purpose**: Regenerate all documentation in `.claude/docs/` from the current state of skills and context.

**When to use**: Automatically triggered by `/learn`. Run manually after modifying skills or context files.

**What it reads**:

- All skill definitions in `.claude/skills/`
- All context files in `.claude/context/`
- `references/index.md` for the knowledge base changelog

**What it writes**:

- `.claude/docs/README.md` — framework overview
- `.claude/docs/workflow.md` — workflow rationale and patterns
- `.claude/docs/skills-reference.md` — this file
- `.claude/docs/knowledge-base.md` — distilled insights changelog

**Usage**:

```
/doc
```

---

## `/create-hook`

**Purpose**: Scaffold a Claude Code lifecycle hook for this project based on detected tooling.

**When to use**: When you want deterministic quality enforcement that runs automatically on every action — not advisory instructions Claude might ignore.

**Why hooks**: Hooks are shell commands that fire at specific lifecycle events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `PermissionRequest`, `PostCompact`). They are the only way to make behaviour truly mandatory rather than suggested.

**Input**: Project tooling (detected automatically). Optional $ARGUMENTS describing the desired hook behaviour.

**What it does**:

1. **Detects tooling** — scans for `tsconfig.json`, `.prettierrc`, `.eslintrc.*`, `package.json` scripts, `.git`
2. **Suggests relevant hooks** based on what's found (type-check, auto-format, lint+fix, secret scanner, protected-dir guard)
3. **Configures** the hook: event type, tool matcher, scope (project / global / project-local), Claude integration, file filtering
4. **Creates** the hook script following technical standards:
   - Reads JSON from `stdin` (never `argv`)
   - Success: `{ continue: true, suppressOutput: true }`
   - Error: `{ continue: true, additionalContext: "..." }` so Claude auto-fixes
   - Block (PreToolUse only): `exit(2)`
5. **Registers** the hook in the appropriate `settings.json` (merges with existing)
6. **Tests** both happy path (hook passes silently) and sad path (hook fires correctly)

**Hook types**: `command` (local script), `http` (POST JSON to URL), `prompt` (single-turn LLM evaluation — no script needed), or `agent` (subagent verification)

**Hook event types**:

- **Tool execution**: `PreToolUse` (can block) / `PostToolUse` (feedback/fix) / `PostToolUseFailure` (react to errors) / `PermissionRequest` (approve/deny/ask)
- **User interaction**: `UserPromptSubmit` (before prompt) / `Notification` (permission prompts, idle, auth)
- **Session lifecycle**: `SessionStart` / `SessionEnd` / `InstructionsLoaded` / `Stop` / `StopFailure`
- **Context management**: `PreCompact` / `PostCompact`
- **Agent operations**: `SubagentStart` / `SubagentStop` / `TeammateIdle` / `TaskCompleted`
- **Version control**: `WorktreeCreate` / `WorktreeRemove`
- **MCP integration**: `Elicitation` / `ElicitationResult`
- **Configuration**: `ConfigChange` / `Setup`

**Usage**:

```
/create-hook
/create-hook type-check ts files after every edit
/create-hook block writes to migrations/ directory
```

---

## `/handoff`

**Purpose**: Capture current session state to a timestamped file so work can be resumed cleanly after `/clear` or context compaction.

**When to use**: Before running `/clear`, ending a session mid-task, or whenever context is getting long and you want a clean restart without losing state.

**Input**: Optional `$ARGUMENTS` — a short label for the handoff (e.g. `scoring-engine-wip`).

**Output**: `.claude/handoffs/YYYY-MM-DD-HH-MM.md`

**What it writes**:

- Current task (one sentence)
- Pipeline position (which skill is active or next)
- Active spec/review file references
- Key source files being worked on
- Decisions made this session (non-obvious choices not visible in code)
- Open questions
- Exact next step to take when resuming

**Usage**:

```
/handoff
/handoff scoring-engine-wip
```

**After running**: Review the file, then `/clear`. In the new session, run `/continue`.

---

## `/continue`

**Purpose**: Restore context from a handoff file and prepare to resume work in a fresh session.

**When to use**: At the start of a new session when a `/handoff` file exists.

**Input**: Optional `$ARGUMENTS` — filename or label of a specific handoff. Without arguments, loads the most recently modified handoff.

**What it does**:

1. Finds and reads the handoff file
2. Reads the referenced spec and review files
3. Briefly reads the listed key source files
4. Reports: current task, pipeline position, open questions, proposed next step
5. Waits for confirmation before doing anything

**Usage**:

```
/continue
/continue scoring-engine-wip
```
