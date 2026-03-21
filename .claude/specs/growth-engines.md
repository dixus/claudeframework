# Spec: Growth Engine Classification

## Goal

Add a Growth Engine classification step that identifies whether the company follows a Product-Led Growth (PLG), Sales-Led Growth (SLG), or Community-Led Growth (CLG) model. The growth engine type influences which scaling dimensions should be prioritized and changes the interpretation of the assessment results.

## Source Documents

- `05a Growth Engines_2025-12-30_v1.txt` — Full growth engine framework with PLG/SLG/CLG definitions
- `03 SST_1_Playbook_2025-12-30.txt` — How growth engines interact with scaling dimensions

## Requirements

### Data layer (`src/lib/scoring/growth-engines.ts`) — NEW FILE

1. Create types:

   ```ts
   type GrowthEngineType = "plg" | "slg" | "clg" | "hybrid";

   interface GrowthEngine {
     type: GrowthEngineType;
     label: string; // "Product-Led Growth"
     shortLabel: string; // "PLG"
     description: string;
     keyMetrics: string[]; // 3-4 defining metrics
     priorityDimensions: DimensionKey[]; // which θ dimensions matter most
     scalingAdvantage: string; // what makes this engine superlinear
     aiLeverage: string; // how AI amplifies this engine
     examples: string[]; // 2-3 company examples
   }
   ```

2. Export `GROWTH_ENGINES: Record<GrowthEngineType, GrowthEngine>`:

   **PLG — Product-Led Growth:**
   - Key metrics: Activation rate, Time-to-value, Viral coefficient, Free-to-paid conversion
   - Priority dimensions: architecture, workflow, adoption
   - Scaling advantage: Zero marginal cost per user, network effects
   - AI leverage: AI features become the product moat
   - Examples: Cursor, Notion, Figma

   **SLG — Sales-Led Growth:**
   - Key metrics: Pipeline velocity, Win rate, ACV, Sales cycle length
   - Priority dimensions: strategy, talent, data
   - Scaling advantage: High ACV compounds with fewer deals needed
   - AI leverage: AI SDRs, predictive lead scoring, deal intelligence
   - Examples: Salesforce, HubSpot, Gong

   **CLG — Community-Led Growth:**
   - Key metrics: Community growth rate, Content engagement, Referral rate, NPS
   - Priority dimensions: adoption, talent, strategy
   - Scaling advantage: Community-generated content and word-of-mouth
   - AI leverage: AI-powered community management, content generation
   - Examples: Midjourney, dbt, Hugging Face

   **Hybrid:**
   - Combination of above, most common in Series B+
   - Priority dimensions vary based on combination

3. Export classification helper:
   ```ts
   function classifyGrowthEngine(
     answers: GrowthEngineAnswers,
   ): GrowthEngineType;
   ```

   - Based on 3-4 multiple-choice questions about GTM model

### Assessment questions

1. Define 3 screening questions for growth engine classification:
   - "How do most customers first experience your product?" → PLG indicator
   - "What drives the majority of your revenue?" → SLG indicator
   - "How do customers learn about your product?" → CLG indicator
2. Scoring: tally which engine each answer points to, pick dominant

### Type changes (`src/lib/scoring/types.ts`)

1. Add `GrowthEngineType` to exports
2. Add `growthEngine?: GrowthEngineType` to `AssessmentInput`
3. Add `growthEngine?: GrowthEngine` to `AssessmentResult`

### Store changes (`src/store/assessmentStore.ts`)

1. Add `growthEngine: GrowthEngineType | null` to state
2. Add `setGrowthEngine(type: GrowthEngineType)` action
3. Pass to `computeResult()` on submit

### Assessment UI — NEW Step

1. New step component `src/components/assessment/GrowthEngineStep.tsx`:
   - 3 questions with visual answer cards (icon + description per option)
   - Auto-classifies as user answers
   - Shows classification result with confidence
2. Insert after EnablerStep (step 2) → bump subsequent steps by 1
3. Update `AssessmentShell.tsx` step routing (MAX_STEP becomes 8)

### Results UI (`src/components/results/GrowthEnginePanel.tsx`) — NEW FILE

1. Panel showing:
   - Classified engine type with icon and description
   - "Priority dimensions for your GTM model" — highlight which of the 6 θ dimensions matter most
   - Compare actual dimension scores against engine-specific priorities
   - AI leverage insight specific to their engine type
2. Only render when `result.growthEngine` exists

### Results page

1. Add GrowthEnginePanel to ResultsPage, after ScoreCard

### Tests

1. Unit test for `classifyGrowthEngine()` — verify each pure type
2. Store test: growth engine state management
3. Engine test: growth engine attached to result

## Out of scope

- Hybrid engine detailed configuration
- Revenue attribution per engine
- Growth engine transition recommendations
- Historical growth engine analysis

## Acceptance criteria

- [ ] 3 classification questions defined and rendered
- [ ] Classification logic correctly identifies PLG/SLG/CLG/Hybrid
- [ ] Growth engine attached to assessment result
- [ ] GrowthEnginePanel shows engine type, priorities, and AI leverage
- [ ] Step flow updated without breaking existing navigation
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
