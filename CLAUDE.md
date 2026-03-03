# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## This repo

**Claude Code Development Framework** — a reusable `.claude/` directory with skills, context files, hooks, and documentation that structures Claude Code into a disciplined spec → implement → review → fix → test pipeline.

The `src/` directory contains the **AI Maturity Score** demo app — a working example of the framework applied to a real Next.js/TypeScript project.

To use the framework in a new project: copy the `.claude/` directory into your repo and update `CLAUDE.md` for your tech stack.

Full framework docs: `.claude/docs/README.md`

## Demo app tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Deploy | Vercel |

## Demo app commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (also catches TS errors in JSX)
npm run lint       # ESLint
npx tsc --noEmit   # Typecheck only
npx vitest run     # Run all tests
```

## Demo app architecture

```
src/
  lib/scoring/      # Pure TS scoring engine — no React dependencies
  components/       # assessment/ + results/ UI
  app/              # Next.js App Router pages
  store/            # Zustand state
```

IMPORTANT: `src/lib/scoring/` must remain framework-agnostic pure functions — do not add React dependencies.

## Framework skills

| Skill | Purpose |
|---|---|
| `/0_spec <feature>` | Write a spec to `.claude/specs/<name>.md` |
| `/1_implement <spec>` | Implement a spec; enters plan mode first |
| `/2_review [spec]` | Write a review report to `.claude/reviews/` |
| `/3_fix [review]` | Fix review issues: critical → major → minor |
| `/4_test [file]` | Run typecheck → lint → tests → build; report only |
| `/5_learn` | Process references → extract insights → update context |
| `/6_doc` | Regenerate `.claude/docs/` from current skills and context |
| `/audit` | Check for vulnerable dependencies → fix → verify |
| `/commit` | Create atomic commits with conventional messages |
| `/create-hook` | Scaffold a Claude Code lifecycle hook |
| `/debug` | Diagnose and fix a failing test or type error |
| `/handoff` | Capture session state to a file before /clear |
| `/continue` | Restore context from a handoff file in a new session |

`.claude/` directory layout:

| Path | Purpose |
|---|---|
| `skills/` | Skill definitions (the framework itself) |
| `context/` | Curated knowledge read by all skills |
| `references/` | Drop zone: paste blog posts and repo files here |
| `hooks/` | Lifecycle hook scripts (e.g. auto-approve.js) |
| `docs/` | Generated framework documentation |
| `specs/` | Generated feature specs |
| `reviews/` | Review reports |
| `input/` | Raw requirements (archived after spec) |
