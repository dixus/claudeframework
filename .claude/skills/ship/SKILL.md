---
name: ship
description: Orchestrate the full spec → implement → review → fix → commit pipeline. Use when shipping a complete feature end-to-end.
disable-model-invocation: true
argument-hint: <feature description> [--dry-run] [--no-finalize] [--auto-finalize] [--fast] [--full]
model: claude-opus-5
effort: high
---

Orchestrate the full spec-to-commit pipeline for the feature described in $ARGUMENTS or in `.claude/input/`.

**`--dry-run` mode:** If $ARGUMENTS contains `--dry-run`, run only Steps 1–2 (questions + spec), then print a scope report and stop. No branch, no implementation, no commits. Use this to preview complexity and scope before committing to a full pipeline run.

**`--no-finalize` mode:** If $ARGUMENTS contains `--no-finalize`, run the full pipeline (spec → implement → review → fix → commit) but **skip Step 7 entirely** — neither gate nor push nor state change. The feature stays on its branch with all commits applied and checks passing, but is not merged and the work item stays in its current state. Used by `/fleet` to manage merges centrally.

**`--auto-finalize` mode:** If $ARGUMENTS contains `--auto-finalize`, **skip the Step 7a finalize gate** and go straight to push + state transition. Use only when you trust the pipeline output without a manual smoke-test (doc-only commits, trivial refactors, hotfixes under time pressure). Default is the gated flow — the user sees a summary and must confirm before anything is pushed or the ticket changes state.

**`--fast` mode:** If $ARGUMENTS contains `--fast`, force the **fast path** regardless of the automatic classifier (Step 0c). Skips spec, review, and fix loop — uses a single implement subagent. Use for tickets where the scope is clearly trivial and you want to save token cost.

**`--full` mode:** If $ARGUMENTS contains `--full`, force the **full pipeline** regardless of the automatic classifier. Use when the classifier would choose fast path but the ticket has subtle integration risks or architecture decisions.

**Architecture:** The main session is a thin orchestrator only — it never reads code files or accumulates implementation context. Each phase runs in a dedicated subagent with a clean context. The spec file, review file, and git diff are the handoff mechanism between phases.

**Notation:** `<main>` denotes the repo's default branch (`main` or `master`). Determine it once in Step 0 with `git symbolic-ref --short refs/remotes/origin/HEAD` (fallback: whichever of `origin/main` / `origin/master` exists) and use that name wherever `<main>` appears below.

**Progress updates:** After each subagent returns, print a one-line status update so the user can track progress. Use this format:

```
✓ Step N — <phase> complete. <key detail from subagent summary>
```

Examples: `✓ Step 2 — Spec complete. 7 files, 3 new.` · `✓ Step 3 — Implementation complete. All checks pass.` · `✓ Step 4 — Review: pass with fixes (2 major).` · `✓ Step 4 — Fix cycle 1 complete. 2/2 issues resolved.`

```
Main session (orchestrator — reads summaries only)
  ├── Step 0: branch setup              →  creates ticket branch (or stays on current branch)
  ├── Step 0b: ticket resolution        →  loads work item + comments from tracker (if configured), sets state
  ├── Step 0c: complexity classifier    →  sets fast_path=true/false from ticket signals + --fast/--full flags
  │
  │   [fast path — fast_path=true or --fast]
  ├── Subagent F: implement    [fable]  →  reads ticket_context, implements directly, runs verify
  │
  │   [full pipeline — fast_path=false or --full]
  ├── Subagent A: spec          [opus]  →  writes .claude/specs/<name>.md incl. ## Contract
  ├── Step 2b: decision review          →  reads spec "Decisions made by Claude" → user approval
  ├── Subagent B: implement    [fable]  →  single subagent, returns summary
  ├── Subagent C: review        [opus]  →  writes .claude/reviews/<name>-review.md
  ├── Subagent D: fix  [opus if rework, sonnet if fixes]→  loop back to C
  ├── Step 4b: lesson graduation        →  moves mature lessons → archive + CLAUDE.md rule
  ├── Step 4c: integration check [opus] →  cross-phase glue review (phased only)
  │
  │   [both paths rejoin here]
  ├── Step 5: contract gate             →  generic suite + every Contract verify command
  ├── Step 5b: changelog entry          →  writes changelog/<branch>.md (per-ticket, merge-conflict-free)
  ├── Subagent E: commit        [sonnet]→  atomic commits on feature branch
  ├── Step 6b: tracker feedback         →  syncs derived fields, then at most one comment
  ├── Step 6d: upload changelog         →  attaches changelog/<branch>.md to the work item (if supported)
  ├── Step 7a: finalize gate            →  show summary + contract coverage + test hints, wait for user confirm
  └── Step 7b: push + finalize          →  pushes branch to origin, updates ticket state
```

---

## Step 0 — Branch setup (orchestrator)

**Skip this step entirely if `--dry-run` is set** — dry-run never creates branches.

Before doing anything else:

1. **Fetch remote refs:** run `git fetch origin` unconditionally and resolve `<main>`. All subsequent branch-base references (`origin/<main>`) must be fresh — the local default branch can lag behind the remote after other PRs merged, and branching from stale ground causes avoidable rebase pain at PR time.
2. **Read project branch conventions:** Check if `.claude/rules/branch-management.md` exists. If it does, read it and note the branch naming convention. This determines how the branch will be named in step 0.5 below.
3. Check the current branch with `git branch --show-current`
4. If already on a feature branch (not `<main>`), **stay on it** — this is the working branch. Note its name. Try to parse it for a ticket ID (see branch-management.md for the pattern). Do NOT switch to `<main>` to create a new branch. Create a checkpoint from the current HEAD: `git branch checkpoint/<spec-name>`
5. If on `<main>` **and** the project requires a ticket-based branch name (from branch-management.md), set `branch_pending = true` — defer branch creation until after Step 1 where the ticket metadata will be collected. If no project convention exists, run: `git checkout -b feat/<spec-name> origin/<main>` where `<spec-name>` is derived from $ARGUMENTS or the most recently modified file in `.claude/input/`. The explicit `origin/<main>` base guarantees the branch starts from the freshly fetched remote tip, not the local HEAD. Then create checkpoint: `git branch checkpoint/<spec-name>`
6. Confirm the branch (or note that it is pending) — all subsequent subagent commits will land here

