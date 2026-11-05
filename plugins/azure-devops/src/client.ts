import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type {
  AdoConfig,
  AdoWorkItemResponse,
  AdoWiqlResponse,
  AdoCommentsResponse,
} from "./types.js";

export class AzureDevOpsClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: AdoConfig) {
    const project = encodeURIComponent(config.project);
    this.baseUrl = `https://dev.azure.com/${config.org}/${project}/_apis`;
    this.authHeader =
      "Basic " + Buffer.from(`:${config.pat}`).toString("base64");
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
  async getWorkItems(ids: number[]): Promise<AdoWorkItemResponse[]> {
    if (ids.length === 0) return [];
    const idsParam = ids.slice(0, 200).join(",");
    const result = await this.request<{ value: AdoWorkItemResponse[] }>(
      `/wit/workitems?ids=${idsParam}&$expand=all&api-version=7.1`,
    );
    return result.value;
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
   * caller still needs to link it to a work item via a relation update.
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
 * Root of the project the server works for. As a plugin the server runs from
 * the plugin cache, so the project comes from CLAUDE_PROJECT_DIR (exported by
 * Claude Code to stdio MCP servers); the working directory is the fallback.
 */
export function projectDir(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/** Read organization/project from the committed `.claude/azure-devops.json` of the project. */
function loadProjectConfig(path: string): Record<string, string> {
  try {
    const json = JSON.parse(readFileSync(path, "utf-8")) as { organization?: string; project?: string };
    const vars: Record<string, string> = {};
    if (json.organization) vars.AZURE_DEVOPS_ORG = json.organization;
    if (json.project) vars.AZURE_DEVOPS_PROJECT = json.project;
    return vars;
  } catch {
    return {};
  }
}

/**
 * Create a client. Each value is taken from the first source that has it:
 *   1. environment variables AZURE_DEVOPS_ORG / _PROJECT / _PAT
 *   2. `<project>/.claude/azure-devops.json` — committed, { "organization", "project" }
 *   3. a KEY=VALUE env file — `<project>/.claude/azure-devops.env` (gitignored, holds the PAT),
 *      then the legacy locations of the copied server
 */
export function createClientFromEnv(): AzureDevOpsClient {
  const root = projectDir();
  const scriptDir = dirname(resolve(process.argv[1]));
  const configPath = resolve(root, ".claude", "azure-devops.json");
  const projectConfig = loadProjectConfig(configPath);
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

  const org = process.env.AZURE_DEVOPS_ORG || projectConfig.AZURE_DEVOPS_ORG || envFile.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT || projectConfig.AZURE_DEVOPS_PROJECT || envFile.AZURE_DEVOPS_PROJECT;
  const pat = process.env.AZURE_DEVOPS_PAT || envFile.AZURE_DEVOPS_PAT;

  console.error(`[azure-devops-mcp] org=${org ?? "(not set)"}, project=${project ?? "(not set)"}, pat-length=${(pat ?? "").length}`);

  if (!org || !project || !pat) {
    throw new Error(
      `Missing config: organization/project in ${configPath} (or AZURE_DEVOPS_ORG/AZURE_DEVOPS_PROJECT), ` +
        `AZURE_DEVOPS_PAT as env var or in ${candidates[0]}`,
    );
  }

  return new AzureDevOpsClient({ org, project, pat });
}
