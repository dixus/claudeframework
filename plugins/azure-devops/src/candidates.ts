/**
 * Pure ranking logic for picking the next not-yet-started work item.
 * Kept free of I/O so it can be tested without Azure DevOps.
 */

import type { CandidateConfig } from "./config.js";
import type { PullRequestReviewer } from "./types.js";

export interface CandidateWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  /** Rank from the configured priority field ("2 - high" → 2); null when unset or not configured. */
  prio: number | null;
  prioLabel: string;
  tags: string[];
  createdDate: string;
  /** Display name of the assignee; empty when unassigned. */
  assignedTo: string;
  /** Ids linked as predecessor (System.LinkTypes.Dependency-Reverse). */
  predecessorIds: number[];
}

export interface ExcludedCandidate {
  id: number;
  title: string;
  reason: string;
}

/** Sorts after every real prio, so tickets without one come last. */
const NO_PRIO_RANK = 99;

function quoteWiql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * WIQL for not-yet-started candidates. Without `descendantIds`: assigned to the PAT owner, project-wide.
 * With them (epic mode): only those ids, assigned to the PAT owner or unassigned.
 * Types and states come from the committed project config (quoted and escaped), ids are numeric,
 * so nothing a caller supplies reaches the query text.
 */
export function buildCandidateWiql(config: CandidateConfig, descendantIds?: number[]): string {
  const quoted = (values: string[]) => values.map(quoteWiql).join(", ");
  const conditions = [
    "[System.TeamProject] = @project",
    `[System.WorkItemType] IN (${quoted(config.types)})`,
    `[System.State] IN (${quoted(config.notStartedStates)})`,
  ];
  if (descendantIds === undefined) {
    conditions.push("[System.AssignedTo] = @Me");
  } else {
    conditions.push(`[System.Id] IN (${descendantIds.map((id) => Math.trunc(id)).join(", ")})`, "([System.AssignedTo] = @Me OR [System.AssignedTo] = '')");
  }
  return `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.CreatedDate] ASC`;
}

/**
 * Numeric rank of a priority value: a number as is, a label by its leading digit ("2 - high" → 2),
 * otherwise its 1-based position in `values` when given; null when none applies.
 */
export function parsePrio(value: unknown, values?: string[]): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = /^\s*(\d+)/.exec(value);
  if (match) return Number(match[1]);
  const index = values?.indexOf(value) ?? -1;
  return index >= 0 ? index + 1 : null;
}

export function rankCandidates(
  items: CandidateWorkItem[],
  config: CandidateConfig,
  excludeTags: string[] = config.excludedTags,
  predecessorStates: Map<number, string> = new Map(),
): { ranked: CandidateWorkItem[]; excluded: ExcludedCandidate[] } {
  const excludedTags = new Set(excludeTags.map((tag) => tag.toLowerCase()));
  const mergedStates = new Set(config.mergedStates.map((state) => state.toLowerCase()));
  const ranked: CandidateWorkItem[] = [];
  const excluded: ExcludedCandidate[] = [];

  for (const item of items) {
    const matchedTag = item.tags.find((tag) => excludedTags.has(tag.toLowerCase()));
    if (matchedTag !== undefined) {
      excluded.push({ id: item.id, title: item.title, reason: `tag ${matchedTag}` });
      continue;
    }
    const blocking = (item.predecessorIds ?? []).find((id) => !mergedStates.has((predecessorStates.get(id) ?? "").toLowerCase()));
    if (blocking !== undefined) {
      excluded.push({ id: item.id, title: item.title, reason: `waiting for predecessor #${blocking} (${predecessorStates.get(blocking) ?? "unknown"})` });
      continue;
    }
    ranked.push(item);
  }

  const unrankedType = Math.max(-1, ...Object.values(config.typeRank)) + 1;
  const typeRank = (type: string) => config.typeRank[type] ?? unrankedType;
  ranked.sort((left, right) =>
    (left.prio ?? NO_PRIO_RANK) - (right.prio ?? NO_PRIO_RANK)
    || typeRank(left.type) - typeRank(right.type)
    || left.createdDate.localeCompare(right.createdDate));

  return { ranked, excluded };
}

/** ADO returns identity GUIDs in lower case; a configured one may not be. */
export function findReviewer(
  reviewers: PullRequestReviewer[] | undefined,
  reviewerId: string,
): PullRequestReviewer | undefined {
  const wanted = reviewerId.toLowerCase();
  return reviewers?.find((reviewer) => reviewer.id.toLowerCase() === wanted);
}
