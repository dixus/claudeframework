"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { DimensionResult } from "@/lib/scoring/types";
import type { DimensionKey } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";
import {
  getLevelThresholdScores,
  getBenchmark,
} from "@/lib/scoring/benchmarks";

const AI_NATIVE_TARGETS: Record<DimensionKey, number> = {
  strategy: 90,
  architecture: 85,
  workflow: 85,
  data: 80,
  talent: 80,
  adoption: 75,
};

interface RadarChartPanelProps {
  dimensions: DimensionResult[];
  level?: number;
}

export function RadarChartPanel({ dimensions, level }: RadarChartPanelProps) {
  const targetLevel = level !== undefined ? (level >= 3 ? 3 : level + 1) : null;
  const benchmarkLabel =
    targetLevel === 3
      ? "AI-Native benchmark"
      : targetLevel !== null
        ? `Level ${targetLevel} threshold`
        : null;

  const data = dimensions.map((d) => {
    const entry: Record<string, string | number> = {
      dimension: d.label,
      score: d.score,
      fullMark: 100,
    };
    if (targetLevel !== null) {
      if (targetLevel === 3 && level === 3) {
        entry.benchmark = AI_NATIVE_TARGETS[d.key];
      } else if (targetLevel === 3) {
        const gates = getLevelThresholdScores(3);
        entry.benchmark =
          gates[d.key] ?? getBenchmark(targetLevel).levelMeanTheta;
      } else {
        const gates = getLevelThresholdScores(targetLevel);
        entry.benchmark =
          gates[d.key] ?? getBenchmark(targetLevel).levelMeanTheta;
      }
    }
    return entry;
  });

  return (
    <div
      id="radar-chart"
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Dimension Radar
      </p>
      <HelpSection panelId="radar-chart" />
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
          <Radar
            dataKey="score"
            fill="#3b82f6"
            fillOpacity={0.3}
            stroke="#3b82f6"
          />
          {targetLevel !== null && (
            <Radar
              dataKey="benchmark"
              stroke="#9ca3af"
              strokeDasharray="4 4"
              fillOpacity={0.05}
              fill="#9ca3af"
              aria-label={benchmarkLabel ?? undefined}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
      {benchmarkLabel && (
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm opacity-50" />
            Your scores
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0 border-t-2 border-dashed border-gray-400" />
            {benchmarkLabel}
          </span>
        </div>
      )}
    </div>
  );
}
