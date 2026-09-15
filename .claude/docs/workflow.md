# Workflow Guide

Generated and maintained by `/doc`. Last updated: 2026-09-15.

---

## The fundamental constraint

Claude's context window fills fast and performance degrades as it fills. A single debugging session or codebase exploration can consume tens of thousands of tokens. **Every practice in this workflow exists to manage that constraint.**

---

## The pipeline

There are two ways to run the pipeline: **manual** (step-by-step control) and **automated** (`/ship` — hands-off).

### Manual mode

Run each skill yourself with `/clear` between phases for clean context:

```
Requirements → .claude/input/
    │
    ▼
/0_spec ──────────────── reads: input/, context/, codebase
    │                    writes: specs/<name>.md
    │
    ▼ (you review the spec)
    │
/1_implement ─────────── reads: specs/<name>.md, context/, affected files
    │                    runs: typecheck → lint → tests → build
    │                    writes: source files
    │
    ▼ (/clear — fresh session)
    │
/2_review ────────────── reads: git diff, specs/<name>.md, changed files
    │                    writes: reviews/<name>-review.md
    │
    ▼
/3_fix ───────────────── reads: reviews/<name>-review.md
    │                    runs: typecheck → lint → tests → build
    │                    writes: source fixes
    │
    ▼ (repeat /2_review → /3_fix until pass)
    │
/commit ─────────────── stages, splits, commits
```

Use manual mode when you want to inspect and steer between steps — e.g., reviewing the spec before implementing, or adjusting fix strategy between review cycles.

### Automated mode — `/ship`

`/ship` orchestrates the entire pipeline end-to-end. There are exactly two user interruptions: one question batch upfront, and the finalize gate before anything is pushed or the ticket changes state.

```
/ship <ticket-id | prd | feature>
    |
    +-- Step 0:  branch setup              ticket branch from origin/<main>
    +-- Step 0b: ticket resolution         loads work item from the tracker (if configured)
    +-- Step 0c: complexity classifier     picks fast path vs. full pipeline
    |
    |   [fast path]
    +-- Subagent F: implement    [fable]   implements directly from the ticket
    |
    |   [full pipeline]
    +-- Step 1:  clarifying questions      single batch, only interruption
    +-- Subagent A: spec          [opus]   writes specs/<name>.md incl. ## Contract
    +-- Step 2b: decision review           confirms (high)-risk decisions
    +-- Subagent B: implement     [fable]  writes source + tests, runs contract gate
    +-- Subagent C: review        [opus]   writes reviews/<name>-review.md
    +-- Subagent D: fix           [varies] loops review/fix (max 3 cycles)
    +-- Step 4b: lesson graduation         moves mature lessons -> archive + CLAUDE.md rule
    +-- Step 4c: integration check [opus]  cross-phase glue review (phased only)
    |
    |   [both paths rejoin]
    +-- Step 5:  contract gate             verify suite + every Contract verify cmd
    +-- Step 5b: changelog entry           changelog/<branch>.md incl. Manual Steps
    +-- Subagent E: commit        [sonnet] atomic commits on feature branch
    +-- Step 6b: tracker feedback          syncs derived fields, then at most one comment
    +-- Step 7a: finalize gate             summary + contract coverage, waits for yes
    +-- Step 7b: push + finalize           pushes branch, transitions ticket state
```

Each subagent gets a **clean context window** — the spec file, review file, and git diff are the handoff mechanism. The orchestrator never reads code files directly.

Use `/ship` when requirements are clear and you want to go from a ticket to a pushed, PR-ready branch with minimal intervention. `/ship` never merges to the main branch itself — merges go through reviewed PRs.

### Standalone utilities

These are not pipeline steps — use them anytime:

| Skill       | Purpose                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `/test`     | Run the full verify suite and report results (no fixes)                |
| `/simplify` | Quality review — reuse, simplification, efficiency, dead code          |
| `/debug`    | Investigate a specific error or failing test                           |
| `/impact`   | Blast radius of a change — call sites, test mocks, consumers           |
| `/smoke`    | Write and run smoke tests against the Docker stack from a spec         |
| `/changelog`| Write the per-ticket changelog when not running `/ship`                |

---

## Why each step exists

### `/0_spec` before coding

Jumping straight to implementation solves the wrong problem or solves the right problem in a fragile order. The spec forces you to think about what to build before touching code.

