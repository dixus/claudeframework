import { describe, it, expect, beforeEach } from 'vitest'
import { useAssessmentStore } from './assessmentStore'

beforeEach(() => {
  useAssessmentStore.getState().reset()
})

// Test 1: Initial state
describe('initial state', () => {
  it('has step=0, empty companyName, 8 zeros per dimension, result=null', () => {
    const state = useAssessmentStore.getState()
    expect(state.step).toBe(0)
    expect(state.companyName).toBe('')
    expect(state.result).toBeNull()
    const keys = ['strategy', 'architecture', 'workflow', 'data', 'talent', 'adoption'] as const
    for (const key of keys) {
      expect(state.responses[key]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    }
  })
})

// Test 2: setCompanyName
describe('setCompanyName', () => {
  it('updates companyName without changing other state', () => {
    const { setCompanyName } = useAssessmentStore.getState()
    setCompanyName('Acme Corp')
    const state = useAssessmentStore.getState()
    expect(state.companyName).toBe('Acme Corp')
    expect(state.step).toBe(0)
    expect(state.result).toBeNull()
  })
})

// Test 3: setAnswer updates the correct cell
describe('setAnswer', () => {
  it('updates the correct cell and leaves other dimensions unchanged', () => {
    const { setAnswer } = useAssessmentStore.getState()
    setAnswer('workflow', 3, 4)
    const state = useAssessmentStore.getState()
    expect(state.responses.workflow[3]).toBe(4)
    expect(state.responses.workflow[0]).toBe(0)
    expect(state.responses.strategy).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(state.responses.data).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})

// Test 4: setAnswer immutability — array reference changes
describe('setAnswer immutability', () => {
  it('creates a new array reference for the updated dimension', () => {
    const before = useAssessmentStore.getState().responses.strategy
    useAssessmentStore.getState().setAnswer('strategy', 0, 3)
    const after = useAssessmentStore.getState().responses.strategy
    expect(after).not.toBe(before)
    expect(after[0]).toBe(3)
  })
})

// Test 5: nextStep
describe('nextStep', () => {
  it('increments step', () => {
    useAssessmentStore.getState().nextStep()
    expect(useAssessmentStore.getState().step).toBe(1)
  })

  it('clamps at 9', () => {
    useAssessmentStore.setState({ step: 9 })
    useAssessmentStore.getState().nextStep()
    expect(useAssessmentStore.getState().step).toBe(9)
  })
})

// Test 6: prevStep
describe('prevStep', () => {
  it('decrements step', () => {
    useAssessmentStore.setState({ step: 3 })
    useAssessmentStore.getState().prevStep()
    expect(useAssessmentStore.getState().step).toBe(2)
  })

  it('clamps at 0', () => {
    useAssessmentStore.getState().prevStep()
    expect(useAssessmentStore.getState().step).toBe(0)
  })
})

// Test 7: submit
describe('submit', () => {
  it('computes result, sets step=9, and result.companyName matches store', () => {
    useAssessmentStore.getState().setCompanyName('Test Corp')
    useAssessmentStore.getState().submit()
    const state = useAssessmentStore.getState()
    expect(state.step).toBe(9)
    expect(state.result).not.toBeNull()
    expect(state.result!.companyName).toBe('Test Corp')
    expect(typeof state.result!.thetaScore).toBe('number')
    expect(state.result!.dimensions).toHaveLength(6)
  })
})

// Test 8: reset
describe('reset', () => {
  it('restores initial state after submit', () => {
    useAssessmentStore.getState().setCompanyName('Acme')
    useAssessmentStore.getState().setAnswer('data', 2, 3)
    useAssessmentStore.getState().submit()
    useAssessmentStore.getState().reset()
    const state = useAssessmentStore.getState()
    expect(state.step).toBe(0)
    expect(state.companyName).toBe('')
    expect(state.result).toBeNull()
    expect(state.responses.data).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})
