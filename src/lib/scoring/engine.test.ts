import { describe, it, expect } from 'vitest'
import { computeResult } from './engine'
import type { AssessmentInput, DimensionKey } from './types'
import { RECOMMENDATIONS } from './recommendations'

const KEYS: DimensionKey[] = ['strategy', 'architecture', 'workflow', 'data', 'talent', 'adoption']

function allEqual(answers: number[]): AssessmentInput {
  return {
    companyName: 'Test Co',
    responses: Object.fromEntries(KEYS.map(k => [k, answers])) as Record<DimensionKey, number[]>,
  }
}

function dimInput(overrides: Partial<Record<DimensionKey, number[]>>, def: number[]): AssessmentInput {
  return {
    companyName: 'Test Co',
    responses: Object.fromEntries(KEYS.map(k => [k, overrides[k] ?? def])) as Record<DimensionKey, number[]>,
  }
}

// Test 1: Perfect score — all answers = 4 → θ = 100, Level 3, no gating
describe('perfect score', () => {
  it('produces θ=100, Level 3 AI-Native, gated=false', () => {
    const result = computeResult(allEqual([4, 4, 4, 4, 4, 4, 4, 4]))
    expect(result.thetaScore).toBe(100)
    expect(result.rawLevel).toBe(3)
    expect(result.level.level).toBe(3)
    expect(result.level.label).toBe('AI-Native')
    expect(result.level.monthsTo100M).toBe(18)
    expect(result.level.arrPerEmployee).toBe('€1.2M')
    expect(result.gated).toBe(false)
  })
})

// Test 2: Zero score — all answers = 0 → θ = 0, Level 0
describe('zero score', () => {
  it('produces θ=0, Level 0 Traditional', () => {
    const result = computeResult(allEqual([0, 0, 0, 0, 0, 0, 0, 0]))
    expect(result.thetaScore).toBe(0)
    expect(result.rawLevel).toBe(0)
    expect(result.level.level).toBe(0)
    expect(result.level.label).toBe('Traditional')
    expect(result.level.monthsTo100M).toBe(84)
    expect(result.level.arrPerEmployee).toBe('€150K')
  })
})

// Test 3: Exact level boundaries — crafted inputs spanning θ = 20, 21, 50, 51, 80, 81
describe('level boundaries', () => {
  // strategy=100, others=0 → θ = 0.20×100 = 20.0 → Level 0
  it('θ=20 → Level 0', () => {
    const input = dimInput({ strategy: [4, 4, 4, 4, 4, 4, 4, 4] }, [0, 0, 0, 0, 0, 0, 0, 0])
    const result = computeResult(input)
    expect(result.thetaScore).toBe(20)
    expect(result.rawLevel).toBe(0)
    expect(result.level.level).toBe(0)
  })

  // strategy=100, architecture sum=3 (score=9.4) → θ = 20 + 0.15×9.4 ≈ 21.4 → Level 1
  it('θ≈21 (just above 20) → Level 1', () => {
    const input = dimInput(
      { strategy: [4, 4, 4, 4, 4, 4, 4, 4], architecture: [1, 1, 1, 0, 0, 0, 0, 0] },
      [0, 0, 0, 0, 0, 0, 0, 0],
    )
    const result = computeResult(input)
    expect(result.thetaScore).toBeGreaterThan(20)
    expect(result.rawLevel).toBe(1)
    expect(result.level.level).toBe(1)
    expect(result.level.label).toBe('AI-Powered')
  })

  // all dims sum=16 → score=50, θ=50 → Level 1 (≤50)
  it('θ=50 → Level 1', () => {
    const result = computeResult(allEqual([2, 2, 2, 2, 2, 2, 2, 2]))
    expect(result.thetaScore).toBe(50)
    expect(result.rawLevel).toBe(1)
    expect(result.level.level).toBe(1)
  })

  // all dims sum=17 → score=53.1, θ=53.1 → Level 2 (workflow/data gating not triggered)
  it('θ≈51 (just above 50) → Level 2', () => {
    const result = computeResult(allEqual([2, 2, 2, 2, 2, 2, 2, 3]))
    expect(result.thetaScore).toBeGreaterThan(50)
    expect(result.rawLevel).toBe(2)
    expect(result.level.level).toBe(2)
    expect(result.level.label).toBe('AI-Enabled')
  })

  // all dims sum=25 → score=78.1, θ=78.1 → Level 2 (≤80)
  it('θ≈80 → Level 2', () => {
    const result = computeResult(allEqual([4, 4, 4, 4, 3, 3, 2, 1]))
    expect(result.thetaScore).toBe(78.1)
    expect(result.rawLevel).toBe(2)
    expect(result.level.level).toBe(2)
  })

  // all dims sum=26 → score=81.3, θ=81.3 → Level 3, gating conditions all met
  it('θ≈81 (just above 80) → Level 3, gated=false', () => {
    const result = computeResult(allEqual([4, 4, 4, 4, 4, 3, 2, 1]))
    expect(result.thetaScore).toBe(81.3)
    expect(result.rawLevel).toBe(3)
    expect(result.level.level).toBe(3)
    expect(result.gated).toBe(false)
  })
})

