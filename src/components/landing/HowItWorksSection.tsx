const STEPS = [
  {
    number: 1,
    icon: "📝",
    title: "Answer Questions",
    description:
      "Complete a focused assessment covering 6 dimensions of AI maturity — from strategy to adoption.",
    badge: "~5 minutes",
  },
  {
    number: 2,
    icon: "📊",
    title: "Get Your Score",
    description:
      "Receive your personalised θ index, META prediction, scaling velocity, and capability diagnosis instantly.",
    badge: "Instant results",
  },
  {
    number: 3,
    icon: "🎯",
    title: "Act on Insights",
    description:
      "Follow a prioritised intervention playbook and stage-specific roadmap to close your biggest gaps first.",
    badge: "Actionable",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section aria-label="How It Works" className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.number} className="text-center">
              <div className="text-4xl mb-4">{s.icon}</div>
              <div className="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-3">
                {s.badge}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-gray-600">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
