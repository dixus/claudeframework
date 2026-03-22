# Spec: Database Persistence — Store & Recall Assessment Results

## Goal

Add a lightweight persistence layer using Vercel Postgres (Neon) and Drizzle ORM so that completed assessment results are saved to a database, users receive a unique shareable link to revisit their results, and we accumulate a dataset for future analytics and benchmarking.

## Source Documents

- `08 Database Persistence_2026-03-22.txt` — full PRD with schema, API routes, user flow, and security considerations

## Requirements

1. Store assessment results in a Postgres database after the user clicks "Save My Results"
2. Generate a unique nanoid-based hash (21 chars, URL-safe) as the access token for each saved assessment
3. Provide a shareable URL `/results/[hash]` that reconstructs the full results page from the stored snapshot
4. Optionally collect email and company name — never required for saving
5. Store both queryable individual score columns AND a full `result_snapshot` JSONB blob for backward compatibility
6. Never expose `email`, `user_agent`, or `referrer` in the public GET endpoint
7. Use Drizzle ORM with `@neondatabase/serverless` for HTTP-based serverless connections
8. All new dependencies: `@neondatabase/serverless`, `drizzle-orm`, `nanoid`, `drizzle-kit` (dev)

## Out of Scope

- Admin dashboard for aggregate data (query DB directly)
- Benchmarking / percentile display on results page
- Email notification system (retake reminders)
- Assessment comparison (side-by-side two hashes)
- Rate limiting beyond Vercel defaults
- GDPR deletion endpoint
- User accounts or authentication

## Affected files

| File                                     | Change                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/results/ResultsPage.tsx` | Add `<SaveResultsCard />` below the results footer, pass `result` prop                                                                      |
| `src/store/assessmentStore.ts`           | Add `growthEngine` and `enablers` to the data passed to the save card (already exposed via selectors — no store changes needed, but verify) |
| `package.json`                           | Add runtime deps (`@neondatabase/serverless`, `drizzle-orm`, `nanoid`) and dev dep (`drizzle-kit`)                                          |
| `.env.example`                           | Add `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` placeholder entries                                                                       |
| `drizzle.config.ts`                      | New config file at project root for Drizzle Kit CLI                                                                                         |

## New files

| File                                              | Purpose                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/db/schema.ts`                            | Drizzle schema definition — `assessments` table                                                                                         |
| `src/lib/db/index.ts`                             | Database connection singleton using `@neondatabase/serverless` + `drizzle-orm`                                                          |
| `src/app/api/assessments/route.ts`                | `POST /api/assessments` — validate input, generate hash, insert row, return hash+URL                                                    |
| `src/app/api/assessments/[hash]/route.ts`         | `GET /api/assessments/[hash]` — look up by hash, return result snapshot (without private fields)                                        |
| `src/app/results/[hash]/page.tsx`                 | Dynamic results page — server component that fetches from DB and renders results                                                        |
| `src/app/results/[hash]/ResultsPageClient.tsx`    | Client component wrapper that receives `AssessmentResult` as prop and renders the existing results UI without needing the Zustand store |
| `src/components/results/SaveResultsCard.tsx`      | Save UI card with optional email/company fields, save button, and copy-link success state                                               |
| `src/components/results/SaveResultsCard.test.tsx` | Tests for the save card component                                                                                                       |
| `src/app/api/assessments/assessments.test.ts`     | Tests for both API routes (POST + GET)                                                                                                  |

## Patterns to mirror

1. **`src/lib/scoring/types.ts`** — for type definition style: named exports, clear interfaces, JSDoc-optional. The new `src/lib/db/schema.ts` should follow similar naming and export conventions.
2. **`src/components/results/PdfExportButton.tsx`** — for UI component pattern on the results page: a self-contained component that receives `result` as a prop, manages its own loading/success state, and lives alongside other results components.
3. **`src/app/assessment/page.tsx`** — for page component structure: minimal page files that delegate to a component, use `"use client"` only when needed.

## Implementation notes

