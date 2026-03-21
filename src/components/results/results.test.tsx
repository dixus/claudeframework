// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAssessmentStore } from "@/store/assessmentStore";
import type { AssessmentResult } from "@/lib/scoring/types";
import { ScoreCard } from "./ScoreCard";
import { BottleneckPanel } from "./BottleneckPanel";
import { DimensionScorecard } from "./DimensionScorecard";
import { ResultsPage } from "./ResultsPage";

// ResizeObserver is not available in jsdom; mock it for Recharts ResponsiveContainer
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const baseResult: AssessmentResult = {
  companyName: "Acme Corp",
  thetaScore: 67.4,
  rawLevel: 2,
  gated: false,
  level: {
    level: 2,
    label: "AI-Enabled",
    monthsTo100M: 30,
    arrPerEmployee: "€400K–2M",
  },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 0.25, score: 40.0 },
    { key: "architecture", label: "Architecture", weight: 0.2, score: 75.0 },
    { key: "workflow", label: "Workflow", weight: 0.15, score: 80.0 },
    { key: "data", label: "Data", weight: 0.15, score: 70.0 },
    { key: "talent", label: "Talent", weight: 0.15, score: 65.0 },
    { key: "adoption", label: "Adoption", weight: 0.1, score: 60.0 },
  ],
  bottleneck: {
    dimension: "strategy",
    score: 40.0,
    gap: 30.0,
    actions: [
      "Define an explicit AI strategy with measurable OKRs tied to business outcomes",
      "Establish an AI governance board with cross-functional executive sponsorship",
      "Allocate a dedicated AI budget and roadmap reviewed on a quarterly cadence",
    ],
  },
};

beforeEach(() => {
  useAssessmentStore.getState().reset();
});

// Test 1: ScoreCard renders score, level, benchmarks
describe("ScoreCard", () => {
  it("renders the θ score, level label, and benchmark values", () => {
    render(<ScoreCard result={baseResult} />);
    expect(screen.getByText("67.4")).toBeInTheDocument();
    expect(screen.getByText("AI-Enabled")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("€400K–2M")).toBeInTheDocument();
  });
});

// Test 2: ScoreCard gating notice
describe("ScoreCard gating", () => {
  it("renders a gating notice when gated=true", () => {
    render(<ScoreCard result={{ ...baseResult, gated: true }} />);
    expect(
      screen.getByText(/gating conditions were not met/i),
    ).toBeInTheDocument();
  });

  it("does not render a gating notice when gated=false", () => {
    render(<ScoreCard result={baseResult} />);
    expect(
      screen.queryByText(/gating conditions were not met/i),
    ).not.toBeInTheDocument();
  });
});

// Test 3: BottleneckPanel
describe("BottleneckPanel", () => {
  it("renders the bottleneck dimension label, gap, and all 3 actions", () => {
    render(<BottleneckPanel bottleneck={baseResult.bottleneck} />);
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(
      screen.getByText(/30\.0 points to the 70 target/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Define an explicit AI strategy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Establish an AI governance board/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Allocate a dedicated AI budget/i),
    ).toBeInTheDocument();
  });
});

// Test 4: DimensionScorecard
describe("DimensionScorecard", () => {
  it("renders all 6 dimension labels and scores", () => {
    render(<DimensionScorecard dimensions={baseResult.dimensions} />);
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Talent")).toBeInTheDocument();
    expect(screen.getByText("Adoption")).toBeInTheDocument();
    expect(screen.getByText("40.0")).toBeInTheDocument();
    expect(screen.getByText("75.0")).toBeInTheDocument();
    expect(screen.getByText("80.0")).toBeInTheDocument();
    expect(screen.getByText("70.0")).toBeInTheDocument();
    expect(screen.getByText("65.0")).toBeInTheDocument();
    expect(screen.getByText("60.0")).toBeInTheDocument();
  });
});

// Test 5: ResultsPage "Start Over"
describe("ResultsPage", () => {
  it("clicking Start Over calls reset() and returns to step 0", async () => {
    useAssessmentStore.setState({ result: baseResult, step: 8 });
    render(<ResultsPage />);
    await userEvent.click(screen.getByRole("button", { name: /start over/i }));
    expect(useAssessmentStore.getState().step).toBe(0);
    expect(useAssessmentStore.getState().result).toBeNull();
  });
});
