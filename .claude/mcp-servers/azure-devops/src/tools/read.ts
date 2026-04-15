import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureDevOpsClient } from "../client.js";
import { mapWorkItem, mapWorkItemSummary, mapComment } from "../mapper.js";

export function registerReadTools(
  server: McpServer,
  client: AzureDevOpsClient,
): void {

  // ── ado_get_work_item ───────────────────────────────────────────────
  server.tool(
    "ado_get_work_item",
    "Fetch a single Azure DevOps work item by ID. Returns title, description, acceptance criteria, type, state, assignee, tags, relations (parent/child/related/duplicates) and artifact links (branches, PRs, commits). HTML fields are converted to Markdown.",
    { id: z.number().int().positive().describe("Work item ID") },
    async ({ id }) => {
      const raw = await client.getWorkItem(id);
      const workItem = mapWorkItem(raw);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(workItem, null, 2) }],
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
