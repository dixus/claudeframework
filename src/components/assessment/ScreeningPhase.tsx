"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { QUESTIONS } from "@/lib/scoring/questions";
import type { DimensionKey } from "@/lib/scoring/types";
import { WizardQuestion } from "./WizardQuestion";
import { ProgressBar } from "./ProgressBar";

const DIMENSION_ORDER: Array<{ key: DimensionKey; label: string }> = [
  { key: "strategy", label: "Strategy" },
  { key: "architecture", label: "Architecture" },
  { key: "workflow", label: "Workflow" },
  { key: "data", label: "Data" },
  { key: "talent", label: "Talent" },
  { key: "adoption", label: "Adoption" },
];

export function ScreeningPhase() {
  const screeningIndex = useAssessmentStore((s) => s.screeningIndex);
  const responses = useAssessmentStore((s) => s.responses);
  const answeredQuestions = useAssessmentStore((s) => s.answeredQuestions);
  const setScreeningAnswer = useAssessmentStore((s) => s.setScreeningAnswer);
  const advanceScreening = useAssessmentStore((s) => s.advanceScreening);
  const goBackScreening = useAssessmentStore((s) => s.goBackScreening);

  const current = DIMENSION_ORDER[screeningIndex];
  const questionText = QUESTIONS[current.key][0];
  const currentValue = responses[current.key][0];
  const isAnswered = answeredQuestions.has(`${current.key}:0`);
  const progress = screeningIndex / 6;

  return (
    <div className="space-y-5">
      <ProgressBar progress={progress} />
      <WizardQuestion
        questionText={questionText}
        dimensionLabel={current.label}
        value={isAnswered ? currentValue : null}
        onAnswer={(value) => setScreeningAnswer(current.key, value)}
        onBack={goBackScreening}
        onForward={advanceScreening}
        showBack={true}
      />
    </div>
  );
}
