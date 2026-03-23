// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAssessmentStore } from "@/store/assessmentStore";
import type { AssessmentResult } from "@/lib/scoring/types";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ScoreCard } from "./ScoreCard";
import { BottleneckPanel } from "./BottleneckPanel";
import { DimensionScorecard } from "./DimensionScorecard";
import { RadarChartPanel } from "./RadarChartPanel";
import { ScalingPanel } from "./ScalingPanel";
import { ResultsPage } from "./ResultsPage";
import { ValidationBadge } from "@/components/ui/validation-badge";
import type { MetaResult, EnablerInput } from "@/lib/scoring/types";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

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
  gatingDetails: [],
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
    render(<ScoreCard result={baseResult} />, { wrapper: Wrapper });
    expect(screen.getByText("67.4")).toBeInTheDocument();
    expect(screen.getByText("AI-Enabled")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("€400K–2M")).toBeInTheDocument();
  });
});

// Test 2: ScoreCard gating notice
describe("ScoreCard gating", () => {
  it("renders a gating notice when gated=true with gatingDetails", () => {
    render(
      <ScoreCard
        result={{
          ...baseResult,
          gated: true,
          gatingDetails: [
            {
              dimension: "workflow",
              dimensionLabel: "Workflow",
              score: 62.5,
              threshold: 70,
              targetLevel: 3,
            },
          ],
        }}
      />,
      { wrapper: Wrapper },
    );
    const gatingNotice = screen.getAllByText((_, element) => {
      return (
        element?.tagName === "DIV" &&
        element?.className.includes("bg-amber-50") &&
        (element?.textContent?.includes("Workflow") ?? false)
      );
    });
    expect(gatingNotice.length).toBeGreaterThan(0);
    expect(screen.getByText("Workflow")).toBeInTheDocument();
  });

  it("does not render a gating notice when gated=false", () => {
    render(<ScoreCard result={baseResult} />, { wrapper: Wrapper });
    const amberBoxes = screen.queryAllByText((_, element) => {
      return (
        (element?.tagName === "DIV" &&
          element?.className.includes("bg-amber-50")) ??
        false
      );
    });
    expect(amberBoxes).toHaveLength(0);
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
    useAssessmentStore.setState({ result: baseResult, step: 7 });
    render(<ResultsPage />);
    await userEvent.click(screen.getByRole("button", { name: /start over/i }));
    expect(useAssessmentStore.getState().step).toBe(0);
    expect(useAssessmentStore.getState().result).toBeNull();
  });
});

