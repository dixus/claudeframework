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

---

## 2026-03-22 — HelpSection placed before panel header instead of below it

**What went wrong**: During panel integration, `<HelpSection>` was placed before the panel title element in ScoreCard.tsx, CaseStudyPanel.tsx, and CapabilityPlaybookPanel.tsx. The spec requirement 7 explicitly states it should be placed "directly below the panel header". The reviewer flagged all three as inconsistent placements that affect UX consistency.

**Rule**: When integrating an expandable help/info component into a panel, always place it immediately after the panel's title/header element — not before it and not between unrelated content blocks. The pattern is: header → HelpSection → body content. Verify placement visually before closing the implementation by reading the first 30 lines of each modified panel.

---

## 2026-03-22 — HelpTerm missing for Recharts chart legend strings

**What went wrong**: The spec listed "O(n²)" in CoordinationPanel as a term requiring `<HelpTerm>` wrapping, but the implementation left the Recharts `<Line name="...">` strings as plain text. These strings are not JSX — they're string props consumed by Recharts' `<Legend>` component, so direct wrapping in JSX is not possible at the `name` prop level.

**Rule**: When a spec requires HelpTerm wrapping for text that appears inside a third-party chart library (Recharts, Victory, etc.), check whether the component supports a custom `formatter` prop that can return JSX. For Recharts `<Legend>`, use the `formatter={(value) => <HelpTerm term="...">value</HelpTerm>}` pattern to inject interactive elements into legend items. Do not leave chart label strings as untooltipped plain text if the spec explicitly flags them.

---

## 2026-03-22 — Scope creep: out-of-spec files modified during implementation

**What went wrong**: During the landing-page-enhancement implementation, `InsightsPanel.tsx` and `RoadmapPanel.tsx` (in `src/components/results/`) were modified with quote-style and unicode escape reformatting. Neither file is listed in the spec's "Affected files" section. The changes were formatting-only with no functional impact, but they polluted the diff and violated the spec boundary.

**Rule**: Before committing or ending an implementation cycle, run `git diff --name-only` and cross-reference every modified file against the spec's "Affected files" and "New files" lists. Any file not on those lists must be reverted with `git checkout main -- <file>` before proceeding. Linter/formatter auto-fixes that touch out-of-scope files should be undone — they belong in a dedicated formatting commit, not in a feature branch.

---

## 2026-03-22 — Tooltip data registry incomplete at implementation time

**What went wrong**: The spec listed "scaling coefficient" and "O(n²)/O(n log n)/O(n)" as terms requiring HelpTerm wrapping, but the `HELP_TOOLTIPS` data registry in `tooltips.ts` was not updated with corresponding keys (`scaling_coefficient`, `coordination_o_n2`). The JSX wrapping was never added either. Both the data entry and the JSX integration were simultaneously missing.

**Rule**: Before integrating HelpTerm into any panel, first confirm the tooltip key exists in `HELP_TOOLTIPS`. When implementing the full list of HelpTerm requirements from a spec, do a final cross-check: for each term listed in spec requirement 8, verify (1) a key exists in `tooltips.ts` and (2) a `<HelpTerm term="...">` appears in the target panel JSX. Treat these as a paired requirement — either both exist or neither is complete.

---

## 2026-03-22 — Circular import from defining a utility in the wrong module

**What went wrong**: `slugify` was defined and exported from `PdfExportButton.tsx` (a UI component), then imported by `generatePdf.ts` (a pure logic module). `PdfExportButton.tsx` also imports from `generatePdf.ts`, creating a circular dependency. While bundlers often resolve this at build time, circular imports are fragile and can cause undefined values at runtime depending on evaluation order.

**Rule**: Pure utility functions with no UI dependencies (string manipulation, date formatting, etc.) must live in the logic/utility module, not in a React component file. When a pure module and a UI component need a shared function, the function always goes in the pure module. A component may import from a logic module, but a logic module must never import from a component file.

---

## 2026-03-22 — Eager DB initialization throws at build time without env vars

**What went wrong**: `export const db = getDb()` at module level runs the DB initialization function immediately when the module is imported. Since Next.js server components import DB modules at the top level, `next build` throws at build time if `POSTGRES_URL` is not set in the build environment. The intent was to initialize once (singleton), but eager initialization is wrong for environment-dependent resources.

**Rule**: Never initialize environment-dependent resources (DB connections, API clients, etc.) at module evaluation time. Use lazy initialization: declare a module-level `let _instance = null`, initialize in a getter function called on first access, and export either the getter function or a Proxy that calls the getter. The pattern is `let _db: T | null = null; export function getDb(): T { if (_db) return _db; /* init */ return _db; }`. For consumer code that expects a direct `db` export, wrap with a `Proxy` that calls the getter on first property access.

---

## 2026-03-22 — Test file inside Next.js dynamic route directory breaks vitest glob collection

