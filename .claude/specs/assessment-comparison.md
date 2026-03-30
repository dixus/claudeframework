# Spec: Assessment Comparison

## Goal

Add a side-by-side comparison view that lets users select two saved assessments and see a structured breakdown of score changes, dimension deltas, capability shifts, and level transitions.

## Requirements

- New pure-TS scoring module `assessment-comparison.ts` with `computeAssessmentComparison(a, b)` returning an `AssessmentComparison` object (theta delta, per-dimension deltas, capability deltas, most-improved/most-regressed, level change)
- New `AssessmentComparison` type added to `types.ts`
- New API route `GET /api/assessments/compare?before=<hash>&after=<hash>` returning both assessment snapshots with metadata
- New `ComparisonPanel` component rendering the comparison view (theta summary, dimension table, capability table, highlights, back button)
- Assessment selector ("Compare with...") dropdown on saved results pages when 2+ assessments exist for the email
- Comparison view replaces normal results view when `?compare=<hash>` query param is present

## Out of scope

- Comparing more than 2 assessments simultaneously
- Comparing assessments from different emails/companies
- Exporting comparison as PDF
- Sharing comparison via URL (the compare param is ephemeral)
- Dimension-level question breakdown in comparison view
- Changes to the in-session `ResultsPage` component (only the saved results page `ResultsPageClient` is affected)

## Affected files

| File | Change |
|------|--------|
| `src/lib/scoring/types.ts` | Add `AssessmentComparison` interface |
| `src/app/results/[hash]/ResultsPageClient.tsx` | Add `compare` query param detection, conditionally render `ComparisonPanel` instead of normal view; add assessment selector dropdown |
| `src/app/results/[hash]/page.tsx` | Pass `hash` prop down to `ResultsPageClient` so the comparison view knows the current assessment hash |

## New files

| File | Purpose |
|------|---------|
| `src/lib/scoring/assessment-comparison.ts` | Pure-TS `computeAssessmentComparison` function |
| `src/lib/scoring/assessment-comparison.test.ts` | Unit tests for comparison logic (TC1-TC9) |
| `src/app/api/assessments/compare/route.ts` | API route returning two assessments by hash |
| `src/app/api/assessments/compare/compare.test.ts` | API route tests (TC10-TC13) |
| `src/components/results/ComparisonPanel.tsx` | Comparison view component (theta summary, dimension table, capability table, highlights) |
| `src/components/results/AssessmentSelector.tsx` | "Compare with..." dropdown button |
| `src/components/results/comparison.test.tsx` | Component rendering tests (TC14-TC20) |

## Patterns to mirror

1. **`src/lib/scoring/progress-tracking.ts`** — closest analog: pure-TS module that computes deltas between assessments, exports typed functions consuming `AssessmentResult`, uses `DIMENSION_LABELS` lookup. Mirror the `computeProgressDelta` function structure.
2. **`src/app/api/assessments/history/route.ts`** — API route pattern: imports `db`, `assessments` schema, queries by column, returns JSON. Mirror for the compare route.
3. **`src/components/results/ProgressTimelinePanel.tsx`** — client component that fetches history via `useEffect`, handles loading/error states, uses the cancelled-fetch pattern. Mirror for `ComparisonPanel` data fetching.

## Implementation notes

### Comparison scoring module

`computeAssessmentComparison(a: AssessmentResult, b: AssessmentResult): AssessmentComparison`

- `a` is always "before", `b` is always "after" — the function does not sort by date
- Theta delta: `b.thetaScore - a.thetaScore`
- Dimension deltas: iterate `b.dimensions`, find matching `a.dimensions` by key, compute `scoreAfter - scoreBefore`
- Most improved: dimension with highest positive delta; `null` if no positive deltas
- Most regressed: dimension with most negative delta; `null` if no negative deltas
- Capabilities: if both `a.capabilities` and `b.capabilities` exist, compute deltas; otherwise `null`
- Level change: compare `a.level.level` vs `b.level.level`

### Dimension labels

Reuse the `DIMENSION_LABELS` constant pattern from `progress-tracking.ts`. Define locally in `assessment-comparison.ts` (same 6-entry record).

### API route

- Route: `src/app/api/assessments/compare/route.ts`
- Validate both `before` and `after` query params present and non-empty; return 400 if missing
- Query DB for both hashes; return 404 if either not found
- Return: `{ before: { result, createdAt, companyName }, after: { result, createdAt, companyName } }`
- Use `eq()` from drizzle-orm, same pattern as existing assessment routes

