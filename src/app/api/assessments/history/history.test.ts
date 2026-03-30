import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  assessments: {
    email: "email_col",
    createdAt: "created_at_col",
    hash: "hash_col",
    overallScore: "overall_score_col",
    dimensionScores: "dimension_scores_col",
    resultSnapshot: "result_snapshot_col",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  asc: (col: unknown) => ({ asc: col }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/assessments/history", () => {
  it("TC12: returns 200 with array of assessment objects for a valid email", async () => {
    const rows = [
      {
        hash: "hash1",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        overallScore: "55.00",
        dimensionScores: { strategy: 50, architecture: 60 },
        resultSnapshot: { thetaScore: 55 },
      },
      {
        hash: "hash2",
        createdAt: new Date("2026-02-01T00:00:00Z"),
        overallScore: "70.00",
        dimensionScores: { strategy: 65, architecture: 75 },
        resultSnapshot: { thetaScore: 70 },
      },
    ];
    mockLimit.mockResolvedValueOnce(rows);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/history?email=test@example.com",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].hash).toBe("hash1");
    expect(data[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(data[0].overallScore).toBe("55.00");
    expect(data[0].dimensionScores).toEqual({
      strategy: 50,
      architecture: 60,
    });
    expect(data[1].hash).toBe("hash2");
    expect(data[1].createdAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("TC13: returns 400 when email parameter is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/assessments/history",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/email/i);
  });

  it("TC14: returns 200 with empty array when no rows found", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/history?email=nobody@example.com",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});
