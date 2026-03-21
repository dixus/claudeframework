import { describe, it, expect, beforeEach } from "vitest";
import { useAssessmentStore } from "./assessmentStore";
import { getFollowUpQuestions } from "../lib/scoring/question-tiers";
import { computeResult } from "../lib/scoring/engine";

beforeEach(() => {
  useAssessmentStore.getState().reset();
});

// Test 1: Initial state
describe("initial state", () => {
  it("has step=0, empty companyName, 8 zeros per dimension, result=null", () => {
    const state = useAssessmentStore.getState();
    expect(state.step).toBe(0);
    expect(state.companyName).toBe("");
    expect(state.result).toBeNull();
    const keys = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    for (const key of keys) {
      expect(state.responses[key]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    }
  });
});

// Test 2: setCompanyName
describe("setCompanyName", () => {
  it("updates companyName without changing other state", () => {
    const { setCompanyName } = useAssessmentStore.getState();
    setCompanyName("Acme Corp");
    const state = useAssessmentStore.getState();
    expect(state.companyName).toBe("Acme Corp");
    expect(state.step).toBe(0);
    expect(state.result).toBeNull();
  });
});

// Test 3: setAnswer updates the correct cell
describe("setAnswer", () => {
  it("updates the correct cell and leaves other dimensions unchanged", () => {
    const { setAnswer } = useAssessmentStore.getState();
    setAnswer("workflow", 3, 4);
    const state = useAssessmentStore.getState();
    expect(state.responses.workflow[3]).toBe(4);
    expect(state.responses.workflow[0]).toBe(0);
    expect(state.responses.strategy).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(state.responses.data).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

// Test 4: setAnswer immutability — array reference changes
describe("setAnswer immutability", () => {
  it("creates a new array reference for the updated dimension", () => {
    const before = useAssessmentStore.getState().responses.strategy;
    useAssessmentStore.getState().setAnswer("strategy", 0, 3);
    const after = useAssessmentStore.getState().responses.strategy;
    expect(after).not.toBe(before);
    expect(after[0]).toBe(3);
  });
});

// Test 5: nextStep
describe("nextStep", () => {
  it("increments step", () => {
    useAssessmentStore.getState().nextStep();
    expect(useAssessmentStore.getState().step).toBe(1);
  });

  it("clamps at 5", () => {
    useAssessmentStore.setState({ step: 5 });
    useAssessmentStore.getState().nextStep();
    expect(useAssessmentStore.getState().step).toBe(5);
  });
});

// Test 6: prevStep
describe("prevStep", () => {
  it("decrements step", () => {
    useAssessmentStore.setState({ step: 3 });
    useAssessmentStore.getState().prevStep();
    expect(useAssessmentStore.getState().step).toBe(2);
  });

  it("clamps at 0", () => {
    useAssessmentStore.getState().prevStep();
    expect(useAssessmentStore.getState().step).toBe(0);
  });
});

// Test 7: submit
describe("submit", () => {
  it("computes result, sets step=5, and result.companyName matches store", () => {
    useAssessmentStore.getState().setCompanyName("Test Corp");
    useAssessmentStore.getState().submit();
    const state = useAssessmentStore.getState();
    expect(state.step).toBe(5);
    expect(state.result).not.toBeNull();
    expect(state.result!.companyName).toBe("Test Corp");
    expect(typeof state.result!.thetaScore).toBe("number");
    expect(state.result!.dimensions).toHaveLength(6);
  });
});

// Test 8: reset
describe("reset", () => {
  it("restores initial state after submit", () => {
    useAssessmentStore.getState().setCompanyName("Acme");
    useAssessmentStore.getState().setAnswer("data", 2, 3);
    useAssessmentStore.getState().submit();
    useAssessmentStore.getState().reset();
    const state = useAssessmentStore.getState();
    expect(state.step).toBe(0);
    expect(state.companyName).toBe("");
    expect(state.result).toBeNull();
    expect(state.responses.data).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

// Test 9 (moved from assessment.test.tsx): Store — screening and adaptive levels
describe("Store — screening and adaptive levels", () => {
  it("screening stores answers at index 0 (test case 1)", () => {
    const store = useAssessmentStore.getState();
    store.setScreeningAnswer("strategy", 3);
    expect(useAssessmentStore.getState().responses.strategy[0]).toBe(3);
  });

  it("adaptive level — beginner when screening 0 (test case 2)", () => {
    const store = useAssessmentStore.getState();
    store.setScreeningAnswer("strategy", 0);
    store.computeAdaptiveLevels();
    const state = useAssessmentStore.getState();
    expect(state.adaptiveLevels?.strategy).toBe("beginner");
    const strategyQs = state.deepDiveQueue.filter(
      (q) => q.dimension === "strategy",
    );
    expect(strategyQs).toHaveLength(3);
    expect(strategyQs.map((q) => q.questionIndex)).toEqual([1, 2, 3]);
  });

  it("adaptive level — intermediate when screening 2 (test case 3)", () => {
    const store = useAssessmentStore.getState();
    store.setScreeningAnswer("strategy", 2);
    store.computeAdaptiveLevels();
    const state = useAssessmentStore.getState();
    expect(state.adaptiveLevels?.strategy).toBe("intermediate");
    const strategyQs = state.deepDiveQueue.filter(
      (q) => q.dimension === "strategy",
    );
    expect(strategyQs).toHaveLength(5);
    expect(strategyQs.map((q) => q.questionIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adaptive level — advanced when screening 4 (test case 4)", () => {
    const store = useAssessmentStore.getState();
    store.setScreeningAnswer("strategy", 4);
    store.computeAdaptiveLevels();
    const state = useAssessmentStore.getState();
    expect(state.adaptiveLevels?.strategy).toBe("advanced");
    const strategyQs = state.deepDiveQueue.filter(
      (q) => q.dimension === "strategy",
    );
    expect(strategyQs).toHaveLength(7);
    expect(strategyQs.map((q) => q.questionIndex)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("skipped questions remain 0 (test case 5)", () => {
    const store = useAssessmentStore.getState();
    const dims = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    for (const dim of dims) store.setScreeningAnswer(dim, 0);
    store.computeAdaptiveLevels();
    const state = useAssessmentStore.getState();
    expect(state.responses.strategy[6]).toBe(0);
    expect(state.responses.strategy[7]).toBe(0);
  });

  it("total question count — all beginner = 18 (test case 6)", () => {
    const store = useAssessmentStore.getState();
    const dims = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    for (const dim of dims) store.setScreeningAnswer(dim, 0);
    store.computeAdaptiveLevels();
    expect(useAssessmentStore.getState().deepDiveQueue).toHaveLength(18);
  });

  it("total question count — all advanced = 42 (test case 7)", () => {
    const store = useAssessmentStore.getState();
    const dims = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    for (const dim of dims) store.setScreeningAnswer(dim, 4);
    store.computeAdaptiveLevels();
    expect(useAssessmentStore.getState().deepDiveQueue).toHaveLength(42);
  });

  it("total question count — mixed (test case 8)", () => {
    const store = useAssessmentStore.getState();
    // 2 beginner + 2 intermediate + 2 advanced
    store.setScreeningAnswer("strategy", 0); // beginner → 3
    store.setScreeningAnswer("architecture", 1); // beginner → 3
    store.setScreeningAnswer("workflow", 2); // intermediate → 5
    store.setScreeningAnswer("data", 2); // intermediate → 5
    store.setScreeningAnswer("talent", 3); // advanced → 7
    store.setScreeningAnswer("adoption", 4); // advanced → 7
    store.computeAdaptiveLevels();
    expect(useAssessmentStore.getState().deepDiveQueue).toHaveLength(30);
  });

  it("back navigation recomputes queue (test case 11)", () => {
    const store = useAssessmentStore.getState();
    // Start with advanced for strategy
    store.setScreeningAnswer("strategy", 4);
    store.computeAdaptiveLevels();
    // Answer some deep-dive questions at indices 4-7
    store.setAnswer("strategy", 4, 3);
    store.setAnswer("strategy", 5, 2);
    store.setAnswer("strategy", 6, 1);
    store.setAnswer("strategy", 7, 1);
    // Now change screening answer to beginner
    store.setScreeningAnswer("strategy", 0);
    store.computeAdaptiveLevels();
    const state = useAssessmentStore.getState();
    const strategyQs = state.deepDiveQueue.filter(
      (q) => q.dimension === "strategy",
    );
    expect(strategyQs).toHaveLength(3);
    // Answers at indices 4-7 should be reset to 0
    expect(state.responses.strategy[4]).toBe(0);
    expect(state.responses.strategy[5]).toBe(0);
    expect(state.responses.strategy[6]).toBe(0);
    expect(state.responses.strategy[7]).toBe(0);
  });
});

// Test 10 (moved from assessment.test.tsx): getFollowUpQuestions pure function
describe("getFollowUpQuestions", () => {
  it("returns correct indices for beginner (test case 9)", () => {
    expect(getFollowUpQuestions("strategy", "beginner")).toEqual([1, 2, 3]);
  });

  it("returns correct indices for intermediate", () => {
    expect(getFollowUpQuestions("strategy", "intermediate")).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("returns correct indices for advanced", () => {
    expect(getFollowUpQuestions("strategy", "advanced")).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });
});

// Test 11 (moved from assessment.test.tsx): Scoring engine compatibility (test case 10)
describe("Scoring engine compatibility", () => {
  it("accepts adaptive flow responses with 0s for skipped", () => {
    const store = useAssessmentStore.getState();
    const dims = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    // Set all to beginner
    for (const dim of dims) {
      store.setScreeningAnswer(dim, 1);
      store.setAnswer(dim, 1, 2);
      store.setAnswer(dim, 2, 3);
      store.setAnswer(dim, 3, 1);
    }
    const state = useAssessmentStore.getState();
    const result = computeResult({
      companyName: "Test Corp",
      responses: state.responses,
    });
    expect(result).toBeDefined();
    expect(result.companyName).toBe("Test Corp");
    expect(result.dimensions).toHaveLength(6);
    expect(typeof result.thetaScore).toBe("number");
  });
});

// Test 12 (moved from assessment.test.tsx): advanceScreening transitions to deep-dive after 6 questions
describe("advanceScreening flow", () => {
  it("transitions to deep-dive after all 6 screening answers", () => {
    const store = useAssessmentStore.getState();
    const dims = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ] as const;
    // Answer all screening questions
    for (const dim of dims) store.setScreeningAnswer(dim, 2);
    // Set step to 2 and phase to screening
    useAssessmentStore.setState({
      step: 2,
      phase: "screening",
      screeningIndex: 0,
    });
    // Advance through all 6
    for (let i = 0; i < 6; i++) {
      useAssessmentStore.getState().advanceScreening();
    }
    const state = useAssessmentStore.getState();
    expect(state.step).toBe(3);
    expect(state.phase).toBe("deepdive");
    expect(state.adaptiveLevels).not.toBeNull();
    expect(state.deepDiveQueue.length).toBeGreaterThan(0);
  });
});
