import TurndownService from "turndown";
import type {
  AdoRelation,
  AdoWorkItemResponse,
  RelationKind,
  WorkItem,
  WorkItemArtifacts,
  WorkItemComment,
  WorkItemRelation,
  WorkItemSummary,
} from "./types.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

/** Convert HTML to Markdown, handling null/undefined gracefully. */
function htmlToMarkdown(html: string | undefined | null): string {
  if (!html) return "";
  return turndown.turndown(html).trim();
}

/** Parse a semicolon-separated tags string into an array. */
function parseTags(tags: string | undefined | null): string[] {
  if (!tags) return [];
  return tags
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Map Azure DevOps link type to our normalized RelationKind. */
function mapRelationKind(rel: string): RelationKind {
  switch (rel) {
    case "System.LinkTypes.Hierarchy-Reverse":
      return "parent";
    case "System.LinkTypes.Hierarchy-Forward":
      return "child";
    case "System.LinkTypes.Related":
      return "related";
    case "System.LinkTypes.Duplicate-Forward":
      return "duplicate-of";
    case "System.LinkTypes.Duplicate-Reverse":
      return "duplicate";
    case "System.LinkTypes.Dependency-Forward":
      return "successor";
    case "System.LinkTypes.Dependency-Reverse":
      return "predecessor";
    case "Microsoft.VSTS.Common.Affects-Forward":
      return "affects";
    case "Microsoft.VSTS.Common.Affects-Reverse":
      return "affected-by";
    default:
      return "other";
  }
}

/** Extract the trailing numeric ID from a work-item URL. */
function workItemIdFromUrl(url: string): number | undefined {
  const match = url.match(/\/workItems\/(\d+)(?:\?|$)/i);
  if (!match) return undefined;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) ? id : undefined;
}

/**
 * Parse an ArtifactLink relation and slot it into the right bucket.
 *
 * Common vstfs:// URIs:
 *   vstfs:///Git/Ref/{projectId}%2F{repoId}%2F{encodedBranchName}
 *   vstfs:///Git/Commit/{projectId}%2F{repoId}%2F{sha}
 *   vstfs:///Git/PullRequestId/{projectId}%2F{repoId}%2F{prId}
 *   vstfs:///Build/Build/{buildId}
 */
function assignArtifact(
  artifacts: WorkItemArtifacts,
  rel: AdoRelation,
): void {
  const url = rel.url;
  const name = rel.attributes?.name ?? "";

  // Git Ref (branch)
  const branchMatch = url.match(/vstfs:\/\/\/Git\/Ref\/([^/]+)/i);
  if (branchMatch) {
    const parts = decodeURIComponent(branchMatch[1]).split("/");
    // Format: projectId/repoId/refs/heads/branchName OR projectId/repoId/GB<branchName>
    let branchName: string;
    let repoId: string | undefined;
    if (parts.length >= 2) {
      repoId = parts[1];
    }
    // refs/heads/ style
    const refsIdx = parts.indexOf("refs");
    if (refsIdx !== -1 && parts.length > refsIdx + 2) {
      branchName = parts.slice(refsIdx + 2).join("/");
    } else if (parts.length >= 3 && parts[2].startsWith("GB")) {
      branchName = parts[2].slice(2);
    } else {
      branchName = parts.slice(2).join("/");
    }
    artifacts.branches.push({ name: branchName, repoId, url });
    return;
  }

  // Git Commit
  const commitMatch = url.match(/vstfs:\/\/\/Git\/Commit\/([^/]+)/i);
  if (commitMatch) {
    const parts = decodeURIComponent(commitMatch[1]).split("/");
    const repoId = parts.length >= 2 ? parts[1] : undefined;
    const sha = parts[parts.length - 1] ?? "";
    artifacts.commits.push({ sha, repoId, url });
    return;
  }

  // Pull Request
  const prMatch = url.match(/vstfs:\/\/\/Git\/PullRequestId\/([^/]+)/i);
  if (prMatch) {
    const parts = decodeURIComponent(prMatch[1]).split("/");
    const repoId = parts.length >= 2 ? parts[1] : undefined;
    const prId = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (Number.isFinite(prId)) {
      artifacts.pullRequests.push({ id: prId, repoId, url });
      return;
    }
  }

  // Build
  const buildMatch = url.match(/vstfs:\/\/\/Build\/Build\/(\d+)/i);
  if (buildMatch) {
    const id = Number.parseInt(buildMatch[1], 10);
    if (Number.isFinite(id)) {
      artifacts.builds.push({ id, url });
      return;
    }
  }

  // Fallback — keep the raw link so callers still see it
  artifacts.other.push({ name: name || "artifact", url });
}

