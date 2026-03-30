import type {
  CohortBenchmark,
  BenchmarkComparison,
  DimensionKey,
  FundingStage,
} from "./types";
import type { GrowthEngineType } from "./growth-engines";

const DIMENSION_KEYS: DimensionKey[] = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

const VALID_FUNDING_STAGES: FundingStage[] = [
  "seed",
  "series-a",
  "series-b",
  "growth",
];
const VALID_GROWTH_ENGINES: GrowthEngineType[] = ["plg", "slg", "clg"];

function makeCohort(
  fundingStage: FundingStage,
  growthEngine: GrowthEngineType,
  label: string,
  sampleSize: number,
  meanTheta: number,
  medianTheta: number,
  p25Theta: number,
  p75Theta: number,
  dimensionMeans: Record<DimensionKey, number>,
): CohortBenchmark {
  return {
    fundingStage,
    growthEngine,
    label,
    sampleSize,
    meanTheta,
    medianTheta,
    p25Theta,
    p75Theta,
    dimensionMeans,
  };
}

const COHORTS: Record<string, CohortBenchmark> = {
  "seed:plg": makeCohort("seed", "plg", "Seed + PLG", 87, 32, 30, 22, 42, {
    strategy: 35,
    architecture: 38,
    workflow: 30,
    data: 25,
    talent: 28,
    adoption: 34,
  }),
  "seed:slg": makeCohort("seed", "slg", "Seed + SLG", 64, 28, 27, 18, 38, {
    strategy: 32,
    architecture: 25,
    workflow: 26,
    data: 22,
    talent: 30,
    adoption: 24,
  }),
  "seed:clg": makeCohort("seed", "clg", "Seed + CLG", 52, 30, 29, 20, 40, {
    strategy: 33,
    architecture: 28,
    workflow: 28,
    data: 24,
    talent: 32,
    adoption: 36,
  }),
  "series-a:plg": makeCohort(
    "series-a",
    "plg",
    "Series A + PLG",
    142,
    45,
    44,
    35,
    55,
    {
      strategy: 48,
      architecture: 52,
      workflow: 44,
      data: 38,
      talent: 40,
      adoption: 50,
    },
  ),
  "series-a:slg": makeCohort(
    "series-a",
    "slg",
    "Series A + SLG",
    118,
    42,
    41,
    32,
    52,
    {
      strategy: 46,
      architecture: 40,
      workflow: 38,
      data: 36,
      talent: 44,
      adoption: 38,
    },
  ),
  "series-a:clg": makeCohort(
    "series-a",
    "clg",
    "Series A + CLG",
    95,
    43,
    42,
    33,
    53,
    {
      strategy: 45,
      architecture: 42,
      workflow: 40,
      data: 37,
      talent: 46,
      adoption: 48,
    },
  ),
  "series-b:plg": makeCohort(
    "series-b",
    "plg",
    "Series B + PLG",
    176,
    58,
    57,
    48,
    68,
    {
      strategy: 60,
      architecture: 65,
      workflow: 56,
      data: 50,
      talent: 52,
      adoption: 62,
    },
  ),
  "series-b:slg": makeCohort(
    "series-b",
    "slg",
    "Series B + SLG",
    155,
    55,
    54,
    45,
    65,
    {
      strategy: 58,
      architecture: 52,
      workflow: 50,
      data: 48,
      talent: 56,
      adoption: 50,
    },
  ),
  "series-b:clg": makeCohort(
    "series-b",
    "clg",
    "Series B + CLG",
    108,
    56,
    55,
    46,
    66,
    {
      strategy: 57,
      architecture: 54,
      workflow: 52,
      data: 49,
      talent: 58,
      adoption: 60,
    },
  ),
  "growth:plg": makeCohort(
    "growth",
    "plg",
    "Growth + PLG",
    198,
    72,
    71,
    62,
    82,
    {
      strategy: 74,
      architecture: 78,
      workflow: 70,
      data: 65,
      talent: 68,
      adoption: 76,
    },
  ),
  "growth:slg": makeCohort(
    "growth",
    "slg",
    "Growth + SLG",
    185,
    68,
    67,
    58,
    78,
    {
      strategy: 70,
      architecture: 64,
      workflow: 65,
      data: 62,
      talent: 72,
      adoption: 62,
    },
  ),
  "growth:clg": makeCohort(
    "growth",
    "clg",
    "Growth + CLG",
    124,
    70,
    69,
    60,
    80,
    {
      strategy: 72,
      architecture: 68,
      workflow: 66,
      data: 63,
      talent: 74,
      adoption: 74,
    },
  ),
};

export function getCohortBenchmark(
  fundingStage: FundingStage,
  growthEngine: GrowthEngineType,
): CohortBenchmark | null {
  if (
    !VALID_FUNDING_STAGES.includes(fundingStage) ||
    !VALID_GROWTH_ENGINES.includes(growthEngine)
  ) {
    return null;
  }
  return COHORTS[`${fundingStage}:${growthEngine}`] ?? null;
}

export function computePercentile(
  userScore: number,
  cohort: CohortBenchmark,
): number {
  const sigma = (cohort.p75Theta - cohort.p25Theta) / 1.349;
  if (sigma <= 0) return 50;
  const z = (userScore - cohort.meanTheta) / sigma;
  // Logistic CDF approximation of the normal CDF: 1/(1+e^(-1.7z))
  // The 1.7 scaling factor aligns the logistic curve with the standard normal CDF.
  const cdf = 1 / (1 + Math.exp(-1.7 * z));
  const percentile = Math.round(cdf * 100);
  return Math.max(1, Math.min(99, percentile));
}

export function computeDimensionGaps(
  userDimensions: Record<DimensionKey, number>,
  cohortMeans: Record<DimensionKey, number>,
): Record<DimensionKey, number> {
  const deltas = {} as Record<DimensionKey, number>;
  for (const key of DIMENSION_KEYS) {
    deltas[key] =
      Math.round((userDimensions[key] - cohortMeans[key]) * 10) / 10;
  }
  return deltas;
}

export function computeBenchmarkComparison(
  thetaScore: number,
  dimensionScores: Record<DimensionKey, number>,
  fundingStage: FundingStage,
  growthEngine: GrowthEngineType,
): BenchmarkComparison | undefined {
  const cohort = getCohortBenchmark(fundingStage, growthEngine);
  if (!cohort) return undefined;

  const percentile = computePercentile(thetaScore, cohort);
  const dimensionDeltas = computeDimensionGaps(
    dimensionScores,
    cohort.dimensionMeans,
  );

  let topStrength: BenchmarkComparison["topStrength"] = {
    dimension: DIMENSION_KEYS[0],
    delta: dimensionDeltas[DIMENSION_KEYS[0]],
  };
  let keyGap: BenchmarkComparison["keyGap"] = {
    dimension: DIMENSION_KEYS[0],
    delta: dimensionDeltas[DIMENSION_KEYS[0]],
  };

  for (const key of DIMENSION_KEYS) {
    if (dimensionDeltas[key] > topStrength.delta) {
      topStrength = { dimension: key, delta: dimensionDeltas[key] };
    }
    if (dimensionDeltas[key] < keyGap.delta) {
      keyGap = { dimension: key, delta: dimensionDeltas[key] };
    }
  }

  return {
    cohortLabel: cohort.label,
    sampleSize: cohort.sampleSize,
    percentile,
    dimensionDeltas,
    dimensionMeans: cohort.dimensionMeans,
    topStrength,
    keyGap,
  };
}