**What went wrong**: A test file placed inside `src/app/results/[hash]/` could not be collected by vitest because the square brackets in the directory name are treated as glob character classes. Vitest's file discovery uses glob patterns to find test files, and `[hash]` in a path matches any single character from the set `{h, a, s}` rather than the literal directory name.

**Rule**: Never place test files inside Next.js dynamic route directories (`[param]/`). Place co-located tests for dynamic-route page components in the nearest parent directory without brackets (e.g., `src/app/results/savedResults.test.tsx` tests `src/app/results/[hash]/page.tsx`). Use a descriptive filename like `savedResults.test.tsx` or `hashPage.test.tsx` to indicate what is being tested.

---

## 2026-03-22 — Missing catch block leaves PDF export failures silent

**What went wrong**: The `handleExport` async function in `PdfExportButton.tsx` used `try/finally` with no `catch`. If the dynamic `import("jspdf")` failed (network error) or `generatePdfContent` threw, the error was silently swallowed. The button returned to its default state with no feedback to the user.

**Rule**: Any async handler that triggers a user-visible action (download, submit, upload) must have a `catch` block that surfaces the failure. At minimum: `console.error` + set a visible error state. A `try/finally` with no `catch` is only appropriate for cleanup logic where failure is expected and irrelevant to the user.

---

## 2026-03-23 — Component-level spec test cases omitted during implementation

**What went wrong**: During implementation of the benchmark-context feature, spec test cases 4-8 (component-level rendering assertions for RadarChartPanel, DimensionScorecard, ScoreCard, ScalingPanel) were not written. Only the pure-function test cases 1-3 were implemented in `benchmarks.test.ts`. The review caught all five missing component tests as a major issue.

**Rule**: After writing pure-function tests, explicitly iterate through every numbered test case in the spec's "Test cases" section. For each TC tagged as a component rendering test (e.g., "renders two `<Radar>` elements", "shows text X when prop Y"), add it to the relevant component test file — not just the library test file. A spec with 8 test cases must produce 8 passing test assertions before implementation is complete. Components that use Radix `<Tooltip>` or `<HelpTerm>` must be rendered with `{ wrapper: Wrapper }` (a `TooltipProvider`) to avoid a runtime error in jsdom.

---

## 2026-03-23 — Vitest v1 incompatible with Node.js v24; environmentMatchGlobs broken on Windows in v2

**What went wrong**: Vitest v1.6.x reports "No test suite found" for all test files when run on Node.js v24. This is a known incompatibility between vitest v1's vm module usage and Node v24's VM changes. Upgrading to vitest v2.x fixes the "No test suite found" crash. However, vitest v2 on Windows breaks `environmentMatchGlobs` path matching: vitest resolves the glob patterns with `path.resolve()` which produces Windows backslash paths (e.g., `D:\Repo\src\store\**`), but micromatch cannot match these because backslashes in a glob are treated as escape characters, not path separators. Test files that relied on `environmentMatchGlobs` for jsdom environment silently fall back to the node environment and fail with "localStorage is not defined".

**Rule**: When using `environmentMatchGlobs` on Windows with vitest v2, the glob resolution bug means the patterns never match. The reliable workaround is to add `// @vitest-environment jsdom` directives directly in each test file that requires a browser-like environment (any test that uses `localStorage`, `document`, `window`, React `render()`, or Radix UI components). Do not rely on `environmentMatchGlobs` alone on Windows. For new test files that use browser APIs, always add the directive at line 1.

---

## 2026-03-30 — Accessibility requires data the component type doesn't carry

**What went wrong**: The `BenchmarkComparisonPanel` spec required `aria-label` on dimension bars containing "user score and cohort mean," but `BenchmarkComparison` only stored `dimensionDeltas`. The component could not construct the required accessible description without additional data, which was only discovered during review.

**Rule**: When defining a result/comparison DTO (e.g., `BenchmarkComparison`), include all values that the accessibility spec requires to be surfaced — not just what the visual rendering needs. Deltas alone are insufficient when `aria-label` must state absolute user and reference values. If a spec has an Accessibility section, cross-check every `aria-label` requirement against the DTO fields before finalizing the type definition.

---

## 2026-03-22 — Zustand persist middleware re-writes state after reset, defeating localStorage cleanup

**What went wrong**: The Zustand `persist` middleware subscribes to all state changes. When `reset()` sets state back to initial values, the middleware immediately writes those initial values to localStorage. The key still exists (with `step: 0`), so any check for key existence (`localStorage.getItem(key) !== null`) would find saved state even after reset. The ResumeBanner appeared on every page load because the key was never actually removed.

**Rule**: When using Zustand `persist` middleware and the intent is to fully clear saved state (on submit, reset, or logout), always call `localStorage.removeItem(key)` explicitly after the `set()` call. The persist middleware's automatic write-on-change behavior means resetting state to initial values is NOT equivalent to clearing localStorage. Additionally, any "should we show a resume prompt?" check must verify meaningful progress (e.g., `step > 0`) rather than just checking key existence, as a defense-in-depth measure.
