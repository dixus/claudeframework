import { describe, it, expect, vi } from "vitest";
import type { AssessmentResult } from "@/lib/scoring/types";
import { generatePdfContent, buildFilename } from "./generatePdf";

function createMockPdf() {
  const calls: { method: string; args: unknown[] }[] = [];
  let pages = 1;

  const mock = {
    setFontSize: vi.fn((...args: unknown[]) =>
      calls.push({ method: "setFontSize", args }),
    ),
    setFont: vi.fn((...args: unknown[]) =>
      calls.push({ method: "setFont", args }),
    ),
    setTextColor: vi.fn((...args: unknown[]) =>
      calls.push({ method: "setTextColor", args }),
    ),
    setDrawColor: vi.fn((...args: unknown[]) =>
      calls.push({ method: "setDrawColor", args }),
    ),
    text: vi.fn((...args: unknown[]) => calls.push({ method: "text", args })),
    line: vi.fn((...args: unknown[]) => calls.push({ method: "line", args })),
    splitTextToSize: vi.fn((text: string) => [text]),
    addPage: vi.fn(() => {
      pages++;
      calls.push({ method: "addPage", args: [] });
    }),
    addImage: vi.fn((...args: unknown[]) =>
      calls.push({ method: "addImage", args }),
    ),
    save: vi.fn((...args: unknown[]) => calls.push({ method: "save", args })),
    internal: { getNumberOfPages: () => pages },
    _calls: calls,
    _getPages: () => pages,
  };

  return mock;
}

const minimalResult: AssessmentResult = {
  companyName: "TestCo",
  thetaScore: 45.2,
  rawLevel: 1,
  gated: false,
  level: {
    level: 1,
    label: "AI-Aware",
    monthsTo100M: 48,
    arrPerEmployee: "€100K–400K",
  },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 0.25, score: 30.0 },
    { key: "architecture", label: "Architecture", weight: 0.2, score: 50.0 },
    { key: "workflow", label: "Workflow", weight: 0.15, score: 55.0 },
    { key: "data", label: "Data", weight: 0.15, score: 40.0 },
    { key: "talent", label: "Talent", weight: 0.15, score: 45.0 },
    { key: "adoption", label: "Adoption", weight: 0.1, score: 35.0 },
  ],
  bottleneck: {
    dimension: "strategy",
    score: 30.0,
    gap: 40.0,
    actions: ["Action 1", "Action 2", "Action 3"],
  },
};

const fullResult: AssessmentResult = {
  ...minimalResult,
  companyName: "Full Corp",
  thetaScore: 72.5,
  rawLevel: 3,
  level: {
    level: 3,
    label: "AI-Native",
    monthsTo100M: 18,
    arrPerEmployee: "€2M–5M",
  },
  meta: {
    metaScore: 80,
    predictedMonthsTo100M: 16.5,
    scalingCoefficient: 1.234,
    enablerScore: 75,
    capabilityGeoMean: 70,
    capabilityExponents: {
      c1_strategy: 0.3,
      c2_setup: 0.25,
      c3_execution: 0.25,
      c4_operationalization: 0.2,
    },
  },
  capabilities: [
    { key: "c1_strategy", label: "C1: Strategy", score: 80 },
    { key: "c2_setup", label: "C2: Setup", score: 65 },
    { key: "c3_execution", label: "C3: Execution", score: 70 },
    {
      key: "c4_operationalization",
      label: "C4: Operationalization",
      score: 55,
    },
  ],
  capabilityBottleneck: {
    key: "c4_operationalization",
    label: "C4: Operationalization",
    score: 55,
  },
  scalingVelocity: {
    s: 1.85,
    band: "superlinear",
    bandLabel: "Superlinear",
    components: { enabler: 0.8, capabilityProduct: 0.7, theta: 0.72 },
    scenarios: { current: 1.85, fixBottleneck: 2.1, fixAll: 2.5, addAI: 2.8 },
    bottleneckCapability: "c4_operationalization",
  },
  enablers: { fundingStage: "series-b", teamSize: 120, annualRevenue: 15000 },
  playbook: {
    capability: "c4_operationalization",
    label: "C4: Operationalization",
    duration: "12 weeks",
    symptoms: ["Low deployment frequency"],
    rootCauses: ["Manual processes"],
    phases: [
      { name: "Foundation", weeks: "1-4", actions: ["Automate CI/CD"] },
      { name: "Scale", weeks: "5-12", actions: ["Expand automation"] },
    ],
    expectedImpact: {
      sImprovement: "+0.25",
      primaryMetric: "Deploy frequency 2x",
      secondaryMetric: "MTTR -40%",
    },
  },
  roadmap: {
    stage: "Series B",
    fundingStages: ["series-a", "series-b"],
    tagline: "Scale the Engine",
    arrRange: "$10–50M ARR",
    priorityDimensions: [
      { dimension: "Architecture", priority: "Critical" },
      { dimension: "Data", priority: "High" },
    ],
    capabilityFocus: [
      {
        capability: "C3: Execution",
        effort: 40,
        description: "Optimize delivery",
      },
    ],
    aiMaturityTarget: {
      thetaRange: "0.60–0.75",
      levelTarget: "Level 3",
      actions: ["Scale AI ops", "Build data platform"],
    },
    expectedOutcomes: {
      arrPerEmployee: "€2M+",
      timeToMilestone: "18 months",
      teamSize: "100-200",
    },
  },
};

