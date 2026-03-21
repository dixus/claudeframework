"use client";

import { useState } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";
import {
  GROWTH_ENGINE_QUESTIONS,
  GROWTH_ENGINES,
  classifyGrowthEngine,
} from "@/lib/scoring/growth-engines";
import type {
  GrowthEngineType,
  GrowthEngineAnswers,
} from "@/lib/scoring/growth-engines";

const ENGINE_ICONS: Record<GrowthEngineType, string> = {
  plg: "🚀",
  slg: "🤝",
  clg: "🌐",
  hybrid: "⚡",
};

export function GrowthEngineStep() {
  const setGrowthEngine = useAssessmentStore((s) => s.setGrowthEngine);
  const nextStep = useAssessmentStore((s) => s.nextStep);
  const prevStep = useAssessmentStore((s) => s.prevStep);

  const [answers, setAnswers] = useState<GrowthEngineAnswers>({});

  const allAnswered =
    Object.keys(answers).length === GROWTH_ENGINE_QUESTIONS.length;
  const classified = allAnswered ? classifyGrowthEngine(answers) : null;
  const engine = classified ? GROWTH_ENGINES[classified] : null;

  // Compute confidence as the fraction of answers pointing to the classified engine
  const confidence =
    classified && classified !== "hybrid" && allAnswered
      ? Math.round(
          (Object.values(answers).filter((a) => a === classified).length /
            GROWTH_ENGINE_QUESTIONS.length) *
            100,
        )
      : null;

  function handleSelect(questionId: string, engineType: GrowthEngineType) {
    const updated = { ...answers, [questionId]: engineType };
    setAnswers(updated);
    if (Object.keys(updated).length === GROWTH_ENGINE_QUESTIONS.length) {
      const result = classifyGrowthEngine(updated);
      setGrowthEngine(result);
    }
  }

  function handleNext() {
    if (classified) {
      setGrowthEngine(classified);
      nextStep();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Growth Engine Classification
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Identify your go-to-market model to prioritise the right scaling
          dimensions for your company.
        </p>
      </div>

      <div className="space-y-6">
        {GROWTH_ENGINE_QUESTIONS.map((q) => (
          <div key={q.id}>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {q.question}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.engine;
                return (
                  <button
                    key={opt.engine}
                    onClick={() => handleSelect(q.id, opt.engine)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="text-2xl leading-none mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      >
                        {ENGINE_ICONS[opt.engine]}
                      </span>
                      <div>
                        <p
                          className={`text-sm font-medium ${selected ? "text-blue-900" : "text-gray-900"}`}
                        >
                          {opt.label}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${selected ? "text-blue-700" : "text-gray-500"}`}
                        >
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {engine && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-green-800">
              <span className="mr-2" aria-hidden="true">
                {ENGINE_ICONS[engine.type]}
              </span>
              Your growth engine: {engine.label} ({engine.shortLabel})
            </p>
            {confidence !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 whitespace-nowrap">
                {confidence}% confidence
              </span>
            )}
          </div>
          <p className="text-xs text-green-700 mt-1">{engine.description}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allAnswered}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
