# Review: database-persistence

**Date**: 2026-03-22
**Spec**: `.claude/specs/database-persistence.md`
**Mode**: Full review (first cycle)

## Summary

**Verdict: pass with fixes**

The implementation is well-structured and covers the core feature: DB schema, API routes with input validation, dynamic results page, SaveResultsCard with all four states, and comprehensive tests for routes and card. Module boundaries are clean, all 206 tests pass, and TypeScript reports no errors. However, there are two major issues that must be resolved: eager DB initialization that will break builds without `POSTGRES_URL`, and missing spec test cases 14-15 for the dynamic results page.

## Issues

1. **[major]** `src/lib/db/index.ts` line 16 — Eager DB initialization at module load. `export const db = getDb()` runs immediately when the module is imported. Since `src/app/results/[hash]/page.tsx` (a server component) imports `db` at the top level, `next build` will throw if `POSTGRES_URL` is not set in the build environment. The standard serverless pattern is lazy initialization: export a getter function or use a module-level variable that initializes on first access (`let _db: ... | null = null; export function getDb() { if (!_db) { ... } return _db; }`), or guard with a check that returns a proxy that defers connection until first query.

2. **[major]** Missing spec test cases 14 and 15 — "Renders results from DB" and "Shows not-found for invalid hash" for the dynamic results page (`src/app/results/[hash]/page.tsx` / `ResultsPageClient.tsx`). No test file exists for these components. The spec explicitly lists these as required test cases.

3. **[major]** `src/components/results/SaveResultsCard.tsx` line 70 — `handleCopy` has no error handling. `navigator.clipboard.writeText()` can throw (e.g., permissions denied, non-HTTPS context). The function is `async` but has no `try/catch`. Per the lessons file (2026-03-22 — Missing catch block), async handlers for user-visible actions must have a catch block that surfaces the failure.

## Suggestions

- `src/app/api/assessments/[hash]/route.ts` line 8 — In Next.js 14 App Router, `params` may need to be awaited depending on the Next.js version. Verify that the current Next.js version supports synchronous `params` access. If upgrading in the future, this may need `const { hash } = await params`.
- `src/components/results/SaveResultsCard.tsx` — Consider adding `aria-label` to the "Try Again" button for screen reader clarity, since it's nested inside the error text.
- `drizzle.config.ts` line 8 — The non-null assertion on `process.env.POSTGRES_URL_NON_POOLING!` is acceptable for a dev-only config file, but a clearer error message (similar to `db/index.ts`) would be friendlier for new contributors.

## Spec Completeness

### Requirements

1. Store assessment results in Postgres after "Save My Results" — ✅ implemented
2. Generate unique nanoid-based hash (21 chars, URL-safe) — ✅ implemented
3. Shareable URL `/results/[hash]` reconstructs full results page — ✅ implemented
4. Optionally collect email and company name, never required — ✅ implemented
5. Store queryable columns AND full `result_snapshot` JSONB — ✅ implemented
6. Never expose `email`, `user_agent`, or `referrer` in public GET — ✅ implemented (verified in GET route and tested)
7. Drizzle ORM with `@neondatabase/serverless` — ✅ implemented
8. All required dependencies added — ✅ implemented

### Validation Criteria

1. Save flow returns hash and displays shareable URL — ✅ met
2. `/results/[valid-hash]` renders full results page — ✅ met
3. `/results/[invalid-hash]` shows "Assessment not found" — ✅ met
4. POST returns 400 when required fields missing — ✅ met (tested)
5. GET response excludes private fields — ✅ met (tested)
6. Email optional — saving without email succeeds — ✅ met (tested)
7. "Copy Link" copies URL to clipboard — ✅ met (tested)
8. Unique index on `hash` — ✅ met (`.unique()` in schema)
9. `src/lib/db/` has zero imports from components/store/app — ✅ met (verified)
10. `src/app/api/` has zero imports from components/store — ✅ met (verified)

### Test Cases

1. POST — valid full payload — ✅ implemented
2. POST — minimal payload — ✅ implemented
3. POST — missing dimensionScores — ✅ implemented
4. POST — missing result — ✅ implemented
5. POST — invalid email format — ✅ implemented
6. GET — valid hash (excludes private fields) — ✅ implemented
7. GET — unknown hash → 404 — ✅ implemented
8. Renders default state — ✅ implemented
9. Save without optional fields → success — ✅ implemented
10. Save with email and company — ✅ implemented
11. Shows shareable URL on success — ✅ implemented
12. Shows error on failure — ✅ implemented
13. Copy link — ✅ implemented
14. Renders results from DB — ❌ missing (no test file for dynamic results page)
15. Shows not-found for invalid hash — ❌ missing (no test file for dynamic results page)

### Spec Completeness Gaps

- ❌ Test cases 14-15: Dynamic results page tests are not implemented (Issue #2 — major)
