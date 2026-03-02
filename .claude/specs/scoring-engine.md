# Spec: Scoring Engine

## Goal

Pure TypeScript module that accepts 48 Likert responses and produces a fully computed assessment result: dimension scores, weighted θ score, gated maturity level, bottleneck identification, and rule-based recommendations.

## Requirements

- Accept responses as an object keyed by dimension, each an array of 8 integers (0–4)
- Compute each dimension score: `(sum of 8 answers / 32) × 100` → number 0–100
- Compute overall θ score as the weighted sum of dimension scores using fixed weights
- Assign a raw level (0–3) from θ score, then apply gating rules to cap the level
- Identify the bottleneck as the dimension with the lowest score
- Return rule-based action recommendations for the bottleneck dimension (3 actions per dimension, hardcoded)
- Return the full result as a plain serialisable object (no class instances)
- Export a `computeResult` function as the single public entry point
- All logic must be pure functions with no side effects and no framework dependencies

## Out of scope

- Persistence, API calls, or any I/O
- UI rendering or React components
- PDF generation
- Validation of whether responses are complete (caller's responsibility)

## Dimensions and weights

| Key | Label | Weight |
|---|---|---|
| `strategy` | Strategy | 20% |
| `architecture` | Architecture | 15% |
| `workflow` | Workflow | 25% |
| `data` | Data | 15% |
| `talent` | Talent | 15% |
| `adoption` | Adoption | 10% |

## Level assignment

Raw level from θ:
- 0–20 → Level 0
- 21–50 → Level 1
- 51–80 → Level 2
- 81–100 → Level 3

Gating rules (applied after raw level, can only reduce):
- Level 3 requires: `workflow ≥ 70` AND `data ≥ 60` AND `adoption ≥ 50`; else cap at 2
- Level 2 requires: `workflow ≥ 50` AND `data ≥ 40`; else cap at 1

Level labels (from ScalingX glossary):
- Level 0: "Traditional"
- Level 1: "AI-Powered"
- Level 2: "AI-Enabled"
- Level 3: "AI-Native"

Level benchmarks (included in result for results page display):
- Level 0: 84 months to €100M ARR, €150K ARR/Employee
- Level 1: 48 months to €100M ARR, €250K ARR/Employee
- Level 2: 24 months to €100M ARR, €600K ARR/Employee
- Level 3: 18 months to €100M ARR, €1.2M ARR/Employee

## Bottleneck logic

- Bottleneck = dimension key with the lowest score
- Gap = `70 - bottleneckScore` (clamped to 0 if bottleneck score ≥ 70)
- Each dimension has exactly 3 hardcoded action strings (see Implementation notes)

## Affected files

None — this is a new module.

## New files

- `src/lib/scoring/engine.ts` — all logic
- `src/lib/scoring/types.ts` — TypeScript types
- `src/lib/scoring/recommendations.ts` — hardcoded action strings per dimension
- `src/lib/scoring/engine.test.ts` — Vitest unit tests

## Implementation notes

**Types** (`types.ts`):
```ts
type DimensionKey = 'strategy' | 'architecture' | 'workflow' | 'data' | 'talent' | 'adoption'

interface AssessmentInput {
  companyName: string
  responses: Record<DimensionKey, number[]>  // 8 values each, 0–4
}

interface DimensionResult {
  key: DimensionKey
  label: string
  weight: number
  score: number          // 0–100, rounded to 1 decimal
}

interface LevelInfo {
  level: number           // 0–3
  label: string           // "Traditional" | "AI-Powered" | "AI-Enabled" | "AI-Native"
  monthsTo100M: number
  arrPerEmployee: string  // e.g. "€150K"
}

interface BottleneckInfo {
  dimension: DimensionKey
  score: number
  gap: number             // points to 70% target
  actions: string[]       // exactly 3
}

interface AssessmentResult {
  companyName: string
  dimensions: DimensionResult[]
  thetaScore: number      // weighted, rounded to 1 decimal
  rawLevel: number
  level: LevelInfo
  gated: boolean          // true if gating reduced the raw level
  bottleneck: BottleneckInfo
}
```

**Dimension config** — define as a readonly const array in `engine.ts` to drive all loops (avoids duplication):
```ts
const DIMENSIONS = [
  { key: 'strategy',     label: 'Strategy',     weight: 0.20 },
  { key: 'architecture', label: 'Architecture', weight: 0.15 },
  { key: 'workflow',     label: 'Workflow',      weight: 0.25 },
  { key: 'data',         label: 'Data',          weight: 0.15 },
  { key: 'talent',       label: 'Talent',        weight: 0.15 },
  { key: 'adoption',     label: 'Adoption',      weight: 0.10 },
] as const
```

**Recommendations** (`recommendations.ts`) — 3 action strings per dimension key. Base them on the ScalingX framework language (AI-Native Scaling, bottleneck principle). Example for `data`:
- "Establish a central data warehouse with automated pipelines"
- "Implement data quality measurement and versioning"
- "Shift decision-making to data-driven processes across all teams"

Write similar three-point lists for all 6 dimensions grounded in the spec.txt question topics.

**Gating** — apply as a separate pure function `applyGating(rawLevel, scores)` that returns the capped level and a boolean indicating whether gating fired.

**Rounding** — round all scores to 1 decimal place using `Math.round(x * 10) / 10`.

## Test cases

Cover all of these in `engine.test.ts`:

1. **Perfect score** — all answers = 4 → θ = 100, Level 3, no gating
2. **Zero score** — all answers = 0 → θ = 0, Level 0
3. **Exact level boundaries** — θ = 20, 21, 50, 51, 80, 81 (use crafted inputs)
4. **Gating fires for Level 3** — θ ≥ 81 but workflow < 70 → capped at 2, `gated = true`
5. **Gating fires for Level 2** — θ ≥ 51 but workflow < 50 → capped at 1, `gated = true`
6. **Gating does not fire** — θ = 75, workflow = 55, data = 45 → Level 2, `gated = false`
7. **Bottleneck identification** — lowest dimension correctly identified when scores differ
8. **Bottleneck gap calculation** — score 45 → gap = 25; score 72 → gap = 0
9. **Dimension score formula** — 8 answers summing to 24 → score = 75
10. **Weighted theta** — verify weights sum to 1.0 and θ matches manual calculation
