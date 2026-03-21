import type {
  AssessmentInput,
  AssessmentResult,
  DimensionKey,
  DimensionResult,
  LevelInfo,
  CapabilityKey,
  CapabilityResult,
  MetaResult,
} from "./types";
import { RECOMMENDATIONS } from "./recommendations";
import { CAPABILITY_PLAYBOOKS } from "./playbooks";
import { getRoadmapForStage } from "./roadmaps";
import { GROWTH_ENGINES } from "./growth-engines";

// Weights per Architecture Document v4.5.3
const DIMENSIONS = [
  { key: "strategy" as const, label: "Strategy", weight: 0.25 },
  { key: "architecture" as const, label: "Architecture", weight: 0.2 },
  { key: "workflow" as const, label: "Workflow", weight: 0.15 },
  { key: "data" as const, label: "Data", weight: 0.15 },
  { key: "talent" as const, label: "Talent", weight: 0.15 },
  { key: "adoption" as const, label: "Adoption", weight: 0.1 },
] as const;

const LEVELS: LevelInfo[] = [
  {
    level: 0,
    label: "Traditional",
    monthsTo100M: 84,
    arrPerEmployee: "€150–200K",
  },
  {
    level: 1,
    label: "AI-Powered",
    monthsTo100M: 48,
    arrPerEmployee: "€200–600K",
  },
  {
    level: 2,
    label: "AI-Enabled",
    monthsTo100M: 30,
    arrPerEmployee: "€400K–2M",
  },
  {
    level: 3,
    label: "AI-Native",
    monthsTo100M: 21,
    arrPerEmployee: "€700K–6M",
  },
];

const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  c1_strategy: "C₁ Strategy",
  c2_setup: "C₂ Setup",
  c3_execution: "C₃ Execution",
  c4_operationalization: "C₄ Operationalization",
};

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function computeDimensionScore(answers: number[]): number {
  const sum = answers.reduce((acc, v) => acc + v, 0);
  return round1((sum / 32) * 100);
}

function getRawLevel(theta: number): number {
  if (theta <= 20) return 0;
  if (theta <= 50) return 1;
  if (theta <= 80) return 2;
  return 3;
}

function applyGating(
  rawLevel: number,
  scores: Record<DimensionKey, number>,
): { level: number; gated: boolean } {
  let level = rawLevel;
  let gated = false;
  if (
    level === 3 &&
    (scores.workflow < 70 || scores.data < 60 || scores.adoption < 50)
  ) {
    level = 2;
    gated = true;
  }
  if (level === 2 && (scores.workflow < 50 || scores.data < 40)) {
    level = 1;
    gated = true;
  }
  return { level, gated };
}

// ANST formula: S = E × (C₁^1.5 × C₂ × C₃^1.5 × C₄) × θ_index
// Strategy (C₁) and Execution (C₃) have superlinear exponents (1.5)
// Setup (C₂) and Operationalization (C₄) have linear exponents (1.0)
// Validated with n=22 companies, R²=0.76 (ANST v4.5.3)
const CAPABILITY_EXPONENTS: Record<CapabilityKey, number> = {
  c1_strategy: 1.5,
  c2_setup: 1.0,
  c3_execution: 1.5,
  c4_operationalization: 1.0,
};

const EXPONENT_SUM = Object.values(CAPABILITY_EXPONENTS).reduce(
  (a, b) => a + b,
  0,
); // 5

function computeMeta(
  thetaNorm: number,
  capScores: Record<CapabilityKey, number>,
  enablerScore: number,
): MetaResult {
  const c1 = capScores.c1_strategy / 100;
  const c2 = capScores.c2_setup / 100;
  const c3 = capScores.c3_execution / 100;
  const c4 = capScores.c4_operationalization / 100;
  const thetaN = thetaNorm / 100;

  const capabilityProduct =
    Math.pow(c1, CAPABILITY_EXPONENTS.c1_strategy) *
    Math.pow(c2, CAPABILITY_EXPONENTS.c2_setup) *
    Math.pow(c3, CAPABILITY_EXPONENTS.c3_execution) *
    Math.pow(c4, CAPABILITY_EXPONENTS.c4_operationalization);
  const capabilityGeoMean = Math.pow(capabilityProduct, 1 / EXPONENT_SUM);
  const eNorm = enablerScore / 100;
  const metaScore = round1(
    thetaN * capabilityGeoMean * Math.pow(eNorm, 1 / 3) * 100,
  );

  // Map META score to predicted months: META=0 → 84 months, META=100 → 18 months
  // Using validated regression: log(months) = a - b * META
  const predictedMonthsRaw = 84 * Math.exp(-1.5 * (metaScore / 100));
  const predictedMonthsTo100M = Math.max(12, Math.round(predictedMonthsRaw));

  // Scaling coefficient: traditional 0.8-1.0, AI-native 1.3-1.8
  const scalingCoefficient = round1(0.8 + (metaScore / 100) * 1.0);

  return {
    metaScore,
    predictedMonthsTo100M,
    scalingCoefficient,
    enablerScore: round1(enablerScore),
    capabilityGeoMean: round1(capabilityGeoMean * 100),
    capabilityExponents: { ...CAPABILITY_EXPONENTS },
  };
}

