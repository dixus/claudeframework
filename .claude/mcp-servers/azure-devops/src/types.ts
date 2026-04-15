/** Relation types we recognize from Azure DevOps. */
export type RelationKind =
  | "parent"
  | "child"
  | "related"
  | "duplicate-of"
  | "duplicate"
  | "predecessor"
  | "successor"
  | "affects"
  | "affected-by"
  | "other";

/** A link from one work item to another. */
export interface WorkItemRelation {
  kind: RelationKind;
  /** Raw Azure DevOps relation type, e.g. "System.LinkTypes.Related". */
  rawType: string;
  /** Target work item ID (only set for work-item relations, not artifact links). */
  id?: number;
  /** Optional comment the user added when creating the link. */
  comment?: string;
}

/** Parsed artifact links (branches, commits, PRs, builds). */
export interface WorkItemArtifacts {
  branches: Array<{ name: string; repoId?: string; url: string }>;
  pullRequests: Array<{ id: number; repoId?: string; url: string }>;
  commits: Array<{ sha: string; repoId?: string; url: string }>;
  builds: Array<{ id: number; url: string }>;
  other: Array<{ name: string; url: string }>;
}

/** Normalized Work Item returned by the MCP tools. */
export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  description: string;
  acceptanceCriteria: string;
  assignedTo: string;
  tags: string[];
  areaPath: string;
  iterationPath: string;
  url: string;
  /** Resolution metadata (only set when the item is Resolved/Closed). */
  resolvedReason?: string;
  resolvedBy?: string;
  /** Links to other work items. */
  relations: WorkItemRelation[];
  /** Parsed artifact links (branches, PRs, commits). */
  artifacts: WorkItemArtifacts;
}

/** Compact Work Item for search results. */
export interface WorkItemSummary {
  id: number;
  title: string;
  type: string;
  state: string;
}

/** Work Item comment. */
export interface WorkItemComment {
  id: number;
  text: string;
  createdBy: string;
  createdDate: string;
}

/** Azure DevOps REST API raw field map. */
export interface AdoWorkItemFields {
  "System.Id": number;
  "System.Title": string;
  "System.WorkItemType": string;
  "System.State": string;
  "System.Description"?: string;
  "Microsoft.VSTS.Common.AcceptanceCriteria"?: string;
  "Microsoft.VSTS.Common.ResolvedReason"?: string;
  "Microsoft.VSTS.Common.ResolvedBy"?: { displayName: string; uniqueName: string };
  "System.AssignedTo"?: { displayName: string; uniqueName: string };
  "System.Tags"?: string;
  "System.AreaPath"?: string;
  "System.IterationPath"?: string;
  [key: string]: unknown;
}

/** Raw relation entry from Azure DevOps. */
export interface AdoRelation {
  rel: string;
  url: string;
  attributes?: {
    name?: string;
    comment?: string;
    [key: string]: unknown;
  };
}

/** Raw response from the Work Items API. */
export interface AdoWorkItemResponse {
  id: number;
  fields: AdoWorkItemFields;
  relations?: AdoRelation[];
  _links?: { html?: { href: string } };
  url: string;
}

/** Raw response from WIQL query. */
export interface AdoWiqlResponse {
  workItems: Array<{ id: number; url: string }>;
}

/** Raw response from the Comments API. */
export interface AdoCommentsResponse {
  comments: Array<{
    id: number;
    text: string;
    createdBy: { displayName: string };
    createdDate: string;
  }>;
}

/** Configuration for the Azure DevOps client. */
export interface AdoConfig {
  org: string;
  project: string;
  pat: string;
}