### Plan mode in `/1_implement`

Claude proposes a step-by-step plan and waits for approval before writing any code. This is your last chance to redirect before files change.

### Named checkpoint branch in `/1_implement`

Before implementation starts, a `checkpoint/<spec-name>` branch is created at the current commit. This is a named rollback point that survives crashes and avoids stash collisions. If something goes badly wrong mid-session, `git checkout checkpoint/<spec-name>` returns you to the pre-implementation state.

### Fresh session for `/2_review`

Claude is unconsciously biased toward code it just wrote — it tends to justify its own decisions rather than challenge them. Running review in a fresh session removes this bias. Always `/clear` before running `/2_review`. In `/ship`, this happens automatically — each subagent starts with a clean context.

### TDD loop inside `/1_implement`

For each unit of code: write the test case from the spec first → run it to confirm it **fails** (red) → implement → run again to confirm it **passes** (green). Claude sees its own failure output and self-corrects within the same session. Eliminates ~80% of debugging sessions compared to writing code first.

### Verification order: typecheck → lint → tests → build

Each catches different classes of errors:

- **Typecheck**: type errors in non-JSX files that tests won't catch
- **Lint**: style violations, unused imports, code quality rules
- **Tests**: logic errors, regression protection
- **Build**: type errors in JSX/templates, missing exports, env var issues

Skipping typecheck is the most common gap — tests pass, build fails on Vercel.

### Re-review reminder after `/3_fix`

A fix can introduce a new bug, especially when multiple issues are fixed in sequence. `/3_fix` reminds you to run `/2_review` again after fixing.

### Contract gate in `/ship`

Step 5 has two parts. First the full verify suite runs one last time before committing — late-stage changes from the fix cycle can introduce regressions the review/fix loop did not catch, and this prevents broken code from being committed. Then the **contract gate** runs every `verify` command from the spec's `## Contract` and gates on each exit code.

The distinction matters: a green verify suite proves the codebase is healthy, and says nothing whatsoever about whether *this ticket's* acceptance criteria hold. Before the contract existed, that second question was answered by a model reading prose criteria and forming an opinion — so a "pass" could not be traced to evidence. Binding each criterion to a command that exits 0 only when the criterion holds is what turns the spec from a description into a gate.

Two rules keep the gate honest:

- **A failing `verify` is never fixed by editing the contract.** Widening a filter, repointing a command at a broader suite, relaxing the criterion, or flipping the item to `manual` are all spec changes disguised as fixes. An unachievable criterion is a scope question for the user, not something the pipeline may quietly resolve.
- **A skipped gate is always printed with its reason.** The gate is skipped when there is nothing to run — the fast path (no spec) or a legacy spec without a `## Contract`. An unprinted skip is indistinguishable from a green gate, which is exactly the ambiguity this step exists to remove.

Criteria that genuinely cannot be automated are declared `manual` with a reason naming the missing harness. They are not run, and Step 7a reports them at the finalize gate as the part of the ticket no automated check covers — so uncovered scope is visible at the moment the user decides whether to ship, rather than invisible.

### Fast path in `/ship`

Not every ticket deserves a spec, a review and a fix loop. Step 0c scores the resolved ticket on four signals (narrow scope, no new behaviour, no decisions to make, no restricted areas). Three or more → the **fast path**: a single implement subagent works directly from the ticket text and rejoins the pipeline at Step 5. `--fast` and `--full` override the classifier. Without a resolved ticket the classifier never picks the fast path — it needs ticket data to score reliably.

### Lesson cycle and error classes

