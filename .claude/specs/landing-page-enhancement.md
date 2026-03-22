# Spec: Landing Page Enhancement

## Goal

Transform the landing page from a minimal teaser into a comprehensive, trust-building page by adding 4 new sections (How It Works, What You'll Get, Science Behind It, FAQ) and enhancing 3 existing sections (Hero, Levels, Dimensions, Final CTA) — all while preserving the existing visual style and keeping zero new dependencies.

## Requirements

- Add "Free - 5 minutes - No login required - Results stay on your device" trust line below the Hero tagline
- Add a "How It Works" 3-step section (Answer Questions -> Get Your Score -> Act on Insights) after the Hero
- Add a "What You'll Get" 6-card preview grid (theta score, META prediction, scaling velocity, capability diagnosis, intervention playbook, stage roadmap) after How It Works
- Enhance Level cards with 3 bullet-point characteristics and a typical company profile sentence per level
- Enhance Dimension cards with expanded 2-3 line descriptions covering what it measures, why the weight, and what good looks like
- Add a "Science Behind It" section with intro paragraph and 4 formula cards (theta_index, META, S-Formula, Coordination Cost) after Dimensions
- Add an FAQ accordion section with 8 collapsible Q&A items before the final CTA
- Enhance the final CTA with a trust line: "Join 62+ companies that have benchmarked their AI maturity"
- All new sections follow alternating white/gray-50 background pattern
- Mobile responsive: all card grids stack vertically on small screens
- No new npm dependencies — FAQ accordion uses native HTML `<details>`/`<summary>` or a custom component
- All existing tests continue to pass
- Clean production build (`npm run build`)

## Out of scope

- Animated scroll effects or parallax
- Video content or testimonials
- Interactive demos or live previews of the assessment
- A/B testing different copy variants
- i18n / multi-language support
- Adding images or external fonts

## Affected files

1. **`src/components/landing/LandingPage.tsx`** — Import and compose 4 new section components; reorder section flow; enhance CTA section with trust line
2. **`src/components/landing/HeroSection.tsx`** — Add secondary trust/friction-removal line below tagline
3. **`src/components/landing/LevelsSection.tsx`** — Expand LEVELS data with `characteristics` array and `profile` string; render bullets and profile text in cards
4. **`src/components/landing/DimensionsSection.tsx`** — Replace short `description` with expanded multi-line `description` text per dimension
5. **`src/components/landing/landing.test.tsx`** — Add tests for new sections (How It Works, What You'll Get, Science, FAQ) and enhanced content

## New files

1. **`src/components/landing/HowItWorksSection.tsx`** — 3-step horizontal layout with icons, descriptions, and time/highlight badges
2. **`src/components/landing/WhatYouGetSection.tsx`** — 6-card preview grid showing report output sections
3. **`src/components/landing/ScienceSection.tsx`** — Methodology credibility section with intro text and 4 formula cards
4. **`src/components/landing/FaqSection.tsx`** — Collapsible accordion with 8 Q&A items using `<details>`/`<summary>` elements

## Patterns to mirror

1. **`src/components/landing/ValueSection.tsx`** — Card grid layout pattern with `const` data array, map rendering, section wrapper with `aria-label`, and consistent Tailwind spacing (`py-16 px-4`, `max-w-5xl mx-auto`)
2. **`src/components/landing/LevelsSection.tsx`** — Data-driven card rendering with structured objects, responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`), and `rounded-xl border` card styling
3. **`src/components/landing/DimensionsSection.tsx`** — Emoji + label + badge + description card pattern with `bg-white`/`bg-gray-50` alternation

## Implementation notes

### Section ordering (top to bottom)

1. HeroSection (existing, enhanced)
2. HowItWorksSection (new)
3. WhatYouGetSection (new)
4. LevelsSection (existing, enhanced)
5. DimensionsSection (existing, enhanced)
6. ScienceSection (new)
7. ValueSection (existing, unchanged)
8. FaqSection (new)
9. CTA section (existing inline in LandingPage, enhanced)

### Background alternation pattern

- Hero: blue gradient (unchanged)
- How It Works: `bg-white`
- What You'll Get: `bg-gray-50`
- Levels: `bg-white`
- Dimensions: `bg-gray-50` (unchanged)
- Science: `bg-white`
- Value: `bg-white` — keep as-is (existing); slight deviation from strict alternation is acceptable
- FAQ: `bg-gray-50`
- CTA: `bg-gray-50` (unchanged)

### FAQ implementation

Use native HTML `<details>` and `<summary>` elements for zero-dependency accordion behavior. Style with Tailwind (`border-b`, `py-4`, `cursor-pointer`, `text-left`). This avoids adding shadcn/ui Accordion as a new dependency since it is not currently installed. Add `group` class for open/close chevron rotation via CSS.

### Level card enhancement

Extend the `LEVELS` constant to include `characteristics: string[]` (3 items) and `profile: string`. Render characteristics as a `<ul>` with `list-disc` below the existing description, and profile as an italic `<p>` at the card bottom.

### Dimension card enhancement

Replace the short `description` field with the full expanded text from the PRD. The text includes what it measures, weight rationale, and what good looks like. Keep the existing card structure; only the text content grows.

### Hero trust line

Add a `<p>` element with the text "Free - 5 minutes - No login required - Results stay on your device" between the tagline paragraph and the proof points grid. Use `text-blue-200 text-sm` to match existing secondary text styling.

### CTA trust line

Add a `<p>` above the CTA button: "Join 62+ companies that have benchmarked their AI maturity" with `text-gray-600 text-sm mb-4`.

## UX concept

### Component tree

```
LandingPage
  HeroSection (existing, modified)
  HowItWorksSection (new)
    StepCard x3 (inline, not separate component)
  WhatYouGetSection (new)
    PreviewCard x6 (inline, not separate component)
  LevelsSection (existing, modified)
  DimensionsSection (existing, modified)
  ScienceSection (new)
    FormulaCard x4 (inline, not separate component)
  ValueSection (existing, unchanged)
  FaqSection (new)
    FaqItem x8 (inline <details> elements)
  CTA section (existing inline, modified)
```

### Interaction flows

1. **Scroll journey**: User lands on Hero -> scrolls through progressive sections building understanding and trust -> reaches CTA with high confidence to start assessment
2. **FAQ interaction**: User clicks a question summary -> details expand to reveal answer -> clicking again or clicking another question collapses it (native `<details>` behavior, non-exclusive)
3. **CTA shortcuts**: Hero CTA button and final CTA button both link to `/assessment`; Glossary link remains in final CTA

### State & data flow

All new sections are purely presentational (no state). All content is defined as `const` data arrays within each component file. No Zustand store interaction. No props passed between sections. LandingPage is a simple composition of section components.

### Responsive behavior

- **How It Works**: 3-column grid on `lg`, stacks to single column below `md`
- **What You'll Get**: 3-column grid on `lg`, 2-column on `md`, single column below
- **Science formula cards**: 2-column on `md`, single column below
- **FAQ**: single column at all breakpoints (full-width accordion items)
- **Levels**: existing `lg:grid-cols-4 md:grid-cols-2` unchanged
- **Dimensions**: existing `lg:grid-cols-3 md:grid-cols-2` unchanged

### Accessibility

- All sections have `aria-label` attributes (matching existing pattern)
- FAQ uses native `<details>`/`<summary>` which provides built-in keyboard accessibility (Enter/Space to toggle) and screen reader support
- All interactive elements (CTA links) remain keyboard-focusable with visible focus rings (existing pattern)
- Heading hierarchy maintained: `<h2>` for section titles, `<h3>` for card titles
- No `aria-expanded` needed — native `<details>` handles disclosure state

### Reuse check

- Section wrapper pattern (`py-16 px-4`, `max-w-5xl mx-auto`, `aria-label`) reused from all existing sections
- Card pattern (`rounded-xl border border-gray-200 bg-gray-50 p-6`) reused from LevelsSection
- Badge pattern (`text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full`) reused from DimensionsSection
- No new shared UI components needed — all new components are page-specific landing sections

## Validation criteria

- Navigating to `/` renders the "How It Works" section with visible steps "Answer Questions", "Get Your Score", "Act on Insights"
- Navigating to `/` renders the "What You'll Get" section with 6 preview cards including "AI Maturity Score", "META Prediction", "Scaling Velocity", "Capability Diagnosis", "Intervention Playbook", "Stage Roadmap"
- Hero section displays "Free" and "No login required" trust text
- Each Level card (Traditional, AI-Powered, AI-Enabled, AI-Native) shows bullet-point characteristics and a profile sentence
- Each Dimension card shows expanded multi-line description text (not the original single-line)
- "Science Behind It" section renders with 4 formula cards showing theta_index, META, S-Formula, and Coordination Cost
- FAQ section renders 8 questions; clicking a question expands its answer
- Final CTA section shows "Join 62+ companies" trust line above the button
- All sections are visible and properly laid out on mobile viewport (375px width)
- `npx vitest run` — all tests pass (existing + new)
- `npm run build` — clean production build with no errors

## Test cases

1. **LandingPage renders all sections**: Render `<LandingPage />`, assert presence of section headings: "How It Works", "What You'll Get", "Maturity Levels", "Assessment Dimensions", "Built on Research, Validated with Data", "Frequently Asked Questions", "Why Take the Assessment"
2. **HeroSection shows trust line**: Render `<HeroSection />`, assert text "No login required" is present
3. **HowItWorksSection renders 3 steps**: Render `<HowItWorksSection />`, assert "Answer Questions", "Get Your Score", "Act on Insights" are all present
4. **WhatYouGetSection renders 6 cards**: Render `<WhatYouGetSection />`, assert "META Prediction", "Scaling Velocity", "Capability Diagnosis", "Intervention Playbook", "Stage Roadmap" text nodes exist
5. **LevelsSection shows enhanced content**: Render `<LevelsSection />`, assert presence of characteristic text (e.g., "Manual processes dominate operations") and profile text (e.g., "Early-stage companies")
6. **DimensionsSection shows expanded descriptions**: Render `<DimensionsSection />`, assert presence of expanded text (e.g., "superlinear impact on scaling velocity")
7. **ScienceSection renders formula cards**: Render `<ScienceSection />`, assert "R\u00B2=0.91" and "Coordination Cost" text present
8. **FaqSection renders all questions**: Render `<FaqSection />`, assert 8 `<details>` elements exist; assert "How long does the assessment take?" text is present
9. **FaqSection expands on click**: Render `<FaqSection />`, click first summary element, assert answer text becomes visible
10. **CTA shows trust line**: Render `<LandingPage />`, assert "Join 62+ companies" text is present

## Decisions made by Claude

1. **(low)** Use native `<details>`/`<summary>` for FAQ instead of installing shadcn/ui Accordion — avoids a new dependency; the PRD suggested shadcn Accordion but it's not installed in the project, and native elements provide equivalent functionality with built-in accessibility
2. **(low)** Inline card subcomponents (StepCard, PreviewCard, FormulaCard) as map iterations within section components rather than extracting to separate files — matches the existing pattern in ValueSection, LevelsSection, DimensionsSection
3. **(low)** Place new sections in the order: Hero -> How It Works -> What You'll Get -> Levels -> Dimensions -> Science -> Value -> FAQ -> CTA — follows the PRD section numbering and creates a logical narrative flow (process -> preview -> detail -> credibility -> motivation -> objection handling -> action)
4. **(low)** FAQ accordion items are non-exclusive (multiple can be open simultaneously) — native `<details>` default behavior; more user-friendly than exclusive accordion for reference content
5. **(medium)** Background color for Value section kept as `bg-white` (existing) rather than forcing strict alternation — changing it would modify existing untouched section styling, which contradicts the PRD instruction to keep Value "as-is"