### Module boundary architecture (historical pattern: circular imports)

The DB layer, API routes, and UI components MUST maintain clean unidirectional dependencies:

```
src/lib/db/          → depends on: nothing in src/ (only drizzle-orm, neon driver)
src/app/api/         → depends on: src/lib/db/, src/lib/scoring/types.ts
src/app/results/     → depends on: src/lib/db/, src/components/results/
src/components/       → depends on: src/lib/scoring/types.ts (for type imports only)
```

**Rules:**

- `src/lib/db/` must NOT import from `src/components/`, `src/store/`, or `src/app/`
- `src/app/api/` must NOT import from `src/components/` or `src/store/`
- `src/components/results/SaveResultsCard.tsx` calls the API via `fetch()` — no direct DB imports
- Type sharing happens through `src/lib/scoring/types.ts` only — do not re-export DB types into components

### Schema definition (`src/lib/db/schema.ts`)

```typescript
import {
  pgTable,
  uuid,
  varchar,
  decimal,
  jsonb,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  hash: varchar("hash", { length: 21 }).unique().notNull(),
  email: varchar("email", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  dimensionScores: jsonb("dimension_scores").notNull(),
  capabilityScores: jsonb("capability_scores"),
  enablerScores: jsonb("enabler_scores"),
  growthEngine: varchar("growth_engine", { length: 10 }),
  resultSnapshot: jsonb("result_snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  referrer: varchar("referrer", { length: 500 }),
});
```

### Database connection (`src/lib/db/index.ts`)

- Use `@neondatabase/serverless` `neon()` HTTP driver (no WebSocket, no persistent connections)
- Use `drizzle(neonClient)` from `drizzle-orm/neon-http`
- Read `POSTGRES_URL` from `process.env` — fail with clear error if missing
- Export a singleton `db` instance

### POST `/api/assessments` validation

Input validation (no external library — use manual checks):

- `dimensionScores` — required, must be an object with 6 dimension keys, each value 0-5
- `result` — required, must be an object with at least `thetaScore` and `dimensions`
- `email` — optional, if provided must match basic email regex
- `companyName` — optional, string max 255 chars
- `capabilityScores`, `enablerScores`, `growthEngine` — optional
- Return 400 with descriptive error message on validation failure

### GET `/api/assessments/[hash]` response shape

```typescript
{
  hash: string;
  result: AssessmentResult; // from result_snapshot
  dimensionScores: Record<DimensionKey, number>;
  growthEngine: string | null;
  createdAt: string; // ISO 8601
}
```

Private fields (`email`, `userAgent`, `referrer`) are excluded from the response.

### Dynamic results page (`src/app/results/[hash]/page.tsx`)

- **Server component** — fetches from DB directly (not via API) for performance
- On success: passes `AssessmentResult` to `ResultsPageClient` which renders the same UI as the current `ResultsPage` but receives result as a prop instead of from Zustand
- On 404: renders a friendly "Assessment not found" message with a link to take the assessment
- Add `robots: "noindex"` in metadata to prevent search engine indexing

### ResultsPageClient vs existing ResultsPage

The existing `ResultsPage` reads from the Zustand store. The new `ResultsPageClient` receives `result` as a prop. To avoid duplicating the entire results UI:

- Extract the rendering logic from `ResultsPage` into shared content, OR
- Have `ResultsPageClient` set the Zustand store from the prop and then render `ResultsPage` (simpler but couples to store), OR
- **(Recommended)** Make `ResultsPageClient` a thin wrapper that receives the result prop and renders the same sub-components (`ScoreCard`, `RadarChartPanel`, etc.) directly — duplicating the layout is acceptable since it's just JSX composition, not logic

### SaveResultsCard states

1. **Default**: Card with optional email/company fields + "Save & Get Link" button
2. **Saving**: Button shows spinner, fields disabled
3. **Success**: Shows shareable URL + "Copy Link" button + confirmation message
4. **Error**: Shows error message with retry button

### nanoid configuration