---

## Step 0b — Ticket resolution (orchestrator)

### PRD-mode (non-numeric arg)

If `$ARGUMENTS` is **not** a parseable integer (e.g. `/ship 02a-foundation`, `/ship portal/02a-foundation`), treat the arg as a PRD reference and use this PRD-mode resolution:

1. Glob `.claude/input/**/*<arg>*.md` (case-insensitive). If exactly one file matches, that is the PRD. If 0 or 2+ match, fall back to Step 1 questions.
2. Read the PRD's YAML frontmatter:
   - `epic:` (required) — parent work-item ID. Used for the branch suffix and the `#<epic>` token in commit messages. PRD-mode never references the PRD itself in commit messages, only its epic.
   - `title:` (required) — used as `ticket_context.title`.
   - `application:` (optional) — the module/application name per branch-management.md; defaults to the project's cross-cutting module (e.g. `Shared`).
   - `depends_on:` (optional) — paths/names of other PRDs that must be `status: completed` first; warn the user if any unmet dependency exists.
3. Set `ticket_context = { id: <epic>, title: <title>, type: "Feature", description: <PRD body>, prd_path: <path> }` and **`prd_mode = true`**.
4. **In PRD-mode the ship skill makes NO tracker mutations.** All steps that would update a work item's state, fields, or comments are skipped (Steps 0b "move to in progress", 6b fields/comment, 6d attachment, 7b state transition). The epic itself is left untouched. Commits still reference `#<epic>` so the tracker auto-links them; that is the only tracker-visible side-effect.
5. **On success of the run** (after Step 7b would have transitioned state), update the PRD's frontmatter `status:` to `completed` so future `/ship` runs see it as a satisfied dependency.
6. Skip the rest of Step 0b (numeric-mode logic) and proceed to Step 0c.

### Numeric-mode (ticket-ID arg)

If $ARGUMENTS contains a number (e.g. `/ship 1234` → ticket ID `1234`), resolve the ticket using this fallback chain:

1. **Local input file first:** Glob for `.claude/input/{id}*` or `.claude/input/*{id}*`. If a file is found, read it and use its content as the feature description. Extract any ticket metadata (type, application) from the file if present.

2. **Work-item tracker lookup (if MCP tools available):** If no local file was found, check which work-item tracker MCP tools are configured (Azure DevOps, Jira, Linear, GitHub Issues, or any other tracker with an MCP integration). Prefer a "get with context" tool that returns the item together with its parent/children/related items, comments, and parsed artifact links (branches, commits, PRs) in one call — the framework's Azure DevOps server exposes `ado_get_work_item_with_context({ id, includeComments: true })`. Fall back to separate "get item" + "get comments" calls if no such tool exists; the pipeline still works but loses linked-item context. If the work item is found:
   - Use its **title** as the short description
   - Use its **description** + **acceptance criteria** as the feature description for the spec
   - Map its **type** to the branch convention per `branch-management.md`, if the convention maps work item types to branch types (e.g. bug-like items → `Bug`, change requests → `Improvement`, epics → `Feature`)
   - Infer the **application/module** from the work item's area/project or title keywords
   - Set `ticket_resolved = true` — Step 1 can skip asking for ticket metadata
   - **Move the work item into active development:** If a state-update tool is available, transition the ticket to the project's "in progress" state (exact name per `branch-management.md`; common: `Active`, `In Progress`). If the work item is already in a later state (e.g. `Resolved`, `Closed`, or a QA/UAT state), skip the transition and warn the user — resuming a ticket past development is unusual and needs confirmation. If the transition fails because the state is not in the workflow, retry once with the project's documented fallback state, then surface the error to the user.

   **No tracker configured?** Skip this step entirely — the pipeline works fully without a work-item tracker. The user will provide ticket metadata manually in Step 1.

