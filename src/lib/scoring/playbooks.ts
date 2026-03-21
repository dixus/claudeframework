// Source: Scaling Stack v2.0 (Document 4), AI-Native Scaling Playbook v1.0
import type {
  DimensionKey,
  ModelId,
  PlaybookContent,
  AssessmentResult,
  CapabilityKey,
  CapabilityPlaybook,
} from "./types";

// Selection threshold for model recommendation:
// Levels 0+1 target Level 2 (threshold 51); Level 2 targets Level 3 (threshold 81)
const SELECTION_THRESHOLD: Record<number, number | null> = {
  0: 51,
  1: 51,
  2: 81,
  3: null,
};

export function selectModel(result: AssessmentResult): ModelId {
  const levelNum = result.level.level;
  if (levelNum === 3) return "model3";
  const threshold = SELECTION_THRESHOLD[levelNum]!;
  const gap = threshold - result.thetaScore;
  if (gap > 30) return "model3";
  if (gap < 15 && result.bottleneck.score < 60) return "model1";
  return "model2";
}

export const PLAYBOOKS: Record<
  DimensionKey,
  Record<ModelId, PlaybookContent>
> = {
  strategy: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Close the Strategy gap with a targeted OKR sprint and executive alignment session.",
      steps: [
        "Run a 2-day leadership workshop to align AI vision with revenue OKRs",
        "Define 3 measurable AI strategy KPIs reviewed monthly by the board",
        "Assign a dedicated AI sponsor at C-level with quarterly budget authority",
        "Document and communicate the AI roadmap to all department leads",
        "Set a 60-day checkpoint to measure adoption of the strategy across teams",
      ],
      expectedOutcome:
        "Strategy score improves 15–25 points; AI roadmap visible company-wide within 8 weeks.",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Rebuild strategic foundations to support a full level transition in AI maturity.",
      steps: [
        "Commission an external AI strategy audit benchmarked against Level 2 companies",
        "Redesign the AI roadmap with 6-month milestones tied to ARR and efficiency targets",
        "Establish an AI governance board meeting monthly with cross-functional ownership",
        "Integrate AI investment into the annual budget cycle with dedicated headcount",
        "Define the AI narrative for investors, customers, and recruits",
      ],
      expectedOutcome:
        "30–40 point improvement in Strategy score; organization-wide alignment achieved within 90 days.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Redesign the business model so AI is the strategy, not a tool within it.",
      steps: [
        "Hire or promote a Chief AI Officer with P&L accountability for AI initiatives",
        "Conduct a business model redesign workshop: what does AI-native look like for your market?",
        "Build an AI Center of Excellence to own standards, tooling, and skill development",
        "Replace annual AI planning cycles with a continuous AI portfolio process",
        "Tie executive compensation to AI maturity milestones and unit economics targets",
      ],
      expectedOutcome:
        "Architectural transformation of value creation; 10–30x unit economics improvement within 18–24 months (AMF v4.5.1 data).",
    },
  },
  architecture: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Unblock Architecture with a targeted infrastructure modernisation sprint.",
      steps: [
        "Audit current data infrastructure and identify the top 3 AI-blocking constraints",
        "Implement an API-first data layer to decouple AI workloads from core systems",
        "Introduce automated CI/CD pipelines for model deployment and rollback",
        "Migrate one high-value workflow to a modular, AI-ready microservice architecture",
        "Establish infrastructure monitoring and auto-scaling for AI workloads",
      ],
      expectedOutcome:
        "Architecture score improves 15–25 points; one AI workflow deployed on scalable infrastructure.",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Rebuild technical foundations to support AI-Enabled (Level 2) operations.",
      steps: [
        "Design and implement a central data platform (Snowflake, Databricks, or equivalent)",
        "Build a model registry and experiment tracking system (MLflow or equivalent)",
        "Define API contracts for all AI service integrations across products",
        "Implement a feature store to share ML features across teams",
        "Introduce infrastructure-as-code for all AI environments",
      ],
      expectedOutcome:
        "30–40 point improvement in Architecture score; AI-native infrastructure serving 3+ workloads.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Rebuild the entire tech stack as an AI-native architecture (multi-agent, autonomous).",
      steps: [
        "Migrate to an AI-native data architecture: vector databases, real-time pipelines, LLM APIs",
        "Design a multi-agent orchestration layer (LangGraph, AutoGen, or custom)",
        "Build proprietary models for your highest-value use cases (fine-tuning or RAG)",
        "Implement AI observability: cost tracking, drift detection, hallucination monitoring",
        "Architect for continuous learning: production feedback loops that retrain models automatically",
      ],
      expectedOutcome:
        "AI-native architecture enabling 10–30x unit economics; custom models deployed across core workflows.",
    },
  },
  workflow: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Embed AI copilots into the single highest-volume operational workflow.",
      steps: [
        "Identify the one workflow consuming the most manual hours per week",
        "Deploy a validated AI copilot tool for that workflow (pilot team of 5–10 people)",
        "Measure cycle time reduction at week 4 and week 8",
        "Establish a feedback loop: team reports friction, you iterate the tool weekly",
        "Set a KPI target: Cycle-Time –30% within 12 weeks",
      ],
      expectedOutcome:
        "Workflow score improves 15–20 points; target workflow cycle time reduced by 30% (AMF v4.5.1).",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Redesign and AI-enable the top 3 operational workflows in a structured 90-day sprint.",
      steps: [
        "Map all core processes and rank by AI automation potential (hours saved × frequency)",
        "Launch 3 parallel AI workflow pilots — one per top-ranked process",
        "Automate repetitive tasks within each workflow using no-code AI tools as a first step",
        "Establish workflow performance dashboards visible to team leads weekly",
        'Define "AI-ready" criteria and transition qualifying workflows to fully automated',
      ],
      expectedOutcome:
        "30–40 point improvement in Workflow score; 3 core workflows AI-enabled with measurable cycle time reduction.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Redesign the operating model so AI orchestrates workflows end-to-end.",
      steps: [
        "Map the entire value chain and redesign it with AI as the primary executor, not assistant",
        "Implement multi-agent workflows for complex, multi-step operational processes",
        "Build proprietary workflow automation that combines AI agents with human oversight gates",
        "Create feedback loops where workflow outputs retrain and improve the underlying models",
        "Shift operating model KPIs from headcount-based to AI-throughput-based metrics",
      ],
      expectedOutcome:
        "Autonomous AI-orchestrated operations; ARR/employee improves 3–10x vs. current baseline.",
    },
  },
  data: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Establish a clean data foundation to unblock AI model quality.",
      steps: [
        "Audit top 3 datasets used by your AI models and fix the most critical quality issues",
        "Implement basic data quality checks and monitoring using dbt or Great Expectations",
        "Set up a simple data versioning system for your highest-value datasets",
        "Define and track 3 data quality KPIs (completeness, freshness, accuracy)",
        "Assign one data steward per domain to own quality going forward",
      ],
      expectedOutcome:
        "Data score improves 15–20 points; decision latency reduced by 30–50% on instrumented workflows.",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Build a centralised data platform that supports AI-Enabled operations.",
      steps: [
        "Deploy a cloud data warehouse (Snowflake, BigQuery, or Redshift) as the single source of truth",
        "Implement automated ingestion pipelines for all key data sources (Fivetran, Airbyte)",
        "Build a data transformation layer with dbt for consistent, versioned datasets",
        "Establish a data governance process: ownership, classification, access controls",
        "Launch real-time dashboards for decision-making across all departments",
      ],
      expectedOutcome:
        "30–40 point improvement in Data score; data-driven decisions in 80%+ of operational processes.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Build a proprietary data moat that powers autonomous AI systems.",
      steps: [
        "Implement a feature store and vector database for real-time AI inference",
        "Build proprietary datasets from product usage, customer signals, and operational telemetry",
        "Create continuous data pipelines that update model features in real time (< 1 hour latency)",
        "Establish data flywheel loops: more users → more data → better models → better product",
        "Implement full data lineage and impact analysis for AI governance and compliance",
      ],
      expectedOutcome:
        "Proprietary data moat delivering sustainable competitive advantage; model quality improving continuously.",
    },
  },
  talent: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Run a focused AI upskilling sprint for the team operating the bottleneck workflow.",
      steps: [
        "Identify the 10 team members with highest daily AI tool exposure",
        "Launch a structured 4-week prompt engineering and AI tool training programme",
        "Assign AI champions per team — one person responsible for tool adoption and feedback",
        "Create an internal Slack/Teams channel for sharing AI wins and learnings",
        "Measure AI tool daily active usage (DAU) before and after the sprint",
      ],
      expectedOutcome:
        "Talent score improves 15–20 points; AI tool DAU increases 2–3x within 8 weeks.",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Build an AI-capable team through structured hiring, training, and knowledge sharing.",
      steps: [
        "Add AI competencies to all job descriptions and interview scorecards immediately",
        "Hire or contract 2–3 AI specialists (ML engineer, AI PM, or data scientist) in 90 days",
        "Launch a company-wide AI literacy programme covering tools, risks, and best practices",
        "Create an internal AI knowledge base documenting tools, prompts, and use cases",
        'Establish a monthly "AI Demo Day" where teams share wins and lessons',
      ],
      expectedOutcome:
        "30–40 point improvement in Talent score; AI competency embedded in hiring and performance processes.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Build an AI-native organisation where every role is redefined around AI leverage.",
      steps: [
        "Build an AI Center of Excellence (3–8 people) owning internal AI tooling, standards, and training",
        "Redesign 50%+ of job roles to incorporate AI as a primary tool, not optional add-on",
        "Create a dedicated AI engineering team responsible for proprietary model development",
        "Implement AI performance metrics in all employee reviews (AI tool usage, automation rate)",
        "Partner with universities and AI labs to access frontier research and talent pipelines",
      ],
      expectedOutcome:
        "AI-native talent model; ARR/employee reaches €700K–1.5M range as AI multiplies human output.",
    },
  },
  adoption: {
    model1: {
      modelName: "Bottleneck Resolution",
      timeline: "8–12 weeks",
      description:
        "Drive rapid AI adoption in one team using a targeted change-management sprint.",
      steps: [
        "Pick the team with the highest AI tool access but lowest usage — run a 30-day adoption challenge",
        "Remove friction: pre-configure tools, set up integrations, create ready-to-use prompts",
        "Assign a dedicated AI champion to onboard and support the team daily",
        "Track daily active AI usage and share weekly leaderboards to create positive competition",
        'Celebrate and publicise the first 5 "AI success stories" from the team',
      ],
      expectedOutcome:
        "Adoption score improves 15–20 points; daily AI tool usage increases 3–5x in the target team.",
    },
    model2: {
      modelName: "Stage Transition",
      timeline: "90 days",
      description:
        "Embed AI into the daily operating rhythm of all core teams.",
      steps: [
        "Define and track adoption KPIs: DAU, task deflection rate, and time-saved per user",
        "Integrate AI tools into daily standups, planning sessions, and decision workflows",
        "Run change-management campaigns addressing the top 3 adoption barriers in each team",
        "Create an AI adoption scorecard reviewed in monthly leadership meetings",
        "Tie adoption milestones to team OKRs to make AI usage a business priority",
      ],
      expectedOutcome:
        "30–40 point improvement in Adoption score; AI usage embedded in daily operations across 80%+ of teams.",
    },
    model3: {
      modelName: "Level Transition",
      timeline: "6–24 months",
      description:
        "Build a culture where AI-first thinking is the default operating mode.",
      steps: [
        "Redesign the company operating rhythm: all meetings, reviews, and decisions are AI-assisted by default",
        "Implement AI-usage telemetry across all tools to measure adoption depth (not just breadth)",
        "Create an internal AI culture programme: storytelling, recognition, and community",
        "Rewrite onboarding so every new hire is AI-proficient by end of their first week",
        'Publish an annual "AI Impact Report" for employees, investors, and customers',
      ],
      expectedOutcome:
        "AI-native culture; adoption is no longer a change management problem — it is the default mode of work.",
    },
  },
};

