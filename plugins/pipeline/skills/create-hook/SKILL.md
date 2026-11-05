---
name: create-hook
description: Scaffold a Claude Code hook (command or HTTP) for this project. Use when you want to automate quality checks, formatting, or notifications on tool events.
disable-model-invocation: true
argument-hint: "[hook description]"
effort: medium
---

Analyse the project, suggest useful hooks, then create and validate the one the user selects.

$ARGUMENTS is optional — pass a description of what you want the hook to do (e.g. "type-check after every edit") to skip the suggestion step.

## Step 1 — Detect tooling and suggest hooks

Scan the project root for these indicators and propose relevant hooks:

| Detected                            | Suggested hook                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`                     | **PostToolUse** — type-check `.ts`/`.tsx` files after each edit; surface errors as `additionalContext` so Claude auto-fixes |
| `.prettierrc` / `prettier.config.*` | **PostToolUse** — auto-format the edited file after each Write/Edit                                                         |
| `.eslintrc.*` / `eslint.config.*`   | **PostToolUse** — lint + auto-fix the edited file after each Write/Edit                                                     |
| `package.json` with `test` script   | **PreToolUse (Bash)** — run tests before any `git commit` command                                                           |
| `.git/` directory                   | **PreToolUse (Bash)** — scan staged files for secrets/API keys before commit                                                |
| Any project                         | **PostToolUse** — block writes to protected directories (migrations/, generated/)                                           |

If $ARGUMENTS was provided, skip suggestions and go directly to Step 2 using the described purpose.

Otherwise: list the suggested hooks and ask the user which one to create. If they describe a custom purpose, proceed with that.

## Step 2 — Configure the hook

Ask only what you don't already know from the user's description:

1. **Event type** — when should it fire?

   **Tool execution:**
   - `PreToolUse`: before a tool call — can block (exit 2), modify input (`updatedInput`), or inject context. Best for gates, security checks, and permission decisions.
   - `PostToolUse`: after a tool call succeeds — provides feedback/fixes via `additionalContext`. Best for quality enforcement (linting, formatting, type-checking).
   - `PostToolUseFailure`: after a tool call fails — react to errors.
   - `PermissionRequest`: when a permission prompt appears — can auto-decide via `permissionDecision: allow|deny|ask` or add rules via `updatedPermissions`.

   **User interaction:**
   - `UserPromptSubmit`: before Claude processes a message. Best for context injection.
   - `Notification`: on permission prompts, idle prompts, or auth events (matcher: `permission_prompt`, `idle_prompt`, `auth_success`).

   **Session lifecycle:**
   - `SessionStart`: on startup, resume, clear, or compact (use matcher to filter).
   - `SessionEnd`: on clear, resume, logout, or exit.
   - `InstructionsLoaded`: when CLAUDE.md and rules are loaded (matcher: `session_start`, `nested_traversal`, `path_glob_match`).
   - `Stop`: when Claude stops generating a response.
   - `StopFailure`: on rate limit, auth failure, or billing error.

   **Context management:**
   - `PreCompact`: before context compaction (matcher: `manual` or `auto`).
   - `PostCompact`: after context compaction.

   **Agent operations:**
   - `SubagentStart`: when a subagent launches (matcher: agent type name).
   - `SubagentStop`: when a subagent finishes.
   - `TeammateIdle`: when an agent team member is idle.
   - `TaskCreated`: when a task is being created (exit 2 to prevent creation and send feedback).
   - `TaskCompleted`: when a background task finishes.

   **File system:**
   - `CwdChanged`: when the working directory changes.
   - `FileChanged`: when a file is modified on disk.

   **Version control:**
   - `WorktreeCreate`: when a git worktree is created for isolated work.
   - `WorktreeRemove`: when a git worktree is cleaned up.

   **MCP integration:**
   - `Elicitation`: when an MCP server requests user input (matcher: server name).
   - `ElicitationResult`: after user responds to an MCP elicitation.

   **Configuration:**
   - `ConfigChange`: when settings change (matcher: `user_settings`, `project_settings`, `policy_settings`).

   **Setup:**
   - `Setup`: triggered via `--init`, `--init-only`, or `--maintenance` CLI flags.

2. **Hook type** — how should it run?
   - `command`: run a local script (default). Best for most hooks. JSON on stdin, JSON on stdout, exit codes (0=success, 2=block).
   - `http`: POST JSON to a URL. Best for external integrations (Slack, logging, CI triggers). Supports `headers` with env var interpolation via `allowedEnvVars`. Response body treated same as command stdout.
   - `prompt`: single-turn LLM evaluation — no script needed. Specify the prompt text and optionally a `model`. Best for smart gates that need reasoning (e.g. "does this edit break the API contract?").
   - `agent`: spawn a subagent for verification. Best for complex checks that need multi-step investigation.

3. **Tool matcher** — which tool(s) should trigger it? (e.g. `Write`, `Edit`, `Bash`, `*` for all)

4. **Scope** — where should the hook live?
   - `project`: `.claude/hooks/` — committed to git, shared with team
   - `global`: `~/.claude/hooks/` — applies to all your projects
   - `project-local`: registered in `.claude/settings.local.json` — your personal preference, gitignored

5. **Claude integration** — should Claude see the hook's output and act on it?
   - Yes → use `additionalContext` in the response body for errors; Claude will try to fix them
   - No → use `suppressOutput: true` for silent operation

6. **File scope** — what file extensions should trigger it? (e.g. `.ts,.tsx`, `*` for all)

## Step 3 — Create the hook script

**If the user chose an HTTP, prompt, or agent hook**: skip this step — no script file is needed. Go directly to Step 4.

Create the hook script at the appropriate location:

- Project scope: `.claude/hooks/<hook-name>.js` (or `.sh` for simple bash hooks)
- Global scope: `~/.claude/hooks/<hook-name>.js`
- Create the directory if it does not exist

**Critical implementation rules:**

- **Input**: always read JSON from `stdin` — never `argv`. Pattern: `const input = JSON.parse(await readStdin())`
- **Success response**: `{ continue: true, suppressOutput: true }` — keeps context clean
- **Error response**: `{ continue: true, additionalContext: "error details here" }` — triggers Claude auto-fix
- **Block operation** (PreToolUse only): exit with code `2` — halts the tool call
- **Focus on changed files**: extract the file path from the stdin JSON and only process that file — don't scan the whole codebase
- **Use `$CLAUDE_PROJECT_DIR`** for absolute paths — never relative paths
- **Hooks run in parallel** — design each hook to be independent (no shared state, no order assumptions)
- Include a shebang and make the file executable: `chmod +x <script>`

Add a comment block at the top of the script explaining what it does, what event it handles, and what tool it matches.

## Step 4 — Register the hook

Update the appropriate `settings.json`:

- Project scope: `.claude/settings.json`
- Global scope: `~/.claude/settings.json`
- Project-local: `.claude/settings.local.json`

Add an entry under the correct event key.

**Command hook** (runs a local script):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/<hook-name>.js"
          }
        ]
      }
    ]
  }
}
```

