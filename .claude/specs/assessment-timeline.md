# Spec: Assessment Timeline & Progress Tracking

## Goal

Add a progress tracking system that connects multiple saved assessments from the same company (by email) into a timeline, computes score deltas between assessments, and visualizes the trajectory in a new results panel on the saved results page.

## Requirements

- Create a `progress-tracking.ts` scoring module with three pure functions: `computeProgressDelta`, `computeProgressSummary`, `getProgressInsight`
- Add `ProgressDelta` and `ProgressSummary` interfaces to `types.ts`
- Create `GET /api/assessments/history?email=...` API route returning chronologically sorted assessment history for an email, limited to 20 results
- Create `ProgressTimelinePanel` component shown on saved results pages (`/results/[hash]`) in the Overview tab, after `BenchmarkComparisonPanel` (which does not exist in `ResultsPageClient` — it goes after `InsightsPanel`)
- Panel only renders when: assessment is saved (has hash), email is on record, and history contains 2+ assessments
- Panel content: theta trend line chart (Recharts), "since last assessment" summary card, 6 dimension sparkline indicators, progress insight text
- Panel is self-contained: fetches its own data via the history API, does not modify existing types or scoring engine

## Out of scope

- Assessment diffing (side-by-side comparison of two specific assessments)
- Email notifications or reminders to re-assess
- Team/organization-level progress (multiple users)
- Custom date range filtering
- Progress sharing or progress-specific PDF export
- Editing or deleting past assessments
- Changes to the live results page (`ResultsPage.tsx` in `components/results/`) — the panel only appears on saved results accessed via `/results/[hash]`
- Schema migrations — the existing `assessments` table already has `email`, `overall_score`, `dimension_scores`, `result_snapshot`, and `created_at`

## Affected files

| File | Change |
|------|--------|
| `src/lib/scoring/types.ts` | Add `ProgressDelta` and `ProgressSummary` interfaces |
| `src/app/results/[hash]/ResultsPageClient.tsx` | Import and render `ProgressTimelinePanel` in the overview tab after `InsightsPanel`; pass `result` and `email` props |
| `src/app/results/[hash]/page.tsx` | Pass `email` from the DB row to `ResultsPageClient` |

## New files

| File | Purpose |
|------|---------|
| `src/lib/scoring/progress-tracking.ts` | Pure TS module: `computeProgressDelta`, `computeProgressSummary`, `getProgressInsight` |
| `src/lib/scoring/progress-tracking.test.ts` | Unit tests for all three functions (TC1–TC11) |
| `src/app/api/assessments/history/route.ts` | GET endpoint returning assessment history by email |
| `src/app/api/assessments/history/history.test.ts` | API route tests (TC12–TC14) |
| `src/components/results/ProgressTimelinePanel.tsx` | Self-contained panel with chart, summary card, sparklines, insight |
| `src/components/results/progressTimeline.test.tsx` | Component rendering tests (TC15–TC20) |

## Patterns to mirror

1. **`src/lib/scoring/coordination.ts`** — pure scoring module with typed inputs/outputs, exported functions, no React imports. Follow the same pattern for `progress-tracking.ts`.
2. **`src/app/api/assessments/[hash]/route.ts`** — API route using Drizzle ORM to query the `assessments` table. Follow for the history endpoint (same `db`, `assessments` schema import, `eq` from drizzle-orm).
3. **`src/components/results/BenchmarkComparisonPanel.tsx`** — results panel using Recharts for charts, Tailwind for styling, typed props. Follow for `ProgressTimelinePanel`.

## Implementation notes

### Progress tracking module (`progress-tracking.ts`)

- `computeProgressDelta(current: AssessmentResult, previous: AssessmentResult): ProgressDelta`
  - `thetaDelta` = `current.thetaScore - previous.thetaScore`
  - `dimensionDeltas`: iterate `current.dimensions`, find matching dimension in `previous.dimensions` by key, compute delta
  - `levelChanged`: compare `current.level.level !== previous.level.level`
  - `velocityDelta`: if both have `scalingVelocity`, compute `current.scalingVelocity.s - previous.scalingVelocity.s`; otherwise `null`
  - `daysBetween`: must be provided by caller (from `createdAt` dates); add as a required parameter or compute from dates passed alongside results

