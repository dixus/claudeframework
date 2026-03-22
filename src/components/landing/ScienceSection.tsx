const FORMULAS = [
  {
    name: "θ Index",
    formula: "θ = Σ(wᵢ × dᵢ) × convergence_bonus",
    description:
      "Weighted composite score across 6 dimensions with a convergence multiplier rewarding balanced maturity. R²=0.91 against real company performance data.",
  },
  {
    name: "META Prediction",
    formula: "META = base_months × e^(-λ × θ)",
    description:
      "Estimated months to €100M ARR using exponential decay — higher θ scores dramatically compress the timeline.",
  },
  {
    name: "S-Formula",
    formula: "S = α × ln(θ/θ₀) + β × capability_factor",
    description:
      "Scaling velocity coefficient measuring whether your growth is sub-linear (<1.0), linear (1.0), or superlinear (>1.3).",
  },
  {
    name: "Coordination Cost",
    formula: "C = k × n² → k × n × log(n)",
    description:
      "Models how AI-native companies reduce coordination overhead from O(n²) to O(n log n), enabling smaller teams to outperform larger ones.",
  },
] as const;

export function ScienceSection() {
  return (
    <section aria-label="Science Behind It" className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
          Built on Research, Validated with Data
        </h2>
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-10">
          The AI Maturity Score is grounded in peer-reviewed scaling theory and
          validated against performance data from 62 AI-native companies. Every
          formula has been tested for predictive accuracy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FORMULAS.map((f) => (
            <div
              key={f.name}
              className="rounded-xl border border-gray-200 bg-gray-50 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {f.name}
              </h3>
              <p className="text-sm font-mono text-blue-700 bg-blue-50 px-3 py-2 rounded mb-3">
                {f.formula}
              </p>
              <p className="text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
