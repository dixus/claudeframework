# Spec: Contextual Help System

## Goal

Add an inline help system with tooltips and expandable "Learn more" sections that educates users about every metric, formula, and concept directly where they encounter it on the results page.

## Requirements

### Data layer (`src/lib/help/`) — NEW DIRECTORY

1. Create `src/lib/help/types.ts` with interfaces:

   ```ts
   interface HelpTooltip {
     term: string; // Display text that triggers the tooltip
     definition: string; // 1-2 sentence explanation
     source?: string; // Source document reference
   }

   interface PanelHelp {
     panelId: string; // Matches the panel component name
     title: string; // Section title
     content: string; // 3-5 sentences
     bullets?: string[]; // Optional bullet list
     source: string; // Source document reference
   }
   ```

2. Create `src/lib/help/tooltips.ts` — export a `HELP_TOOLTIPS` map (`Record<string, HelpTooltip>`) containing at least 10 terms:
   - `theta_index`, `r_squared`, `gating`, `s_formula`, `c1_strategy`, `superlinear`, `plg_slg_clg`, `meta_score`, `coordination_cost`, `bottleneck`
   - Content as specified in the input document (Pattern 1 section)

3. Create `src/lib/help/panels.ts` — export a `PANEL_HELP` map (`Record<string, PanelHelp>`) containing entries for all 11 panels:
   - `score-card`, `radar-chart`, `dimension-scorecard`, `growth-engine`, `scaling-panel`, `velocity-panel`, `coordination-panel`, `capability-panel`, `playbook-panel`, `case-study-panel`, `roadmap-panel`
   - Plus a cross-cutting entry for `validation-badges`
   - Content as specified in the input document (Pattern 2 section)

4. All help files must be framework-agnostic (no React imports) — pure data

### UI Components

5. Create `src/components/ui/help-term.tsx` — `<HelpTerm term="theta_index" />` component:
   - Renders the term text with dotted underline and subtle "?" indicator
   - On hover (desktop): shows popover with definition from `HELP_TOOLTIPS`
   - On tap (mobile): same popover behavior
   - Uses Radix UI Tooltip primitive (install `@radix-ui/react-tooltip`)
   - Keyboard accessible (focusable, Escape to dismiss)
   - Props: `term: string` (key into HELP_TOOLTIPS), optional `children: ReactNode` (custom display text)

6. Create `src/components/ui/help-section.tsx` — `<HelpSection panelId="scaling-panel" />` component:
   - Renders "ℹ Learn more" link
   - On click: smooth expand/collapse animation showing content from `PANEL_HELP`
   - Renders title, content paragraph, optional bullet list, source reference
   - Starts collapsed by default
   - Remembers open/closed state in localStorage (key: `help-section-${panelId}`)
   - No layout shift on expand/collapse (use CSS `grid` transition or `max-height`)
   - Accessibility: uses `aria-expanded`, `aria-controls`, appropriate button role

### Integration into Results Panels

7. Add `<HelpSection>` to each results panel, placed directly below the panel header:
   - `ScoreCard.tsx` — panelId `score-card`
   - `RadarChartPanel.tsx` — panelId `radar-chart`
   - `DimensionScorecard.tsx` — panelId `dimension-scorecard`
   - `GrowthEnginePanel.tsx` — panelId `growth-engine`
   - `ScalingPanel.tsx` — panelId `scaling-panel`
   - `VelocityPanel.tsx` — panelId `velocity-panel`
   - `CoordinationPanel.tsx` — panelId `coordination-panel`
   - `CapabilityPanel.tsx` — panelId `capability-panel`
   - `CapabilityPlaybookPanel.tsx` — panelId `playbook-panel`
   - `CaseStudyPanel.tsx` — panelId `case-study-panel`
   - `RoadmapPanel.tsx` — panelId `roadmap-panel`

8. Add `<HelpTerm>` for key technical terms in panel content — apply selectively (first occurrence per panel only, not every instance):
   - ScoreCard: θ_index, gating
   - ScalingPanel: META Score, scaling coefficient, R²
   - VelocityPanel: S-formula, superlinear
   - CoordinationPanel: coordination cost, O(n²)
   - CapabilityPanel: C₁ Strategy, bottleneck
   - GrowthEnginePanel: PLG/SLG/CLG
   - RoadmapPanel: θ_index target range

### Testing

