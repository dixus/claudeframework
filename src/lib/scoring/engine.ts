import type { AssessmentInput, AssessmentResult, DimensionKey, DimensionResult, LevelInfo } from './types'
import { RECOMMENDATIONS } from './recommendations'

const DIMENSIONS = [
  { key: 'strategy'     as const, label: 'Strategy',      weight: 0.20 },
  { key: 'architecture' as const, label: 'Architecture',  weight: 0.15 },
  { key: 'workflow'     as const, label: 'Workflow',       weight: 0.25 },
  { key: 'data'         as const, label: 'Data',           weight: 0.15 },
  { key: 'talent'       as const, label: 'Talent',         weight: 0.15 },
  { key: 'adoption'     as const, label: 'Adoption',       weight: 0.10 },
] as const

const LEVELS: LevelInfo[] = [
  { level: 0, label: 'Traditional',  monthsTo100M: 84, arrPerEmployee: '€150K' },
  { level: 1, label: 'AI-Powered',   monthsTo100M: 48, arrPerEmployee: '€250K' },
  { level: 2, label: 'AI-Enabled',   monthsTo100M: 24, arrPerEmployee: '€600K' },
  { level: 3, label: 'AI-Native',    monthsTo100M: 18, arrPerEmployee: '€1.2M' },
]

function round1(x: number): number {
  return Math.round(x * 10) / 10
}

function computeDimensionScore(answers: number[]): number {
  const sum = answers.reduce((acc, v) => acc + v, 0)
  return round1((sum / 32) * 100)
}

function getRawLevel(theta: number): number {
  if (theta <= 20) return 0
  if (theta <= 50) return 1
  if (theta <= 80) return 2
  return 3
}

function applyGating(
  rawLevel: number,
  scores: Record<DimensionKey, number>,
): { level: number; gated: boolean } {
  let level = rawLevel
  let gated = false
  if (level === 3 && (scores.workflow < 70 || scores.data < 60 || scores.adoption < 50)) {
    level = 2
    gated = true
  }
  if (level === 2 && (scores.workflow < 50 || scores.data < 40)) {
    level = 1
    gated = true
  }
  return { level, gated }
}

export function computeResult(input: AssessmentInput): AssessmentResult {
  const dimensions: DimensionResult[] = DIMENSIONS.map(d => ({
    key: d.key,
    label: d.label,
    weight: d.weight,
    score: computeDimensionScore(input.responses[d.key]),
  }))

  const scoreMap = Object.fromEntries(dimensions.map(d => [d.key, d.score])) as Record<DimensionKey, number>

  const thetaScore = round1(
    dimensions.reduce((acc, d) => acc + d.score * d.weight, 0),
  )

  const rawLevel = getRawLevel(thetaScore)
  const { level: gatedLevel, gated } = applyGating(rawLevel, scoreMap)

  const bottleneckDim = dimensions.reduce((min, d) => d.score < min.score ? d : min)
  const gap = Math.max(0, round1(70 - bottleneckDim.score))

  return {
    companyName: input.companyName,
    dimensions,
    thetaScore,
    rawLevel,
    level: LEVELS[gatedLevel],
    gated,
    bottleneck: {
      dimension: bottleneckDim.key,
      score: bottleneckDim.score,
      gap,
      actions: RECOMMENDATIONS[bottleneckDim.key],
    },
  }
}
