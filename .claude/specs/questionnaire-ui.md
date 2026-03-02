# Spec: Questionnaire UI

## Goal

Multi-step React questionnaire that drives the user through the assessment flow (steps 0–8), reading from and writing to the Zustand store, and handing off to the results page at step 9.

## Requirements

- Render the correct step component based on `step` from the store
- **Step 0 — Intro**: title, one-paragraph description, "Start Assessment" button
- **Step 1 — Company**: text input for company name; "Next" disabled while input is empty; trims whitespace before storing
- **Steps 2–7 — Dimension**: render all 8 questions for the active dimension with a Likert selector per question; "Next" always enabled (0 is a valid answer); show dimension name, weight, and progress indicator (e.g. "2 of 6")
- **Step 8 — Review**: show company name and, for each dimension, its name + the 8 selected answer labels (from `LIKERT_LABELS`); "Submit" button calls `submit()`; "Back" button
- **Step 9 — placeholder**: render `<ResultsPlaceholder />` (single `<div>` with text "Results coming soon") — full results page is a separate spec
- All steps show a "Back" button except step 0
- `LikertCard` component: displays a question string and 5 buttons (0–4) with `LIKERT_LABELS`; highlights the selected value; calls `onChange(value)` on click
- `ProgressBar` component: shows filled segments for completed dimensions (steps 2–7)
- All components are client components (`'use client'`)
- Use Tailwind CSS for all styling; no external component library required for this spec
- Install Tailwind and configure it for Next.js App Router if not already present

## Out of scope

- Results page (separate spec)
- PDF export
- Lead capture / email
- Animation or transitions between steps
- Mobile-specific breakpoints beyond basic responsive layout
- shadcn/ui (can be added later)

## Affected files

- `src/app/layout.tsx` — add Tailwind base import (`globals.css`) and font/body classes
- `src/app/page.tsx` — replace stub with `<AssessmentShell />`

## New files

```
src/
  app/
    globals.css                          ← Tailwind directives (@tailwind base/components/utilities)
  components/
    assessment/
      AssessmentShell.tsx                ← reads step, renders active step component
      IntroStep.tsx
      CompanyStep.tsx
      DimensionStep.tsx                  ← props: { dimension: DimensionKey }
      LikertCard.tsx                     ← props: { question, value, onChange }
      ReviewStep.tsx
      ProgressBar.tsx                    ← props: { currentStep: number }
      ResultsPlaceholder.tsx
tailwind.config.ts                       ← content paths for src/
postcss.config.js                        ← autoprefixer
```

**Additional dev dependency:** `tailwindcss`, `postcss`, `autoprefixer`

## Implementation notes

**Tailwind setup** — run `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p` then set `content: ['./src/**/*.{ts,tsx}']` in `tailwind.config.ts`. Add `@tailwind base; @tailwind components; @tailwind utilities;` to `globals.css` and import it in `layout.tsx`.

**AssessmentShell** — single `'use client'` component that reads `step` from the store and returns the right child. No props.

```tsx
const stepMap: Record<number, React.ReactNode> = {
  0: <IntroStep />,
  1: <CompanyStep />,
  2: <DimensionStep dimension="strategy" />,
  3: <DimensionStep dimension="architecture" />,
  4: <DimensionStep dimension="workflow" />,
  5: <DimensionStep dimension="data" />,
  6: <DimensionStep dimension="talent" />,
  7: <DimensionStep dimension="adoption" />,
  8: <ReviewStep />,
  9: <ResultsPlaceholder />,
}
```

**DimensionStep** — maps over `QUESTIONS[dimension]` and renders a `LikertCard` per question. Reads `responses[dimension]` for current values; calls `setAnswer(dimension, index, value)` on change.

**LikertCard** — renders 5 `<button>` elements. The selected button gets a distinct bg colour (e.g. `bg-blue-600 text-white`); others are outlined. Display the numeric label (0–4) above the text label from `LIKERT_LABELS`.

**CompanyStep** — controlled input; calls `setCompanyName(value.trim())` on change. Disable "Next" when `companyName.trim() === ''`.

**ReviewStep** — for each dimension (in order), show:
- Dimension label
- A row of 8 small chips, each showing the `LIKERT_LABELS[value]` for that answer

**ProgressBar** — for steps 2–7 (`currentStep` 2–7), render 6 segments. Segment `i` is filled if `currentStep >= i + 2`.

**page.tsx** — `'use client'`, imports `AssessmentShell`, renders it inside a centred container:
```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <AssessmentShell />
    </main>
  )
}
```

**layout.tsx** — import `globals.css`; add `className="antialiased"` to `<body>`.

## Test cases

Use Vitest + React Testing Library. Install `@testing-library/react` and `@testing-library/user-event` and `jsdom` if not present.

1. **LikertCard** — renders question text; renders 5 buttons with correct labels; clicking button 3 calls `onChange(3)` with correct value; selected button has different styling (aria-pressed or data attribute)
2. **CompanyStep** — "Next" button is disabled when companyName is empty; enabled after typing a name
3. **DimensionStep** — renders 8 question texts for `strategy` dimension; renders 8 LikertCards
4. **ReviewStep** — renders all 6 dimension labels; renders answer labels for current responses
5. **ProgressBar** — at step=4 (Workflow), 3 of 6 segments are filled