9. Unit tests in `src/lib/help/help.test.ts`:
   - All tooltip keys resolve to valid HelpTooltip objects
   - All panel keys resolve to valid PanelHelp objects
   - Content fields are non-empty strings
   - Source fields reference actual document names

10. Component tests in `src/components/ui/help.test.tsx`:
    - HelpTerm renders term text with dotted underline
    - HelpTerm shows tooltip content on hover
    - HelpSection starts collapsed
    - HelpSection expands on click, showing title and content
    - HelpSection persists state to localStorage
    - Accessibility: HelpSection has aria-expanded attribute

## Out of Scope

- Search within help content
- User feedback ("Was this helpful?")
- Multi-language support
- Video/animation tutorials
- External links to documentation
- Help content editing UI
- Help on assessment pages (only results page)

## Affected Files

| File                                                 | Change                                       |
| ---------------------------------------------------- | -------------------------------------------- |
| `src/components/results/ScoreCard.tsx`               | Add HelpSection + HelpTerm imports and usage |
| `src/components/results/RadarChartPanel.tsx`         | Add HelpSection below header                 |
| `src/components/results/DimensionScorecard.tsx`      | Add HelpSection below header                 |
| `src/components/results/GrowthEnginePanel.tsx`       | Add HelpSection + HelpTerm                   |
| `src/components/results/ScalingPanel.tsx`            | Add HelpSection + HelpTerm                   |
| `src/components/results/VelocityPanel.tsx`           | Add HelpSection + HelpTerm                   |
| `src/components/results/CoordinationPanel.tsx`       | Add HelpSection + HelpTerm                   |
| `src/components/results/CapabilityPanel.tsx`         | Add HelpSection + HelpTerm                   |
| `src/components/results/CapabilityPlaybookPanel.tsx` | Add HelpSection below header                 |
| `src/components/results/CaseStudyPanel.tsx`          | Add HelpSection below header                 |
| `src/components/results/RoadmapPanel.tsx`            | Add HelpSection + HelpTerm                   |
| `package.json`                                       | Add `@radix-ui/react-tooltip` dependency     |

## New Files

| File                                 | Purpose                                     |
| ------------------------------------ | ------------------------------------------- |
| `src/lib/help/types.ts`              | HelpTooltip and PanelHelp interfaces        |
| `src/lib/help/tooltips.ts`           | Tooltip content registry (10+ terms)        |
| `src/lib/help/panels.ts`             | Panel help content registry (12 entries)    |
| `src/lib/help/help.test.ts`          | Data layer tests                            |
| `src/components/ui/help-term.tsx`    | Tooltip component wrapping Radix UI Tooltip |
| `src/components/ui/help-section.tsx` | Expandable "Learn more" component           |
| `src/components/ui/help.test.tsx`    | Component tests                             |

## Patterns to Mirror

1. **`src/lib/scoring/glossary.ts`** — static data registry pattern with TypeScript interfaces; same export style for tooltip/panel content
2. **`src/components/ui/card.tsx`** — shadcn/ui component pattern for `help-term.tsx` and `help-section.tsx`; same file structure, className composition with `cn()`
3. **`src/components/results/CoordinationPanel.tsx`** — panel structure with Card wrapper, header section, and content; shows where to insert HelpSection

## Implementation Notes

- **Radix UI Tooltip**: Install `@radix-ui/react-tooltip`. Wrap the app (or ResultsPage) in `<TooltipProvider>` with a reasonable `delayDuration` (300ms). Each `<HelpTerm>` uses `Tooltip.Root > Tooltip.Trigger > Tooltip.Portal > Tooltip.Content`.
- **TooltipProvider placement**: Add `<TooltipProvider>` in `ResultsPage.tsx` wrapping the entire return block, to avoid multiple providers.
- **localStorage persistence**: Use a simple `useEffect` + `useState` pattern in HelpSection. Key format: `help-section-${panelId}`. Read on mount, write on toggle. Default to `false` (collapsed).
- **No layout shift**: Use `overflow: hidden` with CSS `grid-template-rows: 0fr → 1fr` transition for the expandable section. This avoids `max-height` hacks and produces smooth animation.
- **Mobile tooltips**: Radix Tooltip does not natively support tap-to-open. Either: (a) use Radix Popover on touch devices, or (b) set `delayDuration={0}` and rely on Radix's built-in touch handling. Option (b) is simpler and recommended.
- **Selective term highlighting**: Only wrap the first occurrence of a term in each panel. Do not auto-scan text; manually place `<HelpTerm>` in JSX where the term first appears.
- **Source references**: Display as small gray text at the bottom of expanded sections (e.g., "Source: 01 AI Maturity Framework"). Informational only, not clickable.

