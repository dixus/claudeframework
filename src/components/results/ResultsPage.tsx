"use client";

import { useState } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";
import { ScoreCard } from "./ScoreCard";
import { RadarChartPanel } from "./RadarChartPanel";
import { DimensionScorecard } from "./DimensionScorecard";
import { BottleneckPanel } from "./BottleneckPanel";
import { InsightsPanel } from "./InsightsPanel";
import { PlaybookPanel } from "./PlaybookPanel";
import { CapabilityPanel } from "./CapabilityPanel";
import { CapabilityPlaybookPanel } from "./CapabilityPlaybookPanel";
import { GrowthEnginePanel } from "./GrowthEnginePanel";
import { ScalingPanel } from "./ScalingPanel";
import { VelocityPanel } from "./VelocityPanel";
import { CoordinationPanel } from "./CoordinationPanel";
import { RoadmapPanel } from "./RoadmapPanel";
import { PdfExportButton } from "./PdfExportButton";

type ResultsTab = "overview" | "scaling" | "diagnosis" | "roadmap";

const TABS: { key: ResultsTab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "scaling", label: "Scaling", icon: "📈" },
  { key: "diagnosis", label: "Diagnosis", icon: "🔍" },
  { key: "roadmap", label: "Roadmap", icon: "🗺️" },
];

export function ResultsPage() {
  const result = useAssessmentStore((s) => s.result);
  const reset = useAssessmentStore((s) => s.reset);
  const [activeTab, setActiveTab] = useState<ResultsTab>("overview");

  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Your AI Maturity Results
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{result.companyName}</p>
          <PdfExportButton result={result} />
        </div>
      </div>

      {/* Hero: ScoreCard + Radar — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreCard result={result} />
        <RadarChartPanel dimensions={result.dimensions} />
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-4 px-4 pt-2">
        <nav className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <>
            {result.growthEngine && (
              <GrowthEnginePanel
                engine={result.growthEngine}
                dimensions={result.dimensions}
              />
            )}
            <InsightsPanel result={result} />
            <DimensionScorecard dimensions={result.dimensions} />
          </>
        )}

        {activeTab === "scaling" && (
          <>
            {result.meta && (
              <ScalingPanel meta={result.meta} thetaScore={result.thetaScore} />
            )}
            {result.scalingVelocity && (
              <VelocityPanel velocity={result.scalingVelocity} />
            )}
            {result.coordination && result.enablers && (
              <CoordinationPanel
                curves={result.coordination.curves}
                insight={result.coordination.insight}
                savings={result.coordination.savings}
                teamSize={result.enablers.teamSize}
              />
            )}
          </>
        )}

        {activeTab === "diagnosis" && (
          <>
            {result.capabilities && result.capabilityBottleneck && (
              <CapabilityPanel
                capabilities={result.capabilities}
                bottleneck={result.capabilityBottleneck}
              />
            )}
            {result.playbook && (
              <CapabilityPlaybookPanel
                playbook={result.playbook}
                interventionModel={result.interventionModel}
              />
            )}
            <BottleneckPanel bottleneck={result.bottleneck} />
            <PlaybookPanel result={result} />
          </>
        )}

        {activeTab === "roadmap" && (
          <>
            {result.roadmap && (
              <RoadmapPanel
                roadmap={result.roadmap}
                currentTheta={result.thetaScore}
              />
            )}
            <InsightsPanel result={result} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-center pt-2">
        <button
          onClick={reset}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
