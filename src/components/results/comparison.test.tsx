// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ComparisonPanel } from "./ComparisonPanel";
import { AssessmentSelector } from "./AssessmentSelector";
import type { AssessmentResult } from "@/lib/scoring/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    companyName: "TestCo",
    thetaScore: 50,
    rawLevel: 2,
    level: { level: 2, label: "Developing", monthsTo100M: 48, arrPerEmployee: "80k" },
    gated: false,
    gatingDetails: [],
    bottleneck: { dimension: "data", score: 30, gap: 20, actions: ["Fix data"] },
    dimensions: [
      { key: "strategy", label: "Strategy", weight: 1, score: 60 },
      { key: "architecture", label: "Architecture", weight: 1, score: 50 },
      { key: "workflow", label: "Workflow", weight: 1, score: 45 },
      { key: "data", label: "Data", weight: 1, score: 30 },
      { key: "talent", label: "Talent", weight: 1, score: 55 },
      { key: "adoption", label: "Adoption", weight: 1, score: 60 },
    ],
    ...overrides,
  };
}

const beforeResult = makeResult({
  thetaScore: 45,
  level: { level: 2, label: "Developing", monthsTo100M: 48, arrPerEmployee: "80k" },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 1, score: 40 },
    { key: "architecture", label: "Architecture", weight: 1, score: 50 },
    { key: "workflow", label: "Workflow", weight: 1, score: 45 },
    { key: "data", label: "Data", weight: 1, score: 30 },
    { key: "talent", label: "Talent", weight: 1, score: 55 },
    { key: "adoption", label: "Adoption", weight: 1, score: 50 },
  ],
  capabilities: [
    { key: "c1_strategy", label: "Strategy", score: 40 },
    { key: "c2_setup", label: "Setup", score: 50 },
    { key: "c3_execution", label: "Execution", score: 45 },
    { key: "c4_operationalization", label: "Operationalization", score: 35 },
  ],
});

const afterResult = makeResult({
  thetaScore: 65,
  level: { level: 3, label: "Advancing", monthsTo100M: 36, arrPerEmployee: "120k" },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 1, score: 70 },
    { key: "architecture", label: "Architecture", weight: 1, score: 60 },
    { key: "workflow", label: "Workflow", weight: 1, score: 55 },
    { key: "data", label: "Data", weight: 1, score: 50 },
    { key: "talent", label: "Talent", weight: 1, score: 65 },
    { key: "adoption", label: "Adoption", weight: 1, score: 90 },
  ],
  capabilities: [
    { key: "c1_strategy", label: "Strategy", score: 60 },
    { key: "c2_setup", label: "Setup", score: 65 },
    { key: "c3_execution", label: "Execution", score: 55 },
    { key: "c4_operationalization", label: "Operationalization", score: 50 },
  ],
});

function mockFetchCompare() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        before: { result: beforeResult, createdAt: "2026-01-15T00:00:00Z", companyName: "TestCo" },
        after: { result: afterResult, createdAt: "2026-03-15T00:00:00Z", companyName: "TestCo" },
      }),
  });
}

function mockFetchHistory() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve([
        { hash: "hash-old", result: beforeResult, createdAt: "2026-01-15T00:00:00Z" },
        { hash: "hash-current", result: afterResult, createdAt: "2026-03-15T00:00:00Z" },
        { hash: "hash-other", result: beforeResult, createdAt: "2026-02-15T00:00:00Z" },
      ]),
  });
}

describe("ComparisonPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  // TC14: renders theta delta with correct sign and color
  it("TC14: renders theta delta with correct sign and color", async () => {
    globalThis.fetch = mockFetchCompare();
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    await waitFor(() => {
      const delta = screen.getByTestId("theta-delta");
      expect(delta).toBeInTheDocument();
      expect(delta.textContent).toBe("+20");
      expect(delta.className).toContain("text-green-600");
    });
  });

  // TC15: renders 6 dimension rows with before/after scores
  it("TC15: renders 6 dimension rows with before/after scores", async () => {
    globalThis.fetch = mockFetchCompare();
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    await waitFor(() => {
      const rows = screen.getAllByTestId("dimension-row");
      expect(rows).toHaveLength(6);
    });

    // Check Strategy row has before (40) and after (70)
    const rows = screen.getAllByTestId("dimension-row");
    expect(rows[0].textContent).toContain("Strategy");
    expect(rows[0].textContent).toContain("40");
    expect(rows[0].textContent).toContain("70");
  });

  // TC16: renders level change badge when levels differ
  it("TC16: renders level change badge when levels differ", async () => {
    globalThis.fetch = mockFetchCompare();
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    await waitFor(() => {
      const badge = screen.getByTestId("level-change");
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain("Level 2");
      expect(badge.textContent).toContain("3");
    });
  });

  // TC17: renders "Most improved" and "Most regressed" callouts
  it("TC17: renders most improved and most regressed callouts", async () => {
    globalThis.fetch = mockFetchCompare();
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("most-improved")).toBeInTheDocument();
    });

    // Adoption has the highest positive delta (90-50=40)
    expect(screen.getByTestId("most-improved").textContent).toContain("Adoption");
    // No negative deltas in this data set, so most-regressed should not render
    expect(screen.queryByTestId("most-regressed")).toBeNull();
  });

  // TC18: renders loading skeleton before fetch resolves
  it("TC18: renders loading skeleton before fetch resolves", () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    expect(screen.getByTestId("comparison-loading")).toBeInTheDocument();
  });

  // TC19: renders "Back to results" link
  it("TC19: renders back to results link", async () => {
    globalThis.fetch = mockFetchCompare();
    render(
      <ComparisonPanel currentHash="hash-a" compareHash="hash-b" email="a@b.com" />,
    );

    await waitFor(() => {
      const link = screen.getByTestId("back-to-results");
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe("/results/hash-a");
    });
  });
});

describe("AssessmentSelector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  // TC20: dropdown shows other assessments when history has 2+ entries
  it("TC20: shows other assessments when history has 2+ entries", async () => {
    globalThis.fetch = mockFetchHistory();
    render(
      <AssessmentSelector email="a@b.com" currentHash="hash-current" />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("assessment-selector")).toBeInTheDocument();
    });

    // Click to open dropdown
    fireEvent.click(screen.getByRole("button", { name: /compare with/i }));

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      // Should show hash-old and hash-other (not hash-current)
      expect(options).toHaveLength(2);
    });

    // Select the first option
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(mockPush).toHaveBeenCalled();
  });
});
