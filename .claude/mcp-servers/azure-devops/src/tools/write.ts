import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureDevOpsClient } from "../client.js";
import { mapWorkItem } from "../mapper.js";

export function registerWriteTools(
  server: McpServer,
  client: AzureDevOpsClient,
): void {
  // ── ado_update_work_item_state ──────────────────────────────────────
  server.tool(
    "ado_update_work_item_state",
    "Update the state of an Azure DevOps work item (e.g. New → Active → Resolved → Closed). Only changes the State field.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      state: z.string().min(1).describe("New state value (e.g. Active, Resolved, Closed)"),
    },
    async ({ id, state }) => {
      const raw = await client.updateWorkItem(id, [
        { op: "replace", path: "/fields/System.State", value: state },
      ]);
      const workItem = mapWorkItem(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: `Work item #${workItem.id} state updated to "${workItem.state}".\n\n${JSON.stringify(workItem, null, 2)}`,
          },
        ],
      };
    },
  );

  // ── ado_add_work_item_comment ───────────────────────────────────────
  server.tool(
    "ado_add_work_item_comment",
    "Add a comment to an Azure DevOps work item. Use to post branch names, commit hashes, PR links, or development notes.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      comment: z.string().min(1).max(4000).describe("Comment text (plain text or HTML)"),
    },
    async ({ id, comment }) => {
      const result = await client.addComment(id, comment);
      return {
        content: [
          {
            type: "text" as const,
            text: `Comment added to work item #${id}.\n\nComment ID: ${result.id}`,
          },
        ],
      };
    },
  );
}
