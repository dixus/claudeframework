"use client";

import type { DimensionResult } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";

interface DimensionScorecardProps {
  dimensions: DimensionResult[];
}

export function DimensionScorecard({ dimensions }: DimensionScorecardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Dimension Scores
      </p>
      <HelpSection panelId="dimension-scorecard" />
      <div className="space-y-3">
        {dimensions.map((d) => (
          <div key={d.key} id={`dim-${d.key}`} className="scroll-mt-16">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{d.label}</span>
              <span className="text-gray-500">{d.score.toFixed(1)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded h-2">
              <div
                className="bg-blue-500 h-2 rounded"
                style={{ width: `${d.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
