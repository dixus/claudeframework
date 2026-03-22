# Spec: UX Polish — Progress Persistence & Gating Clarity

## Goal

Eliminate two UX friction points: lost assessment progress on tab close, and confusing gating-rule feedback on the results page; plus add social sharing meta tags to saved result pages.

## Requirements

### A. Progress persistence (localStorage)

- Persist Zustand assessment state to `localStorage` under key `ai-maturity-assessment-progress` on every state change (answer, step, enabler, etc.)
- Persisted fields: `step`, `companyName`, `responses`, `enablers`, `capabilityResponses`, `growthEngine`, `phase`, `screeningIndex`, `adaptiveLevels`, `deepDiveQueue`, `deepDivePosition`, `answeredQuestions`
- Do NOT persist: `result` (recomputed on submit)
- On app load (assessment page): if saved state exists, show a dismissible banner — "Resume your assessment?" with **Resume** and **Start Fresh** buttons
- On submit (results calculated): clear saved state from localStorage
- On reset: clear saved state from localStorage
- Handle `answeredQuestions` serialization correctly (it is a `Set<string>` — serialize as array, deserialize back to Set)

### B. Gating rule explanation

- Add a `gatingDetails` array to `AssessmentResult` that lists each failed gate: `{ dimension: DimensionKey; dimensionLabel: string; score: number; threshold: number; targetLevel: number }`
- When `gated === true`, render a detailed callout on the `ScoreCard` replacing the current generic gating message
- Text per gate: "Your θ score qualifies for Level {rawLevel} ({rawLabel}), but {Dimension} at {score} is below the {threshold} minimum required. Improving {Dimension} to {threshold} would unlock Level {rawLevel} ({rawLabel})."
- If multiple gates are blocking, list all of them as separate lines
- Dimension name is a clickable anchor that scrolls to the DimensionScorecard (using `id` attributes)

### C. Social sharing meta tags

- Generate dynamic `<Metadata>` in the `/results/[hash]/page.tsx` server component using the assessment data from DB
- `og:title`: `"AI Maturity Score: Level {X} — {Label}"`
- `og:description`: `"θ {score}/100 — {Company} assessed across 6 dimensions of AI maturity"`
- `og:type`: `"website"`
- Twitter card: `summary_large_image`
- Use a static OG image from `public/og-default.png` (no dynamic generation)

## Out of scope

- Account system or server-side progress saving
- Email reminders or notifications
- Dynamic OG image generation API (e.g., `@vercel/og`)
- Assessment versioning or localStorage migration logic
- Cloud sync of progress across devices
- Changing the scoring engine formulas or gating thresholds
- Any changes to the assessment question flow or step order

## Affected files

| #   | File                                            | Change                                                                                                                               |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `src/store/assessmentStore.ts`                  | Add Zustand `persist` middleware with localStorage; add `clearSavedProgress()` action; serialize/deserialize `answeredQuestions` Set |
| 2   | `src/lib/scoring/types.ts`                      | Add `GatingDetail` interface; add optional `gatingDetails` field to `AssessmentResult`                                               |
| 3   | `src/lib/scoring/engine.ts`                     | Update `applyGating` to return detail array; populate `gatingDetails` in `computeResult`                                             |
| 4   | `src/components/results/ScoreCard.tsx`          | Replace generic gating message with detailed per-gate explanations; add anchor links to dimension names                              |
| 5   | `src/components/results/DimensionScorecard.tsx` | Add `id` attribute to dimension cards for scroll-to anchor                                                                           |
| 6   | `src/app/results/[hash]/page.tsx`               | Generate dynamic `Metadata` (OG + Twitter) from assessment row data                                                                  |
| 7   | `src/app/assessment/page.tsx`                   | Add `ResumeBanner` rendering logic (check localStorage, show banner)                                                                 |
| 8   | `src/lib/scoring/engine.test.ts`                | Add/update tests for `gatingDetails` output                                                                                          |
| 9   | `src/store/assessmentStore.test.ts`             | Add tests for persist/hydrate/clear localStorage behavior                                                                            |

## New files