- `computeProgressSummary(history: AssessmentResult[]): ProgressSummary`
  - `trend`: compute average theta change across consecutive pairs; `|avg| < 3` = stable, positive = improving, negative = declining
  - `fastestImproving` / `mostRegressed`: compare first and last assessment dimension scores; pick dimension with largest positive/negative delta. Return `null` if only 1 assessment
  - `levelTransitions`: count consecutive pairs where level changed
  - `timelinePoints`: map each result to `{ date, theta, level, dimensions }` — date must be passed alongside results since `AssessmentResult` has no `createdAt`

- `getProgressInsight(delta: ProgressDelta): string`
  - Find the dimension with the largest positive delta
  - Template: "Strong improvement in {dimension} (+{delta}) drove your theta up {thetaDelta} points since last assessment"
  - If theta declined, adjust wording accordingly
  - If all dimensions are flat (all deltas within +/-2), return a stability message

### Timeline data shape

`AssessmentResult` does not contain `createdAt`. The history API returns `createdAt` alongside each result snapshot. The `computeProgressSummary` function needs dates for `timelinePoints`. Solution: accept an array of `{ result: AssessmentResult; createdAt: string }` instead of bare `AssessmentResult[]`. Similarly, `computeProgressDelta` needs `daysBetween` — accept two `{ result: AssessmentResult; createdAt: string }` objects and compute `daysBetween` internally.

Updated signatures:
```typescript
interface TimestampedResult {
  result: AssessmentResult;
  createdAt: string; // ISO date
}

function computeProgressDelta(current: TimestampedResult, previous: TimestampedResult): ProgressDelta;
function computeProgressSummary(history: TimestampedResult[]): ProgressSummary;
function getProgressInsight(delta: ProgressDelta): string;
```

### History API endpoint

- Route: `src/app/api/assessments/history/route.ts`
- Query: `SELECT hash, created_at, overall_score, dimension_scores, result_snapshot FROM assessments WHERE email = ? ORDER BY created_at ASC LIMIT 20`
- Use Drizzle: `db.select({ hash, createdAt, overallScore, dimensionScores, resultSnapshot }).from(assessments).where(eq(assessments.email, email)).orderBy(asc(assessments.createdAt)).limit(20)`
- Import `asc` from `drizzle-orm`
- Input validation: return 400 if `email` query param is missing or empty string
- Return 200 with empty array if no rows found

### ProgressTimelinePanel component

- Props: `{ result: AssessmentResult; email: string | null }`
- Early return `null` if `email` is null
- `useEffect` fetches `/api/assessments/history?email=${encodeURIComponent(email)}` on mount
- State: `history: TimestampedResult[] | null` (null = loading), `error: boolean`
- After fetch: if fewer than 2 results, render nothing
- Find current assessment in history (match by theta + company name or just use last entry), compute delta against second-to-last
- Render:
  - Section header in a Card: "Progress Timeline" h3, "Tracking N assessments" subtitle
  - Recharts `LineChart` with `ResponsiveContainer`: x = date (formatted), y = theta (0-100), `Line` with dots. Level transition points get a different fill color on the dot
  - "Since last assessment" summary card: theta delta with green/red arrow, level transition badge, days since last
  - 6 dimension sparklines: small flex row, each showing dimension label + arrow icon (up/down/flat) + delta value
  - Progress insight: muted text paragraph from `getProgressInsight`
- Loading state: show a Card with a pulsing skeleton (animated bg-gray-200 blocks)

### Passing email to ResultsPageClient

The `page.tsx` server component already has access to `row.email` from the DB query. Add `email` to the props passed to `ResultsPageClient`. Update `ResultsPageClientProps` to include `email: string | null`.

### Input validation edge cases

- Email parameter with special characters: use `encodeURIComponent` on the client side
- History with only 1 assessment: panel does not render (no fallback message needed per PRD)
- Dimension keys mismatch between old and new assessments: if a dimension is missing from a previous assessment, treat its score as 0

