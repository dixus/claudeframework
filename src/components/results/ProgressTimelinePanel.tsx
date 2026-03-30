"use client";

import { useState, useEffect } from "react";
import type { AssessmentResult, DimensionKey, TimestampedResult } from "@/lib/scoring/types";
import {
  computeProgressDelta,
  computeProgressSummary,
  getProgressInsight,
} from "@/lib/scoring/progress-tracking";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ProgressTimelinePanelProps {
  result: AssessmentResult;
  email: string | null;
}

export function ProgressTimelinePanel({
  result,
  email,
}: ProgressTimelinePanelProps) {
  const [history, setHistory] = useState<TimestampedResult[] | null>(
    null
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!email) return;

    let cancelled = false;
    fetch(`/api/assessments/history?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data: TimestampedResult[]) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!email) return null;
  if (error) return null;

  // Loading state
  if (history === null) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-200 p-6"
        aria-busy="true"
        aria-label="Loading progress timeline"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // Not enough history
  if (history.length < 2) return null;

  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  const delta = computeProgressDelta(current, previous);
  const summary = computeProgressSummary(history);
  const insight = getProgressInsight(delta);

  const chartData = summary.timelinePoints.map((pt) => ({
    date: formatDate(pt.date),
    theta: Math.round(pt.theta),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Progress Timeline
        </h3>
        <p className="text-sm text-gray-500">
          Tracking {summary.assessmentCount} assessments
        </p>
      </div>

      {/* Theta Trend Chart */}
      <div role="img" aria-label="Theta score trend over time">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="theta"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Delta Summary Card */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-gray-50 rounded-lg p-4 flex-1 min-w-[200px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Since last assessment
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${delta.thetaDelta >= 0 ? "text-green-600" : "text-red-600"}`}
              aria-label={`Theta ${delta.thetaDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(delta.thetaDelta).toFixed(0)} points`}
            >
              {delta.thetaDelta >= 0 ? "+" : ""}
              {delta.thetaDelta.toFixed(0)}
            </span>
            <span
              className={delta.thetaDelta >= 0 ? "text-green-600" : "text-red-600"}
              aria-hidden="true"
            >
              {delta.thetaDelta >= 0 ? "▲" : "▼"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            {delta.levelChanged && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                Level {delta.previousLevel} → {delta.currentLevel}
              </span>
            )}
            <span>{delta.daysBetween} days ago</span>
          </div>
        </div>
      </div>

      {/* Dimension Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {result.dimensions.map((dim) => {
          const dimDelta = delta.dimensionDeltas[dim.key] ?? 0;
          const arrow =
            dimDelta > 2 ? "▲" : dimDelta < -2 ? "▼" : "–";
          const color =
            dimDelta > 2
              ? "text-green-600"
              : dimDelta < -2
                ? "text-red-600"
                : "text-gray-500";
          return (
            <div
              key={dim.key}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              data-testid="dimension-indicator"
            >
              <span className="text-sm font-medium text-gray-700">
                {DIMENSION_LABELS[dim.key as DimensionKey] || dim.key}
              </span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${color}`}>
                <span aria-hidden="true">{arrow}</span>
                {dimDelta >= 0 ? "+" : ""}
                {dimDelta.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Insight */}
      <p className="text-sm text-gray-500" data-testid="progress-insight">
        {insight}
      </p>
    </div>
  );
}
