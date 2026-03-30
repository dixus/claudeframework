import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCohort = {
  fundingStage: "series-a",
  growthEngine: "plg",
  label: "Series A + PLG",
  sampleSize: 142,
  meanTheta: 52.3,
  medianTheta: 50.1,
  p25Theta: 38.5,
  p75Theta: 63.2,
  dimensionMeans: {
    strategy: 55,
    architecture: 48,
    workflow: 52,
    data: 45,
    talent: 58,
    adoption: 50,
  },
};

vi.mock("@/lib/scoring/industry-benchmarks", () => ({
  getCohortBenchmark: vi.fn((fundingStage: string, growthEngine: string) => {
    const valid: Record<string, boolean> = {
      seed: true,
      "series-a": true,
      "series-b": true,
      growth: true,
    };
    const validEngines: Record<string, boolean> = {
      plg: true,
      slg: true,
      clg: true,
    };
    if (valid[fundingStage] && validEngines[growthEngine]) {
      return { ...mockCohort, fundingStage, growthEngine };
    }
    return null;
  }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

function makeGetRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/benchmarks${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/benchmarks", () => {
  it("TC14: returns 200 with cohort data for valid params", async () => {
    const req = makeGetRequest("?fundingStage=series-a&growthEngine=plg");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.meanTheta).toBeDefined();
    expect(data.medianTheta).toBeDefined();
    expect(data.sampleSize).toBeGreaterThan(0);
  });

  it("TC15: returns 400 for invalid fundingStage", async () => {
    const req = makeGetRequest("?fundingStage=invalid&growthEngine=plg");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/fundingStage/i);
  });

  it("TC16: returns 400 with no query params", async () => {
    const req = makeGetRequest("");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("TC17: returns 400 with valid fundingStage but missing growthEngine", async () => {
    const req = makeGetRequest("?fundingStage=series-a");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/growthEngine/i);
  });
});
