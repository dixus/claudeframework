export type DimensionKey = 'strategy' | 'architecture' | 'workflow' | 'data' | 'talent' | 'adoption'

export interface AssessmentInput {
  companyName: string
  responses: Record<DimensionKey, number[]>
}

export interface DimensionResult {
  key: DimensionKey
  label: string
  weight: number
  score: number
}

export interface LevelInfo {
  level: number
  label: string
  monthsTo100M: number
  arrPerEmployee: string
}

export interface BottleneckInfo {
  dimension: DimensionKey
  score: number
  gap: number
  actions: string[]
}

export interface AssessmentResult {
  companyName: string
  dimensions: DimensionResult[]
  thetaScore: number
  rawLevel: number
  level: LevelInfo
  gated: boolean
  bottleneck: BottleneckInfo
}

export type ModelId = 'model1' | 'model2' | 'model3'

export interface BenchmarkData {
  arrPerEmployee: string
  monthsTo100M: string
  peerPercent: number
  levelMeanTheta: number
}

export interface PlaybookContent {
  modelName: string
  timeline: string
  description: string
  steps: string[]
  expectedOutcome: string
}

export interface GlossaryTerm {
  term: string
  definition: string
  example?: string
}
