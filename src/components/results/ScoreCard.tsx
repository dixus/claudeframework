"use client";

import type { AssessmentResult } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";
import { ValidationBadge } from "@/components/ui/validation-badge";

interface ScoreCardProps {
  result: AssessmentResult;
}

const LEVEL_LABELS: Record<number, string> = {
  0: "Traditional",
  1: "AI-Powered",
  2: "AI-Enabled",
  3: "AI-Native",
};

export function ScoreCard({ result }: ScoreCardProps) {
  const { thetaScore, level, gated, gatingDetails, meta } = result;

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
        <div className="mt-1">
          <ValidationBadge formula="θ_index" />
        </div>
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
      {gated && gatingDetails.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-2">
          {gatingDetails.map((gate) => (
            <p key={`${gate.dimension}-${gate.targetLevel}`}>
              Your {"\u03B8"} score qualifies for Level {gate.targetLevel} (
              {LEVEL_LABELS[gate.targetLevel]}), but{" "}
              <a
                href={`#dim-${gate.dimension}`}
                className="font-medium underline hover:text-amber-900"
              >
                {gate.dimensionLabel}
              </a>{" "}
              at {gate.score.toFixed(1)} is below the {gate.threshold} minimum
              required. Improving {gate.dimensionLabel} to {gate.threshold}{" "}
              would unlock Level {gate.targetLevel} (
              {LEVEL_LABELS[gate.targetLevel]}).
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
