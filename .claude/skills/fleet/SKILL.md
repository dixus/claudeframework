---
name: fleet
description: Ship decomposed PRDs in parallel. Analyzes file conflicts, groups into batches, runs /ship in isolated worktrees, merges results. Use after /decompose.
disable-model-invocation: true
argument-hint: decomposition-name --dry-run --max-parallel N --batch-only
model: claude-opus-4-6
effort: high
---

Orchestrate parallel `/ship` runs for decomposed PRDs. Analyze file conflicts across features, group non-conflicting features into parallel batches, execute each in an isolated git worktree, and merge results back to main conflict-free.

`$ARGUMENTS` is optional:
- First positional arg: decomposition name (matches `.claude/specs/decomposition-<name>.md`)
- `--dry-run` — generate specs and show batch plan, but don't implement
- `--max-parallel N` — limit concurrent worktrees (default: 5)
- `--batch-only` — run batch 1 only, then stop for review

## Architecture

Fleet is a **thin orchestrator** — it never reads code files or accumulates implementation context. It reads manifests, spec metadata, and delegates all per-feature work to `/ship` subagents running in isolated worktrees.

```
Fleet orchestrator (this skill)
  ├── Step 0: load decomposition manifest
  ├── Step 1: collect file claims from specs
  ├── Step 2: conflict analysis → batch plan
  ├── Step 3: execution plan + user approval
  ├── Step 4: batch execution loop
  │     ├── Launch /ship agents in isolated worktrees (background)
  │     ├── Wait for completion
  │     ├── Merge completed branches to main
  │     └── Advance to next batch
  ├── Step 5: final integration verify
  ├── Step 6: failure triage
  └── Step 7: fleet report + metrics
```

---

## Step 0 — Load decomposition manifest

1. Parse `$ARGUMENTS` for the decomposition name and flags (`--dry-run`, `--max-parallel N`, `--batch-only`)
2. If a decomposition name is provided, read `.claude/specs/decomposition-<name>.md`
3. If no name provided, find the most recently modified `decomposition-*.md` in `.claude/specs/`
4. If no decomposition manifest exists: **stop** — "No decomposition found. Run `/decompose` first to break your concept into PRDs."
5. Parse the manifest's **features table**: extract feature name, PRD path, dependencies, status
6. Filter to features with status `pending` only (skip `completed`, `in-progress`, `skipped`)
7. If no pending features: "All features are already completed or in-progress."

---

## Step 1 — Collect file claims

For each pending feature from the manifest:

1. Check if a spec already exists at `.claude/specs/<feature-name>.md`
   - **If yes:** read only the `## Affected files` and `## New files` sections. Do not read the rest.
   - **If no:** the feature has a PRD but no spec yet.

