import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      hash: assessments.hash,
      createdAt: assessments.createdAt,
      overallScore: assessments.overallScore,
      dimensionScores: assessments.dimensionScores,
      resultSnapshot: assessments.resultSnapshot,
    })
    .from(assessments)
    .where(eq(assessments.email, email))
    .orderBy(asc(assessments.createdAt))
    .limit(20);

  return NextResponse.json(
    rows.map((row) => ({
      hash: row.hash,
      createdAt: row.createdAt.toISOString(),
      overallScore: row.overallScore,
      dimensionScores: row.dimensionScores,
      result: row.resultSnapshot,
    })),
  );
}
