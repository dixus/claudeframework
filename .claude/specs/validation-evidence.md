# Spec: Validation Evidence Display

## Goal

Surface empirical validation statistics as compact, interactive badges on four results panels (ScoreCard, ScalingPanel, VelocityPanel, CoordinationPanel) with tooltip popovers showing expanded methodology detail — building credibility without cluttering the UI.

## Requirements

- Add a reusable `ValidationBadge` component that renders a small muted badge with a validation stat and expands on hover/focus to show methodology detail
- Extend the `ValidationStat` type and `VALIDATION_STATS` array with per-formula expanded detail fields (sample description, methodology note, plain-language explanation)
- Integrate `ValidationBadge` into exactly four panels:
  - **ScoreCard** — replace the existing `text-[10px]` validation line with a `ValidationBadge` showing "Validated: r=0.88, n=22 AI-native B2B SaaS companies"
  - **ScalingPanel** — replace the existing inline `✓ Validated (R²=…)` span with a `ValidationBadge`
  - **VelocityPanel** — replace the existing inline `✓ R²=…` span with a `ValidationBadge`
  - **CoordinationPanel** — add a new `ValidationBadge` showing "Based on empirical coordination cost analysis, n=22"
- Tooltip expanded detail must include:
  - **Sample:** "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)"
  - **Method:** "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation"
  - One plain-language sentence per panel explaining what the stat means
- Use `@radix-ui/react-tooltip` (already installed) — same primitive used by `HelpTerm`
- Badge must be keyboard-accessible (focusable, tooltip opens on focus)

## Out of scope

- New pages, tabs, or panels
- Modifications to any panels other than ScoreCard, ScalingPanel, VelocityPanel, CoordinationPanel
- Detailed methodology writeup or academic citation formatting
- Downloadable research paper
- Adding `@radix-ui/react-popover` or any new npm dependency
- Changes to the scoring engine logic or `validation.ts` exports/function signatures (only data additions)

## Affected files

1. `src/lib/scoring/validation.ts` — add `sampleDetail`, `methodology`, and `plainLanguage` fields to `ValidationStat` interface and populate them in `VALIDATION_STATS` entries
2. `src/components/results/ScoreCard.tsx` — replace the hardcoded `text-[10px]` validation line with `<ValidationBadge formula="θ_index" />`
3. `src/components/results/ScalingPanel.tsx` — replace the inline `✓ Validated` span with `<ValidationBadge formula="META" />`
4. `src/components/results/VelocityPanel.tsx` — replace the inline `✓ R²=…` span with `<ValidationBadge formula="ANST" />`
5. `src/components/results/CoordinationPanel.tsx` — add `<ValidationBadge formula="Coordination Cost" />` below the panel title
6. `src/components/results/results.test.tsx` — add tests for ValidationBadge rendering and tooltip content

## New files

1. `src/components/ui/validation-badge.tsx` — reusable `ValidationBadge` component

## Patterns to mirror

1. `src/components/ui/help-term.tsx` — exact same `@radix-ui/react-tooltip` usage pattern (Root → Trigger → Portal → Content → Arrow), styling classes, and keyboard accessibility approach
2. `src/components/results/ScalingPanel.tsx` lines 46–51 — existing inline validation badge styling (gray-100 bg, 10px text, rounded-full pill) to match visual weight
3. `src/lib/scoring/validation.ts` — extend the existing `ValidationStat` interface rather than creating a parallel data structure

## Implementation notes

### Data model extension

Add three optional fields to `ValidationStat` (optional to avoid breaking existing consumers):

```ts
export interface ValidationStat {
  formula: string;
  metric: string;
  value: string;
  sampleSize: number;
  description: string;
  confidence: "High" | "Medium";
  // New fields for expanded detail:
  sampleDetail?: string;
  methodology?: string;
  plainLanguage?: string;
}
```

Populate all five entries with:

- `sampleDetail`: "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)"
- `methodology`: "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation"
- `plainLanguage`: unique per formula (e.g., for θ_index: "The θ score correlates strongly with independent expert AI maturity ratings across 22 companies")

### ValidationBadge component

Props: `{ formula: string }` — looks up data from `getValidationStat()`.

Renders:

- Trigger: a `<span>` styled as a compact pill badge (matching existing ScalingPanel pattern: `px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded-full`) with checkmark, metric, value, and sample size
- Tooltip content: a structured card with Sample, Method, and plain-language sections using the same tooltip styling as `HelpTerm`

The badge text varies by formula:

- θ_index: "✓ Validated: r=0.88, n=22"
- META: "✓ Validated: R²=0.91, n=22"
- ANST: "✓ R²=0.76, n=22"
- Coordination Cost: "✓ Empirical model, n=22"

### Edge cases

- If `getValidationStat()` returns `undefined` for the formula, render nothing (null) — same guard pattern as `HelpTerm`
- Tooltip must not overflow viewport on mobile — use `sideOffset={5}` and let Radix handle collision detection (default behavior)

### Scope enforcement

- Do NOT add any new panels, tabs, or pages
- Do NOT modify BottleneckPanel, PlaybookPanel, CapabilityPanel, CapabilityPlaybookPanel, CaseStudyPanel, GrowthEnginePanel, RadarChartPanel, InsightsPanel, RoadmapPanel, DimensionScorecard, ResultsPage, SaveResultsCard, PdfExportButton, or generatePdf
- Only the four listed panels receive badges

