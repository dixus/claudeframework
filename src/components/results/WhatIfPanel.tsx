"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  AssessmentResult,
  DimensionKey,
  CapabilityKey,
  WhatIfResult,
} from "@/lib/scoring/types";
import { computeWhatIf, DIMENSIONS } from "@/lib/scoring/engine";

interface WhatIfPanelProps {
  result: AssessmentResult;
}

const EMPTY_SCORES: Record<DimensionKey, number> = {
  strategy: 0,
  architecture: 0,
  workflow: 0,
  data: 0,
  talent: 0,
  adoption: 0,
};

export function WhatIfPanel({ result }: WhatIfPanelProps) {
  const initialScores = useMemo(() => {
    if (!result) return EMPTY_SCORES;
    const scores: Record<string, number> = {};
    for (const d of result.dimensions) {
      scores[d.key] = d.score;
    }
    return scores as Record<DimensionKey, number>;
  }, [result]);

  const [sliderValues, setSliderValues] =
    useState<Record<DimensionKey, number>>(initialScores);

  // Re-sync slider values when the result prop changes (e.g. user completes a new assessment)
  useEffect(() => {
    setSliderValues(initialScores);
  }, [initialScores]);

  const capabilityResponses = useMemo(() => {
    if (!result?.capabilities) return undefined;
    const responses: Record<string, number> = {};
    for (const c of result.capabilities) {
      responses[c.key] = (c.score / 100) * 4;
    }
    return responses as Record<CapabilityKey, number>;
  }, [result?.capabilities]);

  const enablers = result?.enablers;

  const baselineResult: WhatIfResult = useMemo(
    () => computeWhatIf(initialScores, capabilityResponses, enablers),
    [initialScores, capabilityResponses, enablers],
  );

  const whatIfResult: WhatIfResult = useMemo(
    () => computeWhatIf(sliderValues, capabilityResponses, enablers),
    [sliderValues, capabilityResponses, enablers],
  );

  const originalGatingDetails = baselineResult.gatingDetails;

  const gatingAlerts = useMemo(() => {
    const alerts: Array<{ message: string; type: "unlock" | "warning" }> = [];

    const originalGatingDims = new Set(
      originalGatingDetails.map((g) => g.dimension),
    );
    const whatIfGatingDims = new Set(
      whatIfResult.gatingDetails.map((g) => g.dimension),
    );

    for (const g of originalGatingDetails) {
      if (!whatIfGatingDims.has(g.dimension)) {
        alerts.push({
          message: `${g.dimensionLabel} ≥${g.threshold} unlocks Level ${g.targetLevel}`,
          type: "unlock",
        });
      }
    }

    for (const g of whatIfResult.gatingDetails) {
      if (!originalGatingDims.has(g.dimension)) {
        alerts.push({
          message: `${g.dimensionLabel} dropped below ${g.threshold} — Level ${g.targetLevel} gated`,
          type: "warning",
        });
      }
    }

    return alerts;
  }, [originalGatingDetails, whatIfResult.gatingDetails]);

  const hasChanged = useMemo(() => {
    return DIMENSIONS.some((d) => sliderValues[d.key] !== initialScores[d.key]);
  }, [sliderValues, initialScores]);

  const formatDelta = (original: number, current: number, precision = 1) => {
    const diff = Number((current - original).toFixed(precision));
    const sign = diff >= 0 ? "+" : "";
    return `${Number(original.toFixed(precision))} → ${Number(current.toFixed(precision))} (${sign}${diff})`;
  };

  const handleSliderChange = (key: DimensionKey, value: number) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSliderValues(initialScores);
  };

  if (!result) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        What If?
      </p>

      {/* Dimension sliders */}
      <div className="space-y-4 mb-6">
        {DIMENSIONS.map((d) => {
          const value = sliderValues[d.key];
          const original = initialScores[d.key];
          const changed = value !== original;
          return (
            <div key={d.key}>
              <div className="flex justify-between text-sm mb-1">
                <label
                  htmlFor={`whatif-${d.key}`}
                  className="font-medium text-gray-700"
                >
                  {d.label}
                </label>
                <span className="text-gray-500" aria-hidden="true">
                  {changed ? (
                    <>
                      {Math.round(original)} → {value}{" "}
                      <span
                        className={
                          value > original ? "text-green-600" : "text-red-600"
                        }
                      >
                        ({value > original ? "+" : ""}
                        {Math.round(value - original)})
                      </span>
                    </>
                  ) : (
                    value
                  )}
                </span>
                {changed && (
                  <span className="sr-only">
                    {d.label} changed from {Math.round(original)} to {value},{" "}
                    {value > original
                      ? `increase of ${Math.round(value - original)}`
                      : `decrease of ${Math.round(original - value)}`}
                  </span>
                )}
              </div>
              <input
                id={`whatif-${d.key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                aria-label={d.label}
                onChange={(e) =>
                  handleSliderChange(d.key, Number(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          );
        })}
      </div>

      {/* Results summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Theta (θ)</p>
          <p
            className="text-lg font-bold text-gray-900"
            aria-hidden={hasChanged ? "true" : undefined}
          >
            {hasChanged
              ? formatDelta(baselineResult.thetaScore, whatIfResult.thetaScore)
              : whatIfResult.thetaScore.toFixed(1)}
          </p>
          {hasChanged && (
            <span className="sr-only">
              theta changed from {baselineResult.thetaScore.toFixed(1)} to{" "}
              {whatIfResult.thetaScore.toFixed(1)},{" "}
              {whatIfResult.thetaScore >= baselineResult.thetaScore
                ? `increase of ${(whatIfResult.thetaScore - baselineResult.thetaScore).toFixed(1)}`
                : `decrease of ${(baselineResult.thetaScore - whatIfResult.thetaScore).toFixed(1)}`}
            </span>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Level</p>
          <p
            className="text-lg font-bold text-gray-900"
            aria-hidden={
              hasChanged &&
              whatIfResult.level.label !== baselineResult.level.label
                ? "true"
                : undefined
            }
          >
            {hasChanged &&
            whatIfResult.level.label !== baselineResult.level.label
              ? `${baselineResult.level.label} → ${whatIfResult.level.label}`
              : whatIfResult.level.label}
          </p>
          {hasChanged &&
            whatIfResult.level.label !== baselineResult.level.label && (
              <span className="sr-only">
                level changed from {baselineResult.level.label} to{" "}
                {whatIfResult.level.label}
              </span>
            )}
        </div>
        {baselineResult.meta && whatIfResult.meta && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Months to €100M</p>
            <p
              className="text-lg font-bold text-gray-900"
              aria-hidden={hasChanged ? "true" : undefined}
            >
              {hasChanged
                ? formatDelta(
                    baselineResult.meta.predictedMonthsTo100M,
                    whatIfResult.meta.predictedMonthsTo100M,
                    0,
                  )
                : whatIfResult.meta.predictedMonthsTo100M}
            </p>
            {hasChanged && (
              <span className="sr-only">
                months to 100M changed from{" "}
                {baselineResult.meta.predictedMonthsTo100M} to{" "}
                {whatIfResult.meta.predictedMonthsTo100M},{" "}
                {whatIfResult.meta.predictedMonthsTo100M <=
                baselineResult.meta.predictedMonthsTo100M
                  ? `decrease of ${baselineResult.meta.predictedMonthsTo100M - whatIfResult.meta.predictedMonthsTo100M}`
                  : `increase of ${whatIfResult.meta.predictedMonthsTo100M - baselineResult.meta.predictedMonthsTo100M}`}
              </span>
            )}
          </div>
        )}
        {baselineResult.scalingVelocity && whatIfResult.scalingVelocity && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Band</p>
            <p
              className="text-lg font-bold text-gray-900"
              aria-hidden={
                hasChanged &&
                whatIfResult.scalingVelocity.bandLabel !==
                  baselineResult.scalingVelocity.bandLabel
                  ? "true"
                  : undefined
              }
            >
              {hasChanged &&
              whatIfResult.scalingVelocity.bandLabel !==
                baselineResult.scalingVelocity.bandLabel
                ? `${baselineResult.scalingVelocity.bandLabel} → ${whatIfResult.scalingVelocity.bandLabel}`
                : whatIfResult.scalingVelocity.bandLabel}
            </p>
            {hasChanged &&
              whatIfResult.scalingVelocity.bandLabel !==
                baselineResult.scalingVelocity.bandLabel && (
                <span className="sr-only">
                  scaling velocity band changed from{" "}
                  {baselineResult.scalingVelocity.bandLabel} to{" "}
                  {whatIfResult.scalingVelocity.bandLabel}
                </span>
              )}
          </div>
        )}
      </div>

      {/* Gating alerts */}
      {gatingAlerts.length > 0 && (
        <div className="space-y-2 mb-4" role="status">
          {gatingAlerts.map((alert, i) => (
            <div
              key={i}
              className={`text-sm rounded-lg p-2 ${
                alert.type === "unlock"
                  ? "bg-green-50 text-green-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Reset button */}
      {hasChanged && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