3. **Inspect prior implementation work in linked items:** From the `related`, `parent`, and `duplicates` arrays of the context response, identify any item in a terminal or development-complete state. For each such item, examine its linked commits, branches, and PRs:
   - For each commit SHA → run `git show <sha> --stat` (and `git show <sha>` if the diff is small) to see what was implemented
   - For each branch name → run `git log <main>..<branch> --oneline` to see what's on it
   - For each PR ID → note for the spec subagent (don't fetch — the PR API is typically not exposed)

   Summarize the prior work (which fields/methods/files already exist, what behaviour is already in place) into a `prior_work_context` block. This prevents the spec subagent from re-scoping work that is already done in a sibling ticket.

4. **Fallback:** If all lookups fail, proceed to Step 1 and ask the user for ticket metadata as usual.

Store the resolved ticket data (id, title, type, description, acceptanceCriteria, comments, linked items, `prior_work_context`) in a `ticket_context` variable for use in subsequent steps. The spec subagent prompt in Step 2 must include `prior_work_context` so it can fold the existing implementation into the spec.

---

## Step 0c — Complexity classifier (orchestrator)

Decide which pipeline path to use — **fast path** (single implement subagent, no spec/review) or **full pipeline** (existing flow). Set a `fast_path` variable that all subsequent steps check.

### Override flags (evaluated first)

- `--fast` in $ARGUMENTS → `fast_path = true`. Skip scoring, announce choice, jump to **Step F**.
- `--full` in $ARGUMENTS → `fast_path = false`. Skip scoring, announce choice, continue to **Step 1**.

### Automatic scoring (no override flag set)

Read `ticket_context.title`, `ticket_context.description`, and `ticket_context.acceptanceCriteria`. Count how many of these content signals are present. Each signal is worth 1 point:

| Signal | Condition |
|---|---|
| **Narrow scope** | The ticket touches exactly one class, one file, one config section, or one clearly bounded area — no cross-cutting concerns |
| **No new behaviour** | Nothing in the description adds a user-facing feature, new API endpoint, new UI component, or new business rule — the change is purely internal (tests, refactor, docs, deps, config) |
| **No decision-making required** | The implementation path is unambiguous from the ticket description alone — no architectural choices, no tradeoffs to resolve, no unclear requirements |
| **No Restricted Areas** | The description does not touch any path or concern listed under CLAUDE.md `## Restricted Areas` (security-critical code — typically auth, tenant filtering, permissions, API-key validation, file upload/delete, inter-service calls) — **OR** `No new behaviour` is already true (test/refactor/docs/config tickets cannot modify production Restricted Area code by definition, so the signal auto-passes). If CLAUDE.md defines no such section, the signal is present only via the second clause. |

**Decision:**

- **Score ≥ 3** → `fast_path = true`. Print: `⚡ Fast path selected (N/4 signals: <list matched signals>). Skipping spec, review, and fix loop.` → go to **Step F**.
- **Score < 3** → `fast_path = false`. Print: `Full pipeline selected (N/4 signals).` → continue to **Step 1**.

**Safety net:** If no ticket was resolved in Step 0b (ticket_context is empty), always use `fast_path = false` — the classifier needs ticket data to score reliably.

---

## Step F — Fast Path: Implement (fast path only)

**Only reached if `fast_path = true`.** If `fast_path = false`, skip this entire section and go to Step 1.

Launch a subagent (model: **fable**, maxTurns: 25) with:

> "You are implementing a ticket directly — no spec file exists. Work on branch `<working-branch>`.
>
> **Ticket context:**
> Title: <ticket_context.title>
> Description: <ticket_context.description>
> Acceptance criteria: <ticket_context.acceptanceCriteria or 'see description'>
> Prior work from linked tickets: <prior_work_context or 'none'>
>
> **Steps:**
> 1. Read `CLAUDE.md` and every file in `.claude/rules/` for project conventions.
> 2. Identify the target files from the ticket description. Read them before editing.
> 3. Implement the minimal change that satisfies the acceptance criteria. No speculative code, no scope creep, no production edits if the ticket is test-only.
> 4. Run the project's verify commands from CLAUDE.md (typecheck → lint → tests → build), scoped to what was touched where the project offers scoped commands.
> 5. If verify fails, fix and re-run once. If it still fails after the second attempt, stop and report the blocker — do not keep trying.
>
> Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers that prevented completion."

Read the returned summary. If the subagent reports a blocker, stop and escalate to the user — do not continue.

**After Step F returns successfully, skip Steps 1, 2, 2b, 3, 4, 4b, 4c and jump directly to Step 5.**

---

## Step 1 — Front-load questions (orchestrator)

**Skip this step if `fast_path = true` — go directly to Step F.**

Read only CLAUDE.md, `.claude/rules/branch-management.md` (if it exists), and `.claude/input/` to understand the feature scope and project conventions.

**Ticket metadata (mandatory if branch-management.md requires it):** If `ticket_resolved` is true (from Step 0b), skip the ticket metadata questions — use the resolved data instead. Otherwise, include these questions at the start of the batch:
- **Ticket ID** — the work item number
- **Ticket type** — per branch-management.md (e.g. `Bug`, `Improvement`, `Feature`)
- **Application / module** — infer from $ARGUMENTS or the spec scope; if ambiguous, ask, offering the module list from branch-management.md (plus its cross-cutting value, e.g. `Shared`)

Then ask any other clarifying questions about the feature in the **same batch**. Use selectable options where possible.
Wait for answers. This is the only user interruption before commit.

**Deferred branch creation:** If `branch_pending` was set in Step 0, create the branch now using the collected ticket metadata, following the pattern defined in `branch-management.md`, with an explicit remote base: `git checkout -b <branch-name> origin/<main>`. The explicit base pairs with the `git fetch origin` from Step 0 to guarantee the branch starts from the current remote tip. Then create checkpoint: `git branch checkpoint/<spec-name>`

If requirements are fully unambiguous **and** you are already on a correctly named ticket branch, skip the questions and proceed to Step 2.

---

## Step 2 — Spec subagent

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/0_spec/SKILL.md` and follow all steps exactly. The feature to spec is: $ARGUMENTS. The user has already answered clarifying questions; their answers are: [paste answers from Step 1 here, or 'none — requirements are unambiguous']. Do not ask further questions — skip step 6. Prior work already implemented in linked tickets: [paste prior_work_context from Step 0b here, or 'none — no linked work items found']. You are running as a subagent. The prior work context tells you which fields/methods/behaviour already exists from sibling tickets — fold this into 'Affected files', 'Implementation notes', and adjust scope accordingly; do NOT re-spec work that is already done. Skip Step 2b in 0_spec since I have already resolved the ticket context. Write the spec and return: (1) the spec filename, (2) the file count from Affected files + New files, split into **production files** and **test files** (a test file is one whose only purpose is to test other code — `*.spec.*`, `*.test.*`, files under a test project or `__tests__`/`e2e` directory, fixtures and mocks), (3) a one-paragraph summary of what will be built, (4) the full Decisions made by Claude section if present, (5) the `## Contract` item count split into automated (non-null `verify`) vs `manual`."

Read the returned summary. Do not read the spec file itself.

**Complexity gate:** if the returned **production** file count exceeds `complexity_gate_max_files` from CLAUDE.md (default: 10), stop and tell the user — suggest decomposing into sub-specs. Do not continue without user confirmation. Always print both numbers (`N production + M test = T total`) so the decision is traceable.

Count production files only. The gate exists to catch a spec that is too big to implement and review in one pass, and test files do not carry that risk: they are a per-file consequence of the production surface, they are what `test-required` asks for, and a spec cannot be decomposed along them anyway — splitting `foo.ts` from `foo.spec.ts` produces two halves of one change. Counting them punishes exactly the specs that took the test strategy seriously, and it fires on specs no human would call oversized (a real case: 11 files total tripped the gate, of which only 8 were production). If the production count alone exceeds the threshold, the spec really is too broad — escalate as before.

**The spec's own opinion is not part of this decision.** A spec that argues "do not decompose" may be right, and that argument belongs in the escalation you show the user — but it never suppresses the gate. A gate the audited party can switch off is not a gate.

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
- **Files affected:** N (affected) + N (new) = N total — N production, N test
- **Complexity gate:** pass / ⚠ exceeds threshold (N production > max)
- **Estimated phases:** 1 (single session) / multiple (suggest decomposition)
- **Summary:** [one-paragraph summary from spec subagent]

Ready to run the full pipeline? → `/ship <same arguments without --dry-run>`
```

Do not create a branch, do not implement, do not commit. The spec file is written to disk so the user can review it before running the full pipeline.

---

## Test strategy classification

Every spec declares a classification; `1_implement` ships real assertions in the same commit as the production code; `2_review` verifies the classification-vs-reality match but does not block. The three labels (`test-required`, `test-recommended`, `no-test-needed:<category>`) and the authoritative 7-item `no-test-needed` category whitelist are defined in `.claude/skills/0_spec/SKILL.md` `## Test strategy` — all other files (this one, `2_review/SKILL.md`) reference that list by name rather than duplicating it, to avoid drift.

When the spec's `Affected files` or `New files` touches a path listed under CLAUDE.md `## Restricted Areas` (if the project defines that section), `0_spec` auto-forces the classification to `test-required` and emits a one-line security hint asking for at least one negative test.

The `2_review` "Test strategy" lens is **soft-warning only** — it emits `minor` severity findings and never escalates the verdict. Hard gates (blocking on missing tests, coverage thresholds) are a project-level decision and belong in CI, not in the review skill.

---

## Step 3 — Implement subagent (full pipeline only)

**Skip this step if `fast_path = true` — implementation was done in Step F.**

Launch a subagent (model: **fable**) with:

> "Read `.claude/skills/1_implement/SKILL.md` and follow all steps exactly for spec: <spec-name>. Auto-proceed through plan mode (step 7) without waiting for approval. You are running as a subagent. Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers that prevented completion, (4) the step-14 contract gate result — one line per item (`C1 ✓ · C2 ✗ · C3 manual`), or `no contract (legacy spec)`."

Read the returned summary. Do not read any changed files.

If the subagent reports a blocker (verify suite failing after two attempts), stop and report to the user — do not continue to review.

---

## Step 4 — Review/Fix loop (full pipeline only, max `review_fix_max_cycles` from CLAUDE.md, default: 3)

**Skip this entire step if `fast_path = true` — go directly to Step 4b.**

Maintain a cycle counter starting at 0.

### Review subagent

Launch a subagent (model: **opus**) with:

> "Read `.claude/skills/2_review/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) the overall assessment (pass / pass with fixes / needs rework), (2) the full numbered issue list with severities, (3) the contract table — one row per item with its id and `✓ bound` / `✗ unbound` / `manual` status."

Read the returned assessment. Do not read the review file itself.

Route:

- **"pass"** → go to Step 5 (contract gate + final verify)
- **"pass with fixes"** or **"needs rework"** → increment cycle counter. If counter ≥ 3, stop and escalate to the user with the recurring issues — do not attempt a fourth fix cycle. Include in the escalation: "To roll back, run `git checkout <working-branch> && git reset --hard checkpoint/<spec-name>`." (use the actual branch name from Step 0/1). Otherwise proceed to Fix subagent. Note the verdict for model selection below.

### Fix subagent

Select the model based on the review verdict:

- **"needs rework"** (critical issues — architectural, security, missing requirements) → use **opus**
- **"pass with fixes"** (major-only issues — straightforward fixes) → use **sonnet**

Launch a subagent (model: **opus** or **sonnet** per above, maxTurns: 15) with:

> "Read `.claude/skills/3_fix/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) list of issues fixed, (2) any issues skipped and why, (3) verify suite status, (4) any lessons written to `.claude/context/lessons.md`, (5) the step-9 contract re-check result — one line per item — and an explicit statement of whether any contract item was edited (editing one is a scope change, not a fix)."

Read the returned summary. Loop back to Review subagent.

---

## Step 4b — Lesson graduation (orchestrator)

After the review/fix loop passes, graduate mature lessons into permanent CLAUDE.md rules. Graduation **moves — it never deletes**: the full entry (narrative included) survives in `.claude/context/lessons-archive/graduated.md`, and the `no-entry-lost` test case treats any vanished entry as a loss.

1. Read `.claude/context/lessons.md`
2. If the file has **fewer than 5 entries**, skip this step — not enough to warrant graduation
3. For each lesson entry:
   - **Graduate** if the lesson has `scope: framework` AND is older than `lesson_graduation_age_days` from CLAUDE.md (default: 14) AND was not triggered again since it was written (no similar issue appeared in subsequent review cycles). Extract a **single-line rule** (the "Rule:" part, stripped of the "What went wrong" narrative), then run `node .claude/scripts/lesson-cycle.mjs --mode graduate --entry "<heading text without '## '>" --rule "<single-line rule>"` — the tool moves the full entry verbatim to `lessons-archive/graduated.md` (the narrative survives) and appends the rule to `## Learned Rules` in CLAUDE.md. Never edit `lessons.md` or CLAUDE.md by hand for a graduation.
   - **Keep** if the lesson is younger than the graduation age — it hasn't proven itself yet
   - **Keep** if the lesson has `scope: project` — project-scoped lessons are never graduated to CLAUDE.md. They stay in `lessons.md` until the cycle close archives them, even when a test or linter rule appears to enforce them: "enforced by code" is a claim one would have to measure, not assert, and a silent deletion is exactly what the `no-entry-lost` check exists to forbid.
   - **Skip** if the lesson has no `scope:` tag — treat as `scope: project` (legacy default)
4. Do not graduate more than 15 lessons in a single pass — keep the diff reviewable
5. All changes to `lessons.md`, `lessons-archive/graduated.md`, and `CLAUDE.md` will be included in the commit (Step 6 — Commit subagent)
6. **Report the cycle status (report only, never close):** run `node .claude/scripts/lesson-cycle.mjs --mode report` and forward its final status line (`cycle: … · entries: … · close due: yes/no`) in the ship summary. If it says `close due: yes`, tell the user that a cycle close is due. Closing the cycle (`--mode close`) is **not Step 4b's job**: Step 4b runs per ticket while the lesson cycle is cross-ticket, and an archive run in the middle of a `/ship` would fill this ticket's diff with unrelated moves. A human closes the cycle deliberately — see `.claude/context/lesson-cycle.md`.

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

## Step 5 — Contract gate + final verify (orchestrator)

Two parts, in this order. Both must pass before Step 5b.

### Step 5.1 — Generic verify suite

Run the project's full verify suite (typecheck → lint → tests → build) one last time. Late-stage changes from the fix cycle may have introduced regressions.

### Step 5.2 — Contract gate

Read the spec's `## Contract` section and **run every item's `verify` command**, each from its `cwd` if set and otherwise from the repo root. This is the step that makes the spec a contract rather than a description: 5.1 proves the codebase is healthy, 5.2 proves *this ticket's criteria* actually hold. A green 5.1 says nothing about either.

- Every non-null `verify` must exit 0.
- `manual` items are not run. Collect them — they are the part of this ticket no automated check covers, and Step 7a reports them to the user.
- `type: e2e` items run against the environment their `env` field names (see `0_spec` field rules). **Before running any `env: local` item, probe that the local stack is actually up** — the project's health check from CLAUDE.md, `/healthcheck`, or a reachability check on the URL the test targets. If the stack is not running, that is an **infrastructure blocker to escalate to the user** (offer the project's stack start command), never a failed criterion: an unreachable environment and a broken implementation both exit non-zero, and only the pre-check tells them apart.
- Print one line per item so the coverage is visible in the transcript:

  ```
  C1 ✓ · C2 ✓ · C3 manual (no snapshot harness for the data grid) · C4 ✗
  ```

