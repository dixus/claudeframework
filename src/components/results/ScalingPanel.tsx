"use client";

import type { MetaResult, EnablerInput } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";
import { ValidationBadge } from "@/components/ui/validation-badge";
import { getBenchmark } from "@/lib/scoring/benchmarks";

interface ScalingPanelProps {
  meta: MetaResult;
  thetaScore: number;
  level?: number;
  enablers?: EnablerInput;
}

export function ScalingPanel({
  meta,
  thetaScore,
  level,
  enablers,
}: ScalingPanelProps) {
  const {
    metaScore,
    predictedMonthsTo100M,
    scalingCoefficient,
    enablerScore,
    capabilityGeoMean,
  } = meta;

  // Position on the scaling spectrum (0.8 = traditional, 1.8 = top AI-native)
  const spectrumPosition = Math.min(
    100,
    Math.max(0, ((scalingCoefficient - 0.8) / 1.0) * 100),
  );

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-6">
      <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide mb-4">
        Superlinear Scaling Analysis
      </p>
      <HelpSection panelId="scaling-panel" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            <HelpTerm term="meta_score">META Score</HelpTerm>
          </p>
          <p className="text-2xl font-bold text-indigo-600">
            {metaScore.toFixed(1)}
          </p>
          <div className="mt-1">
            <ValidationBadge formula="META" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Predicted Time to €100M</p>
          <p className="text-2xl font-bold text-gray-900">
            {predictedMonthsTo100M} mo
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">
            <HelpTerm term="scaling_coefficient">Scaling Coefficient</HelpTerm>
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {scalingCoefficient.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Enabler Score</p>
          <p className="text-2xl font-bold text-gray-900">
            {enablerScore.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Scaling spectrum visualization */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Your scaling profile</p>
        <div className="relative">
          <div className="h-4 rounded-full bg-gradient-to-r from-gray-300 via-blue-400 to-indigo-600" />
          <div
            className="absolute top-0 w-3 h-4 bg-white border-2 border-indigo-800 rounded"
            style={{ left: `calc(${spectrumPosition}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Linear (0.8)</span>
          <span>Superlinear (1.3)</span>
          <span>Highly Superlinear (1.8)</span>
        </div>
      </div>

      {/* Formula breakdown */}
      <div className="bg-indigo-50 rounded-lg p-3">
        <p className="text-xs font-medium text-indigo-700 mb-2">
          META Formula Breakdown
        </p>
        <p className="text-xs text-indigo-800 font-mono">
          META = θ ({thetaScore.toFixed(1)}) × (C₁
          <sup>1.5</sup> × C₂ × C₃
          <sup>1.5</sup> × C₄)
          <sup>⅕</sup> ({capabilityGeoMean.toFixed(1)}) × E<sup>⅓</sup> (
          {enablerScore.toFixed(1)}) = {metaScore.toFixed(1)}
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          C₁ Strategy <span className="text-indigo-500">(superlinear)</span> ×
          C₂ Setup × C₃ Execution{" "}
          <span className="text-indigo-500">(superlinear)</span> × C₄
          Operationalization
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          {scalingCoefficient >= 1.3
            ? "You are in the superlinear scaling zone — revenue grows faster than headcount."
            : scalingCoefficient >= 1.0
              ? "You are approaching superlinear scaling. Focus on your capability bottleneck to break through."
              : "Traditional linear scaling. AI maturity and capability improvements will unlock superlinear growth."}
        </p>
        <p className="text-[10px] text-indigo-400 mt-2">
          Based on empirical validation across 22 AI-native companies
        </p>
      </div>

      {level !== undefined && enablers && (
        <div className="bg-gray-50 rounded p-2 mt-4 text-sm text-gray-600">
          {(() => {
            const referenceLevel = level >= 3 ? level : level + 1;
            const benchmark = getBenchmark(referenceLevel);
            const impliedArr =
              enablers.teamSize > 0
                ? (enablers.annualRevenue * 1000) / enablers.teamSize
                : null;
            return (
              <>
                <p>
                  Level {referenceLevel} companies typically achieve{" "}
                  {benchmark.arrPerEmployee} ARR/employee
                </p>
                {impliedArr !== null && (
                  <p className="text-xs text-gray-400 mt-1">
                    Your current implied ARR/employee: {"\u20AC"}
                    {impliedArr >= 1000000
                      ? `${(impliedArr / 1000000).toFixed(1)}M`
                      : `${Math.round(impliedArr / 1000)}K`}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