Use `nanoid` default (21 chars, URL-safe alphabet: `A-Za-z0-9_-`). This gives 126 bits of entropy — sufficient for unguessable hashes.

### Environment variables

```
POSTGRES_URL=postgresql://...          # Pooled connection string (from Vercel dashboard)
POSTGRES_URL_NON_POOLING=postgresql://... # Direct connection (for migrations)
```

These are auto-populated when linking a Vercel Postgres database in the Vercel dashboard. For local dev, copy from Vercel dashboard into `.env.local`.

### Migration strategy

Use `drizzle-kit push` for initial development. Add `"db:push": "drizzle-kit push"` and `"db:studio": "drizzle-kit studio"` to `package.json` scripts.

## UX concept

### Component tree

```
ResultsPage (existing, modified)
└── SaveResultsCard (new)
    ├── EmailInput (optional field)
    ├── CompanyInput (optional field)
    ├── SaveButton (with loading state)
    └── SuccessPanel (shown after save)
        ├── ShareableLink (readonly URL display)
        └── CopyLinkButton

results/[hash]/page.tsx (new, server component)
└── ResultsPageClient (new, client component)
    ├── ScoreCard (existing)
    ├── RadarChartPanel (existing)
    ├── Tab navigation (existing pattern from ResultsPage)
    └── [all existing results sub-components]
```

### Interaction flows

**Save flow:**

1. User completes assessment → results render (existing flow, unchanged)
2. Below results footer, `SaveResultsCard` appears in default state
3. User optionally enters email and/or company name
4. User clicks "Save & Get Link"
5. Card transitions to saving state (spinner, fields disabled)
6. `POST /api/assessments` is called with `fetch()`
7. On success → card transitions to success state showing the shareable URL
8. User clicks "Copy Link" → URL copied to clipboard, button text changes to "Copied!"
9. On error → card shows error message with "Try Again" button

**Recall flow:**

1. User visits `/results/abc123xyz`
2. Server component fetches assessment from DB by hash
3. If found → renders `ResultsPageClient` with full result
4. If not found → renders "Assessment not found" with link to `/assessment`

### State & data flow

- `SaveResultsCard` owns local state: `email`, `companyName`, `status` (idle | saving | success | error), `shareUrl`
- It receives `result: AssessmentResult` as a prop from `ResultsPage`
- It also needs `enablers` and `growthEngine` from the store (read via selectors) for the POST body
- The POST request sends dimension scores (extracted from `result.dimensions`), capability scores, enabler scores, growth engine, and the full result snapshot
- `ResultsPageClient` receives `result: AssessmentResult` as a prop — no Zustand dependency

### Responsive behavior

- `SaveResultsCard`: full-width card, fields stack vertically on mobile, side-by-side on `md`+
- Copy link section: URL truncated with ellipsis on small screens, full on `md`+

### Accessibility

- All form inputs have visible labels (not just placeholders)
- Save button announces loading state via `aria-busy`
- Success state: shareable URL is in a readonly input for easy selection
- Copy button provides `aria-live="polite"` feedback ("Link copied")
- Error state: error message linked to save button via `aria-describedby`
- All interactive elements keyboard-reachable in logical tab order

### Reuse check

- Card styling: use existing shadcn/ui `Card` pattern from other results panels
- Button styling: match existing button styles in `ResultsPage` (indigo primary, gray secondary)
- Input fields: standard Tailwind form inputs — no existing form component to reuse (assessment uses Likert scales, not text inputs)
- Loading spinner: use a simple CSS spinner or existing pattern if available

## Validation criteria

1. Completing an assessment and clicking "Save & Get Link" returns a hash and displays a shareable URL
2. Visiting `/results/[valid-hash]` renders the full results page with all panels matching the original assessment
3. Visiting `/results/[invalid-hash]` shows a friendly "Assessment not found" message
4. The POST endpoint returns 400 when `dimensionScores` or `result` is missing from the request body
5. The GET endpoint response does NOT contain `email`, `userAgent`, or `referrer` fields
6. Email field is optional — saving without email succeeds
7. The "Copy Link" button copies the URL to the clipboard
8. The `assessments` table has a unique index on `hash`
9. `src/lib/db/` has zero imports from `src/components/`, `src/store/`, or `src/app/`
10. `src/app/api/` has zero imports from `src/components/` or `src/store/`

