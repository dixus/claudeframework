# Phases for help-system

## Phase 1 — Data layer + UI components

Status: done
Scope:

- Create `src/lib/help/types.ts` with HelpTooltip and PanelHelp interfaces
- Create `src/lib/help/tooltips.ts` with HELP_TOOLTIPS map (10+ terms)
- Create `src/lib/help/panels.ts` with PANEL_HELP map (12 entries)
- Create `src/components/ui/help-term.tsx` tooltip component
- Create `src/components/ui/help-section.tsx` expandable component
- Create `src/lib/help/help.test.ts` data layer tests
- Create `src/components/ui/help.test.tsx` component tests
- Add `@radix-ui/react-tooltip` to package.json
  Validation criteria:
- All tooltip keys resolve to valid HelpTooltip objects
- All panel keys resolve to valid PanelHelp objects
- HelpTerm renders term text with dotted underline
- HelpTerm shows tooltip content on hover
- HelpSection starts collapsed
- HelpSection expands on click, showing title and content
- HelpSection persists state to localStorage
- Accessibility: HelpSection has aria-expanded attribute
- `npx vitest run` — all existing and new tests pass

## Phase 2 — Panel integration

Status: done
Scope:

- Wire `<HelpSection>` into ScoreCard.tsx, RadarChartPanel.tsx, DimensionScorecard.tsx, GrowthEnginePanel.tsx, ScalingPanel.tsx, VelocityPanel.tsx, CoordinationPanel.tsx, CapabilityPanel.tsx, CapabilityPlaybookPanel.tsx, CaseStudyPanel.tsx, RoadmapPanel.tsx
- Wire `<HelpTerm>` selectively in ScoreCard, ScalingPanel, VelocityPanel, CoordinationPanel, CapabilityPanel, GrowthEnginePanel, RoadmapPanel
- Add `<TooltipProvider>` in ResultsPage.tsx
  Validation criteria:
- Every major results panel (11 panels) has an "Learn more" expandable section
- At least 10 distinct tooltip terms are wired across the results panels
- Hovering over any dotted-underline term shows a tooltip
- Tab key navigates through HelpTerm elements
- `npx vitest run` — all existing and new tests pass
- `npm run build` — clean production build

## Artifact coverage

Every file from the spec's "Affected files" + "New files" must appear in exactly one phase above.
Unassigned:

- (none)