### ComparisonPanel component

- Receives `currentHash`, `compareHash`, and `email` as props
- Fetches from `/api/assessments/compare?before=<currentHash>&after=<compareHash>` on mount
- Calls `computeAssessmentComparison(before.result, after.result)` client-side after fetch
- Renders: theta summary card, dimension comparison table (6 rows), capability comparison (4 rows, conditional), highlights card, back button
- Loading state: skeleton placeholder (simple animated pulse div, like ProgressTimelinePanel)
- Error state: inline error message with retry option
- Color coding: green (`text-green-600`) for delta > 0, red (`text-red-600`) for delta < 0, gray (`text-gray-400`) for delta === 0
- Delta badges: `+N` / `-N` / `0` format
- Back button: removes `?compare` param, returning to normal results view

### AssessmentSelector component

- Receives `email`, `currentHash` as props
- Fetches assessment history from `/api/assessments/history?email=<email>` on mount (same pattern as ProgressTimelinePanel)
- Filters out the current assessment hash
- If fewer than 1 other assessment exists, renders nothing
- Otherwise renders a dropdown button "Compare with..." listing other assessments as: "Mar 22, 2026 — theta 64" sorted by date descending
- On selection: sets `?compare=<selectedHash>` query param via `router.push`

### ResultsPageClient changes

- Read `compare` query param from URL via `useSearchParams()`
- If `compare` param present: render `ComparisonPanel` instead of the normal tabbed view
- Pass `hash` (from parent page.tsx) as prop for current assessment identification

### Scope boundary (explicit)

- Do NOT modify `ResultsPage.tsx` (the in-session results page) — only `ResultsPageClient.tsx` (saved results page)
- Do NOT modify existing scoring modules
- Do NOT add new DB columns or tables
- Do NOT modify the history API endpoint
- The comparison module must not import React

## UX concept

### Component tree

```
ResultsPageClient (modified)
  ├── AssessmentSelector (new) — dropdown in header area
  │     └── uses shadcn DropdownMenu or simple select
  └── [conditional on ?compare param]
      ├── ComparisonPanel (new) — replaces normal results view
      │     ├── Theta summary card (inline)
      │     ├── Dimension comparison table (inline, 6 rows)
      │     ├── Capability comparison table (inline, 4 rows, conditional)
      │     ├── Highlights card (inline)
      │     └── Back button (inline)
      └── [normal tabbed results view — existing, unchanged]
```

### Interaction flows

1. User visits `/results/<hash>` (saved result page)
2. Page loads normally; AssessmentSelector fetches history in background
3. If 2+ assessments exist for this email, "Compare with..." button appears in header
4. User clicks "Compare with..." → dropdown shows other assessments by date and theta
5. User selects an assessment → URL becomes `/results/<hash>?compare=<otherHash>`
6. ComparisonPanel replaces normal view, fetches comparison data, renders side-by-side
7. User clicks "Back to results" → `?compare` param removed, normal view restored

### State & data flow

- `AssessmentSelector`: local state for history list (fetched from history API), dropdown open/closed
- `ComparisonPanel`: local state for comparison data (fetched from compare API), loading/error states
- No Zustand store changes — all state is component-local and URL-driven
- `computeAssessmentComparison` is called client-side after the compare API returns both assessment snapshots

### Responsive behavior

- Dimension table stacks labels above score pairs below `sm` breakpoint
- Theta summary card remains single-column at all sizes
- Dropdown menu width constrained to prevent overflow on mobile

### Accessibility

- Dropdown button has `aria-haspopup="listbox"` and `aria-expanded`
- Each dropdown item is keyboard-navigable (arrow keys, Enter to select, Escape to close)
- Delta values include `aria-label` with descriptive text (e.g., "Strategy improved by 12 points")
- Color coding is supplemented with +/- text signs (not color-only)
- Back button is a standard link/button, keyboard-reachable
- Loading state has `aria-busy="true"`

### Reuse check

- Reuse shadcn `Card` for summary and highlights cards
- Reuse existing Tailwind color patterns (`text-green-600`, `text-red-600`, `text-gray-400`)
- Reuse the cancelled-fetch pattern from `ProgressTimelinePanel`
- Reuse the history API endpoint (no new list endpoint needed)
- Consider reusing `DimensionScorecard` visual style for dimension rows

## Validation criteria

