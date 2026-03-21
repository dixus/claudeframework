"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { ScoreCard } from "./ScoreCard";
import { RadarChartPanel } from "./RadarChartPanel";
import { DimensionScorecard } from "./DimensionScorecard";
import { BottleneckPanel } from "./BottleneckPanel";
import { InsightsPanel } from "./InsightsPanel";
import { PlaybookPanel } from "./PlaybookPanel";
import { CapabilityPanel } from "./CapabilityPanel";
import { CapabilityPlaybookPanel } from "./CapabilityPlaybookPanel";
import { ScalingPanel } from "./ScalingPanel";
import { PdfExportButton } from "./PdfExportButton";

export function ResultsPage() {
  const result = useAssessmentStore((s) => s.result);
  const reset = useAssessmentStore((s) => s.reset);

  if (!result) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Your AI Maturity Results
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{result.companyName}</p>
          <PdfExportButton result={result} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreCard result={result} />
        <RadarChartPanel dimensions={result.dimensions} />
      </div>

      {result.meta && (
        <ScalingPanel meta={result.meta} thetaScore={result.thetaScore} />
      )}

      {result.capabilities && result.capabilityBottleneck && (
        <CapabilityPanel
          capabilities={result.capabilities}
          bottleneck={result.capabilityBottleneck}
        />
      )}

      {result.playbook && (
        <CapabilityPlaybookPanel playbook={result.playbook} />
      )}

      <InsightsPanel result={result} />
      <DimensionScorecard dimensions={result.dimensions} />
      <BottleneckPanel bottleneck={result.bottleneck} />
      <PlaybookPanel result={result} />

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
