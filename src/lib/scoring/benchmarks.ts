// Source: AMF v4.5.1, ANST v4.5.3, n=62 companies (2021-2025), B2B SaaS, post-Series A
import type { BenchmarkData } from "./types";

const BENCHMARKS: Record<number, BenchmarkData> = {
  0: {
    arrPerEmployee: "€150–200K",
    monthsTo100M: "60+",
    peerPercent: 24,
    levelMeanTheta: 10,
  },
  1: {
    arrPerEmployee: "€200–600K",
    monthsTo100M: "36–60",
    peerPercent: 37,
    levelMeanTheta: 35,
  },
  2: {
    arrPerEmployee: "€400K–2M",
    monthsTo100M: "24–36",
    peerPercent: 24,
    levelMeanTheta: 65,
  },
  3: {
    arrPerEmployee: "€700K–6M",
    monthsTo100M: "18–24",
    peerPercent: 15,
    levelMeanTheta: 90,
  },
};

const NEXT_LEVEL_THRESHOLD: Record<number, number | null> = {
  0: 21,
  1: 51,
  2: 81,
  3: null,
};

export function getBenchmark(level: number): BenchmarkData {
  return BENCHMARKS[level];
}

export function getNextLevelThreshold(level: number): number | null {
  return NEXT_LEVEL_THRESHOLD[level];
}

const LEVEL_GATES: Record<
  number,
  Partial<Record<import("./types").DimensionKey, number>>
> = {
  1: {},
  2: { workflow: 50, data: 40 },
  3: { workflow: 70, data: 60, adoption: 50 },
};

export function getLevelThresholdScores(
  targetLevel: number,
): Record<import("./types").DimensionKey, number | null> {
  const gates = LEVEL_GATES[targetLevel] ?? {};
  const ALL_DIMS: import("./types").DimensionKey[] = [
    "strategy",
    "architecture",
    "workflow",
    "data",
    "talent",
    "adoption",
  ];
  return Object.fromEntries(
    ALL_DIMS.map((k) => [k, gates[k] ?? null]),
  ) as Record<import("./types").DimensionKey, number | null>;
}

const THETA_RANGES: Record<number, { min: number; max: number }> = {
  0: { min: 0, max: 20 },
  1: { min: 20, max: 50 },
  2: { min: 50, max: 80 },
  3: { min: 80, max: 100 },
};

export function getLevelThetaRange(level: number): {
  min: number;
  max: number;
} {
  return THETA_RANGES[level];
}
