# Spec: Landing Page

## Goal

Add a dedicated landing page that explains the AI Maturity Framework (AMF) — its purpose, maturity levels, assessment dimensions, and value proposition — before users enter the assessment flow.

## Requirements

- Display a hero section explaining what the AMF is: a framework to measure AI maturity across 6 dimensions
- Show the 4 maturity levels (Level 0–3: Traditional, AI-Powered, AI-Enabled, AI-Native) with brief descriptions
- Show the 6 assessment dimensions (Strategy, Architecture, Workflow, Data, Talent, Adoption) as visual cards
- Explain the value proposition: personalised θ score, actionable recommendations, peer benchmarks
- Include a prominent CTA button to start the assessment (links to `/assessment`)
- Include a link to the glossary page (`/glossary`) for deeper information
- Be visually appealing with distinct sections, cards for dimensions and levels
- Become the new default page at `/` — move the current assessment to `/assessment`

## Out of scope

- Authentication or user accounts
- Persisting assessment state across page navigations (Zustand store resets are acceptable)
- Animation libraries or heavy JavaScript interactivity beyond Tailwind hover/transition utilities
- Changes to the scoring engine or assessment flow logic
- SEO metadata beyond basic page title

## Affected files

| File                                      | Change                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                        | Replace AssessmentShell with new landing page content                                                                                                                |
| `src/app/layout.tsx`                      | Update header nav to include Home link alongside Glossary                                                                                                            |
| `src/app/glossary/page.tsx`               | Update "← Back" link to point to `/` (landing) instead of assessment                                                                                                 |
| `src/components/assessment/IntroStep.tsx` | Remove or simplify — the landing page now handles the "what is AMF" explanation; IntroStep becomes a brief "ready to begin?" confirmation within the assessment flow |

## New files

| File                                           | Purpose                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `src/app/assessment/page.tsx`                  | New route for the assessment flow — moves AssessmentShell here |
| `src/components/landing/LandingPage.tsx`       | Main landing page component composing all sections             |
| `src/components/landing/HeroSection.tsx`       | Hero banner with headline, subtitle, and primary CTA           |
| `src/components/landing/LevelsSection.tsx`     | Grid of 4 maturity level cards (Level 0–3)                     |
| `src/components/landing/DimensionsSection.tsx` | Grid of 6 dimension cards with icons and descriptions          |
| `src/components/landing/ValueSection.tsx`      | Value proposition section (score, recommendations, benchmarks) |

## Patterns to mirror

1. **`src/app/glossary/page.tsx`** — page-level layout pattern: full-width `<main>` with centered max-width container, Tailwind utility classes, server component by default
2. **`src/components/assessment/IntroStep.tsx`** — component structure: single named export, Tailwind styling, clear separation of content
3. **`src/components/results/DimensionScorecard.tsx`** — card-based layout pattern for displaying dimension data in a grid

## Implementation notes

### Content data

Define the levels and dimensions data as typed constants (either inline in the landing components or in a shared `src/lib/scoring/constants.ts` if one exists). Pull descriptions from the glossary data where possible to stay consistent.

**Maturity levels to display:**
| Level | Label | θ Range | ARR/Employee | One-liner |
|-------|-------|---------|-------------|-----------|
| 0 | Traditional | 0–20 | €150–200K | No AI integration in core operations |
| 1 | AI-Powered | 21–50 | €200–400K | AI substitutes human labour in existing workflows |
| 2 | AI-Enabled | 51–80 | €400–700K | AI augments capabilities through workflow redesign |
| 3 | AI-Native | 81–100 | €700K–1.5M | AI orchestrates multi-agent human-AI systems |

**Dimensions to display:**
| Dimension | Weight | Description |
|-----------|--------|-------------|
| Strategy | 20% | AI vision, roadmap, and executive commitment |
| Architecture | 15% | Technical infrastructure and AI platform readiness |
| Workflow | 25% | Process redesign and AI-human task allocation |
| Data | 15% | Data quality, pipelines, and governance |
| Talent | 15% | AI skills, hiring, and upskilling programs |
| Adoption | 10% | Organizational change management and AI usage |

### Routing change

The assessment currently lives at `/` (root). It must move to `/assessment`:

- Create `src/app/assessment/page.tsx` with the same content as the current `src/app/page.tsx`
- Replace `src/app/page.tsx` with the landing page
- The IntroStep (step 0 inside AssessmentShell) can be simplified since the landing page now covers the "what is this" explanation — but keep a brief confirmation step so users don't jump straight into questions

### Visual design

- Use a gradient or colored hero section to make the top visually distinct
- Levels section: 4 cards in a row (responsive: 2×2 on `md`, stacked on `sm`) with level number, label, and one-liner
- Dimensions section: 6 cards in a 3×2 grid (responsive: 2×3 on `md`, stacked on `sm`) with an emoji or icon, label, weight badge, and brief description
- Value proposition: 3 feature highlights (score, recommendations, benchmarks) as icon+text blocks
- Use existing Tailwind color palette — blues for primary actions, grays for structure
- No shadcn/ui components needed for the landing page — keep it simple with Tailwind utility classes

### Edge cases

