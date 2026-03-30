import type {
  DimensionKey,
  ProgressDelta,
  ProgressSummary,
  TimestampedResult,
} from "./types";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

export function computeProgressDelta(
  current: TimestampedResult,
  previous: TimestampedResult,
): ProgressDelta {
  const thetaDelta = current.result.thetaScore - previous.result.thetaScore;

  const dimensionDeltas = {} as Record<DimensionKey, number>;
  for (const dim of current.result.dimensions) {
    const prevDim = previous.result.dimensions.find((d) => d.key === dim.key);
    dimensionDeltas[dim.key] = dim.score - (prevDim ? prevDim.score : 0);
  }

  const levelChanged =
    current.result.level.level !== previous.result.level.level;

  const velocityDelta =
    current.result.scalingVelocity && previous.result.scalingVelocity
      ? current.result.scalingVelocity.s - previous.result.scalingVelocity.s
      : null;

  const currentDate = new Date(current.createdAt);
  const previousDate = new Date(previous.createdAt);
  const daysBetween = Math.round(
    (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    thetaDelta,
    dimensionDeltas,
    levelChanged,
    previousLevel: previous.result.level.level,
    currentLevel: current.result.level.level,
    velocityDelta,
    daysBetween,
  };
}

export function computeProgressSummary(
  history: TimestampedResult[],
): ProgressSummary {
  const assessmentCount = history.length;

  let trend: "improving" | "stable" | "declining" = "stable";
  let fastestImproving: { dimension: DimensionKey; delta: number } | null =
    null;
  let mostRegressed: { dimension: DimensionKey; delta: number } | null = null;
  let levelTransitions = 0;

  if (assessmentCount >= 2) {
    // Compute average theta change across consecutive pairs
    let totalThetaChange = 0;
    for (let i = 1; i < history.length; i++) {
      totalThetaChange +=
        history[i].result.thetaScore - history[i - 1].result.thetaScore;
      if (history[i].result.level.level !== history[i - 1].result.level.level) {
        levelTransitions++;
      }
    }
    const avgChange = totalThetaChange / (history.length - 1);

    if (Math.abs(avgChange) < 3) {
      trend = "stable";
    } else if (avgChange > 0) {
      trend = "improving";
    } else {
      trend = "declining";
    }

    // Compare first and last for dimension changes
    const first = history[0].result;
    const last = history[history.length - 1].result;

    let bestDelta = -Infinity;
    let worstDelta = Infinity;
    let bestDim: DimensionKey | null = null;
    let worstDim: DimensionKey | null = null;

    for (const dim of last.dimensions) {
      const firstDim = first.dimensions.find((d) => d.key === dim.key);
      const delta = dim.score - (firstDim ? firstDim.score : 0);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestDim = dim.key;
      }
      if (delta < worstDelta) {
        worstDelta = delta;
        worstDim = dim.key;
      }
    }

    if (bestDim !== null && bestDelta > 0) {
      fastestImproving = { dimension: bestDim, delta: bestDelta };
    }
    if (worstDim !== null && worstDelta < 0) {
      mostRegressed = { dimension: worstDim, delta: worstDelta };
    }
  }

  const timelinePoints = history.map((h) => {
    const dimensions = {} as Record<DimensionKey, number>;
    for (const dim of h.result.dimensions) {
      dimensions[dim.key] = dim.score;
    }
    return {
      date: h.createdAt,
      theta: h.result.thetaScore,
      level: h.result.level.level,
      dimensions,
    };
  });

  return {
    assessmentCount,
    trend,
    fastestImproving,
    mostRegressed,
    levelTransitions,
    timelinePoints,
  };
}

export function getProgressInsight(delta: ProgressDelta): string {
  // Check if all dimensions are flat (within +/-2)
  const allFlat = Object.values(delta.dimensionDeltas).every(
    (d) => Math.abs(d) <= 2,
  );

  if (allFlat) {
    return "Your scores are holding steady across all dimensions — consistent performance since your last assessment.";
  }

  // Find dimension with largest positive delta
  let bestDim: DimensionKey | null = null;
  let bestDelta = -Infinity;
  for (const [key, value] of Object.entries(delta.dimensionDeltas)) {
    if (value > bestDelta) {
      bestDelta = value;
      bestDim = key as DimensionKey;
    }
  }

  if (delta.thetaDelta < 0) {
    // Find dimension with largest negative delta for decline message
    let worstDim: DimensionKey | null = null;
    let worstDelta = Infinity;
    for (const [key, value] of Object.entries(delta.dimensionDeltas)) {
      if (value < worstDelta) {
        worstDelta = value;
        worstDim = key as DimensionKey;
      }
    }
    const dimLabel = worstDim ? DIMENSION_LABELS[worstDim] : "unknown";
    return `${dimLabel} declined the most (${worstDelta}) contributing to a ${delta.thetaDelta} point drop since your last assessment.`;
  }

  const dimLabel = bestDim ? DIMENSION_LABELS[bestDim] : "unknown";
  return `Strong improvement in ${dimLabel} (+${bestDelta}) drove your theta up ${delta.thetaDelta} points since last assessment.`;
}
