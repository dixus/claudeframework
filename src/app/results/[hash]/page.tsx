import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";
import type { AssessmentResult } from "@/lib/scoring/types";
import { ResultsPageClient } from "./ResultsPageClient";
import Link from "next/link";

export const metadata: Metadata = {
  robots: "noindex",
};

interface Props {
  params: { hash: string };
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
