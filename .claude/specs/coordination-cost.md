# Spec: Coordination Cost Model

## Goal

Visualize the coordination cost advantage of AI-native companies. Traditional companies face O(n²) coordination costs as teams grow (quadratic increase in communication channels), while AI-native companies achieve O(n log n) or even O(n) through AI automation and flat hierarchies. This visualization shows the company where they stand on this curve based on their AI maturity.

## Source Documents

- `02 AI-native Scaling Theory_2025-12-27_v4.5.txt` — §1.2 Superlinear Growth Pattern: coordination cost comparison
- `03b Research SST_Efficiency_2025-12-30.txt` — Efficiency research data

## Requirements

### Data layer (`src/lib/scoring/coordination.ts`) — NEW FILE

1. Create types:

   ```ts
   interface CoordinationModel {
     teamSize: number;
     traditionalCost: number; // O(n²) normalized
     aiEnabledCost: number; // O(n log n) normalized
     aiNativeCost: number; // O(n) normalized
     companyCost: number; // interpolated based on θ
   }
   ```

2. Export `computeCoordinationCurves(teamSize: number, theta: number)`:
   - Generate data points for team sizes: 10, 25, 50, 100, 200, 500
   - Traditional: `cost = n * (n-1) / 2` (normalized to 0-100 scale)
   - AI-Enabled: `cost = n * log2(n)` (normalized)
   - AI-Native: `cost = n * 1.5` (normalized, near-linear)
   - Company's curve: interpolate between traditional and AI-native based on θ
     - θ < 20: follows traditional curve
     - θ 20-50: blend traditional → AI-enabled
     - θ 50-80: follows AI-enabled curve
     - θ > 80: blend AI-enabled → AI-native

3. Export `getCoordinationInsight(theta: number, teamSize: number)`:
   - Returns text insight like "At your team size of 80, AI-native coordination saves ~40% overhead vs traditional"
   - Calculate percentage savings: `1 - companyCost / traditionalCost`

4. Framework-agnostic, no React imports

### Results UI (`src/components/results/CoordinationPanel.tsx`) — NEW FILE

1. **Line chart** (Recharts) showing 4 curves:
   - Gray dashed: Traditional O(n²)
   - Blue: AI-Enabled O(n log n)
   - Green: AI-Native O(n)
   - Orange dot/highlight: "You are here" marker at company's team size and θ-interpolated cost
2. X-axis: Team size (10–500)
3. Y-axis: Relative coordination cost (normalized)
4. **Annotation**: vertical line at company's current team size
5. **Insight card** below chart: savings percentage and recommendation
6. **Legend**: explain the 3 models

### Integration

1. Add to `AssessmentResult`: `coordination?: { curves: CoordinationModel[], insight: string, savings: number }`
2. Compute in `computeResult()` when enablers (teamSize) and θ available
3. Add to ResultsPage after VelocityPanel, conditional on data existing

### Tests

1. `computeCoordinationCurves()`:
   - Traditional cost at n=100 should be ~4950 (before normalization)
   - AI-native cost at n=100 should be ~150
   - θ=0 company curve matches traditional
   - θ=100 company curve matches AI-native
2. `getCoordinationInsight()`:
   - Returns non-empty string
   - Savings percentage is between 0 and 1

## Out of scope

- Interactive team size slider (future enhancement)
- Meeting-hour estimation
- Org chart visualization
- Historical tracking

## Acceptance criteria

- [ ] Coordination curves mathematically correct for O(n²), O(n log n), O(n)
- [ ] Company interpolation based on θ produces sensible results
- [ ] Recharts line chart renders 4 curves with "You are here" marker
- [ ] Insight text is contextual to company's team size and θ
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
