import { describe, it, expect } from "vitest";
import {
  computeProgressDelta,
  computeProgressSummary,
  getProgressInsight,
} from "./progress-tracking";
import type {
  AssessmentResult,
  DimensionKey,
  TimestampedResult,
} from "./types";

function makeResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  const defaults: AssessmentResult = {
    companyName: "Test Co",
    thetaScore: 50,
    rawLevel: 2,
    level: { level: 2, label: "Level 2", monthsTo100M: 36, arrPerEmployee: "100k" },
    gated: false,
    gatingDetails: [],
    bottleneck: { dimension: "strategy", score: 50, gap: 10, actions: [] },
    dimensions: [
      { key: "strategy", label: "Strategy", weight: 1, score: 50 },
      { key: "architecture", label: "Architecture", weight: 1, score: 50 },
      { key: "workflow", label: "Workflow", weight: 1, score: 50 },
      { key: "data", label: "Data", weight: 1, score: 50 },
      { key: "talent", label: "Talent", weight: 1, score: 50 },
      { key: "adoption", label: "Adoption", weight: 1, score: 50 },
    ],
  };
  return { ...defaults, ...overrides };
}

function makeTimestamped(
  createdAt: string,
  overrides: Partial<AssessmentResult> = {},
): TimestampedResult {
  return { result: makeResult(overrides), createdAt };
}

describe("computeProgressDelta", () => {
  it("TC1: returns positive thetaDelta when current > previous", () => {
    const current = makeTimestamped("2026-03-30", { thetaScore: 80 });
    const previous = makeTimestamped("2026-03-01", { thetaScore: 60 });
    const delta = computeProgressDelta(current, previous);
    expect(delta.thetaDelta).toBe(20);
  });

  it("TC2: returns negative thetaDelta when current < previous", () => {
    const current = makeTimestamped("2026-03-30", { thetaScore: 50 });
    const previous = makeTimestamped("2026-03-01", { thetaScore: 70 });
    const delta = computeProgressDelta(current, previous);
    expect(delta.thetaDelta).toBe(-20);
  });

  it("TC3: returns levelChanged true with correct levels when levels differ", () => {
    const current = makeTimestamped("2026-03-30", {
      level: { level: 3, label: "Level 3", monthsTo100M: 24, arrPerEmployee: "150k" },
    });
    const previous = makeTimestamped("2026-03-01", {
      level: { level: 2, label: "Level 2", monthsTo100M: 36, arrPerEmployee: "100k" },
    });
    const delta = computeProgressDelta(current, previous);
    expect(delta.levelChanged).toBe(true);
    expect(delta.previousLevel).toBe(2);
    expect(delta.currentLevel).toBe(3);
  });

  it("TC4: returns levelChanged false when levels are the same", () => {
    const current = makeTimestamped("2026-03-30");
    const previous = makeTimestamped("2026-03-01");
    const delta = computeProgressDelta(current, previous);
    expect(delta.levelChanged).toBe(false);
  });

  it("TC5: computes dimension deltas correctly including negative", () => {
    const current = makeTimestamped("2026-03-30", {
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 1, score: 80 },
        { key: "architecture", label: "Architecture", weight: 1, score: 40 },
        { key: "workflow", label: "Workflow", weight: 1, score: 50 },
        { key: "data", label: "Data", weight: 1, score: 50 },
        { key: "talent", label: "Talent", weight: 1, score: 50 },
        { key: "adoption", label: "Adoption", weight: 1, score: 50 },
      ],
    });
    const previous = makeTimestamped("2026-03-01", {
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 1, score: 60 },
        { key: "architecture", label: "Architecture", weight: 1, score: 55 },
        { key: "workflow", label: "Workflow", weight: 1, score: 50 },
        { key: "data", label: "Data", weight: 1, score: 50 },
        { key: "talent", label: "Talent", weight: 1, score: 50 },
        { key: "adoption", label: "Adoption", weight: 1, score: 50 },
      ],
    });
    const delta = computeProgressDelta(current, previous);
    expect(delta.dimensionDeltas.strategy).toBe(20);
    expect(delta.dimensionDeltas.architecture).toBe(-15);
  });

  it("TC6: returns velocityDelta null when previous has no scalingVelocity", () => {
    const current = makeTimestamped("2026-03-30", {
      scalingVelocity: {
        s: 1.5,
        band: "linear",
        bandLabel: "Linear",
        components: { enabler: 1, capabilityProduct: 1, theta: 50 },
        scenarios: { current: 1.5, fixBottleneck: 2, fixAll: 3, addAI: 4 },
        bottleneckCapability: "c1_strategy",
      },
    });
    const previous = makeTimestamped("2026-03-01");
    const delta = computeProgressDelta(current, previous);
    expect(delta.velocityDelta).toBeNull();
  });
});

