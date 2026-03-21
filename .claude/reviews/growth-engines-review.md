# Review: Growth Engine Classification

**Spec:** `.claude/specs/growth-engines.md`
**Mode:** Full review (first cycle)
**Verdict:** pass with fixes

---

## Summary

The growth engine feature is well-implemented overall. The data layer, classification logic, assessment step, results panel, store integration, and engine attachment all work correctly. Tests pass (118/118) and the build is clean. There are two major issues: a spec requirement for `GrowthEngineType` to be re-exported from `types.ts` is unmet, and the `GrowthEngineStep` UI uses text cards instead of visual answer cards with icons as specified. No critical issues were found.

---

## Issues

### Major

**1. [major] `GrowthEngineType` not re-exported from `types.ts`**
File: `src/lib/scoring/types.ts`
The spec requires: "Add `GrowthEngineType` to exports" in `types.ts`. Currently, `types.ts` uses inline `import("./growth-engines").GrowthEngineType` in the interface fields but does not re-export the type. Consumers importing from `types.ts` cannot access `GrowthEngineType` without also importing from `growth-engines.ts`. The store already imports directly from `growth-engines.ts`, which works but diverges from the spec's intended API surface.

**2. [major] GrowthEngineStep lacks visual answer cards with icons**
File: `src/components/assessment/GrowthEngineStep.tsx`
The spec requires: "3 questions with visual answer cards (icon + description per option)". The current implementation uses text-only buttons with label and description but no icons. The spec explicitly calls for "icon + description per option" in the visual cards.

### Spec completeness gaps

| #   | Requirement                                                              | Status                                                 |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | Types created (`GrowthEngineType`, `GrowthEngine` interface)             | ✅ Implemented                                         |
| 2   | `GROWTH_ENGINES` record with PLG/SLG/CLG/Hybrid data                     | ✅ Implemented                                         |
| 3   | `classifyGrowthEngine()` helper                                          | ✅ Implemented                                         |
| 4   | 3 screening questions defined                                            | ✅ Implemented                                         |
| 5   | Scoring tallies answers, picks dominant                                  | ✅ Implemented                                         |
| 6   | `GrowthEngineType` added to `types.ts` exports                           | ❌ Missing — only inline import, no re-export          |
| 7   | `growthEngine?` added to `AssessmentInput`                               | ✅ Implemented                                         |
| 8   | `growthEngine?` added to `AssessmentResult`                              | ✅ Implemented                                         |
| 9   | Store: `growthEngine` state + `setGrowthEngine` action                   | ✅ Implemented                                         |
| 10  | Store: pass to `computeResult()` on submit                               | ✅ Implemented                                         |
| 11  | `GrowthEngineStep.tsx` — 3 questions rendered                            | ✅ Implemented                                         |
| 12  | `GrowthEngineStep.tsx` — visual answer cards with icons                  | ⚠️ Partial — cards present but no icons                |
| 13  | `GrowthEngineStep.tsx` — auto-classifies as user answers                 | ✅ Implemented                                         |
| 14  | `GrowthEngineStep.tsx` — shows classification result with confidence     | ⚠️ Partial — shows result but no confidence indicator  |
| 15  | Insert after EnablerStep (step 2), bump subsequent steps                 | ✅ Implemented                                         |
| 16  | `AssessmentShell.tsx` MAX_STEP becomes 8                                 | ✅ Implemented                                         |
| 17  | `GrowthEnginePanel.tsx` — engine type with description                   | ✅ Implemented                                         |
| 18  | `GrowthEnginePanel.tsx` — priority dimensions highlighted                | ✅ Implemented                                         |
| 19  | `GrowthEnginePanel.tsx` — compare actual scores against priorities       | ✅ Implemented                                         |
| 20  | `GrowthEnginePanel.tsx` — AI leverage insight                            | ✅ Implemented                                         |
| 21  | `GrowthEnginePanel.tsx` — only renders when `result.growthEngine` exists | ✅ Implemented                                         |
| 22  | `GrowthEnginePanel` added to ResultsPage after ScoreCard                 | ✅ Implemented                                         |
| 23  | Unit test: `classifyGrowthEngine()` — each pure type                     | ❌ Missing — no direct test for `classifyGrowthEngine` |
| 24  | Store test: growth engine state management                               | ✅ Implemented                                         |
| 25  | Engine test: growth engine attached to result                            | ✅ Implemented                                         |
| 26  | `npx vitest run` — all tests pass                                        | ✅ 118/118 passing                                     |
| 27  | `npm run build` — clean build                                            | ✅ No errors                                           |

---

## Suggestions

- The `classifyGrowthEngine` function handles a tie between two engines by returning "hybrid". Consider whether a tie between all three (each with 1 vote) should also return "hybrid" — currently it does, which seems reasonable, but worth confirming intent.
- The `GrowthEnginePanel` score bar uses `score.toFixed(0)` which will show "0" for dimensions with no score. A "N/A" or dash might be clearer for unscored dimensions.
- The inline `import("./growth-engines").GrowthEngineType` syntax in `types.ts` works but is unconventional. A top-level import + re-export would be cleaner and satisfy the spec.
