/**
 * Pure decision logic for pull request title/description updates.
 * Kept free of I/O so it can be tested without Azure DevOps.
 */

import type { PullRequestConfig } from "./config.js";

/** Azure DevOps rejects PR descriptions longer than this. */
export const PR_DESCRIPTION_MAX_LENGTH = 4000;

const TRUNCATION_NOTICE =
  "\n\n… (truncated to fit the Azure DevOps 4000-character limit)";

/** Token in a title pattern that stands for the (regex-escaped) source branch name. */
const SOURCE_BRANCH_TOKEN = "{sourceBranch}";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** An empty title, or one matching a configured placeholder pattern. */
export function isPlaceholderTitle(title: string | undefined, sourceBranch: string, config: PullRequestConfig): boolean {
  if (title === undefined) return false;
  const trimmed = title.trim();
  if (trimmed === "") return true;
  return config.placeholderTitlePatterns.some((pattern) =>
    new RegExp(pattern.split(SOURCE_BRANCH_TOKEN).join(escapeRegex(sourceBranch))).test(trimmed));
}

/** A missing or empty description, or one matching a configured placeholder pattern. */
export function isPlaceholderDescription(description: string | undefined, config: PullRequestConfig): boolean {
  if (description === undefined) return true;
  const trimmed = description.trim();
  return trimmed === "" || config.placeholderDescriptionPatterns.some((pattern) => new RegExp(pattern).test(trimmed));
}

export function fitDescription(description: string): { text: string; truncated: boolean } {
  if (description.length <= PR_DESCRIPTION_MAX_LENGTH) {
    return { text: description, truncated: false };
  }
  const keep = PR_DESCRIPTION_MAX_LENGTH - TRUNCATION_NOTICE.length;
  return { text: description.slice(0, keep) + TRUNCATION_NOTICE, truncated: true };
}

export interface PullRequestUpdatePlan {
  /** Fields to send in the PATCH body; empty when nothing may change. */
  patch: { title?: string; description?: string };
  /** Human-readable reasons for fields that were requested but left alone. */
  kept: string[];
  truncated: boolean;
}

/**
 * Decide which fields may be written. Without `force`, only placeholder
 * values (empty, or matching a configured placeholder pattern) are
 * replaced — text a person wrote is never overwritten.
 */
export function planPullRequestUpdate(
  current: { title?: string; description?: string; sourceBranch: string },
  desired: { title?: string; description?: string },
  force: boolean,
  config: PullRequestConfig,
): PullRequestUpdatePlan {
  const plan: PullRequestUpdatePlan = { patch: {}, kept: [], truncated: false };

  if (desired.title !== undefined) {
    if (force || isPlaceholderTitle(current.title, current.sourceBranch, config)) {
      plan.patch.title = desired.title;
    } else {
      plan.kept.push("title (not a placeholder)");
    }
  }

  if (desired.description !== undefined) {
    if (force || isPlaceholderDescription(current.description, config)) {
      const fitted = fitDescription(desired.description);
      plan.patch.description = fitted.text;
      plan.truncated = fitted.truncated;
    } else {
      plan.kept.push("description (already filled)");
    }
  }

  return plan;
}
