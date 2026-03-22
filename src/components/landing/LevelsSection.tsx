const LEVELS = [
  {
    level: 0,
    label: "Traditional",
    thetaRange: "0\u201320",
    arrPerEmployee: "\u20AC150\u2013200K",
    scaling: "Linear (0.8\u20131.0)",
    description: "No AI integration in core operations",
    characteristics: [
      "Manual processes dominate operations",
      "AI exploration limited to isolated experiments",
      "Decision-making relies on intuition and spreadsheets",
    ],
    profile:
      "Early-stage companies or traditional enterprises yet to begin their AI journey.",
  },
  {
    level: 1,
    label: "AI-Powered",
    thetaRange: "21\u201350",
    arrPerEmployee: "\u20AC200\u2013600K",
    scaling: "Sub-linear (1.0\u20131.2)",
    description: "AI substitutes human labour in existing workflows",
    characteristics: [
      "AI tools adopted for specific repetitive tasks",
      "Existing workflows enhanced but not redesigned",
      "Data infrastructure emerging but fragmented",
    ],
    profile:
      "Growth-stage companies using AI as a productivity multiplier within existing processes.",
  },
  {
    level: 2,
    label: "AI-Enabled",
    thetaRange: "51\u201380",
    arrPerEmployee: "\u20AC400K\u20132M",
    scaling: "Linear+ (1.2\u20131.5)",
    description: "AI augments capabilities through workflow redesign",
    characteristics: [
      "Workflows fundamentally redesigned around AI capabilities",
      "Cross-functional AI integration across departments",
      "Data pipelines mature with automated quality governance",
    ],
    profile:
      "Scale-ups where AI is woven into the operating model, not just bolted on.",
  },
  {
    level: 3,
    label: "AI-Native",
    thetaRange: "81\u2013100",
    arrPerEmployee: "\u20AC700K\u20136M",
    scaling: "Superlinear (1.3\u20131.8)",
    description: "AI orchestrates multi-agent human-AI systems",
    characteristics: [
      "Multi-agent AI systems handle end-to-end processes",
      "Human roles shift to oversight, creativity, and strategy",
      "Coordination costs follow O(n log n) instead of O(n\u00B2)",
    ],
    profile:
      "Companies like Midjourney and Cursor achieving $2M+ ARR per employee.",
  },
] as const;

export function LevelsSection() {
  return (
    <section aria-label="Maturity Levels" className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Maturity Levels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {LEVELS.map((l) => (
            <div
              key={l.level}
              className="rounded-xl border border-gray-200 bg-gray-50 p-6"
            >
              <div className="text-sm font-medium text-blue-600 mb-1">
                Level {l.level}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {l.label}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{l.description}</p>
              <ul className="text-xs text-gray-600 list-disc pl-4 mb-3 space-y-1">
                {l.characteristics.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="text-xs italic text-gray-500 mb-3">{l.profile}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  {"\u03B8"} Score: {l.thetaRange}
                </p>
                <p>ARR/Employee: {l.arrPerEmployee}</p>
                <p>Scaling: {l.scaling}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
