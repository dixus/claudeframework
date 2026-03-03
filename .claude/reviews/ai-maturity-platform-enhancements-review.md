# Review: ai-maturity-platform-enhancements

**Date:** 2026-03-03
**Spec:** `.claude/specs/ai-maturity-platform-enhancements.md`
**Reviewer:** Claude Code /2_review
**Overall assessment:** ✅ PASS (with minor fixes applied during review)

---

## Summary

All four features (Insights Panel, Playbook Panel, PDF Export, Glossary Page) are fully implemented and match the spec. 62 tests pass (18 new + 44 existing). TypeScript and ESLint are clean. The `src/lib/scoring/` framework-agnostic rule is respected throughout.

**One environment fix was applied:** `tailwind.config.ts` (a leftover Tailwind v3 config with no active settings) was removed. Having a v3 config file alongside Tailwind v4 packages (`@tailwindcss/postcss`, `@import "tailwindcss"`) causes CSS not to regenerate properly in dev HMR. The production build was already working; this fixes dev-mode reliability. The `.next` cache was also cleared.

---

## Issues

### Critical (blocking)

None.

### Major

None.

### Minor

**1. PDF silently omits radar chart if SVG is absent**
- File: [src/components/results/PdfExportButton.tsx](src/components/results/PdfExportButton.tsx) line 42
- `chartEl?.querySelector('svg')` returns `null` if the chart hasn't mounted. PDF is generated without the chart image with no user-visible warning. A user who clicks "Download" immediately on page load could receive an incomplete PDF silently.
- Suggestion: check SVG presence before generating, or show a brief toast warning.

**2. Anchor slug in glossary page diverges from `slugify()` utility**
- File: [src/app/glossary/page.tsx](src/app/glossary/page.tsx) line ~15
- Anchor IDs use `term.toLowerCase().replace(/[^a-z0-9]+/g, '-')` but don't strip leading/trailing hyphens the way `slugify()` in `PdfExportButton.tsx` does. Harmless for the current 18 terms, but any future term starting/ending with punctuation would produce a malformed anchor (`#-term-`).

---

## Suggestions (non-blocking)

- **S1 — Move `slugify()` to a shared util:** `slugify()` is exported from `PdfExportButton.tsx`, a non-obvious location. Moving it to `src/lib/scoring/utils.ts` would let the glossary page, PDF export, and future code share one implementation.

- **S2 — Component render tests for new panels:** `InsightsPanel`, `PlaybookPanel`, and the glossary page have no React rendering tests. Business logic is well-covered, but smoke tests for the JSX would guard against prop-shape regressions.

- **S3 — Spec should mandate a "viewed in browser" validation step:** The broken dev environment was not caught by the spec's validation criteria (TypeScript, lint, unit tests all passed). Adding a checklist item like "run `npm run dev` and visually verify the page renders with styles" would catch dev HMR/CSS cache issues before they reach review.

---

## Spec Validation

| Criterion | Status |
|---|---|
| InsightsPanel visible below ScoreCard with correct ARR/employee and time-to-€100M | ✅ |
| PlaybookPanel shows correct model name and timeline based on gap and bottleneck | ✅ |
| PDF download produces file with company name, θ score, dimension table | ✅ |
| `/glossary` renders 18 terms alphabetically with definitions | ✅ |
| Glossary link in header navigates to `/glossary` | ✅ |
| `npx tsc --noEmit` passes | ✅ |
| `npm run lint` passes | ✅ |
| All new tests pass | ✅ (18 new tests, 62 total) |
| `npm run build` succeeds | ✅ |

---

## Per-lens Notes

| Lens | Finding |
|---|---|
| **Correctness** | All spec requirements met; model selection logic correct for all 3 branches; benchmark data matches spec |
| **Code quality** | Consistent with existing patterns; no over-engineering; no `any` types |
| **Security** | No injection risk; company name sanitized via `slugify()` in filename; PDF is client-side only |
| **Tests / QA** | 18 new tests; all 3 model branches covered; slugify edge cases covered; 44 existing tests unbroken |
| **UX / Minimal impact** | Changes scoped tightly to spec; `RadarChartPanel` change is a single `id` attribute |
| **PM** | All four features delivered; nothing built beyond what was asked |
| **DevOps** | One new dep (`jspdf ^4.2.0`); dynamically imported (no bundle bloat); stale `tailwind.config.ts` removed |
| **Spec validation** | All 8 spec criteria confirmed ✅ |

---

## Environment Fix Applied

```bash
git rm tailwind.config.ts   # removed v3 config incompatible with v4 HMR
rm -rf .next                # cleared stale cache
```

**Root cause of dev-mode styling failure:** `tailwind.config.ts` used `Config` from `tailwindcss` (v3 format). Tailwind v4's `@tailwindcss/postcss` plugin detects this file and can enter a compatibility mode that conflicts with the `@import "tailwindcss"` v4 CSS syntax — preventing CSS regeneration during HMR. Production builds were unaffected (full recompile). Dev-mode requires cache clearing + server restart after major file additions.

**To start fresh:** `npm run dev`
