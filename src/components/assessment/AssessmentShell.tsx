"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { IntroStep } from "./IntroStep";
import { CompanyStep } from "./CompanyStep";
import { EnablerStep } from "./EnablerStep";
import { CapabilityStep } from "./CapabilityStep";
import { PhaseIntro } from "./PhaseIntro";
import { ScreeningPhase } from "./ScreeningPhase";
import { DeepDivePhase } from "./DeepDivePhase";
import { ReviewStep } from "./ReviewStep";
import { ResultsPage } from "@/components/results/ResultsPage";

// Steps: 0=Intro, 1=Company, 2=Enablers, 3=Capabilities, 4=Screening, 5=DeepDive, 6=Review, 7=Results

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
    useAssessmentStore.setState({
      phase: "screening",
      step: 4,
      screeningIndex: 5,
    });
  }

  let content: React.ReactNode;

  if (step === 0) {
    content = <IntroStep />;
  } else if (step === 1) {
    content = <CompanyStep />;
  } else if (step === 2) {
    content = <EnablerStep />;
  } else if (step === 3) {
    content = <CapabilityStep />;
  } else if (step === 4 && phase === "screening-intro") {
    content = (
      <PhaseIntro
        phase="screening"
        onContinue={startScreening}
        onBack={prevStep}
      />
    );
  } else if (step === 4 && phase === "screening") {
    content = <ScreeningPhase />;
  } else if (step === 5 && phase === "deepdive-intro") {
    content = (
      <PhaseIntro
        phase="deepdive"
        onContinue={startDeepDive}
        onBack={backFromDeepDiveIntro}
        deepDiveCount={deepDiveQueue.length}
      />
    );
  } else if (step === 5 && phase === "deepdive") {
    content = <DeepDivePhase />;
  } else if (step === 6) {
    content = <ReviewStep />;
  } else if (step === 7) {
    content = <ResultsPage />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl p-8">
      {content}
    </div>
  );
}
