# Knowledge Base

Auto-updated by `/5_learn` → `/6_doc` when new references are processed.
Last updated: 2026-03-02 (batch 4 — awesome-claude-code).

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

---

**`references/blogs/subagents.pdf`**
Source: Reza Rezvani / Medium — "From Subagents to Agent Teams: Claude Code's Multi-Agent Leap"

Key insights extracted:
- Subagents = hub-and-spoke; Agent Teams = peer-to-peer with shared task board and direct inter-agent messaging
- Three-tier decision ladder: single session → subagents → agent teams (use simplest that works)
- Agent Teams enabled with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (experimental)
- Decision matrix: use teams for parallel exploration, cross-domain coordination, research-heavy work; use subagents for focused tasks, token-conscious work, sequential dependencies
- "Agent Swarm Trap": if the task fits one sentence, one agent is enough; 3+ distinct workstreams justify a team
- No shared filesystem between teammates — design artifacts as messages, not files
- Sweet spot: 3–4 teammates; 5+ coordination overhead typically outweighs parallelism gain

---

**`references/blogs/simplify.pdf`**
Source: Joe Njenga / Medium — "How I'm Using Claude Code (New) /simplify & /batch"

Key insights extracted:
- `/simplify` (Claude Code v2.1.63+): check git diff → launch 3 parallel agents (code reuse, code quality, efficiency review) → apply all fixes in one pass
- Catches: dead code, commented-out blocks, redundant logic, code smells, CLAUDE.md violations
- `/batch`: large-scale parallel migrations — enter plan mode, build per-file work units, run each in isolated git worktree with built-in verification before opening PR
- Recommended workflow: implement → `/simplify` (quality pass) → `/2_review` (unbiased session)

---

**`references/blogs/claude_md.pdf`**
Source: Youssef Hosni / Level Up Coding — "Level Up Your Claude Code with This CLAUDE.md"

Key insights extracted:
- CLAUDE.md is a behavioral contract — encodes HOW to work, not WHAT to build; transforms reactive tool into disciplined collaborator
- Most impactful CLAUDE.md sections: Workflow Orchestration (plan-first), Subagent Strategy (one task per subagent), Self-Improvement Loop (capture lessons after corrections), Verification Before Done ("would a staff engineer approve this?"), Demand Elegance (ask for more elegant approach on non-trivial changes), Autonomous Bug Fixing (investigate independently, fix root causes)
- Core principles: Simplicity First, No Laziness (root causes not patches), Minimal Impact (only touch what's necessary)
- Task Management discipline: Plan → Verify Plan → Track → Explain → Document → Capture Lessons

---

**`references/blogs/uninterrupted.pdf`**
Source: Code Coup / Medium — "Claude Code Permission Hook: Uninterrupted Coding Without the Risk"

Key insights extracted:
- Permission Hook = third model between manual approval and --dangerously-skip-permissions
- Three tiers: Tier 1 fast-approve (Read, Write, Edit, Grep, WebFetch, TodoWrite, Task, all MCP tools), Tier 2 fast-deny (rm -rf /, force push, mkfs, fork bombs), Tier 3 LLM-cached analysis (~$1/5000 decisions, 168h cache)
- Wired via `PermissionRequest` hook in settings.json; device-level (~/.claude/settings.json) or project-level (.claude/settings.local.json)
- "Approval fatigue" is the hidden productivity tax of AI-assisted development; hook eliminates it without removing safety

---

---

**`references/blogs/best_practises.txt`**
Source: Habib Mrad / Medium — "Claude Code: Practical Best Practices for Agentic Coding" (Dec 2025)

Key insights extracted:
- **Agentic TDD loop**: write test → confirm red → implement to green; closed feedback loop, eliminates ~80% of debugging
- **Visual iteration**: provide screenshots/mocks as spec input; perceptual feedback significantly improves UI output quality
- **Autonomy isolation**: distinguish exploratory mode (high supervision) vs execution mode (high autonomy); "autonomy is safe when blast radius is controlled" — sandbox with containers + disabled network for reversible tasks
- **Headless mode**: Claude as programmable infrastructure component — CI pipelines, issue triage bots, automated code review; test it like any other system component
- **Custom tool documentation**: list non-standard scripts in CLAUDE.md with usage examples; have Claude run `--help` on unfamiliar tools before using them

---

---

**`references/repos/awesome-claude-code-main/`**
Source: hesreallyhim/awesome-claude-code (2026-03-02)

Key insights extracted:
- **Hook implementation standards**: read JSON from stdin (not argv); success → `{continue: true, suppressOutput: true}`; error → `{continue: true, additionalContext: "..."}` for Claude auto-fix; block → `exit(2)` in PreToolUse; hooks run in parallel so design for independence
- **Hook event types**: PreToolUse (can block), PostToolUse (feedback/fix), UserPromptSubmit (before prompt processing)
- **Project tooling → hook suggestions**: TypeScript → type-check hook; Prettier → auto-format; ESLint → lint + fix; git → secret scanner
- **Multi-role PR review (6 lenses)**: PM, Developer, QA, Security, DevOps, UI/UX — "the future is now" principle, no deferrals
- **PRP concept**: Product Requirement Prompt = PRD + codebase intelligence + implementation runbook; our spec already functions as a PRP via "Affected files" + "Patterns to mirror" + "Test cases" sections
- **Commit quality pattern**: conventional commits with emoji (`✨ feat:`, `🐛 fix:`, `✅ test:`); analyze diff before committing; split by distinct concerns; pre-commit checks (lint → build)
- **Design review with Playwright MCP**: live browser testing rather than static code analysis; store design principles in CLAUDE.md; review phases: interaction flows → responsiveness → polish → accessibility → robustness → code health

---

## Pending references

_None — drop files into `.claude/references/` and run `/5_learn`_

---

## Suggested references to collect

For Claude Code framework:
- trailofbits/claude-code-config — opinionated production `settings.json`, statusline, CLAUDE.md template
- trailofbits/skills — security/audit skill library, well-structured examples
- disler/claude-code-hooks-mastery — deep dive on all 8 hook events, sub-agents, meta-agents
- ChrisWiles/claude-code-showcase — full project config with hooks + GitHub Actions

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
