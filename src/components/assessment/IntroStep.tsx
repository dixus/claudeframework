"use client";

import { useAssessmentStore } from "@/store/assessmentStore";

const DIMENSIONS = [
  { emoji: "🎯", label: "Strategy", weight: "25%" },
  { emoji: "🏗️", label: "Architecture", weight: "20%" },
  { emoji: "⚙️", label: "Workflow", weight: "15%" },
  { emoji: "📊", label: "Data", weight: "15%" },
  { emoji: "🎓", label: "Talent", weight: "15%" },
  { emoji: "🚀", label: "Adoption", weight: "10%" },
] as const;

const PHASES = [
  {
    step: "1",
    title: "Company Context",
    description: "Industry, stage, and growth model",
  },
  {
    step: "2",
    title: "Screening",
    description: "6 questions — one per dimension",
  },
  {
    step: "3",
    title: "Deep Dive",
    description: "Adaptive follow-ups based on your answers",
  },
] as const;

export function IntroStep() {
  const nextStep = useAssessmentStore((s) => s.nextStep);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-blue-600 tracking-wide uppercase">
          AI Maturity Assessment
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          Measure Your AI Readiness
        </h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          This adaptive assessment evaluates your organisation across six
          weighted dimensions. Questions adjust to your maturity level — the
          more advanced you are, the deeper we go.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PHASES.map((p) => (
            <div key={p.step} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                {p.step}
              </span>
              <div>
                <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                <p className="text-xs text-gray-500">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Dimensions evaluated
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DIMENSIONS.map((d) => (
            <div
              key={d.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white"
            >
              <span className="text-lg">{d.emoji}</span>
              <span className="text-sm font-medium text-gray-700">
                {d.label}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{d.weight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What you get */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          What you&apos;ll receive
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">&#10003;</span>
            Overall maturity score with confidence interval
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">&#10003;</span>
            Per-dimension breakdown and radar chart
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">&#10003;</span>
            Prioritised intervention roadmap
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">&#10003;</span>
            Scaling velocity and growth engine analysis
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center space-y-2">
        <button
          onClick={nextStep}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Start Assessment
        </button>
        <p className="text-xs text-gray-400">
          Takes 5–10 minutes &middot; Adaptive &middot; No sign-up required
        </p>
      </div>
    </div>
  );
}