**Skip 5.2 only when there is no contract to run** — either `fast_path = true` (no spec exists) or the spec is a legacy one with no `## Contract` section. Print the reason explicitly:

```
Contract gate skipped — no spec (fast path) / legacy spec without Contract section
```

Never let the absence of a contract read as a pass. An unprinted skip is indistinguishable from a green gate in the transcript, and that is exactly the confusion this step exists to remove.

### Routing (applies to both parts)

- All checks pass → proceed to Step 5b
- Any check fails → launch a fix subagent to resolve, then re-run **both** parts (a contract fix can regress the generic suite and vice versa). If it fails after two attempts, stop and escalate to the user — do not commit broken code. Include in the escalation: "To roll back, run `git checkout <working-branch> && git reset --hard checkpoint/<spec-name>`." (use the actual branch name from Step 0/1).

**A failing `verify` is never fixed by editing the contract.** Not by relaxing the criterion, widening a filter, repointing the command at a broader suite, or flipping the item to `manual`. If a criterion turns out to be wrong or genuinely unachievable, that is a scope change: escalate to the user with the failing item and let them decide. Silently relaxing the gate produces exactly the situation this step was built to end — a "pass" that nobody can trace to evidence.

Note: Smoke testing against Docker (`/smoke <spec-name>`) is a separate manual step the user can run before or after `/ship`. It is not part of the automated pipeline because Docker infrastructure issues should not block the ship flow.

