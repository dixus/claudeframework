---
name: ship
description: Orchestrate the full spec → implement → review → fix → commit pipeline. Use when shipping a complete feature end-to-end.
disable-model-invocation: true
argument-hint: <feature description> [--dry-run] [--no-finalize]
model: claude-opus-4-6
effort: high
---

Orchestrate the full spec-to-commit pipeline for the feature described in $ARGUMENTS or in `.claude/input/`.

**`--dry-run` mode:** If $ARGUMENTS contains `--dry-run`, run only Steps 1–2 (questions + spec), then print a scope report and stop. No branch, no implementation, no commits. Use this to preview complexity and scope before committing to a full pipeline run.

**`--no-finalize` mode:** If $ARGUMENTS contains `--no-finalize`, run the full pipeline (spec → implement → review → fix → commit) but **skip Step 7 (Finalize)**. The feature stays on its branch with all commits applied and checks passing, but is not merged to main. Used by `/fleet` to manage merges centrally.

**Architecture:** The main session is a thin orchestrator only — it never reads code files or accumulates implementation context. Each phase runs in a dedicated subagent with a clean context. The spec file, review file, and git diff are the handoff mechanism between phases.

**Progress updates:** After each subagent returns, print a one-line status update so the user can track progress. Use this format:

```
✓ Step N — <phase> complete. <key detail from subagent summary>
```

Examples: `✓ Step 2 — Spec complete. 7 files, 3 new.` · `✓ Step 3 — Implementation complete. All checks pass.` · `✓ Step 4 — Review: pass with fixes (2 major).` · `✓ Step 4 — Fix cycle 1 complete. 2/2 issues resolved.`

```
Main session (orchestrator — reads summaries only)
  ├── Step 0: branch setup              →  creates feat/<spec-name> (or stays on current branch)
  ├── Step 0b: ticket resolution        →  optional — loads work item from Azure DevOps (if MCP tools available)
  ├── Step 1b: historical patterns      →  reads metrics-pipeline.csv → builds spec guidance
  ├── Subagent A: spec          [opus]  →  writes .claude/specs/<name>.md (informed by patterns)
  ├── Step 2b: decision review          →  reads spec "Decisions made by Claude" → user approval
  │
  ├── Subagent B: implement     [opus]  →  single subagent, returns summary
  ├── Subagent C: review        [opus]  →  writes .claude/reviews/<name>-review.md
  ├── Subagent D: fix  [opus if rework, sonnet if fixes]→  loop back to C
  ├── Step 4b: lesson graduation        →  graduates mature lessons → CLAUDE.md
  ├── Step 4c: integration check [opus] →  cross-phase glue review (phased only)
  ├── Step 5: final verify              →  typecheck → lint → tests → build
  ├── Subagent E: commit        [sonnet]→  atomic commits on feature branch
  ├── Step 6b: DevOps feedback          →  optional — posts branch + commits to work item
  └── Step 7: merge + push              →  merges feat/<spec-name> → main, closes work item
```

---

## Step 0 — Branch setup (orchestrator)

**Skip this step entirely if `--dry-run` is set** — dry-run never creates branches.

Before doing anything else:

1. **Read project branch conventions:** Check if `.claude/rules/branch-management.md` exists. If it does, read it and note the branch naming convention — this determines how the branch is named in step 4 below.
2. Check the current branch with `git branch --show-current`
3. If already on a feature branch (not `main` or `master`), **stay on it** — this is the working branch. Note its name. Try to parse a ticket ID from it if the project's convention includes one (see `branch-management.md`). Do NOT switch to main to create a new branch. Create a checkpoint from the current HEAD: `git branch checkpoint/<spec-name>`
4. If on `main` or `master` **and** the project requires a ticket-based branch name (per `branch-management.md`), set `branch_pending = true` — defer branch creation until after Step 1 where ticket metadata is collected. If no project convention exists, run: `git checkout -b feat/<spec-name>` where `<spec-name>` is derived from $ARGUMENTS or the most recently modified file in `.claude/input/`. Then create checkpoint: `git branch checkpoint/<spec-name>`
5. Confirm the branch (or note that it is pending) — all subsequent subagent commits will land here

---

## Step 0b — Ticket resolution (orchestrator, optional)

**Skip this step if the `ado_get_work_item` MCP tool is not available.** The framework works fully without Azure DevOps integration.

If $ARGUMENTS contains a numeric ticket ID (e.g. `/ship 1234` → ticket ID `1234`), resolve the ticket using this fallback chain:

1. **Local input file first:** Glob for `.claude/input/{id}*` or `.claude/input/*{id}*`. If a file is found, read it and use its content as the feature description.

