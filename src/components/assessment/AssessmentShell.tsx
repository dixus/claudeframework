"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { IntroStep } from "./IntroStep";
import { CompanyStep } from "./CompanyStep";
import { ScreeningPhase } from "./ScreeningPhase";
import { DeepDivePhase } from "./DeepDivePhase";
import { ReviewStep } from "./ReviewStep";
import { ResultsPage } from "@/components/results/ResultsPage";

export function AssessmentShell() {
  const step = useAssessmentStore((s) => s.step);

  const stepComponents: Record<number, React.ReactNode> = {
    0: <IntroStep />,
    1: <CompanyStep />,
    2: <ScreeningPhase />,
    3: <DeepDivePhase />,
    4: <ReviewStep />,
    5: <ResultsPage />,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl p-8">
      {stepComponents[step]}
    </div>
  );
}
