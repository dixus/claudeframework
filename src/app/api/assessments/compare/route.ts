import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const before = request.nextUrl.searchParams.get("before");
  const after = request.nextUrl.searchParams.get("after");

  if (!before || !after) {
    return NextResponse.json(
      { error: "both 'before' and 'after' query parameters are required" },
      { status: 400 },
    );
  }

  const [beforeRows, afterRows] = await Promise.all([
    db
      .select({
        hash: assessments.hash,
        resultSnapshot: assessments.resultSnapshot,
        createdAt: assessments.createdAt,
        companyName: assessments.companyName,
      })
      .from(assessments)
      .where(eq(assessments.hash, before))
      .limit(1),
    db
      .select({
        hash: assessments.hash,
        resultSnapshot: assessments.resultSnapshot,
        createdAt: assessments.createdAt,
        companyName: assessments.companyName,
      })
      .from(assessments)
      .where(eq(assessments.hash, after))
      .limit(1),
  ]);

  if (beforeRows.length === 0 || afterRows.length === 0) {
    return NextResponse.json(
      { error: "one or both assessments not found" },
      { status: 404 },
    );
  }

  const beforeRow = beforeRows[0];
  const afterRow = afterRows[0];

  return NextResponse.json({
    before: {
      result: beforeRow.resultSnapshot,
      createdAt: beforeRow.createdAt.toISOString(),
      companyName: beforeRow.companyName,
    },
    after: {
      result: afterRow.resultSnapshot,
      createdAt: afterRow.createdAt.toISOString(),
      companyName: afterRow.companyName,
    },
  });
}