2. **Azure DevOps lookup:** If no local file was found, call `ado_get_work_item({ id: <ticketId> })`. If the work item is found:
   - Use its **title** as the short description
   - Use its **description** + **acceptanceCriteria** as the feature description for the spec
   - Use its **type** for branch naming (per `branch-management.md`, if the convention maps work item types to branch types)
   - Infer the branch-name module segment from the work item's `areaPath` or title keywords (per `branch-management.md`, if the convention includes a module segment)
   - Set `ticket_resolved = true` — Step 1 can skip asking for ticket metadata
   - Optionally update the work item state: `ado_update_work_item_state({ id, state: "Active" })` if that state exists in the project's workflow

3. **Always read ticket comments:** If `ado_get_work_item_comments` is available, call `ado_get_work_item_comments({ id: <ticketId> })`. Comments often contain decisions, context, or requirements from other developers that are NOT in the description. Include relevant comment content in `ticket_context` for the spec subagent.

4. **Fallback:** If both lookups fail, proceed to Step 1 and ask the user for ticket metadata as usual.

Store the resolved ticket data (id, title, type, description, acceptanceCriteria, comments) in a `ticket_context` variable for use in subsequent steps.

---

## Step 1 — Front-load questions (orchestrator)

Read only CLAUDE.md, `.claude/rules/branch-management.md` (if it exists), and `.claude/input/` to understand the feature scope and project conventions.

**Ticket metadata (mandatory if `branch-management.md` requires it):** If `ticket_resolved` is true (from Step 0b), skip the ticket metadata questions — use the resolved data instead. Otherwise, include the ticket metadata questions required by the project's `branch-management.md` at the start of the batch.

Then ask any other clarifying questions in the **same batch**. Use selectable options where possible.
Wait for answers. This is the only user interruption before commit.

**Deferred branch creation:** If `branch_pending` was set in Step 0, create the branch now using the collected ticket metadata, following the pattern defined in `branch-management.md`. Then create checkpoint: `git branch checkpoint/<spec-name>`.

If requirements are fully unambiguous **and** you are already on a correctly named branch, skip the questions and proceed to Step 1b.

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

1. Separate decisions by severity: **(high)** vs **(medium)** / **(low)**
2. **Auto-accept** all (medium) and (low) decisions — print them as "Auto-accepted decisions (medium/low):" for visibility, but do not wait for confirmation
3. If any **(high)** decisions exist, print them prefixed with: "The spec made these HIGH-priority decisions that need your input:" — list each as a numbered item and wait for user confirmation before proceeding
4. If no (high) decisions exist, proceed directly to Step 3 without interruption

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

## Step 3 — Implement subagent

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/1_implement/SKILL.md` and follow all steps exactly for spec: <spec-name>. Auto-proceed through plan mode (step 7) without waiting for approval. You are running as a subagent. Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers that prevented completion."

Read the returned summary. Do not read any changed files.

If the subagent reports a blocker (verify suite failing after two attempts), stop and report to the user — do not continue to review.

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

## Step 6b — DevOps feedback (orchestrator, optional)

**Skip this step if no ticket was resolved in Step 0b** (i.e. `ticket_context` is empty) **or** if the `ado_add_work_item_comment` MCP tool is not available.

If a ticket was resolved from Azure DevOps:

1. **Post a development comment** on the work item: `ado_add_work_item_comment({ id: <ticketId>, comment: "Branch: <working-branch>\nCommits: <commit-hashes-and-messages>\nSpec: .claude/specs/<name>.md" })`. This links the work item to the code changes.

2. Do NOT update the work item state here — that happens in Step 7 after a successful push/merge.

---

## Step 7 — Finalize (orchestrator)

**Skip this step entirely if `--no-finalize` is set** — proceed directly to Final report.

Ask the user: "Branch `<working-branch>` is ready and all checks pass. How do you want to finalize?
A) Merge to main now (`git merge` + `push`)
B) Open a PR (show me the GitHub PR URL)
C) Leave on branch — I'll handle it manually
D) Run `/smoke <spec-name>` first to validate against Docker"

Execute the chosen option. If A: `git checkout main && git merge --no-ff <current-branch> && git push`. If push fails, report to the user — do not force-push. Use the actual current branch name (which may be `feat/<spec-name>` or the branch that was already checked out at Step 0).

### Post-merge cleanup (runs after A or after a PR is merged)

1. **Delete feature branches**: `git branch -d <working-branch>` and `git branch -d checkpoint/<spec-name>` (if it exists). Do not delete if the merge hasn't happened yet.
2. **Mark spec as completed**: prepend `status: completed` to the spec's YAML frontmatter (or add a `## Status: completed` line at the top if the spec has no frontmatter). This makes it easy to distinguish shipped specs from in-progress ones.
3. **Clean up phase manifest**: if `.claude/specs/<name>-phases.md` exists, mark all phases as `done` (they should already be, but this is a consistency safeguard).
4. **DevOps state update (optional):** If a ticket was resolved from Azure DevOps (Step 0b) and the `ado_update_work_item_state` MCP tool is available, call `ado_update_work_item_state({ id: <ticketId>, state: "<closed-state>" })` to close the work item. The exact closed-state value depends on the project's workflow (common: `Closed`, `Resolved`, `Done`) — use the one configured in the project.

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
