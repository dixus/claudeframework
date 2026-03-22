const DIMENSIONS = [
  {
    label: "Strategy",
    weight: "25%",
    emoji: "\uD83C\uDFAF",
    description:
      "Measures AI vision clarity, executive commitment, and strategic roadmap maturity. Carries the highest weight (25%) because strategic alignment has a superlinear impact on scaling velocity. Good looks like: a board-approved AI-first strategy with quarterly OKRs tied to AI adoption metrics.",
  },
  {
    label: "Architecture",
    weight: "20%",
    emoji: "\uD83C\uDFD7\uFE0F",
    description:
      "Evaluates technical infrastructure, AI platform readiness, and system integration depth. Weighted at 20% because architecture determines the ceiling for all other capabilities. Good looks like: modular AI-ready infrastructure with real-time data pipelines and automated deployment.",
  },
  {
    label: "Workflow",
    weight: "15%",
    emoji: "\u2699\uFE0F",
    description:
      "Assesses process redesign around AI capabilities and human-AI task allocation. At 15%, it captures how effectively the organisation translates AI tools into operational leverage. Good looks like: end-to-end workflows where AI handles routine decisions and humans focus on exceptions.",
  },
  {
    label: "Data",
    weight: "15%",
    emoji: "\uD83D\uDCCA",
    description:
      "Examines data quality, pipeline reliability, and governance frameworks. Weighted equally with Workflow at 15% because clean, accessible data is the fuel for every AI capability. Good looks like: unified data platform with automated quality checks, lineage tracking, and access controls.",
  },
  {
    label: "Talent",
    weight: "15%",
    emoji: "\uD83C\uDF93",
    description:
      "Measures AI skills density, hiring strategy, and upskilling programmes across the organisation. At 15%, it reflects that people are the bottleneck in most AI transformations. Good looks like: AI literacy across all roles, dedicated ML engineering team, and continuous learning budget.",
  },
  {
    label: "Adoption",
    weight: "10%",
    emoji: "\uD83D\uDE80",
    description:
      "Tracks organisational change management, AI tool usage rates, and cultural readiness. Weighted at 10% because adoption follows naturally when Strategy, Architecture, and Talent are strong. Good looks like: 80%+ active usage of AI tools with bottom-up experimentation culture.",
  },
] as const;

export function DimensionsSection() {
  return (
    <section
      aria-label="Assessment Dimensions"
      className="py-16 px-4 bg-gray-50"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Assessment Dimensions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DIMENSIONS.map((d) => (
            <div
              key={d.label}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="text-3xl mb-3">{d.emoji}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {d.label}
                </h3>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {d.weight}
                </span>
              </div>
              <p className="text-sm text-gray-600">{d.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
