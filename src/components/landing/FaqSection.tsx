const FAQ_ITEMS = [
  {
    question: "How long does the assessment take?",
    answer:
      "About 5 minutes. The assessment has 24 questions across 6 dimensions. Most people complete it in a single sitting.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. The assessment is completely free with no login required. After completing it, you can optionally save your results and get a shareable link — no account needed.",
  },
  {
    question: "What is the θ (theta) index?",
    answer:
      "The θ index is a weighted composite score (0–100) that measures your organisation's AI maturity across six dimensions: Strategy, Architecture, Workflow, Data, Talent, and Adoption. Higher scores indicate deeper AI integration and greater scaling potential.",
  },
  {
    question: "How accurate is the META prediction?",
    answer:
      "The META formula was validated against 62 real AI-native companies with an R² of 0.91. It provides a directional estimate, not a guarantee — actual timelines depend on market conditions, funding, and execution.",
  },
  {
    question: "What does 'superlinear scaling' mean?",
    answer:
      "Superlinear scaling means your output grows faster than your headcount. A scaling coefficient above 1.3 indicates that adding people multiplies rather than just adds output — the hallmark of AI-native organisations.",
  },
  {
    question: "Can I retake the assessment?",
    answer:
      "Yes, as many times as you like. Since there's no account, each assessment is independent. We recommend retaking it quarterly to track your AI maturity progression.",
  },
  {
    question: "Is my data stored anywhere?",
    answer:
      "Scoring happens entirely in your browser. If you choose to save your results, they are stored securely so you can revisit them via your unique link. We only store your scores and results — email and company name are optional. We never share your data with third parties.",
  },
  {
    question: "Who is this assessment for?",
    answer:
      "Founders, CTOs, and strategy leaders at companies evaluating or deepening their AI integration. It's particularly valuable for Series A–C startups and scale-ups planning their AI transformation roadmap.",
  },
] as const;

export function FaqSection() {
  return (
    <section
      aria-label="Frequently Asked Questions"
      className="py-16 px-4 bg-gray-50"
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-0">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="border-b border-gray-200 group"
            >
              <summary className="py-4 cursor-pointer text-left text-gray-900 font-medium flex items-center justify-between">
                {item.question}
                <span className="ml-2 text-gray-400 transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <p className="pb-4 text-sm text-gray-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