- Direct navigation to `/assessment` should work without visiting the landing page first
- Browser back from `/assessment` should return to the landing page
- The Zustand store does not need to be aware of the landing page — it only manages assessment state

## UX concept

### Component tree

```
src/app/page.tsx (server component)
  └── LandingPage
        ├── HeroSection
        │     ├── h1 headline
        │     ├── p subtitle
        │     └── Link (CTA → /assessment)
        ├── LevelsSection
        │     └── 4× LevelCard (level number, label, θ range, ARR/employee, description)
        ├── DimensionsSection
        │     └── 6× DimensionCard (emoji/icon, label, weight, description)
        ├── ValueSection
        │     └── 3× ValueCard (icon, title, description)
        └── footer CTA
              ├── Link (Start Assessment → /assessment)
              └── Link (View Glossary → /glossary)
```

### Interaction flows

1. **Landing → Assessment**: User reads landing page → clicks "Start Assessment" CTA → navigates to `/assessment` → sees IntroStep (step 0) → proceeds through assessment
2. **Landing → Glossary**: User clicks "View Glossary" link → navigates to `/glossary` → reads terms → clicks "← Back" → returns to landing page
3. **Direct assessment access**: User navigates directly to `/assessment` → assessment loads normally at step 0

### State & data flow

- Landing page is stateless — no Zustand interaction
- All components are server components (no `'use client'` needed)
- Level and dimension data is defined as static constants — no API calls
- The CTA uses Next.js `<Link>` for client-side navigation to `/assessment`

### Responsive behavior

- **`lg` (1024px+)**: Hero full-width, levels 4-column grid, dimensions 3-column grid, value props 3-column
- **`md` (768px)**: Levels 2-column grid, dimensions 2-column grid, value props stacked or 2-column
- **`sm` (< 768px)**: Everything stacks vertically, cards full-width, CTA buttons full-width

### Accessibility

- All interactive elements (CTAs, links) are keyboard-reachable via native `<a>` / `<Link>` elements
- Semantic HTML: `<main>`, `<section>` with `aria-label` for each content block, `<h1>`–`<h3>` hierarchy
- Sufficient color contrast for all text (Tailwind gray-900/700 on white/gray-50 backgrounds)
- Focus rings on interactive elements (Tailwind default `focus:ring`)
- No ARIA live regions needed — page is static content

### Reuse check

- `next/link` — use for all navigation (CTA, glossary link)
- Tailwind utility classes — consistent with existing components
- No existing reusable card component in the codebase — create simple card patterns inline using Tailwind `rounded-xl border bg-white p-6` consistent with glossary page cards

## Validation criteria

1. Navigating to `/` shows the landing page with hero, levels, dimensions, value proposition, and CTA
2. Clicking "Start Assessment" navigates to `/assessment` and the assessment flow loads at step 0
3. Clicking "View Glossary" navigates to `/glossary`
4. Navigating directly to `/assessment` loads the assessment without requiring a visit to the landing page
5. The glossary page "← Back" link returns to `/` (the landing page)
6. All 4 maturity levels are displayed with label, θ range, and description
7. All 6 dimensions are displayed with label, weight, and description
8. The page is responsive — cards reflow to fewer columns on smaller viewports
9. Header navigation includes links to both Home and Glossary

## Test cases

1. **Landing page renders all sections**: Mount `LandingPage` → expect headings for "AI Maturity Framework", "Maturity Levels", "Assessment Dimensions", and "Why Take the Assessment" (or equivalent) to be present
2. **CTA links to /assessment**: Mount `LandingPage` → expect a link with text "Start Assessment" and `href="/assessment"`
3. **Glossary link present**: Mount `LandingPage` → expect a link with `href="/glossary"`
4. **All 4 levels rendered**: Mount `LevelsSection` → expect 4 level cards with labels "Traditional", "AI-Powered", "AI-Enabled", "AI-Native"
5. **All 6 dimensions rendered**: Mount `DimensionsSection` → expect 6 dimension cards with labels "Strategy", "Architecture", "Workflow", "Data", "Talent", "Adoption"
6. **Assessment route works**: Navigate to `/assessment` → expect `AssessmentShell` to render (integration/E2E)
7. **Glossary back link updated**: Navigate to `/glossary` → expect "← Back" link to have `href="/"`

## Decisions made by Claude

1. **(low)** Landing page components placed in `src/components/landing/` — follows the existing pattern of `src/components/assessment/` and `src/components/results/`
2. **(low)** Used emoji icons for dimension cards rather than an icon library — avoids adding a dependency; can be swapped for Lucide/Heroicons later
3. **(low)** Split landing page into 4 sub-components (Hero, Levels, Dimensions, Value) — keeps files small and focused, matching the project's component granularity
4. **(medium)** Landing page components are server components (no `'use client'`) — the page is static content with no interactivity beyond links, so server rendering is appropriate and performant
5. **(medium)** Kept IntroStep as a simplified confirmation step rather than removing it — preserves the Zustand step flow (steps 0–9) without requiring store refactoring
6. **(low)** Used inline Tailwind card patterns rather than creating a shared `Card` component — the landing page cards are visually distinct from assessment/results cards, so a shared abstraction would be premature
