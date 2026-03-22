import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DIMENSION_KEYS = [
  "strategy",
  "architecture",
  "workflow",
  "data",
  "talent",
  "adoption",
];

function validateBody(body: Record<string, unknown>): string | null {
  if (!body.dimensionScores || typeof body.dimensionScores !== "object") {
    return "dimensionScores is required and must be an object";
  }

  const ds = body.dimensionScores as Record<string, unknown>;
  for (const key of DIMENSION_KEYS) {
    if (typeof ds[key] !== "number" || ds[key] < 0 || ds[key] > 100) {
      return `dimensionScores.${key} must be a number between 0 and 100`;
    }
  }

  if (!body.result || typeof body.result !== "object") {
    return "result is required and must be an object";
  }

  const result = body.result as Record<string, unknown>;
  if (typeof result.thetaScore !== "number") {
    return "result.thetaScore is required and must be a number";
  }
  if (!Array.isArray(result.dimensions)) {
    return "result.dimensions is required and must be an array";
  }

  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
      return "email must be a valid email address";
    }
  }

  if (body.companyName !== undefined && body.companyName !== null) {
    if (typeof body.companyName !== "string" || body.companyName.length > 255) {
      return "companyName must be a string with max 255 characters";
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const error = validateBody(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const hash = nanoid();
  const result = body.result as Record<string, unknown>;
  const dimensionScores = body.dimensionScores as Record<string, number>;

  await db.insert(assessments).values({
    hash,
    email: (body.email as string) || null,
    companyName: (body.companyName as string) || null,
    overallScore: String(result.thetaScore),
    dimensionScores,
    capabilityScores:
      (body.capabilityScores as Record<string, unknown>) ?? null,
    enablerScores: (body.enablerScores as Record<string, unknown>) ?? null,
    growthEngine: (body.growthEngine as string) || null,
    resultSnapshot: body.result as Record<string, unknown>,
    userAgent: request.headers.get("user-agent") || null,
    referrer: request.headers.get("referer") || null,
  });

  const url = `/results/${hash}`;

  return NextResponse.json({ hash, url });
}
