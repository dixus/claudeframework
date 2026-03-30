import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  assessments: { hash: "hash_col" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

const makeResult = (theta: number, level: number) => ({
  companyName: "Acme Corp",
  thetaScore: theta,
  rawLevel: level,
  gated: false,
  gatingDetails: [],
  level: { level, label: `Level ${level}`, monthsTo100M: 30, arrPerEmployee: "400K" },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 0.25, score: theta / 20 },
    { key: "architecture", label: "Architecture", weight: 0.2, score: 4.0 },
    { key: "workflow", label: "Workflow", weight: 0.15, score: 3.0 },
    { key: "data", label: "Data", weight: 0.15, score: 2.5 },
    { key: "talent", label: "Talent", weight: 0.15, score: 4.5 },
    { key: "adoption", label: "Adoption", weight: 0.1, score: 3.0 },
  ],
  bottleneck: { dimension: "data", score: 2.5, gap: 1.5, actions: ["Improve data"] },
});

const mockRow = (hash: string, theta: number, level: number) => ({
  hash,
  resultSnapshot: makeResult(theta, level),
  createdAt: new Date("2026-03-22T12:00:00Z"),
  companyName: "Acme Corp",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/assessments/compare", () => {
  it("TC10: returns 200 with both assessments for valid before and after hashes", async () => {
    // First call for "before" hash, second call for "after" hash
    mockLimit
      .mockResolvedValueOnce([mockRow("hash-before-12345", 50, 2)])
      .mockResolvedValueOnce([mockRow("hash-after-123456", 70, 3)]);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/compare?before=hash-before-12345&after=hash-after-123456",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.before).toBeDefined();
    expect(data.after).toBeDefined();
    expect(data.before.result.thetaScore).toBe(50);
    expect(data.after.result.thetaScore).toBe(70);
    expect(data.before.createdAt).toBe("2026-03-22T12:00:00.000Z");
    expect(data.after.createdAt).toBe("2026-03-22T12:00:00.000Z");
    expect(data.before.companyName).toBe("Acme Corp");
    expect(data.after.companyName).toBe("Acme Corp");
  });

  it("TC11: returns 400 when before parameter is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/assessments/compare?after=hash-after-123456",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("TC12: returns 404 when a hash is not found", async () => {
    mockLimit
      .mockResolvedValueOnce([mockRow("hash-before-12345", 50, 2)])
      .mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/compare?before=hash-before-12345&after=nonexistent-hash123",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it("TC13: returns 400 when both params are missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/assessments/compare",
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
