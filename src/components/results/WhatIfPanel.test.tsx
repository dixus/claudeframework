// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@/lib/scoring/types";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { WhatIfPanel } from "./WhatIfPanel";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

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

// TC1: Renders with correct initial values
describe("WhatIfPanel", () => {
  it("renders all 6 dimension labels with correct initial slider values and theta", () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Talent")).toBeInTheDocument();
    expect(screen.getByText("Adoption")).toBeInTheDocument();

    const strategySlider = screen.getByLabelText("Strategy");
    expect(strategySlider).toHaveValue("40");

    // Recomputed theta from dimension scores: 40*0.25+75*0.2+80*0.15+70*0.15+65*0.15+60*0.1 = 63.3
    expect(screen.getAllByText(/63\.3/)[0]).toBeInTheDocument();
  });

  // TC2: Slider change updates theta
  it("updates theta when a slider changes", async () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });
    const strategySlider = screen.getByLabelText("Strategy");
    // Change strategy from 40 to 80 — weight 0.25 so theta should increase by 10
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(strategySlider, { target: { value: "80" } });
    // New theta: 63.3 + 10 = 73.3 (text appears in both visual and sr-only elements)
    expect(screen.getAllByText(/73\.3/)[0]).toBeInTheDocument();
  });

  // TC3: Slider change updates maturity level
  it("updates maturity level when slider pushes theta above boundary", async () => {
    // Create result near level boundary: theta near 50 (level 1→2 boundary)
    const nearBoundaryResult: AssessmentResult = {
      ...baseResult,
      thetaScore: 48.5,
      rawLevel: 1,
      level: {
        level: 1,
        label: "AI-Powered",
        monthsTo100M: 48,
        arrPerEmployee: "€200–600K",
      },
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 40.0 },
        {
          key: "architecture",
          label: "Architecture",
          weight: 0.2,
          score: 50.0,
        },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 55.0 },
        { key: "data", label: "Data", weight: 0.15, score: 50.0 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50.0 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 45.0 },
      ],
    };
    render(<WhatIfPanel result={nearBoundaryResult} />, { wrapper: Wrapper });
    expect(screen.getByText("AI-Powered")).toBeInTheDocument();

    const { fireEvent } = await import("@testing-library/react");
    const strategySlider = screen.getByLabelText("Strategy");
    // Push strategy from 40 to 90 → theta increases by ~12.5 → crosses 50 boundary
    fireEvent.change(strategySlider, { target: { value: "90" } });
    expect(screen.getAllByText(/AI-Enabled/)[0]).toBeInTheDocument();
  });

  // TC4: Gating alert appears on threshold crossing
  it("shows gating alert when workflow crosses above 50", async () => {
    // Workflow below 50, theta > 50 → would be level 2 but gated to level 1
    const gatedResult: AssessmentResult = {
      ...baseResult,
      thetaScore: 55.0,
      rawLevel: 2,
      gated: true,
      gatingDetails: [
        {
          dimension: "workflow",
          dimensionLabel: "Workflow",
          score: 45,
          threshold: 50,
          targetLevel: 2,
        },
      ],
      level: {
        level: 1,
        label: "AI-Powered",
        monthsTo100M: 48,
        arrPerEmployee: "€200–600K",
      },
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 60.0 },
        {
          key: "architecture",
          label: "Architecture",
          weight: 0.2,
          score: 60.0,
        },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 45.0 },
        { key: "data", label: "Data", weight: 0.15, score: 55.0 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50.0 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50.0 },
      ],
    };
    render(<WhatIfPanel result={gatedResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    const workflowSlider = screen.getByLabelText("Workflow");
    fireEvent.change(workflowSlider, { target: { value: "55" } });

    expect(screen.getByText(/unlocks Level 2/i)).toBeInTheDocument();
  });

  // TC5: Gating alert for downward crossing
  it("shows downward gating alert when workflow drops below 50", async () => {
    const ungatedResult: AssessmentResult = {
      ...baseResult,
      dimensions: [
        { key: "strategy", label: "Strategy", weight: 0.25, score: 60.0 },
        {
          key: "architecture",
          label: "Architecture",
          weight: 0.2,
          score: 60.0,
        },
        { key: "workflow", label: "Workflow", weight: 0.15, score: 55.0 },
        { key: "data", label: "Data", weight: 0.15, score: 55.0 },
        { key: "talent", label: "Talent", weight: 0.15, score: 50.0 },
        { key: "adoption", label: "Adoption", weight: 0.1, score: 50.0 },
      ],
    };
    render(<WhatIfPanel result={ungatedResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    const workflowSlider = screen.getByLabelText("Workflow");
    fireEvent.change(workflowSlider, { target: { value: "45" } });

    expect(screen.getByText(/Workflow.*below.*50/i)).toBeInTheDocument();
  });

  // TC6: Reset button restores original values
  it("resets all sliders and metrics to original values on reset click", async () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    const strategySlider = screen.getByLabelText("Strategy");
    fireEvent.change(strategySlider, { target: { value: "90" } });

    // Values should be changed
    expect(strategySlider).toHaveValue("90");

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(strategySlider).toHaveValue("40");
    // Theta should be back to recomputed baseline 63.3
    expect(screen.getAllByText(/63\.3/)[0]).toBeInTheDocument();
  });

  // TC7: Delta display format
  it("shows delta in 'original → new (+diff)' format", async () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    const strategySlider = screen.getByLabelText("Strategy");
    fireEvent.change(strategySlider, { target: { value: "80" } });

    // Delta for theta: "63.3 → 73.3 (+10.0)" — recomputed baseline vs new
    // These values appear in both visual and sr-only elements
    expect(screen.getAllByText(/63\.3/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/73\.3/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/\+10\.0/)[0]).toBeInTheDocument();
  });

  // TC8: META and S-velocity hidden when not available
  it("hides META and S-velocity rows when result has no meta", () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });
    expect(screen.queryByText(/Months/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Band/i)).not.toBeInTheDocument();
  });

  // TC9: META and S-velocity shown when available
  it("shows META months and S-velocity when result has enablers and capabilities", async () => {
    const fullResult: AssessmentResult = {
      ...baseResult,
      enablers: {
        fundingStage: "series-a",
        teamSize: 50,
        annualRevenue: 5000,
      },
      capabilities: [
        { key: "c1_strategy", label: "C₁ Strategy", score: 75 },
        { key: "c2_setup", label: "C₂ Setup", score: 60 },
        { key: "c3_execution", label: "C₃ Execution", score: 70 },
        {
          key: "c4_operationalization",
          label: "C₄ Operationalization",
          score: 65,
        },
      ],
      meta: {
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
      },
      scalingVelocity: {
        s: 0.12,
        band: "linear",
        bandLabel: "Linear scaling",
        components: { enabler: 0.6, capabilityProduct: 0.3, theta: 0.67 },
        scenarios: {
          current: 0.12,
          fixBottleneck: 0.18,
          fixAll: 0.25,
          addAI: 0.4,
        },
        bottleneckCapability: "c2_setup",
      },
    };
    render(<WhatIfPanel result={fullResult} />, { wrapper: Wrapper });

    expect(screen.getByText(/Months/)).toBeInTheDocument();
    expect(screen.getByText(/Band/)).toBeInTheDocument();
  });

  // TC10: No render when result is null-like
  it("returns null if result is undefined", () => {
    const { container } = render(
      <WhatIfPanel result={undefined as unknown as AssessmentResult} />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe("");
  });

  // TC11: All sliders at zero
  it("shows theta 0 and Traditional level when all sliders at 0", async () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    for (const dim of [
      "Strategy",
      "Architecture",
      "Workflow",
      "Data",
      "Talent",
      "Adoption",
    ]) {
      const slider = screen.getByLabelText(dim);
      fireEvent.change(slider, { target: { value: "0" } });
    }

    expect(screen.getAllByText(/Traditional/)[0]).toBeInTheDocument();
  });

  // TC12: All sliders at 100
  it("computes correct theta when all sliders at 100", async () => {
    render(<WhatIfPanel result={baseResult} />, { wrapper: Wrapper });

    const { fireEvent } = await import("@testing-library/react");
    for (const dim of [
      "Strategy",
      "Architecture",
      "Workflow",
      "Data",
      "Talent",
      "Adoption",
    ]) {
      const slider = screen.getByLabelText(dim);
      fireEvent.change(slider, { target: { value: "100" } });
    }

    // 100 * (0.25 + 0.2 + 0.15 + 0.15 + 0.15 + 0.1) = 100
    // Theta shows "63.3 → 100.0 (+36.7)" — check that 100.0 appears in the delta
    expect(screen.getAllByText(/100\.0/)[0]).toBeInTheDocument();
  });
});
