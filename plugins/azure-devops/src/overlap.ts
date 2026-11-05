/**
 * Pure file-overlap logic: which open pull requests change files a ticket is about to change.
 * Kept free of I/O so it can be tested without Azure DevOps.
 */

import { DEFAULT_BRANCH_TICKET_PATTERN } from "./config.js";

export interface PullRequestFiles {
  id: number;
  title: string;
  sourceBranch: string;
  /** Paths as the PR iteration changes report them ("/a/b.cs"). */
  files: string[];
}

export interface FileOverlap {
  pullRequestId: number;
  title: string;
  sourceBranch: string;
  ticketId: number | null;
  /** Shared paths, normalized. */
  files: string[];
}

/** Spec lists and git use "a/b.cs", PR changes "/a/b.cs"; Windows paths ignore case. */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
}

function stripHeads(branch: string): string {
  return branch.replace(/^refs\/heads\//, "");
}

/** Ticket id from the branch name via `pattern` (first capture group, else the whole match); null when it does not match. */
export function ticketIdFromBranch(branch: string, pattern: string = DEFAULT_BRANCH_TICKET_PATTERN): number | null {
  const match = new RegExp(pattern).exec(stripHeads(branch));
  if (!match) return null;
  const id = Number(match[1] ?? match[0]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PR id from a work item artifact link `vstfs:///Git/PullRequestId/<project>%2F<repo>%2F<id>`. */
export function prIdFromArtifactUrl(url: string): number | null {
  const match = /^vstfs:\/\/\/Git\/PullRequestId\/.*%2f(\d+)$/i.exec(url);
  return match ? Number(match[1]) : null;
}

export function findFileOverlaps(
  paths: string[],
  pullRequests: PullRequestFiles[],
  excludeBranch?: string,
  branchTicketPattern: string = DEFAULT_BRANCH_TICKET_PATTERN,
): FileOverlap[] {
  const planned = new Set(paths.map(normalizePath));
  const excluded = excludeBranch === undefined ? undefined : stripHeads(excludeBranch);
  const overlaps: FileOverlap[] = [];

  for (const pullRequest of pullRequests) {
    const sourceBranch = stripHeads(pullRequest.sourceBranch);
    if (sourceBranch === excluded) continue;
    const shared = [...new Set(pullRequest.files.map(normalizePath))].filter((file) => planned.has(file));
    if (shared.length === 0) continue;
    overlaps.push({
      pullRequestId: pullRequest.id,
      title: pullRequest.title,
      sourceBranch,
      ticketId: ticketIdFromBranch(sourceBranch, branchTicketPattern),
      files: shared,
    });
  }
  return overlaps;
}
