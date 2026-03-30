---
name: ship
description: Orchestrate the full spec → implement → review → fix → commit pipeline. Use when shipping a complete feature end-to-end.
disable-model-invocation: true
argument-hint: <feature description> [--dry-run] [--parallel]
model: claude-opus-4-6
effort: high
---

Orchestrate the full spec-to-commit pipeline for the feature described in $ARGUMENTS or in `.claude/input/`.

**`--dry-run` mode:** If $ARGUMENTS contains `--dry-run`, run only Steps 1–2 (questions + spec), then print a scope report and stop. No branch, no implementation, no commits. Use this to preview complexity and scope before committing to a full pipeline run.

**`--parallel` mode:** If $ARGUMENTS contains `--parallel`, replace Step 3 (sequential implement) with Step 3P (parallel implement). The orchestrator decomposes the spec into independent work units based on file domains, validates that no two units write the same file, spawns up to 3 parallel subagents in isolated git worktrees, then merges their results back. If decomposition fails or merge conflicts are unresolvable, falls back to sequential Step 3 automatically. All other steps (spec, review, fix, commit) remain unchanged.

**Architecture:** The main session is a thin orchestrator only — it never reads code files or accumulates implementation context. Each phase runs in a dedicated subagent with a clean context. The spec file, review file, and git diff are the handoff mechanism between phases.

**Progress updates:** After each subagent returns, print a one-line status update so the user can track progress. Use this format:

```
✓ Step N — <phase> complete. <key detail from subagent summary>
```

Examples: `✓ Step 2 — Spec complete. 7 files, 3 new.` · `✓ Step 3 — Implementation complete. All checks pass.` · `✓ Step 4 — Review: pass with fixes (2 major).` · `✓ Step 4 — Fix cycle 1 complete. 2/2 issues resolved.`

```
Main session (orchestrator — reads summaries only)
  ├── Step 0: branch setup              →  creates feat/<spec-name> (or stays on current branch)
  ├── Step 1b: historical patterns      →  reads metrics-pipeline.csv → builds spec guidance
  ├── Subagent A: spec          [opus]  →  writes .claude/specs/<name>.md (informed by patterns)
  ├── Step 2b: decision review          →  reads spec "Decisions made by Claude" → user approval
  │
  ├── [sequential] Step 3: implement    →  single subagent [opus], returns summary
  │   — OR —
  ├── [--parallel] Step 3P: parallel implement
  │     ├── 3P-a: decompose spec into work units (by file domain)
  │     ├── 3P-b: validate file claims (no EXCLUSIVE overlaps)
  │     ├── 3P-c: spawn up to 3 subagents [opus, isolation: worktree, background]
  │     ├── 3P-d: wait and collect results
  │     ├── 3P-e: merge (copy files from worktrees → feature branch)
  │     ├── 3P-f: resolve integration seams (duplicate types, stubs, type assertions)
  │     └── 3P-g: post-merge verify
  │
  ├── Subagent C: review        [opus]  →  writes .claude/reviews/<name>-review.md
  ├── Subagent D: fix  [opus if rework, sonnet if fixes]→  loop back to C
  ├── Step 4b: lesson graduation        →  graduates mature lessons → CLAUDE.md
  ├── Step 4c: integration check [opus] →  cross-phase glue review (phased only)
  ├── Step 5: final verify              →  typecheck → lint → tests → build
  ├── Subagent E: commit        [sonnet]→  atomic commits on feature branch
  └── Step 6: merge + push              →  merges feat/<spec-name> → main
```

---

## Step 0 — Branch setup (orchestrator)

**Skip this step entirely if `--dry-run` is set** — dry-run never creates branches.

Before doing anything else:

1. Check the current branch with `git branch --show-current`
2. If already on a feature branch (not `main` or `master`), **stay on it** — this is the working branch. Note its name. Do NOT switch to main to create a new branch. Create a checkpoint from the current HEAD: `git branch checkpoint/<spec-name>`
3. If on `main` or `master`, run: `git checkout -b feat/<spec-name>` where `<spec-name>` is derived from $ARGUMENTS or the most recently modified file in `.claude/input/`. Then create checkpoint: `git branch checkpoint/<spec-name>`
4. Confirm the branch and note its name — all subsequent subagent commits will land here

