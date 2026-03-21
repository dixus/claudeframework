import type { DimensionKey } from "./types";

export type GrowthEngineType = "plg" | "slg" | "clg" | "hybrid";

export interface GrowthEngine {
  type: GrowthEngineType;
  label: string;
  shortLabel: string;
  description: string;
  keyMetrics: string[];
  priorityDimensions: DimensionKey[];
  scalingAdvantage: string;
  aiLeverage: string;
  examples: string[];
}

export const GROWTH_ENGINES: Record<GrowthEngineType, GrowthEngine> = {
  plg: {
    type: "plg",
    label: "Product-Led Growth",
    shortLabel: "PLG",
    description:
      "Growth driven by the product itself — users discover, adopt, and expand through self-serve experiences.",
    keyMetrics: [
      "Activation rate",
      "Time-to-value",
      "Viral coefficient",
      "Free-to-paid conversion",
    ],
    priorityDimensions: ["architecture", "workflow", "adoption"],
    scalingAdvantage: "Zero marginal cost per user, network effects",
    aiLeverage: "AI features become the product moat",
    examples: ["Cursor", "Notion", "Figma"],
  },
  slg: {
    type: "slg",
    label: "Sales-Led Growth",
    shortLabel: "SLG",
    description:
      "Growth driven by a sales team — revenue scales through pipeline management, deal velocity, and enterprise accounts.",
    keyMetrics: ["Pipeline velocity", "Win rate", "ACV", "Sales cycle length"],
    priorityDimensions: ["strategy", "talent", "data"],
    scalingAdvantage: "High ACV compounds with fewer deals needed",
    aiLeverage: "AI SDRs, predictive lead scoring, deal intelligence",
    examples: ["Salesforce", "HubSpot", "Gong"],
  },
  clg: {
    type: "clg",
    label: "Community-Led Growth",
    shortLabel: "CLG",
    description:
      "Growth driven by community — users attract other users through content, advocacy, and shared learning.",
    keyMetrics: [
      "Community growth rate",
      "Content engagement",
      "Referral rate",
      "NPS",
    ],
    priorityDimensions: ["adoption", "talent", "strategy"],
    scalingAdvantage: "Community-generated content and word-of-mouth",
    aiLeverage: "AI-powered community management, content generation",
    examples: ["Midjourney", "dbt", "Hugging Face"],
  },
  hybrid: {
    type: "hybrid",
    label: "Hybrid Growth",
    shortLabel: "Hybrid",
    description:
      "Combination of multiple growth engines — most common in Series B+ companies that layer sales on top of product-led or community-led motions.",
    keyMetrics: [
      "Blended CAC",
      "Channel mix efficiency",
      "Cross-motion conversion",
    ],
    priorityDimensions: ["strategy", "architecture", "adoption"],
    scalingAdvantage:
      "Multiple acquisition channels reduce single-channel risk",
    aiLeverage: "AI orchestrates across channels, optimising spend and routing",
    examples: ["Slack", "Datadog", "GitLab"],
  },
};

export interface GrowthEngineQuestion {
  id: string;
  question: string;
  options: Array<{
    label: string;
    description: string;
    engine: GrowthEngineType;
  }>;
}

export const GROWTH_ENGINE_QUESTIONS: GrowthEngineQuestion[] = [
  {
    id: "acquisition",
    question: "How do most customers first experience your product?",
    options: [
      {
        label: "Self-serve signup",
        description:
          "Users sign up, explore, and adopt on their own without talking to sales",
        engine: "plg",
      },
      {
        label: "Sales outreach",
        description:
          "Sales reps identify and contact prospects through outbound or inbound leads",
        engine: "slg",
      },
      {
        label: "Community or word-of-mouth",
        description:
          "Users discover the product through community forums, events, or peer recommendations",
        engine: "clg",
      },
    ],
  },
  {
    id: "revenue",
    question: "What drives the majority of your revenue?",
    options: [
      {
        label: "Product-driven conversion",
        description:
          "Users upgrade from free to paid based on usage limits or premium features",
        engine: "plg",
      },
      {
        label: "Sales-closed deals",
        description:
          "Revenue comes primarily from deals negotiated and closed by the sales team",
        engine: "slg",
      },
      {
        label: "Community-driven expansion",
        description:
          "Revenue grows through community advocacy, referrals, and organic expansion",
        engine: "clg",
      },
    ],
  },
  {
    id: "discovery",
    question: "How do customers learn about your product?",
    options: [
      {
        label: "Viral loops or in-product sharing",
        description:
          "Existing users invite others, or the product naturally surfaces to new users",
        engine: "plg",
      },
      {
        label: "Marketing and sales pipeline",
        description:
          "Targeted campaigns, content marketing, and SDR outreach drive awareness",
        engine: "slg",
      },
      {
        label: "Community content and events",
        description:
          "Blog posts, meetups, open-source contributions, and community champions spread the word",
        engine: "clg",
      },
    ],
  },
];

export interface GrowthEngineAnswers {
  [questionId: string]: GrowthEngineType;
}

export function classifyGrowthEngine(
  answers: GrowthEngineAnswers,
): GrowthEngineType {
  const tally: Record<GrowthEngineType, number> = {
    plg: 0,
    slg: 0,
    clg: 0,
    hybrid: 0,
  };

  for (const engine of Object.values(answers)) {
    if (engine in tally) {
      tally[engine]++;
    }
  }

  const entries = Object.entries(tally).filter(
    ([key]) => key !== "hybrid",
  ) as Array<[GrowthEngineType, number]>;
  entries.sort((a, b) => b[1] - a[1]);

  const top = entries[0];
  const second = entries[1];

  if (top[1] === 0) return "hybrid";
  if (top[1] === second[1]) return "hybrid";
  return top[0];
}
