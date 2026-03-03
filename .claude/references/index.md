# References Index

Drop raw material into `blogs/` or `repos/` and run `/learn` to extract insights into `.claude/context/`.

## How to add a reference

1. **Blog post / article**: paste the full text as a `.md` file into `blogs/`. Name it descriptively, e.g. `boris-cherny-claude-code-workflow.md`
2. **Repository**: copy key files (README, architecture docs, example patterns) into a named subfolder under `repos/`, e.g. `repos/t3-saas-starter/`
3. Run `/learn` — it reads unprocessed entries, extracts insights, and marks them as processed here

## Processed entries

| File | Source | Key insight | Processed |
|---|---|---|---|
| `blogs/claude-code-best-practices-2026.md` | Web research (2026-03-02) | Core workflow: context window management, plan-first, subagents for isolation | ✅ |
| `blogs/automem.md` | Reza Rezvani / Medium (2026-03-02) | Memory hierarchy, modular rules (`.claude/rules/`), team pattern: promote auto-memory → CLAUDE.md weekly | ✅ |
| `blogs/spec-driven-dev.pdf` | Heeki Park / Medium (2026-03-02) | Three spec-driven levels (spec-first/anchored/as-source); upfront planning reduces wholesale rewrites | ✅ |
| `blogs/hook-driven.pdf` | Nick Tune / Medium (2026-03-02) | Hook-driven state machine (planning→developing→reviewing→committing) with real code + tests as engine | ✅ |
| `blogs/best-prac1.pdf` | Reza Rezvani / Medium (2026-03-02) | 7-month lessons: CLAUDE.md pruning rule, task decomposition threshold, verification loop via tests | ✅ |
| `blogs/subagents.pdf` | Reza Rezvani / Medium (2026-03-02) | Agent Teams vs Subagents decision matrix; "agent swarm trap" rule of thumb; 3-tier model (single session / subagents / agent teams) | ✅ |
| `blogs/simplify.pdf` | Joe Njenga / Medium (2026-03-02) | /simplify (3-agent parallel quality pass) and /batch (parallel migration via isolated git worktrees) built into Claude Code v2.1.63+ | ✅ |
| `blogs/claude_md.pdf` | Youssef Hosni / Level Up Coding (2026-03-02) | CLAUDE.md as behavioral contract: Verification Before Done, Self-Improvement Loop, Demand Elegance, Autonomous Bug Fixing | ✅ |
| `blogs/uninterrupted.pdf` | Code Coup / Medium (2026-03-02) | Permission Hook 3-tier system (fast approve / fast deny / LLM-cached analysis) — replaces full manual approval without --dangerously-skip-permissions | ✅ |
| `blogs/best_practises.txt` | Habib Mrad / Medium (Dec 2025) | Agentic TDD loop (red→green), visual iteration with screenshots, autonomy isolation (blast radius), headless mode as CI/triage infrastructure | ✅ |
| `repos/awesome-claude-code-main/` | hesreallyhim/awesome-claude-code (2026-03-02) | Hook implementation standards (stdin/stdout, event types, parallel execution); multi-role PR review (6 lenses); PRP concept; commit quality pattern with conventional commits + emoji; design review with Playwright MCP | ✅ |

## Unprocessed entries

_None — drop files here and run `/learn`_
