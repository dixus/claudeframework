import { describe, it, expect } from "vitest";
import { computeAssessmentComparison } from "./assessment-comparison";
import type { AssessmentResult } from "./types";

function makeResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    companyName: "Test Co",
    dimensions: [
      { key: "strategy", label: "Strategy", weight: 0.25, score: 50 },
      { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
      { key: "workflow", label: "Workflow", weight: 0.15, score: 50 },
      { key: "data", label: "Data", weight: 0.15, score: 50 },
      { key: "talent", label: "Talent", weight: 0.15, score: 50 },
      { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
    ],
    thetaScore: 50,
    rawLevel: 1,
    level: { level: 1, label: "AI-Powered", monthsTo100M: 48, arrPerEmployee: "€200–600K" },
    gated: false,
    gatingDetails: [],
    bottleneck: {
      dimension: "adoption",
      score: 50,
      gap: 20,
      actions: [],
    },
    ...overrides,
  };
}

describe("computeAssessmentComparison", () => {
  // TC1: higher "after" theta returns positive thetaDelta
  it("returns positive thetaDelta when after theta is higher", () => {
    const before = makeResult({ thetaScore: 40 });
    const after = makeResult({ thetaScore: 65 });
    const result = computeAssessmentComparison(before, after);
    expect(result.thetaDelta).toBe(25);
    expect(result.thetaBefore).toBe(40);
    expect(result.thetaAfter).toBe(65);
  });

  // TC2: lower "after" theta returns negative thetaDelta
  it("returns negative thetaDelta when after theta is lower", () => {
    const before = makeResult({ thetaScore: 70 });
    const after = makeResult({ thetaScore: 55 });
    const result = computeAssessmentComparison(before, after);
    expect(result.thetaDelta).toBe(-15);
  });

  // TC3: level change returns levelChanged: true and correct levels
  it("returns levelChanged true with correct before/after levels", () => {
    const before = makeResult({
      level: { level: 1, label: "AI-Powered", monthsTo100M: 48, arrPerEmployee: "€200–600K" },
    });
    const after = makeResult({
      level: { level: 2, label: "AI-Enabled", monthsTo100M: 30, arrPerEmployee: "€400K–2M" },
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.levelChanged).toBe(true);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2);
  });

  // TC4: returns 6 dimension entries with correct deltas
  it("returns 6 dimension entries with correct deltas", () => {
    const before = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 40 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 60 },
        { key: "data", label: "Data", weight: 0.15, score: 30 },
        { key: "talent", label: "Talent", weight: 0.15, score: 45 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 55 },
      ],
    });
    const after = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 60 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 55 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 50 },
        { key: "data", label: "Data", weight: 0.15, score: 40 },
        { key: "talent", label: "Talent", weight: 0.15, score: 45 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 70 },
      ],
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.dimensions).toHaveLength(6);
    expect(result.dimensions[0]).toEqual({
      key: "strategy",
      label: "Strategy",
      scoreBefore: 40,
      scoreAfter: 60,
      delta: 20,
    });
    expect(result.dimensions[2]).toEqual({
      key: "workflow",
      label: "Workflow",
      scoreBefore: 60,
      scoreAfter: 50,
      delta: -10,
    });
    expect(result.dimensions[4]).toEqual({
      key: "talent",
      label: "Talent",
      scoreBefore: 45,
      scoreAfter: 45,
      delta: 0,
    });
  });

  // TC5: identifies correct mostImproved dimension
  it("identifies the most improved dimension", () => {
    const before = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 30 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 50 },
        { key: "data", label: "Data", weight: 0.15, score: 50 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const after = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 80 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 55 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 52 },
        { key: "data", label: "Data", weight: 0.15, score: 50 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.mostImproved).toEqual({ dimension: "strategy", delta: 50 });
  });

  // TC6: identifies correct mostRegressed dimension
  it("identifies the most regressed dimension", () => {
    const before = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 50 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 80 },
        { key: "data", label: "Data", weight: 0.15, score: 70 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const after = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 50 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 55 },
        { key: "data", label: "Data", weight: 0.15, score: 50 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.mostRegressed).toEqual({ dimension: "workflow", delta: -25 });
  });

  // TC7: no regressed dimensions returns mostRegressed null
  it("returns mostRegressed null when no dimensions regressed", () => {
    const before = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 50 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 50 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 50 },
        { key: "data", label: "Data", weight: 0.15, score: 50 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const after = makeResult({
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 60 },
        { key: "architecture", label: "Architecture", weight: 0.2, score: 55 },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 50 },
        { key: "data", label: "Data", weight: 0.15, score: 55 },
        { key: "talent", label: "Talent", weight: 0.15, score: 60 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50 },
      ],
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.mostRegressed).toBeNull();
  });

  // TC8: both assessments lack capabilities returns capabilities null
  it("returns capabilities null when both assessments lack capabilities", () => {
    const before = makeResult();
    const after = makeResult();
    const result = computeAssessmentComparison(before, after);
    expect(result.capabilities).toBeNull();
  });

  // TC9: both have capabilities returns 4 capability entries with deltas
  it("returns 4 capability entries with deltas when both have capabilities", () => {
    const before = makeResult({
      capabilities: [
        { key: "c1_strategy", label: "C₁ Strategy", score: 50 },
        { key: "c2_setup", label: "C₂ Setup", score: 60 },
        { key: "c3_execution", label: "C₃ Execution", score: 40 },
        { key: "c4_operationalization", label: "C₄ Operationalization", score: 70 },
      ],
    });
    const after = makeResult({
      capabilities: [
        { key: "c1_strategy", label: "C₁ Strategy", score: 65 },
        { key: "c2_setup", label: "C₂ Setup", score: 55 },
        { key: "c3_execution", label: "C₃ Execution", score: 60 },
        { key: "c4_operationalization", label: "C₄ Operationalization", score: 70 },
      ],
    });
    const result = computeAssessmentComparison(before, after);
    expect(result.capabilities).not.toBeNull();
    expect(result.capabilities).toHaveLength(4);
    expect(result.capabilities![0]).toEqual({
      key: "c1_strategy",
      label: "C₁ Strategy",
      scoreBefore: 50,
      scoreAfter: 65,
      delta: 15,
    });
    expect(result.capabilities![1]).toEqual({
      key: "c2_setup",
      label: "C₂ Setup",
      scoreBefore: 60,
      scoreAfter: 55,
      delta: -5,
    });
    expect(result.capabilities![3]).toEqual({
      key: "c4_operationalization",
      label: "C₄ Operationalization",
      scoreBefore: 70,
      scoreAfter: 70,
      delta: 0,
    });
  });
});
