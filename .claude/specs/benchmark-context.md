# Spec: Benchmark Context

## Goal

Add lightweight benchmark references to four existing result panels (RadarChartPanel, DimensionScorecard, ScoreCard, ScalingPanel) so users understand where their scores stand relative to validated company data and level thresholds.

## Requirements

- **Radar chart benchmark overlay**: Add a semi-transparent dashed reference polygon on the RadarChartPanel showing the dimension thresholds for the next maturity level. Label it (e.g. "Level 2 threshold"). For Level 3 users, show "AI-Native benchmark" (top-quartile scores).
- **Dimension benchmark bars**: On each DimensionScorecard bar, add subtle tick markers showing (a) the gating threshold for that dimension at the next level (if one exists) and (b) the "good" benchmark line at 70.
- **ScoreCard benchmark range**: Below the theta score on the ScoreCard, show the theta range for the current level (e.g. "Level 1: AI-Powered (theta 20-50)") with a mini progress bar showing position within that range, plus distance to the next level boundary.
- **ARR/Employee context**: On the ScalingPanel, add a one-liner showing the typical ARR/employee range for the next level and a comparison to the user's current implied range from their enabler data.
- All benchmark visuals use muted styling (gray dashed lines, semi-transparent fills) and frame comparisons as targets, not failures.
- All data comes from existing constants — no new data sources.

## Out of scope

- Peer comparison against other users' assessments
- Industry-specific benchmarks
- Historical tracking or trend lines
- Percentile rankings
- New panels, tabs, or pages
- Changes to scoring engine logic or formulas

## Affected files

1. `src/components/results/RadarChartPanel.tsx` — add a second `<Radar>` element for the benchmark overlay polygon, accept `level` prop to determine which benchmark to show
2. `src/components/results/DimensionScorecard.tsx` — add tick markers on each dimension bar for gating thresholds and the "good" benchmark at 70, accept `level` prop
3. `src/components/results/ScoreCard.tsx` — add a level-range section below the theta score with a mini progress bar and distance-to-next-level display
4. `src/components/results/ScalingPanel.tsx` — add an ARR/employee context one-liner comparing current level to the next level's typical range
5. `src/components/results/ResultsPage.tsx` — pass additional props (`level`, `enablers`) to the updated panels
6. `src/lib/scoring/benchmarks.ts` — add `getLevelThresholdScores()` helper that returns per-dimension target scores for a given level, and `getLevelThetaRange()` returning the theta min/max for a level
7. `src/lib/scoring/benchmarks.test.ts` — add tests for the new helper functions

## New files

None.

## Patterns to mirror

1. `src/components/results/RadarChartPanel.tsx` — existing Recharts `<Radar>` usage pattern for adding the second overlay polygon
2. `src/components/results/DimensionScorecard.tsx` — existing bar rendering pattern (Tailwind `div` with percentage width) for positioning tick markers
3. `src/lib/scoring/benchmarks.ts` — existing `getBenchmark()` / `getNextLevelThreshold()` pattern for adding new lookup functions

## Implementation notes

### New benchmark helpers in `benchmarks.ts`

```ts
// Per-dimension target scores for each level's gating thresholds
// Level 2 gates: workflow >= 50, data >= 40
// Level 3 gates: workflow >= 70, data >= 60, adoption >= 50 (plus "AI-Native" top-quartile targets for all 6 dims)
export function getLevelThresholdScores(
  targetLevel: number,
): Record<DimensionKey, number | null>;

// Theta range boundaries for each level
// L0: 0-20, L1: 20-50, L2: 50-80, L3: 80-100
export function getLevelThetaRange(level: number): { min: number; max: number };
```

For the radar overlay at Level 3 (AI-Native benchmark), use top-quartile reference values: `{ strategy: 90, architecture: 85, workflow: 85, data: 80, talent: 80, adoption: 75 }`. These represent aspirational targets, not gating requirements.

### Radar chart overlay

Add a second `<Radar>` inside the existing `<RadarChart>` with:

- `dataKey="benchmark"` on the merged data array
- `stroke="#9ca3af"` (gray-400), `strokeDasharray="4 4"`, `fillOpacity={0.05}`, `fill="#9ca3af"`
- A `<Legend>` or simple label text showing which level the overlay represents

