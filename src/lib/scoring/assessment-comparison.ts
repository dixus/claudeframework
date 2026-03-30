import type {
  AssessmentComparison,
  AssessmentResult,
  DimensionKey,
} from "./types";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

export function computeAssessmentComparison(
  a: AssessmentResult,
  b: AssessmentResult,
): AssessmentComparison {
  const thetaDelta = b.thetaScore - a.thetaScore;

  const dimensions = b.dimensions.map((bDim) => {
    const aDim = a.dimensions.find((d) => d.key === bDim.key);
    const scoreBefore = aDim ? aDim.score : 0;
    return {
      key: bDim.key,
      label: DIMENSION_LABELS[bDim.key],
      scoreBefore,
      scoreAfter: bDim.score,
      delta: bDim.score - scoreBefore,
    };
  });

  let mostImproved: { dimension: DimensionKey; delta: number } | null = null;
  let mostRegressed: { dimension: DimensionKey; delta: number } | null = null;

  for (const dim of dimensions) {
    if (dim.delta > 0) {
      if (!mostImproved || dim.delta > mostImproved.delta) {
        mostImproved = { dimension: dim.key, delta: dim.delta };
      }
    }
    if (dim.delta < 0) {
      if (!mostRegressed || dim.delta < mostRegressed.delta) {
        mostRegressed = { dimension: dim.key, delta: dim.delta };
      }
    }
  }

  let capabilities: AssessmentComparison["capabilities"] = null;
  if (a.capabilities && b.capabilities) {
    capabilities = b.capabilities.map((bCap) => {
      const aCap = a.capabilities!.find((c) => c.key === bCap.key);
      const scoreBefore = aCap ? aCap.score : 0;
      return {
        key: bCap.key,
        label: bCap.label,
        scoreBefore,
        scoreAfter: bCap.score,
        delta: bCap.score - scoreBefore,
      };
    });
  }

  return {
    thetaBefore: a.thetaScore,
    thetaAfter: b.thetaScore,
    thetaDelta,
    levelBefore: a.level.level,
    levelAfter: b.level.level,
    levelChanged: a.level.level !== b.level.level,
    dimensions,
    mostImproved,
    mostRegressed,
    capabilities,
  };
}
