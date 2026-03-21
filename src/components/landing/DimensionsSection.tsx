const DIMENSIONS = [
  {
    label: "Strategy",
    weight: "20%",
    emoji: "\uD83C\uDFAF",
    description: "AI vision, roadmap, and executive commitment",
  },
  {
    label: "Architecture",
    weight: "15%",
    emoji: "\uD83C\uDFD7\uFE0F",
    description: "Technical infrastructure and AI platform readiness",
  },
  {
    label: "Workflow",
    weight: "25%",
    emoji: "\u2699\uFE0F",
    description: "Process redesign and AI-human task allocation",
  },
  {
    label: "Data",
    weight: "15%",
    emoji: "\uD83D\uDCCA",
    description: "Data quality, pipelines, and governance",
  },
  {
    label: "Talent",
    weight: "15%",
    emoji: "\uD83C\uDF93",
    description: "AI skills, hiring, and upskilling programs",
  },
  {
    label: "Adoption",
    weight: "10%",
    emoji: "\uD83D\uDE80",
    description: "Organizational change management and AI usage",
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