describe("generatePdfContent", () => {
  it("renders 2 pages for minimal result (no capabilities/enablers)", () => {
    const pdf = createMockPdf();
    generatePdfContent(pdf, minimalResult);

    // Should add exactly 1 extra page (page 2), so addPage called once
    expect(pdf.addPage).toHaveBeenCalledTimes(1);

    // Should render company name
    expect(pdf.text).toHaveBeenCalledWith(
      "TestCo",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render theta score
    expect(pdf.text).toHaveBeenCalledWith(
      "45.2",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render dimension analysis header
    expect(pdf.text).toHaveBeenCalledWith(
      "Dimension Analysis",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render footer with page count "Page 1 of 2"
    expect(pdf.text).toHaveBeenCalledWith(
      "Page 1 of 2",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).toHaveBeenCalledWith(
      "Page 2 of 2",
      expect.any(Number),
      expect.any(Number),
    );

    // Should NOT render capability or roadmap pages
    expect(pdf.text).not.toHaveBeenCalledWith(
      "Capability & Scaling",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).not.toHaveBeenCalledWith(
      "Roadmap & Playbook",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("renders 4 pages for complete result with capabilities and roadmap", () => {
    const pdf = createMockPdf();
    generatePdfContent(pdf, fullResult);

    // Should add 3 extra pages (pages 2, 3, 4)
    expect(pdf.addPage).toHaveBeenCalledTimes(3);

    // Should render all page headers
    expect(pdf.text).toHaveBeenCalledWith(
      "Full Corp",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).toHaveBeenCalledWith(
      "Dimension Analysis",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).toHaveBeenCalledWith(
      "Capability & Scaling",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).toHaveBeenCalledWith(
      "Roadmap & Playbook",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render footer with page count "Page 1 of 4"
    expect(pdf.text).toHaveBeenCalledWith(
      "Page 1 of 4",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdf.text).toHaveBeenCalledWith(
      "Page 4 of 4",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render META prediction
    expect(pdf.text).toHaveBeenCalledWith(
      "META Prediction",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render scaling velocity
    expect(pdf.text).toHaveBeenCalledWith(
      "Scaling Velocity",
      expect.any(Number),
      expect.any(Number),
    );

    // Should render playbook label
    expect(pdf.text).toHaveBeenCalledWith(
      "Playbook: C4: Operationalization",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("renders branded footer on every page", () => {
    const pdf = createMockPdf();
    generatePdfContent(pdf, fullResult);

    const footerCalls = pdf.text.mock.calls.filter(
      (call: unknown[]) =>
        call[0] === "AI Maturity Score -- Powered by AI-Native Scaling Theory",
    );
    // 4 pages = 4 footer lines
    expect(footerCalls).toHaveLength(4);
  });
});

describe("buildFilename", () => {
  it("produces correct filename format", () => {
    const filename = buildFilename("Acme Corp");
    expect(filename).toMatch(
      /^acme-corp-ai-maturity-report-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("handles special characters in company name", () => {
    const filename = buildFilename("Foo & Bar, Inc.");
    expect(filename).toMatch(
      /^foo-bar-inc-ai-maturity-report-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });
});
