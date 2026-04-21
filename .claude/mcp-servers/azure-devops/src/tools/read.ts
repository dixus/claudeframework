import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureDevOpsClient } from "../client.js";
import { mapWorkItem, mapWorkItemSummary, mapComment } from "../mapper.js";
import type { WorkItem, WorkItemWithContext } from "../types.js";

export function registerReadTools(
  server: McpServer,
  client: AzureDevOpsClient,
): void {

  // ── ado_get_work_item ───────────────────────────────────────────────
  server.tool(
    "ado_get_work_item",
    "Fetch a single Azure DevOps work item by ID. Returns title, description, acceptance criteria, type, state, assignee, tags, relations (parent/child/related/duplicates) and artifact links (branches, PRs, commits). HTML fields are converted to Markdown. For full context including the resolved content of linked items, prefer ado_get_work_item_with_context.",
    { id: z.number().int().positive().describe("Work item ID") },
    async ({ id }) => {
      const raw = await client.getWorkItem(id);
      const workItem = mapWorkItem(raw);
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
      const main = mapWorkItem(rawMain);

      // Collect IDs of all linked work items (one level deep)
      const linkedIds = main.relations
        .map((r) => r.id)
        .filter((wid): wid is number => typeof wid === "number" && wid !== id);

      const uniqueIds = [...new Set(linkedIds)];
      const linkedItems: WorkItem[] = uniqueIds.length
        ? (await client.getWorkItems(uniqueIds)).map(mapWorkItem)
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
}

/** Escape single quotes in WIQL values to prevent injection. */
function escapeWiql(value: string): string {
  return value.replace(/'/g, "''");
}