## UX Concept

### Component Tree

```
ResultsPage (existing)
  └─ TooltipProvider (new — wraps all content)
      ├─ ScoreCard (existing)
      │   ├─ HelpSection panelId="score-card" (new)
      │   ├─ HelpTerm term="theta_index" (new, wraps θ text)
      │   └─ HelpTerm term="gating" (new, wraps gating text)
      ├─ RadarChartPanel (existing)
      │   └─ HelpSection panelId="radar-chart" (new)
      ├─ DimensionScorecard (existing)
      │   └─ HelpSection panelId="dimension-scorecard" (new)
      ├─ GrowthEnginePanel (existing)
      │   ├─ HelpSection panelId="growth-engine" (new)
      │   └─ HelpTerm term="plg_slg_clg" (new)
      ├─ ScalingPanel (existing)
      │   ├─ HelpSection panelId="scaling-panel" (new)
      │   ├─ HelpTerm term="meta_score" (new)
      │   └─ HelpTerm term="r_squared" (new)
      ├─ VelocityPanel (existing)
      │   ├─ HelpSection panelId="velocity-panel" (new)
      │   ├─ HelpTerm term="s_formula" (new)
      │   └─ HelpTerm term="superlinear" (new)
      ├─ CoordinationPanel (existing)
      │   ├─ HelpSection panelId="coordination-panel" (new)
      │   └─ HelpTerm term="coordination_cost" (new)
      ├─ CapabilityPanel (existing)
      │   ├─ HelpSection panelId="capability-panel" (new)
      │   ├─ HelpTerm term="c1_strategy" (new)
      │   └─ HelpTerm term="bottleneck" (new)
      ├─ CapabilityPlaybookPanel (existing)
      │   └─ HelpSection panelId="playbook-panel" (new)
      ├─ CaseStudyPanel (existing)
      │   └─ HelpSection panelId="case-study-panel" (new)
      └─ RoadmapPanel (existing)
          ├─ HelpSection panelId="roadmap-panel" (new)
          └─ HelpTerm term="theta_index" (new)
```

### Interaction Flows

**Tooltip flow:**

1. User sees dotted-underline term (e.g., "θ_index") with subtle "?" indicator
2. User hovers (desktop) or taps (mobile)
3. Popover appears after 300ms delay with 1-2 sentence definition
4. User moves mouse away → popover dismisses
5. Keyboard: Tab to focus term → popover appears → Escape to dismiss

**Expandable section flow:**

1. User sees "ℹ Learn more" link below a panel header
2. User clicks → section smoothly expands revealing title, explanation, optional bullets, source
3. User clicks again → section smoothly collapses
4. State persists in localStorage — on reload, previously expanded sections stay expanded

### State & Data Flow

- **Help content** is pure static data in `src/lib/help/` — no store needed
- **Tooltip state** is managed internally by Radix UI Tooltip (hover/focus tracking)
- **HelpSection expanded state** is local component state (`useState`) synced to `localStorage`
- **TooltipProvider** is placed in `ResultsPage.tsx` — provides context for all tooltips on the page
- No Zustand store changes needed — help system is entirely self-contained

### Responsive Behavior

- Tooltips: on desktop, trigger on hover; on mobile/touch, trigger on tap
- Expandable sections: full-width on all breakpoints, no layout changes needed
- Tooltip popover: Radix auto-positions to stay within viewport (side/align props)

### Accessibility

- HelpTerm: focusable via Tab, tooltip shown on focus, dismissed on Escape
- HelpSection: toggle button has `aria-expanded`, content region has `id` matching `aria-controls`
- Tooltip content is announced by screen readers via Radix's built-in ARIA attributes
- All interactive elements are keyboard-reachable
- Dotted underline provides visual affordance that the term is interactive
- Expandable content uses semantic HTML (`button` for trigger, `div` with `role="region"` for content)

### Reuse Check

