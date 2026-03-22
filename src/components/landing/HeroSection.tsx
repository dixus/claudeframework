import Link from "next/link";

const PROOF_POINTS = [
  { value: "2–10x", label: "better unit economics" },
  { value: "2–3x", label: "faster to €100M ARR" },
  { value: "1.3–1.8", label: "superlinear scaling coefficient" },
] as const;

const EXAMPLES = [
  { name: "Midjourney", stat: "$4.6M ARR/employee", detail: "107 people" },
  { name: "Cursor", stat: "$2.5M ARR/employee", detail: "<200 people" },
  { name: "Perplexity", stat: "$2.5M ARR/employee", detail: "80 people" },
] as const;

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4"
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-3">
          AI-Native Scaling Framework
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI Maturity Score
        </h1>
        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-4">
          AI-native companies reach €100M ARR 2–3x faster with 50–70% fewer
          people. Find out where you stand — and what to fix first.
        </p>
        <p className="text-blue-200 text-sm mb-8">
          Free · 5 minutes · No login required · Save & share your results
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
          {PROOF_POINTS.map((p) => (
            <div key={p.label}>
              <p className="text-2xl md:text-3xl font-bold">{p.value}</p>
              <p className="text-xs text-blue-200">{p.label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/assessment"
          className="inline-block px-8 py-4 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
        >
          Start Free Assessment
        </Link>

        <div className="mt-10 pt-6 border-t border-blue-500/30">
          <p className="text-xs text-blue-300 mb-3">
            Validated against real AI-native companies
          </p>
          <div className="flex justify-center gap-6">
            {EXAMPLES.map((e) => (
              <div key={e.name} className="text-center">
                <p className="text-sm font-semibold">{e.name}</p>
                <p className="text-xs text-blue-200">{e.stat}</p>
                <p className="text-xs text-blue-300">{e.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
