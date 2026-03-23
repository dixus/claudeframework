# Spec: Interactive What-If Explorer

## Goal

Add an interactive panel on the Overview tab where users can drag dimension sliders to see real-time impact on theta, maturity level, S-velocity, and META prediction — reusing the existing `computeResult()` engine with no scoring logic duplication.

## Requirements

- Display 6 dimension sliders (strategy, architecture, workflow, data, talent, adoption), each pre-filled with the user's actual scores (0–100 range)
- As any slider moves, instantly recompute and display: theta index, maturity level (with gating), S-velocity band, and predicted months to €100M (META)
- Show delta from current scores in the format "52 → 67 (+15)" for each computed metric
- Surface gating alerts when a slider crosses a gating threshold (e.g., "Workflow ≥50 unlocks Level 2")
- Provide a "Reset" button that returns all sliders to the original assessment scores
- Keep capabilities and enablers fixed from the original assessment — only dimension scores are adjustable
- Place the panel at the bottom of the "Overview" tab content

## Out of scope

- Capability sliders (capabilities stay fixed)
- Enabler changes (funding stage, team size, annual revenue)
- Saving or persisting what-if scenarios
- Sharing what-if results
- Chart animations or visualization of what-if results
- Any changes to the scoring engine itself

## Affected files

| File                                     | Change                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/components/results/ResultsPage.tsx` | Import and render `WhatIfPanel` at the bottom of the overview tab                                               |
| `src/lib/scoring/engine.ts`              | Export `DIMENSIONS` constant and `applyGating` function so the what-if panel can reuse them without duplication |
| `src/lib/scoring/types.ts`               | Add `WhatIfResult` interface for the what-if computation output                                                 |

## New files

| File                                          | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `src/components/results/WhatIfPanel.tsx`      | The interactive what-if explorer panel component |
| `src/components/results/WhatIfPanel.test.tsx` | Unit tests for the what-if panel                 |

## Patterns to mirror

1. **`src/components/results/DimensionScorecard.tsx`** — panel layout pattern: white card with rounded border, uppercase tracking-wide label, dimension iteration with progress bars. The what-if panel should use the same card shell styling.
2. **`src/components/results/VelocityPanel.tsx`** — props interface pattern: typed props from `@/lib/scoring/types`, imported scoring types, Card/CardContent from shadcn. Also shows how to display scenario comparisons (current vs projected).
3. **`src/components/results/results.test.tsx`** — test pattern: `@vitest-environment jsdom`, `render`/`screen`/`userEvent` from RTL, `baseResult` fixture, `Wrapper` component for Radix tooltip provider, ResizeObserver mock.

## Implementation notes

### Reusing the scoring engine

The what-if panel must NOT duplicate scoring logic. Instead:

- Export `DIMENSIONS` (weight array) and `applyGating` from `engine.ts` so the panel can recompute theta as a weighted sum and apply gating rules
- For META and S-velocity recalculation, call the already-exported `computeMeta` (not currently exported — needs to be exported) or reuse the formulas through a thin helper
- Actually, the cleanest approach: create a lightweight `computeWhatIf()` function in engine.ts that accepts dimension scores + the original result's capabilities/enablers and returns the recomputed metrics. This keeps all scoring logic in the engine.

### Key function signature

```ts
// In engine.ts — new export
export function computeWhatIf(
  dimensionScores: Record<DimensionKey, number>,
  capabilityResponses?: Record<CapabilityKey, number>,
  enablers?: EnablerInput,
): WhatIfResult;
```

Where `WhatIfResult` contains: `thetaScore`, `level` (LevelInfo), `gated`, `gatingDetails`, `meta?` (MetaResult), `scalingVelocity?` (ScalingVelocity).

### Slider behavior

- HTML `<input type="range">` styled with Tailwind (no library needed)
- `min=0 max=100 step=1`
- `onChange` updates local React state (NOT the Zustand store — what-if is ephemeral)
- Debounce is not needed because `computeWhatIf` is a pure math function (sub-millisecond)

### Gating alert logic

- Compare the what-if gating details against the original result's gating details
- If the original had a gating constraint that is now satisfied, display a positive alert: "Workflow ≥50 unlocks Level 2"
- If a new gating constraint appears (slider moved down), display a warning: "Data dropped below 40 — Level 2 gated"

### Edge cases

- All sliders at 0: theta = 0, level = Traditional, no gating alerts
- All sliders at 100: theta = weighted max, level = AI-Native (if no gating blocks)
- Capabilities/enablers not present in original result: hide META and S-velocity rows, show only theta and level
- Result is null (no assessment completed): panel should not render (parent already guards this)

## UX concept

### Component tree

```
ResultsPage (existing)
  └── Overview tab content (existing)
      └── WhatIfPanel (NEW)
          ├── Section header ("What If?")
          ├── DimensionSliderGroup
          │   └── DimensionSlider × 6 (inline — not separate component files)
          │       ├── Label + current value display
          │       ├── <input type="range">
          │       └── Delta indicator (if changed)
          ├── WhatIfResults summary
          │   ├── Theta row: "θ: 52 → 67 (+15)"
          │   ├── Level row: "Level: AI-Powered → AI-Enabled"
          │   ├── META row (if available): "Months: 54 → 48 (-6)"
          │   └── S-velocity row (if available): "Band: Linear → Superlinear"
          ├── GatingAlerts (conditional)
          │   └── Alert items (unlocked / newly gated)
          └── Reset button
