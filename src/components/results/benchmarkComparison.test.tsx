// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BenchmarkComparisonPanel,
  type BenchmarkComparison,
} from "./BenchmarkComparisonPanel";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const validBenchmark: BenchmarkComparison = {
  cohortLabel: "Series A + PLG companies",
  sampleSize: 142,
  percentile: 62,
  dimensionDeltas: {
    strategy: 12,
    architecture: -8,
    workflow: 5,
    data: -15,
    talent: 20,
    adoption: 3,
  },
  dimensionMeans: {
    strategy: 50,
    architecture: 55,
    workflow: 48,
    data: 60,
    talent: 45,
    adoption: 52,
  },
  topStrength: { dimension: "talent", delta: 20 },
  keyGap: { dimension: "data", delta: -15 },
};

// TC18: renders cohort label with sample size
describe("BenchmarkComparisonPanel", () => {
  it("TC18: renders cohort label text containing sample size", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={validBenchmark} />);
    expect(screen.getByText(/Series A \+ PLG companies/)).toBeInTheDocument();
    expect(screen.getByText(/n=142/)).toBeInTheDocument();
  });

  // TC19: renders percentile bar with correct aria-valuenow
  it("TC19: renders percentile bar with correct aria-valuenow", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={validBenchmark} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "62");
    expect(meter).toHaveAttribute("aria-valuemin", "1");
    expect(meter).toHaveAttribute("aria-valuemax", "99");
  });

  // TC20: renders 6 dimension comparison entries (via accessible sr-only text)
  it("TC20: renders 6 dimension comparison entries", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={validBenchmark} />);
    // Recharts doesn't render axis labels in jsdom; verify via sr-only text
    expect(screen.getByText(/^Strategy:.*above/)).toBeInTheDocument();
    expect(screen.getByText(/^Architecture:.*below/)).toBeInTheDocument();
    expect(screen.getByText(/^Workflow:.*above/)).toBeInTheDocument();
    expect(screen.getByText(/^Data:.*below/)).toBeInTheDocument();
    expect(screen.getByText(/^Talent:.*above/)).toBeInTheDocument();
    expect(screen.getByText(/^Adoption:.*above/)).toBeInTheDocument();
  });

  // TC21: renders top strength callout with dimension name
  it("TC21: renders top strength callout with dimension name", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={validBenchmark} />);
    expect(screen.getByText("Top Strength")).toBeInTheDocument();
    expect(screen.getByText("Talent")).toBeInTheDocument();
    expect(screen.getByText("+20 above")).toBeInTheDocument();
  });

  // TC22: renders key gap callout with dimension name
  it("TC22: renders key gap callout with dimension name", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={validBenchmark} />);
    expect(screen.getByText("Key Gap")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("-15 below")).toBeInTheDocument();
  });

  // TC23: renders fallback message when benchmarkComparison is undefined
  it("TC23: renders fallback message when benchmarkComparison is undefined", () => {
    render(<BenchmarkComparisonPanel benchmarkComparison={undefined} />);
    expect(
      screen.getByText(
        "Complete the enabler and growth engine steps to see peer benchmarks",
      ),
    ).toBeInTheDocument();
  });
});
