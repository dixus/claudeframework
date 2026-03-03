import type { GlossaryTerm } from './types'

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'ARR/Employee (θ_observed)',
    definition: 'Annual Recurring Revenue divided by headcount — the primary unit-economics metric used to measure AI leverage. AI-Native companies (Level 3) achieve €700K–1.5M ARR/employee vs. €150–200K for traditional SaaS.',
    example: 'Midjourney: $492M ARR with 107 employees = ~$4.6M ARR/employee (2025).',
  },
  {
    term: 'Augmentation (Level 2 mechanism)',
    definition: 'The primary value-creation mechanism at AI-Enabled (Level 2): AI augments human capabilities through workflow redesign rather than just replacing tasks. Produces 3–5x quality improvements through human-AI collaboration.',
    example: 'A sales team using AI to enrich leads and draft personalised outreach while humans close deals.',
  },
  {
    term: 'Bottleneck Dimension',
    definition: 'The lowest-scoring dimension in the assessment — the primary constraint limiting AI maturity progress. Identified as min(D1..D6). Fixing the bottleneck yields the highest leverage for improving the overall θ score.',
    example: 'If Data scores 28 and all other dimensions score 70+, Data is the bottleneck.',
  },
  {
    term: 'Bottleneck Resolution (Model 1)',
    definition: 'An 8–12 week intervention focused on closing the gap in a single blocking dimension. Used when the overall θ gap to the next level is small (< 15 points) but one dimension is critically low (< 60).',
    example: 'Workflow score of 42 blocking Level 2: run a focused AI workflow automation pilot over 10 weeks.',
  },
  {
    term: 'Dimension Score',
    definition: 'The normalised score for one of the six assessment dimensions, calculated as (sum of 8 answers / 32) × 100. Ranges from 0 to 100. Each dimension has a target benchmark of 70 for sustainable AI maturity.',
  },
  {
    term: 'Gating Rule',
    definition: 'A minimum threshold requirement that prevents a company from being classified at a higher AI maturity level even if their θ score qualifies. Ensures structural readiness, not just surface-level scoring.',
    example: 'Level 3 requires Workflow ≥ 70, Data ≥ 60, and Adoption ≥ 50. A company scoring θ=85 with Workflow=62 is gated to Level 2.',
  },
  {
    term: 'Level 0 — Traditional',
    definition: 'No AI integration in core operations. Baseline for comparison (θ score 0–20). ARR/employee: €150–200K. Time to €100M ARR: 60+ months. Linear scaling — revenue growth equals people growth.',
  },
  {
    term: 'Level 1 — AI-Powered',
    definition: 'AI substitutes human labour within existing workflows (substitution mechanism). θ score 21–50. ARR/employee: €200–400K. Delivers 2–3x efficiency gains through task automation but does not redesign the operating model.',
  },
  {
    term: 'Level 2 — AI-Enabled',
    definition: 'AI augments human capabilities through workflow redesign (augmentation mechanism). θ score 51–80. ARR/employee: €400–700K. Delivers 3–5x quality improvements through human-AI collaboration. Requires gating on Workflow ≥ 50 and Data ≥ 40.',
  },
  {
    term: 'Level 3 — AI-Native',
    definition: 'AI orchestrates multi-agent systems where AI and humans collaborate as a unified operating model (orchestration mechanism). θ score 81–100. ARR/employee: €700K–1.5M. Delivers 10–30x unit economics through architectural transformation. Requires gating on Workflow ≥ 70, Data ≥ 60, Adoption ≥ 50.',
  },
  {
    term: 'AI Maturity Level',
    definition: 'A classification from 0 (Traditional) to 3 (AI-Native) that describes the depth of AI integration in an organisation. Each level represents a qualitatively different operating model, not just an incremental improvement.',
  },
  {
    term: 'Orchestration (Level 3 mechanism)',
    definition: 'The primary value-creation mechanism at AI-Native (Level 3): AI orchestrates multi-agent systems that coordinate AI and human work autonomously. Enables 10–30x unit economics through architectural transformation of value creation itself.',
    example: 'An AI agent that handles lead qualification, meeting scheduling, proposal drafting, and CRM updates autonomously — with a human reviewing only the final step.',
  },
  {
    term: 'Stage Transition (Model 2)',
    definition: 'A 90-day structured intervention to advance toward the next AI maturity level. Used when the θ gap to the next level is 15–30 points. Covers multiple dimensions and typically requires process redesign, tooling upgrades, and change management.',
  },
  {
    term: 'Substitution (Level 1 mechanism)',
    definition: 'The primary value-creation mechanism at AI-Powered (Level 1): AI substitutes human labour within existing workflows using point solutions. Produces 2–3x efficiency gains but does not redesign processes or business models.',
    example: 'Using an AI tool to auto-summarise meeting notes — the workflow is unchanged, but one task is automated.',
  },
  {
    term: 'Superlinear Scaling',
    definition: 'A scaling model where revenue grows faster than headcount, enabled by AI as a multiplier. The new playbook formula: Scaling Success = Market × Enablers × Strategy × Setup × Execution × Operationalisation × AI. Contrasts with traditional linear scaling where ARR/employee remains constant.',
    example: 'Cursor: ~$500M ARR with <200 employees (2025) — demonstrating superlinear AI-native scaling.',
  },
  {
    term: 'Transition Readiness',
    definition: 'The degree to which an organisation has the commitment, resources, and capability to execute an AI maturity level transition. Assessed across three dimensions: θ_index score, executive sponsorship, and available budget/talent.',
  },
  {
    term: 'Weighted Score',
    definition: 'The contribution of each dimension to the overall θ score, based on its weight: Strategy 20%, Architecture 15%, Workflow 25%, Data 15%, Talent 15%, Adoption 10%. Workflow has the highest weight, reflecting its central role in AI-native operations.',
  },
  {
    term: 'θ_index (theta index)',
    definition: 'The AI Maturity Index — a score from 0 to 100 that measures the depth of AI integration across six dimensions. Calculated as a weighted sum of dimension scores. Input-based (not circular): measures AI usage patterns independently of business outcomes like ARR.',
    example: 'θ = 0.20×Strategy + 0.15×Architecture + 0.25×Workflow + 0.15×Data + 0.15×Talent + 0.10×Adoption',
  },
].sort((a, b) => a.term.localeCompare(b.term))