```

### Interaction flows

1. User completes assessment, lands on Results page, Overview tab
2. Scrolls down past DimensionScorecard to "What If?" panel
3. All sliders show current scores; results summary matches current assessment
4. User drags "Data" slider from 35 to 60
5. Results summary updates instantly: theta changes, level may change, META months may decrease
6. If a gating threshold is crossed, a gating alert appears inline
7. User drags more sliders to explore combinations
8. User clicks "Reset" — all sliders snap back to original scores, results summary returns to baseline

### State & data flow

- `WhatIfPanel` receives `result: AssessmentResult` as a prop from `ResultsPage`
- Local `useState` holds `sliderValues: Record<DimensionKey, number>` initialized from `result.dimensions`
- On any slider change, call `computeWhatIf(sliderValues, ...)` to get the what-if result
- The what-if result is derived state (computed on every render from sliderValues) — use `useMemo`
- No Zustand store changes — what-if state is fully local and ephemeral
- Original `result.enablers` and capability scores (derived from `result.capabilities`) are passed through unchanged

### Responsive behavior

- Sliders stack vertically on all breakpoints (single column)
- Results summary uses a 2×2 grid on `md+`, single column on mobile

### Accessibility

- Each slider `<input type="range">` has an associated `<label>` with the dimension name
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` are native to range inputs
- Reset button is keyboard-focusable
- Gating alerts use `role="status"` so screen readers announce changes
- Delta values include visually hidden text for context (e.g., "theta changed from 52 to 67, increase of 15")

### Reuse check

- Reuse card styling from `DimensionScorecard` (white rounded-xl border pattern)
- Reuse `HelpSection` component for contextual help
- Reuse dimension labels and weights from the exported `DIMENSIONS` constant
- No new UI library dependencies needed — native range inputs + Tailwind

## Validation criteria

- Navigating to results page Overview tab shows a "What If?" section below the dimension scorecard
- All 6 sliders display with correct dimension labels and are pre-filled with the user's actual scores
- Moving any slider immediately updates the theta, level, and (if available) META and S-velocity displays
- Delta values show correctly formatted differences (e.g., "+15", "-6")
- Moving Workflow slider from below 50 to above 50 (when level was gated) shows the gating unlock alert
- Clicking Reset returns all sliders and computed values to their original state
- The panel does not appear if the result is null
- META and S-velocity rows are hidden when the original result lacks enablers/capabilities

## Test cases

1. **Renders with correct initial values**: Render `WhatIfPanel` with a full `baseResult`. Verify all 6 dimension labels are present, each slider value matches the corresponding dimension score, and the displayed theta matches `result.thetaScore`.

2. **Slider change updates theta**: Render with known scores. Simulate changing the "Strategy" slider (weight 0.25) from 40 to 80. Verify displayed theta increases by approximately 10 (0.25 × 40 = 10).

3. **Slider change updates maturity level**: Render with theta near a level boundary. Increase a slider enough to push theta above the boundary. Verify the displayed level label changes.

4. **Gating alert appears on threshold crossing**: Render with Workflow score below 50 and theta > 50 (would be Level 2 but gated). Move Workflow slider to 50+. Verify a gating alert element appears containing "unlocks Level 2".

5. **Gating alert for downward crossing**: Render with Workflow at 55. Move slider below 50. Verify a downward gating alert appears.

6. **Reset button restores original values**: Change multiple sliders, click Reset. Verify all slider values return to original scores and computed metrics match the original result.

7. **Delta display format**: Change a slider. Verify the delta shows in "original → new (+diff)" format with correct sign.

8. **META and S-velocity hidden when not available**: Render with a result that has no `meta` or `scalingVelocity`. Verify those rows are not in the DOM.

9. **META and S-velocity shown when available**: Render with a full result including `meta` and `enablers`. Change a slider. Verify META months and S-velocity band update.

10. **No render when result is null**: This is guarded by the parent `ResultsPage`, but verify `WhatIfPanel` returns null if given undefined/null-like props (defensive).

11. **All sliders at zero**: Set all sliders to 0. Verify theta shows 0, level shows "Traditional", no crash.

12. **All sliders at 100**: Set all sliders to 100. Verify theta shows weighted max, level computation is correct.

## Decisions made by Claude

1. **(low)** Place the what-if panel at the bottom of the Overview tab rather than creating a new tab — matches the PRD's instruction to place it "below existing content" on Overview or Diagnosis. Overview chosen because it already shows dimension scores.
2. **(medium)** Use a new `computeWhatIf()` function in `engine.ts` rather than calling `computeResult()` with synthetic `AssessmentInput` — avoids needing to reverse-engineer raw responses from dimension scores. The function reuses the same internal helpers (`applyGating`, `computeMeta`, `computeScalingVelocity`).
3. **(low)** Keep all what-if state in local `useState`/`useMemo` rather than Zustand — what-if is ephemeral and should not persist or affect the real assessment.
4. **(low)** Use inline sub-components within `WhatIfPanel.tsx` rather than creating separate files for each slider — keeps the feature contained in a single new component file.
5. **(medium)** Export `DIMENSIONS` and `applyGating` from `engine.ts` — these were previously private. This is the minimal surface area needed to avoid duplicating weights and gating rules.
