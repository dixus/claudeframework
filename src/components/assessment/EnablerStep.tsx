"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import type { FundingStage } from "@/lib/scoring/types";

const STAGES: Array<{ value: FundingStage; label: string }> = [
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b", label: "Series B" },
  { value: "series-c", label: "Series C" },
  { value: "growth", label: "Growth / Public" },
];

export function EnablerStep() {
  const enablers = useAssessmentStore((s) => s.enablers);
  const setEnablers = useAssessmentStore((s) => s.setEnablers);
  const nextStep = useAssessmentStore((s) => s.nextStep);
  const prevStep = useAssessmentStore((s) => s.prevStep);

  const canContinue = enablers.fundingStage !== "" && enablers.teamSize > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Company Context</h2>
      <p className="text-sm text-gray-500">
        This helps us calculate your personalised scaling prediction using the
        META formula.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Funding Stage
          </label>
          <select
            value={enablers.fundingStage}
            onChange={(e) =>
              setEnablers({
                ...enablers,
                fundingStage: e.target.value as FundingStage,
              })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select stage...</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team Size (headcount)
          </label>
          <input
            type="number"
            min={1}
            value={enablers.teamSize || ""}
            onChange={(e) =>
              setEnablers({
                ...enablers,
                teamSize: parseInt(e.target.value) || 0,
              })
            }
            placeholder="e.g. 50"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Revenue (€K)
          </label>
          <input
            type="number"
            min={0}
            value={enablers.annualRevenue || ""}
            onChange={(e) =>
              setEnablers({
                ...enablers,
                annualRevenue: parseInt(e.target.value) || 0,
              })
            }
            placeholder="e.g. 5000 for €5M"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Enter 0 if pre-revenue</p>
        </div>
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
          disabled={!canContinue}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
