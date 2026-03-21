import { describe, it, expect } from "vitest";
import { getRoadmapForStage, STAGE_ROADMAPS } from "./roadmaps";
import { computeResult } from "./engine";
import type { AssessmentInput, DimensionKey, FundingStage } from "./types";

const KEYS: DimensionKey[] = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

describe("getRoadmapForStage", () => {
  it("returns null for empty string", () => {
    expect(getRoadmapForStage("" as FundingStage)).toBeNull();
  });

  it("maps pre-seed to Series A", () => {
    const roadmap = getRoadmapForStage("pre-seed");
    expect(roadmap).not.toBeNull();
    expect(roadmap!.stage).toBe("Series A");
    expect(roadmap!.tagline).toBe("Find the Engine");
  });

  it("maps seed to Series A", () => {
    const roadmap = getRoadmapForStage("seed");
    expect(roadmap!.stage).toBe("Series A");
  });

  it("maps series-a to Series B", () => {
    const roadmap = getRoadmapForStage("series-a");
    expect(roadmap!.stage).toBe("Series B");
    expect(roadmap!.tagline).toBe("Build the System");
  });

  it("maps series-b to Series B", () => {
    const roadmap = getRoadmapForStage("series-b");
    expect(roadmap!.stage).toBe("Series B");
  });

  it("maps series-c to Series C/Growth", () => {
    const roadmap = getRoadmapForStage("series-c");
    expect(roadmap!.stage).toBe("Series C/Growth");
    expect(roadmap!.tagline).toBe("Optimize the Machine");
  });

  it("maps growth to Series C/Growth", () => {
    const roadmap = getRoadmapForStage("growth");
    expect(roadmap!.stage).toBe("Series C/Growth");
  });
});

describe("STAGE_ROADMAPS data integrity", () => {
  it("has exactly 3 entries", () => {
    expect(STAGE_ROADMAPS).toHaveLength(3);
  });

  it("all capability efforts sum to 100 per stage", () => {
    for (const roadmap of STAGE_ROADMAPS) {
      const totalEffort = roadmap.capabilityFocus.reduce(
        (sum, c) => sum + c.effort,
        0,
      );
      expect(totalEffort).toBe(100);
    }
  });
});

describe("engine attaches roadmap", () => {
  it("attaches roadmap when enablers include a valid funding stage", () => {
    const input: AssessmentInput = {
      companyName: "Test Co",
      responses: Object.fromEntries(
        KEYS.map((k) => [k, [3, 3, 3, 3, 3, 3, 3, 3]]),
      ) as Record<DimensionKey, number[]>,
      capabilityResponses: {
        c1_strategy: 3,
        c2_setup: 3,
        c3_execution: 3,
        c4_operationalization: 3,
      },
      enablers: {
        fundingStage: "series-b",
        teamSize: 50,
        annualRevenue: 5000,
      },
    };
    const result = computeResult(input);
    expect(result.roadmap).toBeDefined();
    expect(result.roadmap!.stage).toBe("Series B");
    expect(result.roadmap!.tagline).toBe("Build the System");
  });

  it("does not attach roadmap when funding stage is empty", () => {
    const input: AssessmentInput = {
      companyName: "Test Co",
      responses: Object.fromEntries(
        KEYS.map((k) => [k, [3, 3, 3, 3, 3, 3, 3, 3]]),
      ) as Record<DimensionKey, number[]>,
      capabilityResponses: {
        c1_strategy: 3,
        c2_setup: 3,
        c3_execution: 3,
        c4_operationalization: 3,
      },
      enablers: {
        fundingStage: "" as FundingStage,
        teamSize: 50,
        annualRevenue: 5000,
      },
    };
    const result = computeResult(input);
    expect(result.roadmap).toBeUndefined();
  });
});
