import type { CapabilityKey, CapabilityResult } from "./types";

export interface CaseStudy {
  id: string;
  title: string;
  interventionModel: string;
  relatedCapability?: CapabilityKey;
  relatedLevel?: number;
  context: {
    stage: string;
    industry: string;
    teamSize: string;
    challenge: string;
  };
  before: {
    sScore: string;
    arrPerEmployee: string;
    bottleneck: string;
  };
  after: {
    sScore: string;
    arrPerEmployee: string;
    improvement: string;
  };
  duration: string;
  roi: string;
  keyActions: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "c2-setup-bottleneck",
    title: "C₂ Setup Bottleneck Resolution",
    interventionModel: "Bottleneck Resolution",
    relatedCapability: "c2_setup",
    context: {
      stage: "Series B",
      industry: "B2B SaaS",
      teamSize: "80 employees",
      challenge:
        "Fragmented tooling and manual processes blocked scaling despite strong strategy and execution capabilities.",
    },
    before: {
      sScore: "0.12",
      arrPerEmployee: "€24K",
      bottleneck: "C₂ Setup = 0.55",
    },
    after: {
      sScore: "0.35",
      arrPerEmployee: "€70K",
      improvement: "C₂ Setup = 0.85",
    },
    duration: "12 weeks",
    roi: "194x",
    keyActions: [
      "Audit existing tools and identify integration gaps",
      "Design integrated stack with automation layer",
      "Build CI/CD and data pipeline automation",
      "Operationalize with runbooks and monitoring",
    ],
  },
  {
    id: "stage-a-to-b",
    title: "Stage A→B Transition",
    interventionModel: "Stage Transition",
    context: {
      stage: "Series A→B",
      industry: "Product-Led SaaS",
      teamSize: "30→120 employees",
      challenge:
        "No scalable systems in place — growth was driven by founder-led sales with no repeatable GTM motion.",
    },
    before: {
      sScore: "0.08",
      arrPerEmployee: "€18K",
      bottleneck: "No scalable systems",
    },
    after: {
      sScore: "0.28",
      arrPerEmployee: "€52K",
      improvement: "Repeatable GTM motion",
    },
    duration: "90 days",
    roi: "267x",
    keyActions: [
      "Define ICP and segment targeting",
      "Build sales infrastructure and playbooks",
      "Hire key roles (VP Sales, RevOps)",
      "Implement CRM and pipeline automation",
    ],
  },
  {
    id: "level-1-to-2",
    title: "Level 1→2 Transition",
    interventionModel: "Level Transition",
    relatedLevel: 1,
    context: {
      stage: "Series B",
      industry: "Enterprise SaaS",
      teamSize: "150 employees",
      challenge:
        "AI used as isolated point tools with no workflow integration — θ stuck at Level 1 despite strong fundamentals.",
    },
    before: {
      sScore: "0.10",
      arrPerEmployee: "€35K",
      bottleneck: "θ = 0.35 (Level 1), AI as point tools",
    },
    after: {
      sScore: "0.25",
      arrPerEmployee: "€68K",
      improvement: "θ = 0.62 (Level 2), AI in core workflows",
    },
    duration: "12 months",
    roi: "17x",
    keyActions: [
      "Integrate AI into core product workflows",
      "Build centralized data infrastructure",
      "Hire AI/ML engineering talent",
    ],
  },
  {
    id: "level-2-to-3",
    title: "Level 2→3 Transition",
    interventionModel: "Level Transition",
    relatedLevel: 2,
    context: {
      stage: "Series C",
      industry: "AI-first platform",
      teamSize: "100 employees",
      challenge:
        "AI-enabled workflows but no native AI architecture — needed transformation from tool integration to AI-native design.",
    },
    before: {
      sScore: "0.22",
      arrPerEmployee: "€90K",
      bottleneck: "θ = 0.65 (Level 2), AI-enabled workflows",
    },
    after: {
      sScore: "0.55",
      arrPerEmployee: "€210K",
      improvement: "θ = 0.88 (Level 3), AI-native architecture",
    },
    duration: "18 months",
    roi: "129x",
    keyActions: [
      "Build AI orchestration layer",
      "Redesign product features as AI-native",
      "Establish data network effects and feedback loops",
    ],
  },
  {
    id: "stage-b-to-c",
    title: "Stage B→C Transition",
    interventionModel: "Stage Transition",
    context: {
      stage: "Series B→C",
      industry: "Horizontal SaaS",
      teamSize: "150→250 employees",
      challenge:
        "Strong product but weak governance and compliance — blocking enterprise deals and Series C fundraise.",
    },
    before: {
      sScore: "0.15",
      arrPerEmployee: "€40K",
      bottleneck: "Weak governance across all dimensions",
    },
    after: {
      sScore: "0.42",
      arrPerEmployee: "€95K",
      improvement: "Mature across all 8 dimensions",
    },
    duration: "90 days",
    roi: "304x",
    keyActions: [
      "Implement governance framework and board reporting",
      "Build compliance automation (SOC2, GDPR)",
      "Deploy board intelligence dashboard",
    ],
  },
];

export function getRelevantCaseStudies(
  capabilityBottleneck?: CapabilityResult,
  level?: number,
  fundingStage?: string,
): CaseStudy[] {
  const scored: { study: CaseStudy; score: number }[] = CASE_STUDIES.map(
    (study) => {
      let score = 0;

      // Match by capability bottleneck
      if (
        capabilityBottleneck &&
        study.relatedCapability === capabilityBottleneck.key
      ) {
        score += 10;
      }

      // Match by level transition
      if (level !== undefined && study.relatedLevel === level) {
        score += 5;
      }

      // Match by funding stage
      if (fundingStage) {
        const stageMap: Record<string, string[]> = {
          "pre-seed": [],
          seed: ["stage-a-to-b"],
          "series-a": ["stage-a-to-b"],
          "series-b": ["c2-setup-bottleneck", "level-1-to-2", "stage-b-to-c"],
          "series-c": ["level-2-to-3", "stage-b-to-c"],
          growth: ["level-2-to-3"],
        };
        if (stageMap[fundingStage]?.includes(study.id)) {
          score += 3;
        }
      }

      return { study, score };
    },
  );

  scored.sort((a, b) => b.score - a.score);

  // Always return at least 1, up to 2
  const top = scored.filter((s) => s.score > 0).slice(0, 2);
  if (top.length === 0) {
    return [CASE_STUDIES[0]];
  }
  return top.map((s) => s.study);
}
