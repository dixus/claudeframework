# Spec: Intervention Model Recommendation

## Goal

Expose the intervention model selection logic to users. The framework defines 3 intervention models (Bottleneck Resolution, Stage Transition, Level Transition), each suited to different situations. The CapabilityPlaybookPanel already shows WHAT to do, but not WHICH model to follow or WHY. This feature adds an explicit model recommendation with decision rationale.

## Source Documents

- `03 SST_1_Playbook_2025-12-30.txt` — 3 intervention models with selection criteria
- `03 SST_2_Methodology_2025-12-30.txt` — Decision framework for model selection
- `00 Architecture Document_2026-01-02_v4.5.3.txt` — Model descriptions

## Requirements

### Data layer (`src/lib/scoring/intervention.ts`) — NEW FILE

1. Create types:

   ```ts
   type InterventionModelType = "bottleneck" | "stage" | "level";

   interface InterventionModel {
     type: InterventionModelType;
     label: string; // "Bottleneck Resolution"
     duration: string; // "8–12 weeks"
     description: string; // When to use this model
     whenToUse: string[]; // 3-4 criteria
     expectedOutcome: string;
     sImprovement: string; // "3–5x"
   }
   ```

2. Export `INTERVENTION_MODELS: Record<InterventionModelType, InterventionModel>`:

   **Model 1: Bottleneck Resolution (8–12 weeks)**
   - When: Single capability significantly below others, capability gap > 20 points, no stage transition needed
   - Expected: 3–5x S improvement
   - Description: Fix the weakest capability to unlock multiplicative scaling

   **Model 2: Stage Transition (90 days)**
   - When: Company moving between funding stages (A→B, B→C), multiple capabilities need upgrading, organizational structure needs change
   - Expected: 2–3x S improvement + stage-appropriate systems
   - Description: Systematic upgrade of all capabilities for the next growth stage

   **Model 3: Level Transition (6–24 months)**
   - When: θ_index near level boundary, company wants to move from AI-Powered to AI-Enabled (or higher), requires deep AI integration
   - Expected: Level upgrade + 1.5–2x scaling coefficient increase
   - Description: Transform AI maturity from tool usage to architectural integration

3. Export selection function:

   ```ts
   function selectInterventionModel(
     thetaScore: number,
     capabilityBottleneck: CapabilityResult | undefined,
     capabilities: CapabilityResult[] | undefined,
     fundingStage: string | undefined,
     level: number,
   ): { model: InterventionModel; rationale: string };
   ```

   **Selection logic:**
   - If bottleneck capability gap > 20 points below average → **Bottleneck Resolution**
   - If funding stage is transitional (series-a with high θ, or series-b approaching growth) → **Stage Transition**
   - If θ near level boundary (within 10 points of next level threshold) → **Level Transition**
   - Default fallback: **Bottleneck Resolution** (most common, 36% of companies)

4. Framework-agnostic, no React imports

### Engine changes (`src/lib/scoring/engine.ts`)

1. When capabilities and enablers are available, call `selectInterventionModel()` and attach to result
2. Add `interventionModel?: { model: InterventionModel; rationale: string }` to `AssessmentResult` in `types.ts`

### UI — Extend CapabilityPlaybookPanel

1. Add a **model recommendation header** above the existing playbook content in `CapabilityPlaybookPanel.tsx`:
   - Model badge: "Recommended: Bottleneck Resolution (8–12 weeks)"
   - Rationale text: 1-2 sentences explaining why this model was selected
   - Brief comparison: show all 3 models as cards, highlight the recommended one
2. The existing playbook phases/actions continue below unchanged

### Tests

1. `selectInterventionModel()` unit tests:
   - Large capability gap → Bottleneck Resolution
   - Transitional funding stage → Stage Transition
   - θ near level boundary → Level Transition
   - No capabilities → default to Bottleneck Resolution
2. Engine test: intervention model attached to result when capabilities provided

## Out of scope

- User override of model selection
- Detailed implementation timeline
- Progress tracking for interventions
- Multi-model recommendations

## Acceptance criteria

- [ ] 3 intervention models defined with correct data from source documents
- [ ] Selection logic correctly identifies the right model based on inputs
- [ ] Model recommendation visible above playbook in results
- [ ] Rationale text explains the selection
- [ ] All 3 models shown with recommended one highlighted
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
