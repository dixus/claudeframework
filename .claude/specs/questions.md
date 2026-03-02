# Spec: Questions Data

## Goal

Define all 48 assessment questions as a typed, framework-agnostic data module that the questionnaire UI can consume directly.

## Requirements

- Export a `QUESTIONS` constant typed as `Record<DimensionKey, string[]>` — exactly 8 questions per dimension, in display order
- Each question is a declarative English statement rated on the existing Likert scale (0 = Not started → 4 = Fully embedded)
- The question index within each array maps 1-to-1 to the corresponding position in `AssessmentInput.responses[dimension]`
- Export a `LIKERT_LABELS` constant: a readonly array of 5 label strings indexed 0–4
- No framework dependencies — pure TypeScript data, co-located with the rest of the scoring module
- Questions must cover the themes established in `spec.txt` and be consistent with the `RECOMMENDATIONS` actions already written in `recommendations.ts`

## Out of scope

- Question validation logic (that belongs in the UI layer or store)
- Question numbering or display formatting (UI responsibility)
- Randomisation or conditional branching
- Translations (English only for MVP)

## Affected files

None — this is a new module.

## New files

- `src/lib/scoring/questions.ts` — all 48 questions + Likert labels

## Implementation notes

**Data shape:**
```ts
import type { DimensionKey } from './types'

export const LIKERT_LABELS: readonly string[] = [
  'Not started',
  'Experimenting',
  'Partially implemented',
  'Broadly implemented',
  'Fully embedded',
]

export const QUESTIONS: Record<DimensionKey, string[]> = {
  strategy:     [ /* 8 strings */ ],
  architecture: [ /* 8 strings */ ],
  workflow:     [ /* 8 strings */ ],
  data:         [ /* 8 strings */ ],
  talent:       [ /* 8 strings */ ],
  adoption:     [ /* 8 strings */ ],
}
```

**Question authoring — 8 per dimension (English, declarative):**

`strategy` (weight 20%) — covers strategic intent, governance, roadmap, budget:
1. AI is explicitly part of our company strategy.
2. AI use cases are backed by clear, measurable business KPIs.
3. AI influences our pricing or business model.
4. We have an executive sponsor accountable for AI outcomes.
5. We have a documented AI roadmap with quarterly milestones.
6. A dedicated budget is allocated for AI initiatives.
7. Our AI strategy is reviewed and updated at least quarterly.
8. AI strategy is aligned and communicated across all business units.

`architecture` (weight 15%) — covers infrastructure, pipelines, deployment, observability:
1. We have a central data warehouse with automated ingestion.
2. AI workloads are deployed on scalable, cloud-native infrastructure.
3. Data pipelines are automated end-to-end.
4. We have an API-first integration layer that exposes AI capabilities.
5. Our infrastructure supports model versioning and rollback.
6. AI models can be deployed to production without manual engineering bottlenecks.
7. Data, model, and application layers are architecturally separated.
8. We have monitoring and alerting for model performance in production.

`workflow` (weight 25%) — covers process automation, AI in daily ops, feedback loops:
1. Core business processes are AI-assisted.
2. Repetitive, rule-based tasks are automated.
3. AI is integrated into our daily operational workflows.
4. We have mapped and prioritised the highest-impact AI use cases in our processes.
5. AI tools are embedded in our primary business workflows (not just side tools).
6. Our processes include feedback loops that continuously improve AI outputs.
7. AI reduces manual decision-making steps in key operational workflows.
8. We measure cycle-time or throughput improvements attributable to AI.

`data` (weight 15%) — covers quality, governance, versioning, decision culture:
1. Data quality is actively measured and monitored.
2. Data is consistent and versioned across all systems.
3. Decisions are made based on data rather than intuition.
4. We have a data governance framework covering ownership and access.
5. Data is accessible to the teams that need it, at the time they need it.
6. We maintain a single source of truth for key business metrics.
7. Data pipelines are documented, tested, and owned by named teams.
8. We track data lineage from source to point of consumption.

`talent` (weight 15%) — covers skills, training, hiring, leadership capability:
1. AI competencies are present across the team, not siloed in one function.
2. We run structured AI training and upskilling programmes.
3. Hiring criteria include AI skills or demonstrated aptitude.
4. We have dedicated AI engineers or ML operations engineers on staff.
5. Non-technical staff can use, interpret, and challenge AI outputs.
6. We have an internal AI centre of excellence or community of practice.
7. Leaders can evaluate, prioritise, and fund AI investment decisions confidently.
8. AI skill development is tracked and reported at an organisational level.

`adoption` (weight 10%) — covers daily usage, measurement, culture, experimentation:
1. AI tools are used daily by the majority of the team.
2. AI usage is tracked and reported with defined metrics (e.g. DAU, task deflection).
3. AI usage is a recognised and valued part of our company culture.
4. We celebrate and share AI success stories internally.
5. Team members proactively experiment with new AI tools and techniques.
6. AI adoption is included in onboarding for new employees.
7. We have a structured process for evaluating and adopting new AI capabilities.
8. Leadership visibly models and actively promotes AI usage.

## Test cases

No unit tests required for pure data — the structure itself is validated by TypeScript. However, the implementing spec should include a runtime sanity check:

- `Object.values(QUESTIONS).every(qs => qs.length === 8)` — all dimensions have exactly 8 questions
- `LIKERT_LABELS.length === 5` — scale labels are complete
- All keys of `QUESTIONS` match `DimensionKey` union exactly (enforced by TypeScript)
