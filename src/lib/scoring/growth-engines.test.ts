import { describe, it, expect } from "vitest";
import {
  classifyGrowthEngine,
  GROWTH_ENGINES,
  GROWTH_ENGINE_QUESTIONS,
} from "./growth-engines";
import type { GrowthEngineAnswers } from "./growth-engines";

describe("classifyGrowthEngine", () => {
  it("classifies as PLG when all answers point to PLG", () => {
    const answers: GrowthEngineAnswers = {
      acquisition: "plg",
      revenue: "plg",
      discovery: "plg",
    };
    expect(classifyGrowthEngine(answers)).toBe("plg");
  });

  it("classifies as SLG when all answers point to SLG", () => {
    const answers: GrowthEngineAnswers = {
      acquisition: "slg",
      revenue: "slg",
      discovery: "slg",
    };
    expect(classifyGrowthEngine(answers)).toBe("slg");
  });

  it("classifies as CLG when all answers point to CLG", () => {
    const answers: GrowthEngineAnswers = {
      acquisition: "clg",
      revenue: "clg",
      discovery: "clg",
    };
    expect(classifyGrowthEngine(answers)).toBe("clg");
  });

  it("classifies as hybrid when answers are evenly split", () => {
    const answers: GrowthEngineAnswers = {
      acquisition: "plg",
      revenue: "slg",
      discovery: "clg",
    };
    expect(classifyGrowthEngine(answers)).toBe("hybrid");
  });

  it("classifies dominant engine with 2-1 split", () => {
    const answers: GrowthEngineAnswers = {
      acquisition: "plg",
      revenue: "plg",
      discovery: "slg",
    };
    expect(classifyGrowthEngine(answers)).toBe("plg");
  });

  it("returns hybrid for empty answers", () => {
    expect(classifyGrowthEngine({})).toBe("hybrid");
  });
});

describe("GROWTH_ENGINES data", () => {
  it("has all four engine types", () => {
    expect(Object.keys(GROWTH_ENGINES)).toEqual([
      "plg",
      "slg",
      "clg",
      "hybrid",
    ]);
  });

  it("each engine has required fields", () => {
    for (const engine of Object.values(GROWTH_ENGINES)) {
      expect(engine.label).toBeTruthy();
      expect(engine.shortLabel).toBeTruthy();
      expect(engine.description).toBeTruthy();
      expect(engine.keyMetrics.length).toBeGreaterThanOrEqual(3);
      expect(engine.priorityDimensions.length).toBeGreaterThanOrEqual(2);
      expect(engine.scalingAdvantage).toBeTruthy();
      expect(engine.aiLeverage).toBeTruthy();
      expect(engine.examples.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("GROWTH_ENGINE_QUESTIONS", () => {
  it("has 3 questions", () => {
    expect(GROWTH_ENGINE_QUESTIONS).toHaveLength(3);
  });

  it("each question has 3 options covering plg/slg/clg", () => {
    for (const q of GROWTH_ENGINE_QUESTIONS) {
      expect(q.options).toHaveLength(3);
      const engines = q.options.map((o) => o.engine).sort();
      expect(engines).toEqual(["clg", "plg", "slg"]);
    }
  });
});
