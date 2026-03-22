import { describe, it, expect } from "vitest";
import { VALIDATION_STATS, getValidationStat } from "./validation";
import type { ValidationStat } from "./validation";

describe("VALIDATION_STATS", () => {
  it("contains 5 validation entries", () => {
    expect(VALIDATION_STATS).toHaveLength(5);
  });

  it("every entry has required fields", () => {
    for (const stat of VALIDATION_STATS) {
      expect(stat.formula).toBeTruthy();
      expect(stat.metric).toBeTruthy();
      expect(stat.value).toBeTruthy();
      expect(stat.sampleSize).toBeGreaterThan(0);
      expect(stat.description).toBeTruthy();
      expect(["High", "Medium"]).toContain(stat.confidence);
    }
  });

  it("META formula has R²=0.91, n=22", () => {
    const meta = VALIDATION_STATS.find((s) => s.formula === "META");
    expect(meta).toBeDefined();
    expect(meta!.metric).toBe("R²");
    expect(meta!.value).toBe("0.91");
    expect(meta!.sampleSize).toBe(22);
    expect(meta!.confidence).toBe("High");
  });

  it("ANST formula has R²=0.76, n=22", () => {
    const anst = VALIDATION_STATS.find((s) => s.formula === "ANST");
    expect(anst).toBeDefined();
    expect(anst!.metric).toBe("R²");
    expect(anst!.value).toBe("0.76");
    expect(anst!.sampleSize).toBe(22);
    expect(anst!.confidence).toBe("High");
  });

  it("θ_index entry exists with n=22", () => {
    const theta = VALIDATION_STATS.find((s) => s.formula === "θ_index");
    expect(theta).toBeDefined();
    expect(theta!.sampleSize).toBe(22);
    expect(theta!.confidence).toBe("High");
  });

  it("Superlinear coefficient has Medium confidence", () => {
    const sup = VALIDATION_STATS.find(
      (s) => s.formula === "Superlinear Coefficient",
    );
    expect(sup).toBeDefined();
    expect(sup!.confidence).toBe("Medium");
  });

  it("Coordination Cost has Medium confidence", () => {
    const coord = VALIDATION_STATS.find(
      (s) => s.formula === "Coordination Cost",
    );
    expect(coord).toBeDefined();
    expect(coord!.confidence).toBe("Medium");
  });
});

describe("getValidationStat", () => {
  it("returns the correct stat for a known formula", () => {
    const stat = getValidationStat("META");
    expect(stat).toBeDefined();
    expect(stat!.value).toBe("0.91");
  });

  it("returns undefined for unknown formula", () => {
    const stat = getValidationStat("UNKNOWN");
    expect(stat).toBeUndefined();
  });
});