---

## Step 1 — Front-load questions (orchestrator)

Read only CLAUDE.md and `.claude/input/` to understand the feature scope.
Ask all clarifying questions in a **single batch** before launching any subagent. Use selectable options where possible.
Wait for answers. This is the only user interruption before commit.

If requirements are fully unambiguous, skip to Step 1b.

---

## Step 1b — Historical pattern analysis (orchestrator)

Read `.claude/metrics-pipeline.csv` if it exists. If the file has fewer than 3 rows (excluding the header), skip this step — not enough data for meaningful patterns.

**Analysis:**

1. Derive the likely `area` for the current feature from $ARGUMENTS and `.claude/input/` context (e.g. "add payment webhook" → `api` or `payment`)
2. Filter metrics rows where `area` matches (or is closely related to) the current feature's area
3. If 2+ matching rows exist, compute:
   - **avg_review_cycles** — mean of `review_cycles` across matching rows
   - **common_issue_categories** — the `issue_categories` values that appear in 2+ matching rows
   - **avg_files_changed** — mean of `files_changed` across matching rows
4. If no matching rows exist, check all rows for overall patterns (high avg review cycles across the board may indicate systemic issues)

**Build a `historical_context` block** (plain text, 2-5 lines max) to pass to the spec subagent. Examples:

> Features in the `api` area averaged 2.3 review cycles. Recurring issue categories: validation, edge-cases. Spec should include explicit input validation rules and edge case handling for each endpoint.

> Features in the `ui` area averaged 1.0 review cycles. No recurring issues. No additional spec guidance needed.

> Not enough historical data for this area. No additional spec guidance.

If no meaningful patterns are found, set `historical_context` to empty and proceed — this step is purely additive.

---

## Step 2 — Spec subagent

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/0_spec/SKILL.md` and follow all steps exactly. The feature to spec is: $ARGUMENTS. The user has already answered clarifying questions; their answers are: [paste answers from Step 1 here, or 'none — requirements are unambiguous']. Do not ask further questions — skip step 6. Historical pattern analysis from prior pipeline runs: [paste historical_context from Step 1b here, or 'none — no historical data']. You are running as a subagent. Write the spec and return: (1) the spec filename, (2) the file count from Affected files + New files, (3) a one-paragraph summary of what will be built, (4) the full Decisions made by Claude section if present."

Read the returned summary. Do not read the spec file itself.

**Complexity gate:** if the returned file count exceeds `complexity_gate_max_files` from CLAUDE.md (default: 10), stop and tell the user — suggest decomposing into sub-specs. Do not continue without user confirmation.

### Step 2b — Decision review (orchestrator)

If the spec subagent returned a "Decisions made by Claude" section with any decisions:

1. Print the decisions to the user, prefixed with: "The spec made these decisions autonomously. Please confirm or override:"
2. List each decision as a numbered item
3. Wait for user confirmation before proceeding to Step 3

If no decisions were made (or the section is empty), skip to Step 3.

### Dry-run exit point

If `--dry-run` was passed in $ARGUMENTS, print the following scope report and **stop** — do not continue to Step 3:

```
## Dry-run scope report

- **Spec:** .claude/specs/<name>.md
- **Files affected:** N (affected) + N (new) = N total
- **Complexity gate:** pass / ⚠ exceeds threshold (N > max)
- **Estimated phases:** 1 (single session) / multiple (suggest decomposition)
- **Summary:** [one-paragraph summary from spec subagent]

Ready to run the full pipeline? → `/ship <same arguments without --dry-run>`
```

Do not create a branch, do not implement, do not commit. The spec file is written to disk so the user can review it before running the full pipeline.

---

## Step 3 — Implement subagent (sequential — skip if `--parallel`)

**If `--parallel` is set, skip to Step 3P below.**

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/1_implement/SKILL.md` and follow all steps exactly for spec: <spec-name>. Auto-proceed through plan mode (step 7) without waiting for approval. You are running as a subagent. Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers that prevented completion."

