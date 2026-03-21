const VALUE_PROPS = [
  {
    icon: "\uD83C\uDFAF",
    title: "Personalised \u03B8 Score",
    description:
      "Get a weighted composite score measuring your AI maturity across six dimensions — plus a META score predicting your time to \u20AC100M ARR.",
  },
  {
    icon: "\uD83D\uDCCB",
    title: "Capability Diagnosis",
    description:
      "Identify your scaling bottleneck across 4 capabilities (Strategy, Setup, Execution, Operationalization) using the validated SST framework.",
  },
  {
    icon: "\uD83D\uDCC8",
    title: "Superlinear Scaling",
    description:
      "See where you fall on the scaling curve — from linear (0.8) to superlinear (1.8) — benchmarked against 62 AI-native companies.",
  },
] as const;

export function ValueSection() {
  return (
    <section
      aria-label="Why Take the Assessment"
      className="py-16 px-4 bg-white"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Why Take the Assessment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="text-center">
              <div className="text-4xl mb-4">{v.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {v.title}
              </h3>
              <p className="text-sm text-gray-600">{v.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
