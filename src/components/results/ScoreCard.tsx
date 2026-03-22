"use client";

import type { AssessmentResult } from "@/lib/scoring/types";
import { VALIDATION_STATS } from "@/lib/scoring/validation";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";

interface ScoreCardProps {
  result: AssessmentResult;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const { thetaScore, level, gated, meta } = result;

  const monthsDisplay = meta ? meta.predictedMonthsTo100M : level.monthsTo100M;
  const monthsLabel = meta ? "Predicted (META)" : "Level benchmark";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          <HelpTerm term="theta_index">{"\u03B8"} Score</HelpTerm>
        </p>
        <p className="text-5xl font-bold text-blue-600 mt-1">
          {thetaScore.toFixed(1)}
        </p>
      </div>
      <HelpSection panelId="score-card" />
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Maturity Level
        </p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">
          {level.label}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          Validated framework (n={VALIDATION_STATS[0].sampleSize} companies)
        </p>
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Months to {"\u20AC"}100M ARR</span>
          <div className="text-right">
            <span className="font-medium text-gray-900">{monthsDisplay}</span>
            {meta && <p className="text-xs text-gray-400">{monthsLabel}</p>}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">ARR per Employee</span>
          <span className="font-medium text-gray-900">
            {level.arrPerEmployee}
          </span>
        </div>
        {meta && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Scaling Coefficient</span>
            <span className="font-medium text-gray-900">
              {meta.scalingCoefficient.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      {gated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Your {"\u03B8"} score qualified for a higher level, but one or more{" "}
          <HelpTerm term="gating">gating conditions</HelpTerm> were not met.
        </div>
      )}
    </div>
  );
}
