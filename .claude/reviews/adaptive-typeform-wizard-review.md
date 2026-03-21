# Review: adaptive-typeform-wizard (cycle 2 — delta review)

**Verdict: pass**

No critical or major issues. Both issues from the previous review have been correctly resolved. No regressions found in the fix diff. All 82 tests pass.

---

## Previous issue verification

### 1. [major] Falsy-zero bug in ScreeningPhase and DeepDivePhase — FIXED

**Status:** ✅ Fixed

The fix introduces an `answeredQuestions: Set<string>` in the store, tracking every question that has been explicitly answered using the key format `"dimension:index"`. Both `setAnswer` and `setScreeningAnswer` add to this set. `computeAdaptiveLevels` correctly removes entries for excluded questions when a screening answer changes.

Both `ScreeningPhase.tsx` (line 29) and `DeepDivePhase.tsx` (line 32-34) now use:

```tsx
const isAnswered = answeredQuestions.has(`${current.key}:0`);
// ...
value={isAnswered ? currentValue : null}
```

This correctly handles the falsy-zero case: a user selecting "Not started" (value 0) will see the button highlighted, because `isAnswered` is `true` and `currentValue` (0) is passed through. The `reset()` action also clears the set.

### 2. [major] Missing spec test cases in store tests — FIXED

**Status:** ✅ Fixed

The store test file (`src/store/assessmentStore.test.ts`) has been expanded from 8 to 24 tests, now covering all spec test cases 1-11 as store-level unit tests:

- Test case 1: screening stores answers at index 0
- Test case 2: adaptive level beginner (screening 0)
- Test case 3: adaptive level intermediate (screening 2)
- Test case 4: adaptive level advanced (screening 4)
- Test case 5: skipped questions remain 0
- Test case 6: total count all beginner = 18
- Test case 7: total count all advanced = 42
- Test case 8: total count mixed = 30
- Test case 9: getFollowUpQuestions returns correct indices (3 sub-tests)
- Test case 10: scoring engine compatibility
- Test case 11: back navigation recomputes queue
- advanceScreening transitions to deep-dive after 6 questions

Component tests remain in `assessment.test.tsx` for test cases 12 (auto-advance timer) and 13 (review filtering), which is appropriate since those are UI behaviors.

---

## Regression scan

Reviewed all files changed in the fix cycle:

- **`src/store/assessmentStore.ts`**: Only addition is the `answeredQuestions` Set and its maintenance in `setAnswer`, `setScreeningAnswer`, `computeAdaptiveLevels`, and `reset`. No existing logic was altered. No scope creep.
- **`src/components/assessment/ScreeningPhase.tsx`**: Only the value prop changed from `currentValue || null` to `isAnswered ? currentValue : null`. Clean fix.
- **`src/components/assessment/DeepDivePhase.tsx`**: Same pattern as ScreeningPhase. Clean fix.
- **`src/store/assessmentStore.test.ts`**: Tests were added (not modified). Original 8 tests still pass with updated step clamp values (5 instead of 9) matching the spec's 6-step flow. No regressions.
- **`src/components/assessment/assessment.test.tsx`**: No changes in this fix cycle.

No new bugs, no scope creep, no regressions detected.

---

## Spec completeness re-check

All 25 spec requirements remain ✅ implemented (unchanged from cycle 1).
All 13 spec test cases remain ✅ tested, now with proper test file placement.

---

## Suggestions

_(Carried forward from cycle 1 — not blocking)_

- The `DIMENSION_ORDER` array is duplicated in `ScreeningPhase.tsx`, `ReviewStep.tsx`, and `DimensionStep.tsx`. Consider extracting it to a shared constant.
- `DimensionStep.tsx` is now dead code (no longer imported in `AssessmentShell.tsx`). Consider deleting it in a follow-up cleanup.
- `ReviewStep` uses `val > 0` filtering (per spec), which means a screening answer of "Not started" (0) will not appear in the review. This is by-spec design, but worth noting: the `answeredQuestions` Set could be used here instead for a more precise "was this question answered?" check, which would also show value-0 answers in the review.
