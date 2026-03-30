// @vitest-environment jsdom
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProgressTimelinePanel } from "./ProgressTimelinePanel";
import type { AssessmentResult } from "@/lib/scoring/types";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function makeDimensions(scores: Record<string, number>) {
  const keys = [
    "strategy",
    "architecture",
    "workflow",
    "data",
    "talent",
    "adoption",
  ];
  return keys.map((key) => ({
    key: key as AssessmentResult["dimensions"][0]["key"],
    label: key.charAt(0).toUpperCase() + key.slice(1),
    weight: 1,
    score: scores[key] ?? 50,
  }));
}

function makeResult(
  theta: number,
  level: number,
  dimScores?: Record<string, number>
): AssessmentResult {
  return {
    companyName: "TestCo",
    thetaScore: theta,
    rawLevel: level,
    level: { level, label: `Level ${level}`, monthsTo100M: 36, arrPerEmployee: "100k" },
    gated: false,
    gatingDetails: [],
    dimensions: makeDimensions(dimScores ?? {}),
    bottleneck: {
      dimension: "strategy",
      score: 40,
      gap: 10,
      actions: [],
    },
  };
}

function makeHistory(items: { theta: number; level: number; date: string; dimScores?: Record<string, number> }[]) {
  return items.map((item) => ({
    result: makeResult(item.theta, item.level, item.dimScores),
    createdAt: item.date,
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ProgressTimelinePanel", () => {
  // TC15: renders heading "Progress Timeline" when fetch returns 3 assessments
  it("TC15: renders heading 'Progress Timeline' when fetch returns 3 assessments", async () => {
    const history = makeHistory([
      { theta: 40, level: 1, date: "2026-01-01T00:00:00Z" },
      { theta: 55, level: 2, date: "2026-02-01T00:00:00Z" },
      { theta: 70, level: 3, date: "2026-03-01T00:00:00Z" },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    } as Response);

    await act(async () => {
      render(
        <ProgressTimelinePanel
          result={makeResult(70, 3)}
          email="test@example.com"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Progress Timeline")).toBeInTheDocument();
    });
  });

  // TC16: renders theta delta with "+" prefix when delta is positive
  it("TC16: renders theta delta with '+' prefix when delta is positive", async () => {
    const history = makeHistory([
      { theta: 50, level: 2, date: "2026-01-01T00:00:00Z" },
      { theta: 65, level: 2, date: "2026-02-01T00:00:00Z" },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    } as Response);

    await act(async () => {
      render(
        <ProgressTimelinePanel
          result={makeResult(65, 2)}
          email="test@example.com"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText("+15")).toBeInTheDocument();
    });
  });

  // TC17: renders 6 dimension indicator elements
  it("TC17: renders 6 dimension indicator elements", async () => {
    const history = makeHistory([
      { theta: 50, level: 2, date: "2026-01-01T00:00:00Z" },
      { theta: 65, level: 2, date: "2026-02-01T00:00:00Z" },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    } as Response);

    await act(async () => {
      render(
        <ProgressTimelinePanel
          result={makeResult(65, 2)}
          email="test@example.com"
        />
      );
    });

    await waitFor(() => {
      const indicators = screen.getAllByTestId("dimension-indicator");
      expect(indicators).toHaveLength(6);
    });
  });

  // TC18: renders insight text containing the strongest improving dimension name
  it("TC18: renders insight text containing the strongest improving dimension name", async () => {
    const history = makeHistory([
      {
        theta: 50,
        level: 2,
        date: "2026-01-01T00:00:00Z",
        dimScores: { strategy: 40, architecture: 30, workflow: 50, data: 50, talent: 50, adoption: 50 },
      },
      {
        theta: 65,
        level: 2,
        date: "2026-02-01T00:00:00Z",
        dimScores: { strategy: 45, architecture: 55, workflow: 50, data: 50, talent: 50, adoption: 50 },
      },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    } as Response);

    await act(async () => {
      render(
        <ProgressTimelinePanel
          result={makeResult(65, 2, { strategy: 45, architecture: 55, workflow: 50, data: 50, talent: 50, adoption: 50 })}
          email="test@example.com"
        />
      );
    });

    await waitFor(() => {
      const insightEl = screen.getByTestId("progress-insight");
      expect(insightEl.textContent).toContain("Architecture");
    });
  });

  // TC19: renders nothing when fetch returns only 1 assessment
  it("TC19: renders nothing when fetch returns only 1 assessment", async () => {
    const history = makeHistory([
      { theta: 50, level: 2, date: "2026-01-01T00:00:00Z" },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    } as Response);

    const { container } = render(
      <ProgressTimelinePanel
        result={makeResult(50, 2)}
        email="test@example.com"
      />
    );

    // Initially shows loading skeleton
    expect(screen.getByLabelText("Loading progress timeline")).toBeInTheDocument();

    // After fetch resolves with 1 item, should render nothing
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  // TC20: shows element with aria-busy="true" before fetch resolves
  it("TC20: shows element with aria-busy='true' before fetch resolves", () => {
    // Don't resolve the fetch — keep it pending
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(
      <ProgressTimelinePanel
        result={makeResult(50, 2)}
        email="test@example.com"
      />
    );

    const loadingEl = screen.getByLabelText("Loading progress timeline");
    expect(loadingEl).toHaveAttribute("aria-busy", "true");
  });
});
