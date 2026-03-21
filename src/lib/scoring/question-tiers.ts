import type { DimensionKey } from "./types";

export type AdaptiveLevel = "beginner" | "intermediate" | "advanced";
export type QuestionTier = "foundational" | "intermediate" | "advanced";

export const SCREENING_INDICES: Record<DimensionKey, number> = {
  strategy: 0,
  architecture: 0,
  workflow: 0,
  data: 0,
  talent: 0,
  adoption: 0,
};

export const QUESTION_TIERS: Record<DimensionKey, QuestionTier[]> = {
  strategy: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
  architecture: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
  workflow: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
  data: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
  talent: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
  adoption: [
    "foundational",
    "foundational",
    "foundational",
    "intermediate",
    "intermediate",
    "advanced",
    "advanced",
  ],
};

export function determineAdaptiveLevel(screeningScore: number): AdaptiveLevel {
  if (screeningScore <= 1) return "beginner";
  if (screeningScore === 2) return "intermediate";
  return "advanced";
}

export function getFollowUpQuestions(
  dimension: DimensionKey,
  level: AdaptiveLevel,
): number[] {
  const tiers = QUESTION_TIERS[dimension];
  const indices: number[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const questionIndex = i + 1; // indices 1-7 (skip screening at 0)
    const tier = tiers[i];
    if (level === "beginner" && tier === "foundational") {
      indices.push(questionIndex);
    } else if (
      level === "intermediate" &&
      (tier === "foundational" || tier === "intermediate")
    ) {
      indices.push(questionIndex);
    } else if (level === "advanced") {
      indices.push(questionIndex);
    }
  }
  return indices;
}