// Source: SST Playbook §5.2 Bottleneck-Specific Playbooks
export const CAPABILITY_PLAYBOOKS: Record<CapabilityKey, CapabilityPlaybook> = {
  c1_strategy: {
    capability: "c1_strategy",
    label: "C\u2081 Strategy",
    duration: "8 weeks",
    symptoms: [
      "Unclear ICP",
      "Competing priorities",
      "Low win rates",
      "High CAC",
    ],
    rootCauses: [
      "No coherent AI strategy aligned with business goals",
      "Leadership misalignment on AI investment priorities",
      "Missing ICP definition for AI-native go-to-market",
      "AI initiatives scattered across departments without coordination",
    ],
    phases: [
      {
        name: "Sensing",
        weeks: "Week 1-2",
        actions: [
          "Interview leadership team on AI vision and priorities",
          "Benchmark ICP clarity against top-performing peers",
          "Map current AI initiatives and their strategic alignment",
          "Identify the top 3 strategic gaps blocking scaling velocity",
        ],
      },
      {
        name: "Choice",
        weeks: "Week 3-4",
        actions: [
          "Define the AI-native ICP with measurable qualification criteria",
          "Prioritize AI initiatives using impact vs. effort matrix",
          "Align leadership on a single strategic AI narrative",
          "Set 3 strategic KPIs tied to win rate and CAC improvement",
        ],
      },
      {
        name: "Formulation",
        weeks: "Week 5-6",
        actions: [
          "Document the AI strategy with 90-day milestones",
          "Assign ownership for each strategic initiative",
          "Communicate the strategy to all department leads",
          "Integrate AI strategy into the quarterly planning cycle",
        ],
      },
      {
        name: "Review",
        weeks: "Week 7-8",
        actions: [
          "Measure win rate and CAC changes since baseline",
          "Review strategic KPI progress with leadership",
          "Adjust priorities based on first 6 weeks of data",
          "Set up recurring monthly strategy review cadence",
        ],
      },
    ],
    expectedImpact: {
      sImprovement: "2.5x",
      primaryMetric: "Win rate +20-30pp",
      secondaryMetric: "CAC -30-40%",
    },
  },
  c2_setup: {
    capability: "c2_setup",
    label: "C\u2082 Setup",
    duration: "12 weeks",
    symptoms: [
      "Chaotic execution",
      "Tools don't integrate",
      "Manual processes",
      "Scattered data",
    ],
    rootCauses: [
      "No unified tech stack supporting AI workflows",
      "Data silos preventing cross-functional AI use cases",
      "Manual processes that should be automated",
      "Tool sprawl without integration strategy",
    ],
    phases: [
      {
        name: "Audit",
        weeks: "Week 1-2",
        actions: [
          "Inventory all tools, data sources, and integration points",
          "Map data flows and identify silos and manual handoffs",
          "Benchmark current setup maturity against SST Level 2 criteria",
          "Prioritize the top 3 setup gaps by impact on scaling velocity",
        ],
      },
      {
        name: "Design",
        weeks: "Week 3-6",
        actions: [
          "Design the target integrated tech stack architecture",
          "Define data integration contracts between systems",
          "Select and procure missing tools for the target stack",
          "Plan migration path from current to target state",
        ],
      },
      {
        name: "Build",
        weeks: "Week 7-10",
        actions: [
          "Implement core integrations between priority systems",
          "Automate the top 3 manual processes identified in audit",
          "Deploy centralized data layer accessible to all teams",
          "Set up monitoring and alerting for the integrated stack",
        ],
      },
      {
        name: "Operationalize",
        weeks: "Week 11-12",
        actions: [
          "Train teams on the new integrated workflows",
          "Document standard operating procedures for the new stack",
          "Measure ARR/Employee improvement since baseline",
          "Establish ongoing maintenance and improvement cadence",
        ],
      },
    ],
    expectedImpact: {
      sImprovement: "3x",
      primaryMetric: "ARR/Employee 3x",
      secondaryMetric: "Integration coverage 100%",
    },
  },
  c3_execution: {
    capability: "c3_execution",
    label: "C\u2083 Execution",
    duration: "6 weeks",
    symptoms: [
      "Slow shipping",
      "Low quality",
      "Missed deadlines",
      "Low morale",
    ],
    rootCauses: [
      "No velocity metrics or shipping cadence",
      "Quality gates missing or inconsistent",
      "Team overloaded with competing priorities",
      "Lack of AI-assisted development workflows",
    ],
    phases: [
      {
        name: "Velocity",
        weeks: "Week 1-2",
        actions: [
          "Establish shipping velocity baseline metrics",
          "Deploy AI coding assistants for the engineering team",
          "Implement daily standup focused on shipping blockers",
          "Set weekly shipping targets with public accountability",
        ],
      },
      {
        name: "Quality",
        weeks: "Week 3-4",
        actions: [
          "Implement automated testing and CI/CD quality gates",
          "Deploy AI-assisted code review for all pull requests",
          "Define and track defect rate as a team KPI",
          "Run a quality sprint to fix the top 10 known defects",
        ],
      },
      {
        name: "Consistency",
        weeks: "Week 5-6",
        actions: [
          "Standardize sprint planning and retrospective processes",
          "Measure and celebrate shipping velocity improvements",
          "Automate repetitive development tasks with AI tools",
          "Set up continuous improvement cadence for execution quality",
        ],
      },
    ],
    expectedImpact: {
      sImprovement: "2.8x",
      primaryMetric: "Shipping velocity +50-100%",
      secondaryMetric: "Defect rate -50%",
    },
  },
  c4_operationalization: {
    capability: "c4_operationalization",
    label: "C\u2084 Operationalization",
    duration: "10 weeks",
    symptoms: [
      "Manual tasks",
      "No automation",
      "Slow reporting",
      "Data quality issues",
    ],
    rootCauses: [
      "Processes not documented or standardized",
      "No automation strategy or tooling",
      "Reporting relies on manual data collection",
      "Data quality not monitored or enforced",
    ],
    phases: [
      {
        name: "Automation",
        weeks: "Week 1-3",
        actions: [
          "Identify the top 5 manual processes by time spent",
          "Deploy automation for the highest-impact manual workflow",
          "Set up automated data quality checks and alerts",
          "Measure time saved per automated process",
        ],
      },
      {
        name: "Integration",
        weeks: "Week 4-6",
        actions: [
          "Connect automated processes to central reporting systems",
          "Build real-time dashboards replacing manual reports",
          "Implement cross-system data validation rules",
          "Train teams on self-service analytics and reporting",
        ],
      },
      {
        name: "Measurement",
        weeks: "Week 7-10",
        actions: [
          "Track and report time saved across all automated processes",
          "Measure data quality improvement against baseline",
          "Optimize automation based on first 6 weeks of data",
          "Establish ongoing operationalization improvement cadence",
        ],
      },
    ],
    expectedImpact: {
      sImprovement: "2.8x",
      primaryMetric: "Time saved 20-30%",
      secondaryMetric: "Data quality +50%",
    },
  },
};
