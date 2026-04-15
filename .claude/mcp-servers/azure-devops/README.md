# Azure DevOps MCP Server

MCP (Model Context Protocol) server that gives Claude Code read + write access to Azure DevOps work items. The framework's `/ship` pipeline uses it to auto-load tickets, post development updates, and close work items after push.

## Available tools (5)

| Tool | Purpose |
|------|---------|
| `ado_get_work_item` | Fetch a work item by ID — returns title, description, acceptance criteria, state, relations, artifact links. HTML converted to Markdown. |
| `ado_search_work_items` | Search by keyword, optional type/state filter. Returns compact list. |
| `ado_get_work_item_comments` | Fetch the discussion/comments of a work item. |
| `ado_update_work_item_state` | Change state (e.g. `Active` → `Closed`). |
| `ado_add_work_item_comment` | Post a comment (branch names, PR links, dev notes). |

Read-only if you prefer: skip `ado_update_work_item_state` and `ado_add_work_item_comment` by not calling them. The PAT scope you generate controls what's actually possible.

## Setup (one-time per developer)

### 1. Create a Personal Access Token (PAT)

1. Open `https://dev.azure.com/<your-org>/_usersSettings/tokens`
2. **New Token** — name it e.g. `Claude Code`
3. Expiration: whatever you prefer (max 1 year)
4. Scopes: **Work Items → Read & Write** (or Read only if you want the read tools only)
5. Create and **copy the token immediately**

### 2. Configure org and project

Edit `.mcp.json` in your repo root:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": [".claude/mcp-servers/azure-devops/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-org",
        "AZURE_DEVOPS_PROJECT": "your-project"
      }
    }
  }
}
```

Replace `your-org` and `your-project` with your values.

### 3. Add your PAT

Create `.claude/mcp-servers/azure-devops/.env`:

```
AZURE_DEVOPS_PAT=paste-your-token-here
```

This file is gitignored — each developer keeps their own PAT locally.

### 4. Build and restart

```bash
cd .claude/mcp-servers/azure-devops
npm install
npm run build
```

Then reload VS Code (`Ctrl+Shift+P` → *Developer: Reload Window*). The MCP server starts automatically.

### 5. Verify

In Claude Code:

```
ado_get_work_item(<any existing work item ID>)
```

If it returns JSON with title/state/description, you're good. If you see `PAT is missing or invalid`, double-check the `.env` file.

## How the framework uses it

When the MCP tools are registered, `/ship` and `/commit` use them automatically:

| Pipeline step | Behavior without MCP | Behavior with MCP |
|---|---|---|
| `/ship <ticketId>` | User provides feature description manually | Auto-loads title + description + acceptance criteria + comments from Azure DevOps |
| After commit | Nothing | Posts branch name + commit hashes as a comment on the work item |
| After push | Nothing | Sets work item state to `Closed` |
| `/commit` on ticket branch | Standard conventional commit | Appends ` #<ticketId>` if branch name matches the project's convention (see `.claude/rules/branch-management.md`) |

If the MCP tools are **not** available, every step falls back gracefully — the framework works without DevOps.

## Architecture

```
.claude/mcp-servers/azure-devops/
  .env              # Your PAT (gitignored)
  package.json
  tsconfig.json
  src/
    index.ts        # MCP server entry (stdio transport)
    client.ts       # Azure DevOps REST API client + .env loader
    mapper.ts       # Raw API response → normalized types (HTML → Markdown)
    types.ts
    tools/
      read.ts       # ado_get_work_item, ado_search_work_items, ado_get_work_item_comments
      write.ts      # ado_update_work_item_state, ado_add_work_item_comment
  dist/             # Compiled JS (what actually runs — gitignored, built locally)
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PAT is missing or invalid` | `.env` file not found or token expired | Check `.claude/mcp-servers/azure-devops/.env` exists with a valid token |
| Tool not found / not listed | MCP server didn't start | Reload VS Code window; check `.mcp.json` exists at repo root and points to `dist/index.js` |
| `Azure DevOps API 401` | Token expired or wrong scope | Generate a new PAT with **Work Items Read & Write** scope |
| `Azure DevOps API 404` | Wrong org/project in `.mcp.json` or work item ID doesn't exist | Verify `AZURE_DEVOPS_ORG` / `AZURE_DEVOPS_PROJECT` and that the work item ID exists in that project |
| Server starts but all calls fail | `.mcp.json` does NOT support `${VAR}` interpolation — env values must be literals | Hardcode `AZURE_DEVOPS_ORG` and `AZURE_DEVOPS_PROJECT` in `.mcp.json`; keep only the PAT in `.env` |

## Development

After code changes:

```bash
cd .claude/mcp-servers/azure-devops
npm run build
```

Then reload the VS Code window.
