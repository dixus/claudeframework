# Spec: Industry Benchmarks & Peer Comparison

## Goal

Add a cohort-based benchmark system that lets users compare their theta score and dimension scores against anonymized peer groups filtered by funding stage and growth engine type.

## Requirements

- Create a new scoring module (`industry-benchmarks.ts`) with static benchmark datasets for 12+ cohorts (4 funding stages x 3 growth engines), each storing mean/median/p25/p75 theta, per-dimension means, and sample size
- Expose `getCohortBenchmark(fundingStage, growthEngine)` returning cohort data or null for invalid inputs
- Expose `computePercentile(userScore, cohortStats)` using normal distribution approximation from mean + p25/p75
- Expose `computeDimensionGaps(userDimensions, cohortMeans)` returning per-dimension deltas vs cohort average
- Create an API route `GET /api/benchmarks?fundingStage=...&growthEngine=...` returning cohort stats with input validation (400 for invalid params)
- Add `benchmarkComparison` field to `AssessmentResult` type (cohortLabel, percentile, dimensionDeltas, topStrength, keyGap)
- Compute benchmark comparison inside `computeResult()` when enablers and growthEngine are both provided; set to undefined otherwise
- Add `BenchmarkComparisonPanel` component to the Overview tab in ResultsPage, placed after InsightsPanel
- Panel displays: cohort label with sample size, percentile bar visualization, horizontal bar chart of user vs cohort dimension means (color-coded: green above, amber within 10%, red below), top strength callout, key gap callout
- Conditional rendering: show panel only when `result.benchmarkComparison` exists; otherwise show muted fallback message

## Out of scope

- Real-time aggregation from assessments database
- Custom user-defined cohorts
- Historical tracking / trend comparison
- Competitive named-company comparison
- Benchmark data editing / admin panel
- Growth engine type `"hybrid"` in cohorts (only plg, slg, clg)

## Affected files

1. `src/lib/scoring/types.ts` — add `CohortBenchmark`, `BenchmarkComparison` interfaces; add `benchmarkComparison?` field to `AssessmentResult`
2. `src/lib/scoring/engine.ts` — import industry benchmark functions; compute `benchmarkComparison` in `computeResult()` when enablers + growthEngine present
3. `src/components/results/ResultsPage.tsx` — import and render `BenchmarkComparisonPanel` in Overview tab after InsightsPanel; render fallback when benchmarkComparison is absent
4. `src/app/api/benchmarks/route.ts` — new API route (listed under New files)

## New files

1. `src/lib/scoring/industry-benchmarks.ts` — static cohort data + `getCohortBenchmark`, `computePercentile`, `computeDimensionGaps` functions
2. `src/lib/scoring/industry-benchmarks.test.ts` — unit tests for scoring module
3. `src/app/api/benchmarks/route.ts` — GET endpoint returning cohort benchmark data
4. `src/app/api/benchmarks/benchmarks.test.ts` — API route tests
5. `src/components/results/BenchmarkComparisonPanel.tsx` — peer comparison results panel
6. `src/components/results/benchmarkComparison.test.tsx` — component rendering tests

## Patterns to mirror

1. `src/lib/scoring/coordination.ts` — pure scoring module with typed exports, static data, and exported computation functions
2. `src/app/api/assessments/route.ts` — API route with input validation returning NextResponse JSON
3. `src/components/results/GrowthEnginePanel.tsx` — results panel with conditional rendering, Tailwind styling, and Recharts chart integration

## Implementation notes

### Cohort data structure

Each cohort is keyed by `${fundingStage}:${growthEngine}` (e.g., `"series-a:plg"`). Valid funding stages for cohorts: `"seed"`, `"series-a"`, `"series-b"`, `"growth"`. Valid growth engines: `"plg"`, `"slg"`, `"clg"`. Empty string or `"pre-seed"` funding stages and `"hybrid"` growth engine have no cohort data.

```typescript
interface CohortBenchmark {
  fundingStage: FundingStage;
  growthEngine: GrowthEngineType;
  label: string; // e.g., "Series A + PLG"
  sampleSize: number;
  meanTheta: number;
  medianTheta: number;
  p25Theta: number;
  p75Theta: number;
  dimensionMeans: Record<DimensionKey, number>;
}
```

### Percentile computation

Use normal distribution approximation: estimate standard deviation from the IQR (`(p75 - p25) / 1.349`), then compute z-score `(userScore - meanTheta) / sigma`, then convert to percentile using the cumulative distribution function approximation. Clamp output to 1-99.

### BenchmarkComparison type

