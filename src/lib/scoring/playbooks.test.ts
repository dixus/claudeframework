import { describe, it, expect } from 'vitest'
import { selectModel } from './playbooks'
import type { AssessmentResult } from './types'

function makeResult(thetaScore: number, levelNum: number, bottleneckScore: number): AssessmentResult {
  return {
    companyName: 'Test',
    dimensions: [],
    thetaScore,
    rawLevel: levelNum,
    level: { level: levelNum, label: '', monthsTo100M: 0, arrPerEmployee: '' },
    gated: false,
    bottleneck: { dimension: 'data', score: bottleneckScore, gap: 0, actions: [] },
  }
}

describe('selectModel', () => {
  it('θ=45 L1 gap=6 bottleneck=38 → model1 (gap<15 AND bottleneck<60)', () => {
    expect(selectModel(makeResult(45, 1, 38))).toBe('model1')
  })

  it('θ=55 L2 gap=26 → model2 (gap 15-30)', () => {
    expect(selectModel(makeResult(55, 2, 50))).toBe('model2')
  })

  it('θ=30 L1 gap=21 → model2 (gap 15-30)', () => {
    expect(selectModel(makeResult(30, 1, 50))).toBe('model2')
  })

  it('θ=35 L1 gap=16 bottleneck=65 → model2 (bottleneck≥60 disqualifies model1)', () => {
    expect(selectModel(makeResult(35, 1, 65))).toBe('model2')
  })

  it('θ=85 Level 3 → model3 always', () => {
    expect(selectModel(makeResult(85, 3, 80))).toBe('model3')
  })

  it('θ=20 L0 gap=31 → model3 (gap>30)', () => {
    expect(selectModel(makeResult(20, 0, 50))).toBe('model3')
  })
})