---

## Step 5b — Changelog entry (orchestrator)

Write the per-ticket changelog so the commit subagent picks it up as part of the feature commit. One file per branch keeps changelog updates merge-conflict-free on `<main>` (vs. a single shared `CHANGELOG.md`).

**Follow `.claude/skills/changelog/SKILL.md`.** That skill is the single definition of the file path, the template, and the `## Manual Steps` trigger heuristic. Do not restate them here — two copies of the same rule drift, and the changelog is what the tracker field and the release notes are derived from.

`/ship` supplies the inputs the standalone skill would otherwise derive from git:

- **Path:** numeric-mode → `changelog/<working-branch>.md`. PRD-mode (`prd_mode = true`) → `changelog/<spec-name>.md`, because an epic branch hosts many PRDs as separate commits over weeks and a per-branch filename would overwrite each prior PRD.
- **Ticket context** (`<ticketId>`, `<type>`, `<module>`) — from `ticket_context` (Step 0b), not from parsing the branch name.
- **Summary** — compose in 2-5 sentences from the spec goal paragraph, the implement subagent summary, and any notable review/fix outcomes (Steps 3-4).
- **Changed files** — from the implement subagent file list (Step 3) plus anything touched by the fix cycle (Step 4), not from `git diff`.
- **Manual Steps** — apply the skill trigger heuristic to that file list. When in doubt, ask the user. Mistakes here are silent until a deployment fails.
- **Derived tracker actions** — skip the skill's final step. `/ship` Step 6b owns the manual-steps flag and the mirroring comment.

