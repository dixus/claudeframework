import Link from "next/link";

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI Maturity Framework
        </h1>
        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
          Measure your organisation&apos;s AI maturity across 6 dimensions and
          receive a personalised score with actionable recommendations.
        </p>
        <Link
          href="/assessment"
          className="inline-block px-8 py-4 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
        >
          Start Assessment
        </Link>
      </div>
    </section>
  );
}
