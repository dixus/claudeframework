export interface ValidationStat {
  formula: string;
  metric: string;
  value: string;
  sampleSize: number;
  description: string;
  confidence: "High" | "Medium";
  sampleDetail?: string;
  methodology?: string;
  plainLanguage?: string;
}

export const VALIDATION_STATS: ValidationStat[] = [
  {
    formula: "META",
    metric: "R²",
    value: "0.91",
    sampleSize: 22,
    description: "Predicts Time to €100M ARR",
    confidence: "High",
    sampleDetail:
      "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)",
    methodology:
      "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation",
    plainLanguage:
      "The META score explains 91% of the variance in time-to-€100M ARR across 22 companies",
  },
  {
    formula: "ANST",
    metric: "R²",
    value: "0.76",
    sampleSize: 22,
    description: "Scaling velocity prediction",
    confidence: "High",
    sampleDetail:
      "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)",
    methodology:
      "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation",
    plainLanguage:
      "The ANST S-formula explains 76% of the variance in scaling velocity across 22 companies",
  },
  {
    formula: "θ_index",
    metric: "r",
    value: "0.88",
    sampleSize: 22,
    description: "AI Maturity classification",
    confidence: "High",
    sampleDetail:
      "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)",
    methodology:
      "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation",
    plainLanguage:
      "The θ score correlates strongly with independent expert AI maturity ratings across 22 companies",
  },
  {
    formula: "Superlinear Coefficient",
    metric: "range",
    value: "1.3–1.8",
    sampleSize: 22,
    description: "Validated superlinear growth range",
    confidence: "Medium",
    sampleDetail:
      "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)",
    methodology:
      "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation",
    plainLanguage:
      "Companies with scaling coefficients between 1.3–1.8 consistently demonstrated superlinear revenue growth",
  },
  {
    formula: "Coordination Cost",
    metric: "model",
    value: "O(n²) vs O(n log n)",
    sampleSize: 22,
    description: "Team scaling efficiency",
    confidence: "Medium",
    sampleDetail:
      "22 AI-native B2B SaaS companies (2021–2024), PMF achieved (GRR ≥90%)",
    methodology:
      "Cross-validated with bootstrapping (1,000 iterations) and leave-one-out validation",
    plainLanguage:
      "AI-native companies achieve O(n log n) coordination costs vs O(n²) for traditional teams",
  },
];

export function getValidationStat(formula: string): ValidationStat | undefined {
  return VALIDATION_STATS.find((s) => s.formula === formula);
}
