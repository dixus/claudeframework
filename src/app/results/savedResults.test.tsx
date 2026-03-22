// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { AssessmentResult } from "@/lib/scoring/types";

// Mock db before importing the page
const mockLimit = vi.fn();
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({ where: mockWhere }),
});

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

// Mock ResultsPageClient to avoid rendering the full results UI
vi.mock("@/app/results/[hash]/ResultsPageClient", () => ({
  ResultsPageClient: ({ result }: { result: AssessmentResult }) => (
    <div data-testid="results-page-client">
      <span data-testid="company-name">{result.companyName}</span>
    </div>
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import SavedResultsPage from "@/app/results/[hash]/page";

const baseResult: AssessmentResult = {
  companyName: "Test Corp",
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

describe("SavedResultsPage (dynamic results page)", () => {
  it("renders results from DB when given a valid hash", async () => {
    mockLimit.mockResolvedValueOnce([{ resultSnapshot: baseResult }]);

    const jsx = await SavedResultsPage({ params: { hash: "validhash123" } });
    render(jsx);

    expect(screen.getByTestId("results-page-client")).toBeInTheDocument();
    expect(screen.getByTestId("company-name")).toHaveTextContent("Test Corp");
  });

  it("shows not-found for invalid hash", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const jsx = await SavedResultsPage({ params: { hash: "invalidhash" } });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /assessment not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /take assessment/i }),
    ).toHaveAttribute("href", "/assessment");
  });
});
