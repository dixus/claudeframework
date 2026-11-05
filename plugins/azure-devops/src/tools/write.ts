import { readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureDevOpsClient } from "../client.js";
import { projectDir } from "../client.js";
import { mapWorkItem, markdownToHtml } from "../mapper.js";

export function registerWriteTools(
  server: McpServer,
  client: AzureDevOpsClient,
): void {
  // ── ado_create_work_item ────────────────────────────────────────────
  server.tool(
    "ado_create_work_item",
    "Create a new Azure DevOps work item. Returns the created item with its ID.",
    {
      type: z.string().min(1).describe("Work item type (e.g. Bug, Task, User Story, Feature)"),
      title: z.string().min(1).describe("Title of the work item"),
      description: z.string().optional().describe("Description (Markdown — converted to HTML automatically; raw HTML passes through if input starts with '<')"),
      assignedTo: z.string().optional().describe("Display name or email of the assignee"),
      tags: z.string().optional().describe("Semicolon-separated tags (e.g. 'Bug;Frontend')"),
      areaPath: z.string().optional().describe("Area path (defaults to project root)"),
      iterationPath: z.string().optional().describe("Iteration path (defaults to project root)"),
    },
    async ({ type, title, description, assignedTo, tags, areaPath, iterationPath }) => {
      const ops: Array<{ op: string; path: string; value: unknown }> = [
        { op: "add", path: "/fields/System.Title", value: title },
      ];
      if (description !== undefined) ops.push({ op: "add", path: "/fields/System.Description", value: markdownToHtml(description) });
      if (assignedTo !== undefined) ops.push({ op: "add", path: "/fields/System.AssignedTo", value: assignedTo });
      if (tags !== undefined) ops.push({ op: "add", path: "/fields/System.Tags", value: tags });
      if (areaPath !== undefined) ops.push({ op: "add", path: "/fields/System.AreaPath", value: areaPath });
      if (iterationPath !== undefined) ops.push({ op: "add", path: "/fields/System.IterationPath", value: iterationPath });

      const raw = await client.createWorkItem(type, ops);
      const workItem = mapWorkItem(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: `Created work item #${workItem.id} (${workItem.type}): "${workItem.title}".\n\n${JSON.stringify(workItem, null, 2)}`,
          },
        ],
      };
    },
  );

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

  // ── ado_update_work_item ────────────────────────────────────────────
  server.tool(
    "ado_update_work_item",
    "Update fields of an Azure DevOps work item. All fields are optional — only provided fields are changed. Supports title, description (Markdown), acceptance criteria (Markdown), state, and assignedTo.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      title: z.string().min(1).optional().describe("New title"),
      description: z.string().optional().describe("New description (Markdown — converted to HTML automatically; raw HTML passes through if input starts with '<')"),
      acceptanceCriteria: z.string().optional().describe("New acceptance criteria (Markdown — converted to HTML automatically; raw HTML passes through if input starts with '<')"),
      state: z.string().min(1).optional().describe("New state (e.g. Active, Resolved, Closed)"),
      assignedTo: z.string().optional().describe("Display name or email of the assignee"),
    },
    async ({ id, title, description, acceptanceCriteria, state, assignedTo }) => {
      const ops: Array<{ op: string; path: string; value: unknown }> = [];
      if (title !== undefined) ops.push({ op: "replace", path: "/fields/System.Title", value: title });
      if (description !== undefined) ops.push({ op: "replace", path: "/fields/System.Description", value: markdownToHtml(description) });
      if (acceptanceCriteria !== undefined) ops.push({ op: "replace", path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria", value: markdownToHtml(acceptanceCriteria) });
      if (state !== undefined) ops.push({ op: "replace", path: "/fields/System.State", value: state });
      if (assignedTo !== undefined) ops.push({ op: "replace", path: "/fields/System.AssignedTo", value: assignedTo });

      if (ops.length === 0) {
        return { content: [{ type: "text" as const, text: "No fields provided — nothing to update." }] };
      }

      const raw = await client.updateWorkItem(id, ops);
      const workItem = mapWorkItem(raw);
      const updatedFields = ops.map((o) => o.path.split("/").pop()).join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `Work item #${workItem.id} updated (${updatedFields}).\n\n${JSON.stringify(workItem, null, 2)}`,
          },
        ],
      };
    },
  );

  // ── ado_link_work_items ────────────────────────────────────────────
  server.tool(
    "ado_link_work_items",
    "Add a link/relation between two Azure DevOps work items (e.g. Related, Parent, Child).",
    {
      sourceId: z.number().int().positive().describe("Work item to add the link TO"),
      targetId: z.number().int().positive().describe("Work item being linked"),
      linkType: z.enum(["Related", "Parent", "Child"]).describe("Relation type: Related, Parent (target becomes parent of source), or Child (target becomes child of source)"),
      comment: z.string().optional().describe("Optional comment on the link"),
    },
    async ({ sourceId, targetId, linkType, comment }) => {
      const linkTypeMap: Record<string, string> = {
        Related: "System.LinkTypes.Related",
        Parent: "System.LinkTypes.Hierarchy-Reverse",
        Child: "System.LinkTypes.Hierarchy-Forward",
      };

      const raw = await client.updateWorkItem(sourceId, [
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: linkTypeMap[linkType],
            url: client.workItemUrl(targetId),
            attributes: { comment: comment ?? "" },
          },
        },
      ]);
      const workItem = mapWorkItem(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: `Linked #${sourceId} → #${targetId} (${linkType}).\n\n${JSON.stringify(workItem, null, 2)}`,
          },
        ],
      };
    },
  );

  // ── ado_upload_attachment ───────────────────────────────────────────
  server.tool(
    "ado_upload_attachment",
    "Upload a local file as an attachment to an Azure DevOps work item. Reads the file from disk (MCP runs locally), uploads its bytes to the attachments endpoint, and links the resulting attachment to the work item. Prefer this over posting large content as a comment.",
    {
      workItemId: z.number().int().positive().describe("Work item ID to attach the file to"),
      filePath: z.string().min(1).describe("Absolute or workspace-relative path to the local file"),
      fileName: z.string().optional().describe("Override the attachment file name (defaults to basename of filePath)"),
      comment: z.string().optional().describe("Optional comment shown next to the attachment in the Azure DevOps UI"),
    },
    async ({ workItemId, filePath, fileName, comment }) => {
      const absPath = isAbsolute(filePath) ? filePath : resolve(projectDir(), filePath);
      const stat = statSync(absPath);
      if (!stat.isFile()) {
        throw new Error(`Not a file: ${absPath}`);
      }
      const content = readFileSync(absPath);
      const name = fileName ?? basename(absPath);

      const uploaded = await client.uploadAttachment(name, content);

      const raw = await client.updateWorkItem(workItemId, [
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: "AttachedFile",
            url: uploaded.url,
            attributes: { comment: comment ?? "" },
          },
        },
      ]);
      const workItem = mapWorkItem(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: `Attached "${name}" (${stat.size} bytes) to work item #${workItemId}.\n\nAttachment ID: ${uploaded.id}\nAttachment URL: ${uploaded.url}\n\n${JSON.stringify(workItem.artifacts.attachments, null, 2)}`,
          },
        ],
      };
    },
  );

  // ── ado_add_work_item_comment ───────────────────────────────────────
  server.tool(
    "ado_add_work_item_comment",
    "Add a comment to an Azure DevOps work item. Use sparingly — branches, commits, and PRs are already auto-linked via the '#<ticketId>' suffix in commit messages. Only post comments for non-derivable context a QA/UAT reviewer needs (how to run new tests, scope deviation, manual follow-up steps, known caveats, open clarifying questions).",
    {
      id: z.number().int().positive().describe("Work item ID"),
      comment: z.string().min(1).max(4000).describe("Comment text (Markdown — converted to HTML automatically; raw HTML passes through if input starts with '<')"),
    },
    async ({ id, comment }) => {
      const result = await client.addComment(id, markdownToHtml(comment));
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

  // ── ado_update_work_item_comment ────────────────────────────────────
  server.tool(
    "ado_update_work_item_comment",
    "Update an existing comment on an Azure DevOps work item. Use to fix mistakes in your own comments (typos, wrong facts, corrections) instead of posting a second comment that says 'replaces previous'. Only edit your own comments — editing someone else's comments is unusual and usually wrong; their original wording may be referenced by others.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      commentId: z.number().int().positive().describe("Comment ID (returned by ado_add_work_item_comment or ado_get_work_item_comments)"),
      comment: z.string().min(1).max(4000).describe("New comment text (Markdown — converted to HTML automatically; raw HTML passes through if input starts with '<'). Fully replaces the previous text."),
    },
    async ({ id, commentId, comment }) => {
      const result = await client.updateComment(id, commentId, markdownToHtml(comment));
      return {
        content: [
          {
            type: "text" as const,
            text: `Comment #${result.id} on work item #${id} updated.`,
          },
        ],
      };
    },
  );

  // ── ado_delete_work_item_comment ────────────────────────────────────
  server.tool(
    "ado_delete_work_item_comment",
    "Delete a comment from an Azure DevOps work item. Use to remove a comment that was posted in error (wrong ticket, duplicate, accidental). Deletion is permanent — there is no undo. Only delete your own comments unless explicitly authorized; other people's comments may be referenced by ongoing discussion.",
    {
      id: z.number().int().positive().describe("Work item ID"),
      commentId: z.number().int().positive().describe("Comment ID (returned by ado_add_work_item_comment or ado_get_work_item_comments)"),
    },
    async ({ id, commentId }) => {
      await client.deleteComment(id, commentId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Comment #${commentId} on work item #${id} deleted.`,
          },
        ],
      };
    },
  );
}
