"use client";

import { useMemo } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";
import { QUESTIONS } from "@/lib/scoring/questions";
import type { DimensionKey } from "@/lib/scoring/types";
import { WizardQuestion } from "./WizardQuestion";
import { ProgressBar } from "./ProgressBar";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

export function DeepDivePhase() {
  const deepDiveQueue = useAssessmentStore((s) => s.deepDiveQueue);
  const deepDivePosition = useAssessmentStore((s) => s.deepDivePosition);
  const responses = useAssessmentStore((s) => s.responses);
  const answeredQuestions = useAssessmentStore((s) => s.answeredQuestions);
  const setAnswer = useAssessmentStore((s) => s.setAnswer);
  const advanceDeepDive = useAssessmentStore((s) => s.advanceDeepDive);
  const goBackDeepDive = useAssessmentStore((s) => s.goBackDeepDive);

  const current = deepDiveQueue[deepDivePosition];

  // Calculate which dimensions are fully completed (all their deep-dive questions answered)
  const completedDimensions = useMemo(() => {
    const completed = new Set<DimensionKey>();
    if (deepDiveQueue.length === 0) return completed;

    // Find the last queue index for each dimension
    const lastIndex: Partial<Record<DimensionKey, number>> = {};
    for (let i = 0; i < deepDiveQueue.length; i++) {
      lastIndex[deepDiveQueue[i].dimension] = i;
    }

    // A dimension is completed if its last question is before current position
    for (const dim of Object.keys(lastIndex) as DimensionKey[]) {
      if (lastIndex[dim]! < deepDivePosition) {
        completed.add(dim);
      }
    }
    return completed;
  }, [deepDiveQueue, deepDivePosition]);

  if (!current) return null;

  const questionText = QUESTIONS[current.dimension][current.questionIndex];
  const currentValue = responses[current.dimension][current.questionIndex];
  const isAnswered = answeredQuestions.has(
    `${current.dimension}:${current.questionIndex}`,
  );

  // Global progress: 6 screening + deepDivePosition out of 6 screening + total deep-dive
  const totalQuestions = 6 + deepDiveQueue.length;
  const answeredSoFar = 6 + deepDivePosition;
  const progress = answeredSoFar / totalQuestions;

  return (
    <div className="space-y-5">
      <ProgressBar
        activeDimension={current.dimension}
        completedDimensions={completedDimensions}
        progress={progress}
      />
      <WizardQuestion
        questionText={questionText}
        dimensionLabel={DIMENSION_LABELS[current.dimension]}
        value={isAnswered ? currentValue : null}
        onAnswer={(value) =>
          setAnswer(current.dimension, current.questionIndex, value)
        }
        onBack={goBackDeepDive}
        onForward={advanceDeepDive}
        showBack={true}
      />
    </div>
  );
}
