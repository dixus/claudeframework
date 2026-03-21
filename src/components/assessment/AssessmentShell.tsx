"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { IntroStep } from "./IntroStep";
import { CompanyStep } from "./CompanyStep";
import { PhaseIntro } from "./PhaseIntro";
import { ScreeningPhase } from "./ScreeningPhase";
import { DeepDivePhase } from "./DeepDivePhase";
import { ReviewStep } from "./ReviewStep";
import { ResultsPage } from "@/components/results/ResultsPage";

export function AssessmentShell() {
  const step = useAssessmentStore((s) => s.step);
  const phase = useAssessmentStore((s) => s.phase);
  const deepDiveQueue = useAssessmentStore((s) => s.deepDiveQueue);
  const prevStep = useAssessmentStore((s) => s.prevStep);

  function startScreening() {
    useAssessmentStore.setState({ phase: "screening" });
  }

  function startDeepDive() {
    useAssessmentStore.setState({ phase: "deepdive" });
  }

  function backFromDeepDiveIntro() {
    // Go back to last screening question
    useAssessmentStore.setState({
      phase: "screening",
      step: 2,
      screeningIndex: 5,
    });
  }

  let content: React.ReactNode;

  if (step === 0) {
    content = <IntroStep />;
  } else if (step === 1) {
    content = <CompanyStep />;
  } else if (step === 2 && phase === "screening-intro") {
    content = (
      <PhaseIntro
        phase="screening"
        onContinue={startScreening}
        onBack={prevStep}
      />
    );
  } else if (step === 2 && phase === "screening") {
    content = <ScreeningPhase />;
  } else if (step === 3 && phase === "deepdive-intro") {
    content = (
      <PhaseIntro
        phase="deepdive"
        onContinue={startDeepDive}
        onBack={backFromDeepDiveIntro}
        deepDiveCount={deepDiveQueue.length}
      />
    );
  } else if (step === 3 && phase === "deepdive") {
    content = <DeepDivePhase />;
  } else if (step === 4) {
    content = <ReviewStep />;
  } else if (step === 5) {
    content = <ResultsPage />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl p-8">
      {content}
    </div>
  );
}