2. If any features lack specs, ask the user:
   - A) Run `/ship <feature> --dry-run` for each to generate specs first (recommended — gives precise file data)
   - B) Proceed with PRD-level `## Technical hints` only (less precise conflict detection)

   If A: launch `/ship --dry-run` for all unspecced features **in parallel** (specs don't modify code, so there are no conflicts). Use multiple Agent calls in a single message, each with `run_in_background: true`. No `isolation: "worktree"` needed — each agent writes to a different spec file and no code is changed. Read the generated spec's file sections afterward.

3. Build a **file claim map**: for each file path, list which features claim it (either as affected or new).

---

## Step 2 — Conflict analysis

This is the core algorithm. Build a conflict graph and partition features into parallel batches.

### 2a. Direct file overlap

For each pair of features (A, B):
```
overlap(A, B) = files_claimed_by_A ∩ files_claimed_by_B
```
If non-empty, A and B have a **direct conflict**.

### 2b. Indirect conflict detection (heuristics)

Beyond direct file overlap, detect these conflict patterns:

| Conflict type | Detection rule |
|---|---|
| **Barrel/index files** | Both features add new files to the same directory AND that directory contains an `index.ts`, `index.tsx`, or `index.js` |
| **Migration ordering** | Both features list files matching `migrations/`, `prisma/migrations/`, `drizzle/`, or `*.sql` in known migration directories |
| **Shared type definitions** | Both features modify files matching `**/types.ts`, `**/types/*.ts`, `**/interfaces.ts`, `**/schemas.ts` |
| **Config files** | Both features modify any of: `package.json`, `tsconfig.json`, `tailwind.config.*`, `next.config.*`, `.env.example` |
| **Shared state** | Both features modify files matching `store/*.ts`, `store/index.ts`, `context/*.tsx` |
| **Route registration** | Both features modify `app/layout.tsx`, `routes.ts`, `router.ts`, `_app.tsx`, or similar route config files |

### 2c. Dependency graph overlay

Read the manifest's dependency graph:
- Features with **hard dependencies** must be serialized regardless of file overlap (dependent feature goes in a later batch)
- Features with **soft dependencies** can be parallelized but prefer adjacent batches

### 2d. Batch partitioning algorithm

1. Build an undirected **conflict graph**: nodes = features, edges = any conflict (file overlap, heuristic, or hard dependency)
2. **Topological sort** features by hard dependencies (independent features first)
3. Within each dependency level, apply **greedy graph coloring** based on file conflicts
4. Features with the same color can run in parallel → assign to the same batch
5. Respect `--max-parallel N`: if a batch has more features than the limit, split into sub-batches

Result: ordered list of batches, each containing non-conflicting features.

---

## Step 3 — Execution plan + user approval

Print the batch plan:

```
## Fleet execution plan

**Decomposition:** <name>
**Features:** N total, N pending
**Batches:** M

### Batch 1 — parallel (K features)
| Feature          | New files | Affected files | Conflicts with         |
|------------------|-----------|----------------|------------------------|
| scoring-engine   | 4         | 0              | none                   |
| questionnaire-ui | 6         | 4              | none                   |
| help-system      | 3         | 0              | none                   |

### Batch 2 — parallel (K features, after batch 1)
| Feature          | New files | Affected files | Conflicts with                          |
|------------------|-----------|----------------|-----------------------------------------|
| results-page     | 3         | 3              | radar-chart (shared: ResultsPage.tsx)   |
| timeline         | 2         | 1              | none                                    |

### Batch 3 — serial (1 feature, after batch 2)
| Feature     | New files | Affected files | Conflicts with                               |
|-------------|-----------|----------------|----------------------------------------------|
| radar-chart | 0         | 2              | results-page (completed in batch 2)          |

**Max concurrent worktrees:** N
```

Then ask:

- A) Run all batches automatically
- B) Run batch 1 only, then pause for review before continuing
- C) Adjust the plan (move/skip/reorder features)
- D) Dry-run only — show this plan and stop

`--dry-run` auto-selects D. `--batch-only` auto-selects B.

---

## Step 4 — Batch execution loop

For each batch:

### 4a. Launch /ship agents in parallel

Launch ALL features in the batch in a **single message** with multiple Agent tool calls. Each agent runs in an SDK-managed worktree (`isolation: "worktree"`) — do NOT create worktrees manually.

```
Agent(
  prompt: "You are a fleet worker. Run /ship <feature-name> --no-finalize.

  Do NOT ask the user clarifying questions — proceed with reasonable defaults.

  Return a summary with:
  - outcome: shipped / escalated / aborted
  - branch name
  - commit hashes
  - files changed count
  - review cycles count
  - any blockers or issues encountered",

  isolation: "worktree",
  run_in_background: true
)
```

### 4b. Monitor completion

Wait for all agents in the batch to return. Print status as each completes:

```
✓ scoring-engine — shipped (4 files, 0 review cycles)
✓ questionnaire-ui — shipped (12 files, 1 review cycle)
✗ help-system — escalated (blocker: test failure after 2 fix attempts)
```

### 4c. Merge completed features

For each **successfully shipped** feature in the batch, in batch plan order:

1. Get the branch name from the agent's return summary (the SDK worktree creates a branch automatically)
2. Ensure you are on `main` before merging. If not already on `main`, run `git checkout main`. Verify the working tree is clean (`git status --porcelain` should be empty) — if not, stop and report the issue.
3. `git merge --no-ff <branch-name> -m "fleet: merge <feature-name>"`
4. If merge conflict occurs (should not happen if conflict analysis was correct):
   - `git merge --abort`
   - Log the conflicting files
   - Defer the feature to a "conflict resolution" pass at the end
   - Continue with remaining features
5. After successful merge:
   - `git branch -d <branch-name>`
   - The SDK automatically cleans up the worktree
6. Update the decomposition manifest: set feature status to `completed`

### 4d. Handle failures

