import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: { hash: string } },
) {
  const { hash } = params;

  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.hash, hash))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 },
    );
  }

  const row = rows[0];

  return NextResponse.json({
    hash: row.hash,
    result: row.resultSnapshot,
    dimensionScores: row.dimensionScores,
    growthEngine: row.growthEngine,
    createdAt: row.createdAt.toISOString(),
  });
}
