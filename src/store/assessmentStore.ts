import { create } from "zustand";
import type {
  DimensionKey,
  AssessmentResult,
  CapabilityKey,
  EnablerInput,
} from "../lib/scoring/types";
import { computeResult } from "../lib/scoring/engine";
import {
  determineAdaptiveLevel,
  getFollowUpQuestions,
} from "../lib/scoring/question-tiers";
import type { AdaptiveLevel } from "../lib/scoring/question-tiers";
import type { GrowthEngineType } from "../lib/scoring/growth-engines";

const DIMENSION_KEYS: DimensionKey[] = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

const CAPABILITY_KEYS: CapabilityKey[] = [
  "c1_strategy",
  "c2_setup",
  "c3_execution",
  "c4_operationalization",
];

const initialResponses = (): Record<DimensionKey, number[]> =>
  Object.fromEntries(
    DIMENSION_KEYS.map((k) => [k, Array(8).fill(0)]),
  ) as Record<DimensionKey, number[]>;

const initialCapabilityResponses = (): Record<CapabilityKey, number> =>
  Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, 0])) as Record<
    CapabilityKey,
    number
  >;

const initialEnablers = (): EnablerInput => ({
  fundingStage: "" as EnablerInput["fundingStage"],
  teamSize: 0,
  annualRevenue: 0,
});

// Steps: 0=Intro, 1=Company, 2=Enablers, 3=GrowthEngine, 4=Capabilities, 5=Screening, 6=DeepDive, 7=Review, 8=Results
const MAX_STEP = 8;

interface AssessmentState {
  step: number;
  companyName: string;
  responses: Record<DimensionKey, number[]>;
  enablers: EnablerInput;
  capabilityResponses: Record<CapabilityKey, number>;
  result: AssessmentResult | null;
  growthEngine: GrowthEngineType | null;
  phase: "screening-intro" | "screening" | "deepdive-intro" | "deepdive" | null;
  screeningIndex: number;
  deepDiveQueue: Array<{ dimension: DimensionKey; questionIndex: number }>;
  deepDivePosition: number;
  adaptiveLevels: Record<DimensionKey, AdaptiveLevel> | null;
  answeredQuestions: Set<string>;
}

