import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectDir, type AzureDevOpsClient } from "../client.js";
import type { ServerConfig } from "../config.js";
import { buildCandidateWiql, rankCandidates } from "../candidates.js";
import { mapWorkItem, mapWorkItemSummary, mapComment, mapCandidate } from "../mapper.js";
import type { WorkItem, WorkItemWithContext } from "../types.js";

export function registerReadTools(
  server: McpServer,
  client: AzureDevOpsClient,
  config: ServerConfig,
): void {

  // ── ado_get_work_item ───────────────────────────────────────────────
  server.tool(
    "ado_get_work_item",
    "Fetch a single Azure DevOps work item by ID. Returns title, description, acceptance criteria, type, state, assignee, tags, relations (parent/child/related/duplicates) and artifact links (branches, PRs, commits). HTML fields are converted to Markdown. For full context including the resolved content of linked items, prefer ado_get_work_item_with_context.",
    { id: z.number().int().positive().describe("Work item ID") },
    async ({ id }) => {
      const raw = await client.getWorkItem(id);
      const workItem = mapWorkItem(raw, config);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(workItem, null, 2) }],
      };
    },
  );

  // ── ado_get_work_item_with_context ──────────────────────────────────
  server.tool(
    "ado_get_work_item_with_context",
    "Fetch a work item AND inline its linked items (parent, children, related, duplicates) in a single call. Use this when starting work on a ticket — resolved related tickets often describe what is already implemented (with branch names in their artifact links). Comments can be included optionally. Only follows links one level deep to keep responses bounded.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      includeComments: z.boolean().default(false).describe("Also fetch comments on the main work item (often contain implementation hints on resolved tickets)"),
    },
    async ({ id, includeComments }) => {
      const rawMain = await client.getWorkItem(id);
      const main = mapWorkItem(rawMain, config);

      // Collect IDs of all linked work items (one level deep)
      const linkedIds = main.relations
        .map((r) => r.id)
        .filter((wid): wid is number => typeof wid === "number" && wid !== id);

      const uniqueIds = [...new Set(linkedIds)];
      const linkedItems: WorkItem[] = uniqueIds.length
        ? (await client.getWorkItems(uniqueIds)).map((raw) => mapWorkItem(raw, config))
        : [];

      // Index by ID for lookup
      const byId = new Map(linkedItems.map((wi) => [wi.id, wi]));

      // Bucket the items by relation kind (use the relation order from main)
      const parents: WorkItem[] = [];
      const children: WorkItem[] = [];
      const related: WorkItem[] = [];
      const duplicates: WorkItem[] = [];

      for (const rel of main.relations) {
        if (rel.id === undefined) continue;
        const item = byId.get(rel.id);
        if (!item) continue;
        switch (rel.kind) {
          case "parent":
            parents.push(item);
            break;
          case "child":
            children.push(item);
            break;
          case "related":
            related.push(item);
            break;
          case "duplicate":
          case "duplicate-of":
            duplicates.push(item);
            break;
          // predecessor/successor/affects/affected-by/other → ignored at top level
          // (still visible via main.relations)
        }
      }

      const context: WorkItemWithContext = {
        main,
        parent: parents[0], // a work item has at most one parent
        children,
        related,
        duplicates,
      };

      if (includeComments) {
        const commentsRaw = await client.getComments(id, 50);
        context.comments = commentsRaw.comments.map(mapComment);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(context, null, 2) }],
      };
    },
  );

  // ── ado_search_work_items ───────────────────────────────────────────
  server.tool(
    "ado_search_work_items",
    "Search Azure DevOps work items by keyword, type, and/or state. Returns a compact list (id, title, type, state). Uses WIQL internally.",
    {
      query: z.string().max(500).describe("Search keyword(s) to match against title or description"),
      type: z.string().optional().describe("Filter by work item type (e.g. Bug, Task, User Story, Feature)"),
      state: z.string().optional().describe("Filter by state (e.g. New, Active, Resolved, Closed)"),
      top: z.number().int().min(1).max(50).default(20).describe("Max results to return (default 20, max 50)"),
    },
    async ({ query, type, state, top }) => {
      const conditions = [
        `([System.Title] CONTAINS '${escapeWiql(query)}' OR [System.Description] CONTAINS '${escapeWiql(query)}')`,
      ];
      if (type) {
        conditions.push(`[System.WorkItemType] = '${escapeWiql(type)}'`);
      }
      if (state) {
        conditions.push(`[System.State] = '${escapeWiql(state)}'`);
      }

      const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.ChangedDate] DESC`;

      const result = await client.queryWiql(wiql, top);
      if (result.workItems.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No work items found." }],
        };
      }

      const ids = result.workItems.map((wi) => wi.id);
      const rawItems = await client.getWorkItems(ids);
      const summaries = rawItems.map(mapWorkItemSummary);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summaries, null, 2) }],
      };
    },
  );

  // ── ado_list_candidate_work_items ───────────────────────────────────
  server.tool(
    "ado_list_candidate_work_items",
    `List work items assigned to the PAT owner (with epicId: below that epic, assigned to the PAT owner or unassigned) that nobody has started yet (types ${config.candidates.types.join("/")}, states ${config.candidates.notStartedStates.join("/")}), ranked to pick the next one: ${config.priority ? `${config.priority.field} ascending (none last), then ` : ""}by type (${typeOrder(config)}), then oldest first. Work items carrying an excluded tag, or with a predecessor (Dependency-Reverse link) not yet ${config.candidates.mergedStates.join("/")}, are listed separately with the reason. The query reads at most the oldest 200 matching items; when it hits that cap the output carries "truncated": true and newer tickets are missing from the ranking.`,
    {
      top: z.number().int().min(1).max(50).default(10).describe("Max ranked candidates to return (default 10)"),
      excludeTags: z.array(z.string().min(1)).default(config.candidates.excludedTags).describe(`Tags that exclude a work item, case-insensitive (default: ${config.candidates.excludedTags.join(", ") || "none"})`),
      epicId: z.number().int().positive().optional().describe("Only tickets below this work item (any depth); then unassigned tickets count too — assignedTo is \"\" for them"),
    },
    async ({ top, excludeTags, epicId }) => {
      let epic: { epicId: number; epicTitle: string; descendants: number } | undefined;
      let descendantIds: number[] | undefined;
      if (epicId !== undefined) {
        descendantIds = await client.getDescendantIds(epicId);
        const [epicItem] = await client.getWorkItems([epicId], { omitErrors: true });
        epic = { epicId, epicTitle: epicItem?.fields["System.Title"] ?? "(not found)", descendants: descendantIds.length };
        if (descendantIds.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ ...epic, candidates: [], total: 0, excluded: [] }, null, 2) }] };
        }
      }
      const wiql = buildCandidateWiql(config.candidates, descendantIds);

      const wiqlCap = 200;
      const result = await client.queryWiql(wiql, wiqlCap);
      const truncated = result.workItems.length >= wiqlCap;
      const candidates = (await client.getWorkItems(result.workItems.map((wi) => wi.id))).map((raw) => mapCandidate(raw, config.priority));

      const predecessorIds = [...new Set(candidates.flatMap((candidate) => candidate.predecessorIds))];
      const predecessorStates = new Map(
        // A deleted or unreadable predecessor is omitted, stays unknown and therefore blocks — it must not fail the listing.
        (await client.getWorkItems(predecessorIds, { omitErrors: true })).map((raw) => [raw.id, raw.fields["System.State"] ?? ""] as [number, string]),
      );
      const { ranked, excluded } = rankCandidates(candidates, config.candidates, excludeTags, predecessorStates);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...epic, candidates: ranked.slice(0, top), total: ranked.length, excluded, ...(truncated ? { truncated: true } : {}) }, null, 2) }],
      };
    },
  );

  // ── ado_whoami ──────────────────────────────────────────────────────
  server.tool(
    "ado_whoami",
    "The Azure DevOps identity the PAT belongs to — the one WIQL calls @Me. Use its uniqueName (email) when assigning a work item to yourself; the git user name need not match an ADO identity.",
    {},
    async () => {
      const user = await client.getAuthenticatedUser();
      return { content: [{ type: "text" as const, text: JSON.stringify(user, null, 2) }] };
    },
  );

  // ── ado_get_work_item_comments ──────────────────────────────────────
  server.tool(
    "ado_get_work_item_comments",
    "Get comments/discussion for an Azure DevOps work item. Useful for understanding context and decisions.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      top: z.number().int().min(1).max(50).default(20).describe("Max comments to return (default 20)"),
    },
    async ({ id, top }) => {
      const raw = await client.getComments(id, top);
      const comments = raw.comments.map(mapComment);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comments, null, 2) }],
      };
    },
  );

  // ── ado_download_attachments ─────────────────────────────────────────
  server.tool(
    "ado_download_attachments",
    "Download all file attachments from an Azure DevOps work item to disk. Files are saved to .claude/input/{workItemId}/ by default. Returns metadata (name, path, size, contentType) for each downloaded file.",
    {
      workItemId: z.number().int().positive().describe("Work item ID to download attachments from"),
      outputDir: z.string().optional().describe("Override the default download directory (.claude/input/{workItemId}/)"),
    },
    async ({ workItemId, outputDir }) => {
      const raw = await client.getWorkItem(workItemId);
      const workItem = mapWorkItem(raw, config);
      const attachments = workItem.artifacts.attachments;

      if (attachments.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No attachments found on work item #${workItemId}.` }],
        };
      }

      const dir = resolve(projectDir(), outputDir ?? join(".claude", "input", String(workItemId)));
      mkdirSync(dir, { recursive: true });

      const results: Array<{ name: string; path: string; size: number; contentType: string }> = [];

      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const { buffer, contentType } = await client.downloadAttachment(attachment.url);
        const fileName = attachment.name || `attachment-${i}`;
        const filePath = join(dir, fileName);
        writeFileSync(filePath, buffer);
        results.push({ name: fileName, path: filePath, size: buffer.length, contentType });
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}

/** Candidate types in rank order, for the tool description. */
function typeOrder(config: ServerConfig): string {
  const rank = config.candidates.typeRank;
  return Object.keys(rank).sort((left, right) => rank[left] - rank[right]).join(" before ") || "any";
}

/** Escape single quotes in WIQL values to prevent injection. */
function escapeWiql(value: string): string {
  return value.replace(/'/g, "''");
}
