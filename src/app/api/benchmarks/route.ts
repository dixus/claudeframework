import { NextRequest, NextResponse } from "next/server";
import { getCohortBenchmark } from "@/lib/scoring/industry-benchmarks";

const VALID_FUNDING_STAGES = [
  "seed",
  "series-a",
  "series-b",
  "growth",
] as const;
const VALID_GROWTH_ENGINES = ["plg", "slg", "clg"] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fundingStage = searchParams.get("fundingStage");
  const growthEngine = searchParams.get("growthEngine");

  if (!fundingStage) {
    return NextResponse.json(
      { error: "fundingStage query parameter is required" },
      { status: 400 },
    );
  }

  if (!growthEngine) {
    return NextResponse.json(
      { error: "growthEngine query parameter is required" },
      { status: 400 },
    );
  }

  if (
    !VALID_FUNDING_STAGES.includes(
      fundingStage as (typeof VALID_FUNDING_STAGES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: `Invalid fundingStage: "${fundingStage}". Must be one of: ${VALID_FUNDING_STAGES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (
    !VALID_GROWTH_ENGINES.includes(
      growthEngine as (typeof VALID_GROWTH_ENGINES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: `Invalid growthEngine: "${growthEngine}". Must be one of: ${VALID_GROWTH_ENGINES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const cohort = getCohortBenchmark(
    fundingStage as (typeof VALID_FUNDING_STAGES)[number],
    growthEngine as (typeof VALID_GROWTH_ENGINES)[number],
  );

  if (!cohort) {
    return NextResponse.json(
      { error: "No benchmark data available for this cohort" },
      { status: 404 },
    );
  }

  return NextResponse.json(cohort);
}