Do not commit here — the commit subagent (Step 6) stages the new file along with the rest of the diff.

---

## Step 6 — Commit subagent

Launch a subagent (model: **sonnet**) with:

> "Read `.claude/skills/commit/SKILL.md` and follow all steps exactly **except Step 5 (backlog ✅ check) — skip it entirely**. `/ship` Step 7b owns backlog/PRD/spec file updates (frontmatter `status: completed`, archive move); the commit subagent must NOT modify any file under `.claude/input/`, `.claude/specs/`, or `.claude/reviews/`. Split into atomic commits if multiple concerns are present. You are running as a subagent. Return the commit hash(es) and message(s)."

---

## Step 6b — Tracker feedback (orchestrator)

**Skip this step if no ticket was resolved in Step 0b** (i.e. `ticket_context` is empty). Tool availability is decided per part, not for the whole step: 6b.1 and 6b.2 need a work-item field-update tool, 6b.3 needs a comment tool. A missing comment tool must not suppress the field syncs — the fields are what the team board filters on.

**Skip this step entirely if `prd_mode = true`** — PRD-mode performs no tracker mutations on principle (see Step 0b). Manual-steps content still ends up in the changelog `## Manual Steps` section (Step 5b); the tracker field/comment mirroring is just suppressed. Proceed to Step 7a.

This step has three parts:
- **6b.1 — sync the "manual steps required" flag** from the changelog (single source of truth), if the project's tracker has such a field.
- **6b.2 — assess UAT** and set the corresponding field, if the project defines a UAT policy and a field for it.
- **6b.3 — optionally: post one comment** with non-derivable context (manual steps, UAT walkthrough, how-to-run, caveats).

Both fields are set **before** the comment, because 6b.3's triggers read them. Deciding UAT after the comment means the UAT trigger can never fire on a first run: the field is still at its default when the trigger is evaluated, so the walkthrough silently never gets written.

### Step 6b.1 — Sync the manual-steps flag

Applies only if `branch-management.md` names a boolean "manual steps required" field on the work item and the field-update tool supports it. Otherwise skip to 6b.2.

Read `changelog/<working-branch>.md` — specifically the `## Manual Steps` section. The section text after the heading determines the field value:

- Section text is exactly `_None._` (after trimming) → set the field to `false`
- Section text is anything else (one or more bullet lines describing real work) → set the field to `true`

The call is idempotent — `/ship` can re-run, and the field will track whatever the current changelog says. The changelog is the source of truth; the tracker field is a derived flag for filtering/dashboards. **Never set the field without a corresponding section in the changelog**, or the two will drift.

### Step 6b.2 — UAT assessment

Applies only if the project defines a UAT policy (typically in `.claude/rules/branch-management.md` or a context doc it points to) **and** a tracker field for the decision. If no policy exists, skip and record `uat_scope = "none"`.

Read the policy fresh per ship — do not rely on cached memory of the rules, they change. Typical shape of such a policy: a **scope filter** (tickets that never need UAT — CI/pipeline work, docs-only, framework/`.claude/` work), a **default** (usually "UAT required when in doubt"), and **criteria** on both sides (security/permission changes, UI reworks, workflow or data-model changes, API-contract changes → required; pure cosmetics, behaviour-neutral refactors, small localized fixes → not required).

**Scope check first:** if the ticket falls under the policy's out-of-scope list, **leave the field untouched** and record `uat_scope = "out"` — 6b.3's UAT trigger then does not apply either. Proceed to 6b.3.

**Action (only for in-scope tickets):** set the field via the field-update tool, and note the one-to-two-sentence rationale (which criteria from the policy applied) — 6b.3 posts it together with the walkthrough rather than as a separate comment.

### Step 6b.3 — Comment with non-derivable context

**Default: do not post a comment.** Branch, commits, and PR are auto-linked to the work item via the `#<ticketId>` suffix in the commit message (see `branch-management.md`) and via the PR. A comment that just repeats `Branch: X / Commits: Y / Spec: Z` is noise — it buries the discussion tab under boilerplate and adds no information a reviewer cannot get from the development tab.

**Only post a comment if there is non-obvious context a QA / UAT reviewer cannot derive from code, commits, or the spec file.** Build a bullet list from the following triggers and post *only if the list is non-empty*:

- **Manual deployment steps** — if the changelog's `## Manual Steps` section is ≠ `_None._`, this trigger always applies. Post the verbatim section content (without the `## Manual Steps` heading). This mirrors the flag set in 6b.1, so anyone filtering on it immediately sees the steps in the discussion tab without opening the repo.
- **UAT assessment + test instructions** — if Step 6b.2 set the UAT field to `true`, this trigger **always** applies. Lead with the rationale noted in 6b.2 (`**UAT assessment:** required` plus the criteria that applied), then compose a test walkthrough: what the tester should click and verify, plus edge cases the change might break. UAT testers reflexively look at the **comment tab** for test instructions — instructions placed only in the description get missed in practice. The comment is the operative test sheet; the description is for the original requirement. **Weight the walkthrough toward the `manual` contract items from Step 5.2** — they are, by construction, the criteria no automated check proved, so they are exactly what a human tester adds. If 6b.2 recorded `uat_scope = "out"` / `"none"`, or the field is `false`, this trigger does not apply.
- **How to run new tests** — the spec's `New files` include a new test project / e2e suite / fixture setup. Post a short "how to run" (command + prerequisites).
- **Scope deviation** — a `(high)` decision from Step 2b changed scope vs. the acceptance criteria, or an implementation blocker forced a narrower/wider scope than the ticket describes.
- **Known caveats** — behaviour the reviewer needs to know and would otherwise miss: "only active with flag X", "depends on ticket #1234 being deployed first", "temporary workaround — see TODO #5678".
- **Open clarifying question** — something the implementation could not resolve and needs input before QA/UAT.

