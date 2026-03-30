"use client";

import { useState, useEffect } from "react";
import type {
  AssessmentResult,
  AssessmentComparison,
  DimensionKey,
} from "@/lib/scoring/types";
import { computeAssessmentComparison } from "@/lib/scoring/assessment-comparison";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  strategy: "Strategy",
  architecture: "Architecture",
  workflow: "Workflow",
  data: "Data",
  talent: "Talent",
  adoption: "Adoption",
};

interface ComparisonPanelProps {
  currentHash: string;
  compareHash: string;
  email: string;
}

function deltaColor(delta: number): string {
  if (delta > 0) return "text-green-600";
  if (delta < 0) return "text-red-600";
  return "text-gray-400";
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${Math.round(delta)}`;
  if (delta < 0) return `${Math.round(delta)}`;
  return "0";
}

export function ComparisonPanel({
  currentHash,
  compareHash,
  email,
}: ComparisonPanelProps) {
  const [comparison, setComparison] = useState<AssessmentComparison | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(
      `/api/assessments/compare?before=${encodeURIComponent(currentHash)}&after=${encodeURIComponent(compareHash)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then(
        (data: {
          before: { result: AssessmentResult };
          after: { result: AssessmentResult };
        }) => {
          if (cancelled) return;
          const comp = computeAssessmentComparison(
            data.before.result,
            data.after.result,
          );
          setComparison(comp);
          setLoading(false);
        },
      )
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentHash, compareHash, retryCount]);

  if (loading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-200 p-6"
        aria-busy="true"
        aria-label="Loading comparison"
        data-testid="comparison-loading"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-600" data-testid="comparison-error">
            Failed to load comparison data.
          </p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="comparison-panel">
      {/* Back button */}
      <a
        href={`/results/${currentHash}`}
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        data-testid="back-to-results"
      >
        ← Back to results
      </a>

      {/* Theta summary */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Overall Score Comparison
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Before
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(comparison.thetaBefore)}
              </p>
            </div>
            <div className="text-center">
              <span
                className={`text-2xl font-bold ${deltaColor(comparison.thetaDelta)}`}
                aria-label={`Theta ${comparison.thetaDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(Math.round(comparison.thetaDelta))} points`}
                data-testid="theta-delta"
              >
                {formatDelta(comparison.thetaDelta)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                After
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(comparison.thetaAfter)}
              </p>
            </div>
          </div>
          {comparison.levelChanged && (
            <div className="mt-3" data-testid="level-change">
              <Badge variant="purple">
                Level {comparison.levelBefore} → {comparison.levelAfter}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimension comparison table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Dimension Comparison
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" data-testid="dimension-table">
            {comparison.dimensions.map((dim) => (
              <div
                key={dim.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                data-testid="dimension-row"
              >
                <span className="text-sm font-medium text-gray-700">
                  {dim.label}
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    {Math.round(dim.scoreBefore)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-900 font-medium">
                    {Math.round(dim.scoreAfter)}
                  </span>
                  <span
                    className={`font-semibold ${deltaColor(dim.delta)}`}
                    aria-label={`${DIMENSION_LABELS[dim.key]} ${dim.delta > 0 ? "improved" : dim.delta < 0 ? "regressed" : "unchanged"} by ${Math.abs(Math.round(dim.delta))} points`}
                  >
                    {formatDelta(dim.delta)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capability comparison */}
      {comparison.capabilities && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Capability Comparison
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="capability-table">
              {comparison.capabilities.map((cap) => (
                <div
                  key={cap.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                  data-testid="capability-row"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {cap.label}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      {Math.round(cap.scoreBefore)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-900 font-medium">
                      {Math.round(cap.scoreAfter)}
                    </span>
                    <span
                      className={`font-semibold ${deltaColor(cap.delta)}`}
                    >
                      {formatDelta(cap.delta)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {(comparison.mostImproved || comparison.mostRegressed) && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Highlights</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {comparison.mostImproved && (
                <div
                  className="bg-green-50 rounded-lg p-4 flex-1 min-w-[200px]"
                  data-testid="most-improved"
                >
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                    Most Improved
                  </p>
                  <p className="text-sm font-semibold text-green-800">
                    {DIMENSION_LABELS[comparison.mostImproved.dimension]}{" "}
                    <span className="text-green-600">
                      +{Math.round(comparison.mostImproved.delta)}
                    </span>
                  </p>
                </div>
              )}
              {comparison.mostRegressed && (
                <div
                  className="bg-red-50 rounded-lg p-4 flex-1 min-w-[200px]"
                  data-testid="most-regressed"
                >
                  <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">
                    Most Regressed
                  </p>
                  <p className="text-sm font-semibold text-red-800">
                    {DIMENSION_LABELS[comparison.mostRegressed.dimension]}{" "}
                    <span className="text-red-600">
                      {Math.round(comparison.mostRegressed.delta)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
