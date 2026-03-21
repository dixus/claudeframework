# Review: intervention-playbooks

**Verdict: pass with fixes**

No critical issues. 2 major issues that must be fixed before shipping. All tests pass (91/91), build is clean.

---

## Summary

The implementation adds capability-specific intervention playbooks (C1-C4) to the scoring engine and results UI. The data layer, engine integration, type definitions, and tests are solid. Two major issues remain: the UI component does not use shadcn/ui Card/Badge as the spec requires, and the component filename deviates from the spec without justification.

---

## Issues

**1. [major] CapabilityPlaybookPanel does not use shadcn/ui Card and Badge components**

- File: `src/components/results/CapabilityPlaybookPanel.tsx`
- Spec requirement (Results UI, point 3): "Use shadcn/ui Card, Badge components consistent with existing panels"
- The component uses raw `<div>` and `<span>` elements with Tailwind classes instead of the `Card`, `CardHeader`, `CardContent`, and `Badge` components from shadcn/ui. This breaks visual consistency with the other result panels that use these shared components.

**2. [major] Component file named `CapabilityPlaybookPanel.tsx` instead of spec-prescribed `PlaybookPanel.tsx`**

- File: `src/components/results/CapabilityPlaybookPanel.tsx`
- Spec requirement (Results UI heading): "Results UI (`src/components/results/PlaybookPanel.tsx`) — NEW FILE"
- The file was created as `CapabilityPlaybookPanel.tsx`. However, a `PlaybookPanel.tsx` already exists in the same directory (for the dimension-level playbooks), so the rename would collide. The spec likely did not account for the pre-existing file. The current name is arguably better — but this needs an explicit decision. If the name stays as-is, the spec should be updated to reflect the actual filename.

---

## Spec Completeness

### Data layer (`src/lib/scoring/playbooks.ts`)

- ✅ `CapabilityPlaybook` type created (in `types.ts` — correct location)
- ✅ `PlaybookPhase` type created (in `types.ts`)
- ✅ `CAPABILITY_PLAYBOOKS` exported as `Record<CapabilityKey, CapabilityPlaybook>`
- ✅ C1 Strategy data: 8 weeks, 4 symptoms, 4 phases (Sensing/Choice/Formulation/Review), impact matches spec
- ✅ C2 Setup data: 12 weeks, 4 symptoms, 4 phases (Audit/Design/Build/Operationalize), impact matches spec
- ✅ C3 Execution data: 6 weeks, 4 symptoms, 3 phases (Velocity/Quality/Consistency), impact matches spec
- ✅ C4 Operationalization data: 10 weeks, 4 symptoms, 3 phases (Automation/Integration/Measurement), impact matches spec
- ✅ File remains framework-agnostic (no React imports)

### Engine changes (`src/lib/scoring/engine.ts`)

- ✅ Imports `CAPABILITY_PLAYBOOKS`
- ✅ Attaches matching playbook when `capabilityBottleneck` exists

### Types (`src/lib/scoring/types.ts`)

- ✅ `playbook?: CapabilityPlaybook` added to `AssessmentResult`

### Results UI (`src/components/results/CapabilityPlaybookPanel.tsx`)

- ✅ Header with capability name and duration badge
- ✅ Symptoms section with red indicators (bulleted list)
- ✅ Phase timeline as vertical stepper with actions
- ✅ Expected impact section with 3 metrics and green indicators
- ✅ Only renders when `result.playbook` exists (conditional in ResultsPage)
- ❌ Does not use shadcn/ui Card, Badge components (Issue #1)

### Results page (`src/components/results/ResultsPage.tsx`)

- ✅ Imports and renders `CapabilityPlaybookPanel`
- ✅ Conditional rendering when `result.playbook` is defined

### Tests (`src/lib/scoring/engine.test.ts`)

- ✅ Test: "attaches correct playbook for capability bottleneck" — verifies C2 playbook attachment
- ✅ Test: "does not attach playbook when no capability responses"
- ✅ Test: "attaches C3 playbook when execution is the bottleneck"

### Acceptance criteria

- ✅ `CAPABILITY_PLAYBOOKS` data matches SST Playbook document
- ✅ `computeResult()` attaches playbook when capability bottleneck identified
- ✅ PlaybookPanel renders symptoms, phases, and impact
- ✅ Panel only appears when Deep Dive (capabilities) was completed
- ✅ `npx vitest run` — all tests pass (91/91)
- ✅ `npm run build` — clean build

---

## Suggestions

- The `package.json` change (dev port from default to 4001) is unrelated scope creep. Consider reverting it or committing separately.
- The large formatting diff in `playbooks.ts` (quote style changes from single to double quotes, trailing semicolons) is likely from a formatter run. While harmless, it inflates the diff and makes the actual logic changes harder to review. Consider running the formatter in a separate commit.
