import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Per-project configuration from the committed `<project>/.claude/azure-devops.json`.
 * Every key is optional. Without a key the server uses a neutral default: no
 * custom field is ever read or written, and parameters that only exist for a
 * configured field (priority, flags) are not registered at all.
 */

/** A field reference as it appears in a JSON Patch path (`/fields/<ref>`). */
const fieldRef = z.string().regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/, "expected a field reference like 'Microsoft.VSTS.Common.Priority'");

const regexSource = z.string().refine((source) => {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}, "not a valid regular expression");

/** Names a flag may not take: they would overwrite a core property of the mapped work item. */
const RESERVED_FLAG_NAMES = new Set([
  "id", "title", "type", "state", "description", "acceptanceCriteria", "assignedTo", "tags",
  "areaPath", "iterationPath", "url", "resolvedReason", "resolvedBy", "relations", "artifacts",
  "prio", "priority",
]);

const flagSchema = z.union([
  fieldRef.transform((field) => ({ field, description: undefined as string | undefined })),
  z.object({ field: fieldRef, description: z.string().min(1).optional() }).strict(),
]);

const fileSchema = z
  .object({
    $schema: z.string().optional(),
    organization: z.string().min(1).optional(),
    project: z.string().min(1).optional(),
    repository: z.string().min(1).optional(),
    defaultTargetBranch: z.string().min(1).optional(),
    branchTicketPattern: regexSource.optional(),
    priority: z
      .object({
        field: fieldRef,
        values: z.array(z.string().min(1)).min(1).optional(),
        defaultsByType: z.record(z.string(), z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    flags: z
      .record(z.string().regex(/^[a-z][A-Za-z0-9]*$/, "flag names are camelCase identifiers"), flagSchema)
      .refine((flags) => Object.keys(flags).every((name) => !RESERVED_FLAG_NAMES.has(name)), "a flag name collides with a core work item property")
      .optional(),
    candidates: z
      .object({
        types: z.array(z.string().min(1)).min(1).optional(),
        typeRank: z.record(z.string(), z.number().int()).optional(),
        notStartedStates: z.array(z.string().min(1)).min(1).optional(),
        mergedStates: z.array(z.string().min(1)).min(1).optional(),
        excludedTags: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    pullRequest: z
      .object({
        placeholderTitlePatterns: z.array(regexSource).optional(),
        placeholderDescriptionPatterns: z.array(regexSource).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export interface PriorityConfig {
  /** Field holding the priority, e.g. "Microsoft.VSTS.Common.Priority". */
  field: string;
  /** Allowed values; when set the parameter is an enum. */
  values?: string[];
  /** Suggested value per work item type, shown in the parameter description (not applied automatically). */
  defaultsByType?: Record<string, string>;
}

export interface FlagConfig {
  /** Boolean field the flag reads and writes. */
  field: string;
  description?: string;
}

export interface CandidateConfig {
  types: string[];
  /** Rank per type on equal priority, lower first; types not listed go last. */
  typeRank: Record<string, number>;
  notStartedStates: string[];
  mergedStates: string[];
  excludedTags: string[];
}

export interface PullRequestConfig {
  /** Regexes for titles that may be replaced without force; `{sourceBranch}` stands for the escaped branch name. */
  placeholderTitlePatterns: string[];
  /** Regexes for descriptions that may be replaced without force. */
  placeholderDescriptionPatterns: string[];
}

export interface ServerConfig {
  organization?: string;
  project?: string;
  repository?: string;
  defaultTargetBranch: string;
  branchTicketPattern: string;
  priority?: PriorityConfig;
  flags: Record<string, FlagConfig>;
  candidates: CandidateConfig;
  pullRequest: PullRequestConfig;
}

/**
 * Generic candidate defaults covering the standard process templates
 * (Agile, Scrum, CMMI, Basic): bugs first, then the backlog item types.
 */
export const DEFAULT_CANDIDATE_TYPES = ["Bug", "User Story", "Product Backlog Item", "Requirement", "Issue"];
export const DEFAULT_NOT_STARTED_STATES = ["New", "To Do", "Proposed"];
export const DEFAULT_MERGED_STATES = ["Closed", "Done", "Removed"];
/** Ticket id: the first number at the start of the branch name or of a path segment ("123-foo", "feature/123-foo"). */
export const DEFAULT_BRANCH_TICKET_PATTERN = "(?:^|/)(\\d+)(?=[._/-]|$)";
export const DEFAULT_TARGET_BRANCH = "main";

export function parseServerConfig(json: unknown): ServerConfig {
  const file = fileSchema.parse(json ?? {});
  const types = file.candidates?.types ?? DEFAULT_CANDIDATE_TYPES;
  const flags: Record<string, FlagConfig> = {};
  for (const [name, flag] of Object.entries(file.flags ?? {})) {
    flags[name] = flag.description === undefined ? { field: flag.field } : { field: flag.field, description: flag.description };
  }
  return {
    organization: file.organization,
    project: file.project,
    repository: file.repository,
    defaultTargetBranch: file.defaultTargetBranch ?? DEFAULT_TARGET_BRANCH,
    branchTicketPattern: file.branchTicketPattern ?? DEFAULT_BRANCH_TICKET_PATTERN,
    priority: file.priority,
    flags,
    candidates: {
      types,
      typeRank: file.candidates?.typeRank ?? Object.fromEntries(types.map((type, index) => [type, index])),
      notStartedStates: file.candidates?.notStartedStates ?? DEFAULT_NOT_STARTED_STATES,
      mergedStates: file.candidates?.mergedStates ?? DEFAULT_MERGED_STATES,
      excludedTags: file.candidates?.excludedTags ?? [],
    },
    pullRequest: {
      placeholderTitlePatterns: file.pullRequest?.placeholderTitlePatterns ?? [],
      placeholderDescriptionPatterns: file.pullRequest?.placeholderDescriptionPatterns ?? [],
    },
  };
}

/** The configuration with every key absent. */
export const DEFAULT_CONFIG: ServerConfig = parseServerConfig({});

/**
 * Read the project config. A missing file yields the defaults; a file that
 * exists but is invalid fails loudly instead of silently dropping settings.
 */
export function loadProjectConfig(path: string): ServerConfig {
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return DEFAULT_CONFIG;
  }
  try {
    return parseServerConfig(JSON.parse(text));
  } catch (error) {
    const detail = error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`Invalid ${path}: ${detail}`);
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

/** `<project>/.claude/azure-devops.json` — committed, holds everything but the PAT. */
export function projectConfigPath(root: string = projectDir()): string {
  return resolve(root, ".claude", "azure-devops.json");
}