**Do not post:**
- Branch name, commit hashes, spec file path (all auto-linked or irrelevant to QA).
- "Implementation complete" / "ready for review" (the state transition in Step 7b signals this).
- Summaries of what was built (the spec + PR description cover this).

**Format when posting** — one short section per applicable trigger, no greeting/signature:

```
**Manual deployment steps**
- **Database:** Run `database/manual/1234_MagicPin_CreateTable.sql` against each environment DB.
- **Gateway config:** Add route `/magicpin/{everything}` → `core-api`.
- **Cache:** Flush the cache after deploy — new key `MagicPin.Enabled`.

**UAT assessment: required**
New user-visible surface plus a new per-tenant configuration option — matches "UI reworks / new views" and "configuration changes" in the UAT policy.

**UAT test instructions**
1. PIN button visible on the login page.
2. Click → username popup → "Request PIN" → neutral success message.
3. Auth screen: username pre-filled, enter PIN only → login succeeds.
Edge cases: PIN valid once only (second attempt must fail); "Resend PIN" works; wrong PIN runs into the normal lockout logic; 2FA still applies after a PIN login.

**How to run the new e2e tests**
cd e2e && npm run test:smoke
Requires the local stack (`npm run dev`).

**QA caveat**
Feature is behind config flag `Portal.NewOnboarding` — must be enabled before testing.
```

If nothing worth posting exists, skip silently — do not post a placeholder.

Do NOT update the work item state here — that happens in Step 7b after push.

---

## Step 6d — Upload changelog attachment (orchestrator)

