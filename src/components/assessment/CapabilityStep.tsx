"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import {
  CAPABILITY_QUESTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_KEYS,
} from "@/lib/scoring/capabilities";
import { LIKERT_LABELS } from "@/lib/scoring/questions";
import type { CapabilityKey } from "@/lib/scoring/types";

export function CapabilityStep() {
  const capabilityResponses = useAssessmentStore((s) => s.capabilityResponses);
  const setCapabilityAnswer = useAssessmentStore((s) => s.setCapabilityAnswer);
  const nextStep = useAssessmentStore((s) => s.nextStep);
  const prevStep = useAssessmentStore((s) => s.prevStep);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Scaling Capabilities
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Rate your organisation across the 4 scaling capabilities (SST
          framework). This identifies your capability bottleneck — the single
          biggest constraint on growth.
        </p>
      </div>

      <div className="space-y-5">
        {CAPABILITY_KEYS.map((key) => (
          <div key={key} className="rounded-xl border border-gray-200 p-5">
            <div className="mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {CAPABILITY_LABELS[key]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {CAPABILITY_DESCRIPTIONS[key]}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              {CAPABILITY_QUESTIONS[key]}
            </p>
            <div className="flex gap-2 flex-wrap">
              {LIKERT_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setCapabilityAnswer(key, i)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    capabilityResponses[key] === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
