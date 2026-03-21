# Review: coordination-cost

**Date**: 2026-03-21
**Mode**: Full review (first cycle)
**Verdict**: **pass with fixes** — no critical issues, 2 major issues

---

## Summary

The coordination cost feature is well-structured: a pure scoring module (`coordination.ts`), a Recharts panel (`CoordinationPanel.tsx`), integration into `engine.ts` and `types.ts`, and 9 passing tests. The math is correct, the UI renders all 4 curves with a reference line and insight card, and the build is clean. Two major issues need attention: an unused function parameter and a "You are here" marker that won't display correctly for non-standard team sizes.

---

## Issues

### Major

**1. [Major] `computeCoordinationCurves` has unused `teamSize` parameter**

- File: `src/lib/scoring/coordination.ts`, line 44
- The `teamSize` parameter is accepted but never referenced in the function body. The function always generates data for the hardcoded `TEAM_SIZES` array `[10, 25, 50, 100, 200, 500]`. This is misleading to callers and violates no-dead-code instincts. Either remove the parameter or use it (e.g., ensure the company's actual team size appears in the generated data points so the chart always has a data point at the company's position).

**2. [Major] "You are here" marker misses for non-standard team sizes**

- Files: `src/lib/scoring/coordination.ts` + `src/components/results/CoordinationPanel.tsx`, line 74
- The spec requires an "Orange dot/highlight: 'You are here' marker at company's team size and theta-interpolated cost." The `ReferenceLine` at `x={teamSize}` draws a vertical dashed line, but if the company's team size (e.g., 80) doesn't match one of the 6 fixed data points `[10, 25, 50, 100, 200, 500]`, the line lands between data points with no corresponding dot on the company curve. The company's actual position on the chart is absent. Fix: include the company's actual `teamSize` in the generated data array (inject and sort it into `TEAM_SIZES` in `computeCoordinationCurves`), so the chart always has a data point at the company's exact team size.

---

## Suggestions

- **Unused parameter pattern**: The `CoordinationModel` type is referenced in `types.ts` via inline dynamic import (`import("./coordination").CoordinationModel[]`). Per project lessons, a top-level `export type { CoordinationModel } from "./coordination"` re-export in `types.ts` would be more consistent with the module API surface pattern used for other types.
- **Tooltip label**: The tooltip `formatter` returns `"Cost"` as the label for all 4 lines. Consider returning each line's actual name for clearer tooltip readout.
- **Edge case**: `getCoordinationInsight` doesn't clamp `teamSize` -- if someone passes a team size of 0, division would produce `NaN` (0/0 in normalization). A guard clause would harden the function.

---

## Spec Completeness

### Requirements

| #                                                                           | Requirement                                                                                                 | Status |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| Data layer: `CoordinationModel` interface                                   | ✅ Implemented — matches spec exactly                                                                       |
| Data layer: `computeCoordinationCurves(teamSize, theta)`                    | ⚠️ Partial — `teamSize` param accepted but unused (Issue #1)                                                |
| Data layer: Generate data points for team sizes 10, 25, 50, 100, 200, 500   | ✅ Implemented                                                                                              |
| Data layer: Traditional `n*(n-1)/2` normalized                              | ✅ Implemented                                                                                              |
| Data layer: AI-Enabled `n*log2(n)` normalized                               | ✅ Implemented                                                                                              |
| Data layer: AI-Native `n*1.5` normalized                                    | ✅ Implemented                                                                                              |
| Data layer: Company interpolation based on theta with 4 bands               | ✅ Implemented                                                                                              |
| Data layer: `getCoordinationInsight(theta, teamSize)`                       | ✅ Implemented                                                                                              |
| Data layer: Returns text insight with savings percentage                    | ✅ Implemented                                                                                              |
| Data layer: Calculate savings `1 - companyCost / traditionalCost`           | ✅ Implemented                                                                                              |
| Data layer: Framework-agnostic, no React imports                            | ✅ Implemented                                                                                              |
| UI: Line chart with 4 curves (gray dashed, blue, green, orange)             | ✅ Implemented                                                                                              |
| UI: X-axis Team Size (10-500)                                               | ✅ Implemented                                                                                              |
| UI: Y-axis Relative coordination cost                                       | ✅ Implemented                                                                                              |
| UI: "You are here" orange dot/highlight at company position                 | ⚠️ Partial — vertical line present but no dot at exact company position for arbitrary team sizes (Issue #2) |
| UI: Annotation vertical line at company's team size                         | ✅ Implemented                                                                                              |
| UI: Insight card below chart                                                | ✅ Implemented                                                                                              |
| UI: Legend explaining 3 models                                              | ✅ Implemented (Recharts Legend shows all 4 lines including company)                                        |
| Integration: Add `coordination` to `AssessmentResult`                       | ✅ Implemented                                                                                              |
| Integration: Compute in `computeResult()` when enablers and theta available | ✅ Implemented                                                                                              |
| Integration: Add to ResultsPage after VelocityPanel                         | ✅ Implemented                                                                                              |

### Tests

| #                                                    | Test case  | Status |
| ---------------------------------------------------- | ---------- | ------ |
| Traditional cost at n=100 ~4950 before normalization | ✅ Covered |
| AI-native cost at n=100 ~150                         | ✅ Covered |
| theta=0 company curve matches traditional            | ✅ Covered |
| theta=100 company curve matches AI-native            | ✅ Covered |
| `getCoordinationInsight` returns non-empty string    | ✅ Covered |
| Savings percentage between 0 and 1                   | ✅ Covered |

### Acceptance Criteria

| Criterion                                                              | Status                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Coordination curves mathematically correct for O(n²), O(n log n), O(n) | ✅ Met                                                                                    |
| Company interpolation based on theta produces sensible results         | ✅ Met                                                                                    |
| Recharts line chart renders 4 curves with "You are here" marker        | ⚠️ Partial — marker is a reference line, not a dot at the exact curve position (Issue #2) |
| Insight text is contextual to company's team size and theta            | ✅ Met                                                                                    |
| `npx vitest run` — all tests pass                                      | ✅ Met (9/9 pass)                                                                         |
| `npm run build` — clean build                                          | ✅ Met                                                                                    |
