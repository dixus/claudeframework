# References Index

Drop raw material into `blogs/` or `repos/` and run `/5_learn` to extract insights into `.claude/context/`.

## How to add a reference

1. **Blog post / article**: paste the full text as a `.md` file into `blogs/`. Name it descriptively, e.g. `boris-cherny-claude-code-workflow.md`
2. **Repository**: copy key files (README, architecture docs, example patterns) into a named subfolder under `repos/`, e.g. `repos/t3-saas-starter/`
3. Run `/5_learn` — it reads unprocessed entries, extracts insights, and marks them as processed here

## Processed entries

| File | Source | Key insight | Processed |
|---|---|---|---|
| `blogs/claude-code-best-practices-2026.md` | Web research (2026-03-02) | Core workflow: context window management, plan-first, subagents for isolation | ✅ |
| `blogs/automem.md` | Reza Rezvani / Medium (2026-03-02) | Memory hierarchy, modular rules (`.claude/rules/`), team pattern: promote auto-memory → CLAUDE.md weekly | ✅ |
| `blogs/spec-driven-dev.pdf` | Heeki Park / Medium (2026-03-02) | Three spec-driven levels (spec-first/anchored/as-source); upfront planning reduces wholesale rewrites | ✅ |
| `blogs/hook-driven.pdf` | Nick Tune / Medium (2026-03-02) | Hook-driven state machine (planning→developing→reviewing→committing) with real code + tests as engine | ✅ |
| `blogs/best-prac1.pdf` | Reza Rezvani / Medium (2026-03-02) | 7-month lessons: CLAUDE.md pruning rule, task decomposition threshold, verification loop via tests | ✅ |

## Unprocessed entries

_None — drop files here and run `/5_learn`_
