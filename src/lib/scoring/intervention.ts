import type { CapabilityResult } from "./types";

export type InterventionModelType = "bottleneck" | "stage" | "level";

export interface InterventionModel {
  type: InterventionModelType;
  label: string;
  duration: string;
  description: string;
  whenToUse: string[];
  expectedOutcome: string;
  sImprovement: string;
}

export const INTERVENTION_MODELS: Record<
  InterventionModelType,
  InterventionModel
> = {
  bottleneck: {
    type: "bottleneck",
    label: "Bottleneck Resolution",
    duration: "8\u201312 weeks",
    description: "Fix the weakest capability to unlock multiplicative scaling",
    whenToUse: [
      "Single capability significantly below others",
      "Capability gap > 20 points",
      "No stage transition needed",
    ],
    expectedOutcome: "3\u20135x S improvement",
    sImprovement: "3\u20135x",
  },
  stage: {
    type: "stage",
    label: "Stage Transition",
    duration: "90 days",
    description:
      "Systematic upgrade of all capabilities for the next growth stage",
    whenToUse: [
      "Company moving between funding stages (A\u2192B, B\u2192C)",
      "Multiple capabilities need upgrading",
      "Organizational structure needs change",
    ],
    expectedOutcome: "2\u20133x S improvement + stage-appropriate systems",
    sImprovement: "2\u20133x",
  },
  level: {
    type: "level",
    label: "Level Transition",
    duration: "6\u201324 months",
    description:
      "Transform AI maturity from tool usage to architectural integration",
    whenToUse: [
      "\u03B8_index near level boundary",
      "Company wants to move from AI-Powered to AI-Enabled (or higher)",
      "Requires deep AI integration",
    ],
    expectedOutcome: "Level upgrade + 1.5\u20132x scaling coefficient increase",
    sImprovement: "1.5\u20132x",
  },
};

const LEVEL_THRESHOLDS = [20, 50, 80, 100];

export function selectInterventionModel(
  thetaScore: number,
  capabilityBottleneck: CapabilityResult | undefined,
  capabilities: CapabilityResult[] | undefined,
  fundingStage: string | undefined,
  level: number,
): { model: InterventionModel; rationale: string } {
  if (!capabilityBottleneck || !capabilities) {
    return {
      model: INTERVENTION_MODELS.bottleneck,
      rationale:
        "Bottleneck Resolution recommended as default \u2014 the most common intervention model (36% of companies).",
    };
  }

  const avgScore =
    capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length;
  const bottleneckGap = avgScore - capabilityBottleneck.score;

  if (bottleneckGap > 20) {
    return {
      model: INTERVENTION_MODELS.bottleneck,
      rationale: `${capabilityBottleneck.label} has a ${Math.round(bottleneckGap)}-point gap below the capability average \u2014 resolving this bottleneck will unlock multiplicative scaling improvement.`,
    };
  }

  const transitionalStages = ["series-a", "series-b"];
  if (fundingStage && transitionalStages.includes(fundingStage)) {
    return {
      model: INTERVENTION_MODELS.stage,
      rationale: `Company is at ${fundingStage} stage \u2014 a systematic capability upgrade prepares for the next growth stage.`,
    };
  }

  const nextThreshold = LEVEL_THRESHOLDS[level];
  if (
    nextThreshold !== undefined &&
    nextThreshold - thetaScore <= 10 &&
    nextThreshold - thetaScore > 0
  ) {
    return {
      model: INTERVENTION_MODELS.level,
      rationale: `\u03B8_index is ${Math.round(nextThreshold - thetaScore)} points from the next level boundary \u2014 a focused level transition can unlock the next maturity tier.`,
    };
  }

  return {
    model: INTERVENTION_MODELS.bottleneck,
    rationale:
      "Bottleneck Resolution recommended as default \u2014 the most common intervention model (36% of companies).",
  };
}