describe("computeProgressSummary", () => {
  it("TC7: returns trend improving when theta increases across 3 assessments", () => {
    const history = [
      makeTimestamped("2026-01-01", { thetaScore: 40 }),
      makeTimestamped("2026-02-01", { thetaScore: 50 }),
      makeTimestamped("2026-03-01", { thetaScore: 65 }),
    ];
    const summary = computeProgressSummary(history);
    expect(summary.trend).toBe("improving");
  });

  it("TC8: returns trend stable when theta changes less than 3 on average", () => {
    const history = [
      makeTimestamped("2026-01-01", { thetaScore: 50 }),
      makeTimestamped("2026-02-01", { thetaScore: 51 }),
      makeTimestamped("2026-03-01", { thetaScore: 52 }),
    ];
    const summary = computeProgressSummary(history);
    expect(summary.trend).toBe("stable");
  });

  it("TC9: returns fastestImproving as architecture when it improved most", () => {
    const history = [
      makeTimestamped("2026-01-01", {
        dimensions: [
          { key: "strategy", label: "Strategy", weight: 1, score: 50 },
          { key: "architecture", label: "Architecture", weight: 1, score: 30 },
          { key: "workflow", label: "Workflow", weight: 1, score: 50 },
          { key: "data", label: "Data", weight: 1, score: 50 },
          { key: "talent", label: "Talent", weight: 1, score: 50 },
          { key: "adoption", label: "Adoption", weight: 1, score: 50 },
        ],
      }),
      makeTimestamped("2026-02-01", {
        dimensions: [
          { key: "strategy", label: "Strategy", weight: 1, score: 55 },
          { key: "architecture", label: "Architecture", weight: 1, score: 60 },
          { key: "workflow", label: "Workflow", weight: 1, score: 52 },
          { key: "data", label: "Data", weight: 1, score: 50 },
          { key: "talent", label: "Talent", weight: 1, score: 50 },
          { key: "adoption", label: "Adoption", weight: 1, score: 50 },
        ],
      }),
      makeTimestamped("2026-03-01", {
        dimensions: [
          { key: "strategy", label: "Strategy", weight: 1, score: 55 },
          { key: "architecture", label: "Architecture", weight: 1, score: 70 },
          { key: "workflow", label: "Workflow", weight: 1, score: 52 },
          { key: "data", label: "Data", weight: 1, score: 50 },
          { key: "talent", label: "Talent", weight: 1, score: 50 },
          { key: "adoption", label: "Adoption", weight: 1, score: 50 },
        ],
      }),
    ];
    const summary = computeProgressSummary(history);
    expect(summary.fastestImproving?.dimension).toBe("architecture");
  });

  it("TC10: returns null for fastestImproving and mostRegressed with 1 assessment", () => {
    const history = [makeTimestamped("2026-01-01", { thetaScore: 50 })];
    const summary = computeProgressSummary(history);
    expect(summary.assessmentCount).toBe(1);
    expect(summary.fastestImproving).toBeNull();
    expect(summary.mostRegressed).toBeNull();
  });
});

describe("getProgressInsight", () => {
  it("TC11: returns string containing dimension name and delta for top improver", () => {
    const delta = computeProgressDelta(
      makeTimestamped("2026-03-30", {
        thetaScore: 58,
        dimensions: [
          { key: "strategy", label: "Strategy", weight: 1, score: 50 },
          { key: "architecture", label: "Architecture", weight: 1, score: 65 },
          { key: "workflow", label: "Workflow", weight: 1, score: 50 },
          { key: "data", label: "Data", weight: 1, score: 50 },
          { key: "talent", label: "Talent", weight: 1, score: 50 },
          { key: "adoption", label: "Adoption", weight: 1, score: 50 },
        ],
      }),
      makeTimestamped("2026-03-01", {
        thetaScore: 50,
        dimensions: [
          { key: "strategy", label: "Strategy", weight: 1, score: 50 },
          { key: "architecture", label: "Architecture", weight: 1, score: 50 },
          { key: "workflow", label: "Workflow", weight: 1, score: 50 },
          { key: "data", label: "Data", weight: 1, score: 50 },
          { key: "talent", label: "Talent", weight: 1, score: 50 },
          { key: "adoption", label: "Adoption", weight: 1, score: 50 },
        ],
      }),
    );
    const insight = getProgressInsight(delta);
    expect(insight).toContain("Architecture");
    expect(insight).toContain("+15");
  });
});