// Derive enabler score from enabler inputs
export function computeEnablerScore(
  teamSize: number,
  annualRevenue: number,
  fundingStage: string,
): number {
  // Capital factor based on funding stage
  const capitalMap: Record<string, number> = {
    "pre-seed": 20,
    seed: 35,
    "series-a": 55,
    "series-b": 70,
    "series-c": 85,
    growth: 95,
  };
  const capital = capitalMap[fundingStage] ?? 50;

  // Talent factor: based on team size (more people = more potential, but with diminishing returns)
  const talent = Math.min(100, 30 + 20 * Math.log10(Math.max(1, teamSize)));

  // Culture factor: ARR/employee as a proxy (higher = more AI-leveraged culture)
  const arrPerEmp = teamSize > 0 ? (annualRevenue * 1000) / teamSize : 0;
  const culture = Math.min(100, arrPerEmp / 10000); // €1M/emp = 100

  return round1(capital * 0.4 + talent * 0.3 + culture * 0.3);
}

export function computeResult(input: AssessmentInput): AssessmentResult {
  const dimensions: DimensionResult[] = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    weight: d.weight,
    score: computeDimensionScore(input.responses[d.key]),
  }));

  const scoreMap = Object.fromEntries(
    dimensions.map((d) => [d.key, d.score]),
  ) as Record<DimensionKey, number>;

  const thetaScore = round1(
    dimensions.reduce((acc, d) => acc + d.score * d.weight, 0),
  );

  const rawLevel = getRawLevel(thetaScore);
  const { level: gatedLevel, gated } = applyGating(rawLevel, scoreMap);

  const bottleneckDim = dimensions.reduce((min, d) =>
    d.score < min.score ? d : min,
  );
  const gap = Math.max(0, round1(70 - bottleneckDim.score));

  const result: AssessmentResult = {
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
  };

  // Capability diagnosis (C₁–C₄) if provided
  if (input.capabilityResponses) {
    const capKeys: CapabilityKey[] = [
      "c1_strategy",
      "c2_setup",
      "c3_execution",
      "c4_operationalization",
    ];
    const capabilities: CapabilityResult[] = capKeys.map((k) => ({
      key: k,
      label: CAPABILITY_LABELS[k],
      score: round1((input.capabilityResponses![k] / 4) * 100),
    }));
    result.capabilities = capabilities;
    result.capabilityBottleneck = capabilities.reduce((min, c) =>
      c.score < min.score ? c : min,
    );
    result.playbook = CAPABILITY_PLAYBOOKS[result.capabilityBottleneck.key];
  }

  // META formula if enablers provided
  if (input.enablers && input.capabilityResponses) {
    const capScores = {
      c1_strategy: round1((input.capabilityResponses.c1_strategy / 4) * 100),
      c2_setup: round1((input.capabilityResponses.c2_setup / 4) * 100),
      c3_execution: round1((input.capabilityResponses.c3_execution / 4) * 100),
      c4_operationalization: round1(
        (input.capabilityResponses.c4_operationalization / 4) * 100,
      ),
    };
    const enablerScore = computeEnablerScore(
      input.enablers.teamSize,
      input.enablers.annualRevenue,
      input.enablers.fundingStage,
    );
    result.meta = computeMeta(thetaScore, capScores, enablerScore);
    result.enablers = input.enablers;

    const roadmap = getRoadmapForStage(input.enablers.fundingStage);
    if (roadmap) {
      result.roadmap = roadmap;
    }
  }

  if (input.growthEngine) {
    result.growthEngine = GROWTH_ENGINES[input.growthEngine];
  }

  return result;
}