### Scope boundaries

- Do NOT modify `computeResult()` or `AssessmentResult`
- Do NOT modify the live results page (`ResultsPage.tsx`)
- Do NOT add any new database columns or tables
- The `ProgressTimelinePanel` is strictly additive — removing it leaves the app unchanged

## UX concept

### Component tree

```
ResultsPageClient (existing, modified)
  └── ProgressTimelinePanel (new)
        ├── LoadingSkeleton (inline, conditional)
        ├── TimelineHeader (section header + subtitle)
        ├── ThetaTrendChart (Recharts LineChart in ResponsiveContainer)
        ├── DeltaSummaryCard (theta delta, level badge, days)
        ├── DimensionSparklines (6x inline indicators)
        └── ProgressInsight (text paragraph)
```

All sub-sections are rendered inline within `ProgressTimelinePanel` — no separate component files needed. The panel is a single self-contained component.

### Interaction flows

1. User navigates to `/results/[hash]` for a saved assessment with an email
2. `ResultsPageClient` renders with `email` prop
3. `ProgressTimelinePanel` mounts, shows loading skeleton
4. Fetches history from `/api/assessments/history?email=...`
5. If history has 2+ assessments: renders timeline chart, delta summary, sparklines, insight
6. If history has <2 assessments: renders nothing (unmounts silently)
7. If fetch fails: renders nothing (fails silently — the panel is supplementary)

### State & data flow

- `ProgressTimelinePanel` owns all its state locally (no Zustand):
  - `history: TimestampedResult[] | null` — fetched assessment history
  - `error: boolean` — fetch failure flag
- Data flow: `page.tsx` reads `row.email` from DB → passes to `ResultsPageClient` → passes to `ProgressTimelinePanel` → panel fetches history independently
- Scoring computations (`computeProgressDelta`, `computeProgressSummary`, `getProgressInsight`) run client-side after fetch completes

### Responsive behavior

- Chart: `ResponsiveContainer` width="100%" height={250} handles all breakpoints
- Delta summary card + sparklines: use `flex-wrap` so they stack vertically below `sm` breakpoint
- Dimension sparklines: grid `grid-cols-3` on `md+`, `grid-cols-2` on `sm`, `grid-cols-1` below

### Accessibility

- Chart: add `role="img"` and `aria-label="Theta score trend over time"` on the chart container
- Delta values: use `aria-label` to describe direction (e.g., "Theta increased by 8 points")
- Sparkline arrows: use `aria-hidden="true"` on decorative arrow icons; the delta value text is the accessible content
- Loading skeleton: add `aria-busy="true"` and `aria-label="Loading progress timeline"`

### Reuse check

- `Recharts` — already used by `RadarChartPanel`, `BenchmarkComparisonPanel`, `CoordinationPanel`
- shadcn `Card` pattern — used throughout results panels
- Tailwind utility classes — consistent with all existing panels
- No new dependencies needed

## Validation criteria

1. Navigating to `/results/[hash]` for an email with 3+ saved assessments shows the "Progress Timeline" panel in the Overview tab
2. The theta trend chart displays a line with one dot per assessment, x-axis showing dates, y-axis showing scores 0-100
3. The "Since last assessment" card shows the correct theta delta with a directional arrow (green for positive, red for negative)
4. All 6 dimension sparklines display with correct delta values and directional indicators
5. The progress insight text reflects the strongest dimension change
6. Navigating to `/results/[hash]` for an email with only 1 saved assessment does NOT show the progress panel
7. The panel shows a loading skeleton before the history API responds
8. `GET /api/assessments/history?email=test@example.com` returns 200 with an array of assessment records sorted by `createdAt` ascending
9. `GET /api/assessments/history` (no email) returns 400
10. All three scoring functions (`computeProgressDelta`, `computeProgressSummary`, `getProgressInsight`) are pure TypeScript with no React imports

## Test cases

### Pure-function tests (`src/lib/scoring/progress-tracking.test.ts`)