// Test 6: ValidationBadge renders for known formula
describe("ValidationBadge", () => {
  it("renders for a known formula", () => {
    render(<ValidationBadge formula="META" />, { wrapper: Wrapper });
    expect(screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.getByText(/R²=0.91/)).toBeInTheDocument();
  });

  it("renders nothing for an unknown formula", () => {
    const { container } = render(<ValidationBadge formula="NONEXISTENT" />, {
      wrapper: Wrapper,
    });
    expect(container.innerHTML).toBe("");
  });

  it("shows tooltip content on hover", async () => {
    render(<ValidationBadge formula="META" />, { wrapper: Wrapper });
    const trigger = screen.getByText(/✓/);
    await userEvent.hover(trigger);
    const matches = await screen.findAllByText(
      /22 AI-native B2B SaaS companies/,
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});

// Test 7: ScoreCard shows validation badge
describe("ScoreCard validation badge", () => {
  it("renders a validation badge with r=0.88", () => {
    render(<ScoreCard result={baseResult} />, { wrapper: Wrapper });
    expect(screen.getByText(/r=0.88/)).toBeInTheDocument();
  });
});

// TC4 (spec test case 4): RadarChartPanel with level=1 renders benchmark overlay label
describe("RadarChartPanel benchmark overlay", () => {
  it("renders 'Level 2 threshold' legend text when level=1", () => {
    render(<RadarChartPanel dimensions={baseResult.dimensions} level={1} />);
    expect(screen.getByText("Level 2 threshold")).toBeInTheDocument();
    expect(screen.getByText("Your scores")).toBeInTheDocument();
  });

  it("renders 'AI-Native benchmark' legend text when level=3", () => {
    render(<RadarChartPanel dimensions={baseResult.dimensions} level={3} />);
    expect(screen.getByText("AI-Native benchmark")).toBeInTheDocument();
  });

  it("does not render benchmark legend when level is not provided", () => {
    render(<RadarChartPanel dimensions={baseResult.dimensions} />);
    expect(screen.queryByText("Level 2 threshold")).not.toBeInTheDocument();
    expect(screen.queryByText("Your scores")).not.toBeInTheDocument();
  });
});

// TC5 (spec test case 5): DimensionScorecard with level=1 renders tick markers at correct positions
describe("DimensionScorecard tick markers", () => {
  it("renders gating tick at 50% on Workflow and 40% on Data when level=1", () => {
    const { container } = render(
      <DimensionScorecard dimensions={baseResult.dimensions} level={1} />,
    );
    // Workflow row: gating threshold at 50%
    const workflowRow = container.querySelector("#dim-workflow");
    const workflowGateTick = workflowRow?.querySelector('[style*="left: 50%"]');
    expect(workflowGateTick).toBeTruthy();

    // Data row: gating threshold at 40%
    const dataRow = container.querySelector("#dim-data");
    const dataGateTick = dataRow?.querySelector('[style*="left: 40%"]');
    expect(dataGateTick).toBeTruthy();
  });

  it("renders 'good' benchmark tick at 70% on every dimension bar when level=1", () => {
    const { container } = render(
      <DimensionScorecard dimensions={baseResult.dimensions} level={1} />,
    );
    const dimKeys = [
      "strategy",
      "architecture",
      "workflow",
      "data",
      "talent",
      "adoption",
    ];
    for (const key of dimKeys) {
      const row = container.querySelector(`#dim-${key}`);
      const goodTick = row?.querySelector('[style*="left: 70%"]');
      expect(goodTick).toBeTruthy();
    }
  });
});

// TC6 (spec test case 6): ScoreCard with theta=35, level=1 shows 50% progress and "15.0 points to Level 2"
describe("ScoreCard progress bar and distance (TC6)", () => {
  it("shows 50% progress and distance to next level when theta=35, level=1", () => {
    const level1Result = {
      ...baseResult,
      thetaScore: 35,
      level: {
        level: 1,
        label: "AI-Powered",
        monthsTo100M: 48,
        arrPerEmployee: "€200–600K",
      },
    };
    render(<ScoreCard result={level1Result} />, { wrapper: Wrapper });
    // Progress bar: (35 - 20) / (50 - 20) = 15/30 = 50%
    const meter = document.querySelector('[role="meter"]') as HTMLElement;
    expect(meter).toBeTruthy();
    const bar = meter?.querySelector('div[style*="width: 50%"]');
    expect(bar).toBeTruthy();
    // Distance text
    expect(screen.getByText("15.0 points to Level 2")).toBeInTheDocument();
  });
});

// TC7 (spec test case 7): ScoreCard with level=3 shows "Highest level achieved"
describe("ScoreCard level 3 (TC7)", () => {
  it("shows 'Highest level achieved' when level=3", () => {
    const level3Result = {
      ...baseResult,
      thetaScore: 90,
      level: {
        level: 3,
        label: "AI-Native",
        monthsTo100M: 20,
        arrPerEmployee: "€700K–6M",
      },
    };
    render(<ScoreCard result={level3Result} />, { wrapper: Wrapper });
    expect(screen.getByText("Highest level achieved")).toBeInTheDocument();
  });
});

// TC8 (spec test case 8): ScalingPanel with level=1 and enablers shows ARR context for Level 2
describe("ScalingPanel ARR/employee context (TC8)", () => {
  const mockMeta: MetaResult = {
    metaScore: 55.0,
    predictedMonthsTo100M: 36,
    scalingCoefficient: 1.2,
    enablerScore: 60.0,
    capabilityGeoMean: 65.0,
    capabilityExponents: {
      c1_strategy: 1.5,
      c2_setup: 1.0,
      c3_execution: 1.5,
      c4_operationalization: 1.0,
    },
  };

  const mockEnablers: EnablerInput = {
    fundingStage: "series-a",
    teamSize: 50,
    annualRevenue: 5000, // €5M in thousands
  };

  it("shows Level 2 ARR/employee context when level=1 with enablers", () => {
    render(
      <ScalingPanel
        meta={mockMeta}
        thetaScore={35}
        level={1}
        enablers={mockEnablers}
      />,
      { wrapper: Wrapper },
    );
    // Should show Level 2 companies' ARR/employee (€400K–2M)
    expect(
      screen.getByText(/Level 2 companies typically achieve/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/€400K–2M ARR\/employee/i)).toBeInTheDocument();
  });

  it("shows implied ARR/employee comparison when enablers are provided", () => {
    render(
      <ScalingPanel
        meta={mockMeta}
        thetaScore={35}
        level={1}
        enablers={mockEnablers}
      />,
      { wrapper: Wrapper },
    );
    // annualRevenue=5000 (€5M), teamSize=50 → implied ARR/employee = €100K
    expect(
      screen.getByText(/Your current implied ARR\/employee/i),
    ).toBeInTheDocument();
  });

  it("does not show ARR context when enablers are not provided", () => {
    render(<ScalingPanel meta={mockMeta} thetaScore={35} level={1} />, {
      wrapper: Wrapper,
    });
    expect(
      screen.queryByText(/companies typically achieve/i),
    ).not.toBeInTheDocument();
  });
});