## UX concept

### Component tree

```
ValidationBadge (NEW — src/components/ui/validation-badge.tsx)
├── TooltipPrimitive.Root
│   ├── TooltipPrimitive.Trigger (span, pill badge)
│   └── TooltipPrimitive.Portal
│       └── TooltipPrimitive.Content (expanded detail card)

ScoreCard (EXISTING — modified)
└── ValidationBadge formula="θ_index"    ← replaces hardcoded text

ScalingPanel (EXISTING — modified)
└── ValidationBadge formula="META"       ← replaces inline span

VelocityPanel (EXISTING — modified)
└── ValidationBadge formula="ANST"       ← replaces inline span

CoordinationPanel (EXISTING — modified)
└── ValidationBadge formula="Coordination Cost"  ← new addition
```

### Interaction flows

1. User views results page → sees compact validation pills on four panels (no interaction required)
2. User hovers over or focuses a validation badge → tooltip appears with expanded detail (sample, method, plain-language explanation)
3. User moves mouse away or blurs → tooltip dismisses

### State & data flow

- No state management needed — `ValidationBadge` is a pure presentational component
- Data sourced from `getValidationStat()` at module level (same pattern as ScalingPanel line 8)
- No Zustand store changes, no new state

### Responsive behavior

- Badge text is already compact (10px); no layout changes needed at breakpoints
- Tooltip uses Radix collision detection to reposition on small screens

### Accessibility

- Badge trigger uses `tabIndex={0}` for keyboard focus (matching HelpTerm pattern)
- Tooltip opens on focus (built into Radix tooltip primitive)
- Tooltip content uses semantic structure (paragraphs with bold labels)
- Screen readers announce badge text inline; tooltip provides supplementary detail

### Reuse check

- Reuse `@radix-ui/react-tooltip` (already installed)
- Reuse tooltip styling from `HelpTerm` component
- Reuse badge visual pattern from ScalingPanel's existing inline validation span
- Do NOT reuse the `Badge` component from `badge.tsx` — it's styled for larger, more prominent badges; the validation pill needs the smaller 10px pattern

## Validation criteria

1. ScoreCard renders a "✓ Validated: r=0.88, n=22" pill badge below the maturity level label
2. ScalingPanel renders a "✓ Validated: R²=0.91, n=22" pill badge below the META Score value
3. VelocityPanel renders a "✓ R²=0.76, n=22" pill badge next to the title
4. CoordinationPanel renders a "✓ Empirical model, n=22" pill badge below the title
5. Hovering any validation badge shows a tooltip with Sample, Method, and a plain-language explanation
6. Pressing Tab to focus a badge also shows the tooltip
7. No new panels, tabs, or pages are created
8. `npm run build` passes with no TypeScript errors
9. All existing tests continue to pass
10. New test(s) verify badge rendering and tooltip content for at least one panel

## Test cases

1. **ValidationBadge renders for known formula** — render `<ValidationBadge formula="META" />` inside a TooltipProvider; expect text "✓" and "R²=0.91" to be present in the document
2. **ValidationBadge renders nothing for unknown formula** — render `<ValidationBadge formula="NONEXISTENT" />`; expect the container to be empty (null return)
3. **ScoreCard shows validation badge** — render `<ScoreCard result={...} />` inside a TooltipProvider; expect text matching "r=0.88" to be present
4. **CoordinationPanel shows validation badge** — render `<CoordinationPanel ... />` inside a TooltipProvider; expect text matching "Empirical model" to be present
5. **Tooltip content appears on hover** — render `<ValidationBadge formula="META" />`, hover the trigger; expect "22 AI-native B2B SaaS companies" text to appear
6. **Existing ScalingPanel validation text is replaced, not duplicated** — render ScalingPanel; expect exactly one element matching the validation stat, not two

## Decisions made by Claude

1. **(low)** Use `@radix-ui/react-tooltip` instead of adding `@radix-ui/react-popover` — the PRD says "tooltip/popover" and tooltip is already installed and used throughout the codebase. Avoids a new dependency.
2. **(low)** Make new `ValidationStat` fields optional (`sampleDetail?`, `methodology?`, `plainLanguage?`) to avoid breaking any existing consumers of the interface.
3. **(low)** File placement at `src/components/ui/validation-badge.tsx` — follows existing pattern of UI primitives in `src/components/ui/`.
4. **(medium)** Replace existing inline validation text in ScoreCard, ScalingPanel, and VelocityPanel rather than adding a second badge alongside them — the PRD says "add compact validation indicators" but the panels already have partial indicators; replacing avoids duplication and visual clutter.
5. **(low)** Badge text for Coordination Cost uses "✓ Empirical model, n=22" since it has no single numeric stat like R² or r — the PRD's suggested text is "Based on empirical coordination cost analysis, n=22" which is too long for a compact badge; full text goes in the tooltip.
6. **(low)** PRD lists r=0.89 for θ score but `VALIDATION_STATS` has r=0.88. Using the existing data (0.88) as the source of truth since the component reads from `VALIDATION_STATS` dynamically.
