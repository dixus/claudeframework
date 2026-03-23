"use client";

import type { DimensionResult } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";
import { getLevelThresholdScores } from "@/lib/scoring/benchmarks";

interface DimensionScorecardProps {
  dimensions: DimensionResult[];
  level?: number;
}

export function DimensionScorecard({
  dimensions,
  level,
}: DimensionScorecardProps) {
  const nextLevel =
    level !== undefined ? (level >= 3 ? null : level + 1) : null;
  const gates = nextLevel !== null ? getLevelThresholdScores(nextLevel) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Dimension Scores
      </p>
      <HelpSection panelId="dimension-scorecard" />
      <div className="space-y-3">
        {dimensions.map((d) => {
          const gateThreshold = gates ? gates[d.key] : null;
          return (
            <div key={d.key} id={`dim-${d.key}`} className="scroll-mt-16">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{d.label}</span>
                <span className="text-gray-500">{d.score.toFixed(1)}</span>
              </div>
              <div className="relative w-full">
                <div className="w-full bg-gray-100 rounded h-2">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                {gateThreshold !== null && (
                  <div
                    className="absolute top-[-2px] w-[2px] h-3 border-l-2 border-dashed border-amber-400"
                    style={{ left: `${gateThreshold}%` }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="absolute top-[-2px] w-[2px] h-3 border-l-2 border-dashed border-gray-300"
                  style={{ left: "70%" }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
