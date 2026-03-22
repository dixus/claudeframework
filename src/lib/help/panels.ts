import type { PanelHelp } from "./types";

export const PANEL_HELP: Record<string, PanelHelp> = {
  "score-card": {
    panelId: "score-card",
    title: "Understanding Your AI Maturity Level",
    content:
      "Your \u03B8 score is a weighted composite of six dimensions measuring how deeply AI is integrated into your organisation. The maturity level (0\u20133) reflects qualitatively different operating models, not just incremental improvements. Gating rules ensure structural readiness before advancing.",
    bullets: [
      "Level 0 \u2014 Traditional: no AI integration, linear scaling",
      "Level 1 \u2014 AI-Powered: AI substitutes tasks, 2\u20133x efficiency",
      "Level 2 \u2014 AI-Enabled: AI augments workflows, 3\u20135x quality",
      "Level 3 \u2014 AI-Native: AI orchestrates multi-agent systems, 10\u201330x unit economics",
    ],
    source: "01 AI Maturity Framework",
  },
  "radar-chart": {
    panelId: "radar-chart",
    title: "Reading Your Dimension Radar",
    content:
      "The radar chart visualises your scores across all six dimensions simultaneously. A balanced shape indicates even maturity; spikes or dips reveal strengths and gaps. The further each point extends from center, the higher that dimension\u2019s score.",
    source: "01 AI Maturity Framework",
  },
  "dimension-scorecard": {
    panelId: "dimension-scorecard",
    title: "Dimension Breakdown",
    content:
      "Each dimension is scored 0\u2013100 based on your assessment responses. The weighted contribution to \u03B8 varies: Strategy (25%), Architecture (20%), Workflow (15%), Data (15%), Talent (15%), Adoption (10%). Dimensions below 60 are potential gating constraints.",
    bullets: [
      "Strategy and Architecture carry the highest weights",
      "Adoption has the lowest weight but still affects gating",
      "A single low dimension can gate your maturity level",
    ],
    source: "01 AI Maturity Framework",
  },
  "growth-engine": {
    panelId: "growth-engine",
    title: "Your Growth Engine Classification",
    content:
      "Your go-to-market model determines which dimensions matter most for scaling. PLG companies prioritise Architecture and Data; SLG companies prioritise Strategy and Talent; CLG companies prioritise Adoption and Workflow. The engine classification shapes your scaling roadmap.",
    source: "05a Growth Engines",
  },
  "scaling-panel": {
    panelId: "scaling-panel",
    title: "Superlinear Scaling Analysis",
    content:
      "The META formula combines your \u03B8 score with capability scores and enabler inputs to predict scaling potential. A scaling coefficient above 1.3 indicates superlinear growth \u2014 revenue grows faster than headcount. The formula has been validated across AI-native companies with R\u00B2 = 0.89.",
    bullets: [
      "Linear scaling (< 1.0): revenue grows proportionally to team size",
      "Superlinear (1.0\u20131.5): AI multiplier effect emerging",
      "Highly superlinear (> 1.5): AI-native operating model",
    ],
    source: "00 Formel Konvergenz",
  },
  "velocity-panel": {
    panelId: "velocity-panel",
    title: "Scaling Velocity (ANST S-Formula)",
    content:
      "The S-formula quantifies your scaling velocity as a product of enablers, capabilities, and AI maturity. The gauge shows where you fall on the spectrum from struggling to exponential. What-if scenarios reveal the leverage available from fixing specific capabilities.",
    bullets: [
      "Struggling (S < 0.05): fundamental gaps blocking growth",
      "Linear (0.05\u20130.2): growing but not leveraging AI",
      "Superlinear (0.2\u20130.5): AI multiplier effect active",
      "Exponential (> 0.5): AI-native scaling velocity",
    ],
    source: "02 AI-native Scaling Theory",
  },
  "coordination-panel": {
    panelId: "coordination-panel",
    title: "Coordination Cost Model",
    content:
      "As teams grow, coordination overhead can dominate. Traditional teams face O(n\u00B2) coordination costs (every person must sync with every other). AI-enabled teams reduce this to O(n log n) through automated coordination. AI-native teams approach O(n) with agent-based orchestration.",
    source: "02 AI-native Scaling Theory",
  },
  "capability-panel": {
    panelId: "capability-panel",
    title: "Scaling Stack Capabilities",
    content:
      "The four scaling capabilities (Strategy, Setup, Execution, Operationalisation) form the Scaling Stack. Strategy and Execution carry superlinear exponents (1.5x) in the META formula, meaning improvements there have outsized impact. The bottleneck capability is your highest-leverage intervention point.",
    source: "03 SST_0_Scaling Stack",
  },
  "playbook-panel": {
    panelId: "playbook-panel",
    title: "Intervention Playbook",
    content:
      "The playbook provides a structured intervention plan targeting your capability bottleneck. Three intervention models exist: Bottleneck Resolution (8\u201312 weeks, single dimension), Stage Transition (90 days, multi-dimension), and Level Transformation (6 months, full operating model). The recommended model depends on your \u03B8 gap and bottleneck severity.",
    source: "03 SST_1_Playbook",
  },
  "case-study-panel": {
    panelId: "case-study-panel",
    title: "Validated Case Studies",
    content:
      "Case studies are matched to your profile based on capability bottleneck, maturity level, and intervention model. Each shows before/after metrics from real AI-native transformations, providing empirical evidence for the recommended intervention approach.",
    source: "03 SST_2_Methodology",
  },
  "roadmap-panel": {
    panelId: "roadmap-panel",
    title: "Stage-Specific Scaling Roadmap",
    content:
      "Your roadmap is tailored to your funding stage and current \u03B8 score. It prioritises the dimensions and capabilities most critical for your next growth milestone. The \u03B8 target range shows where you need to be for sustainable scaling at your stage.",
    source: "04 The Scaling Stack",
  },
  "validation-badges": {
    panelId: "validation-badges",
    title: "Empirical Validation",
    content:
      "Validation badges indicate metrics backed by empirical research. The sample size (n) shows how many companies were studied. R\u00B2 values show how well the model predicts real-world outcomes. All core formulas have been validated against AI-native company data.",
    source: "00 Formel Konvergenz",
  },
};
