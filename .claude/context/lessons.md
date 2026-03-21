# Lessons

Corrections and patterns captured across sessions. Updated automatically after any user correction.
Each entry: what went wrong → rule that prevents it.

---

<!-- Add entries below this line as: "## YYYY-MM-DD — <topic>" -->

## 2026-03-21 — Falsy-zero bug in Likert selection state

**What went wrong**: Using `value || null` to determine if a Likert button should show as selected fails when the valid selected value is `0` (e.g., "Not started"). The expression `0 || null` evaluates to `null`, so the "Not started" option never highlights after being selected, even though it was clicked.

**Rule**: Never use `|| null` (or any falsy check) to determine if a user-controlled value has been explicitly set. Instead, track "has this been answered" separately (e.g., a `Set<string>` of answered question IDs). Use `isAnswered ? currentValue : null` pattern. This applies to all Likert, rating, and numeric-zero scenarios.

---

## 2026-03-21 — Store tests placed in component test file

**What went wrong**: When implementing a feature, store/pure-function tests (testing Zustand actions, adaptive level computation, queue counts, back-nav recompute, scoring engine compatibility) were placed in the component test file (`assessment.test.tsx`) instead of the store test file (`assessmentStore.test.ts`). This violates separation of concerns and means the store test file is not the canonical location for store behavior.

**Rule**: Tests that only interact with `useAssessmentStore.getState()` or pure library functions (no `render`, no `screen`, no `userEvent`) belong in the store/library test file. Only tests that call `render()` belong in component test files. When writing tests during implementation, place each test in the file that matches its subject (store logic → store test, component behavior → component test).

---

## 2026-03-21 — Test coverage for all spec test cases

**What went wrong**: When implementing a feature, the code change for the glossary back link (`href="/"`) was made correctly, but the corresponding spec test case (test case 7: "Glossary back link updated") was not added to the test file. The implementation was complete but the spec test coverage was incomplete.

**Rule**: After implementing all code changes for a spec, cross-reference every numbered test case in the spec's "Test cases" section against the actual test file. For each test case, verify a corresponding test exists. If any test case is missing, add it before marking the task done. Server components that import static data (no React hooks, no API calls) can be rendered directly in jsdom tests without mocking.

---

## 2026-03-21 — GrowthEngineType not re-exported from types.ts

**What went wrong**: The spec required `GrowthEngineType` to be added to `types.ts` exports, but the implementation used inline dynamic import syntax (`import("./growth-engines").GrowthEngineType`) in interface fields instead of a top-level re-export. Consumers of `types.ts` could not access `GrowthEngineType` without also importing directly from `growth-engines.ts`, fragmenting the API surface.

**Rule**: When a spec says "add X to exports in file Y", always add a top-level `export type { X } from "./source"` re-export in file Y. Inline dynamic import references in interface fields are not equivalent to exporting the type — they satisfy TypeScript structurally but break the intended module API surface.

---

## 2026-03-21 — Review identified missing tests that already existed

**What went wrong**: A review flagged "no direct test for `classifyGrowthEngine()` with each pure type" as a partial issue, but the test file already contained tests for PLG, SLG, and CLG pure types. The review was likely generated from a stale view of the codebase or the reviewer missed the existing coverage.

**Rule**: Before acting on a review's "missing test" flag, always read the actual test file to confirm the tests are absent. If tests already exist and cover the requirement, document this in the fix report as "already resolved" rather than adding duplicate tests.

---

## 2026-03-21 — What-if scenario hard assignment lowers an already-high score

**What went wrong**: In `computeScalingVelocity()`, the `fixBottleneck` what-if scenario used a hard assignment `{ ...capScores, [bottleneckCapability]: 85 }`. The `fixAll` scenario correctly used `Math.max`, but `fixBottleneck` did not, meaning if the bottleneck capability was already above 85, it would be lowered to 85 — producing a `fixBottleneckS` value less than `currentS`, which is logically wrong.

**Rule**: When implementing a "raise X to at least Y" what-if scenario, always use `Math.max(currentValue, targetValue)` — never a bare assignment. A "floor" operation (`Math.max`) is semantically different from a "set" operation. If one scenario in a set uses `Math.max`, review all sibling scenarios for consistency before completing the implementation.

---

## 2026-03-21 — Unused function parameter when chart data doesn't include the user's position

**What went wrong**: `computeCoordinationCurves(teamSize, theta)` accepted a `teamSize` parameter but generated data only for a hardcoded array `[10, 25, 50, 100, 200, 500]`. If the company's team size (e.g., 80) was not in that array, the `ReferenceLine x={teamSize}` in the chart had no matching data point, so the "You are here" marker rendered with no dot on the company curve.

**Rule**: When a chart function accepts a user-specific value (team size, date, etc.) to anchor a marker, always inject that value into the data array if it isn't already present, then sort the array. Never accept a parameter and silently ignore it — either use it or remove it. Pattern: `const sizes = BASE_SIZES.includes(value) ? BASE_SIZES : [...BASE_SIZES, value].sort((a, b) => a - b)`.
