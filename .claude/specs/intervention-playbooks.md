# Spec: Intervention Model Playbooks

## Goal

Add capability-specific intervention playbooks to the results page. When the assessment identifies a capability bottleneck (C₁–C₄), show a structured action plan based on the SST Playbook document. The framework defines 4 bottleneck-specific playbooks (Strategy, Setup, Execution, Operationalization), each with symptoms, root causes, timeline, and expected impact.

## Source Documents

- `03 SST_1_Playbook_2025-12-30.txt` — Part 5: Action Playbooks, §5.2 Bottleneck-Specific Playbooks
- `03 SST_0_Scaling Stack_v2.0_2025-12-30.txt` — Capability definitions

## Requirements

### Data layer (`src/lib/scoring/playbooks.ts`) — NEW FILE

1. Create a `CapabilityPlaybook` type:

   ```ts
   interface CapabilityPlaybook {
     capability: CapabilityKey;
     label: string;
     duration: string; // e.g. "8 weeks", "12 weeks"
     symptoms: string[]; // 4 symptoms
     rootCauses: string[]; // 4 root causes
     phases: PlaybookPhase[]; // 3–4 phases
     expectedImpact: {
       sImprovement: string; // e.g. "2.5x"
       primaryMetric: string; // e.g. "Win rate +20-30pp"
       secondaryMetric: string; // e.g. "CAC -30-40%"
     };
   }

   interface PlaybookPhase {
     name: string; // e.g. "Sensing"
     weeks: string; // e.g. "Week 1-2"
     actions: string[]; // 4 actions per phase
   }
   ```

2. Export `CAPABILITY_PLAYBOOKS: Record<CapabilityKey, CapabilityPlaybook>` with data from the Playbook document:

   **C₁ Strategy (8 weeks):**
   - Symptoms: Unclear ICP, competing priorities, low win rates, high CAC
   - Phases: Sensing (W1-2) → Choice (W3-4) → Formulation (W5-6) → Review (W7-8)
   - Impact: S 2.5x, Win rate +20-30pp, CAC -30-40%

   **C₂ Setup (12 weeks):**
   - Symptoms: Chaotic execution, tools don't integrate, manual processes, scattered data
   - Phases: Audit (W1-2) → Design (W3-6) → Build (W7-10) → Operationalize (W11-12)
   - Impact: S 3x, ARR/Employee 3x

   **C₃ Execution (6 weeks):**
   - Symptoms: Slow shipping, low quality, missed deadlines, low morale
   - Phases: Velocity (W1-2) → Quality (W3-4) → Consistency (W5-6)
   - Impact: S 2.8x, Shipping velocity +50-100%, Defect rate -50%

   **C₄ Operationalization (10 weeks):**
   - Symptoms: Manual tasks, no automation, slow reporting, data quality issues
   - Phases: Automation (W1-3) → Integration (W4-6) → Measurement (W7-10)
   - Impact: S 2.8x, Time saved 20-30%, Data quality +50%

3. This file must remain framework-agnostic (no React imports)

### Engine changes (`src/lib/scoring/engine.ts`)

1. Import `CAPABILITY_PLAYBOOKS` and add `playbook` field to `AssessmentResult`:
   - When `capabilityBottleneck` exists, attach the matching playbook
2. Add `playbook?: CapabilityPlaybook` to `AssessmentResult` type in `types.ts`

### Results UI (`src/components/results/PlaybookPanel.tsx`) — NEW FILE

1. New panel component that renders the capability playbook:
   - Header: capability name + duration badge (e.g. "C₂ Setup — 12 weeks")
   - Symptoms section: bulleted list with red/warning indicators
   - Phase timeline: horizontal or vertical stepper showing phases with actions
   - Expected impact: 3 metrics with green improvement indicators
2. Only render when `result.playbook` exists
3. Use shadcn/ui Card, Badge components consistent with existing panels

### Results page (`src/components/results/ResultsPage.tsx`)

1. Import and render `PlaybookPanel` below `CapabilityPanel`
2. Conditional: only show when `result.playbook` is defined

### Tests

1. `src/lib/scoring/engine.test.ts`:
   - Add test: "attaches correct playbook for capability bottleneck"
   - Verify playbook matches the lowest-scoring capability
2. Component test for PlaybookPanel (optional, can be covered by results.test.tsx)

## Out of scope

- Interactive playbook editing or progress tracking
- Multiple playbook recommendations (only show the primary bottleneck)
- The 3 intervention model types (Bottleneck Resolution vs Stage Transition vs Level Transition) — future enhancement
- PDF export of playbook

## Acceptance criteria

- [ ] `CAPABILITY_PLAYBOOKS` data matches SST Playbook document
- [ ] `computeResult()` attaches playbook when capability bottleneck identified
- [ ] PlaybookPanel renders symptoms, phases, and impact
- [ ] Panel only appears when Deep Dive (capabilities) was completed
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build
