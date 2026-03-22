import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";
import type { AssessmentResult } from "@/lib/scoring/types";
import { ResultsPageClient } from "./ResultsPageClient";
import Link from "next/link";

interface Props {
  params: { hash: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = params;
  try {
    const rows = await db
      .select()
      .from(assessments)
      .where(eq(assessments.hash, hash))
      .limit(1);

    if (rows.length === 0) {
      return { robots: "noindex" };
    }

    const result = rows[0].resultSnapshot as unknown as AssessmentResult;
    const levelLabel = result.level?.label ?? "Unknown";
    const levelNum = result.level?.level ?? 0;
    const theta = result.thetaScore?.toFixed(0) ?? "0";
    const company = result.companyName || "Company";

    return {
      robots: "noindex",
      openGraph: {
        title: `AI Maturity Score: Level ${levelNum} — ${levelLabel}`,
        description: `\u03B8 ${theta}/100 — ${company} assessed across 6 dimensions of AI maturity`,
        type: "website",
        images: [{ url: "/og-default.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `AI Maturity Score: Level ${levelNum} — ${levelLabel}`,
        description: `\u03B8 ${theta}/100 — ${company} assessed across 6 dimensions of AI maturity`,
        images: ["/og-default.png"],
      },
    };
  } catch {
    return { robots: "noindex" };
  }
}

export default async function SavedResultsPage({ params }: Props) {
  const { hash } = params;

  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.hash, hash))
    .limit(1);

  if (rows.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Assessment Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This assessment link is invalid or has expired. Take a new
            assessment to get your AI maturity score.
          </p>
          <Link
            href="/assessment"
            className="inline-block px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            Take Assessment
          </Link>
        </div>
      </main>
    );
  }

  const row = rows[0];
  const result = row.resultSnapshot as unknown as AssessmentResult;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <ResultsPageClient result={result} />
      </div>
    </main>
  );
}