For features that failed (escalated/aborted) in this batch:
- Do NOT merge their branch
- If the SDK worktree made changes, the branch and worktree path are returned in the agent result — note them for manual inspection
- Record the failure details for the triage phase (Step 6)
- Do NOT block other features in the batch

### 4e. Advance to next batch

After all merges in the current batch are complete, proceed to the next batch. The next batch's worktrees will branch from the now-updated `main` (which includes all successfully merged features from previous batches).

If `--batch-only` was passed, stop here and report: "Batch 1 complete. Run `/fleet` again to continue with batch 2."

---

## Step 5 — Final integration verify

After all batches are complete, run the full verify suite on `main`:

```bash
npx tsc --noEmit        # typecheck
npm run lint             # lint
npx vitest run           # tests
npm run build            # build
```

Adapt commands to the project's `CLAUDE.md` (these are the demo app defaults).

If any check fails, this is a **cross-feature integration issue**:
- Report the failing check and error output
- Suggest running `/debug` to investigate
- Do NOT roll back already-merged features

---

## Step 6 — Failure triage

If any features failed during execution, present them:

```
## Failed features

| Feature      | Batch | Failure type | Blocker                              |
|--------------|-------|-------------|--------------------------------------|
| help-system  | 1     | escalated   | test failure in help.test.ts         |
| radar-chart  | 3     | conflict    | merge conflict on ResultsPage.tsx    |

Options for each failed feature:
A) Retry — run /ship again in a fresh worktree
B) Skip — mark as skipped in manifest, handle manually later
C) Investigate — the branch is preserved, /debug manually
```

Apply the user's choice for each failed feature.

---

## Step 7 — Fleet report + metrics

Print a summary:

```
## Fleet complete

**Decomposition:** <name>
**Features:** N shipped, N failed, N skipped out of N total
**Batches:** M executed
**Max concurrent worktrees:** K
**Integration verify:** pass / fail

| # | Feature          | Batch | Outcome   | Files | Review cycles |
|---|------------------|-------|-----------|-------|---------------|
| 1 | scoring-engine   | 1     | shipped   | 4     | 0             |
| 2 | questionnaire-ui | 1     | shipped   | 12    | 1             |
| 3 | help-system      | 1     | escalated | —     | 2             |
| 4 | results-page     | 2     | shipped   | 6     | 0             |
| 5 | radar-chart      | 3     | shipped   | 2     | 1             |

**Merge commits on main:** <list>
```

Append one row **per feature** to `.claude/metrics-pipeline.csv` (same format as `/ship`), with `fleet` noted in the spec field suffix (e.g., `scoring-engine [fleet]`).

Extract structured fields from each agent's return summary:
- `files_changed` — from "files changed count"
- `review_cycles` — from "review cycles count"
- `outcome` — from "outcome" (shipped / escalated / aborted)
- `commits` — count of commit hashes returned

For fields the agent summary doesn't include (`issues_found`, `issues_critical`, `issues_major`, `issue_categories`), read them from the feature's review file at `.claude/reviews/<feature-name>-review.md` if it exists. If the review file doesn't exist (e.g., the feature was aborted before review), use `0` for counts and empty for categories.

Update the decomposition manifest with final statuses for all features.

---

## Conflict analysis — worked example

Given three features:
- **auth**: affects `src/lib/auth.ts`, `src/types.ts`, `package.json`
- **dashboard**: affects `src/components/Dashboard.tsx`, `src/types.ts`
- **api-docs**: affects `docs/api.md`, `src/lib/swagger.ts`

Conflict matrix:
- auth ↔ dashboard: conflict on `src/types.ts` (shared types)
- auth ↔ api-docs: no overlap
- dashboard ↔ api-docs: no overlap

Batch plan:
- **Batch 1** (parallel): auth + api-docs (no conflict)
- **Batch 2** (after batch 1): dashboard (conflicts with auth, which completes in batch 1)

---

## Edge cases

- **Single feature pending:** Skip batching, run `/ship` directly. No worktree needed.
- **All features conflict with each other:** Each batch has one feature. Equivalent to running `/ship` sequentially. Report this and suggest the user reconsider the decomposition.
- **Cleanup on abort:** If the user aborts mid-fleet, list any remaining feature branches and offer cleanup: `git branch -d` for each.
- **Decomposition manifest updated externally:** Re-read the manifest before each batch to catch status changes.
