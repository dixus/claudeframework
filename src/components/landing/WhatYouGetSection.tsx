const PREVIEW_CARDS = [
  {
    icon: "🎯",
    title: "AI Maturity Score",
    description:
      "A weighted θ index (0–100) across 6 dimensions, placing you at one of 4 maturity levels.",
  },
  {
    icon: "🔮",
    title: "META Prediction",
    description:
      "Estimated months to €100M ARR based on your current AI maturity trajectory.",
  },
  {
    icon: "⚡",
    title: "Scaling Velocity",
    description:
      "Your scaling coefficient (S) showing whether growth is linear, sub-linear, or superlinear.",
  },
  {
    icon: "🔍",
    title: "Capability Diagnosis",
    description:
      "Bottleneck analysis across Strategy, Setup, Execution, and Operationalization capabilities.",
  },
  {
    icon: "📋",
    title: "Intervention Playbook",
    description:
      "Prioritised actions ranked by impact and effort to close your most critical capability gaps.",
  },
  {
    icon: "🗺️",
    title: "Stage Roadmap",
    description:
      "A stage-specific progression plan showing what to tackle now, next, and later.",
  },
] as const;

export function WhatYouGetSection() {
  return (
    <section aria-label="What You'll Get" className="py-16 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          What You&apos;ll Get
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PREVIEW_CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {c.title}
              </h3>
              <p className="text-sm text-gray-600">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
