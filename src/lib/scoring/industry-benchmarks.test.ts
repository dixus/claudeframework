import { describe, it, expect } from "vitest";
import {
  getCohortBenchmark,
  computePercentile,
  computeDimensionGaps,
} from "./industry-benchmarks";
import { computeResult } from "./engine";
import type { AssessmentInput, DimensionKey } from "./types";

const DIMENSION_KEYS: DimensionKey[] = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

// TC1: getCohortBenchmark returns valid CohortBenchmark for series-a + plg
describe("getCohortBenchmark", () => {
  it("TC1: returns valid CohortBenchmark for series-a + plg", () => {
    const cohort = getCohortBenchmark("series-a", "plg");
    expect(cohort).not.toBeNull();
    expect(cohort!.meanTheta).toBeTypeOf("number");
    expect(cohort!.medianTheta).toBeTypeOf("number");
    expect(cohort!.p25Theta).toBeTypeOf("number");
    expect(cohort!.p75Theta).toBeTypeOf("number");
    expect(cohort!.sampleSize).toBeGreaterThan(0);
    for (const key of DIMENSION_KEYS) {
      expect(cohort!.dimensionMeans[key]).toBeTypeOf("number");
    }
  });

  // TC2: returns null for invalid funding stage
  it("TC2: returns null for invalid funding stage", () => {
    const cohort = getCohortBenchmark("invalid" as never, "plg");
    expect(cohort).toBeNull();
  });

  // TC3: returns null for hybrid growth engine
  it("TC3: returns null for hybrid growth engine", () => {
    const cohort = getCohortBenchmark("series-a", "hybrid" as never);
    expect(cohort).toBeNull();
  });
});

describe("computePercentile", () => {
  const cohort = getCohortBenchmark("series-a", "plg")!;

  // TC4: user above mean returns percentile > 50
  it("TC4: user above mean returns percentile > 50", () => {
    const percentile = computePercentile(50, cohort);
    expect(percentile).toBeGreaterThan(50);
  });

  // TC5: user below mean returns percentile < 50
  it("TC5: user below mean returns percentile < 50", () => {
    const percentile = computePercentile(30, cohort);
    expect(percentile).toBeLessThan(50);
  });

  // TC6: user at mean returns exactly 50
  it("TC6: user at mean returns exactly 50", () => {
    const percentile = computePercentile(cohort.meanTheta, cohort);
    expect(percentile).toBe(50);
  });

  // TC7: very high score clamped to 99
  it("TC7: very high score clamped to at most 99", () => {
    const percentile = computePercentile(200, cohort);
    expect(percentile).toBeLessThanOrEqual(99);
  });

  // TC8: very low score clamped to 1
  it("TC8: very low score clamped to at least 1", () => {
    const percentile = computePercentile(-50, cohort);
    expect(percentile).toBeGreaterThanOrEqual(1);
  });
});

describe("computeDimensionGaps", () => {
  // TC9: positive delta for dimension above cohort mean
  it("TC9: positive delta for dimension above cohort mean", () => {
    const userDimensions: Record<DimensionKey, number> = {
      strategy: 70,
      architecture: 50,
      workflow: 50,
      data: 50,
      talent: 50,
      adoption: 50,
    };
    const cohortMeans: Record<DimensionKey, number> = {
      strategy: 60,
      architecture: 50,
      workflow: 50,
      data: 50,
      talent: 50,
      adoption: 50,
    };
    const gaps = computeDimensionGaps(userDimensions, cohortMeans);
    expect(gaps.strategy).toBe(10);
  });

  // TC10: negative delta for dimension below cohort mean
  it("TC10: negative delta for dimension below cohort mean", () => {
    const userDimensions: Record<DimensionKey, number> = {
      strategy: 40,
      architecture: 50,
      workflow: 50,
      data: 50,
      talent: 50,
      adoption: 50,
    };
    const cohortMeans: Record<DimensionKey, number> = {
      strategy: 60,
      architecture: 50,
      workflow: 50,
      data: 50,
      talent: 50,
      adoption: 50,
    };
    const gaps = computeDimensionGaps(userDimensions, cohortMeans);
    expect(gaps.strategy).toBe(-20);
  });
});

// TC11-TC13: Engine integration tests
describe("computeResult benchmark integration", () => {
  const midAnswers = [3, 3, 3, 3, 2, 2, 2, 2]; // score = (20/32)*100 = 62.5

  function makeInput(
    overrides: Partial<AssessmentInput> = {},
  ): AssessmentInput {
    return {
      companyName: "Test Co",
      responses: Object.fromEntries(
        DIMENSION_KEYS.map((k) => [k, midAnswers]),
      ) as Record<DimensionKey, number[]>,
      ...overrides,
    };
  }

  // TC11: with enablers + growthEngine produces benchmarkComparison
  it("TC11: produces benchmarkComparison with enablers + growthEngine", () => {
    const result = computeResult(
      makeInput({
        enablers: {
          fundingStage: "series-a",
          teamSize: 50,
          annualRevenue: 5000,
        },
        capabilityResponses: {
          c1_strategy: 3,
          c2_setup: 3,
          c3_execution: 3,
          c4_operationalization: 3,
        },
        growthEngine: "plg",
      }),
    );
    expect(result.benchmarkComparison).toBeDefined();
    expect(result.benchmarkComparison!.cohortLabel).toBeTypeOf("string");
    expect(result.benchmarkComparison!.percentile).toBeGreaterThanOrEqual(1);
    expect(result.benchmarkComparison!.percentile).toBeLessThanOrEqual(99);
    expect(
      Object.keys(result.benchmarkComparison!.dimensionDeltas),
    ).toHaveLength(6);
    expect(result.benchmarkComparison!.topStrength).toBeDefined();
    expect(result.benchmarkComparison!.keyGap).toBeDefined();
  });

  // TC12: without growthEngine produces undefined benchmarkComparison
  it("TC12: without growthEngine produces undefined benchmarkComparison", () => {
    const result = computeResult(
      makeInput({
        enablers: {
          fundingStage: "series-a",
          teamSize: 50,
          annualRevenue: 5000,
        },
        capabilityResponses: {
          c1_strategy: 3,
          c2_setup: 3,
          c3_execution: 3,
          c4_operationalization: 3,
        },
      }),
    );
    expect(result.benchmarkComparison).toBeUndefined();
  });

  // TC13: without enablers produces undefined benchmarkComparison
  it("TC13: without enablers produces undefined benchmarkComparison", () => {
    const result = computeResult(
      makeInput({
        growthEngine: "plg",
      }),
    );
    expect(result.benchmarkComparison).toBeUndefined();
  });
});