Read the returned summary. Do not read any changed files.

If the subagent reports a blocker (verify suite failing after two attempts), stop and report to the user — do not continue to review.

---

## Step 3P — Parallel implement (only when `--parallel` is set)

**If `--parallel` is NOT set, this step was already skipped — Step 3 ran instead.**

Replace the single implement subagent with a decompose → parallel spawn → merge flow. Every substep has an explicit fallback to sequential Step 3 — parallel is optimistic, never forced.

### Step 3P-a — Decompose spec into work units (orchestrator)

1. Read the spec file `.claude/specs/<spec-name>.md` — extract **only** the file paths from "Affected files" and "New files" sections
2. Group files by their top-level directory (e.g., `src/components/`, `src/lib/`, `src/api/`, `tests/`). Each group is a candidate **work unit**
3. If only 1 group exists → print "Spec files are all in one domain — falling back to sequential" and run Step 3 instead
4. If more than 3 groups → merge the smallest groups (by file count) until at most 3 remain
5. Print the decomposition for transparency:

```
Parallel decomposition: <N> work units
  Unit 1 — <domain>: <file list>
  Unit 2 — <domain>: <file list>
  Unit 3 — <domain>: <file list>
```

### Step 3P-b — Validate file claims (orchestrator)

For each work unit, classify every file:

- **EXCLUSIVE** — files this unit will create or modify
- **READ-ONLY** — files outside this unit's scope that it may need to read (shared types, configs, interfaces)

Validation rules:

1. No file may appear in the EXCLUSIVE list of two different work units
2. If an overlap is detected, merge the overlapping work units into one
3. After merging, if only 1 work unit remains → fall back to sequential Step 3

### Step 3P-c — Spawn parallel implement subagents (orchestrator)

For each work unit (max 3), launch a subagent with `isolation: worktree` and `run_in_background: true`:

> "Read `.claude/skills/1_implement/SKILL.md` and follow all steps exactly for spec: <spec-name>. Auto-proceed through plan mode (step 7) without waiting for approval.
>
> **SCOPE CONSTRAINT — you are one of <N> parallel agents.** Your scope is limited to these files only:
> - EXCLUSIVE (you may create/modify): [list of EXCLUSIVE files for this unit]
> - READ-ONLY (you may read but NOT modify): [list of READ-ONLY files for this unit]
>
> Do not create, modify, or delete any file outside your EXCLUSIVE list. If you discover you need to modify a READ-ONLY file, note it as a blocker and continue with the files you can modify.
>
> **IMPORTANT — Types from READ-ONLY files:** If you need types/interfaces that don't exist yet in a READ-ONLY file (because another parallel agent is creating them), import from the real file path anyway — do NOT create local duplicate type definitions. If the import fails during development, define a temporary type prefixed with `PARALLEL_` (e.g., `type PARALLEL_BenchmarkComparison = { ... }`) so the orchestrator can find and replace them during integration.
>
> You are running as a subagent. Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers — especially files you needed to modify but couldn't due to scope constraint."

Print: `⏳ Spawned <N> parallel implement agents in isolated worktrees`

### Step 3P-d — Collect results with active monitoring (orchestrator)

**Do not wait passively for agent notifications** — they can arrive minutes after files are ready. Use active monitoring:

1. As each agent notification arrives, record its summary. Print: `✓ Unit <N> (<domain>) complete — <files_changed> files, verify: <pass/fail>`
2. After **90 seconds** with unreturned agents, check each pending worktree: `ls` the expected EXCLUSIVE files to see which exist
3. Print a progress update: `⏳ Unit <N> (<domain>): <N>/<total> expected files written, still running...`
4. If ALL expected EXCLUSIVE files for an agent exist in its worktree, **proceed to Step 3P-e immediately** — copy the files without waiting for the agent's return message. The post-merge verify (3P-g) will catch any issues. Print: `⚡ Unit <N> (<domain>): all files present, proceeding to merge`

