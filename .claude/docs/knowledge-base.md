# Knowledge Base

Auto-updated by `/5_learn` → `/6_doc` when new references are processed.
Last updated: 2026-03-02.

This file summarises what has been learned from collected references. Full distilled content lives in `.claude/context/`.

---

## Context files

| File | Topic | Last updated |
|---|---|---|
| [`claude-code-workflow.md`](../context/claude-code-workflow.md) | Claude Code workflow best practices | 2026-03-02 |
| [`saas-architecture-patterns.md`](../context/saas-architecture-patterns.md) | SaaS architecture patterns | 2026-03-02 (seeded) |

---

## Processed references

### 2026-03-02

**`references/blogs/claude-code-best-practices-2026.md`**
Source: Web research — code.claude.com/docs, f22labs, boristane, infoq

Key insights extracted:
- Context window is the primary constraint — all practices serve it
- Explore → Plan → Implement → Commit is the proven 4-phase workflow
- `/2_review` must always run in a fresh session to avoid bias
- Verification order: typecheck → lint → tests → build (never skip typecheck)
- Subagents protect main context during investigation and review
- CLAUDE.md must stay short — bloated files cause rules to be ignored
- Parallel sessions with git worktrees for concurrent workstreams

---

**`references/blogs/automem.md`**
Source: Reza Rezvani / Medium — "The New Claude Code's Auto-Memory Feature"

Key insights extracted:
- Memory hierarchy: Organization policy → CLAUDE.md (git) → ~/.claude/CLAUDE.md → MEMORY.md (200 lines)
- MEMORY.md captures "what" (commands, paths, patterns) automatically; CLAUDE.md captures "why" (written by humans)
- MEMORY.md is local-only at `~/.claude/projects/<project>/memory/` — never committed
- Modular rules: `.claude/rules/` with YAML `paths:` frontmatter scopes instructions to file patterns; reduces hallucinations
- Team pattern: weekly MEMORY.md review → promote recurring patterns to shared CLAUDE.md
- `CLAUDE.local.md` = personal preferences, auto-gitignored
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` to prevent CI noise polluting local sessions
- Git worktrees get separate memory directories

---

**`references/blogs/spec-driven-dev.pdf`**
Source: Heeki Park / Medium — "Using spec-driven development with Claude Code"

Key insights extracted:
- Three levels: spec-first (write spec then code), spec-anchored (keep spec alive through evolution), spec-as-source (human edits spec only, AI regenerates code)
- spec-anchored is the practical target: update the spec whenever you course-correct
- Upfront planning reduces wholesale rewrites; most follow-up interactions become small tweaks
- Standard spec-creation prompt: ask Claude to start with a spec, use selectable clarifying questions
- Context window usage breakdown: messages ~62%, tools ~8%, free space ~11%, autocompact buffer ~16%

---

**`references/blogs/hook-driven.pdf`**
Source: Nick Tune / Medium — "Hook-driven dev workflows with Claude Code"

Key insights extracted:
- Hooks can enforce a full state-machine workflow: planning → developing → reviewing → committing
- Write the workflow engine in real code with 100% test coverage; hooks are just the bridge to Claude
- Particularly valuable for legacy or unfamiliar codebases where you can't own git hooks
- Architecture: Claude Code Hooks → Workflow Engine ↔ state persistence; Coding Agents → Workflow Engine

---

**`references/blogs/best-prac1.pdf`**
Source: Reza Rezvani / Medium — "It Took Me 7 Months to Stop Fighting Claude Code"

Key insights extracted:
- CLAUDE.md pruning rule: for each line, ask "would removing this cause Claude to make mistakes?" If not, cut it
- Task decomposition threshold: if a task takes a senior engineer more than one focused session, decompose it
- Accuracy drops noticeably beyond ~15 file modifications in a single context
- Verification loop: include test requirements in every task so Claude self-verifies (eliminates ~80% of debugging)
- "Interview me" pattern for complex features before writing the spec
- After 2 failed corrections → `/clear` + rewrite prompt; context is poisoned, pushing through makes it worse
- Auto-execute read-only commands; manual approval for state-changing operations (git commit, rm, writes)

---

## Pending references

_None — drop files into `.claude/references/` and run `/5_learn`_

---

## Suggested references to collect

For SaaS platform development:
- T3 Stack / create-t3-app architecture patterns
- Next.js + Supabase SaaS starter patterns
- Auth patterns: Clerk, Auth.js, NextAuth
- Multi-tenancy: subdomain routing, row-level security
- Billing: Stripe integration patterns, webhook handling
- Background jobs: Inngest, Trigger.dev, QStash
- Email: Resend, Loops
- Rate limiting and abuse prevention
- Observability: error tracking, structured logging, analytics
