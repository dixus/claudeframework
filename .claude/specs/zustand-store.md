# Spec: Zustand Store

## Goal

Single Zustand store that holds all assessment state — navigation step, company name, 48 responses, and the computed result — and exposes the actions needed by the questionnaire and results UI.

## Requirements

- Hold a numeric `step` (0–9) representing the current screen
- Hold `companyName: string` (empty by default)
- Hold `responses: Record<DimensionKey, number[]>` — initialised to 8 zeros per dimension
- Hold `result: AssessmentResult | null` — null until submitted
- Expose a `setCompanyName(name: string)` action
- Expose a `setAnswer(dimension: DimensionKey, index: number, value: number)` action that immutably updates a single response value
- Expose `nextStep()` and `prevStep()` actions (clamped to 0–9)
- Expose a `submit()` action that calls `computeResult`, stores the result, and advances to step 9
- Expose a `reset()` action that returns the store to its initial state
- Export a typed `useAssessmentStore` hook (the Zustand `create` result)
- No persistence, no async, no side effects beyond calling `computeResult`

## Out of scope

- Per-step validation (the UI enforces "answered all questions before next")
- Local-storage persistence (future spec)
- Multiple simultaneous assessments
- Undo/redo

## Step mapping

| Step | Screen |
|---|---|
| 0 | Intro / landing |
| 1 | Company name input |
| 2 | Strategy (dimension 0) |
| 3 | Architecture (dimension 1) |
| 4 | Workflow (dimension 2) |
| 5 | Data (dimension 3) |
| 6 | Talent (dimension 4) |
| 7 | Adoption (dimension 5) |
| 8 | Review answers |
| 9 | Results |

Assessment steps 2–7 correspond to dimension index `step - 2`.

## Affected files

None — new module.

## New files

- `src/store/assessmentStore.ts` — Zustand store definition and `useAssessmentStore` hook

## Implementation notes

**Dependencies to install:** `zustand` (not yet in `package.json`)

**Initial state shape:**
```ts
const DIMENSION_KEYS: DimensionKey[] = ['strategy', 'architecture', 'workflow', 'data', 'talent', 'adoption']

const initialResponses = (): Record<DimensionKey, number[]> =>
  Object.fromEntries(DIMENSION_KEYS.map(k => [k, Array(8).fill(0)])) as Record<DimensionKey, number[]>

interface AssessmentState {
  step: number
  companyName: string
  responses: Record<DimensionKey, number[]>
  result: AssessmentResult | null
}

interface AssessmentActions {
  setCompanyName: (name: string) => void
  setAnswer: (dimension: DimensionKey, index: number, value: number) => void
  nextStep: () => void
  prevStep: () => void
  submit: () => void
  reset: () => void
}

type AssessmentStore = AssessmentState & AssessmentActions
```

**`setAnswer` must be immutable** — copy the dimension array before mutating:
```ts
setAnswer: (dimension, index, value) =>
  set(state => {
    const updated = [...state.responses[dimension]]
    updated[index] = value
    return { responses: { ...state.responses, [dimension]: updated } }
  }),
```

**`submit` calls the scoring engine:**
```ts
submit: () =>
  set(state => ({
    result: computeResult({ companyName: state.companyName, responses: state.responses }),
    step: 9,
  })),
```

**`reset` returns to initial state:**
```ts
reset: () => set({ step: 0, companyName: '', responses: initialResponses(), result: null }),
```

**`nextStep` / `prevStep` clamp to bounds:**
```ts
nextStep: () => set(state => ({ step: Math.min(9, state.step + 1) })),
prevStep: () => set(state => ({ step: Math.max(0, state.step - 1) })),
```

**Store creation:**
```ts
export const useAssessmentStore = create<AssessmentStore>()(set => ({
  step: 0,
  companyName: '',
  responses: initialResponses(),
  result: null,
  // ... actions
}))
```

## Test cases

Create `src/store/assessmentStore.test.ts` using Vitest. Do not use React Testing Library — test the store directly by calling actions and reading state.

1. **Initial state** — step=0, companyName='', all responses are arrays of 8 zeros, result=null
2. **setCompanyName** — updates companyName, no other state changes
3. **setAnswer** — updates the correct cell, leaves other dimensions/indices unchanged
4. **setAnswer immutability** — the original dimension array is not mutated (reference changes)
5. **nextStep** — increments step; clamped at 9 (calling nextStep at step=9 stays at 9)
6. **prevStep** — decrements step; clamped at 0 (calling prevStep at step=0 stays at 0)
7. **submit** — sets result to a valid AssessmentResult, sets step=9; result.companyName matches store companyName
8. **reset** — after submit, reset returns step=0, companyName='', result=null, responses all zeros
