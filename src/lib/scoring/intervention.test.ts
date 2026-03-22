import { describe, it, expect } from "vitest";
import { selectInterventionModel, INTERVENTION_MODELS } from "./intervention";
import { computeResult } from "./engine";
import type { AssessmentInput, CapabilityResult } from "./types";

const makeCap = (key: string, score: number): CapabilityResult => ({
  key: key as CapabilityResult["key"],
  label: key,
  score,
});

describe("selectInterventionModel", () => {
  it("large capability gap → Bottleneck Resolution", () => {
    // Bottleneck at 30, others at 70 → gap = 70 - 30 = 40 > 20
    const bottleneck = makeCap("c3_execution", 30);
    const capabilities = [
      makeCap("c1_strategy", 70),
      makeCap("c2_setup", 70),
      makeCap("c3_execution", 30),
      makeCap("c4_operationalization", 70),
    ];
    const result = selectInterventionModel(
      50,
      bottleneck,
      capabilities,
      "seed",
      1,
    );
    expect(result.model.type).toBe("bottleneck");
    expect(result.rationale).toContain("gap");
  });

  it("transitional funding stage → Stage Transition", () => {
    // series-a with decent theta, no big bottleneck gap
    const bottleneck = makeCap("c3_execution", 60);
    const capabilities = [
      makeCap("c1_strategy", 65),
      makeCap("c2_setup", 70),
      makeCap("c3_execution", 60),
      makeCap("c4_operationalization", 65),
    ];
    const result = selectInterventionModel(
      55,
      bottleneck,
      capabilities,
      "series-a",
      1,
    );
    expect(result.model.type).toBe("stage");
    expect(result.rationale).toContain("stage");
  });

  it("θ near level boundary → Level Transition", () => {
    // θ = 45, level 1 → next boundary is 50 → within 10 points
    const bottleneck = makeCap("c2_setup", 55);
    const capabilities = [
      makeCap("c1_strategy", 60),
      makeCap("c2_setup", 55),
      makeCap("c3_execution", 60),
      makeCap("c4_operationalization", 58),
    ];
    const result = selectInterventionModel(
      45,
      bottleneck,
      capabilities,
      "seed",
      1,
    );
    expect(result.model.type).toBe("level");
    expect(result.rationale).toContain("level");
  });

  it("no capabilities → default to Bottleneck Resolution", () => {
    const result = selectInterventionModel(
      50,
      undefined,
      undefined,
      undefined,
      1,
    );
    expect(result.model.type).toBe("bottleneck");
    expect(result.rationale).toContain("default");
  });

  it("all models have required fields", () => {
    for (const model of Object.values(INTERVENTION_MODELS)) {
      expect(model.type).toBeDefined();
      expect(model.label).toBeDefined();
      expect(model.duration).toBeDefined();
      expect(model.description).toBeDefined();
      expect(model.whenToUse.length).toBeGreaterThanOrEqual(3);
      expect(model.expectedOutcome).toBeDefined();
      expect(model.sImprovement).toBeDefined();
    }
  });
});

describe("engine integration", () => {
  it("intervention model attached to result when capabilities provided", () => {
    const input: AssessmentInput = {
      companyName: "Test Co",
      responses: {
        strategy: [3, 3, 3, 3, 3, 3, 3, 3],
        architecture: [3, 3, 3, 3, 3, 3, 3, 3],
        workflow: [3, 3, 3, 3, 3, 3, 3, 3],
        data: [3, 3, 3, 3, 3, 3, 3, 3],
        talent: [3, 3, 3, 3, 3, 3, 3, 3],
        adoption: [3, 3, 3, 3, 3, 3, 3, 3],
      },
      capabilityResponses: {
        c1_strategy: 3,
        c2_setup: 3,
        c3_execution: 3,
        c4_operationalization: 1,
      },
    };
    const result = computeResult(input);
    expect(result.interventionModel).toBeDefined();
    expect(result.interventionModel!.model.type).toBeDefined();
    expect(result.interventionModel!.rationale).toBeDefined();
  });
});