**Failure handling:**
- If ANY agent reports a scope violation (modified a file outside its EXCLUSIVE list), flag it but continue — the integration step will handle conflicts
- If ALL agents report blockers, fall back to sequential Step 3
- If SOME agents completed and others blocked, proceed with merge of completed units only

### Step 3P-e — Merge files from worktrees (orchestrator)

Copy each worktree's changed files back into the feature branch. Process in order of dependency (types/scoring first, then API, then UI — foundations before consumers).

For each completed worktree agent:

1. List changed files in the worktree: `git -C <worktree-path> diff --name-only` and `git -C <worktree-path> ls-files --others --exclude-standard`
2. Copy each changed/new file from the worktree to the feature branch working directory
3. If a file was modified by the worktree agent AND also exists as a NEW file from a previously merged unit (both units created it), this is a conflict — compare contents and keep the more complete version, or merge manually
4. After copying all files from a unit, run a quick typecheck (`tsc --noEmit`) as a smoke test before merging the next unit

Print after each unit: `✓ Merged unit <N> (<domain>) — <N> files copied`

**If any copy produces a typecheck failure that wasn't present in isolation**, stop and diagnose — this likely indicates a type mismatch between units. If unresolvable after one attempt, fall back to sequential Step 3.

### Step 3P-f — Resolve integration seams (orchestrator)

Parallel agents work in isolation, so their outputs will have predictable integration issues. Fix these **before** running post-merge verify:

1. **`PARALLEL_` types and inline functions**: Search all copied files for `PARALLEL_` prefixed types. Replace with imports from the real source. Also remove any inline function duplicates that duplicate functions from the real scoring module — replace with imports
2. **Duplicate types without prefix**: Search for locally-defined interfaces that duplicate types in shared files (e.g., a component defining `BenchmarkComparison` locally when it exists in `types.ts`) — replace with imports and re-export if needed
3. **Stubs**: If any agent created a stub file that another agent implemented fully, delete the stub (the real implementation was already copied in Step 3P-e)
4. **Type assertions**: Search for `as {` type assertions that bridge missing type fields — if the real type now includes the field, remove the assertion and use direct access
5. **Cross-unit API contracts**: If one unit produces data (API route) and another consumes it (UI component), verify the response field names match the consumer's expected type. Common mismatch: DB column names (e.g., `resultSnapshot`) vs TypeScript interface names (e.g., `result`). Fix in the producer (API response mapping), not the consumer
6. **Missing props**: If a unit added a required prop to a component's interface but the parent file is in a different unit, the parent may not pass it. Check for missing prop errors in typecheck output and fix them

Run typecheck after resolving seams to confirm the fixes compile.

### Step 3P-g — Post-merge verify (orchestrator)

Run the full verify suite (typecheck → lint → tests → build) on the merged result. Individual worktree agents ran verify in isolation — this catches cross-unit integration issues.

- If all checks pass → print `✓ Step 3P — Parallel implementation complete. <N> units merged, all checks pass.` and proceed to Step 4
- If any check fails → launch a single fix subagent (model: **opus**) to resolve cross-unit integration issues. Re-run verify. If it fails after two attempts, stop and escalate to user

### Post-merge cleanup

After Step 3P completes (pass or fallback), clean up worktrees:

```bash
git worktree remove <worktree-path> --force  # for each worktree
git branch -D <worktree-branch>              # for each worktree branch
```

---

## Step 4 — Review/Fix loop (max `review_fix_max_cycles` from CLAUDE.md, default: 3)

Maintain a cycle counter starting at 0.

### Review subagent

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/2_review/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) the overall assessment (pass / pass with fixes / needs rework), (2) the full numbered issue list with severities."

Read the returned assessment. Do not read the review file itself.

Route:

