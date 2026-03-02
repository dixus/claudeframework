# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AI Maturity Score** — a web-based self-assessment tool that calculates an organisation's AI maturity (θ score) across 6 weighted dimensions, assigns a maturity level, identifies the primary bottleneck, and generates a results report with PDF export and optional lead capture.

Full requirements: `.claude/input/spec.txt`

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Charts | Recharts (radar chart) |
| PDF | @react-pdf/renderer |
| Lead capture | Supabase (free tier) — email + JSON result blob |
| Testing | Vitest + React Testing Library |
| Deploy | Vercel |

The scoring engine is pure client-side TypeScript. No separate API server for MVP.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (also catches TS errors in JSX)
npm run lint             # ESLint
npx tsc --noEmit         # Typecheck only (no emit)
npx vitest run           # Run all tests
npx vitest run <file>    # Run a single test file
```

## Architecture

```
src/
  lib/
    scoring/       # Pure TS scoring engine — no React dependencies
  components/
    assessment/    # Multi-step questionnaire UI
    results/       # Radar chart, scorecard, bottleneck panel
  app/             # Next.js App Router pages
  store/           # Zustand state (assessment progress + results)
```

Key architectural constraint: the scoring engine (`src/lib/scoring/`) must remain framework-agnostic pure functions so it can be unit-tested with Vitest without React.

## Scoring Model (reference)

- **6 dimensions**: Strategy (20%), Architecture (15%), Workflow (25%), Data (15%), Talent (15%), Adoption (10%)
- **48 questions** (8 per dimension), Likert 0–4
- **Dimension score**: `(sum of answers / 32) × 100`
- **θ score**: weighted sum of dimension scores
- **Levels**: 0 = 0–20, 1 = 21–50, 2 = 51–80, 3 = 81–100
- **Gating**: Level 3 requires Workflow ≥ 70, Data ≥ 60, Adoption ≥ 50; Level 2 requires Workflow ≥ 50, Data ≥ 40

## Development Workflow (skills)

| Skill | Purpose |
|---|---|
| `/0_spec <feature>` | Write a spec to `.claude/specs/<kebab-name>.md` |
| `/1_implement <spec-name>` | Implement a spec; enters plan mode first |
| `/2_review [spec-name]` | Write a review report to `.claude/reviews/` |
| `/3_fix [review-name]` | Fix review issues: critical → major → minor |
| `/4_test [file]` | Run typecheck → lint → tests → build; report only, no fixes |
| `/5_learn` | Process new references → extract insights → update context → run /6_doc |
| `/6_doc` | Regenerate `.claude/docs/` from current skills and context |
| `/audit` | Check for vulnerable dependencies → fix → verify tests |
| `/commit` | Create atomic commits with conventional messages; splits by concern |
| `/create-hook` | Scaffold a Claude Code lifecycle hook based on detected project tooling |

`.claude/` directory layout:

| Path | Purpose |
|---|---|
| `input/` | Raw requirements drop zone (docs, images, wireframes) |
| `context/` | Curated knowledge read by all skills (workflow patterns, SaaS patterns) |
| `references/` | Drop zone for blog posts and repo material; processed by `/5_learn` |
| `references/blogs/` | Paste blog post / article content here |
| `references/repos/` | Copy READMEs and key files from reference repos here |
| `docs/` | Generated framework documentation (README, workflow, skills ref, knowledge base) |
| `specs/` | Generated feature specs (kebab-case filenames) |
| `reviews/` | Review reports (`<spec-name>-review.md`) |
| `archive/` | Processed input files after spec creation |
| `skills/` | Custom skills (0_spec through 6_doc, audit, commit, create-hook) |
