"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AssessmentResult } from "@/lib/scoring/types";
import { ScoreCard } from "@/components/results/ScoreCard";
import { RadarChartPanel } from "@/components/results/RadarChartPanel";
import { DimensionScorecard } from "@/components/results/DimensionScorecard";
import { BottleneckPanel } from "@/components/results/BottleneckPanel";
import { InsightsPanel } from "@/components/results/InsightsPanel";
import { PlaybookPanel } from "@/components/results/PlaybookPanel";
import { CapabilityPanel } from "@/components/results/CapabilityPanel";
import { CapabilityPlaybookPanel } from "@/components/results/CapabilityPlaybookPanel";
import { GrowthEnginePanel } from "@/components/results/GrowthEnginePanel";
import { ScalingPanel } from "@/components/results/ScalingPanel";
import { VelocityPanel } from "@/components/results/VelocityPanel";
import { CoordinationPanel } from "@/components/results/CoordinationPanel";
import { RoadmapPanel } from "@/components/results/RoadmapPanel";
import { CaseStudyPanel } from "@/components/results/CaseStudyPanel";
import { PdfExportButton } from "@/components/results/PdfExportButton";
import { ProgressTimelinePanel } from "@/components/results/ProgressTimelinePanel";
import { ComparisonPanel } from "@/components/results/ComparisonPanel";
import { AssessmentSelector } from "@/components/results/AssessmentSelector";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type ResultsTab = "overview" | "scaling" | "diagnosis" | "roadmap";

const TABS: { key: ResultsTab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "scaling", label: "Scaling", icon: "📈" },
  { key: "diagnosis", label: "Diagnosis", icon: "🔍" },
  { key: "roadmap", label: "Roadmap", icon: "🗺️" },
];

interface ResultsPageClientProps {
  result: AssessmentResult;
  email: string | null;
  hash: string;
}

export function ResultsPageClient({ result, email, hash }: ResultsPageClientProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("overview");
  const searchParams = useSearchParams();
  const compareHash = searchParams.get("compare");

  if (compareHash && email) {
    return (
      <TooltipPrimitive.Provider delayDuration={300}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Assessment Comparison
            </h1>
            <p className="text-sm text-gray-500">{result.companyName}</p>
          </div>
          <ComparisonPanel
            currentHash={hash}
            compareHash={compareHash}
            email={email}
          />
        </div>
      </TooltipPrimitive.Provider>
    );
  }

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Maturity Results
          </h1>
          <div className="flex items-center gap-3">
            {email && (
              <AssessmentSelector email={email} currentHash={hash} />
            )}
            <p className="text-sm text-gray-500">{result.companyName}</p>
            <PdfExportButton result={result} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScoreCard result={result} />
          <RadarChartPanel dimensions={result.dimensions} />
        </div>

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
              <ProgressTimelinePanel result={result} email={email} />
              <DimensionScorecard dimensions={result.dimensions} />
            </>
          )}

          {activeTab === "scaling" && (
            <>
              {result.meta && (
                <ScalingPanel
                  meta={result.meta}
                  thetaScore={result.thetaScore}
                />
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
              {result.caseStudies && result.caseStudies.length > 0 && (
                <CaseStudyPanel
                  caseStudies={result.caseStudies}
                  capabilityBottleneck={result.capabilityBottleneck}
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

        <div className="text-center text-sm text-gray-500 pt-4">
          <p>
            This is a saved assessment result.{" "}
            <a href="/assessment" className="text-indigo-600 hover:underline">
              Take a new assessment
            </a>
          </p>
        </div>
      </div>
    </TooltipPrimitive.Provider>
  );
}
