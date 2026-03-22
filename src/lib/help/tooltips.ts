import type { HelpTooltip } from "./types";

export const HELP_TOOLTIPS: Record<string, HelpTooltip> = {
  theta_index: {
    term: "\u03B8_index",
    definition:
      "The AI Maturity Index \u2014 a weighted score from 0\u2013100 measuring the depth of AI integration across six dimensions. Higher scores indicate deeper, more structural AI adoption.",
    source: "01 AI Maturity Framework",
  },
  r_squared: {
    term: "R\u00B2",
    definition:
      "The coefficient of determination, measuring how well the model\u2019s predictions fit observed data. An R\u00B2 of 0.89 means the META formula explains 89% of the variance in scaling outcomes.",
    source: "00 Formel Konvergenz",
  },
  gating: {
    term: "Gating",
    definition:
      "Minimum dimension thresholds that must be met before advancing to a higher maturity level. Prevents surface-level scoring from masking structural gaps.",
    source: "01 AI Maturity Framework",
  },
  s_formula: {
    term: "S-Formula",
    definition:
      "The ANST Scaling Velocity formula: S = E \u00D7 (C\u2081\u00B9\u00B7\u2075 \u00D7 C\u2082 \u00D7 C\u2083\u00B9\u00B7\u2075 \u00D7 C\u2084) \u00D7 \u03B8. Quantifies how fast a company can scale given its enablers, capabilities, and AI maturity.",
    source: "02 AI-native Scaling Theory",
  },
  c1_strategy: {
    term: "C\u2081 Strategy",
    definition:
      "The strategy capability score in the Scaling Stack. Carries a superlinear exponent (1.5) because strategic clarity amplifies all other capabilities.",
    source: "03 SST_0_Scaling Stack",
  },
  superlinear: {
    term: "Superlinear",
    definition:
      "A scaling regime where revenue grows faster than headcount. AI-native companies achieve superlinear scaling by using AI as a multiplier rather than a substitute.",
    source: "02 AI-native Scaling Theory",
  },
  plg_slg_clg: {
    term: "PLG/SLG/CLG",
    definition:
      "Product-Led Growth, Sales-Led Growth, and Community-Led Growth \u2014 the three go-to-market engine types. Each has different priority dimensions and scaling advantages.",
    source: "05a Growth Engines",
  },
  meta_score: {
    term: "META Score",
    definition:
      "The combined scaling potential metric: META = \u03B8 \u00D7 Capability\u1D4D \u00D7 E\u00B9\u2044\u00B3. Predicts time-to-\u20AC100M ARR and scaling coefficient based on empirical validation.",
    source: "00 Formel Konvergenz",
  },
  coordination_cost: {
    term: "Coordination Cost",
    definition:
      "The overhead of synchronizing work across team members. Traditional teams scale at O(n\u00B2), AI-enabled teams at O(n log n), and AI-native teams approach O(n).",
    source: "02 AI-native Scaling Theory",
  },
  bottleneck: {
    term: "Bottleneck",
    definition:
      "The lowest-scoring capability or dimension that constrains overall scaling velocity. Fixing the bottleneck yields the highest leverage improvement.",
    source: "03 SST_1_Playbook",
  },
  scaling_coefficient: {
    term: "Scaling Coefficient",
    definition:
      "The ratio of revenue growth rate to headcount growth rate. Values above 1.0 indicate superlinear scaling — the company grows revenue faster than it adds people.",
    source: "00 Formel Konvergenz",
  },
  coordination_o_n2: {
    term: "O(n²) / O(n log n) / O(n)",
    definition:
      "Complexity classes describing how coordination overhead grows with team size. Traditional teams scale at O(n²) (quadratic), AI-enabled teams at O(n log n), and AI-native teams approach O(n) (linear).",
    source: "02 AI-native Scaling Theory",
  },
};
