import { describe, it, expect } from "vitest";
import { getRelevantCaseStudies, CASE_STUDIES } from "./case-studies";
import type { CapabilityResult } from "./types";

const makeCap = (key: string, score: number): CapabilityResult => ({
  key: key as CapabilityResult["key"],
  label: key,
  score,
});

describe("CASE_STUDIES data", () => {
  it("contains exactly 5 case studies", () => {
    expect(CASE_STUDIES).toHaveLength(5);
  });

  it("each case study has required fields", () => {
    for (const cs of CASE_STUDIES) {
      expect(cs.id).toBeTruthy();
      expect(cs.title).toBeTruthy();
      expect(cs.interventionModel).toBeTruthy();
      expect(cs.context.stage).toBeTruthy();
      expect(cs.context.industry).toBeTruthy();
      expect(cs.context.teamSize).toBeTruthy();
      expect(cs.context.challenge).toBeTruthy();
      expect(cs.before.sScore).toBeTruthy();
      expect(cs.after.sScore).toBeTruthy();
      expect(cs.duration).toBeTruthy();
      expect(cs.roi).toBeTruthy();
      expect(cs.keyActions.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("getRelevantCaseStudies", () => {
  it("C₂ bottleneck → returns Case 1 (Setup)", () => {
    const bottleneck = makeCap("c2_setup", 55);
    const result = getRelevantCaseStudies(bottleneck);
    expect(result[0].id).toBe("c2-setup-bottleneck");
  });

  it("Level 1 user → returns Case 3 (Level 1→2)", () => {
    const result = getRelevantCaseStudies(undefined, 1);
    expect(result.some((cs) => cs.id === "level-1-to-2")).toBe(true);
  });

  it("Series A funding → returns Case 2 (Stage A→B)", () => {
    const result = getRelevantCaseStudies(undefined, undefined, "series-a");
    expect(result.some((cs) => cs.id === "stage-a-to-b")).toBe(true);
  });

  it("No capability data → returns most common case (Case 1)", () => {
    const result = getRelevantCaseStudies();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c2-setup-bottleneck");
  });

  it("returns at most 2 case studies", () => {
    const bottleneck = makeCap("c2_setup", 55);
    const result = getRelevantCaseStudies(bottleneck, 1, "series-b");
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("always returns at least 1 case study", () => {
    const result = getRelevantCaseStudies(undefined, undefined, "pre-seed");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
