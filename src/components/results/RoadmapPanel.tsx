"use client";

import type { StageRoadmap } from "@/lib/scoring/roadmaps";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";

interface RoadmapPanelProps {
  roadmap: StageRoadmap;
  currentTheta: number;
}

function parseThetaRange(range: string): { min: number; max: number } {
  const parts = range.split("\u2013");
  return {
    min: parseFloat(parts[0]) * 100,
    max: parseFloat(parts[1]) * 100,
  };
}

function PriorityBadge({
  priority,
}: {
  priority: "Critical" | "High" | "Medium";
}) {
  const colors = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-amber-100 text-amber-700",
    Medium: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[priority]}`}
    >
      {priority}
    </span>
  );
}

export function RoadmapPanel({ roadmap, currentTheta }: RoadmapPanelProps) {
  const target = parseThetaRange(roadmap.aiMaturityTarget.thetaRange);
  const isAboveTarget = currentTheta >= target.max;
  const isInRange = currentTheta >= target.min && currentTheta < target.max;

  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-6">
      <div className="mb-4">
        <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">
          Stage Roadmap
        </p>
        <HelpSection panelId="roadmap-panel" />
        <h2 className="text-xl font-bold text-gray-900 mt-1">
          {roadmap.stage} — {roadmap.tagline}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{roadmap.arrRange}</p>
      </div>

      {/* Priority Dimensions */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Priority Dimensions
        </p>
        <div className="space-y-1.5">
          {roadmap.priorityDimensions.map((pd) => (
            <div
              key={pd.dimension}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-600">{pd.dimension}</span>
              <PriorityBadge priority={pd.priority} />
            </div>
          ))}
        </div>
      </div>

      {/* Capability Effort Allocation */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Capability Effort Allocation
        </p>
        <div className="space-y-2">
          {roadmap.capabilityFocus.map((cf) => (
            <div key={cf.capability}>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                <span>{cf.capability}</span>
                <span className="font-medium">{cf.effort}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${cf.effort}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Maturity Target */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">
          AI Maturity Target
        </p>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-sm font-medium text-emerald-800">
            {roadmap.aiMaturityTarget.levelTarget}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Target <HelpTerm term="theta_index">{"\u03B8"} range</HelpTerm>:{" "}
            {roadmap.aiMaturityTarget.thetaRange}
          </p>

          {/* Progress indicator: current theta vs target range */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Current \u03b8: {currentTheta.toFixed(1)}</span>
              <span>
                Target: {target.min}\u2013{target.max}
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              {/* Target range highlight */}
              <div
                className="absolute h-full bg-emerald-200"
                style={{
                  left: `${(target.min / 100) * 100}%`,
                  width: `${((target.max - target.min) / 100) * 100}%`,
                }}
              />
              {/* Current position */}
              <div
                className={`absolute top-0 h-3 rounded-full ${
                  isAboveTarget
                    ? "bg-emerald-600"
                    : isInRange
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, currentTheta)}%` }}
              />
            </div>
            <p className="text-xs mt-1 font-medium">
              {isAboveTarget ? (
                <span className="text-emerald-600">Above target range</span>
              ) : isInRange ? (
                <span className="text-emerald-600">Within target range</span>
              ) : (
                <span className="text-amber-600">
                  {(target.min - currentTheta).toFixed(1)} points below target
                  range
                </span>
              )}
            </p>
          </div>

          <ul className="mt-3 space-y-1">
            {roadmap.aiMaturityTarget.actions.map((action, i) => (
              <li key={i} className="text-xs text-emerald-700 flex gap-1.5">
                <span className="shrink-0">&#8226;</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Expected Outcomes */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Expected Outcomes
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">ARR / Employee</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {roadmap.expectedOutcomes.arrPerEmployee}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Time to Milestone</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {roadmap.expectedOutcomes.timeToMilestone}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Team Size</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {roadmap.expectedOutcomes.teamSize}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
