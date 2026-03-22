# Spec: Case Studies Panel

## Goal

Add validated case studies to the results page showing concrete examples of companies that improved their scaling metrics through capability interventions. The framework documents include 5 case studies with ROI figures. Showing the most relevant case study based on the user's bottleneck type adds credibility and actionable context.

## Source Documents

- `03 SST_1_Playbook_2025-12-30.txt` — Bottleneck-specific case studies
- `00 Architecture Document_2026-01-02_v4.5.3.txt` — ROI validation data
- `02 AI-native Scaling Theory_2025-12-27_v4.5.txt` — Company benchmarks (Midjourney, Cursor, Perplexity)

## Requirements

### Data layer (`src/lib/scoring/case-studies.ts`) — NEW FILE

1. Create types:

   ```ts
   interface CaseStudy {
     id: string;
     title: string; // "Setup Bottleneck Resolution"
     interventionModel: string; // "Bottleneck Resolution"
     relatedCapability?: CapabilityKey; // which C₁–C₄ this applies to
     relatedLevel?: number; // which level transition
     context: {
       stage: string; // "Series B"
       industry: string; // "B2B SaaS"
       teamSize: string; // "80 employees"
       challenge: string; // 1-2 sentence problem description
     };
     before: {
       sScore: string; // "0.12"
       arrPerEmployee: string; // "€24K"
       bottleneck: string; // "C₂ Setup = 0.55"
     };
     after: {
       sScore: string; // "0.35"
       arrPerEmployee: string; // "€70K"
       improvement: string; // "C₂ Setup = 0.85"
     };
     duration: string; // "12 weeks"
     roi: string; // "194x"
     keyActions: string[]; // 3-4 bullet points
   }
   ```

2. Export `CASE_STUDIES: CaseStudy[]` with 5 entries from the documents:

   **Case 1: C₂ Setup Bottleneck Resolution (ROI 194x)**
   - Series B, B2B SaaS, 80 employees
   - Before: S=0.12, ARR/Emp €24K, C₂=0.55
   - After: S=0.35, ARR/Emp €70K, C₂=0.85
   - Duration: 12 weeks
   - Actions: Audit tools, design integrated stack, build automation, operationalize

   **Case 2: Stage A→B Transition (ROI 267x)**
   - Series A→B, Product-Led SaaS, 30→120 employees
   - Before: S=0.08, no scalable systems
   - After: S=0.28, repeatable GTM motion
   - Duration: 90 days
   - Actions: Define ICP, build sales infrastructure, hire key roles, implement CRM

   **Case 3: Level 1→2 Transition (ROI 17x)**
   - Series B, Enterprise SaaS, 150 employees
   - Before: θ=0.35 (Level 1), AI as point tools
   - After: θ=0.62 (Level 2), AI in core workflows
   - Duration: 12 months
   - Actions: Integrate AI into workflows, build data infrastructure, hire AI talent

   **Case 4: Level 2→3 Transition (ROI 129x)**
   - Series C, AI-first platform, 100 employees
   - Before: θ=0.65 (Level 2), AI-enabled workflows
   - After: θ=0.88 (Level 3), AI-native architecture
   - Duration: 18 months
   - Actions: Build orchestration layer, AI-native product features, data network effects

   **Case 5: Stage B→C Transition (ROI 304x)**
   - Series B→C, Horizontal SaaS, 150→250 employees
   - Before: S=0.15, strong product, weak governance
   - After: S=0.42, mature across all 8 dimensions
   - Duration: 90 days
   - Actions: Governance framework, compliance automation, board intelligence

3. Export helper:

   ```ts
   function getRelevantCaseStudies(
     capabilityBottleneck?: CapabilityResult,
     level?: number,
     fundingStage?: string,
   ): CaseStudy[];
   ```

   - Returns 1-2 most relevant case studies based on the user's situation
   - Match by: capability bottleneck type, current level, funding stage
   - Always return at least 1 case study

4. Framework-agnostic, no React imports

### Engine changes (`src/lib/scoring/engine.ts`)

1. Call `getRelevantCaseStudies()` and attach to result
2. Add `caseStudies?: CaseStudy[]` to `AssessmentResult` in `types.ts`

### Results UI (`src/components/results/CaseStudyPanel.tsx`) — NEW FILE

1. Panel showing 1-2 relevant case studies:
   - Header: "Similar Companies" or "Validated Case Study"
   - For each case study:
     - Title + intervention model badge + duration badge
     - Context line: stage, industry, team size
     - Before/After comparison: two columns with S-score, ARR/Employee, bottleneck
     - ROI highlight: large green number (e.g. "194x ROI")
     - Key actions: bulleted list
   - "Why this is relevant": 1 sentence linking to user's situation

2. Place in the **Diagnosis tab** after CapabilityPlaybookPanel
3. Only render when `result.caseStudies` exists and has entries

### Tests

1. `getRelevantCaseStudies()`:
   - C₂ bottleneck → returns Case 1 (Setup)
   - Level 1 user → returns Case 3 (Level 1→2)
   - Series A funding → returns Case 2 (Stage A→B)
   - No capability data → returns most common case (Case 1)
2. Engine test: case studies attached to result

## Out of scope

- Real company names (use anonymized descriptions)
- User-submitted case studies
- Interactive ROI calculator
- Video testimonials

## Acceptance criteria

- [ ] 5 case studies with correct data from source documents
- [ ] `getRelevantCaseStudies()` returns contextually relevant results
- [ ] Before/After comparison clearly visible
- [ ] ROI prominently displayed
- [ ] Panel appears in Diagnosis tab
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