## Test cases

### API route tests (`src/app/api/assessments/assessments.test.ts`)

1. **POST — valid full payload**: Send a complete request body with dimension scores, capability scores, enablers, growth engine, result snapshot, email, and company name → returns 200 with `{ hash, url }`, hash is 21 chars
2. **POST — minimal payload**: Send only `dimensionScores` and `result` (no optional fields) → returns 200 with `{ hash, url }`
3. **POST — missing dimensionScores**: Omit `dimensionScores` → returns 400 with descriptive error
4. **POST — missing result**: Omit `result` → returns 400 with descriptive error
5. **POST — invalid email format**: Send `email: "not-an-email"` → returns 400
6. **GET — valid hash**: Insert a test row, GET by hash → returns result snapshot, dimensionScores, createdAt; does NOT contain email or userAgent
7. **GET — unknown hash**: GET with non-existent hash → returns 404

### SaveResultsCard tests (`src/components/results/SaveResultsCard.test.tsx`)

8. **Renders default state**: Card shows email input, company input, and save button
9. **Save without optional fields**: Click save with empty email/company → fetch is called with correct payload, card shows success state
10. **Save with email and company**: Fill in both fields, click save → payload includes email and companyName
11. **Shows shareable URL on success**: After successful save → card displays the returned URL and a "Copy Link" button
12. **Shows error on failure**: Mock fetch to return 500 → card shows error message with retry option
13. **Copy link**: Click "Copy Link" → `navigator.clipboard.writeText` called with the URL

### Dynamic results page tests

14. **Renders results from DB**: Given a valid hash with stored result → page renders `ResultsPageClient` with correct data
15. **Shows not-found for invalid hash**: Given a non-existent hash → page renders "Assessment not found" with link to `/assessment`

## Decisions made by Claude

1. **(medium)** Chose to create a separate `ResultsPageClient` component rather than reusing `ResultsPage` directly — avoids coupling the shared results page to Zustand for the DB-loaded path, at the cost of some JSX duplication in layout composition.
2. **(low)** Placed API route tests in `src/app/api/assessments/assessments.test.ts` co-located with the routes, matching the pattern of test files living near their subjects.
3. **(low)** Used manual input validation in the POST handler rather than adding a validation library (e.g., zod) — keeps dependencies minimal for a single endpoint with straightforward validation rules.
4. **(medium)** The dynamic results page (`/results/[hash]`) fetches directly from DB in the server component rather than calling the API route — this avoids an unnecessary network hop and is the standard Next.js pattern for server components.
5. **(low)** Added `drizzle.config.ts` at project root (standard location for Drizzle Kit CLI).
6. **(medium)** `SaveResultsCard` reads `enablers` and `growthEngine` from Zustand store via selectors rather than receiving them as props — these values are available in the store and threading them through props from ResultsPage adds unnecessary prop drilling.

## Complexity check

**Affected files**: 5 (ResultsPage.tsx, assessmentStore.ts, package.json, .env.example, drizzle.config.ts)
**New files**: 9 (schema.ts, db/index.ts, POST route, GET route, [hash]/page.tsx, ResultsPageClient.tsx, SaveResultsCard.tsx, SaveResultsCard.test.tsx, assessments.test.ts)
**Total**: 14 files

> **Warning — Complexity flag**: This feature touches 14 files, exceeding the default complexity gate of 10. Consider splitting into two implementation sessions:
>
> - **Phase 1 (backend)**: DB schema, connection, API routes, route tests, dependencies (7 files)
> - **Phase 2 (frontend)**: SaveResultsCard, ResultsPageClient, dynamic page, ResultsPage modification, component tests (7 files)
