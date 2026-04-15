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

/** Create a client from environment variables, falling back to a local .env file. */
export function createClientFromEnv(): AzureDevOpsClient {
  // Fall back to .env file next to the package.
  // Derive location from the script path (process.argv[1] = dist/index.js)
  const scriptDir = dirname(resolve(process.argv[1]));
  const candidates = [
    resolve(scriptDir, "..", ".env"),   // dist/ -> project root
    resolve(scriptDir, ".env"),         // if script is in project root
    resolve(process.cwd(), ".claude", "mcp-servers", "azure-devops", ".env"), // repo root
  ];
  let envFile: Record<string, string> = {};
  for (const candidate of candidates) {
    envFile = loadEnvFile(candidate);
    if (Object.keys(envFile).length > 0) {
      console.error(`[azure-devops-mcp] Loaded config from ${candidate}`);
      break;
    }
  }
  if (Object.keys(envFile).length === 0) {
    console.error(`[azure-devops-mcp] No .env found. Tried: ${candidates.join(", ")}`);
  }

  const org = process.env.AZURE_DEVOPS_ORG || envFile.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT || envFile.AZURE_DEVOPS_PROJECT;
  const pat = process.env.AZURE_DEVOPS_PAT || envFile.AZURE_DEVOPS_PAT;

  console.error(`[azure-devops-mcp] org=${org ?? "(not set)"}, project=${project ?? "(not set)"}, pat-length=${(pat ?? "").length}`);

  if (!org || !project || !pat) {
    throw new Error(
      "Missing config: set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_PAT as env vars or in .claude/mcp-servers/azure-devops/.env",
    );
  }

  return new AzureDevOpsClient({ org, project, pat });
}
