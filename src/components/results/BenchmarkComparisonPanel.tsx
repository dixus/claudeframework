"use client";

import type { DimensionKey, BenchmarkComparison } from "@/lib/scoring/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

export type { BenchmarkComparison };

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

function deltaColor(delta: number): string {
  if (delta > 10) return "#22c55e";
  if (delta >= -10) return "#eab308";
  return "#ef4444";
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(0)} above`;
  if (delta < 0) return `${delta.toFixed(0)} below`;
  return "at mean";
}

function deltaTextColor(delta: number): string {
  if (delta > 10) return "text-green-700";
  if (delta >= -10) return "text-amber-700";
  return "text-red-700";
}

interface BenchmarkComparisonPanelProps {
  benchmarkComparison: BenchmarkComparison | undefined;
}

export function BenchmarkComparisonPanel({
  benchmarkComparison,
}: BenchmarkComparisonPanelProps) {
  if (!benchmarkComparison) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-400">
          Complete the enabler and growth engine steps to see peer benchmarks
        </p>
      </div>
    );
  }

  const {
    cohortLabel,
    sampleSize,
    percentile,
    dimensionDeltas,
    dimensionMeans,
    topStrength,
    keyGap,
  } = benchmarkComparison;

  const chartData = (Object.keys(dimensionDeltas) as DimensionKey[]).map(
    (key) => ({
      dimension: DIMENSION_LABELS[key],
      delta: dimensionDeltas[key],
      label: deltaLabel(dimensionDeltas[key]),
    }),
  );

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-6">
      <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide mb-4">
        Peer Comparison
      </p>

      {/* Cohort Header */}
      <p className="text-lg font-bold text-gray-900 mb-1">
        {cohortLabel}{" "}
        <span className="text-sm font-normal text-gray-500">
          (n={sampleSize})
        </span>
      </p>

      {/* Percentile Bar */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          You are at the{" "}
          <span className="font-semibold text-indigo-600">
            {percentile}
            {ordinalSuffix(percentile)} percentile
          </span>
        </p>
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            role="meter"
            aria-valuenow={percentile}
            aria-valuemin={1}
            aria-valuemax={99}
            aria-label={`${percentile}${ordinalSuffix(percentile)} percentile within ${cohortLabel}`}
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${percentile}%` }}
          />
        </div>
      </div>

      {/* Dimension Comparison Chart */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Dimension Comparison vs Cohort Mean
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                dataKey="dimension"
                type="category"
                width={75}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [deltaLabel(Number(value)), "vs cohort"]}
              />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={deltaColor(entry.delta)} />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fontSize: 11, fill: "#6b7280" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Accessible text labels for each dimension */}
        <div className="sr-only">
          {(Object.keys(dimensionDeltas) as DimensionKey[]).map((key) => {
            const cohortMean = Math.round(dimensionMeans[key]);
            const userScore = Math.round(
              dimensionMeans[key] + dimensionDeltas[key],
            );
            return (
              <span
                key={key}
                aria-label={`${DIMENSION_LABELS[key]}: your score ${userScore}, cohort mean ${cohortMean}, ${deltaLabel(dimensionDeltas[key])}`}
              >
                {DIMENSION_LABELS[key]}: {deltaLabel(dimensionDeltas[key])}
                .{" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Strength & Gap Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs font-medium text-green-700 mb-1">
            Top Strength
          </p>
          <p className="text-sm font-semibold text-green-800">
            {DIMENSION_LABELS[topStrength.dimension]}
          </p>
          <p className="text-xs text-green-700">
            {deltaLabel(topStrength.delta)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs font-medium text-red-700 mb-1">Key Gap</p>
          <p className="text-sm font-semibold text-red-800">
            {DIMENSION_LABELS[keyGap.dimension]}
          </p>
          <p className="text-xs text-red-700">{deltaLabel(keyGap.delta)}</p>
        </div>
      </div>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
