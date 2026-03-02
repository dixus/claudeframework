import { create } from 'zustand'
import type { DimensionKey, AssessmentResult } from '../lib/scoring/types'
import { computeResult } from '../lib/scoring/engine'

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

export const useAssessmentStore = create<AssessmentStore>()(set => ({
  step: 0,
  companyName: '',
  responses: initialResponses(),
  result: null,

  setCompanyName: (name) => set({ companyName: name }),

  setAnswer: (dimension, index, value) =>
    set(state => {
      const updated = [...state.responses[dimension]]
      updated[index] = value
      return { responses: { ...state.responses, [dimension]: updated } }
    }),

  nextStep: () => set(state => ({ step: Math.min(9, state.step + 1) })),
  prevStep: () => set(state => ({ step: Math.max(0, state.step - 1) })),

  submit: () =>
    set(state => ({
      result: computeResult({ companyName: state.companyName, responses: state.responses }),
      step: 9,
    })),

  reset: () => set({ step: 0, companyName: '', responses: initialResponses(), result: null }),
}))
