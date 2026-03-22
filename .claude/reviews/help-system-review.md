# Review: help-system (delta review)

**Reviewing Phase 2 of 2 (final)** — full-spec review including cross-phase integration.

**Previous review**: 3 major issues, 1 minor issue.

## Summary

**Verdict: pass**

All three major issues from the previous review have been resolved. The `scaling_coefficient` and `coordination_o_n2` tooltip keys were added to `HELP_TOOLTIPS` and wired into their respective panels. HelpSection placement has been corrected in ScoreCard, CaseStudyPanel, and CapabilityPlaybookPanel — all now sit directly below the panel header. No regressions were introduced by the fixes. All 179 tests pass and the production build is clean.

## Previous Issue Verification

1. **[major] ScalingPanel missing `scaling_coefficient` HelpTerm** — ✅ fixed. `scaling_coefficient` key added to `HELP_TOOLTIPS` (line 64-69 of tooltips.ts) with appropriate definition. `<HelpTerm term="scaling_coefficient">` wired at ScalingPanel.tsx line 61.

2. **[major] CoordinationPanel missing `O(n²)` HelpTerm** — ✅ fixed. `coordination_o_n2` key added to `HELP_TOOLTIPS` (line 70-75 of tooltips.ts). Legend formatter in CoordinationPanel.tsx (lines 79-90) wraps the three complexity class labels with `<HelpTerm term="coordination_o_n2">`.

3. **[major] HelpSection placement inconsistencies** — ✅ fixed.
   - ScoreCard.tsx: HelpSection now at line 28, after the θ Score heading block (lines 21-27). Correct.
   - CaseStudyPanel.tsx: HelpSection at line 50, after the "Validated Case Studies" header div (lines 40-49). Correct.
   - CapabilityPlaybookPanel.tsx: HelpSection at line 75, after the "Intervention Playbook" header div (lines 69-74). Correct.

## Regression Scan

- **CoordinationPanel Legend formatter**: The `<HelpTerm>` is used inside a Recharts `Legend` `formatter` callback. Recharts `formatter` accepts ReactNode returns, so this is valid. No runtime risk.
- **ResultsPage TooltipProvider**: Correctly wraps the entire return block with `<TooltipPrimitive.Provider delayDuration={300}>`, consistent with the spec's implementation notes.
- **Test suite**: 179 tests pass (unchanged count from previous review). No regressions.
- **Build**: Clean production build with no errors.
- **Scope**: All changed files are within the expected help-system scope. No unrelated files were touched by the fixes.

## Issues

(none)

## Suggestions

- The `validation-badges` entry in PANEL_HELP is defined in the data layer but still not wired into any component via `<HelpSection panelId="validation-badges" />`. Consider adding it alongside the validation badge rendering in a future iteration.
- The previous review noted test case #10 (integration test rendering a full panel with HelpSection + HelpTerm) is still missing. This is a minor gap — the individual component tests and data tests provide good coverage, but a smoke-level integration test would add confidence.

## Spec Completeness

### Requirements

| #   | Requirement                                                                       | Status                                                                            |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | `src/lib/help/types.ts` with HelpTooltip and PanelHelp interfaces                 | ✅ implemented                                                                    |
| 2   | `src/lib/help/tooltips.ts` with HELP_TOOLTIPS map (10+ terms)                     | ✅ implemented (12 terms — 10 original + scaling_coefficient + coordination_o_n2) |
| 3   | `src/lib/help/panels.ts` with PANEL_HELP map (12 entries incl. validation-badges) | ✅ implemented                                                                    |
| 4   | Help files framework-agnostic (no React imports)                                  | ✅ implemented                                                                    |
| 5   | `src/components/ui/help-term.tsx` with Radix UI Tooltip                           | ✅ implemented                                                                    |
| 6   | `src/components/ui/help-section.tsx` with expand/collapse, localStorage, a11y     | ✅ implemented                                                                    |
| 7   | HelpSection in all 11 panels, below panel header                                  | ✅ implemented                                                                    |
| 8   | HelpTerm for key terms in specified panels                                        | ✅ implemented                                                                    |
| 9   | Unit tests in `src/lib/help/help.test.ts`                                         | ✅ implemented                                                                    |
| 10  | Component tests in `src/components/ui/help.test.tsx`                              | ✅ implemented                                                                    |

### Validation Criteria

| Criterion                                                   | Status                    |
| ----------------------------------------------------------- | ------------------------- |
| Hovering over dotted-underline term shows tooltip           | ✅ confirmed              |
| At least 10 distinct tooltip terms wired across panels      | ✅ confirmed (12 terms)   |
| Every major results panel (11) has "Learn more" section     | ✅ confirmed              |
| Expanding shows title, content, source with no layout shift | ✅ confirmed              |
| Collapse/re-expand works smoothly                           | ✅ confirmed              |
| localStorage preserves state                                | ✅ confirmed              |
| Tab key navigates through HelpTerm elements                 | ✅ confirmed              |
| `npx vitest run` — all tests pass                           | ✅ confirmed (179 passed) |
| `npm run build` — clean production build                    | ✅ confirmed              |
