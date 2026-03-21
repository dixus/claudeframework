import type { CapabilityKey } from "./types";

export const CAPABILITY_QUESTIONS: Record<CapabilityKey, string> = {
  c1_strategy:
    "We have a clear, documented scaling strategy with measurable milestones and regular review cycles.",
  c2_setup:
    "Our infrastructure, systems, and org design are built to scale — not patched together ad hoc.",
  c3_execution:
    "We execute consistently at high velocity and quality across teams.",
  c4_operationalization:
    "Proven processes are documented, automated, and repeatable without key-person dependency.",
};

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  c1_strategy: "C\u2081 Strategy",
  c2_setup: "C\u2082 Setup",
  c3_execution: "C\u2083 Execution",
  c4_operationalization: "C\u2084 Operationalization",
};

export const CAPABILITY_DESCRIPTIONS: Record<CapabilityKey, string> = {
  c1_strategy:
    "Sensing, choice, formulation, and review of strategic direction",
  c2_setup: "Infrastructure, architecture, org design, and systems readiness",
  c3_execution: "Speed, quality, and consistency of delivery",
  c4_operationalization:
    "Automation, playbooks, and knowledge management at scale",
};

export const CAPABILITY_KEYS: CapabilityKey[] = [
  "c1_strategy",
  "c2_setup",
  "c3_execution",
  "c4_operationalization",
];
