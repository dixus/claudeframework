# Spec: Scaling Velocity Calculator (ANST S-Formula)

## Goal

Implement the full ANST Scaling Velocity formula `S = E × (C₁^1.5 × C₂ × C₃^1.5 × C₄) × θ_index` and display it as an interactive visualization on the results page. This goes beyond the existing META score by computing the actual scaling velocity coefficient and showing how each input contributes.

## Source Documents

- `02 AI-native Scaling Theory_2025-12-27_v4.5.txt` — ANST formula definition and validation
- `03 SST_1_Playbook_2025-12-30.txt` — §4.1 Diagnostic Framework, Step 3: Calculate S
- `00 Formel Konvergenz_2025-12-30_v4.5.2.txt` — Formula unification

## Requirements

### Engine changes (`src/lib/scoring/engine.ts`)

1. Add `computeScalingVelocity()` function:

   ```ts
   function computeScalingVelocity(
     thetaNorm: number, // 0-100
     capScores: Record<CapabilityKey, number>, // 0-100 each
     enablerScore: number, // 0-100
   ): ScalingVelocity;
   ```

2. Formula implementation:

   ```
   E = enablerScore / 100              (0-1)
   C₁ = capScores.c1_strategy / 100    (0-1)
   C₂ = capScores.c2_setup / 100       (0-1)
   C₃ = capScores.c3_execution / 100   (0-1)
   C₄ = capScores.c4_operationalization / 100  (0-1)
   θ = thetaNorm / 100                 (0-1)

   capabilityProduct = C₁^1.5 × C₂ × C₃^1.5 × C₄
   S = E × capabilityProduct × θ
   ```

3. Compute "what-if" scenarios (from Playbook §4.2):
   - `currentS`: actual score
   - `fixBottleneckS`: S if bottleneck capability raised to 0.85
   - `fixAllS`: S if all capabilities raised to 0.85
   - `addAIS`: S if all capabilities 0.85 AND θ raised to 0.90

4. Map S to interpretation bands:
   - S < 0.05: "Struggling" (below baseline)
   - S 0.05–0.20: "Linear scaling" (traditional SaaS)
   - S 0.20–0.50: "Superlinear scaling" (AI-enabled)
   - S > 0.50: "Exponential scaling" (AI-native)

### Type changes (`src/lib/scoring/types.ts`)

1. Add:

   ```ts
   interface ScalingVelocity {
     s: number; // raw S value
     band: "struggling" | "linear" | "superlinear" | "exponential";
     bandLabel: string;
     components: {
       enabler: number;
       capabilityProduct: number;
       theta: number;
     };
     scenarios: {
       current: number;
       fixBottleneck: number;
       fixAll: number;
       addAI: number;
     };
     bottleneckCapability: CapabilityKey;
   }
   ```

2. Add `scalingVelocity?: ScalingVelocity` to `AssessmentResult`

### Results UI (`src/components/results/VelocityPanel.tsx`) — NEW FILE

1. **Velocity gauge**: Semi-circular gauge showing S value with colored band
   - Red (Struggling) → Yellow (Linear) → Blue (Superlinear) → Green (Exponential)
2. **Component breakdown**: 3 factor cards (E, C-product, θ) showing contribution
3. **What-if scenarios**: Bar chart comparing 4 scenarios:
   - "Current" → "Fix [bottleneck]" → "Fix All Capabilities" → "Add AI"
   - Show the multiplicative improvement (e.g. "3x", "6x") above each bar
4. **Insight text**: "Fixing your [bottleneck] capability would improve scaling velocity by [X]x"
5. Use Recharts for the bar chart (already in the project)

### Results page

1. Add VelocityPanel to ResultsPage, after ScalingPanel
2. Conditional on enablers + capabilities being provided

### Tests

1. `computeScalingVelocity()` unit tests:
   - All zeros → S = 0
   - All 100s → S at maximum
   - Known manual calculation matches
   - Scenario calculations are correct
2. Band assignment tests for each threshold

## Dependencies

- **Depends on PRD 1 (ANST Exponents)** — must ship first since both use C₁^1.5, C₃^1.5

## Out of scope

- Historical S tracking over time
- S comparison against peer companies
- Interactive slider to adjust inputs

## Acceptance criteria

- [ ] `computeScalingVelocity()` implements correct ANST formula
- [ ] What-if scenarios match Playbook §4.2 methodology
- [ ] Band classification matches documented thresholds
- [ ] VelocityPanel renders gauge, breakdown, and scenarios
- [ ] Recharts bar chart for what-if comparison
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