- **"pass"** → go to Step 5 (smoke test)
- **"pass with fixes"** or **"needs rework"** → increment cycle counter. If counter ≥ 3, stop and escalate to the user with the recurring issues — do not attempt a fourth fix cycle. Include in the escalation: "To roll back, run `git checkout feat/<spec-name> && git reset --hard checkpoint/<spec-name>`." Otherwise proceed to Fix subagent. Note the verdict for model selection below.

### Fix subagent

Select the model based on the review verdict:

- **"needs rework"** (critical issues — architectural, security, missing requirements) → use **opus**
- **"pass with fixes"** (major-only issues — straightforward fixes) → use **sonnet**

Launch a subagent (model: **opus** or **sonnet** per above, maxTurns: 15) with:

> "Read `.claude/skills/3_fix/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) list of issues fixed, (2) any issues skipped and why, (3) verify suite status, (4) any lessons written to `.claude/context/lessons.md`."

Read the returned summary. Loop back to Review subagent.

---

## Step 4b — Lesson graduation (orchestrator)

After the review/fix loop passes, graduate mature lessons into permanent CLAUDE.md rules.

1. Read `.claude/context/lessons.md`
2. If the file has **fewer than 5 entries**, skip this step — not enough to warrant graduation
3. For each lesson entry:
   - **Graduate** if the lesson has `scope: framework` AND is older than `lesson_graduation_age_days` from CLAUDE.md (default: 14) AND was not triggered again since it was written (no similar issue appeared in subsequent review cycles). Extract a **single-line rule** (the "Rule:" part, stripped of the "What went wrong" narrative) and append it to the `## Learned Rules` section in CLAUDE.md. If that section doesn't exist yet, create it at the bottom of CLAUDE.md.
   - **Keep** if the lesson is younger than the graduation age — it hasn't proven itself yet
   - **Delete** if the lesson has `scope: project` AND is already enforced by code (e.g., a test exists that catches the exact scenario, or a linter rule covers it). Project-scoped lessons are never graduated to CLAUDE.md — they stay in `lessons.md` or get deleted when enforced.
   - **Skip** if the lesson has no `scope:` tag — treat as `scope: project` (legacy default)
4. Remove graduated/deleted entries from `lessons.md`
5. Do not graduate more than 15 lessons in a single pass — keep the diff reviewable
6. All changes to `lessons.md` and `CLAUDE.md` will be included in the commit (Step 6 — Commit subagent)

**Format for graduated rules in CLAUDE.md:**

```markdown
## Learned Rules

- Never use global regex with `.test()` in a loop — remove the `g` flag
- `log_event()` before `db.commit()`, never after
- Worker ORM stubs must include every column accessed by code in the same file
```

One line per rule. No dates, no "what went wrong" narrative. Just the rule.

---

## Step 4c — Cross-phase integration check (orchestrator — only for phased implementations)

**Skip this step if no phase manifest exists** (`.claude/specs/<name>-phases.md`). For single-phase features, proceed directly to Step 5.

If a phase manifest exists and all phases are `done`, launch a subagent (model: **opus**) with:

> "You are performing a cross-phase integration review. Read the spec `.claude/specs/<name>.md` and the phase manifest `.claude/specs/<name>-phases.md`. Then read all files listed in the spec's 'Affected files' and 'New files' sections. Check:
>
> 1. **Data flow continuity** — do outputs from earlier phases correctly feed into later phases? (e.g., API routes return what the frontend expects, shared types are consistent)
> 2. **Interface contracts** — do function signatures, prop types, API schemas, and store shapes match across phase boundaries?
> 3. **Missing glue code** — are there any integration points that no single phase owned? (e.g., wiring a new route into the router, registering a provider, adding a nav link)
> 4. **Import/dependency consistency** — do all cross-phase imports resolve? Are there circular dependencies?
>
> Return: (1) 'pass' if all integration points are sound, or (2) a numbered list of integration issues found, each with severity (critical/major) and the two phases involved."

Route:

- **"pass"** → proceed to Step 5
- **Issues found** → launch a fix subagent (model: **sonnet**) to resolve integration issues only. Re-run the verify suite after fixes. If fixes fail after two attempts, escalate to user.