| #   | File                                         | Purpose                                                                            |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `src/components/assessment/ResumeBanner.tsx` | Client component: "Resume your assessment?" banner with Resume/Start Fresh buttons |
| 2   | `public/og-default.png`                      | Static fallback OG image (1200x630, branded with app name)                         |

**Total file count: 11**

## Patterns to mirror

1. **`src/components/results/SaveResultsCard.tsx`** — client component that reads from Zustand store; same pattern for ResumeBanner reading persisted state
2. **`src/components/results/ScoreCard.tsx`** — existing gating UI that will be extended; follow its styling conventions (amber-50 bg, amber-200 border)
3. **`src/app/results/[hash]/page.tsx`** — server component with DB query and metadata export; extend the existing `metadata` export to be dynamic via `generateMetadata`

## Implementation notes

### A. Progress persistence

- Use Zustand's built-in `persist` middleware from `zustand/middleware` — do NOT write custom localStorage sync
- Configure `partialize` to exclude `result` from persistence
- The `answeredQuestions` field is a `Set<string>`. Zustand persist uses JSON serialization by default. Provide a custom `storage` option with `serialize`/`deserialize` that converts Set to/from array
- The `ResumeBanner` should be a client component rendered inside `AssessmentShell` or `AssessmentPage`, checking `localStorage` on mount via `useEffect` to avoid SSR hydration mismatch
- Banner should auto-dismiss after Resume or Start Fresh is clicked
- "Start Fresh" calls `reset()` which already resets all state; just also needs to clear localStorage (handled by persist middleware automatically since reset sets state to initial)

### B. Gating details

- `applyGating` currently returns `{ level, gated }`. Change signature to also return `gatingDetails: GatingDetail[]`
- Gating rules (hardcoded in engine, not configurable):
  - Level 3 requires: Workflow >= 70, Data >= 60, Adoption >= 50
  - Level 2 requires: Workflow >= 50, Data >= 40
- When gated, `rawLevel` on the result already tells us what level they _would_ have been. The `gatingDetails` array tells us exactly which dimensions fell short and by how much
- In `ScoreCard`, iterate `gatingDetails` and render each as a line item inside the amber callout. Dimension names are `<a href="#dim-{key}">` anchors

### C. Meta tags

- Next.js App Router supports `generateMetadata` as an async function export. Replace the static `metadata` export with `generateMetadata` that fetches the row and returns dynamic OG tags
- If the assessment is not found, return minimal metadata (no OG tags needed for 404 state)
- The static OG image at `public/og-default.png` should be 1200x630px with the app branding. It serves as the image for all shared links (no per-assessment dynamic images)

### Edge cases

- localStorage unavailable (private browsing, storage full): wrap persist in try/catch; degrade gracefully — assessment works normally, just no resume capability
- Corrupted localStorage data: validate shape on hydration; if invalid, clear and start fresh
- Multiple tabs: Zustand persist handles this via `storage` events; no special handling needed
- `gatingDetails` empty array when `gated === false`: ScoreCard should not render the amber callout at all

## UX concept

### Component tree

```
AssessmentPage
  └── ResumeBanner (NEW — conditionally rendered)
       ├── "Resume your assessment?" text
       ├── Resume button
       └── Start Fresh button
  └── AssessmentShell (existing)

ScoreCard (existing — enhanced)
  └── GatingExplanation (inline, not a separate component)
       └── per-gate line items with dimension anchor links

DimensionScorecard (existing — enhanced with id attributes)
```

### Interaction flows

**Resume flow:**

1. User opens `/assessment`
2. `ResumeBanner` checks localStorage for saved state
3. If found → banner appears: "You have an assessment in progress. Resume where you left off?"
4. User clicks **Resume** → Zustand hydrates from localStorage, banner dismisses
5. User clicks **Start Fresh** → `reset()` called, localStorage cleared, banner dismisses
6. If no saved state → banner does not render

**Gating explanation flow:**

1. User completes assessment and sees results
2. If `gated === true`, ScoreCard shows amber callout with specific dimension gates
3. User clicks dimension name → page scrolls to that dimension in the DimensionScorecard

### State & data flow

- **Persist middleware** wraps the existing Zustand store; no new store needed
- `ResumeBanner` reads hydration status from `useAssessmentStore` — Zustand persist exposes `hasHydrated` via `onRehydrateStorage`
- `gatingDetails` is computed in the pure scoring engine (`computeResult`), stored on `AssessmentResult`, and read by `ScoreCard` — no additional state management

