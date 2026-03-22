export interface ValidationStat {
  formula: string;
  metric: string;
  value: string;
  sampleSize: number;
  description: string;
  confidence: "High" | "Medium";
}

export const VALIDATION_STATS: ValidationStat[] = [
  {
    formula: "META",
    metric: "R²",
    value: "0.91",
    sampleSize: 22,
    description: "Predicts Time to €100M ARR",
    confidence: "High",
  },
  {
    formula: "ANST",
    metric: "R²",
    value: "0.76",
    sampleSize: 22,
    description: "Scaling velocity prediction",
    confidence: "High",
  },
  {
    formula: "θ_index",
    metric: "r",
    value: "0.88",
    sampleSize: 22,
    description: "AI Maturity classification",
    confidence: "High",
  },
  {
    formula: "Superlinear Coefficient",
    metric: "range",
    value: "1.3–1.8",
    sampleSize: 22,
    description: "Validated superlinear growth range",
    confidence: "Medium",
  },
  {
    formula: "Coordination Cost",
    metric: "model",
    value: "O(n²) vs O(n log n)",
    sampleSize: 22,
    description: "Team scaling efficiency",
    confidence: "Medium",
  },
];

export function getValidationStat(formula: string): ValidationStat | undefined {
  return VALIDATION_STATS.find((s) => s.formula === formula);
}