The component needs the user's current gated level to determine which overlay to show. Pass `level={result.level.level}` from `ResultsPage`.

### Dimension scorecard tick markers

For each dimension bar, render absolutely-positioned tick markers:

- **Gating threshold tick** (if applicable): a 2px-wide, 12px-tall amber-400 dashed line at the threshold percentage position
- **"Good" benchmark tick** at 70%: a 2px-wide, 12px-tall gray-300 dashed line

Use a `relative` container on the bar wrapper and `absolute` positioning with `left: {threshold}%` for each tick. Only show gating ticks for dimensions that have gates at the next level.

### ScoreCard benchmark range

Add a new section between the theta score and the maturity level:

```
Level 1: AI-Powered (θ 20–50)
[====|----------] 52% through this level
6.0 points to Level 2
```

Use `getLevelThetaRange()` to compute position. The mini progress bar reuses the same Tailwind bar pattern as DimensionScorecard. If the user is Level 3, show "Highest level achieved" instead of distance-to-next.

### ARR/Employee context on ScalingPanel

Add a small `bg-gray-50 rounded p-2` section at the bottom of ScalingPanel:

- Show: "Level {next} companies typically achieve {arrPerEmployee}" using `getBenchmark(nextLevel)`
- If enablers are available, compute current implied ARR/employee: `(annualRevenue * 1000) / teamSize` and show the comparison
- If user is Level 3, show their current level's range as the reference instead

### Edge cases

- **Level 0 user**: Radar overlay shows Level 1 targets. Since Level 1 has no gating thresholds, the overlay shows uniform aspirational scores (each dimension at ~35, the Level 1 mean theta). DimensionScorecard shows no gating ticks (Level 1 has no gates), only the "good" benchmark at 70.
- **Level 3 user**: Radar overlay shows AI-Native top-quartile targets. ScoreCard shows "Highest level achieved" instead of distance. ARR context references their own level.
- **No enablers provided**: ARR/Employee context section is not rendered on ScalingPanel (ScalingPanel itself only renders when `meta` is present, which requires enablers).
- **Theta exactly on boundary** (e.g. theta=50): `getLevelThetaRange()` for the gated level handles this correctly — the progress bar shows 100% through the current range.

## UX concept

### Component tree

- `ResultsPage` (existing — passes new props)
  - `ScoreCard` (existing — adds benchmark range section)
    - New internal: level range display + mini progress bar (no separate component needed)
  - `RadarChartPanel` (existing — adds benchmark overlay)
    - New internal: second `<Radar>` element + label
  - `DimensionScorecard` (existing — adds tick markers)
    - New internal: threshold tick marks per bar (inline elements)
  - `ScalingPanel` (existing — adds ARR context line)
    - New internal: ARR/employee comparison block (inline)

### Interaction flows

1. User completes assessment and lands on results page
2. ScoreCard immediately shows theta score with the new level range bar beneath it — user sees where they sit within their level at a glance
3. Radar chart shows their scores plus the dashed benchmark polygon — user can visually compare each dimension to the target
4. Scrolling to Overview tab, DimensionScorecard bars show tick markers — user identifies which dimensions are below gating thresholds
5. On Scaling tab, ScalingPanel shows ARR/employee context — user understands the economic implications of advancing

No new interactive elements (no clicks, hovers, or toggles beyond what already exists).

### State & data flow

- All benchmark data is derived from existing constants in `benchmarks.ts` and `engine.ts` (LEVELS, gating thresholds)
- No new state in Zustand store — all data is computed from `result.level.level`, `result.thetaScore`, `result.enablers`, and the static benchmark lookups
- Props flow: `ResultsPage` reads `result` from Zustand and passes `level={result.level.level}` to RadarChartPanel and DimensionScorecard; ScoreCard and ScalingPanel already receive enough data

### Responsive behavior

- Tick markers on DimensionScorecard bars scale with bar width (percentage-based positioning) — works at all breakpoints
- Radar overlay polygon scales with the RadarChart `<ResponsiveContainer>` — no additional responsive handling needed
- Mini progress bar in ScoreCard uses full width of the card — same pattern as existing bars
- ARR context one-liner wraps naturally as text

### Accessibility