// Test 4: Gating fires for Level 3 — θ ≥ 81 but workflow < 70 → capped at 2, gated=true
describe('gating fires for Level 3', () => {
  it('workflow=62.5 (<70) caps Level 3 → Level 2, gated=true', () => {
    // workflow sum=20 → score=62.5; all others sum=32 → score=100
    // θ = 0.20×100 + 0.15×100 + 0.25×62.5 + 0.15×100 + 0.15×100 + 0.10×100 = 90.6
    const input = dimInput(
      { workflow: [4, 3, 3, 3, 2, 2, 2, 1] },
      [4, 4, 4, 4, 4, 4, 4, 4],
    )
    const result = computeResult(input)
    expect(result.rawLevel).toBe(3)
    expect(result.level.level).toBe(2)
    expect(result.gated).toBe(true)
  })
})

// Test 5: Gating fires for Level 2 — θ ≥ 51 but workflow < 50 → capped at 1, gated=true
describe('gating fires for Level 2', () => {
  it('workflow=46.9 (<50) caps Level 2 → Level 1, gated=true', () => {
    // workflow sum=15 → score=46.9; all others sum=17 → score=53.1
    // θ = 53.1×0.75 + 46.9×0.25 = 39.825 + 11.725 = 51.55 → 51.6
    const input = dimInput(
      { workflow: [1, 2, 2, 2, 2, 2, 2, 2] },
      [2, 2, 2, 2, 2, 2, 2, 3],
    )
    const result = computeResult(input)
    expect(result.rawLevel).toBe(2)
    expect(result.level.level).toBe(1)
    expect(result.gated).toBe(true)
  })
})

// Test 6: Gating does not fire — θ in Level 2 range, workflow ≥ 50, data ≥ 40
describe('gating does not fire', () => {
  it('workflow=56.3, data=46.9 → Level 2, gated=false', () => {
    // workflow sum=18 → score=56.3; data sum=15 → score=46.9; others sum=16 → score=50
    // θ = 0.20×50 + 0.15×50 + 0.25×56.3 + 0.15×46.9 + 0.15×50 + 0.10×50 ≈ 51.1
    const input = dimInput(
      { workflow: [2, 2, 2, 2, 2, 2, 3, 3], data: [2, 2, 2, 2, 2, 2, 2, 1] },
      [2, 2, 2, 2, 2, 2, 2, 2],
    )
    const result = computeResult(input)
    expect(result.rawLevel).toBe(2)
    expect(result.level.level).toBe(2)
    expect(result.gated).toBe(false)
  })
})