---

## Step 5 — Final verify gate (orchestrator)

Run the project's full verify suite (typecheck → lint → tests → build) one last time. Late-stage changes from the fix cycle may have introduced regressions.

- If all checks pass → proceed to Step 6
- If any check fails → launch a fix subagent to resolve, then re-run. If it fails after two attempts, stop and escalate to the user — do not commit broken code. Include in the escalation: "To roll back, run `git checkout feat/<spec-name> && git reset --hard checkpoint/<spec-name>`."

Note: Smoke testing against Docker (`/smoke <spec-name>`) is a separate manual step the user can run before or after `/ship`. It is not part of the automated pipeline because Docker infrastructure issues should not block the ship flow.

---

## Step 6 — Commit subagent

Launch a subagent (model: **sonnet**) with:

> "Read `.claude/skills/commit/SKILL.md` and follow all steps exactly. Split into atomic commits if multiple concerns are present. You are running as a subagent. Return the commit hash(es) and message(s)."

---

## Step 7 — Finalize (orchestrator)

Ask the user: "Branch `feat/<spec-name>` is ready and all checks pass. How do you want to finalize?
A) Merge to main now (`git merge` + `push`)
B) Open a PR (show me the GitHub PR URL)
C) Leave on branch — I'll handle it manually
D) Run `/smoke <spec-name>` first to validate against Docker"

Execute the chosen option. If A: `git checkout main && git merge --no-ff <current-branch> && git push`. If push fails, report to the user — do not force-push. Use the actual current branch name (which may be `feat/<spec-name>` or the branch that was already checked out at Step 0).

### Post-merge cleanup (runs after A or after a PR is merged)

1. **Delete feature branches**: `git branch -d feat/<spec-name>` and `git branch -d checkpoint/<spec-name>` (if it exists). Do not delete if the merge hasn't happened yet.
2. **Mark spec as completed**: prepend `status: completed` to the spec's YAML frontmatter (or add a `## Status: completed` line at the top if the spec has no frontmatter). This makes it easy to distinguish shipped specs from in-progress ones.
3. **Clean up phase manifest**: if `.claude/specs/<name>-phases.md` exists, mark all phases as `done` (they should already be, but this is a consistency safeguard).

---

## Final report (orchestrator)

Print a summary assembled from subagent return values:

- Branch: `feat/<spec-name>` → merged to `main`
- Spec: `.claude/specs/<name>.md`
- Files changed: [from Step 3]
- Review cycles: N
- Final status: pass
- Commits: [hash + message from Step 6]
- Pushed: yes / no (with reason if failed)

## Metrics (orchestrator — always run after final report)

Append one row to `.claude/metrics-pipeline.csv`. Create the file with a header row if it doesn't exist.

**Format:**

```
date,spec,area,files_changed,review_cycles,issues_found,issues_critical,issues_major,issue_categories,commits,outcome
```

**Fields:**

- `date` — ISO date (YYYY-MM-DD)
- `spec` — spec filename without path/extension
- `area` — primary codebase area affected (e.g. `scoring`, `auth`, `ui`, `api`, `infra`). Derive from the dominant directory in the changed files list. Use a single word, lowercase. If unclear, use `general`
- `files_changed` — count from Step 3 summary
- `review_cycles` — how many review/fix iterations (0 = passed first review)
- `issues_found` — total issues across all review cycles
- `issues_critical` — count of critical-severity issues
- `issues_major` — count of major-severity issues
- `issue_categories` — semicolon-separated list of issue types found across all review cycles (e.g. `validation;edge-cases;types`). Use short lowercase labels. Empty if no issues
- `commits` — number of commits created in Step 6
- `outcome` — `shipped` / `escalated` / `aborted`

This is append-only — never modify or delete existing rows. The CSV is a lightweight log for spotting trends (e.g., rising review cycles, recurring issue categories). No tooling required — open in any spreadsheet or `column -t -s, .claude/metrics-pipeline.csv`.