- Radar benchmark overlay: add `aria-label` on the benchmark Radar describing what it represents (e.g. "Level 2 threshold benchmark")
- Tick markers: use `aria-hidden="true"` since they are decorative — the information is conveyed by the numbers already shown
- Mini progress bar: add `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a descriptive `aria-label`
- ARR context text is plain text — inherently accessible

### Reuse check

- Recharts `<Radar>` component — already used in RadarChartPanel, add a second one
- Tailwind bar pattern — already used in DimensionScorecard, reuse for mini progress bar and tick markers
- `getBenchmark()` and `getNextLevelThreshold()` from `benchmarks.ts` — reuse directly
- `LevelInfo` from engine.ts LEVELS array — already available on `result.level`

## Validation criteria

1. Navigating to results with a Level 1 score (theta 20-50) shows a dashed gray polygon on the radar chart labeled "Level 2 threshold"
2. The radar benchmark polygon vertices correspond to the correct Level 2 gating thresholds for gated dimensions and reasonable target values for non-gated dimensions
3. DimensionScorecard shows a subtle tick mark at position 50% on the Workflow bar and 40% on the Data bar (Level 2 gates) when user is Level 1
4. DimensionScorecard shows a tick mark at 70% on every dimension bar (the "good" benchmark)
5. ScoreCard displays "Level 1: AI-Powered (θ 20–50)" with a mini progress bar showing the user's position within that range
6. ScoreCard shows distance to next level (e.g. "6.0 points to Level 2")
7. ScalingPanel shows "Level 2 companies typically achieve €400K–2M ARR/employee" when user is Level 1
8. All benchmark visuals use muted colors (gray dashed lines, low-opacity fills) and do not dominate the existing panel content
9. Level 3 users see "AI-Native benchmark" overlay on radar and "Highest level achieved" on ScoreCard
10. No new panels, tabs, or pages are created

## Test cases

1. **`getLevelThresholdScores(2)`** returns `{ workflow: 50, data: 40, strategy: null, architecture: null, talent: null, adoption: null }` — only gated dimensions have non-null values
2. **`getLevelThresholdScores(3)`** returns `{ workflow: 70, data: 60, adoption: 50, strategy: null, architecture: null, talent: null }` — Level 3 gates
3. **`getLevelThetaRange(0)`** returns `{ min: 0, max: 20 }`; level 1 returns `{ min: 20, max: 50 }`; level 2 returns `{ min: 50, max: 80 }`; level 3 returns `{ min: 80, max: 100 }`
4. **RadarChartPanel with level=1** renders two `<Radar>` elements — one for user scores, one for benchmark
5. **DimensionScorecard with level=1** renders tick markers on Workflow (at 50%) and Data (at 40%) bars, plus "good" ticks at 70% on all bars
6. **ScoreCard with theta=35, level=1** shows progress bar at 50% through the range (35 is midpoint of 20-50), distance shows "15.0 points to Level 2"
7. **ScoreCard with level=3** shows "Highest level achieved" instead of distance-to-next
8. **ScalingPanel with level=1, enablers provided** shows ARR/employee context referencing Level 2 benchmarks

## Decisions made by Claude

1. **(low)** Radar overlay for non-gated dimensions at Level 2 uses the `levelMeanTheta` from benchmarks as a uniform target (e.g. 65 for all non-gated dims when targeting Level 2) — the PRD specifies gating thresholds but not what to show for non-gated dimensions on the radar.
2. **(low)** For Level 3 "AI-Native benchmark" radar overlay, chose top-quartile reference values (90/85/85/80/80/75) as aspirational targets — the PRD says "top quartile" but does not specify exact per-dimension numbers.
3. **(low)** `getLevelThresholdScores()` returns `null` for non-gated dimensions rather than a default value — callers decide what to do (radar uses levelMeanTheta as fallback, scorecard skips the tick).
4. **(low)** Mini progress bar in ScoreCard uses the same blue-500 color as existing bars rather than introducing a new color.
5. **(medium)** ARR/employee comparison on ScalingPanel computes implied ARR/employee as `(annualRevenue * 1000) / teamSize` using raw enabler inputs — this matches the formula in `computeEnablerScore()` but surfaces a raw number the user has not explicitly confirmed.
6. **(low)** No new component files — all additions are inline within existing panel components, keeping the file count minimal and scope tight.