// Test 7: Bottleneck identification — lowest dimension correctly identified
describe('bottleneck identification', () => {
  it('identifies data (score=25) as bottleneck when it is the lowest', () => {
    const input: AssessmentInput = {
      companyName: 'Test Co',
      responses: {
        strategy:      [3, 3, 3, 3, 3, 3, 3, 3], // sum=24, score=75
        architecture:  [4, 4, 4, 4, 4, 4, 4, 4], // sum=32, score=100
        workflow:      [2, 2, 2, 2, 2, 2, 2, 2], // sum=16, score=50
        data:          [1, 1, 1, 1, 1, 1, 1, 1], // sum=8,  score=25  ← lowest
        talent:        [3, 3, 3, 3, 3, 3, 3, 3], // sum=24, score=75
        adoption:      [4, 4, 4, 4, 4, 4, 4, 4], // sum=32, score=100
      },
    }
    const result = computeResult(input)
    expect(result.bottleneck.dimension).toBe('data')
    expect(result.bottleneck.score).toBe(25)
    expect(result.bottleneck.actions).toEqual(RECOMMENDATIONS.data)
  })
})

// Test 8: Bottleneck gap calculation
describe('bottleneck gap calculation', () => {
  it('score=43.8 → gap=26.2 (positive gap)', () => {
    // data sum=14 → score=43.8; others sum=32 → score=100 (data is bottleneck)
    const input = dimInput({ data: [1, 1, 2, 2, 2, 2, 2, 2] }, [4, 4, 4, 4, 4, 4, 4, 4])
    const result = computeResult(input)
    expect(result.bottleneck.dimension).toBe('data')
    expect(result.bottleneck.score).toBe(43.8)
    expect(result.bottleneck.gap).toBe(26.2)
  })

  it('score=71.9 (≥70) → gap=0 (clamped)', () => {
    // data sum=23 → score=71.9; others sum=32 → score=100 (data is still lowest)
    const input = dimInput({ data: [3, 3, 3, 3, 3, 3, 3, 2] }, [4, 4, 4, 4, 4, 4, 4, 4])
    const result = computeResult(input)
    expect(result.bottleneck.dimension).toBe('data')
    expect(result.bottleneck.score).toBe(71.9)
    expect(result.bottleneck.gap).toBe(0)
  })
})

// Test 9: Dimension score formula — 8 answers summing to 24 → score = 75
describe('dimension score formula', () => {
  it('answers summing to 24 produce score=75', () => {
    // [4,4,4,3,3,3,2,1] = sum 24; (24/32)×100 = 75.0
    const result = computeResult(allEqual([4, 4, 4, 3, 3, 3, 2, 1]))
    for (const dim of result.dimensions) {
      expect(dim.score).toBe(75)
    }
  })
})

// Test 10: Weighted theta — verify weights sum to 1.0 and θ matches manual calculation
describe('weighted theta', () => {
  it('θ matches manual weighted sum of dimension scores', () => {
    // strategy=[4×8]=100, architecture=[3×8]=75, workflow=[2×8]=50,
    // data=[1×8]=25, talent=[3×8]=75, adoption=[0×8]=0
    // θ = 0.20×100 + 0.15×75 + 0.25×50 + 0.15×25 + 0.15×75 + 0.10×0
    //   = 20 + 11.25 + 12.5 + 3.75 + 11.25 + 0 = 58.75 → 58.8
    const input: AssessmentInput = {
      companyName: 'Test Co',
      responses: {
        strategy:     [4, 4, 4, 4, 4, 4, 4, 4],
        architecture: [3, 3, 3, 3, 3, 3, 3, 3],
        workflow:     [2, 2, 2, 2, 2, 2, 2, 2],
        data:         [1, 1, 1, 1, 1, 1, 1, 1],
        talent:       [3, 3, 3, 3, 3, 3, 3, 3],
        adoption:     [0, 0, 0, 0, 0, 0, 0, 0],
      },
    }
    const result = computeResult(input)
    expect(result.dimensions.find(d => d.key === 'strategy')!.score).toBe(100)
    expect(result.dimensions.find(d => d.key === 'architecture')!.score).toBe(75)
    expect(result.dimensions.find(d => d.key === 'workflow')!.score).toBe(50)
    expect(result.dimensions.find(d => d.key === 'data')!.score).toBe(25)
    expect(result.dimensions.find(d => d.key === 'talent')!.score).toBe(75)
    expect(result.dimensions.find(d => d.key === 'adoption')!.score).toBe(0)
    expect(result.thetaScore).toBe(58.8)
    const weightSum = result.dimensions.reduce((acc, d) => acc + d.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 10)
  })
})
