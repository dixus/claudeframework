import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});

const mockLimit = vi.fn();
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({ where: mockWhere }),
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  assessments: { hash: "hash_col" },
}));

vi.mock("nanoid", () => ({
  nanoid: () => "abcdefghij1234567890x",
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import { POST } from "./route";
import { GET } from "./[hash]/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validDimensionScores = {
  strategy: 3.5,
  architecture: 4.0,
  workflow: 3.0,
  data: 2.5,
  talent: 4.5,
  adoption: 3.0,
};

const validResult = {
  companyName: "Acme Corp",
  thetaScore: 67.4,
  rawLevel: 2,
  gated: false,
  gatingDetails: [],
  level: {
    level: 2,
    label: "AI-Enabled",
    monthsTo100M: 30,
    arrPerEmployee: "400K",
  },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 0.25, score: 3.5 },
    { key: "architecture", label: "Architecture", weight: 0.2, score: 4.0 },
    { key: "workflow", label: "Workflow", weight: 0.15, score: 3.0 },
    { key: "data", label: "Data", weight: 0.15, score: 2.5 },
    { key: "talent", label: "Talent", weight: 0.15, score: 4.5 },
    { key: "adoption", label: "Adoption", weight: 0.1, score: 3.0 },
  ],
  bottleneck: {
    dimension: "data",
    score: 2.5,
    gap: 1.5,
    actions: ["Improve data"],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/assessments", () => {
  it("returns hash and url for a valid full payload", async () => {
    const req = makeRequest({
      dimensionScores: validDimensionScores,
      result: validResult,
      email: "test@example.com",
      companyName: "Acme Corp",
      capabilityScores: { c1_strategy: 3 },
      enablerScores: { fundingStage: "seed" },
      growthEngine: "product",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hash).toBe("abcdefghij1234567890x");
    expect(data.hash).toHaveLength(21);
    expect(data.url).toBe("/results/abcdefghij1234567890x");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns hash and url for a minimal payload", async () => {
    const req = makeRequest({
      dimensionScores: validDimensionScores,
      result: validResult,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hash).toBe("abcdefghij1234567890x");
    expect(data.url).toBe("/results/abcdefghij1234567890x");
  });

  it("returns 400 when dimensionScores is missing", async () => {
    const req = makeRequest({ result: validResult });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/dimensionScores/);
  });

  it("returns 400 when result is missing", async () => {
    const req = makeRequest({ dimensionScores: validDimensionScores });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/result/);
  });

  it("returns 400 for an invalid email format", async () => {
    const req = makeRequest({
      dimensionScores: validDimensionScores,
      result: validResult,
      email: "not-an-email",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/email/);
  });
});

describe("GET /api/assessments/[hash]", () => {
  it("returns result snapshot for a valid hash", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        hash: "abcdefghij1234567890x",
        resultSnapshot: validResult,
        dimensionScores: validDimensionScores,
        growthEngine: "product",
        createdAt: new Date("2026-03-22T12:00:00Z"),
        email: "secret@example.com",
        userAgent: "Mozilla/5.0",
        referrer: "https://google.com",
      },
    ]);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/abcdefghij1234567890x",
    );

    const res = await GET(req, { params: { hash: "abcdefghij1234567890x" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hash).toBe("abcdefghij1234567890x");
    expect(data.result).toEqual(validResult);
    expect(data.dimensionScores).toEqual(validDimensionScores);
    expect(data.createdAt).toBe("2026-03-22T12:00:00.000Z");
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("userAgent");
    expect(data).not.toHaveProperty("referrer");
  });

  it("returns 404 for an unknown hash", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3000/api/assessments/nonexistenthash12345",
    );

    const res = await GET(req, { params: { hash: "nonexistenthash12345" } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });
});
