# Review: scaling-velocity

**Date:** 2026-03-21
**Verdict:** pass with fixes
**Mode:** Full review (first cycle)

## Summary

The scaling velocity implementation is solid overall. The ANST S-formula is correctly implemented, types match the spec exactly, the VelocityPanel renders all required UI elements (gauge, component breakdown, what-if bar chart, insight text), and all 9 velocity-specific tests pass alongside the full 127-test suite. Build is clean.

Two major issues were found: (1) the `fixBottleneck` scenario unconditionally sets the bottleneck to 85 instead of raising it to at least 85 (using `Math.max`), meaning a capability already above 85 would be lowered; (2) an unrelated `package.json` change (dev port) was included in this diff, violating minimal-footprint.

---

## Issues

### 1. [major] fixBottleneck scenario does not use `Math.max` — may lower an already-high capability

**File:** `src/lib/scoring/engine.ts`, line 208
**Description:** The spec says "bottleneck capability raised to 0.85". The `fixAll` scenario correctly uses `Math.max(capScores[k], 85)`, but `fixBottleneck` does a hard assignment: `{ ...capScores, [bottleneckCapability]: 85 }`. If the bottleneck capability happens to score above 85 (edge case where all caps are high but one is slightly lower), this would reduce it to 85, producing a `fixBottleneck` value lower than `current`. Should be `Math.max(capScores[bottleneckCapability], 85)`.

### 2. [major] Unrelated `package.json` change included in diff

**File:** `package.json`
**Description:** The dev port was changed from default to `-p 4001`. This is unrelated to the scaling-velocity feature and violates the one-concern-per-commit instinct. Should be reverted or committed separately.

---

## Suggestions

- The `CAPABILITY_LABELS` constant is duplicated between `engine.ts` (line 54) and `VelocityPanel.tsx` (line 17). Consider extracting to a shared location in a future cleanup pass.
- The gauge SVG arc paths are hand-coded coordinates. They work correctly but are fragile — a comment explaining the geometry or a future refactor to compute arcs programmatically would improve maintainability.
- The `LabelList` formatter in VelocityPanel (line 204) has defensive type-narrowing for string vs number. This is fine for Recharts compatibility but could benefit from a brief inline comment explaining why.

---

## Spec Completeness

| #                                                        | Requirement                                              | Status |
| -------------------------------------------------------- | -------------------------------------------------------- | ------ |
| Engine: `computeScalingVelocity()` function              | ✅ Implemented with correct signature                    |
| Formula: `S = E × capabilityProduct × θ`                 | ✅ Correct                                               |
| Formula: `capabilityProduct = C₁^1.5 × C₂ × C₃^1.5 × C₄` | ✅ Correct                                               |
| What-if: `currentS`                                      | ✅ Implemented                                           |
| What-if: `fixBottleneckS` (bottleneck raised to 0.85)    | ⚠️ Uses hard assignment instead of `Math.max` — Issue #1 |
| What-if: `fixAllS` (all caps raised to 0.85)             | ✅ Correctly uses `Math.max`                             |
| What-if: `addAIS` (all 0.85 + θ to 0.90)                 | ✅ Correctly uses `Math.max` for theta                   |
| Band classification: 4 bands with correct thresholds     | ✅ Implemented                                           |
| Types: `ScalingVelocity` interface                       | ✅ Matches spec exactly                                  |
| Types: `scalingVelocity?` on `AssessmentResult`          | ✅ Added                                                 |
| UI: VelocityPanel — velocity gauge                       | ✅ SVG semi-circular gauge                               |
| UI: VelocityPanel — component breakdown (3 cards)        | ✅ E, C-product, θ cards                                 |
| UI: VelocityPanel — what-if bar chart (Recharts)         | ✅ BarChart with 4 scenarios                             |
| UI: VelocityPanel — multiplier labels on bars            | ✅ LabelList with Nx format                              |
| UI: VelocityPanel — insight text                         | ✅ "Fixing your [bottleneck]..."                         |
| ResultsPage: VelocityPanel after ScalingPanel            | ✅ Placed correctly                                      |
| ResultsPage: conditional on scalingVelocity              | ✅ Conditional render                                    |
| Tests: all zeros → S = 0                                 | ✅                                                       |
| Tests: all 100s → S at maximum                           | ✅                                                       |
| Tests: known manual calculation                          | ✅                                                       |
| Tests: scenario calculations correct                     | ✅                                                       |
| Tests: band assignment for each threshold                | ✅ (4 band tests)                                        |
| `npx vitest run` — all tests pass                        | ✅ 127/127                                               |
| `npm run build` — clean build                            | ✅                                                       |
