"use client";

import type { GrowthEngine } from "@/lib/scoring/growth-engines";
import type { DimensionResult } from "@/lib/scoring/types";

interface GrowthEnginePanelProps {
  engine: GrowthEngine;
  dimensions: DimensionResult[];
}

export function GrowthEnginePanel({
  engine,
  dimensions,
}: GrowthEnginePanelProps) {
  const priorityScores = engine.priorityDimensions.map((key) => {
    const dim = dimensions.find((d) => d.key === key);
    return { key, label: dim?.label ?? key, score: dim?.score ?? 0 };
  });

  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-emerald-600 uppercase tracking-wide">
          Growth Engine
        </span>
        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
          {engine.shortLabel}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-lg font-bold text-gray-900">{engine.label}</p>
        <p className="text-sm text-gray-600 mt-1">{engine.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Key Metrics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {engine.keyMetrics.map((m) => (
              <span
                key={m}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Examples
          </p>
          <p className="text-sm text-gray-700">{engine.examples.join(", ")}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Priority Dimensions for Your GTM Model
        </p>
        <div className="space-y-2">
          {priorityScores.map(({ key, label, score }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 w-28">{label}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {score.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-700 mb-1">
            Scaling Advantage
          </p>
          <p className="text-xs text-emerald-800">{engine.scalingAdvantage}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-700 mb-1">
            AI Leverage
          </p>
          <p className="text-xs text-emerald-800">{engine.aiLeverage}</p>
        </div>
      </div>
    </div>
  );
}
