# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## This repo

**Claude Code Development Framework** — a reusable `.claude/` directory with 20 skills, context files, hooks, and documentation that structures Claude Code into a disciplined spec → implement → review → fix → test pipeline with built-in learning.

The `src/` directory contains the **AI Maturity Score** demo app — a working example of the framework applied to a real Next.js/TypeScript project.

To use the framework in a new project: copy the `.claude/` directory into your repo and update `CLAUDE.md` for your tech stack.

Full framework docs: `.claude/docs/README.md`

## Demo app tech stack

| Layer     | Technology                           |
| --------- | ------------------------------------ |
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling   | Tailwind CSS + shadcn/ui             |
| State     | Zustand                              |
| Charts    | Recharts                             |
| Testing   | Vitest + React Testing Library       |
| Deploy    | Vercel                               |

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

### Core pipeline

| Skill                 | Purpose                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/decompose`          | Break a concept doc or product brief into independent PRDs, then ship each through the pipeline                     |
| `/ship <feature>`     | Full pipeline orchestrator — spec → implement → review → fix → commit. `--dry-run` runs spec only and reports scope |
| `/0_spec <feature>`   | Write a structured spec from requirements in `.claude/input/`                                                       |
| `/1_implement <spec>` | Implement with mandatory plan approval, TDD enforcement, and impact analysis                                        |
| `/2_review [spec]`    | 9-lens code review with severity classification and spec completeness check                                         |
| `/3_fix [review]`     | Fix issues by severity (critical → major → minor) with circuit breaker                                              |
| `/test [file]`        | Run typecheck → lint → tests → build (report only, no fixes)                                                        |

### Development tools

| Skill                 | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `/commit`             | Atomic conventional commits with multi-concern detection                           |
| `/debug`              | Diagnose and fix a failing test, type error, or runtime error                      |
| `/impact <function>`  | Blast radius analysis — find all call sites, test mocks, and consumers (read-only) |
| `/smoke [spec]`       | Write and run smoke tests against a Docker stack from a spec                       |
| `/audit`              | Find and fix vulnerable dependencies across package managers                       |
| `/healthcheck`        | Scan Docker container logs for errors, crashes, and warnings                       |
| `/create-hook`        | Scaffold a Claude Code lifecycle hook                                              |
| `/harvest <repo-url>` | Clone and analyze a repo's Claude Code setup; generate adoption proposals          |
| `/deploy <path>`      | Deploy framework to a project via symlinks (junctions on Windows)                  |

### Knowledge & session management

| Skill              | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `/learn`           | Process blog posts and repos into the knowledge base; propose skill improvements |
| `/scout`           | Search the web for new Claude Code patterns and suggest framework optimizations  |
| `/apply-proposals` | Apply accepted proposals from learn-proposals.md to skill/rule files             |
| `/doc`             | Regenerate `.claude/docs/` from current skills and context                       |
| `/handoff`         | Capture session state before `/clear`                                            |
| `/continue`        | Resume from a handoff file in a new session                                      |

## Framework thresholds (optional)

This section is optional. If omitted, all skills use the defaults shown below. To customize, uncomment and change any value.

<!-- Uncomment any line to override the default:
| Threshold | Value |
|---|---|
| `complexity_gate_max_files` | 10 |
| `review_fix_max_cycles` | 3 |
| `lesson_graduation_age_days` | 14 |
| `delta_review_escalation_pct` | 50 |
-->

## `.claude/` directory layout

| Path                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `skills/`              | 22 skill definitions (the framework itself)      |
| `agents/`              | Subagent personas (code-reviewer, explorer)      |
| `rules/`               | Auto-loaded instructions (like CLAUDE.md shards) |
| `context/`             | Reference knowledge read by skills on demand     |
| `references/`          | Drop zone: paste blog posts and repo files here  |
| `hooks/`               | Lifecycle hook scripts (e.g. auto-approve.js)    |
| `docs/`                | Generated framework documentation                |
| `specs/`               | Generated feature specs                          |
| `reviews/`             | Review reports                                   |
| `input/`               | Raw requirements                                 |
| `handoffs/`            | Session state files (gitignored)                 |
| `metrics-pipeline.csv` | Ship pipeline run log (append-only)              |
| `metrics-scout.csv`    | Scout/harvest run log (append-only)              |
