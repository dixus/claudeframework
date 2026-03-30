export type { GrowthEngineType } from "./growth-engines";
export type { CaseStudy } from "./case-studies";

export interface CohortBenchmark {
  fundingStage: FundingStage;
  growthEngine: import("./growth-engines").GrowthEngineType;
  label: string;
  sampleSize: number;
  meanTheta: number;
  medianTheta: number;
  p25Theta: number;
  p75Theta: number;
  dimensionMeans: Record<DimensionKey, number>;
}

export interface BenchmarkComparison {
  cohortLabel: string;
  sampleSize: number;
  percentile: number;
  dimensionDeltas: Record<DimensionKey, number>;
  dimensionMeans: Record<DimensionKey, number>;
  topStrength: { dimension: DimensionKey; delta: number };
  keyGap: { dimension: DimensionKey; delta: number };
}

export type DimensionKey =
  | "strategy"
  | "architecture"
  | "workflow"
  | "data"
  | "talent"
  | "adoption";

export type CapabilityKey =
  | "c1_strategy"
  | "c2_setup"
  | "c3_execution"
  | "c4_operationalization";

export type FundingStage =
  | ""
  | "pre-seed"
  | "seed"
  | "series-a"
  | "series-b"
  | "series-c"
  | "growth";

export interface EnablerInput {
  fundingStage: FundingStage;
  teamSize: number;
  annualRevenue: number; // in thousands EUR
}

export interface CapabilityScores {
  c1_strategy: number;
  c2_setup: number;
  c3_execution: number;
  c4_operationalization: number;
}

export interface AssessmentInput {
  companyName: string;
  responses: Record<DimensionKey, number[]>;
  enablers?: EnablerInput;
  capabilityResponses?: Record<CapabilityKey, number>;
  growthEngine?: import("./growth-engines").GrowthEngineType;
}

export interface DimensionResult {
  key: DimensionKey;
  label: string;
  weight: number;
  score: number;
}

export interface LevelInfo {
  level: number;
  label: string;
  monthsTo100M: number;
  arrPerEmployee: string;
}

export interface BottleneckInfo {
  dimension: DimensionKey;
  score: number;
  gap: number;
  actions: string[];
}

export interface CapabilityResult {
  key: CapabilityKey;
  label: string;
  score: number;
}

export interface MetaResult {
  metaScore: number;
  predictedMonthsTo100M: number;
  scalingCoefficient: number;
  enablerScore: number;
  capabilityGeoMean: number;
  capabilityExponents: Record<CapabilityKey, number>;
}

export interface GatingDetail {
  dimension: DimensionKey;
  dimensionLabel: string;
  score: number;
  threshold: number;
  targetLevel: number;
}

export interface AssessmentResult {
  companyName: string;
  dimensions: DimensionResult[];
  thetaScore: number;
  rawLevel: number;
  level: LevelInfo;
  gated: boolean;
  gatingDetails: GatingDetail[];
  bottleneck: BottleneckInfo;
  capabilities?: CapabilityResult[];
  capabilityBottleneck?: CapabilityResult;
  meta?: MetaResult;
  enablers?: EnablerInput;
  playbook?: CapabilityPlaybook;
  scalingVelocity?: ScalingVelocity;
  roadmap?: import("./roadmaps").StageRoadmap;
  growthEngine?: import("./growth-engines").GrowthEngine;
  coordination?: {
    curves: import("./coordination").CoordinationModel[];
    insight: string;
    savings: number;
  };
  interventionModel?: {
    model: import("./intervention").InterventionModel;
    rationale: string;
  };
  caseStudies?: import("./case-studies").CaseStudy[];
  benchmarkComparison?: BenchmarkComparison;
}

export type ModelId = "model1" | "model2" | "model3";

export interface BenchmarkData {
  arrPerEmployee: string;
  monthsTo100M: string;
  peerPercent: number;
  levelMeanTheta: number;
}

export interface PlaybookContent {
  modelName: string;
  timeline: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
}

export interface PlaybookPhase {
  name: string;
  weeks: string;
  actions: string[];
}

export interface CapabilityPlaybook {
  capability: CapabilityKey;
  label: string;
  duration: string;
  symptoms: string[];
  rootCauses: string[];
  phases: PlaybookPhase[];
  expectedImpact: {
    sImprovement: string;
    primaryMetric: string;
    secondaryMetric: string;
  };
}

export interface ScalingVelocity {
  s: number;
  band: "struggling" | "linear" | "superlinear" | "exponential";
  bandLabel: string;
  components: {
    enabler: number;
    capabilityProduct: number;
    theta: number;
  };
  scenarios: {
    current: number;
    fixBottleneck: number;
    fixAll: number;
    addAI: number;
  };
  bottleneckCapability: CapabilityKey;
}

export interface WhatIfResult {
  thetaScore: number;
  level: LevelInfo;
  gated: boolean;
  gatingDetails: GatingDetail[];
  meta?: MetaResult;
  scalingVelocity?: ScalingVelocity;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}

export interface TimestampedResult {
  result: AssessmentResult;
  createdAt: string; // ISO date
}

export interface ComparisonDimensionDelta {
  key: DimensionKey;
  label: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
}

export interface ComparisonCapabilityDelta {
  key: CapabilityKey;
  label: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
}

export interface AssessmentComparison {
  thetaBefore: number;
  thetaAfter: number;
  thetaDelta: number;
  levelBefore: number;
  levelAfter: number;
  levelChanged: boolean;
  dimensions: ComparisonDimensionDelta[];
  mostImproved: { dimension: DimensionKey; delta: number } | null;
  mostRegressed: { dimension: DimensionKey; delta: number } | null;
  capabilities: ComparisonCapabilityDelta[] | null;
}

export interface ProgressDelta {
  thetaDelta: number;
  dimensionDeltas: Record<DimensionKey, number>;
  levelChanged: boolean;
  previousLevel: number;
  currentLevel: number;
  velocityDelta: number | null;
  daysBetween: number;
}

export interface ProgressSummary {
  assessmentCount: number;
  trend: "improving" | "stable" | "declining";
  fastestImproving: { dimension: DimensionKey; delta: number } | null;
  mostRegressed: { dimension: DimensionKey; delta: number } | null;
  levelTransitions: number;
  timelinePoints: {
    date: string;
    theta: number;
    level: number;
    dimensions: Record<DimensionKey, number>;
  }[];
}
