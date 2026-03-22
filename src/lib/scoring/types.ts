export type { GrowthEngineType } from "./growth-engines";
export type { CaseStudy } from "./case-studies";

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

export interface AssessmentResult {
  companyName: string;
  dimensions: DimensionResult[];
  thetaScore: number;
  rawLevel: number;
  level: LevelInfo;
  gated: boolean;
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

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}
