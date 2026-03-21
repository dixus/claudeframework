# Review: anst-exponents

**Verdict: pass with fixes**

**Reviewer**: Claude Opus 4.6 (automated 9-lens review)
**Date**: 2026-03-21
**Spec**: `.claude/specs/anst-exponents.md`

---

## Summary

The implementation correctly applies the ANST superlinear exponents (C1^1.5, C3^1.5) to the META calculation and adds comprehensive capability/enabler infrastructure across the engine, types, store, and UI. Tests pass (88/88), typecheck is clean, and the build succeeds. However, the diff includes significant scope beyond the spec (dimension weight changes, benchmark data changes, UI restructuring, enabler system, new wizard steps) that were not requested. There is one major issue regarding formula display accuracy in ScalingPanel, and one major issue regarding scope creep.

---

## Issues

**1. [major] ScalingPanel formula display is inaccurate — exponent rendering is garbled**

- File: `src/components/results/ScalingPanel.tsx`, lines 81-84
- The formula breakdown renders `¹·⁵` using Unicode chars `\u00B9\u00B7\u2075` which produces "1.5" in superscript-ish characters, but the normalization exponent `\u00B9\u2075` at the end renders as "15" (should be "1/5" or "^(1/5)"). The display shows `(C₁¹·⁵ × C₂ × C₃¹·⁵ × C₄)¹⁵` which reads as "to the 15th power" instead of "to the 1/5th power". This is a correctness issue in what users see.

**2. [major] Significant scope creep — dimension weights, benchmark data, wizard steps, and landing page all changed without spec authorization**

- Files: `engine.ts` (DIMENSIONS weights changed from Strategy 0.20/Architecture 0.15/Workflow 0.25 to Strategy 0.25/Architecture 0.20/Workflow 0.15), `benchmarks.ts` (ARR ranges changed), `LevelsSection.tsx`, `HeroSection.tsx`, `ValueSection.tsx`, `DimensionsSection.tsx`, `AssessmentShell.tsx` (added steps 2+3 for Enablers/Capabilities), `assessmentStore.ts` (MAX_STEP changed from 5 to 7), `glossary.ts` (all ranges updated)
- The spec explicitly states: "Out of scope: Changing the θ_index calculation (dimension weights stay as-is)". Yet dimension weights were changed from [0.20, 0.15, 0.25, 0.15, 0.15, 0.10] to [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]. This contradicts the spec.
- Benchmark data, landing page content, wizard step numbering, and glossary updates were all out of scope for this spec.

---

## Spec Completeness

| Criterion                                                          | Status                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `computeMeta()` uses C₁^1.5, C₃^1.5 exponents                      | ✅ Implemented — `CAPABILITY_EXPONENTS` map with correct values, `Math.pow()` calls in `computeMeta()`                                           |
| Existing META test updated and passing                             | ✅ Implemented — test "includes META when both enablers and capabilities provided" verifies `capabilityGeoMean > 0`, `capabilityExponents` match |
| New test verifying superlinear amplification passing               | ✅ Implemented — test "amplifies Strategy and Execution over Setup and Operationalization" with high-C1/C3 vs high-C2/C4 comparison              |
| ScalingPanel shows corrected formula                               | ⚠️ Partial — formula is shown but the normalization exponent renders incorrectly as "15" instead of "1/5"                                        |
| `npx vitest run` — all tests pass                                  | ✅ 88/88 tests pass                                                                                                                              |
| `npm run build` — clean build                                      | ✅ Build succeeds                                                                                                                                |
| Replace uniform geometric mean with weighted exponents             | ✅ Implemented — `capabilityProduct` uses individual exponents, `capabilityGeoMean = Math.pow(capabilityProduct, 1 / EXPONENT_SUM)`              |
| Update comment to reference ANST formula                           | ✅ Implemented — comment block above `CAPABILITY_EXPONENTS` references ANST v4.5.3                                                               |
| Add `superlinearExponents` / `capabilityExponents` to `MetaResult` | ✅ Implemented — `capabilityExponents: Record<CapabilityKey, number>` in `MetaResult` type                                                       |

---

## Suggestions

1. **[minor]** The `computeEnablerScore()` function is exported but has no unit test. Consider adding a dedicated test for edge cases (teamSize=0, missing funding stage).

2. **[minor]** `CAPABILITY_LABELS` is defined in both `engine.ts` and `capabilities.ts`. Consider importing from the single source of truth in `capabilities.ts` to avoid drift.

3. **[minor]** The massive formatting changes (single quotes to double quotes, semicolons added, trailing whitespace) across every file inflate the diff considerably. These appear to be auto-formatter changes that should ideally be a separate commit to keep the feature diff reviewable.

4. **[minor]** `ScalingPanel.tsx` line 84 has a `(superlinear)` annotation approach that matches the spec, but the annotation is embedded in a dense formula string. Consider extracting the formula into a structured component for readability and testability.
