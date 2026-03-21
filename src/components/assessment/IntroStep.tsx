"use client";

import { useAssessmentStore } from "@/store/assessmentStore";

export function IntroStep() {
  const nextStep = useAssessmentStore((s) => s.nextStep);

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Ready to Begin?</h1>
      <p className="text-gray-600 max-w-md mx-auto">
        The assessment takes about 5 minutes. You&apos;ll answer questions
        across six dimensions and receive a personalised maturity score with
        actionable recommendations.
      </p>
      <button
        onClick={nextStep}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Begin Assessment
      </button>
    </div>
  );
}
