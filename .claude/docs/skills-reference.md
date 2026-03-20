# Skills Reference

Generated and maintained by `/doc`. Last updated: 2026-03-20.

Each skill is defined in `.claude/skills/<name>/SKILL.md`. Skills are technology-agnostic — they read project commands from `CLAUDE.md` rather than hardcoding tools.

---

## `/ship`

**Purpose**: Orchestrate the full spec-to-commit pipeline in a single command.

**When to use**: When shipping a complete feature end-to-end with minimal manual intervention. Requirements should be in `.claude/input/` or passed as arguments.

**Input**: `$ARGUMENTS` — a feature description. Optional `--dry-run` flag to preview scope without implementing.

**Output**: Merged feature branch with atomic commits, pipeline metrics appended to `.claude/metrics.csv`.

**What it does**:

1. Creates a `feat/<spec-name>` branch (skipped in `--dry-run`)
2. Front-loads all clarifying questions in a single batch — the only user interruption
3. Launches a **spec subagent** (opus) — writes `.claude/specs/<name>.md`
4. **Complexity gate**: stops if file count exceeds threshold (default: 10)
5. _Dry-run exit_: if `--dry-run`, prints a scope report and stops here
6. Launches an **implement subagent** (opus) — writes source, runs verify
7. Launches a **review subagent** (opus) — writes `.claude/reviews/<name>-review.md`
8. If issues found, launches a **fix subagent** (sonnet) — loops review/fix up to 3 cycles
9. **Lesson graduation** (Step 4b) — promotes mature lessons from `lessons.md` to `CLAUDE.md` rules
10. **Cross-phase integration check** (Step 4c) — only for phased implementations; verifies data flow, interface contracts, and glue code across phases
11. Runs a **final verify gate** — typecheck, lint, tests, build
12. Launches a **commit subagent** (sonnet) — creates atomic conventional commits
13. Asks how to finalize: merge to main, open a PR, or leave on branch
14. Appends a row to `.claude/metrics.csv` with run statistics

**Usage**:

```
/ship user authentication
/ship add export feature --dry-run
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
6. Writes the spec with sections: Goal, Requirements, Out of scope, Affected files, New files, **Patterns to mirror**, Implementation notes, **UX concept** (component tree, interaction flows, state/data flow, responsive behavior, accessibility, reuse check), **Validation criteria**, **Test cases**, **Decisions made by Claude**
7. **Flags complexity**: adds a warning section if total affected + new files exceeds 10, suggesting decomposition
8. Suggests moving processed files from `input/` to `archive/`

**Usage**:

```
/0_spec
/0_spec user authentication
```

**After running**: Read the spec before proceeding. Move processed files from `input/` to `archive/`.

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
9. Runs: typecheck -> lint -> tests -> build
10. Fixes any failures (max 2 attempts, then escalates)
11. **Validation criteria gate**: confirms every criterion from the spec
12. **Artifact inventory check**: verifies every spec file was touched in the changeset
13. **Pre-flight self-review**: reviews own changes against review lenses before handoff
14. Optionally runs `/simplify` for a quality pass
15. Suggests atomic commits if multiple concerns were touched

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

**Review criteria** (9 lenses):

- **Correctness**: does it match the spec? Logic bugs, missing cases?
- **Code quality**: follows existing patterns? Over-engineered or unnecessarily complex?
- **Security**: injection risks, exposed secrets, missing input validation, OWASP top-10?
- **Tests / QA**: relevant cases covered? Edge-case gaps? Regression risk?
- **UX / Minimal impact**: does the change touch only what's necessary? Scope creep? Patches hiding root causes?
- **PM**: does the change deliver business value? Aligned with spec goal? Anything built that wasn't asked for?
- **DevOps**: CI/CD implications? Environment variables, build config, or deployment steps affected? Observability gaps?
- **Spec validation**: if spec has "Validation criteria", can each criterion be confirmed from the diff?
- **Spec completeness**: walks every requirement, validation criterion, and test case — marks each as implemented / missing / partial. Missing = critical, partial = major.

**Review modes**:

- **Full review mode** (first cycle): reads all changed files, evaluates all 9 lenses
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
8. **Validation criteria check**: confirms every criterion still passes after fixes
9. **Self-check against review items**: re-reads each affected file to verify the fix actually resolves the issue
10. **Spec-anchored check**: if fixes diverged from the spec, updates the spec
11. **Self-improvement gate**: writes recurrence-prevention lessons to `lessons.md`
12. Reports what was fixed, what was skipped, spec changes, and recurrence-prevention suggestions

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

**Purpose**: Search the web for recent Claude Code developments, release notes, and community patterns. Compare against the current framework and report optimization opportunities.

**When to use**: Periodically (e.g., weekly or monthly) to check for new Claude Code features, breaking changes, or community skills that could improve the framework.

**Input**: Optional `--quick` flag to skip page fetching and return titles/links only.

**Output**: `.claude/reviews/scout-<YYYY-MM-DD>.md`

**What it does**:

1. Reads CLAUDE.md, all skill files, and context files to understand current capabilities
2. **Release notes phase**: fetches the official Claude Code changelog, extracts entries from the last 60 days, compares each against the framework's 18 skills and hooks
3. **Search phase**: runs 4 targeted web searches for Claude Code best practices, GitHub skills, hooks/subagents/agent teams, and CLAUDE.md patterns
4. **Fetch phase** (skipped with `--quick`): fetches top 5 most relevant results, extracts actionable insights, assesses whether the framework already handles each one
5. **Reports** a structured analysis: release notes table, new features not being used, skills that could be improved, breaking changes/deprecations, links worth investigating, and patterns already implemented correctly

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

**When to use**: After dropping new blog posts or repo files into `.claude/references/`. Also run periodically to review if skills need updating even without new references.

**How to add material**:

- Blog posts / articles: paste full text as `.md` or `.pdf` into `.claude/references/blogs/`
- Repositories: copy README and key files into `.claude/references/repos/<name>/`

**What it does**:

1. Detects unprocessed items in `references/` using filesystem markers (not the index table)
2. For **blog files**: reads full content, extracts actionable insights, routes to appropriate context file, moves to `processed/` subfolder
3. For **repo directories**: selectively reads key files (README, resources, docs, command patterns), creates `processed/.done` marker when done
4. Appends durable, actionable insights to context files under dated section headings
5. **Reviews every skill** against accumulated context knowledge — writes improvement proposals to `.claude/reviews/learn-proposals.md` (does NOT modify skills directly)
6. Updates `references/index.md` with processing status
7. Runs `/doc` to regenerate documentation

**Usage**:

```
/learn
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

**Hook types**: `command` (local script) or `http` (POST JSON to URL)

**Hook event types**: `PreToolUse` (can block) / `PostToolUse` (feedback/fix) / `UserPromptSubmit` (before prompt) / `PermissionRequest` (approve/deny) / `PostCompact` (after context compaction)

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