- `src/components/ui/card.tsx` — reuse Card wrapper pattern and `cn()` utility
- `src/components/ui/badge.tsx` — reference for shadcn/ui component conventions
- `src/lib/scoring/glossary.ts` — existing glossary data can be cross-referenced but help tooltips use separate, shorter definitions optimized for inline display
- Recharts `Tooltip` — already used in charts, no conflict with Radix UI Tooltip (different import paths)

## Validation Criteria

- Hovering over any dotted-underline term shows a tooltip with a 1-2 sentence definition
- At least 10 distinct tooltip terms are wired across the results panels
- Every major results panel (11 panels) has an "ℹ Learn more" expandable section
- Expanding a section shows title, content paragraph, and source reference with no layout shift
- Collapsing and re-expanding works smoothly
- Refreshing the page preserves expanded/collapsed state via localStorage
- Tab key navigates through HelpTerm elements and triggers tooltips
- `npx vitest run` — all existing and new tests pass
- `npm run build` — clean production build

## Test Cases

1. **Tooltip data completeness**: Import `HELP_TOOLTIPS` — verify all 10+ keys exist, each has non-empty `term` and `definition`
2. **Panel help data completeness**: Import `PANEL_HELP` — verify all 12 keys exist, each has non-empty `panelId`, `title`, `content`, `source`
3. **HelpTerm renders**: Render `<HelpTerm term="theta_index" />` — expect text "θ_index" with `text-decoration: underline dotted` style
4. **HelpTerm tooltip on hover**: Render `<HelpTerm term="theta_index" />`, hover over it — expect tooltip content to appear in the document
5. **HelpSection starts collapsed**: Render `<HelpSection panelId="score-card" />` — expect "Learn more" visible, content not visible
6. **HelpSection expands on click**: Render `<HelpSection panelId="score-card" />`, click "Learn more" — expect title "Understanding Your AI Maturity Level" to appear
7. **HelpSection localStorage persistence**: Render `<HelpSection panelId="score-card" />`, click to expand, remount component — expect it to start expanded
8. **HelpSection aria-expanded**: Render `<HelpSection panelId="score-card" />` — expect button to have `aria-expanded="false"`, after click `aria-expanded="true"`
9. **Unknown term fallback**: Render `<HelpTerm term="nonexistent" />` — expect graceful handling (render children without tooltip, or render nothing)
10. **Integration**: Render `<ScoreCard result={...} />` wrapped in `<TooltipProvider>` — expect HelpSection and HelpTerm elements present in output

## Complexity Flag

This feature touches 19 files (12 affected + 7 new), exceeding the complexity gate of 10. Recommended decomposition:

- **Phase 1 — Data layer + UI components** (7 new files): Create `src/lib/help/` data files, `src/components/ui/help-term.tsx`, `src/components/ui/help-section.tsx`, and all tests. Install `@radix-ui/react-tooltip`. This phase is self-contained and testable in isolation.
- **Phase 2 — Panel integration** (12 affected files): Wire `<HelpSection>` and `<HelpTerm>` into each results panel. Add `<TooltipProvider>` to `ResultsPage.tsx`. This phase is mechanical and low-risk once Phase 1 is validated.

## Decisions Made by Claude

1. **(low)** Tooltip key naming uses `snake_case` (e.g., `theta_index`, `meta_score`) rather than the display text — keeps keys stable and avoids special characters
2. **(low)** Help content files placed in `src/lib/help/` as a new directory parallel to `src/lib/scoring/` — follows the existing pure-data pattern
3. **(medium)** Using Radix UI Tooltip (`@radix-ui/react-tooltip`) rather than building a custom tooltip — Radix provides accessibility, positioning, and keyboard support out of the box; consistent with shadcn/ui which uses Radix primitives
4. **(low)** TooltipProvider placed in `ResultsPage.tsx` rather than in the app layout — scoped to where tooltips are used, avoids unnecessary provider in assessment/landing pages
5. **(medium)** CSS grid transition (`grid-template-rows: 0fr → 1fr`) for expand/collapse rather than `max-height` — produces smoother animation without needing to know content height, but requires modern browser support (all major browsers since 2023)
6. **(low)** localStorage key format `help-section-${panelId}` — simple, predictable, no collision risk
7. **(low)** Separate HelpTerm definitions from existing glossary.ts — help tooltips are intentionally shorter (1-2 sentences) and optimized for inline context, while glossary entries are longer reference definitions