### Responsive behavior

- `ResumeBanner`: full-width on mobile, max-width container on desktop; stacks buttons vertically below `sm` breakpoint
- Gating explanation: text wraps naturally; no special responsive handling needed

### Accessibility

- `ResumeBanner`: uses `role="alert"` for screen reader announcement; buttons are focusable and keyboard-operable
- Gating dimension links: standard `<a>` elements, keyboard-reachable, with descriptive text
- Scroll-to anchors use `scroll-margin-top` to account for sticky tab bar

### Reuse check

- No new UI library components needed — uses existing Tailwind utility classes and the amber callout pattern already in ScoreCard
- `ResumeBanner` follows the same card styling pattern as `SaveResultsCard`

## Validation criteria

1. Close the browser tab mid-assessment, reopen `/assessment` → resume banner appears with correct step
2. Click "Resume" → assessment restores to exact previous state (step, answers, phase)
3. Click "Start Fresh" → assessment starts from step 0, localStorage cleared
4. Complete assessment with a gating scenario (e.g., high θ but low Workflow) → ScoreCard shows amber callout naming the specific dimension(s) and threshold(s)
5. Click a dimension name in the gating callout → page scrolls to that dimension card
6. Complete assessment without gating → no amber callout appears
7. Share a `/results/[hash]` URL → link preview shows "AI Maturity Score: Level X — Label" title and θ score description
8. localStorage unavailable → assessment functions normally without resume capability (no errors)
9. `gatingDetails` array is present and correct in engine output for all gating test cases

## Test cases

1. **Persist round-trip**: Set answers for 3 dimensions, reload store from localStorage → all answers restored, `answeredQuestions` Set intact
2. **Clear on submit**: Complete assessment and submit → localStorage key `ai-maturity-assessment-progress` is removed
3. **Clear on reset**: Call `reset()` → localStorage key is removed
4. **Set serialization**: `answeredQuestions` with 5 entries → serialize to localStorage → deserialize → Set has same 5 entries
5. **Gating details — Level 3 blocked**: θ=85, workflow=62 → `gatingDetails` contains `{ dimension: "workflow", score: 62, threshold: 70, targetLevel: 3 }`
6. **Gating details — Level 2 blocked**: θ=55, workflow=45 → `gatingDetails` contains `{ dimension: "workflow", score: 45, threshold: 50, targetLevel: 2 }`
7. **Gating details — multiple gates**: θ=85, workflow=65, data=55 → `gatingDetails` has 2 entries (workflow < 70, data < 60)
8. **No gating**: θ=85, all dims above thresholds → `gatingDetails` is empty array, `gated` is false
9. **OG metadata**: Fetch `/results/[hash]` page → HTML contains `og:title` with level and label from DB row
10. **ResumeBanner renders**: Mount component with localStorage containing saved state → banner visible with both buttons
11. **ResumeBanner hidden**: Mount component with empty localStorage → banner not rendered

## Decisions made by Claude

1. **(low)** `ResumeBanner` is a separate component file rather than inline JSX in AssessmentPage — keeps assessment page clean and banner logic self-contained
2. **(medium)** `gatingDetails` is added to `AssessmentResult` (computed in engine) rather than computed on-the-fly in ScoreCard — keeps UI components pure renderers of pre-computed data, consistent with existing architecture where all scoring logic lives in `src/lib/scoring/`
3. **(low)** Gating dimension links use `<a href="#dim-{key}">` anchor scrolling rather than `scrollIntoView` JS — simpler, works without JS, accessible by default
4. **(low)** Using Zustand's built-in `persist` middleware rather than manual `addEventListener('storage')` — idiomatic Zustand, handles edge cases (tab sync, hydration)
5. **(medium)** Static OG image (`public/og-default.png`) rather than any dynamic generation — PRD explicitly says "a static image with score overlay is fine, no dynamic image generation service needed"; we use a fully static image with no per-assessment overlay to stay within scope
6. **(low)** `ResumeBanner` placed inside `AssessmentPage` rather than in layout — only relevant on the assessment route, not globally
