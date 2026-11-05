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
  attachments: Array<{ name: string; url: string; id: string; size?: number }>;
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
  /** Configured boolean flags (`flags` in .claude/azure-devops.json), keyed by flag name. */
  [flag: string]: unknown;
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

/** Work Item with resolved context (linked items inlined). */
export interface WorkItemWithContext {
  main: WorkItem;
  parent?: WorkItem;
  children: WorkItem[];
  related: WorkItem[];
  duplicates: WorkItem[];
  /** Comments on the main work item (only when includeComments=true). */
  comments?: WorkItemComment[];
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
  /** Revision; a JSON-patch `test /rev` rejects an update after a field change (link edits do not raise it). */
  rev?: number;
  fields: AdoWorkItemFields;
  relations?: AdoRelation[];
  _links?: { html?: { href: string } };
  url: string;
}

/** Raw response from WIQL query. */
export interface AdoWiqlResponse {
  workItems: Array<{ id: number; url: string }>;
}

/** Raw response from a WIQL query over WorkItemLinks (source is null for the root rows). */
export interface AdoWiqlLinksResponse {
  workItemRelations: Array<{ rel: string | null; source: { id: number } | null; target: { id: number } }>;
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
  /** Git repository name; defaults to the project name. */
  repo: string;
  pat: string;
}

/** Raw build from the Azure DevOps Build REST API. */
export interface AdoBuildResponse {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  uri: string;
  sourceBranch: string;
  sourceVersion: string;
  queueTime?: string;
  finishTime?: string;
  reason: string;
  definition: { id: number; name: string };
  requestedFor?: { displayName: string };
  _links?: { web?: { href: string } };
}

/** One record of a build timeline (stage, job or task). */
export interface AdoTimelineRecord {
  id: string;
  parentId?: string;
  type: string;
  name: string;
  state: string;
  result?: string;
  order?: number;
  log?: { id: number };
  issues?: Array<{ type: string; message: string }>;
}

export interface AdoTestRunResponse {
  id: number;
  name: string;
  totalTests: number;
  passedTests: number;
  unanalyzedTests: number;
}

export interface AdoTestResultResponse {
  testCaseTitle: string;
  automatedTestName: string;
  automatedTestStorage?: string;
  outcome: string;
  durationInMs?: number;
  errorMessage?: string;
  stackTrace?: string;
}

export interface AdoArtifactResponse {
  name: string;
  resource: { type: string; downloadUrl: string };
}

/** Reviewer entry of a pull request (IdentityRefWithVote). */
export interface PullRequestReviewer {
  id: string;
  displayName: string;
  vote: number;
  isRequired?: boolean;
}

/** Raw pull request from the Azure DevOps Git REST API. */
export interface AdoPullRequestResponse {
  pullRequestId: number;
  title: string;
  description?: string;
  status: string;
  sourceRefName: string;
  targetRefName: string;
  isDraft?: boolean;
  createdBy?: { displayName: string };
  creationDate?: string;
  reviewers?: PullRequestReviewer[];
}

/** Normalized pull request returned by the MCP tools. */
export interface PullRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  isDraft: boolean;
  createdBy: string;
  /** Identity ids here are what ado_add_pull_request_reviewer takes. */
  reviewers: PullRequestReviewer[];
  url: string;
}
