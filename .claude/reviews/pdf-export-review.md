# Review: pdf-export

**Verdict: pass with fixes**

No critical issues. Two major issues that should be addressed before shipping.

## Summary

The implementation delivers a working client-side PDF export using `jspdf` (the spec's alternative option). The `PdfExportButton` component is properly integrated into `ResultsPage.tsx`, tests pass (5/5), typecheck is clean, and the build succeeds. The PDF content covers all four spec pages with correct conditional inclusion of pages 3-4. Two major architectural issues need fixing: a circular import between `generatePdf.ts` and `PdfExportButton.tsx`, and the `slugify` utility being defined in a UI component rather than a shared module.

## Issues

1. **[major]** `src/components/results/generatePdf.ts:2` — **Circular import between `generatePdf.ts` and `PdfExportButton.tsx`.** `generatePdf.ts` imports `slugify` from `PdfExportButton.tsx`, and `PdfExportButton.tsx` imports `generatePdfContent` and `buildFilename` from `generatePdf.ts`. While bundlers may resolve this at build time, circular dependencies are fragile and can cause runtime issues (undefined imports) depending on module evaluation order. Fix: move `slugify` into `generatePdf.ts` (it is a pure utility with no React dependency) or into a shared `utils.ts` file.

2. **[major]** `src/components/results/PdfExportButton.tsx:21-22` — **No error handling on PDF generation failure.** If `jspdf` fails to load (network error on dynamic import) or `generatePdfContent` throws, the error is silently swallowed by the `try/finally` block. The user sees the button return to its default state with no indication that the export failed. Fix: add a `catch` block that surfaces the error to the user (e.g. toast, inline error message, or `console.error` at minimum).

3. **[minor]** `src/components/results/generatePdf.ts:167` — **Hardcoded gap target of 70.** The gap calculation `Math.max(0, 70 - dim.score)` uses a magic number. This should reference the level-specific target or at least be a named constant with a comment explaining the threshold.

4. **[minor]** `src/components/results/generatePdf.ts:59` — **Assessment date uses `new Date()` at render time**, not the actual assessment date. The date is also created multiple times (once per footer call plus once in page 1). If a date is available on the result object, it should be used; otherwise the current date should be computed once and passed through.

## Suggestions

- The spec names the file `PdfReport.tsx`, but the implementation split it into `generatePdf.ts` (logic) and `PdfExportButton.tsx` (UI). This is actually a better separation of concerns and is fine to keep.
- The spec mentions `@react-pdf/renderer` as the primary technology; `jspdf` was chosen instead (the spec explicitly lists it as an alternative). This is acceptable but worth noting for anyone referencing the spec later.
- Consider adding an `aria-label` to the export button for accessibility.

## Spec Completeness

| Criterion                                                               | Status                                    |
| ----------------------------------------------------------------------- | ----------------------------------------- |
| PDF generates client-side without server dependency                     | ✅                                        |
| All 4 pages render with correct data                                    | ✅                                        |
| Pages 3-4 conditionally included based on available data                | ✅                                        |
| Download button visible on results page                                 | ✅                                        |
| Generated PDF opens correctly in Chrome, Firefox, Safari                | ⚠️ Cannot verify in review (runtime only) |
| File naming convention: `{company}-ai-maturity-report-{YYYY-MM-DD}.pdf` | ✅ (tested)                               |
| `npx vitest run` — all tests pass                                       | ✅ (5/5)                                  |
| `npm run build` — clean build                                           | ✅                                        |
| Unit test: renders without errors given complete AssessmentResult       | ✅                                        |
| Unit test: renders without errors given minimal AssessmentResult        | ✅                                        |
| Footer on all pages with branding, page number, date                    | ✅                                        |
| Loading spinner during PDF generation                                   | ✅                                        |
| Company name + assessment date on page 1                                | ✅                                        |
| θ Score display                                                         | ✅                                        |
| Maturity level badge                                                    | ✅                                        |
| META prediction section                                                 | ✅                                        |
| Key insight summary                                                     | ✅                                        |
| Dimension score table with weights and gaps                             | ✅                                        |
| Bottleneck callout with top 3 actions                                   | ✅                                        |
| C1-C4 capability scores                                                 | ✅                                        |
| Capability bottleneck identification                                    | ✅                                        |
| Scaling velocity with band classification                               | ✅                                        |
| What-if scenarios table                                                 | ✅                                        |
| Roadmap summary                                                         | ✅                                        |
| Playbook with phases and timeline                                       | ✅                                        |
| Expected impact metrics                                                 | ✅                                        |