**Skip this step if no ticket was resolved in Step 0b, if `prd_mode = true`, or if the tracker MCP exposes no attachment-upload tool** (the framework's Azure DevOps server provides `ado_upload_attachment`).

The changelog is the canonical artefact a deployer or QA reviewer needs after the ticket leaves development — it bundles summary, manual steps, and changed files in one place. Attaching it to the work item makes it accessible without git access and survives squash-merge + branch delete.

1. **Resolve the final commit SHA** from Step 6:

   ```bash
   git rev-parse --short HEAD
   ```

2. **Compose the attachment file name** — embed the SHA so re-running `/ship` on the same branch produces a new, identifiable snapshot rather than overwriting silently:

   ```
   changelog-<shortSha>.md
   ```

3. **Upload** `changelog/<working-branch>.md` under that name with the comment `Changelog snapshot at commit <shortSha>` (for Azure DevOps: `ado_upload_attachment({ workItemId, filePath, fileName, comment })`).

4. **Failure handling:** if the upload fails (network, API error), surface the error to the user but continue to Step 7a — the changelog is still in the repo and on the branch, so the loss is recoverable. Do not block the pipeline on attachment upload.

5. **Re-ship behaviour:** old attachments stay in place — they document each ship cycle's state. If the duplicate noise becomes a problem in practice, add a cleanup heuristic later (e.g. delete previous `changelog-*.md` attachments before upload). Not worth optimising prematurely.

---

## Step 7a — Finalize gate (orchestrator)

**Skip this step entirely if `--no-finalize` is set** — proceed directly to Final report without pushing or transitioning state.

**Skip the gate and go straight to Step 7b if `--auto-finalize` is set** — no user prompt, push + state change happen immediately.

Otherwise: the state transition hands the ticket off to QA/review and is visible on the team board — it is the kind of action that deserves an explicit "yes" before it happens. Print a summary and wait for user confirmation.

**Summary to print:**

```
## Ready to ship?

Branch:    <working-branch> (local only — not pushed yet)
Commits:   <count> (see `git log <main>..HEAD --oneline`)
Changelog: changelog/<working-branch>.md
Ticket:    #<ticketId> — currently "<current-state>" → will move to "<target-state>"
Contract:  <N> items — <X> verified, <Y> manual

### Contract coverage

C1 ✓ verified · C2 ✓ verified · C3 manual — no snapshot harness for the data grid

⚠ 2 of 3 criteria (67%) are `manual` — above the `contract_manual_max_pct`
  threshold from CLAUDE.md (default: 40). The automated gate covers only a third
  of this ticket. Weight the smoke-test below toward the manual items.

### Verify locally before confirming

The pipeline already ran typecheck / lint / tests / build plus every automated
contract criterion (Step 5), but manual smoke-tests catch what automated checks
miss — and the `manual` contract items above are uncovered by construction.
Recommended based on what this feature touches (<list of touched areas from
Step 3 summary — e.g. "scoring engine + results UI">):

- <project-specific command 1 for the touched areas>
- <project-specific command 2>
- Review the diff once in the IDE for anything obvious the review subagent
  may have glossed over.

### Confirm

- `y` — push to origin + transition ticket to "<target-state>"
- `n` — pause here. Branch stays local, ticket stays "<current-state>".
  You can resume later with `git push` + a manual state change (or re-run
  `/ship` after adding follow-up commits).
- `q` — abort (same as `n` — nothing destructive).
```

**Rendering the Contract coverage section:** take the per-item results from Step 5.2. Print one line listing every item with its status, putting the `manual` reason inline so the user sees *what* is uncovered rather than just how much. Print the `⚠` block **only** when the share of `manual` items exceeds `contract_manual_max_pct` from CLAUDE.md (default: 40) — below the threshold the coverage line alone is enough and an unconditional warning would train the user to skip it. If Step 5.2 was skipped, replace the whole section with the skip reason (`no spec (fast path)` / `legacy spec without Contract section`) so the gap stays visible at the one point where the user is deciding whether to ship.

**Deriving the recommended test commands:** Read `CLAUDE.md` for the project's build / verify commands and pick the ones that cover the areas touched in Step 3's file list. Do not invent commands — only suggest commands documented in CLAUDE.md. **Lead with the `manual` contract items** — they are, by construction, the only criteria no automated check proved, so they have the strongest claim on the user's manual attention. Typical shape:

- Frontend change → start the dev server and exercise the feature in the browser; run the production build as a compile check
- Backend / API change → run the relevant test filter, then hit the changed endpoint once
- New test suite introduced by this spec → the commands to run it (take from the spec's "How to run" section if present)

**Wait for input.** Route on the answer:

- **`y`** → proceed to Step 7b.
- **`n`** or **`q`** → skip Step 7b entirely and go to Final report. Branch stays local with the feature commit; ticket stays in its current state. Note in the Final report: "Branch not pushed, ticket state unchanged. Resume with `git push` + a manual state change when ready."

---

## Step 7b — Push + finalize (orchestrator)

Push the branch to origin:

```bash
git push -u origin <working-branch>
```

If push fails, report the error to the user — do not force-push.

**Pull request:** follow the project's merge convention from `branch-management.md`. If the hosting platform creates the PR automatically on push (as some Azure DevOps setups do), nothing more to do. Otherwise open one with the platform CLI (`gh pr create`, …) and target `<main>`. Never merge to `<main>` manually — all merges go through reviewed PRs.

### Post-push cleanup

1. **Mark spec as completed**: prepend `status: completed` to the spec's YAML frontmatter (or add a `## Status: completed` line at the top if the spec has no frontmatter). This makes it easy to distinguish shipped specs from in-progress ones.
2. **Clean up phase manifest**: if `.claude/specs/<name>-phases.md` exists, mark all phases as `done` (they should already be, but this is a consistency safeguard).
3. **Tracker state update:** **Skip in `prd_mode` — PRD-mode never mutates tracker state. The epic stays open; child PRDs track their own `status:` in their frontmatter.** Otherwise: if a ticket was resolved in Step 0b and a state-update tool is available, transition the ticket to the project's "development complete" state (common names: `Resolved`, `Done`, `Development finished` — use whatever the project's workflow defines in `branch-management.md`). This hands the ticket off to QA/review — do NOT set `Closed`, which is typically reserved for QA/UAT sign-off or the merge. If the transition fails, retry once with the project's documented fallback state, then surface the error to the user.
4. **Parent epic auto-close:** **Skip in `prd_mode`.** If the shipped ticket has a `parent` relation in `ticket_context` and that parent is an epic-type item, check whether all sibling children are now in a terminal state. If yes, transition the parent to its done state. If any sibling is still open, skip — do not partially close. If the parent lookup fails, skip silently.
5. **UAT:** nothing to do here — the UAT field and its rationale were handled in **Step 6b.2/6b.3**, before the comment that has to read the field. Do not set the field or post a UAT comment again from this step.
6. **Delete checkpoint branch**: `git branch -d checkpoint/<spec-name>` (if it exists).
7. **PRD-mode: mark PRD completed and archive.** If `prd_mode = true`:
   1. Edit the PRD file's frontmatter — set `status: completed` and `completed_at: <YYYY-MM-DD>` (and `completed_commit: <sha>` if convenient).
   2. **Move the PRD file to a sibling `archive/` directory** so the active list at the input dir's top level visually shrinks. If `<prd_dir>/archive/` does not exist, create it first. Use `git mv` if the file is tracked, plain `mv` otherwise. Example: `mv .claude/input/portal/04-backend-crud.md .claude/input/portal/archive/`.
   3. Stage both changes (frontmatter edit + rename) and amend into the latest commit: `git add -A <prd_dir> && git commit --amend --no-edit`. This keeps the per-ticket changelog and the PRD file co-located in the same commit so future archaeology is easy.

   The depends_on lookups in subsequent `/ship` runs still resolve correctly: Step 0b's glob pattern is `.claude/input/**/*<arg>*.md` which descends into `archive/`. **Re-shipping safeguard:** if Step 0b finds a PRD with `status: completed`, warn the user and abort unless they confirm a re-ship is intended (treat as if the work item were already in its done state).

---

## Final report (orchestrator)

Print a summary assembled from subagent return values. Adapt the wording to the actual outcome — shipped (pushed + state changed), paused (gate declined), or skipped (`--no-finalize`):

- Branch: `<working-branch>` → pushed / local only (reason)
- Spec: `.claude/specs/<name>.md`
- Files changed: [from Step 3]
- Review cycles: N
- Final status: pass
- Contract: `<N> items — <X> verified, <Y> manual` (or the skip reason)
- Lesson cycle: [status line from Step 4b]
- Commits: [hash + message from Step 6]
- Pushed: yes / no (with reason if no — user declined at gate / `--no-finalize` / push failed)
- PR: created automatically by the platform / opened via CLI / not yet (branch not pushed)
- Ticket state: `<done-state>` / still `<current-state>` (reason)
- UAT required: yes / no / n/a (with rationale)
- Resume command (if paused): `git push` + manual state change