```typescript
interface BenchmarkComparison {
  cohortLabel: string;
  sampleSize: number;
  percentile: number;
  dimensionDeltas: Record<DimensionKey, number>; // positive = above mean
  dimensionMeans: Record<DimensionKey, number>; // cohort mean per dimension
  topStrength: { dimension: DimensionKey; delta: number };
  keyGap: { dimension: DimensionKey; delta: number };
}
```

### Input validation rules (API)

- `fundingStage` must be one of the valid cohort stages: `"seed"`, `"series-a"`, `"series-b"`, `"growth"`
- `growthEngine` must be one of: `"plg"`, `"slg"`, `"clg"`
- Both parameters are required; missing either returns 400
- Invalid values return 400 with descriptive error message

### Edge cases

- User theta exactly at cohort mean: percentile should be 50
- All dimension scores equal to cohort means: all deltas are 0, topStrength and keyGap pick the first dimension alphabetically (or any consistent tiebreaker)
- Very high/low scores: percentile clamped to 1-99 (never 0 or 100)

## UX concept

### Component tree

```
ResultsPage (existing)
  └─ Overview tab
       ├─ GrowthEnginePanel (existing)
       ├─ InsightsPanel (existing)
       ├─ BenchmarkComparisonPanel (NEW)
       │    ├─ CohortHeader — label + sample size
       │    ├─ PercentileBar — horizontal bar showing user position in distribution
       │    ├─ DimensionComparisonChart — horizontal bars, user vs cohort (Recharts BarChart)
       │    ├─ StrengthCallout — top strength highlight
       │    └─ GapCallout — key gap highlight
       ├─ DimensionScorecard (existing)
       └─ WhatIfPanel (existing)
```

Note: CohortHeader, PercentileBar, DimensionComparisonChart, StrengthCallout, GapCallout are internal sections within BenchmarkComparisonPanel, not separate component files.

### Interaction flows

1. User completes assessment with enablers (funding stage) AND growth engine selected
2. `computeResult()` detects both are present, calls `getCohortBenchmark()` + `computePercentile()` + `computeDimensionGaps()`
3. Result includes `benchmarkComparison` field
4. ResultsPage Overview tab renders `BenchmarkComparisonPanel` with the data
5. If either enabler or growth engine is missing: `benchmarkComparison` is undefined, panel shows muted fallback message

### State & data flow

- `BenchmarkComparisonPanel` receives `benchmarkComparison` (or undefined) from `result` via Zustand store
- All computation happens in `computeResult()` at scoring time — no runtime API calls needed
- The `/api/benchmarks` endpoint exists for external consumers and future use, not for the panel itself

### Responsive behavior

- Dimension comparison chart stacks labels vertically on mobile (`< md`); horizontal bars remain
- Percentile bar is full-width at all breakpoints
- Strength/gap callouts stack vertically below `md`

### Accessibility

- Percentile bar has `role="meter"` with `aria-valuenow`, `aria-valuemin="1"`, `aria-valuemax="99"`, `aria-label`
- Dimension comparison bars have `aria-label` for each dimension with user score and cohort mean
- Color-coding (green/amber/red) is supplemented with text labels ("+12 above", "-8 below") so the information is not color-dependent
- All text content is accessible to screen readers

### Reuse check

- Recharts `BarChart` / `Bar` — already used in other panels (VelocityPanel)
- shadcn Card component — used throughout results panels
- Tailwind color utilities for green/amber/red — consistent with existing color patterns

## Validation criteria

1. Navigating to results with a Series A + PLG assessment shows a "Peer Comparison" panel after InsightsPanel in the Overview tab
2. The panel displays a cohort label like "Series A + PLG companies (n=142)" with actual sample size
3. A percentile bar visualizes the user's position (e.g., "62nd percentile")
4. Six horizontal bars show user score vs cohort mean for each dimension, color-coded green/amber/red
5. A "Top strength" callout shows the dimension with the largest positive delta
6. A "Key gap" callout shows the dimension with the largest negative delta (or smallest positive if all above)
7. When enablers or growth engine is missing, a muted message appears instead: "Complete the enabler and growth engine steps to see peer benchmarks"
8. `GET /api/benchmarks?fundingStage=series-a&growthEngine=plg` returns 200 with cohort data
9. `GET /api/benchmarks?fundingStage=invalid&growthEngine=plg` returns 400
10. `GET /api/benchmarks` with no params returns 400

## Test cases

### Pure-function tests (`industry-benchmarks.test.ts`)

