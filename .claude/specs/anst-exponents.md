# Spec: ANST Superlinear Exponents

## Goal

Apply the validated superlinear exponents (C₁^1.5 and C₃^1.5) from the ANST formula to the META calculation in the scoring engine. Currently the engine uses a uniform geometric mean `(C₁ × C₂ × C₃ × C₄)^(1/4)`, but the AI-Native Scaling Theory v4.5.3 (validated with n=22 companies, R²=0.76) shows that Strategy and Execution have higher leverage than Setup and Operationalization.

## Source Documents

- `02 AI-native Scaling Theory_2025-12-27_v4.5.txt` — defines `S = E × (C₁^1.5 × C₂ × C₃^1.5 × C₄) × θ_index`
- `03 SST_1_Playbook_2025-12-30.txt` — confirms exponents: Strategy & Execution ^1.5, Setup & Operationalization ^1.0

## Requirements

### Engine changes (`src/lib/scoring/engine.ts`)

1. Replace the uniform geometric mean in `computeMeta()`:
   - **Current:** `capabilityGeoMean = Math.pow(c1 * c2 * c3 * c4, 0.25)`
   - **New:** `capabilityProduct = Math.pow(c1, 1.5) * c2 * Math.pow(c3, 1.5) * c4`
   - Normalize: `capabilityGeoMean = Math.pow(capabilityProduct, 1/5)` (sum of exponents = 1.5+1+1.5+1 = 5)
2. Update the comment above `computeMeta()` to reference ANST formula
3. Add `superlinearExponents` to `MetaResult` type so the UI can display which capabilities have higher leverage

### Type changes (`src/lib/scoring/types.ts`)

1. No new types required — `MetaResult.capabilityGeoMean` already captures the output
2. Optionally add `capabilityExponents: Record<CapabilityKey, number>` to `MetaResult` for UI display

### Test changes (`src/lib/scoring/engine.test.ts`)

1. Update test "includes META when both enablers and capabilities provided":
   - The `capabilityGeoMean` value will change due to new exponents
   - Verify `scalingCoefficient` still falls in valid range (0.8–1.8)
2. Add a new test: "superlinear exponents amplify Strategy and Execution":
   - Two inputs with equal overall capability scores but different distributions
   - Input A: high C₁ and C₃, low C₂ and C₄ → higher META
   - Input B: high C₂ and C₄, low C₁ and C₃ → lower META
   - Verify Input A produces a higher META score than Input B

### Results UI (`src/components/results/ScalingPanel.tsx`)

1. In the formula breakdown, show `C₁^1.5 × C₂ × C₃^1.5 × C₄` instead of `C₁ × C₂ × C₃ × C₄`
2. Add a small annotation "(superlinear)" next to C₁ and C₃ in the capability display

## Out of scope

- Changing the θ_index calculation (dimension weights stay as-is)
- Adding the full ANST S-formula (that's a separate backlog item)
- Changing how capability questions are asked

## Acceptance criteria

- [ ] `computeMeta()` uses C₁^1.5, C₃^1.5 exponents
- [ ] Existing META test updated and passing
- [ ] New test verifying superlinear amplification passing
- [ ] ScalingPanel shows corrected formula
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
