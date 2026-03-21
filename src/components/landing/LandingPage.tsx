import Link from "next/link";
import { HeroSection } from "./HeroSection";
import { LevelsSection } from "./LevelsSection";
import { DimensionsSection } from "./DimensionsSection";
import { ValueSection } from "./ValueSection";

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <LevelsSection />
      <DimensionsSection />
      <ValueSection />
      <section
        aria-label="Call to Action"
        className="py-16 px-4 bg-gray-50 text-center"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <Link
            href="/assessment"
            className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Start Assessment
          </Link>
          <p className="text-sm text-gray-500">
            or{" "}
            <Link href="/glossary" className="text-blue-600 hover:underline">
              View Glossary
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
