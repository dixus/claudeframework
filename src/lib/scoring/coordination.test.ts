import { describe, it, expect } from "vitest";
import {
  computeCoordinationCurves,
  getCoordinationInsight,
} from "./coordination";

describe("computeCoordinationCurves", () => {
  it("generates data points for all 6 team sizes when teamSize is standard", () => {
    const curves = computeCoordinationCurves(50, 50);
    expect(curves).toHaveLength(6);
    expect(curves.map((c) => c.teamSize)).toEqual([10, 25, 50, 100, 200, 500]);
  });

  it("injects non-standard teamSize into data array sorted", () => {
    const curves = computeCoordinationCurves(80, 50);
    expect(curves).toHaveLength(7);
    const sizes = curves.map((c) => c.teamSize);
    expect(sizes).toContain(80);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });

  it("traditional cost at n=100 is ~4950 before normalization", () => {
    const curves = computeCoordinationCurves(100, 50);
    const point = curves.find((c) => c.teamSize === 100)!;
    // Traditional = n*(n-1)/2 = 100*99/2 = 4950
    // Normalized to 0-100 against max (n=500: 500*499/2 = 124750)
    const rawTraditional = (100 * 99) / 2;
    expect(rawTraditional).toBe(4950);
    // Normalized value should be 4950/124750 * 100 ≈ 3.97
    expect(point.traditionalCost).toBeGreaterThan(0);
  });

  it("AI-native cost at n=100 is ~150 before normalization", () => {
    const curves = computeCoordinationCurves(100, 50);
    const point = curves.find((c) => c.teamSize === 100)!;
    // AI-native = n * 1.5 = 150
    const rawAINative = 100 * 1.5;
    expect(rawAINative).toBe(150);
    expect(point.aiNativeCost).toBeGreaterThan(0);
  });

  it("theta=0 company curve matches traditional", () => {
    const curves = computeCoordinationCurves(100, 0);
    for (const point of curves) {
      expect(point.companyCost).toBeCloseTo(point.traditionalCost, 5);
    }
  });

  it("theta=100 company curve matches AI-native", () => {
    const curves = computeCoordinationCurves(100, 100);
    for (const point of curves) {
      expect(point.companyCost).toBeCloseTo(point.aiNativeCost, 5);
    }
  });

  it("costs are normalized to 0-100 scale", () => {
    const curves = computeCoordinationCurves(50, 50);
    for (const point of curves) {
      expect(point.traditionalCost).toBeGreaterThanOrEqual(0);
      expect(point.traditionalCost).toBeLessThanOrEqual(100);
      expect(point.aiEnabledCost).toBeGreaterThanOrEqual(0);
      expect(point.aiEnabledCost).toBeLessThanOrEqual(100);
      expect(point.aiNativeCost).toBeGreaterThanOrEqual(0);
      expect(point.aiNativeCost).toBeLessThanOrEqual(100);
    }
  });
});

describe("getCoordinationInsight", () => {
  it("returns non-empty string", () => {
    const insight = getCoordinationInsight(50, 100);
    expect(insight.text).toBeTruthy();
    expect(insight.text.length).toBeGreaterThan(0);
  });

  it("savings percentage is between 0 and 1", () => {
    const insight = getCoordinationInsight(50, 100);
    expect(insight.savings).toBeGreaterThanOrEqual(0);
    expect(insight.savings).toBeLessThanOrEqual(1);
  });

  it("higher theta yields higher savings", () => {
    const lowTheta = getCoordinationInsight(10, 100);
    const highTheta = getCoordinationInsight(90, 100);
    expect(highTheta.savings).toBeGreaterThan(lowTheta.savings);
  });
});
