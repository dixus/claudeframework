# Review: validation-stats

**Verdict: pass**

No critical or major issues found. The implementation correctly delivers all spec requirements.

## Summary

The implementation adds a new `src/lib/scoring/validation.ts` data layer file exporting `VALIDATION_STATS` and `getValidationStat()`, then integrates subtle validation badges/footnotes into `ScalingPanel`, `VelocityPanel`, and `ScoreCard`. All five validation data points match the spec. The data layer is framework-agnostic (no React imports). All 146 tests pass, build is clean.

Note: the diff also includes unrelated changes to `coordination.ts` (normalization refactor), `engine.ts` (rename `computeCapabilityProduct` to `computeCapabilityGeoMean`), `velocity.test.ts` (test updates for the geo-mean change), `package.json` (dev port change), and several `.claude/` config files. These are out of scope for this spec review but are noted for completeness.

## Issues

No critical or major issues.

## Suggestions

1. **Minor — ScoreCard hardcodes array index**: `ScoreCard.tsx:34` uses `VALIDATION_STATS[0].sampleSize` to get the sample size. If the array order changes, this would silently show the wrong value. Consider using `getValidationStat("θ_index")?.sampleSize ?? 22` or a dedicated constant for the overall sample size.

2. **Minor — Module-level side effects in UI components**: `ScalingPanel.tsx:6` and `VelocityPanel.tsx:43` call `getValidationStat()` at module scope (outside the component function). This works fine since it's a pure lookup on a constant array, but moving these inside the component or co-locating them as `const` at the top of the module with a comment would be more conventional React style.

3. **Minor — No unit tests for validation.ts**: The new data layer file has no dedicated test file. While the data is static and unlikely to break, a simple test asserting the expected stat count and key values (R²=0.91 for META, R²=0.76 for ANST) would guard against accidental edits.

4. **Minor — Unrelated changes in the diff**: The diff includes refactoring of `computeCapabilityProduct` to `computeCapabilityGeoMean` in `engine.ts`, normalization changes in `coordination.ts`, test updates in `velocity.test.ts`, and a dev port change in `package.json`. These are unrelated to the validation-stats spec and ideally would be in a separate commit for clean history.

## Spec Completeness

### Requirements

- ✅ `VALIDATION_STATS` constant exported from `src/lib/scoring/validation.ts` with correct `ValidationStat` interface
- ✅ META formula: R²=0.91, n=22, "Predicts Time to €100M ARR", High confidence
- ✅ ANST (S-formula): R²=0.76, n=22, "Scaling velocity prediction", High confidence
- ✅ θ_index: r=0.88, n=22, "AI Maturity classification", High confidence
- ✅ Superlinear coefficient: range 1.3-1.8, n=22, Medium confidence
- ✅ Coordination cost: O(n²) vs O(n log n), n=22, "Team scaling efficiency", Medium confidence
- ✅ Framework-agnostic, no React imports in `src/lib/scoring/validation.ts`
- ✅ ScalingPanel: "Validated" badge next to META Score showing R²=0.91, n=22
- ✅ ScalingPanel: footnote "Based on empirical validation across 22 AI-native companies"
- ✅ VelocityPanel: validation badge R²=0.76, n=22
- ✅ ScoreCard: "Validated framework (n=22 companies)" text below level
- ✅ Subtle inline badge styling (gray background, small text, rounded-full)
- ✅ No separate validation panel created — all integrated into existing panels

### Acceptance Criteria

- ✅ Validation stats visible on ScalingPanel, VelocityPanel, and ScoreCard
- ✅ Stats match source document values exactly
- ✅ Styling is subtle (badge/footnote, not a full panel)
- ✅ `npx vitest run` — all 146 tests pass
- ✅ `npm run build` — clean build, no errors
