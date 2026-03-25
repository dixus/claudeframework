# Spec: Radar Chart — Category Breakdown Visualization

## Goal

Enhance the existing `RadarChartPanel` to add a "maximum possible" reference polygon (fullMark = 100) alongside the current benchmark polygon, giving users a visual anchor for how far each dimension is from its ceiling.

## Requirements

- Add a third `<Radar>` layer to `RadarChartPanel` that plots the maximum possible score (100) per category as a light outer boundary polygon
- The max-score polygon must render as a subtle outline (no fill, light gray stroke) so it does not compete with the user's scores or the benchmark overlay
- Update the legend to include a third entry ("Maximum") when the max-score polygon is visible
- The max-score polygon is always visible (not gated by `level` prop) — it serves as a universal reference frame
- Maintain existing responsive behavior (`ResponsiveContainer` already handles this)
- No new dependencies — use only Recharts primitives already imported
- Preserve all existing benchmark polygon behavior (next-level threshold / AI-native targets)
- Add a `PolarAngleAxis` `tickFormatter` that truncates long dimension labels on small viewports (below `sm` breakpoint) to prevent overlap — e.g., "Architecture" becomes "Arch."

## Out of scope

- Comparison with past assessments (future feature)
- PDF export of the chart
- Custom color themes
- Tooltip on hover over radar polygon areas (Recharts RadarChart does not support this natively)
- Animated transitions between data states
- Any changes to the scoring engine or data model

## Affected files

| File                                         | Change                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/components/results/RadarChartPanel.tsx` | Add third `<Radar>` for max-score polygon; update legend; add label truncation for small screens |
| `src/components/results/results.test.tsx`    | Add test cases for the new max-score polygon legend and rendering                                |

## New files

None.

## Patterns to mirror

1. **`src/components/results/RadarChartPanel.tsx`** (self) — the existing benchmark `<Radar>` layer is the exact pattern for adding the max-score layer: same props structure, different `dataKey`, styling, and conditional logic
2. **`src/components/results/DimensionScorecard.tsx`** — panel styling, prop interface pattern (`dimensions: DimensionResult[]`), and how optional display features are toggled
3. **`src/components/results/results.test.tsx`** — test structure: `baseResult` fixture, `ResizeObserver` mock, `Wrapper` for tooltip provider, assertion patterns for legend text

## Implementation notes

- The `data` array in `RadarChartPanel` already includes `fullMark: 100` for every entry. The new `<Radar>` simply uses `dataKey="fullMark"` — no data transformation needed.
- Render order matters: the max-score `<Radar>` should render first (bottom layer), then benchmark, then user scores (top layer) so the user's polygon is visually prominent.
- The max-score polygon styling: `stroke="#e5e7eb"` (Tailwind gray-200), `strokeWidth={1}`, `fillOpacity={0}`, `fill="none"`. This creates a barely-visible outer boundary.
- Legend entry for max-score: a solid light-gray line swatch with label "Maximum (100)".
- Label truncation: use a `tick` render function on `PolarAngleAxis` that checks `window.innerWidth` or uses a media query approach. Since Recharts tick is SVG-based, the simplest approach is a short-label map: `{ strategy: "Strat.", architecture: "Arch.", workflow: "Work.", data: "Data", talent: "Tal.", adoption: "Adpt." }` and conditionally apply based on chart container width from `ResponsiveContainer`. However, given the existing chart width is 100% of its container (which is 50% of the page on `md+`), the 6 labels at `fontSize: 12` already fit. The truncation is a defensive measure for very narrow viewports (< 360px). Implement only if labels overlap at `sm` — verify visually before adding complexity.

### Scope constraint

This feature modifies exactly 2 files. Do not touch any other components, the scoring engine, or the store. If label truncation proves unnecessary after visual verification, skip it and note the decision.

## UX concept

### Component tree

```
RadarChartPanel (existing, enhanced)
  └─ ResponsiveContainer (existing)
      └─ RadarChart (existing)
          ├─ PolarGrid (existing)
          ├─ PolarAngleAxis (existing, tick formatter may change)
          ├─ Radar dataKey="fullMark"   ← NEW (max-score boundary)
          ├─ Radar dataKey="benchmark"  (existing, conditional)
          └─ Radar dataKey="score"      (existing, user scores)
  └─ Legend div (existing, add third entry)
