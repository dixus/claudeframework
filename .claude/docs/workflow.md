# Workflow Guide

Generated and maintained by `/6_doc`. Last updated: 2026-03-02 (updated 2026-03-02, added permission hook + /debug).

---

## The fundamental constraint

Claude's context window fills fast and performance degrades as it fills. A single debugging session or codebase exploration can consume tens of thousands of tokens. **Every practice in this workflow exists to manage that constraint.**

---

## The pipeline

```
Requirements
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
    ▼
/4_test ──────────────── runs: typecheck → lint → tests → build
                         writes: nothing (report only)
```

---

## Why each step exists

### `/0_spec` before coding
Jumping straight to implementation solves the wrong problem or solves the right problem in a fragile order. The spec forces you to think about what to build before touching code.

### Plan mode in `/1_implement`
Claude proposes a step-by-step plan and waits for approval before writing any code. This is your last chance to redirect before files change.

### Git stash checkpoint in `/1_implement`
A clean rollback point before implementation starts. If something goes badly wrong mid-session, `git stash pop` returns you to the pre-implementation state.

### Fresh session for `/2_review`
Claude is unconsciously biased toward code it just wrote — it tends to justify its own decisions rather than challenge them. Running review in a fresh session removes this bias. Always `/clear` before running `/2_review`.

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

### Permission hook (`.claude/hooks/auto-approve.js`)
The `PermissionRequest` hook intercepts every permission prompt before it reaches the UI. It auto-approves safe tools (Read, Write, Edit, Glob, Grep, Bash) and fast-denies known destructive patterns (`rm -rf /`, force-push to main). This removes approval fatigue without disabling safety. Registered in `.claude/settings.json` under `hooks.PermissionRequest`.

---

## Session patterns

### Starting a new feature
```
/clear
/0_spec <feature name>
# read the spec
/1_implement <spec name>
```

### Reviewing after implementation
```
/clear          ← fresh session = unbiased review
/2_review <spec name>
```

### Resuming a paused session
```
claude --continue    # most recent session
claude --resume      # pick from list
```

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
Agent Teams        → 3+ distinct workstreams that benefit from peer-to-peer coordination
```

**Agent Teams** (experimental, enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) add a shared task board and direct peer-to-peer messaging between teammate instances. Use when: parallel exploration, cross-domain review (security + perf + tests affecting each other), or research tasks needing multiple perspectives synthesised before building. **Avoid** for same-file edits, simple tasks, or debugging — coordination overhead dominates. Sweet spot: 3–4 teammates.

### Quality pass after implementation

After `/1_implement` passes its verification suite, optionally run `/simplify` for an automated parallel quality review (dead code, code smells, CLAUDE.md violations) before handing off to `/2_review`. This catches stylistic issues that tests and typecheck miss.

For large-scale migrations across many files, use `/batch` instead of hand-editing: it enters plan mode, creates per-file work units, and runs each agent in an isolated git worktree with verification built in.

---

## Context hygiene rules

| Signal | Action |
|---|---|
| Starting a new unrelated task | `/clear` |
| About to run `/2_review` | `/clear` first |
| Claude making same mistake repeatedly | `/clear` + better prompt |
| Exploring a large area of the codebase | Use a subagent (`"investigate X using a subagent"`) |
| Context getting long mid-task | `/compact Focus on <topic>` |

---

## CLAUDE.md maintenance

The `CLAUDE.md` file is loaded every session. Keep it short — bloated files cause Claude to ignore the important rules.

- **Target**: under 80 lines
- **Include**: commands Claude can't guess, non-default conventions, architectural constraints, gotchas
- **Exclude**: things Claude infers from reading code, standard language conventions
- **Emphasis**: add `IMPORTANT:` to rules that must never be broken
- **Review trigger**: if Claude repeatedly makes the same mistake, the rule is missing or buried
- **Pruning rule**: for each line, ask *"Would removing this cause Claude to make mistakes?"* If not, cut it. Prune monthly.
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

Before starting a task, ask: *"Could a senior engineer complete this in one focused session?"* If not, decompose it.

- Accuracy drops noticeably beyond **~15 file modifications** in a single context
- One task → one session → verify independently → move on
- Include test requirements in every task so Claude self-verifies; this eliminates roughly 80% of debugging sessions

## Spec-driven levels

The project targets **spec-anchored** development:

| Level | Description | When to use |
|---|---|---|
| spec-first | Write spec, implement from it; spec may drift | Small one-off features |
| **spec-anchored** | Keep spec alive; update it when course-correcting | **Default for this project** |
| spec-as-source | Human edits spec only; AI regenerates code | Experimental / future |

At each course-correction, update the spec in `.claude/specs/` before continuing. This keeps original intent visible and prevents drift across sessions.

---

## Knowledge base loop

```
Find a useful blog post or repo
    │
    ▼
Paste content into .claude/references/blogs/ or repos/
    │
    ▼
/5_learn  ←── extracts insights → updates context/ → runs /6_doc
    │
    ▼
All future sessions automatically benefit
```

The context files in `.claude/context/` are read by `/0_spec` and `/1_implement` automatically, so accumulated knowledge influences every spec and implementation without any manual prompting.
