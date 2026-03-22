# Spec: Validation Stats Display

## Goal

Show empirical validation evidence behind the assessment's predictions. Currently all validation stats (n=22 companies, R²=0.91, R²=0.76, p-values) are only in code comments — users never see them. Adding visible validation stats increases credibility and trust in the results.

## Source Documents

- `02 AI-native Scaling Theory_2025-12-27_v4.5.txt` — Validation studies (n=22, R²=0.76 for ANST)
- `00 Formel Konvergenz_2025-12-30_v4.5.2.txt` — META validation (R²=0.91)
- `03b Research SST_Superlinear Growth_2025-12-30.txt` — Superlinear validation data

## Requirements

### Data layer (`src/lib/scoring/validation.ts`) — NEW FILE

1. Export `VALIDATION_STATS` constant:

   ```ts
   interface ValidationStat {
     formula: string; // "META", "ANST", "θ_index", "Coordination Cost"
     metric: string; // "R²", "r", "p-value"
     value: string; // "0.91", "0.76", "3×10⁻⁸"
     sampleSize: number; // 22
     description: string; // "Predicts Time to €100M ARR"
     confidence: "High" | "Medium";
   }
   ```

2. Data from documents:
   - META formula: R²=0.91, n=22, "Predicts Time to €100M ARR", High confidence
   - ANST (S-formula): R²=0.76, n=22, "Scaling velocity prediction", High confidence
   - θ_index: validated across 22 companies, "AI Maturity classification", High confidence
   - Superlinear coefficient: 1.3–1.8 range validated, n=22, Medium confidence
   - Coordination cost: O(n²) vs O(n log n) validated, "Team scaling efficiency", Medium confidence

3. Framework-agnostic, no React imports

### UI — Add to existing panels (NO new panel)

1. **ScalingPanel** (`src/components/results/ScalingPanel.tsx`):
   - Add small "Validated" badge next to META Score: `R²=0.91, n=22`
   - Add footnote below formula: "Based on empirical validation across 22 AI-native companies"

2. **VelocityPanel** (`src/components/results/VelocityPanel.tsx`):
   - Add validation badge: `R²=0.76, n=22`

3. **ScoreCard** (`src/components/results/ScoreCard.tsx`):
   - Add small text below level badge: "Validated framework (n=22 companies)"

### Styling

- Use a subtle inline badge: light gray background, small text
- Format: `✓ Validated (R²=0.91, n=22)` or similar
- Do NOT create a separate validation panel — keep it integrated and subtle

## Out of scope

- Interactive validation data explorer
- Links to research papers
- Confidence intervals visualization
- Raw data tables

## Acceptance criteria

- [ ] Validation stats visible on ScalingPanel, VelocityPanel, and ScoreCard
- [ ] Stats match source document values exactly
- [ ] Styling is subtle (badge/footnote, not a full panel)
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
