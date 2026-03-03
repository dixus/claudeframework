// Source: AMF v4.5.1, n=62 companies (2021-2025), B2B SaaS, post-Series A
import type { BenchmarkData } from './types'

const BENCHMARKS: Record<number, BenchmarkData> = {
  0: { arrPerEmployee: '€150–200K', monthsTo100M: '60+',   peerPercent: 24, levelMeanTheta: 10 },
  1: { arrPerEmployee: '€200–400K', monthsTo100M: '36–60', peerPercent: 37, levelMeanTheta: 35 },
  2: { arrPerEmployee: '€400–700K', monthsTo100M: '24–36', peerPercent: 29, levelMeanTheta: 65 },
  3: { arrPerEmployee: '€700–1.5M', monthsTo100M: '18–24', peerPercent: 15, levelMeanTheta: 90 },
}

const NEXT_LEVEL_THRESHOLD: Record<number, number | null> = {
  0: 21,
  1: 51,
  2: 81,
  3: null,
}

export function getBenchmark(level: number): BenchmarkData {
  return BENCHMARKS[level]
}

export function getNextLevelThreshold(level: number): number | null {
  return NEXT_LEVEL_THRESHOLD[level]
}
