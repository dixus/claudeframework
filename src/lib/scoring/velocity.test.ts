import { describe, it, expect } from "vitest";
import { computeScalingVelocity } from "./engine";
import type { CapabilityKey } from "./types";

const allCaps = (v: number): Record<CapabilityKey, number> => ({
  c1_strategy: v,
  c2_setup: v,
  c3_execution: v,
  c4_operationalization: v,
});

describe("computeScalingVelocity", () => {
  it("all zeros → S = 0", () => {
    const result = computeScalingVelocity(0, allCaps(0), 0);
    expect(result.s).toBe(0);
    expect(result.band).toBe("struggling");
  });

  it("all 100s → S at maximum", () => {
    const result = computeScalingVelocity(100, allCaps(100), 100);
    // S = 1 × (1^1.5 × 1 × 1^1.5 × 1) × 1 = 1
    expect(result.s).toBe(1);
    expect(result.band).toBe("exponential");
  });

  it("known manual calculation matches", () => {
    // E=60, C1=80, C2=70, C3=60, C4=50, θ=75
    // e=0.6, c1=0.8, c2=0.7, c3=0.6, c4=0.5, θ=0.75
    // capProduct = 0.8^1.5 × 0.7 × 0.6^1.5 × 0.5
    //            = 0.7155 × 0.7 × 0.4648 × 0.5
    //            = 0.11637...
    // S = 0.6 × 0.11637 × 0.75 = 0.05236...
    const result = computeScalingVelocity(
      75,
      {
        c1_strategy: 80,
        c2_setup: 70,
        c3_execution: 60,
        c4_operationalization: 50,
      },
      60,
    );
    expect(result.s).toBeCloseTo(0.0524, 3);
    expect(result.band).toBe("linear");
  });

  it("scenario calculations are correct", () => {
    const result = computeScalingVelocity(
      75,
      {
        c1_strategy: 80,
        c2_setup: 70,
        c3_execution: 60,
        c4_operationalization: 50, // bottleneck
      },
      60,
    );

    expect(result.scenarios.current).toBe(result.s);
    expect(result.bottleneckCapability).toBe("c4_operationalization");

    // fixBottleneck: c4 raised to 85
    expect(result.scenarios.fixBottleneck).toBeGreaterThan(
      result.scenarios.current,
    );
    // fixAll: all caps raised to 85
    expect(result.scenarios.fixAll).toBeGreaterThan(
      result.scenarios.fixBottleneck,
    );
    // addAI: all caps 85 + θ 90
    expect(result.scenarios.addAI).toBeGreaterThan(result.scenarios.fixAll);
  });

  it("components are correct", () => {
    const result = computeScalingVelocity(75, allCaps(80), 60);
    expect(result.components.enabler).toBeCloseTo(0.6, 5);
    expect(result.components.theta).toBeCloseTo(0.75, 5);
    // capProduct = 0.8^1.5 × 0.8 × 0.8^1.5 × 0.8 = 0.8^5 = 0.32768
    expect(result.components.capabilityProduct).toBeCloseTo(0.32768, 4);
  });
});

describe("band assignment", () => {
  it("S < 0.05 → struggling", () => {
    const result = computeScalingVelocity(20, allCaps(20), 20);
    expect(result.s).toBeLessThan(0.05);
    expect(result.band).toBe("struggling");
    expect(result.bandLabel).toBe("Struggling");
  });

  it("S = 0.05 → linear", () => {
    // We need to find inputs that produce S ≈ 0.05
    // Using all=50, e=50: S = 0.5 × (0.5^5) × 0.5 = 0.5 × 0.03125 × 0.5 = 0.0078 → too low
    // Try all=80, e=80, θ=80: S = 0.8 × 0.8^5 × 0.8 = 0.8 × 0.32768 × 0.8 = 0.2097 → too high
    // Just test the band for a known value
    const result = computeScalingVelocity(
      75,
      {
        c1_strategy: 80,
        c2_setup: 70,
        c3_execution: 60,
        c4_operationalization: 50,
      },
      60,
    );
    // S ≈ 0.0524 → linear
    expect(result.s).toBeGreaterThanOrEqual(0.05);
    expect(result.s).toBeLessThan(0.2);
    expect(result.band).toBe("linear");
    expect(result.bandLabel).toBe("Linear scaling");
  });

  it("S in superlinear range → superlinear", () => {
    // all=85, e=85, θ=85: S = 0.85 × 0.85^5 × 0.85 = 0.85^7 ≈ 0.3206
    const result = computeScalingVelocity(85, allCaps(85), 85);
    expect(result.s).toBeGreaterThanOrEqual(0.2);
    expect(result.s).toBeLessThan(0.5);
    expect(result.band).toBe("superlinear");
    expect(result.bandLabel).toBe("Superlinear scaling");
  });

  it("S > 0.50 → exponential", () => {
    const result = computeScalingVelocity(100, allCaps(100), 100);
    expect(result.s).toBeGreaterThanOrEqual(0.5);
    expect(result.band).toBe("exponential");
    expect(result.bandLabel).toBe("Exponential scaling");
  });
});