- Navigating to `/results/<hash>` shows "Compare with..." button when 2+ assessments exist for the email
- "Compare with..." button is hidden when only 1 assessment exists or no email is associated
- Selecting an assessment from dropdown navigates to `/results/<hash>?compare=<otherHash>`
- Comparison view shows theta before, theta after, and delta with correct sign and color
- Comparison view shows 6 dimension rows with before/after scores and colored deltas
- Comparison view shows capability comparison (4 rows) when both assessments have capabilities
- Comparison view shows "Most improved" and "Most regressed" highlights (or omits them when all deltas are zero or same sign)
- "Back to results" returns to normal single-assessment view
- Loading skeleton displays while comparison data is fetching
- API returns 400 for missing params, 404 for unknown hashes

## Test cases

### Pure-function tests (`assessment-comparison.test.ts`)

- **TC1**: `computeAssessmentComparison` with higher "after" theta returns positive `thetaDelta`
- **TC2**: `computeAssessmentComparison` with lower "after" theta returns negative `thetaDelta`
- **TC3**: `computeAssessmentComparison` with level change returns `levelChanged: true` and correct before/after levels
- **TC4**: `computeAssessmentComparison` returns 6 dimension entries with correct deltas
- **TC5**: `computeAssessmentComparison` identifies correct `mostImproved` dimension (highest positive delta)
- **TC6**: `computeAssessmentComparison` identifies correct `mostRegressed` dimension (most negative delta)
- **TC7**: `computeAssessmentComparison` with no regressed dimensions returns `mostRegressed: null`
- **TC8**: `computeAssessmentComparison` where both assessments lack capabilities returns `capabilities: null`
- **TC9**: `computeAssessmentComparison` where both have capabilities returns 4 capability entries with deltas

### API route tests (`compare.test.ts`)

- **TC10**: GET with valid `before` and `after` hashes returns 200 with both assessments
- **TC11**: GET with missing `before` parameter returns 400
- **TC12**: GET with non-existent hash returns 404
- **TC13**: GET with both params missing returns 400

### Component rendering tests (`comparison.test.tsx`)

- **TC14**: `ComparisonPanel` renders theta delta with correct sign and color
- **TC15**: `ComparisonPanel` renders 6 dimension rows with before/after scores
- **TC16**: `ComparisonPanel` renders level change badge when levels differ
- **TC17**: `ComparisonPanel` renders "Most improved" and "Most regressed" callouts
- **TC18**: `ComparisonPanel` renders loading skeleton before fetch resolves
- **TC19**: `ComparisonPanel` renders "Back to results" link
- **TC20**: Assessment selector dropdown shows other assessments when history has 2+ entries

## Decisions made by Claude

1. **(low)** Placed the compare API route at `src/app/api/assessments/compare/route.ts` (nested under existing `assessments/` API directory) — follows the existing `history/` route pattern.

2. **(low)** Separated `AssessmentSelector` into its own component file rather than inlining in `ResultsPageClient` — keeps the dropdown logic isolated and testable (TC20). The selector fetches history independently, same pattern as `ProgressTimelinePanel`.

3. **(medium)** Comparison computation runs client-side after the API returns raw assessment snapshots, rather than server-side in the API route. Rationale: the compare API returns raw `resultSnapshot` objects (same as the history API), and `computeAssessmentComparison` is a pure function that runs instantly. This keeps the API simple (data retrieval only) and the scoring engine framework-agnostic. Risk: if `AssessmentResult` shape changes, both client and server must stay in sync — but this is already the case for all existing scoring functions.

4. **(low)** Used URL query param `?compare=<hash>` rather than a separate route like `/results/<hash>/compare/<otherHash>`. This matches the PRD requirement that the compare param is "ephemeral" and avoids adding a new dynamic route segment. The dropdown simply pushes a new URL with the query param.

5. **(low)** The `ComparisonPanel` uses local component state for fetched data (not Zustand). The comparison is ephemeral and view-specific — no other component needs access to it. This matches the pattern used by `ProgressTimelinePanel`.

6. **(medium)** The compare API determines "before" and "after" based on the query param names, not by date. The caller (ComparisonPanel) passes `currentHash` as `before` and `compareHash` as `after`. This means the comparison always shows "current assessment vs. selected assessment" with the current one as the baseline. The PRD says the function is symmetric and treats `a` as before based on caller ordering.

7. **(low)** Delta formatting uses `+N` / `-N` / `0` text alongside color coding to ensure accessibility without relying on color alone. This follows the PRD color-coding spec while adding non-visual differentiation.
