"use client";

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
  if (!current) return null;

  const questionText = QUESTIONS[current.dimension][current.questionIndex];
  const currentValue = responses[current.dimension][current.questionIndex];
  const isAnswered = answeredQuestions.has(
    `${current.dimension}:${current.questionIndex}`,
  );
  const totalQuestions = 6 + deepDiveQueue.length;
  const progress = (6 + deepDivePosition) / totalQuestions;

  return (
    <div className="space-y-5">
      <ProgressBar progress={progress} />
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
