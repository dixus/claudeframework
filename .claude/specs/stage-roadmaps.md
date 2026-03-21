# Spec: Stage-specific Roadmaps

## Goal

Show personalized scaling roadmaps based on the company's funding stage. The SST Playbook defines stage-specific priorities (Series A/B/C) with different dimension focus, capability effort allocation, AI maturity targets, and expected outcomes. We already capture `fundingStage` in the enabler step — this feature uses it to generate a tailored roadmap on the results page.

## Source Documents

- `03 SST_1_Playbook_2025-12-30.txt` — Part 5: §5.1 Stage-Specific Priorities
- `01 AI Maturity Framework_2025-12-27_v4.5.2.txt` — AI Maturity Ladder (Level transitions)

## Requirements

### Data layer (`src/lib/scoring/roadmaps.ts`) — NEW FILE

1. Create types:

   ```ts
   interface StageRoadmap {
     stage: string; // "Series A", "Series B", "Series C/Growth"
     fundingStages: FundingStage[]; // which FundingStage values map here
     tagline: string; // e.g. "Find the Engine"
     arrRange: string; // e.g. "$2–10M ARR"
     priorityDimensions: {
       dimension: string;
       priority: "Critical" | "High" | "Medium";
     }[];
     capabilityFocus: {
       capability: string;
       effort: number; // percentage, e.g. 80
       description: string;
     }[];
     aiMaturityTarget: {
       thetaRange: string; // e.g. "0.3–0.5"
       levelTarget: string; // e.g. "Level 1: AI-Powered"
       actions: string[]; // 3-4 key actions
     };
     expectedOutcomes: {
       arrPerEmployee: string;
       timeToMilestone: string;
       teamSize: string;
     };
   }
   ```

2. Export `STAGE_ROADMAPS: StageRoadmap[]` with 3 entries:

   **Series A ($2–10M ARR): "Find the Engine"**
   - Priority: GTM/Revenue (Critical), Product (Critical), Customer Success (High)
   - Capability: C₁ Strategy 80%, C₂ Setup 15%, C₃ Execution 5%
   - AI target: θ 0.3–0.5 (Level 1), use AI tools for productivity
   - Outcomes: ARR/Emp €300–600K, 12–18 months to $10M, team 10–30

   **Series B ($10–50M ARR): "Build the System"**
   - Priority: GTM/Revenue (Critical), Operations (High), Talent (High), Finance (Medium)
   - Capability: C₂ Setup 40%, C₁ Strategy 30%, C₃ Execution 20%, C₄ Operationalization 10%
   - AI target: θ 0.5–0.7 (Level 2), integrate AI into workflows
   - Outcomes: ARR/Emp €600K–1.5M, 18–30 months to $50M, team 50–150

   **Series C/Growth ($50–100M ARR): "Optimize the Machine"**
   - Priority: All 8 balanced, Governance (High), Strategy (High)
   - Capability: C₃ Execution 30%, C₄ Operationalization 30%, C₁ Strategy 20%, C₂ Setup 20%
   - AI target: θ 0.7–0.9 (Level 2–3), AI as architecture
   - Outcomes: ARR/Emp €1–3M, 24–36 months to $100M, team 100–200

3. Export helper: `getRoadmapForStage(fundingStage: FundingStage): StageRoadmap | null`
   - Maps: pre-seed/seed → Series A, series-a/series-b → Series B, series-c/growth → Series C
   - Returns null for empty string

4. Framework-agnostic, no React imports

### Engine changes (`src/lib/scoring/engine.ts`)

1. When enablers are provided, call `getRoadmapForStage()` and attach to result
2. Add `roadmap?: StageRoadmap` to `AssessmentResult` in `types.ts`

### Results UI (`src/components/results/RoadmapPanel.tsx`) — NEW FILE

1. Panel showing the stage-specific roadmap:
   - Header: stage name + tagline (e.g. "Series B — Build the System")
   - Priority dimensions: ranked list with Critical/High/Medium badges
   - Capability effort allocation: horizontal bar chart or percentage breakdown
   - AI maturity target: current θ vs target range with progress indicator
   - Expected outcomes: 3 metric cards
2. Highlight where the company currently stands vs the target (compare actual θ with target θ range)
3. Only render when `result.roadmap` exists

### Results page (`src/components/results/ResultsPage.tsx`)

1. Import and render `RoadmapPanel` after ScalingPanel
2. Conditional on `result.roadmap` being defined

### Tests

1. Unit test for `getRoadmapForStage()` — verify all funding stage mappings
2. Engine test: verify roadmap is attached when enablers include a valid funding stage
3. Engine test: verify no roadmap when funding stage is empty

## Out of scope

- Editable or interactive roadmap timeline
- Multi-stage comparison (showing all 3 stages side by side)
- Custom stage definitions beyond the 3 defined

## Acceptance criteria

- [ ] `STAGE_ROADMAPS` data matches SST Playbook §5.1
- [ ] `getRoadmapForStage()` correctly maps all funding stages
- [ ] `computeResult()` attaches roadmap when enablers provided
- [ ] RoadmapPanel shows priorities, capability focus, AI target, outcomes
- [ ] Current θ vs target θ comparison visible
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
