# Azure DevOps MCP Server

MCP (Model Context Protocol) server that gives Claude Code access to Azure DevOps work items, pull requests and pipeline runs. It ships as a plugin: `.mcp.json` starts the committed single-file bundle `${CLAUDE_PLUGIN_ROOT}/dist/index.js`, so nothing is npm-installed in the consuming project.

Everything project-specific (organization, project, repository, custom fields, process states, branch and PR conventions) lives in the consuming project's `.claude/azure-devops.json`. Without that file's optional keys the server behaves like a plain Azure DevOps client: it never reads or writes a custom field, and parameters that only exist for a configured field are not registered.

## Setup (once per project and developer)

### 1. Project config (committed)

Create `<project>/.claude/azure-devops.json`. Only `organization` and `project` are needed to start:

```json
{
  "organization": "your-org",
  "project": "your-project"
}
```

All keys are described in [Configuration](#configuration).

### 2. Personal Access Token (per developer, never committed)

1. Open `https://dev.azure.com/<your-org>/_usersSettings/tokens` and create a token.
2. Scopes: **Work Items (Read & Write)**; for the pull request tools also **Code (Read & Write)**; for the pipeline tools **Build (Read)** and **Test Management (Read)**.
3. Put it into `<project>/.claude/azure-devops.env` and gitignore that file:

```
AZURE_DEVOPS_PAT=paste-your-token-here
```

### 3. Verify

Restart Claude Code and call `ado_whoami` — it returns the identity the PAT belongs to.

### Where values come from

Each value is taken from the first source that has it:

1. Environment variables `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_REPO`
2. `<project>/.claude/azure-devops.json` (`organization`, `project`, `repository`)
3. A `KEY=VALUE` env file: `<project>/.claude/azure-devops.env`, then the legacy `<project>/.claude/mcp-servers/azure-devops/.env`, then `.env` next to the server

The repository defaults to the project name. `<project>` is `CLAUDE_PROJECT_DIR` (set by Claude Code), falling back to the working directory. Downloads go below it: work item attachments to `.claude/input/<id>/`, pipeline artifacts to `.claude/artifacts/build-<id>/<name>/` — keep both gitignored.

## Configuration

`.claude/azure-devops.json` is validated on start; an invalid file stops the server with a message naming the problem (unknown keys are rejected, so typos do not pass silently). Every key is optional.

| Key | Default | Meaning |
|-----|---------|---------|
| `organization` | — | Azure DevOps organization |
| `project` | — | Project name |
| `repository` | project name | Git repository used by the pull request tools |
| `defaultTargetBranch` | `"main"` | Default target branch of `ado_create_pull_request` |
| `branchTicketPattern` | `"(?:^\|/)(\\d+)(?=[._/-]\|$)"` | Regex that extracts a work item id from a branch name (first capture group, else the whole match). The default takes the first number at the start of the name or of a path segment: `123-login`, `feature/123-login`, `123.fix` |
| `priority` | none | `{ "field", "values"?, "defaultsByType"? }`. When set, `ado_create_work_item` gets a `prio` parameter writing `field` (an enum when `values` is given), and `ado_list_candidate_work_items` ranks by it (leading digit of the value, else its position in `values`). `defaultsByType` is shown in the parameter description as guidance; it is not applied automatically |
| `flags` | none | Map of flag name → boolean field reference (or `{ "field", "description" }`). Each flag becomes a boolean parameter of `ado_update_work_item` and a property of the mapped work item. Names are camelCase and may not collide with core properties |
| `candidates.types` | `Bug`, `User Story`, `Product Backlog Item`, `Requirement`, `Issue` | Work item types `ado_list_candidate_work_items` considers (covers the Agile, Scrum, CMMI and Basic templates) |
| `candidates.typeRank` | position in `types` | Rank per type on equal priority, lower first; unlisted types go last |
| `candidates.notStartedStates` | `New`, `To Do`, `Proposed` | States of work nobody has started |
| `candidates.mergedStates` | `Closed`, `Done`, `Removed` | Predecessor states that free a successor |
| `candidates.excludedTags` | none | Default tags that exclude a work item from the ranking |
| `pullRequest.placeholderTitlePatterns` | none | Regexes for PR titles `ado_update_pull_request` may replace without `force`; `{sourceBranch}` stands for the escaped branch name |
| `pullRequest.placeholderDescriptionPatterns` | none | Regexes for PR descriptions it may replace without `force` |

Without placeholder patterns only an empty title or description is replaced unless `force` is passed.

Example for a team that keeps a custom priority field, two checkboxes and a PR bot that titles PRs with the branch name (all values are examples):

```json
{
  "organization": "contoso",
  "project": "Webshop",
  "repository": "webshop",
  "defaultTargetBranch": "develop",
  "branchTicketPattern": "^(\\d+)\\.",
  "priority": {
    "field": "Custom.Importance",
    "values": ["1 - critical", "2 - high", "3 - medium", "4 - low"],
    "defaultsByType": { "Bug": "2 - high", "User Story": "3 - medium" }
  },
  "flags": {
    "reviewRequired": "Custom.ReviewRequired",
    "hasManualSteps": { "field": "Custom.HasManualSteps", "description": "Deployment needs manual steps" }
  },
  "candidates": {
    "types": ["Bug", "User Story"],
    "notStartedStates": ["New"],
    "excludedTags": ["Blocked"]
  },
  "pullRequest": {
    "placeholderTitlePatterns": ["^{sourceBranch}$"],
    "placeholderDescriptionPatterns": ["^Automatically created for refs/heads/\\S+\\.?$"]
  }
}
```

## Available tools (27)

### Work item read tools

| Tool | Purpose |
|------|---------|
| `ado_get_work_item` | Fetch a work item by ID: title, description, acceptance criteria, state, assignee, tags, relations, artifact links (branches, PRs, commits, attachments), configured flags. HTML is converted to Markdown |
| `ado_get_work_item_with_context` | A work item plus its parent, children, related and duplicate items (one level deep), optionally with comments |
| `ado_search_work_items` | Keyword search with optional type/state filter; compact list |
| `ado_list_candidate_work_items` | Not-yet-started work items assigned to the PAT owner (or below an epic, also unassigned), ranked by priority (if configured), type rank and age; excluded tags and unmerged predecessors are reported separately |
| `ado_whoami` | The identity the PAT belongs to (what WIQL calls `@Me`) |
| `ado_get_work_item_comments` | The discussion of a work item |
| `ado_download_attachments` | Download all attachments of a work item to `.claude/input/<id>/` (or a given directory) |

### Work item write tools

| Tool | Purpose |
|------|---------|
| `ado_create_work_item` | Create a work item (Markdown description converted to HTML); `prio` only with a configured `priority` |
| `ado_update_work_item` | Update title, description, acceptance criteria, state, assignee, and the configured flags |
| `ado_update_work_item_state` | Change only the state |
| `ado_link_work_items` | Add a Related, Parent or Child link |
| `ado_unlink_work_items` | Remove a link; changes nothing unless exactly one relation matches |
| `ado_upload_attachment` | Upload a local file and link it to a work item |
| `ado_add_work_item_comment` | Post a comment — sparingly, only for context that cannot be derived elsewhere |
| `ado_update_work_item_comment` | Edit one of your own comments |
| `ado_delete_work_item_comment` | Delete a comment posted in error (permanent) |

### Pull request tools

| Tool | Purpose |
|------|---------|
| `ado_find_pull_request` | Pull requests whose source is a given branch (empty list when none) |
| `ado_update_pull_request` | Set title and/or description; without `force` only placeholders are replaced (see `pullRequest` config); descriptions are truncated to 4000 characters |
| `ado_create_pull_request` | Create a PR (target defaults to `defaultTargetBranch`), optionally linked to a work item; refuses when an active PR for the branch exists |
| `ado_add_pull_request_reviewer` | Add a reviewer by identity GUID; an existing reviewer and their vote stay untouched |
| `ado_upload_pull_request_attachment` | Upload a local screenshot to `pullRequests/{id}/attachments/{fileName}` and return its URL plus a ready-to-paste Markdown image line. Screenshots only (`.png`, `.jpg`, `.jpeg`); the name defaults to the file's basename and is refused when empty, containing a path separator or `..` |
| `ado_find_pr_file_overlaps` | Active PRs (your own, plus those linked below an epic) that change any of the given files; the work item id per PR comes from `branchTicketPattern` |

### Pipeline tools

| Tool | Purpose |
|------|---------|
| `ado_list_builds` | Pipeline runs, newest first, filtered by pipeline, branch and result |
| `ado_get_build_failures` | Failed timeline steps with error messages and the last log lines |
| `ado_get_test_failures` | Failed published test results with message and stack trace |
| `ado_download_build_artifact` | Download an artifact (or one file of it) to `.claude/artifacts/build-<id>/<name>/`. Only download URLs on `dev.azure.com` / `visualstudio.com` receive the PAT |
| `ado_get_playwright_failures` | Parse a Playwright HTML-report artifact and its traces: failed tests, last actions, error context — with typed values, cookies and auth headers masked |

The PAT scopes decide what is actually possible; skip the write tools if you want read-only use.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Missing config: ...` on start | No organization/project or no PAT found | Check `.claude/azure-devops.json` and `.claude/azure-devops.env` (the start log names the files it tried) |
| `Invalid .../azure-devops.json` | Unknown key, bad regex or field reference | Fix the key named in the message |
| `non-JSON response ... PAT is missing or invalid` | Token missing, expired or wrong scope | Create a new PAT |
| `Azure DevOps API 404` | Wrong organization, project or repository, or the item does not exist | Verify the values in `.claude/azure-devops.json` |
| `prio` or a flag parameter is missing | Not configured | Add `priority` / `flags` to the project config and restart |

## Development

```bash
npm install
npm run build   # tsc --noEmit + esbuild bundle to dist/index.js (commit it)
npm test        # tsc to .test-build/ (gitignored), then node --test
```

All packages are devDependencies because the bundle contains them.

```
src/
  index.ts             # entry: loads the project config, registers tools
  config.ts            # .claude/azure-devops.json schema, defaults, projectDir()
  client.ts            # REST client, env-file lookup, trusted-host check
  mapper.ts / types.ts # API responses -> normalized types (HTML -> Markdown)
  candidates.ts        # candidate ranking (pure)
  pullRequest.ts       # placeholder detection, description limit (pure)
  overlap.ts           # PR/file overlap, ticket id from branch (pure)
  relations.ts         # link removal planning (pure)
  prAttachment.ts      # screenshot name/path rules (pure)
  playwrightReport.ts  # report/trace parsing and redaction (pure)
  files.ts             # download directories, zip-slip guard
  tools/               # read, write, pullRequests, builds
```
