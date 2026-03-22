"use client";

import { useAssessmentStore } from "@/store/assessmentStore";

interface PhaseIntroProps {
  phase: "screening" | "deepdive";
  onContinue: () => void;
  onBack: () => void;
  deepDiveCount?: number;
}

export function PhaseIntro({
  phase,
  onContinue,
  onBack,
  deepDiveCount,
}: PhaseIntroProps) {
  if (phase === "screening") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-2xl">1</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Quick Scan</h2>
        <p className="text-gray-600 max-w-md">
          Answer <strong>6 quick questions</strong> — one per dimension — so we
          can calibrate the assessment to your level.
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {[
            "Strategy",
            "Architecture",
            "Workflow",
            "Data",
            "Talent",
            "Adoption",
          ].map((dim) => (
            <span
              key={dim}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {dim}
            </span>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Start Quick Scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-2xl">2</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Deep Dive</h2>
      <p className="text-gray-600 max-w-md">
        Based on your answers, we&apos;ve selected{" "}
        <strong>{deepDiveCount} follow-up questions</strong> tailored to your
        maturity level — dimension by dimension.
      </p>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Start Deep Dive
        </button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={() => useAssessmentStore.getState().randomizeDeepDive()}
          className="mt-4 px-4 py-2 text-xs border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400"
        >
          🎲 Randomize &amp; skip to results (dev only)
        </button>
      )}
    </div>
  );
}
