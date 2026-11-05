import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectDir, type AzureDevOpsClient } from "../client.js";
import type { ServerConfig } from "../config.js";
import { findReviewer } from "../candidates.js";
import { findFileOverlaps, prIdFromArtifactUrl, type PullRequestFiles } from "../overlap.js";
import { attachmentName, markdownImage } from "../prAttachment.js";
import { fitDescription, planPullRequestUpdate } from "../pullRequest.js";
import type { AdoPullRequestResponse, PullRequest } from "../types.js";

function stripHeads(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

function mapPullRequest(client: AzureDevOpsClient, raw: AdoPullRequestResponse): PullRequest {
  return {
    id: raw.pullRequestId,
    title: raw.title,
    description: raw.description ?? "",
    status: raw.status,
    sourceBranch: stripHeads(raw.sourceRefName),
    targetBranch: stripHeads(raw.targetRefName),
    isDraft: raw.isDraft ?? false,
    createdBy: raw.createdBy?.displayName ?? "",
    reviewers: (raw.reviewers ?? []).map(({ id, displayName, vote, isRequired }) => ({ id, displayName, vote, isRequired: isRequired ?? false })),
    url: client.pullRequestWebUrl(raw.pullRequestId),
  };
}

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

export function registerPullRequestTools(
  server: McpServer,
  client: AzureDevOpsClient,
  config: ServerConfig,
): void {
  // ── ado_find_pull_request ───────────────────────────────────────────
  server.tool(
    "ado_find_pull_request",
    "Find pull requests whose source is the given branch. Returns an empty list (not an error) when none exists.",
    {
      branch: z.string().min(1).describe("Source branch name without refs/heads/ (e.g. feature/123-login-form)"),
      status: z.enum(["active", "completed", "abandoned", "all"]).default("active").describe("PR status filter"),
    },
    async ({ branch, status }) => {
      const pullRequests = (await client.findPullRequests(branch, status)).map((raw) => mapPullRequest(client, raw));
      if (pullRequests.length === 0) {
        return text(`No ${status} pull request found for branch "${branch}".\n\n[]`);
      }
      return text(JSON.stringify(pullRequests, null, 2));
    },
  );

  // ── ado_update_pull_request ─────────────────────────────────────────
  server.tool(
    "ado_update_pull_request",
    "Set the title and/or description of a pull request. Without force, only placeholder values are replaced: an empty title or description, or one matching the placeholder patterns of the project config (pullRequest.placeholderTitlePatterns / placeholderDescriptionPatterns in .claude/azure-devops.json). Text a person wrote is left alone and reported as kept. Descriptions over 4000 characters are truncated (reported in the result).",
    {
      id: z.number().int().positive().describe("Pull request ID"),
      title: z.string().min(1).optional().describe("New title"),
      description: z.string().min(1).optional().describe("New description (Markdown)"),
      force: z.boolean().default(false).describe("Overwrite even non-placeholder values — only when the user explicitly asked for it"),
    },
    async ({ id, title, description, force }) => {
      const current = await client.getPullRequest(id);
      const plan = planPullRequestUpdate(
        { title: current.title, description: current.description, sourceBranch: stripHeads(current.sourceRefName) },
        { title, description },
        force,
        config.pullRequest,
      );
      const keptNote = plan.kept.length ? `\nKept: ${plan.kept.join(", ")}.` : "";

      if (Object.keys(plan.patch).length === 0) {
        return text(`Pull request #${id} unchanged.${keptNote}\n\n${JSON.stringify(mapPullRequest(client, current), null, 2)}`);
      }

      const updated = await client.updatePullRequest(id, plan.patch);
      const truncatedNote = plan.truncated ? "\nDescription was truncated to the 4000-character limit." : "";
      return text(
        `Pull request #${id} updated: ${Object.keys(plan.patch).join(", ")}.${keptNote}${truncatedNote}\n\n${JSON.stringify(mapPullRequest(client, updated), null, 2)}`,
      );
    },
  );

  // ── ado_create_pull_request ─────────────────────────────────────────
  server.tool(
    "ado_create_pull_request",
    "Create a pull request. Refuses if an active PR for the branch already exists and returns that PR instead. Optionally links a work item.",
    {
      branch: z.string().min(1).describe("Source branch name without refs/heads/"),
      title: z.string().min(1).describe("PR title"),
      description: z.string().default("").describe("PR description (Markdown); truncated to 4000 characters"),
      targetBranch: z.string().min(1).default(config.defaultTargetBranch).describe(`Target branch without refs/heads/ (default: ${config.defaultTargetBranch})`),
      workItemId: z.number().int().positive().optional().describe("Work item to link to the PR"),
    },
    async ({ branch, title, description, targetBranch, workItemId }) => {
      const existing = await client.findPullRequests(branch, "active");
      if (existing.length > 0) {
        return text(
          `An active pull request for branch "${branch}" already exists — nothing created.\n\n${JSON.stringify(existing.map((raw) => mapPullRequest(client, raw)), null, 2)}`,
        );
      }

      const fitted = fitDescription(description);
      const created = await client.createPullRequest({
        sourceRefName: `refs/heads/${branch}`,
        targetRefName: `refs/heads/${targetBranch}`,
        title,
        description: fitted.text,
        workItemRefs: workItemId !== undefined ? [{ id: String(workItemId) }] : [],
      });
      const truncatedNote = fitted.truncated ? "\nDescription was truncated to the 4000-character limit." : "";
      return text(
        `Created pull request #${created.pullRequestId}.${truncatedNote}\n\n${JSON.stringify(mapPullRequest(client, created), null, 2)}`,
      );
    },
  );

  // ── ado_add_pull_request_reviewer ───────────────────────────────────
  server.tool(
    "ado_add_pull_request_reviewer",
    "Add a reviewer to a pull request by identity id (GUID). Leaves an existing reviewer untouched — including their vote — and reports it as unchanged. The id of someone who reviewed before is in the reviewers list of ado_find_pull_request (status 'completed' or 'all').",
    {
      id: z.number().int().positive().describe("Pull request ID"),
      // z.guid, not z.uuid: ADO identity ids are not RFC 4122 (version nibble can be anything).
      reviewerId: z.guid().describe("Identity id (GUID) of the reviewer"),
      required: z.boolean().default(true).describe("Add as required reviewer"),
    },
    async ({ id, reviewerId, required }) => {
      const current = await client.getPullRequest(id);
      const existing = findReviewer(current.reviewers, reviewerId);
      if (existing !== undefined) {
        const isRequired = existing.isRequired ?? false;
        // Never PUT onto an existing reviewer: it would reset their vote. Say so when the
        // caller asked for a required reviewer and got an optional one.
        const optionalNote = required && !isRequired ? " Present but optional — not changed; make them required by hand if needed." : "";
        return text(
          `Pull request #${id} unchanged: ${existing.displayName} is already a reviewer (required: ${isRequired}, vote: ${existing.vote}).${optionalNote}`,
        );
      }

      const added = await client.addPullRequestReviewer(id, reviewerId, required);
      return text(
        `Added ${added.displayName} to pull request #${id} as ${added.isRequired ? "required" : "optional"} reviewer.\n\n${JSON.stringify({ id: added.id, displayName: added.displayName, isRequired: added.isRequired ?? false }, null, 2)}`,
      );
    },
  );

  // ── ado_upload_pull_request_attachment ──────────────────────────────
  server.tool(
    "ado_upload_pull_request_attachment",
    "Upload a local screenshot as an attachment of a pull request and return its URL plus a ready-to-paste Markdown image line for the description. Screenshots only (png/jpg), no video or GIF; the image must show demo/test data only. Azure DevOps refuses a second attachment with the same name on the same PR.",
    {
      pullRequestId: z.number().int().positive().describe("Pull request ID"),
      filePath: z.string().min(1).describe("Absolute or project-relative path to the local image"),
      fileName: z.string().optional().describe("Override the stored attachment name (defaults to the basename of filePath)"),
      altText: z.string().optional().describe("Alt text of the Markdown image line (defaults to the attachment name)"),
    },
    async ({ pullRequestId, filePath, fileName, altText }) => {
      const absPath = isAbsolute(filePath) ? filePath : resolve(projectDir(), filePath);
      const stat = statSync(absPath);
      if (!stat.isFile()) {
        throw new Error(`Not a file: ${absPath}`);
      }
      const name = attachmentName(absPath, fileName);
      const content = readFileSync(absPath);

      const uploaded = await client.uploadPullRequestAttachment(pullRequestId, name, content);
      return text(
        `Attached "${name}" (${stat.size} bytes) to pull request #${pullRequestId}.\n\nAttachment URL: ${uploaded.url}\n\nMarkdown:\n${markdownImage(altText ?? name, uploaded.url)}`,
      );
    },
  );

  // ── ado_find_pr_file_overlaps ───────────────────────────────────────
  server.tool(
    "ado_find_pr_file_overlaps",
    "Which active pull requests change any of the given files. Compared against the PAT owner's own active PRs and, with epicId, every active PR linked to a ticket below that epic (any depth). Paths match ignoring a leading slash, backslashes and case. Useful to defer a work item instead of building on files an unmerged PR rewrites. ticketId of an overlap comes from branchTicketPattern of the project config.",
    {
      paths: z.array(z.string().min(1)).describe("Repo-relative paths the ticket changes or plans to change"),
      epicId: z.number().int().positive().optional().describe("Also check active PRs linked to tickets below this epic"),
      excludeBranch: z.string().min(1).optional().describe("The work item's own branch — its PR is never an overlap"),
    },
    async ({ paths, epicId, excludeBranch }) => {
      const me = await client.getAuthenticatedUser();
      const pullRequests = new Map<number, AdoPullRequestResponse>(
        (await client.listActivePullRequestsByCreator(me.id)).map((raw) => [raw.pullRequestId, raw]),
      );

      if (epicId !== undefined) {
        const descendantIds = await client.getDescendantIds(epicId);
        const linkedPrIds = new Set<number>();
        for (let start = 0; start < descendantIds.length; start += 200) {
          for (const item of await client.getWorkItems(descendantIds.slice(start, start + 200), { omitErrors: true })) {
            for (const relation of item.relations ?? []) {
              const prId = prIdFromArtifactUrl(relation.url);
              if (prId !== null) linkedPrIds.add(prId);
            }
          }
        }
        for (const prId of linkedPrIds) {
          if (pullRequests.has(prId)) continue;
          // A linked PR from another repository (or a deleted one) is not readable here and cannot touch these files.
          const raw = await client.getPullRequest(prId).catch(() => undefined);
          if (raw?.status === "active") pullRequests.set(prId, raw);
        }
      }

      const withFiles: PullRequestFiles[] = [];
      for (const raw of pullRequests.values()) {
        withFiles.push({ id: raw.pullRequestId, title: raw.title, sourceBranch: raw.sourceRefName, files: await client.getPullRequestChangedFiles(raw.pullRequestId) });
      }
      const overlaps = findFileOverlaps(paths, withFiles, excludeBranch, config.branchTicketPattern);

      return text(JSON.stringify({
        checkedPullRequests: withFiles.map((pullRequest) => ({ id: pullRequest.id, sourceBranch: stripHeads(pullRequest.sourceBranch) })),
        overlaps: overlaps.map((overlap) => ({ ...overlap, url: client.pullRequestWebUrl(overlap.pullRequestId) })),
      }, null, 2));
    },
  );
}