1. **TC1**: `getCohortBenchmark('series-a', 'plg')` returns a valid `CohortBenchmark` with all required fields (meanTheta, medianTheta, p25Theta, p75Theta, dimensionMeans with 6 keys, sampleSize > 0)
2. **TC2**: `getCohortBenchmark('invalid' as any, 'plg')` returns `null`
3. **TC3**: `getCohortBenchmark('series-a', 'hybrid' as any)` returns `null`
4. **TC4**: `computePercentile(50, cohortWithMean45AndP25_35_P75_55)` returns a value > 50 (user above mean)
5. **TC5**: `computePercentile(30, cohortWithMean60)` returns a value < 50 (user below mean)
6. **TC6**: `computePercentile(45, cohortWithMean45)` returns exactly 50 (user at mean)
7. **TC7**: `computePercentile(200, anyValidCohort)` returns at most 99 (clamped)
8. **TC8**: `computePercentile(-50, anyValidCohort)` returns at least 1 (clamped)
9. **TC9**: `computeDimensionGaps({strategy: 70, ...}, {strategy: 60, ...})` returns `strategy: +10` (positive delta for above-mean)
10. **TC10**: `computeDimensionGaps({strategy: 40, ...}, {strategy: 60, ...})` returns `strategy: -20` (negative delta for below-mean)

### Engine integration tests (`engine.test.ts` additions)

11. **TC11**: `computeResult()` with valid enablers (fundingStage='series-a') + growthEngine='plg' produces `result.benchmarkComparison` with cohortLabel, percentile (1-99), dimensionDeltas (6 keys), topStrength, keyGap
12. **TC12**: `computeResult()` without growthEngine produces `result.benchmarkComparison` as undefined
13. **TC13**: `computeResult()` without enablers produces `result.benchmarkComparison` as undefined

### API route tests (`benchmarks.test.ts`)

14. **TC14**: GET with `?fundingStage=series-a&growthEngine=plg` returns status 200 with JSON containing meanTheta, medianTheta, sampleSize
15. **TC15**: GET with `?fundingStage=invalid&growthEngine=plg` returns status 400
16. **TC16**: GET with no query params returns status 400
17. **TC17**: GET with valid fundingStage but missing growthEngine returns status 400

### Component rendering tests (`benchmarkComparison.test.tsx`)

18. **TC18**: `BenchmarkComparisonPanel` with valid benchmarkComparison renders cohort label text containing sample size (e.g., "n=142")
19. **TC19**: `BenchmarkComparisonPanel` with valid benchmarkComparison renders percentile bar with correct `aria-valuenow`
20. **TC20**: `BenchmarkComparisonPanel` with valid benchmarkComparison renders 6 dimension comparison entries
21. **TC21**: `BenchmarkComparisonPanel` with valid benchmarkComparison renders top strength callout with dimension name
22. **TC22**: `BenchmarkComparisonPanel` with valid benchmarkComparison renders key gap callout with dimension name
23. **TC23**: `BenchmarkComparisonPanel` with `benchmarkComparison={undefined}` renders fallback message "Complete the enabler and growth engine steps to see peer benchmarks"

## Decisions made by Claude

1. **(low)** Cohort key format uses `"${fundingStage}:${growthEngine}"` string concatenation for internal lookup — simple and readable, no need for a compound key type
2. **(low)** Excluded `"pre-seed"` and empty-string funding stages from cohorts — insufficient data to form meaningful benchmarks at pre-seed; matches the 4 stages in the requirements (seed, series-a, series-b, growth)
3. **(low)** Excluded `"hybrid"` growth engine from cohorts — hybrid is a meta-category that blends PLG/SLG/CLG and would not produce a meaningful peer comparison; requirements specify 3 growth engines
4. **(medium)** Percentile calculation uses normal distribution approximation via IQR-estimated sigma rather than storing full distributions — simpler implementation with reasonable accuracy for cohort sizes of 50-200+; the approximation is standard for this type of benchmarking
5. **(low)** Sub-components (CohortHeader, PercentileBar, etc.) are sections within BenchmarkComparisonPanel, not separate files — keeps file count low and matches the pattern of other results panels which are self-contained
6. **(medium)** `benchmarkComparison` is computed eagerly inside `computeResult()` rather than lazily in the component — matches the existing pattern where all derived data (coordination, interventionModel, caseStudies) is computed in the engine and attached to the result object
7. **(low)** Percentile clamped to 1-99 range — avoids confusing "0th percentile" or "100th percentile" displays which imply the user is the absolute worst/best
8. **(low)** `"series-c"` funding stage excluded from cohorts — requirements specify 4 funding stages x 3 growth engines = 12 cohorts; mapping the 4 stages to seed/series-a/series-b/growth matches the requirements and the most common assessment segments. Series-C is grouped with growth stage for cohort purposes.