`lessons.md` holds only the **open cycle** (one calendar month, recorded in the file's first line). Every entry carries a `class:` from the closed taxonomy in `lesson-cycle.md` — the error *mechanism* behind the defect, which is what a rule or skill change should target. `node .claude/scripts/lesson-cycle.mjs --mode report` counts lessons per class and says whether a cycle close is due; `--mode close` archives the cycle losslessly into `lessons-archive/`; graduation (`/ship` Step 4b) moves the entry to `lessons-archive/graduated.md` and appends the one-line rule to CLAUDE.md. Nothing is ever deleted — the tests in `.claude/scripts/tests/` treat a vanished entry as a loss.

### Model routing in `/ship`

Not every pipeline step needs the most powerful model. `/ship` routes each subagent to the appropriate model:

| Step                    | Model      | Why                                                                     |
| ----------------------- | ---------- | ----------------------------------------------------------------------- |
| Spec, Implement, Review | **opus**   | Deep reasoning — architecture, requirements analysis, multi-lens review |
| Fix (pass with fixes)   | **sonnet** | Execution-heavy — targeted fixes guided by explicit instructions        |
| Fix (needs rework)      | **opus**   | Critical issues need deeper reasoning                                   |
| Commit                  | **sonnet** | Mechanical — staging and message composition                            |

This saves ~40% of token cost on a typical `/ship` run without quality risk. The thinking-heavy steps stay on opus; the mechanical steps use sonnet.

### Circuit breakers

The pipeline has hard limits to prevent infinite loops:

- **Review/fix loop**: max 3 cycles. If the same issues keep recurring, escalate to the user — the problem is in the spec or architecture, not the fix.
- **Smoke test fix loop**: max 3 attempts. On failure, restores the original smoke test file and escalates.
- **Verify failures**: max 2 fix attempts per gate. Stops and reports blockers rather than looping.
- **Recurring issue detection**: `/3_fix` tracks issues across review cycles. If the same issue appears in 2+ cycles, it escalates rather than attempting another fix.

### Permission hook (`.claude/hooks/auto-approve.js`)

The `PermissionRequest` hook intercepts every permission prompt before it reaches the UI. It auto-approves safe tools (Read, Write, Edit, Glob, Grep, Bash) and fast-denies known destructive patterns (`rm -rf /`, force-push to main). This removes approval fatigue without disabling safety. Registered in `.claude/settings.json` under `hooks.PermissionRequest`.

---

## Lifecycle hooks

Five hooks are registered in `.claude/settings.json` across four events, and run automatically on every relevant event. They enforce quality deterministically — no reliance on Claude following advisory instructions.

All hooks follow the same technical contract: read JSON from `stdin`, write JSON to `stdout`. They run in parallel and are designed to be independent (no shared state, no execution order assumptions). Scripts live in `.claude/hooks/`.

### `auto-approve.js` (PermissionRequest)

**Event**: `PermissionRequest` | **Matcher**: `*` (all tools)

A 3-tier permission system that replaces manual approval prompts without sacrificing safety:

- **Tier 1 — Auto-approve**: Read, Write, Edit, MultiEdit, Glob, Grep, WebFetch, WebSearch, TodoWrite, Task, NotebookEdit, and all non-destructive Bash commands. Response: `{ continue: true, suppressOutput: true }`.
- **Tier 2 — Auto-deny**: Known destructive Bash patterns — `rm -rf /`, `git push --force origin main`, `mkfs`, fork bombs, raw disk writes. Response: `{ continue: false, additionalContext: "..." }`.
- **Tier 3 — Pass through**: Anything not matched by Tier 1 or 2 falls through to the normal Claude Code permission prompt.

### `protect-secrets.js` (PreToolUse)

**Event**: `PreToolUse` | **Matcher**: `Edit|Write`

Blocks writes to files matching secret/credential patterns before the tool call executes. Matched filenames: `.env`, `.env.*`, `credentials.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.keystore`, `id_rsa`, `id_ed25519`, `secrets.*`, `.npmrc`, `.pypirc`, `service-account*.json`.

When a match is found, the hook exits with code 2 (blocks the tool call entirely) and writes a diagnostic message to stderr. Non-sensitive files pass through silently.

### `validate-commit-msg.js` (PreToolUse)

**Event**: `PreToolUse` | **Matcher**: `Bash`

Rejects a `git commit` whose message contains no `#<ticketId>` reference, enforcing the convention in `.claude/rules/branch-management.md`. The ticket reference must not lead the message — git treats a leading `#` as a comment and would strip the line. Commits on the main branch and merge commits are exempt.

### `auto-format.js` (PostToolUse)

**Event**: `PostToolUse` | **Matcher**: `Edit|Write`

Automatically formats files after every Edit or Write operation. Detects file type from the tool input path and runs the appropriate formatter:

- **Python** (`.py`): `ruff format` + `ruff check --fix`
- **JS/TS/CSS/JSON/MD** (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`): `npx prettier --write`

Silently skips if the formatter is not installed or the file extension doesn't match. Uses `$CLAUDE_PROJECT_DIR` for absolute paths and respects per-app config directories.

### `post-compact.js` (PostCompact)

**Event**: `PostCompact` | **Matcher**: (none — fires on every compaction)

When Claude's context window is compacted mid-session, critical pipeline state can be lost. This hook re-injects the current state as `additionalContext` so Claude stays oriented. It reads (in order):

1. Current git branch and uncommitted changes
2. Most recent spec file (first 30 lines — goal and requirements)
3. Most recent review file (first 20 lines — verdict and issue summary)
4. Most recent handoff file (full content)

If no pipeline state exists, the hook produces no output. The injected context is prefixed with `--- POST-COMPACTION STATE RECOVERY ---` for visibility.

---

## Session patterns

### Ship a feature end-to-end

```
/ship <feature name>
# answer clarifying questions (if any)
# wait for pipeline to complete
# choose: merge to main / open PR / leave on branch
```

### Manual: starting a new feature

```
/clear
/0_spec <feature name>
# read the spec
/1_implement <spec name>
```

### Manual: reviewing after implementation

```
/clear          ← fresh session = unbiased review
/2_review <spec name>
```

### Resuming a paused session

```
claude --continue    # most recent session
claude --resume      # pick from list
```

### Handing off cleanly before /clear

```
/handoff             # writes .claude/handoffs/<timestamp>.md
# review the file, then:
/clear
# in the new session:
/continue            # reads latest handoff, restores context
```

Use this whenever context is getting long mid-task, or you need to switch tasks and come back later. The handoff file captures decisions that aren't visible in the code, so the next session doesn't have to rediscover them.

### When Claude is stuck or wrong

```
# Corrected 2+ times on the same issue?
/clear
# Rewrite the prompt incorporating what you learned
```

### Parallel workstreams

Run separate Claude sessions per workstream — each with its own context. Use git worktrees or separate checkouts to avoid conflicts.

### Multi-agent escalation ladder

Not every task needs multiple agents. Use the simplest setup that works:

```
Single session     → one task, one context, iterative back-and-forth
Subagents          → focused subtasks (investigation, review, test run)
/ship              → full feature pipeline, automated context management
Agent Teams        → 3+ distinct workstreams that benefit from peer-to-peer coordination
```

**Agent Teams** (experimental, enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) add a shared task board and direct peer-to-peer messaging between teammate instances. Use when: parallel exploration, cross-domain review (security + perf + tests affecting each other), or research tasks needing multiple perspectives synthesised before building. **Avoid** for same-file edits, simple tasks, or debugging — coordination overhead dominates. Sweet spot: 3-5 teammates.

**Agent Teams practical tips**: assign agents by domain directory (not feature slice) to avoid file conflicts. Use a shared numbered task queue so teammates claim tasks without duplication.

### Quality pass after implementation

After `/1_implement` passes its verification suite, optionally run `/simplify` for an automated parallel quality review (dead code, code smells, CLAUDE.md violations) before handing off to `/2_review`. This catches stylistic issues that tests and typecheck miss.

For work spanning many independent features, use `/decompose` to split it into PRDs and `/fleet` to ship them in parallel — `/fleet` runs each feature in an isolated git worktree and merges the branches sequentially after conflict-aware batching.

---

## Instincts

`.claude/rules/instincts.md` contains short, high-priority rules that apply in every session — things like "read before editing", "no speculative code", "never skip typecheck". They are loaded automatically by all skills and override default behaviour. Edit this file to add project-specific instincts that Claude keeps violating despite being told.

---

## Context hygiene rules

| Signal                                 | Action                                              |
| -------------------------------------- | --------------------------------------------------- |
| Starting a new unrelated task          | `/clear`                                            |
| About to run `/2_review`               | `/clear` first                                      |
| Claude making same mistake repeatedly  | `/clear` + better prompt                            |
| Exploring a large area of the codebase | Use a subagent (`"investigate X using a subagent"`) |
| Context getting long mid-task          | `/compact Focus on <topic>`                         |
| Quick side question                    | `/btw` — answered without entering context history  |

---

## CLAUDE.md maintenance

The `CLAUDE.md` file is loaded every session. Keep it short — bloated files cause Claude to ignore the important rules.

- **Target**: under 80 lines
- **Include**: commands Claude can't guess, non-default conventions, architectural constraints, gotchas
- **Exclude**: things Claude infers from reading code, standard language conventions
- **Emphasis**: add `IMPORTANT:` to rules that must never be broken
- **Review trigger**: if Claude repeatedly makes the same mistake, the rule is missing or buried
- **Pruning rule**: for each line, ask _"Would removing this cause Claude to make mistakes?"_ If not, cut it. Prune monthly.
- **Modular rules**: use `.claude/rules/<topic>.md` with YAML `paths:` frontmatter to scope rules to specific file patterns — keeps the root CLAUDE.md slim and reduces irrelevant context

### Memory architecture

Claude Code's memory system has four layers (loaded in this order; more specific overrides broader):

```
1. Organization policy (enterprise)
2. Project CLAUDE.md  ← git-committed, shared with all developers
3. ~/.claude/CLAUDE.md  ← your personal defaults across all projects
4. MEMORY.md (first 200 lines)  ← auto-generated by Claude, local-only
```

- **CLAUDE.md** = the "why" — decisions, conventions, constraints (you write this)
- **MEMORY.md** = the "what" — commands, paths, patterns (Claude writes this automatically)
- MEMORY.md lives at `~/.claude/projects/<project>/memory/` — never touches version control
- `CLAUDE.local.md` at project root = your personal project preferences, auto-gitignored
- Beyond 200 lines, Claude creates topic files (`debugging.md`, `patterns.md`) loaded on-demand
- **Disable in CI**: set `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` to prevent automated runs from polluting developer sessions

**Team pattern**: weekly sync — each developer runs `cat ~/.claude/projects/*/memory/MEMORY.md`, and recurring patterns get promoted to the shared CLAUDE.md.

## Task decomposition

Before starting a task, ask: _"Could a senior engineer complete this in one focused session?"_ If not, decompose it.

- Accuracy drops noticeably beyond **~15 file modifications** in a single context
- One task → one session → verify independently → move on
- Include test requirements in every task so Claude self-verifies; this eliminates roughly 80% of debugging sessions

## Spec-driven levels

The project targets **spec-anchored** development:

| Level             | Description                                       | When to use                  |
| ----------------- | ------------------------------------------------- | ---------------------------- |
| spec-first        | Write spec, implement from it; spec may drift     | Small one-off features       |
| **spec-anchored** | Keep spec alive; update it when course-correcting | **Default for this project** |
| spec-as-source    | Human edits spec only; AI regenerates code        | Experimental / future        |

At each course-correction, update the spec in `.claude/specs/` before continuing. This keeps original intent visible and prevents drift across sessions.

---

## Knowledge base loop

The framework has three knowledge-acquisition skills that chain together:

```
/scout              searches the web + GitHub for new patterns and repos
    │                   writes report → references/blogs/scout-<date>.md
    │                   queues articles → registry (queued)
    │                   queues repos → registry (queued-repo)
    ▼
/harvest <url>      clones a repo, inventories its .claude/ setup
    │                   classifies each artifact: new / enhancement / duplicate
    │                   writes proposals → reviews/learn-proposals.md
    │                   writes report → references/repos/<slug>/harvest-report.md
    ▼
/learn              processes all unprocessed references (blogs + repos)
    │                   extracts insights → updates context/
    │                   reviews affected skills → proposes improvements
    ▼
/apply-proposals    applies accepted proposals to skill/rule files
    │                   validates diffs, syntax-checks, updates statuses
    │                   auto-defers stale proposals
    ▼
All future sessions automatically benefit
```

You can also use each skill independently:

- Drop a blog post into `references/blogs/` and run `/learn`
- Run `/learn <url>` to fetch and ingest a URL directly
- Run `/harvest <repo-url>` on any repo you find interesting
- Run `/apply-proposals` to review and apply accepted proposals to skill/rule files

The context files in `.claude/context/` are read by `/0_spec` and `/1_implement` automatically, so accumulated knowledge influences every spec and implementation without any manual prompting.

### Lesson scoping

Lessons in `.claude/context/lessons.md` are tagged with `scope: framework` or `scope: project`:

- **framework** — universal rules that apply in any project (e.g., "never use `|| null` for falsy-zero checks"). These can graduate to CLAUDE.md `## Learned Rules` via `/ship` Step 4b.
- **project** — rules specific to this codebase's tech stack or architecture (e.g., "Radix Tooltip needs a Provider wrapper in jsdom"). These stay in `lessons.md` and are stripped by `/deploy` when distributing the framework.

This prevents project-specific lessons from polluting the framework when deployed to other repos.
