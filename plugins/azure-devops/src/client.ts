import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pullRequestAttachmentPath } from "./prAttachment.js";
import { projectConfigPath, projectDir, type ServerConfig } from "./config.js";
import type {
  AdoConfig,
  AdoWorkItemResponse,
  AdoWiqlResponse,
  AdoWiqlLinksResponse,
  AdoCommentsResponse,
  AdoPullRequestResponse,
  AdoBuildResponse,
  AdoTimelineRecord,
  AdoTestRunResponse,
  AdoTestResultResponse,
  AdoArtifactResponse,
  PullRequestReviewer,
} from "./types.js";

export { projectDir };

/** Hosts the PAT may be sent to; artifact download URLs come from API responses. */
const TRUSTED_HOST = /(^|\.)(dev\.azure\.com|visualstudio\.com)$/;

export function isTrustedAzureDevOpsUrl(url: string): boolean {
  const parsed = new URL(url);
  return parsed.protocol === "https:" && TRUSTED_HOST.test(parsed.hostname);
}

export class AzureDevOpsClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: AdoConfig) {
    const project = encodeURIComponent(config.project);
    this.baseUrl = `https://dev.azure.com/${config.org}/${project}/_apis`;
    this.authHeader =
      "Basic " + Buffer.from(`:${config.pat}`).toString("base64");
  }

  private get repoPath(): string {
    return `/git/repositories/${encodeURIComponent(this.config.repo)}`;
  }

  /** Web URL of a pull request, for display to the user. */
  pullRequestWebUrl(id: number): string {
    return `https://dev.azure.com/${this.config.org}/${encodeURIComponent(this.config.project)}/_git/${encodeURIComponent(this.config.repo)}/pullrequest/${id}`;
  }

  /** List pull requests whose source is the given branch. */
  async findPullRequests(
    branch: string,
    status: string,
  ): Promise<AdoPullRequestResponse[]> {
    const sourceRef = encodeURIComponent(`refs/heads/${branch}`);
    const result = await this.request<{ value: AdoPullRequestResponse[] }>(
      `${this.repoPath}/pullrequests?searchCriteria.sourceRefName=${sourceRef}&searchCriteria.status=${status}&api-version=7.1`,
    );
    return result.value;
  }

  /** Fetch a single pull request by ID. */
  async getPullRequest(id: number): Promise<AdoPullRequestResponse> {
    return this.request<AdoPullRequestResponse>(
      `${this.repoPath}/pullrequests/${id}?api-version=7.1`,
    );
  }

  /** Update title and/or description of a pull request. */
  async updatePullRequest(
    id: number,
    patch: { title?: string; description?: string },
  ): Promise<AdoPullRequestResponse> {
    return this.request<AdoPullRequestResponse>(
      `${this.repoPath}/pullrequests/${id}?api-version=7.1`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }

  /** Create a pull request, optionally linked to work items. */
  async createPullRequest(body: {
    sourceRefName: string;
    targetRefName: string;
    title: string;
    description: string;
    workItemRefs: Array<{ id: string }>;
  }): Promise<AdoPullRequestResponse> {
    return this.request<AdoPullRequestResponse>(
      `${this.repoPath}/pullrequests?api-version=7.1`,
      { method: "POST", body: JSON.stringify(body) },
    );
  }

  /** Add a reviewer to a pull request by identity id. */
  async addPullRequestReviewer(
    id: number,
    reviewerId: string,
    isRequired: boolean,
  ): Promise<PullRequestReviewer> {
    return this.request<PullRequestReviewer>(
      `${this.repoPath}/pullrequests/${id}/reviewers/${encodeURIComponent(reviewerId)}?api-version=7.1`,
      { method: "PUT", body: JSON.stringify({ isRequired }) },
    );
  }

  /** Fetch an absolute Azure DevOps URL and return the raw response body. */
  private async fetchBinary(url: string): Promise<Buffer> {
    if (!isTrustedAzureDevOpsUrl(url)) {
      throw new Error(`Refusing to send credentials to untrusted URL "${new URL(url).origin}"`);
    }
    const response = await fetch(url, { headers: { Authorization: this.authHeader } });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Azure DevOps API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /** Resolve pipeline definitions by exact name (case-insensitive). */
  async findBuildDefinitions(name: string): Promise<Array<{ id: number; name: string }>> {
    const result = await this.request<{ value: Array<{ id: number; name: string }> }>(
      `/build/definitions?name=${encodeURIComponent(name)}&api-version=7.1`,
    );
    return result.value;
  }

  /** List builds, newest first. */
  async listBuilds(filter: {
    definitionId?: number;
    branch?: string;
    result?: string;
    top: number;
  }): Promise<AdoBuildResponse[]> {
    const query = [`$top=${filter.top}`, "queryOrder=queueTimeDescending", "api-version=7.1"];
    if (filter.definitionId !== undefined) query.push(`definitions=${filter.definitionId}`);
    if (filter.branch !== undefined) {
      query.push(`branchName=${encodeURIComponent(`refs/heads/${filter.branch}`)}`);
    }
    if (filter.result !== undefined) query.push(`resultFilter=${filter.result}`);
    const result = await this.request<{ value: AdoBuildResponse[] }>(`/build/builds?${query.join("&")}`);
    return result.value;
  }

  async getBuild(id: number): Promise<AdoBuildResponse> {
    return this.request<AdoBuildResponse>(`/build/builds/${id}?api-version=7.1`);
  }

  async getBuildTimeline(id: number): Promise<AdoTimelineRecord[]> {
    const result = await this.request<{ records: AdoTimelineRecord[] }>(
      `/build/builds/${id}/timeline?api-version=7.1`,
    );
    return result.records;
  }

  /** Plain-text log of one timeline record. */
  async getBuildLog(buildId: number, logId: number): Promise<string> {
    const buffer = await this.fetchBinary(`${this.baseUrl}/build/builds/${buildId}/logs/${logId}?api-version=7.1`);
    return buffer.toString("utf8");
  }

  async getTestRunsForBuild(buildUri: string): Promise<AdoTestRunResponse[]> {
    const result = await this.request<{ value: AdoTestRunResponse[] }>(
      `/test/runs?buildUri=${encodeURIComponent(buildUri)}&api-version=7.1`,
    );
    return result.value;
  }

  async getFailedTestResults(runId: number, top: number): Promise<AdoTestResultResponse[]> {
    const result = await this.request<{ value: AdoTestResultResponse[] }>(
      `/test/runs/${runId}/results?outcomes=Failed&$top=${top}&api-version=7.1`,
    );
    return result.value;
  }

  async listBuildArtifacts(buildId: number): Promise<AdoArtifactResponse[]> {
    const result = await this.request<{ value: AdoArtifactResponse[] }>(
      `/build/builds/${buildId}/artifacts?api-version=7.1`,
    );
    return result.value;
  }

  /**
   * Download an artifact. With `subPath` (relative to the artifact root,
   * e.g. "/index.html") only that file; otherwise the whole artifact as zip.
   */
  async downloadArtifact(artifact: AdoArtifactResponse, subPath?: string): Promise<Buffer> {
    const base = artifact.resource.downloadUrl.replace(/\?.*$/, "");
    const url =
      subPath === undefined
        ? `${base}?format=zip`
        : `${base}?format=file&subPath=${encodeURIComponent(subPath).replace(/%2F/g, "/")}`;
    return this.fetchBinary(url);
  }

  /** Build the API URL for a work item (used for relation links). */
  workItemUrl(id: number): string {
    return `${this.baseUrl}/wit/workitems/${id}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Azure DevOps API ${response.status}: ${response.statusText} — ${body}`,
      );
    }

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Azure DevOps returned non-JSON response (${contentType}). This usually means the PAT is missing or invalid.`,
      );
    }

    return response.json() as Promise<T>;
  }

  /** Fetch a single work item by ID. */
  async getWorkItem(id: number): Promise<AdoWorkItemResponse> {
    return this.request<AdoWorkItemResponse>(
      `/wit/workitems/${id}?$expand=all&api-version=7.1`,
    );
  }

  /** Fetch multiple work items by IDs (batch, max 200). */
  async getWorkItems(ids: number[], options: { omitErrors?: boolean } = {}): Promise<AdoWorkItemResponse[]> {
    if (ids.length === 0) return [];
    const idsParam = ids.slice(0, 200).join(",");
    // errorPolicy=Omit returns null for deleted/unreadable ids instead of failing the whole batch.
    const errorPolicy = options.omitErrors ? "&errorPolicy=Omit" : "";
    const result = await this.request<{ value: Array<AdoWorkItemResponse | null> }>(
      `/wit/workitems?ids=${idsParam}&$expand=all${errorPolicy}&api-version=7.1`,
    );
    return result.value.filter((item): item is AdoWorkItemResponse => item !== null);
  }

  /** The identity the PAT belongs to (what WIQL calls @Me). */
  async getAuthenticatedUser(): Promise<{ id: string; displayName: string; uniqueName: string }> {
    const data = JSON.parse(
      (await this.fetchBinary(`https://dev.azure.com/${this.config.org}/_apis/connectionData`)).toString("utf8"),
    ) as { authenticatedUser: { id: string; providerDisplayName: string; properties?: { Account?: { $value?: string } } } };
    const user = data.authenticatedUser;
    const uniqueName = user.properties?.Account?.$value;
    // Callers assign work items with it — an empty value would clear the assignee instead.
    if (!uniqueName) throw new Error("connectionData returned no account name for the PAT owner");
    return { id: user.id, displayName: user.providerDisplayName, uniqueName };
  }

  /** Active pull requests created by the given identity. */
  async listActivePullRequestsByCreator(creatorId: string): Promise<AdoPullRequestResponse[]> {
    const result = await this.request<{ value: AdoPullRequestResponse[] }>(
      `${this.repoPath}/pullrequests?searchCriteria.status=active&searchCriteria.creatorId=${encodeURIComponent(creatorId)}&api-version=7.1`,
    );
    return result.value;
  }

  /** Files a pull request changes against its target, from its latest iteration. */
  async getPullRequestChangedFiles(id: number): Promise<string[]> {
    const iterations = await this.request<{ value: Array<{ id: number }> }>(
      `${this.repoPath}/pullrequests/${id}/iterations?api-version=7.1`,
    );
    const latest = iterations.value.at(-1);
    if (latest === undefined) return [];
    const files: string[] = [];
    let skip = 0;
    for (;;) {
      const page = await this.request<{ changeEntries: Array<{ item: { path?: string; isFolder?: boolean } }>; nextSkip?: number }>(
        `${this.repoPath}/pullrequests/${id}/iterations/${latest.id}/changes?$compareTo=0&$top=2000&$skip=${skip}&api-version=7.1`,
      );
      for (const entry of page.changeEntries) {
        if (entry.item.path !== undefined && !entry.item.isFolder) files.push(entry.item.path);
      }
      if (!page.nextSkip) return files;
      skip = page.nextSkip;
    }
  }

  /** Ids of every work item below `rootId` in the parent/child tree, at any depth. */
  async getDescendantIds(rootId: number): Promise<number[]> {
    const result = await this.request<AdoWiqlLinksResponse>(
      `/wit/wiql?api-version=7.1`,
      {
        method: "POST",
        body: JSON.stringify({
          query: `SELECT [System.Id] FROM WorkItemLinks WHERE [Source].[System.Id] = ${rootId} AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward' MODE (Recursive)`,
        }),
      },
    );
    return result.workItemRelations
      .filter((relation) => relation.source !== null)
      .map((relation) => relation.target.id);
  }

  /** Execute a WIQL query and return matching work item IDs. */
  async queryWiql(wiql: string, top: number = 20): Promise<AdoWiqlResponse> {
    return this.request<AdoWiqlResponse>(
      `/wit/wiql?api-version=7.1&$top=${top}`,
      {
        method: "POST",
        body: JSON.stringify({ query: wiql }),
      },
    );
  }

  /** Get comments for a work item. */
  async getComments(
    id: number,
    top: number = 20,
  ): Promise<AdoCommentsResponse> {
    return this.request<AdoCommentsResponse>(
      `/wit/workitems/${id}/comments?api-version=7.1-preview.4&$top=${top}`,
    );
  }

  /** Create a new work item. */
  async createWorkItem(
    type: string,
    operations: Array<{ op: string; path: string; value: unknown }>,
  ): Promise<AdoWorkItemResponse> {
    const encodedType = encodeURIComponent(type);
    return this.request<AdoWorkItemResponse>(
      `/wit/workitems/$${encodedType}?api-version=7.1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify(operations),
      },
    );
  }

  /** Update work item fields using JSON Patch. */
  async updateWorkItem(
    id: number,
    operations: Array<{ op: string; path: string; value: unknown }>,
  ): Promise<AdoWorkItemResponse> {
    return this.request<AdoWorkItemResponse>(
      `/wit/workitems/${id}?api-version=7.1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify(operations),
      },
    );
  }

  /** Add a comment to a work item. */
  async addComment(
    id: number,
    text: string,
  ): Promise<{ id: number; text: string }> {
    return this.request<{ id: number; text: string }>(
      `/wit/workitems/${id}/comments?api-version=7.1-preview.4`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
  }

  /** Update an existing comment on a work item. */
  async updateComment(
    id: number,
    commentId: number,
    text: string,
  ): Promise<{ id: number; text: string }> {
    return this.request<{ id: number; text: string }>(
      `/wit/workitems/${id}/comments/${commentId}?api-version=7.1-preview.4`,
      {
        method: "PATCH",
        body: JSON.stringify({ text }),
      },
    );
  }

  /** Delete a comment from a work item. Returns true on success (HTTP 204). */
  async deleteComment(id: number, commentId: number): Promise<true> {
    const url = `${this.baseUrl}/wit/workitems/${id}/comments/${commentId}?api-version=7.1-preview.4`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Azure DevOps API ${response.status}: ${response.statusText} — ${body}`,
      );
    }
    return true;
  }

  /** Download an attachment binary by its full Azure DevOps URL. */
  async downloadAttachment(
    url: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Azure DevOps API ${response.status}: ${response.statusText} — ${body}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  /**
   * Upload a binary as an attachment. Returns the attachment id + URL — the
   * caller still needs to link it to a work item via `addAttachmentRelation`.
   */
  async uploadAttachment(
    fileName: string,
    content: Buffer,
  ): Promise<{ id: string; url: string }> {
    const url = `${this.baseUrl}/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=7.1`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(content),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Azure DevOps API ${response.status}: ${response.statusText} — ${body}`,
      );
    }

    return response.json() as Promise<{ id: string; url: string }>;
  }

  /**
   * Upload a binary as an attachment of a pull request. Only `url` is read
   * from the response — the shape of the rest is not verified.
   */
  async uploadPullRequestAttachment(
    pullRequestId: number,
    fileName: string,
    content: Buffer,
  ): Promise<{ url: string }> {
    const url = `${this.baseUrl}${this.repoPath}${pullRequestAttachmentPath(pullRequestId, fileName)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(content),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Azure DevOps API ${response.status}: ${response.statusText} — ${body}`,
      );
    }

    const body = await response.text();
    let result: { url?: unknown } | null = null;
    try {
      result = JSON.parse(body) as { url?: unknown } | null;
    } catch {
      // Not JSON (e.g. the sign-in page of a 203 for an invalid PAT) — reported with the raw body below.
    }
    if (typeof result?.url !== "string" || result.url === "") {
      throw new Error(`Pull request attachment response carries no url — ${body.slice(0, 300)}`);
    }
    return { url: result.url };
  }
}

