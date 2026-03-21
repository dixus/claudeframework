"use client";

import { useAssessmentStore } from "@/store/assessmentStore";
import { QUESTIONS } from "@/lib/scoring/questions";
import type { DimensionKey } from "@/lib/scoring/types";
import { LikertCard } from "./LikertCard";
import { ProgressBar } from "./ProgressBar";

const DIMENSION_META: Record<DimensionKey, { label: string; weight: number }> =
  {
    strategy: { label: "Strategy", weight: 0.2 },
    architecture: { label: "Architecture", weight: 0.15 },
    workflow: { label: "Workflow", weight: 0.25 },
    data: { label: "Data", weight: 0.15 },
    talent: { label: "Talent", weight: 0.15 },
    adoption: { label: "Adoption", weight: 0.1 },
  };

const DIMENSION_ORDER: DimensionKey[] = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

interface DimensionStepProps {
  dimension: DimensionKey;
}

export function DimensionStep({ dimension }: DimensionStepProps) {
  const responses = useAssessmentStore((s) => s.responses);
  const setAnswer = useAssessmentStore((s) => s.setAnswer);
  const nextStep = useAssessmentStore((s) => s.nextStep);
  const prevStep = useAssessmentStore((s) => s.prevStep);
  const step = useAssessmentStore((s) => s.step);

  const meta = DIMENSION_META[dimension];
  const dimIndex = DIMENSION_ORDER.indexOf(dimension) + 1;

  return (
    <div className="space-y-5">
      <ProgressBar progress={dimIndex / 6} />
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{meta.label}</h2>
        <span className="text-sm text-gray-500">
          {dimIndex} of 6 &middot; weight {Math.round(meta.weight * 100)}%
        </span>
      </div>
      <div className="space-y-3">
        {QUESTIONS[dimension].map((question, index) => (
          <LikertCard
            key={index}
            question={question}
            value={responses[dimension][index]}
            onChange={(value) => setAnswer(dimension, index, value)}
          />
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={prevStep}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