- **TC1:** `computeProgressDelta` with current theta 80, previous theta 60 returns `thetaDelta: 20`
- **TC2:** `computeProgressDelta` with current theta 50, previous theta 70 returns `thetaDelta: -20`
- **TC3:** `computeProgressDelta` with current level 3, previous level 2 returns `levelChanged: true`, `previousLevel: 2`, `currentLevel: 3`
- **TC4:** `computeProgressDelta` with same level on both returns `levelChanged: false`
- **TC5:** `computeProgressDelta` with strategy score 80 (current) vs 60 (previous) returns `dimensionDeltas.strategy: 20`; test at least one negative delta too
- **TC6:** `computeProgressDelta` where previous has no `scalingVelocity` returns `velocityDelta: null`
- **TC7:** `computeProgressSummary` with 3 assessments where theta increases each time returns `trend: 'improving'`
- **TC8:** `computeProgressSummary` with 3 assessments where theta changes by less than 3 on average returns `trend: 'stable'`
- **TC9:** `computeProgressSummary` with architecture improving most across 3 assessments returns `fastestImproving.dimension: 'architecture'`
- **TC10:** `computeProgressSummary` with 1 assessment returns `assessmentCount: 1`, `fastestImproving: null`, `mostRegressed: null`
- **TC11:** `getProgressInsight` with a delta where architecture improved by 15 and theta by 8 returns a string containing "Architecture" and "+15"

### API route tests (`src/app/api/assessments/history/history.test.ts`)

- **TC12:** GET with `?email=test@example.com` and mocked DB returning 2 rows returns 200 with array of 2 assessment objects containing `hash`, `createdAt`, `overallScore`, `dimensionScores`
- **TC13:** GET with no email parameter returns 400 with error message
- **TC14:** GET with `?email=nobody@example.com` and mocked DB returning 0 rows returns 200 with empty array

### Component rendering tests (`src/components/results/progressTimeline.test.tsx`)

- **TC15:** `ProgressTimelinePanel` renders heading "Progress Timeline" when `fetch` is mocked to return 3 assessments
- **TC16:** `ProgressTimelinePanel` renders theta delta with "+" prefix when delta is positive
- **TC17:** `ProgressTimelinePanel` renders 6 dimension indicator elements (one per dimension)
- **TC18:** `ProgressTimelinePanel` renders insight text containing the strongest improving dimension name
- **TC19:** `ProgressTimelinePanel` renders nothing (empty DOM) when fetch returns only 1 assessment
- **TC20:** `ProgressTimelinePanel` shows element with `aria-busy="true"` before fetch resolves

## Decisions made by Claude

1. **(medium)** Added `TimestampedResult` wrapper interface instead of modifying `AssessmentResult` to include `createdAt`. This keeps the scoring engine types clean and avoids a breaking change. The wrapper pairs a result with its database timestamp.

2. **(low)** Placed the progress panel after `InsightsPanel` in `ResultsPageClient` (saved results page) rather than after `BenchmarkComparisonPanel`, because `ResultsPageClient` does not render `BenchmarkComparisonPanel`. The live `ResultsPage.tsx` does, but the progress panel only applies to saved results.

3. **(low)** All sub-components (header, chart, summary card, sparklines, insight) are rendered inline within `ProgressTimelinePanel` rather than split into separate component files. This keeps the feature self-contained in a single file.

4. **(low)** Dimension sparklines use simple arrow icons + delta values rather than actual mini line charts. The PRD specified "arrow icon (up/down/flat) with the delta value, not full charts."

5. **(medium)** The panel fails silently on fetch errors (renders nothing). Since the progress timeline is supplementary and non-critical, this avoids error states cluttering the results page.

6. **(low)** Used `grid-cols-3` / `grid-cols-2` / `grid-cols-1` responsive breakpoints for dimension sparklines to ensure readability at all screen sizes.

7. **(medium)** `computeProgressSummary` accepts `TimestampedResult[]` (result + createdAt pairs) rather than bare results, so it can populate `timelinePoints[].date` without requiring a separate date array.