/** Partition raw relations into work-item relations and artifact links. */
function extractRelations(raw: AdoRelation[] | undefined): {
  relations: WorkItemRelation[];
  artifacts: WorkItemArtifacts;
} {
  const relations: WorkItemRelation[] = [];
  const artifacts: WorkItemArtifacts = {
    branches: [],
    pullRequests: [],
    commits: [],
    builds: [],
    other: [],
  };

  if (!raw) return { relations, artifacts };

  for (const rel of raw) {
    if (rel.rel === "ArtifactLink") {
      assignArtifact(artifacts, rel);
      continue;
    }
    // Work item link
    if (rel.rel.startsWith("System.LinkTypes.") || rel.rel.startsWith("Microsoft.VSTS.Common.")) {
      relations.push({
        kind: mapRelationKind(rel.rel),
        rawType: rel.rel,
        id: workItemIdFromUrl(rel.url),
        comment: rel.attributes?.comment,
      });
    }
    // Silently ignore attachments, hyperlinks, etc. — not useful for context
  }

  return { relations, artifacts };
}

/** Map a raw Azure DevOps work item to our normalized WorkItem. */
export function mapWorkItem(raw: AdoWorkItemResponse): WorkItem {
  const fields = raw.fields;
  const htmlLink = raw._links?.html?.href;
  const assignedTo = fields["System.AssignedTo"];
  const resolvedBy = fields["Microsoft.VSTS.Common.ResolvedBy"];
  const { relations, artifacts } = extractRelations(raw.relations);

  return {
    id: raw.id,
    title: fields["System.Title"] ?? "",
    type: fields["System.WorkItemType"] ?? "",
    state: fields["System.State"] ?? "",
    description: htmlToMarkdown(fields["System.Description"]),
    acceptanceCriteria: htmlToMarkdown(
      fields["Microsoft.VSTS.Common.AcceptanceCriteria"],
    ),
    assignedTo: assignedTo?.displayName ?? "",
    tags: parseTags(fields["System.Tags"]),
    areaPath: fields["System.AreaPath"] ?? "",
    iterationPath: fields["System.IterationPath"] ?? "",
    url: htmlLink ?? raw.url,
    resolvedReason: fields["Microsoft.VSTS.Common.ResolvedReason"] || undefined,
    resolvedBy: resolvedBy?.displayName || undefined,
    relations,
    artifacts,
  };
}

/** Map a raw work item to a compact summary (for search results). */
export function mapWorkItemSummary(raw: AdoWorkItemResponse): WorkItemSummary {
  return {
    id: raw.id,
    title: raw.fields["System.Title"] ?? "",
    type: raw.fields["System.WorkItemType"] ?? "",
    state: raw.fields["System.State"] ?? "",
  };
}

/** Map raw comment data. */
export function mapComment(raw: {
  id: number;
  text: string;
  createdBy: { displayName: string };
  createdDate: string;
}): WorkItemComment {
  return {
    id: raw.id,
    text: htmlToMarkdown(raw.text),
    createdBy: raw.createdBy.displayName,
    createdDate: raw.createdDate,
  };
}
