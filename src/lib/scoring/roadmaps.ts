import type { FundingStage } from "./types";

export interface StageRoadmap {
  stage: string;
  fundingStages: FundingStage[];
  tagline: string;
  arrRange: string;
  priorityDimensions: {
    dimension: string;
    priority: "Critical" | "High" | "Medium";
  }[];
  capabilityFocus: {
    capability: string;
    effort: number;
    description: string;
  }[];
  aiMaturityTarget: {
    thetaRange: string;
    levelTarget: string;
    actions: string[];
  };
  expectedOutcomes: {
    arrPerEmployee: string;
    timeToMilestone: string;
    teamSize: string;
  };
}

export const STAGE_ROADMAPS: StageRoadmap[] = [
  {
    stage: "Series A",
    fundingStages: ["pre-seed", "seed"],
    tagline: "Find the Engine",
    arrRange: "$2\u201310M ARR",
    priorityDimensions: [
      { dimension: "GTM/Revenue", priority: "Critical" },
      { dimension: "Product", priority: "Critical" },
      { dimension: "Customer Success", priority: "High" },
    ],
    capabilityFocus: [
      {
        capability: "C\u2081 Strategy",
        effort: 80,
        description: "Define and validate the core growth engine",
      },
      {
        capability: "C\u2082 Setup",
        effort: 15,
        description: "Establish foundational AI tooling",
      },
      {
        capability: "C\u2083 Execution",
        effort: 5,
        description: "Early execution experiments",
      },
    ],
    aiMaturityTarget: {
      thetaRange: "0.3\u20130.5",
      levelTarget: "Level 1: AI-Powered",
      actions: [
        "Deploy AI tools for individual productivity gains",
        "Identify 2\u20133 high-impact AI use cases in GTM",
        "Establish baseline metrics for AI-assisted workflows",
      ],
    },
    expectedOutcomes: {
      arrPerEmployee: "\u20ac300\u2013600K",
      timeToMilestone: "12\u201318 months to $10M",
      teamSize: "10\u201330",
    },
  },
  {
    stage: "Series B",
    fundingStages: ["series-a", "series-b"],
    tagline: "Build the System",
    arrRange: "$10\u201350M ARR",
    priorityDimensions: [
      { dimension: "GTM/Revenue", priority: "Critical" },
      { dimension: "Operations", priority: "High" },
      { dimension: "Talent", priority: "High" },
      { dimension: "Finance", priority: "Medium" },
    ],
    capabilityFocus: [
      {
        capability: "C\u2082 Setup",
        effort: 40,
        description: "Build scalable AI infrastructure and processes",
      },
      {
        capability: "C\u2081 Strategy",
        effort: 30,
        description: "Refine strategy with data-driven insights",
      },
      {
        capability: "C\u2083 Execution",
        effort: 20,
        description: "Scale proven AI workflows across teams",
      },
      {
        capability: "C\u2084 Operationalization",
        effort: 10,
        description: "Begin systematizing AI operations",
      },
    ],
    aiMaturityTarget: {
      thetaRange: "0.5\u20130.7",
      levelTarget: "Level 2: AI-Enabled",
      actions: [
        "Integrate AI into core business workflows",
        "Build cross-functional AI capability teams",
        "Implement AI governance and measurement frameworks",
        "Achieve 50%+ workflow AI-augmentation",
      ],
    },
    expectedOutcomes: {
      arrPerEmployee: "\u20ac600K\u20131.5M",
      timeToMilestone: "18\u201330 months to $50M",
      teamSize: "50\u2013150",
    },
  },
  {
    stage: "Series C/Growth",
    fundingStages: ["series-c", "growth"],
    tagline: "Optimize the Machine",
    arrRange: "$50\u2013100M ARR",
    priorityDimensions: [
      { dimension: "Governance", priority: "High" },
      { dimension: "Strategy", priority: "High" },
      { dimension: "GTM/Revenue", priority: "Medium" },
      { dimension: "Product", priority: "Medium" },
      { dimension: "Operations", priority: "Medium" },
      { dimension: "Talent", priority: "Medium" },
      { dimension: "Finance", priority: "Medium" },
      { dimension: "Customer Success", priority: "Medium" },
    ],
    capabilityFocus: [
      {
        capability: "C\u2083 Execution",
        effort: 30,
        description: "Maximize AI execution across all functions",
      },
      {
        capability: "C\u2084 Operationalization",
        effort: 30,
        description: "Full AI operationalization and automation",
      },
      {
        capability: "C\u2081 Strategy",
        effort: 20,
        description: "AI-native strategic planning",
      },
      {
        capability: "C\u2082 Setup",
        effort: 20,
        description: "Advanced AI architecture and platforms",
      },
    ],
    aiMaturityTarget: {
      thetaRange: "0.7\u20130.9",
      levelTarget: "Level 2\u20133: AI-Native",
      actions: [
        "AI as core architecture, not just tooling",
        "Autonomous AI-driven decision systems",
        "AI governance embedded in board processes",
        "Achieve superlinear scaling coefficient >1.3",
      ],
    },
    expectedOutcomes: {
      arrPerEmployee: "\u20ac1\u20133M",
      timeToMilestone: "24\u201336 months to $100M",
      teamSize: "100\u2013200",
    },
  },
];

export function getRoadmapForStage(
  fundingStage: FundingStage,
): StageRoadmap | null {
  if (!fundingStage) return null;
  return (
    STAGE_ROADMAPS.find((r) => r.fundingStages.includes(fundingStage)) ?? null
  );
}