interface AssessmentActions {
  setCompanyName: (name: string) => void;
  setAnswer: (dimension: DimensionKey, index: number, value: number) => void;
  setEnablers: (enablers: EnablerInput) => void;
  setGrowthEngine: (type: GrowthEngineType) => void;
  setCapabilityAnswer: (key: CapabilityKey, value: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  submit: () => void;
  reset: () => void;
  setScreeningAnswer: (dimension: DimensionKey, value: number) => void;
  advanceScreening: () => void;
  computeAdaptiveLevels: () => void;
  advanceDeepDive: () => void;
  goBackDeepDive: () => void;
  goBackScreening: () => void;
}

type AssessmentStore = AssessmentState & AssessmentActions;

function buildDeepDiveQueue(
  levels: Record<DimensionKey, AdaptiveLevel>,
): Array<{ dimension: DimensionKey; questionIndex: number }> {
  const queue: Array<{ dimension: DimensionKey; questionIndex: number }> = [];
  for (const dim of DIMENSION_KEYS) {
    const indices = getFollowUpQuestions(dim, levels[dim]);
    for (const idx of indices) {
      queue.push({ dimension: dim, questionIndex: idx });
    }
  }
  return queue;
}

export const useAssessmentStore = create<AssessmentStore>()((set) => ({
  step: 0,
  companyName: "",
  responses: initialResponses(),
  enablers: initialEnablers(),
  capabilityResponses: initialCapabilityResponses(),
  result: null,
  growthEngine: null,
  phase: null,
  screeningIndex: 0,
  deepDiveQueue: [],
  deepDivePosition: 0,
  adaptiveLevels: null,
  answeredQuestions: new Set<string>(),

  setCompanyName: (name) => set({ companyName: name }),

  setEnablers: (enablers) => set({ enablers }),

  setGrowthEngine: (type) => set({ growthEngine: type }),

  setCapabilityAnswer: (key, value) =>
    set((state) => ({
      capabilityResponses: { ...state.capabilityResponses, [key]: value },
    })),

  setAnswer: (dimension, index, value) =>
    set((state) => {
      const updated = [...state.responses[dimension]];
      updated[index] = value;
      const answeredQuestions = new Set(state.answeredQuestions);
      answeredQuestions.add(`${dimension}:${index}`);
      return {
        responses: { ...state.responses, [dimension]: updated },
        answeredQuestions,
      };
    }),

  nextStep: () =>
    set((state) => {
      const next = Math.min(MAX_STEP, state.step + 1);
      // Step 5 = screening phase
      if (next === 5) {
        return { step: next, phase: "screening-intro", screeningIndex: 0 };
      }
      return { step: next };
    }),

  prevStep: () =>
    set((state) => {
      if (state.step === 7) {
        // From Review, go back to last deep-dive question
        return {
          step: 6,
          phase: "deepdive",
          deepDivePosition: Math.max(0, state.deepDiveQueue.length - 1),
        };
      }
      if (state.step === 5) {
        // From screening intro, go back to Capabilities step
        return { step: 4, phase: null };
      }
      return { step: Math.max(0, state.step - 1) };
    }),

  submit: () =>
    set((state) => ({
      result: computeResult({
        companyName: state.companyName,
        responses: state.responses,
        enablers: state.enablers.fundingStage ? state.enablers : undefined,
        capabilityResponses: state.capabilityResponses,
        growthEngine: state.growthEngine ?? undefined,
      }),
      step: MAX_STEP,
    })),

  reset: () =>
    set({
      step: 0,
      companyName: "",
      responses: initialResponses(),
      enablers: initialEnablers(),
      capabilityResponses: initialCapabilityResponses(),
      result: null,
      growthEngine: null,
      phase: null,
      screeningIndex: 0,
      deepDiveQueue: [],
      deepDivePosition: 0,
      adaptiveLevels: null,
      answeredQuestions: new Set<string>(),
    }),

  setScreeningAnswer: (dimension, value) =>
    set((state) => {
      const updated = [...state.responses[dimension]];
      updated[0] = value;
      const answeredQuestions = new Set(state.answeredQuestions);
      answeredQuestions.add(`${dimension}:0`);
      return {
        responses: { ...state.responses, [dimension]: updated },
        answeredQuestions,
      };
    }),

  advanceScreening: () =>
    set((state) => {
      if (state.screeningIndex < 5) {
        return { screeningIndex: state.screeningIndex + 1 };
      }
      // All 6 screening questions answered — compute levels and show deep-dive intro
      const levels = {} as Record<DimensionKey, AdaptiveLevel>;
      for (const dim of DIMENSION_KEYS) {
        levels[dim] = determineAdaptiveLevel(state.responses[dim][0]);
      }
      const queue = buildDeepDiveQueue(levels);
      return {
        adaptiveLevels: levels,
        deepDiveQueue: queue,
        deepDivePosition: 0,
        phase: "deepdive-intro",
        step: 6,
      };
    }),

  computeAdaptiveLevels: () =>
    set((state) => {
      const levels = {} as Record<DimensionKey, AdaptiveLevel>;
      for (const dim of DIMENSION_KEYS) {
        levels[dim] = determineAdaptiveLevel(state.responses[dim][0]);
      }
      const queue = buildDeepDiveQueue(levels);
      const newResponses = { ...state.responses };
      for (const dim of DIMENSION_KEYS) {
        const followUps = getFollowUpQuestions(dim, levels[dim]);
        const updated = [...newResponses[dim]];
        for (let i = 1; i <= 7; i++) {
          if (!followUps.includes(i)) {
            updated[i] = 0;
          }
        }
        newResponses[dim] = updated;
      }
      const answeredQuestions = new Set(state.answeredQuestions);
      for (const dim of DIMENSION_KEYS) {
        const followUps = getFollowUpQuestions(dim, levels[dim]);
        for (let i = 1; i <= 7; i++) {
          if (!followUps.includes(i)) {
            answeredQuestions.delete(`${dim}:${i}`);
          }
        }
      }
      return {
        adaptiveLevels: levels,
        deepDiveQueue: queue,
        deepDivePosition: 0,
        responses: newResponses,
        answeredQuestions,
      };
    }),

  advanceDeepDive: () =>
    set((state) => {
      if (state.deepDivePosition < state.deepDiveQueue.length - 1) {
        return { deepDivePosition: state.deepDivePosition + 1 };
      }
      // All deep-dive questions answered — go to Review
      return { step: 7, phase: null };
    }),

  goBackDeepDive: () =>
    set((state) => {
      if (state.deepDivePosition > 0) {
        return { deepDivePosition: state.deepDivePosition - 1 };
      }
      return { phase: "deepdive-intro" };
    }),

  goBackScreening: () =>
    set((state) => {
      if (state.screeningIndex > 0) {
        return { screeningIndex: state.screeningIndex - 1 };
      }
      return { phase: "screening-intro" };
    }),
}));
