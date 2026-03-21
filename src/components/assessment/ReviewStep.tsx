"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { LIKERT_LABELS, QUESTIONS } from "@/lib/scoring/questions";
import type { DimensionKey } from "@/lib/scoring/types";

const DIMENSION_ORDER: Array<{ key: DimensionKey; label: string }> = [
  { key: "strategy", label: "Strategy" },
  { key: "architecture", label: "Architecture" },
  { key: "workflow", label: "Workflow" },
  { key: "data", label: "Data" },
  { key: "talent", label: "Talent" },
  { key: "adoption", label: "Adoption" },
];

export function ReviewStep() {
  const companyName = useAssessmentStore((s) => s.companyName);
  const responses = useAssessmentStore((s) => s.responses);
  const prevStep = useAssessmentStore((s) => s.prevStep);
  const submit = useAssessmentStore((s) => s.submit);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">Review your answers</h2>
      <p className="text-sm text-gray-500">
        Company:{" "}
        <span className="font-medium text-gray-900">{companyName}</span>
      </p>
      <div className="space-y-4">
        {DIMENSION_ORDER.map(({ key, label }) => {
          const answered = responses[key]
            .map((val, i) => ({ val, i }))
            .filter(({ val }) => val > 0);

          return (
            <div key={key}>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {label}
              </p>
              {answered.length === 0 ? (
                <p className="text-xs text-gray-400">No questions answered</p>
              ) : (
                <div className="space-y-1">
                  {answered.map(({ val, i }) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                        {LIKERT_LABELS[val]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {QUESTIONS[key][i]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={prevStep}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={submit}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