**HTTP hook** (POSTs JSON to a URL):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "http",
            "url": "https://example.com/hooks/on-edit"
          }
        ]
      }
    ]
  }
}
```

**Prompt hook** (LLM evaluation — no script):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Review the proposed edit. If it breaks the public API contract, respond with decision: block. Otherwise respond with decision: approve.",
            "model": "haiku"
          }
        ]
      }
    ]
  }
}
```

**Agent hook** (subagent verification):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verify the edit didn't break any tests by running the test suite."
          }
        ]
      }
    ]
  }
}
```

**Additional hook options:**

- `async: true` — run hook in background (non-blocking)
- `once: true` — run only once per session (for skill/agent-scoped hooks)
- `statusMessage: "Checking..."` — custom spinner text while hook runs

Read the existing settings file first (if it exists) and merge — do not overwrite existing hooks.

## Step 5 — Test the hook

**Happy path** — create conditions where the hook should pass silently:

- For a type-check hook: create a valid `.ts` file and trigger a write
- For a format hook: write a properly formatted file
- For a security hook: attempt a safe command
- Verify: hook exits cleanly, no output in Claude's context

**Sad path** — create conditions where the hook should fire:

- For a type-check hook: introduce a type error and trigger a write
- For a format hook: write an unformatted file
- For a security hook: attempt a command containing a fake API key pattern
- Verify: hook fires correctly (blocks, or surfaces `additionalContext`)

Report both test results. If the hook fails to behave as expected, diagnose and fix before finishing.

## Step 6 — Report

- Hook script location
- Settings file updated
- Happy path test result
- Sad path test result
- Usage note: what Claude will now do automatically, and how to disable it if needed