/**
 * Parse a simple KEY=VALUE .env file (no quotes handling needed).
 * Lines starting with # are ignored.
 */
function loadEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return vars;
  } catch {
    return {};
  }
}

/**
 * Create a client. Each value is taken from the first source that has it:
 *   1. environment variables AZURE_DEVOPS_ORG / _PROJECT / _PAT / _REPO
 *   2. `<project>/.claude/azure-devops.json` — committed: organization, project, repository
 *   3. a KEY=VALUE env file — `<project>/.claude/azure-devops.env` (gitignored, holds the PAT),
 *      then the legacy locations of a server copied into the project
 * The repository defaults to the project name.
 */
export function createClientFromEnv(config: ServerConfig): AzureDevOpsClient {
  const root = projectDir();
  const scriptDir = dirname(resolve(process.argv[1]));
  const configPath = projectConfigPath(root);
  const candidates = [
    resolve(root, ".claude", "azure-devops.env"),
    resolve(root, ".claude", "mcp-servers", "azure-devops", ".env"), // legacy: server copied into the project
    resolve(scriptDir, "..", ".env"),
  ];
  let envFile: Record<string, string> = {};
  for (const candidate of candidates) {
    envFile = loadEnvFile(candidate);
    if (Object.keys(envFile).length > 0) {
      console.error(`[azure-devops-mcp] Loaded env file ${candidate}`);
      break;
    }
  }
  if (Object.keys(envFile).length === 0) {
    console.error(`[azure-devops-mcp] No env file found. Tried: ${candidates.join(", ")}`);
  }

  const org = process.env.AZURE_DEVOPS_ORG || config.organization || envFile.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT || config.project || envFile.AZURE_DEVOPS_PROJECT;
  const pat = process.env.AZURE_DEVOPS_PAT || envFile.AZURE_DEVOPS_PAT;
  const repo = process.env.AZURE_DEVOPS_REPO || config.repository || envFile.AZURE_DEVOPS_REPO || project;

  console.error(`[azure-devops-mcp] org=${org ?? "(not set)"}, project=${project ?? "(not set)"}, repo=${repo ?? "(not set)"}, pat-length=${(pat ?? "").length}`);

  if (!org || !project || !repo || !pat) {
    throw new Error(
      `Missing config: organization/project in ${configPath} (or AZURE_DEVOPS_ORG/AZURE_DEVOPS_PROJECT), ` +
        `AZURE_DEVOPS_PAT as env var or in ${candidates[0]}`,
    );
  }

  return new AzureDevOpsClient({ org, project, repo, pat });
}