```

### Interaction flows

No new interactions. The radar chart is a read-only visualization. The only existing interaction (hover tooltips on Recharts default behavior) is unchanged.

### State & data flow

No state changes. `RadarChartPanel` receives `dimensions: DimensionResult[]` and `level?: number` from `ResultsPage`. The `fullMark: 100` value is already computed in the existing `data.map()` call. No store changes, no new props.

### Responsive behavior

- `md+`: chart renders in a 2-column grid alongside `ScoreCard` (existing layout in `ResultsPage`)
- Below `md`: chart stacks below `ScoreCard` at full width (existing behavior)
- The `ResponsiveContainer` with `height={300}` handles all resize logic
- If labels overlap on very narrow viewports (< 360px), apply short-label mapping; otherwise, skip

### Accessibility

- The max-score `<Radar>` needs an `aria-label="Maximum possible score"` for screen readers (matches the existing pattern on the benchmark `<Radar>`)
- Legend text is already readable by screen readers (plain HTML `<span>` elements)
- No new interactive elements, so no keyboard navigation changes needed

### Reuse check

- `RadarChartPanel.tsx` itself is being extended (not creating a new component)
- The legend pattern (flex row with color swatches + labels) is already in `RadarChartPanel` — extend it, do not rebuild
- No new UI primitives needed

## Validation criteria

1. Navigating to the results page shows the radar chart with a faint outer polygon at the 100-mark boundary on all 6 axes
2. The legend shows three entries when `level` is provided: "Your scores" (blue), benchmark label (dashed gray), "Maximum (100)" (solid light gray)
3. The legend shows two entries when `level` is not provided: "Your scores" (blue), "Maximum (100)" (solid light gray)
4. The user's blue polygon and the benchmark dashed polygon render identically to before (no visual regression)
5. The chart is responsive and does not overflow its container on mobile viewports

## Test cases

1. **TC1: Max-score legend always renders** — Render `<RadarChartPanel dimensions={baseResult.dimensions} />` (no `level`). Assert `screen.getByText("Maximum (100)")` is in the document. Assert `screen.getByText("Your scores")` is in the document.

2. **TC2: Three legend entries with level** — Render `<RadarChartPanel dimensions={baseResult.dimensions} level={1} />`. Assert all three legend labels present: "Your scores", "Level 2 threshold", "Maximum (100)".

3. **TC3: Max-score Radar element rendered** — Render `<RadarChartPanel dimensions={baseResult.dimensions} />`. Assert the component renders without errors (smoke test — Recharts internals are SVG and hard to query, but the component should not throw).

4. **TC4: Existing benchmark tests still pass** — The existing tests in `results.test.tsx` (lines 208-226) must continue to pass unchanged. This is a regression guard, not a new test to write — just verify existing tests are green after the change.

## Decisions made by Claude

1. **(low)** The max-score polygon uses `stroke="#e5e7eb"` (Tailwind gray-200) with no fill. This is a cosmetic choice not specified in the PRD, chosen to be maximally subtle so it doesn't compete with the data polygons.

2. **(low)** The max-score polygon renders as the bottom layer (first `<Radar>` in JSX order) so it sits behind the user's scores and benchmark. Recharts renders SVG elements in document order (later = on top).

3. **(low)** The legend label is "Maximum (100)" rather than "Max score" or "Full mark" — chosen for clarity and consistency with the `fullMark` data key semantics.

4. **(low)** The max-score legend always renders (not conditional on `level` prop), because it serves as a universal reference frame regardless of whether a benchmark is shown. The PRD says "include a reference polygon showing the maximum possible score" with no conditions.

5. **(medium)** Label truncation on narrow viewports is deferred to visual verification. The implementation should first check if the 6 labels at `fontSize: 12` actually overlap on small screens. If they do, a short-label map will be added. If they don't, this is skipped to avoid unnecessary complexity. This is a scope-control decision informed by the historical pattern of scope-creep in UI features.

6. **(low)** No new file is created. The PRD could be interpreted as "add a new radar chart component", but one already exists and is fully integrated. Extending it is the correct minimal change.
