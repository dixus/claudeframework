# Spec: Results Page

## Goal

Replace the `ResultsPlaceholder` at step 9 with a full results dashboard showing the θ score, maturity level, radar chart, dimension scorecards, bottleneck panel, and recommendations.

## Requirements

- Read `result: AssessmentResult` from the Zustand store (guaranteed non-null at step 9)
- **ScoreCard** — display θ score (1 decimal), level label, level benchmark stats (`monthsTo100M`, `arrPerEmployee`), and a "gated" notice if `result.gated === true`
- **RadarChart** — Recharts `RadarChart` with all 6 dimensions plotted on a 0–100 scale; show dimension labels on the axes; fullMark = 100
- **DimensionScorecard** — for each dimension, show label, score (1 decimal), and a filled progress bar (width = score%)
- **BottleneckPanel** — highlight the `result.bottleneck` dimension: show its name, score, gap ("X points to the 70 target"), and the 3 hardcoded action strings as a numbered list
- **"Start Over" button** — calls `reset()` from the store, returns user to step 0
- The results container is wider than the questionnaire card (`max-w-4xl`) to accommodate the radar chart
- All components are client components (`'use client'`)
- Use Tailwind CSS for all styling (no additional component library)
- Install `recharts` dependency

## Out of scope

- PDF export (separate spec)
- Lead capture / email (separate spec)
- Saving results to a database
- Sharing / copy-link functionality

## Affected files

- `src/components/assessment/AssessmentShell.tsx` — replace `ResultsPlaceholder` import/render with `ResultsPage`; widen container to `max-w-4xl` when `step === 9` (or always, for simplicity)
- `src/components/assessment/ResultsPlaceholder.tsx` — delete (no longer needed)

## New files

```
src/components/results/
  ResultsPage.tsx          ← main container; reads store; renders all panels
  ScoreCard.tsx            ← θ score + level + benchmarks + gating notice
  RadarChartPanel.tsx      ← Recharts RadarChart wrapped in ResponsiveContainer
  DimensionScorecard.tsx   ← 6-row table of dimension scores with bar fill
  BottleneckPanel.tsx      ← bottleneck name + gap + 3 actions
  results.test.tsx         ← RTL tests
```

## Implementation notes

**Install recharts:**
```bash
npm install recharts
```

**ResultsPage layout** — two-column on wide screens, single column on mobile:
```
[ ScoreCard ]  [ RadarChartPanel ]
[ DimensionScorecard (full width) ]
[ BottleneckPanel (full width)    ]
[ Start Over button               ]
```

**AssessmentShell change** — simplest approach: always use `max-w-4xl` for the card (the wider width is fine for questionnaire steps too). Replace step 9's node:
```tsx
import { ResultsPage } from '@/components/results/ResultsPage'
// stepComponents[9] = <ResultsPage />
```
And remove the `ResultsPlaceholder` import.

**ScoreCard data:**
```tsx
const { thetaScore, level, gated } = result
// level.label, level.monthsTo100M, level.arrPerEmployee, gated
```

**RadarChartPanel data:**
```tsx
const data = result.dimensions.map(d => ({
  dimension: d.label,
  score: d.score,
  fullMark: 100,
}))
// <RadarChart> → <Radar dataKey="score" /> + <PolarAngleAxis dataKey="dimension" />
```
Wrap in `<ResponsiveContainer width="100%" height={300}>`. Since the component is already `'use client'`, no dynamic import needed.

**DimensionScorecard** — map over `result.dimensions`:
```tsx
{result.dimensions.map(d => (
  <div key={d.key}>
    <span>{d.label}</span>
    <div style={{ width: `${d.score}%` }} className="bg-blue-500 h-2 rounded" />
    <span>{d.score}</span>
  </div>
))}
```

**BottleneckPanel:**
```tsx
const { dimension, score, gap, actions } = result.bottleneck
// Show dimension label (map key → label), score, gap text, actions[0..2]
```
Need a local key→label map (same as used elsewhere: `{ strategy: 'Strategy', ... }`).

**Gating notice** — if `result.gated`, show a small info box: "Your θ score qualified for a higher level, but one or more gating conditions were not met."

**"Start Over" button:**
```tsx
const reset = useAssessmentStore(s => s.reset)
<button onClick={reset}>Start Over</button>
```

## Test cases

Create `src/components/results/results.test.tsx` with `// @vitest-environment jsdom`. Use a helper to seed the store with a known `AssessmentResult` before rendering.

1. **ScoreCard** — renders the θ score as a string (e.g. "67.4"), renders the level label (e.g. "AI-Enabled"), renders benchmark values
2. **ScoreCard gating** — when `gated=true`, renders a gating notice; when `false`, does not
3. **BottleneckPanel** — renders the bottleneck dimension label, renders the gap value, renders all 3 action strings
4. **DimensionScorecard** — renders all 6 dimension labels; renders all 6 score values
5. **ResultsPage "Start Over"** — clicking "Start Over" calls `reset()` (verify step returns to 0)
