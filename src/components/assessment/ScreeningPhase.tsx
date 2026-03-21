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

  // During screening, we estimate ~24 total questions (6 screening + ~18 deep-dive average)
  // This gives a smooth global progress that doesn't jump
  const estimatedTotal = 24;
  const progress = screeningIndex / estimatedTotal;

  const completedDimensions = new Set<DimensionKey>();
  for (let i = 0; i < screeningIndex; i++) {
    // During screening, no dimension is "fully completed" yet — they only have screening done
    // We don't mark them as completed until deep-dive is done for that dimension
  }

  return (
    <div className="space-y-5">
      <ProgressBar
        activeDimension={current.key}
        completedDimensions={completedDimensions}
        progress={progress}
      />
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
