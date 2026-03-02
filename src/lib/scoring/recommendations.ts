import type { DimensionKey } from './types'

export const RECOMMENDATIONS: Record<DimensionKey, string[]> = {
  strategy: [
    'Define an explicit AI strategy with measurable OKRs tied to business outcomes',
    'Establish an AI governance board with cross-functional executive sponsorship',
    'Allocate a dedicated AI budget and roadmap reviewed on a quarterly cadence',
  ],
  architecture: [
    'Adopt a modular AI-ready infrastructure that decouples data, models, and application layers',
    'Implement an API-first platform layer to enable rapid integration of AI capabilities',
    'Introduce automated CI/CD pipelines for model deployment and rollback',
  ],
  workflow: [
    'Embed AI copilots directly into the highest-volume operational workflows',
    'Map and redesign core processes to replace manual steps with AI-driven automation',
    'Establish feedback loops so workflow outputs continuously retrain and improve models',
  ],
  data: [
    'Establish a central data warehouse with automated ingestion and transformation pipelines',
    'Implement data quality measurement, lineage tracking, and versioning across all datasets',
    'Shift decision-making to data-driven processes with real-time dashboards across all teams',
  ],
  talent: [
    'Launch a structured AI upskilling programme covering prompt engineering and model evaluation',
    'Create dedicated AI engineer and ML operations roles within each product team',
    'Build an internal AI centre of excellence to share tooling, patterns, and best practices',
  ],
  adoption: [
    'Run targeted change-management campaigns to increase daily active usage of AI tools',
    'Define and track adoption KPIs (DAU, task deflection rate) at team and company level',
    'Celebrate and publicise internal AI success stories to build a culture of experimentation',
  ],
}
