---
name: create-hook
description: Scaffold a Claude Code hook for this project based on detected tooling
disable-model-invocation: true
---
Analyse the project, suggest useful hooks, then create and validate the one the user selects.

$ARGUMENTS is optional — pass a description of what you want the hook to do (e.g. "type-check after every edit") to skip the suggestion step.

## Step 1 — Detect tooling and suggest hooks

Scan the project root for these indicators and propose relevant hooks:

| Detected | Suggested hook |
|---|---|
| `tsconfig.json` | **PostToolUse** — type-check `.ts`/`.tsx` files after each edit; surface errors as `additionalContext` so Claude auto-fixes |
| `.prettierrc` / `prettier.config.*` | **PostToolUse** — auto-format the edited file after each Write/Edit |
| `.eslintrc.*` / `eslint.config.*` | **PostToolUse** — lint + auto-fix the edited file after each Write/Edit |
| `package.json` with `test` script | **PreToolUse (Bash)** — run tests before any `git commit` command |
| `.git/` directory | **PreToolUse (Bash)** — scan staged files for secrets/API keys before commit |
| Any project | **PostToolUse** — block writes to protected directories (migrations/, generated/) |

If $ARGUMENTS was provided, skip suggestions and go directly to Step 2 using the described purpose.

Otherwise: list the suggested hooks and ask the user which one to create. If they describe a custom purpose, proceed with that.

## Step 2 — Configure the hook

Ask only what you don't already know from the user's description:

1. **Event type** — when should it fire?
   - `PreToolUse`: before a tool call — can block execution (exit 2). Best for gates and security checks.
   - `PostToolUse`: after a tool call — provides feedback/fixes. Best for quality enforcement.
   - `UserPromptSubmit`: before Claude processes a message. Best for context injection.

2. **Tool matcher** — which tool(s) should trigger it? (e.g. `Write`, `Edit`, `Bash`, `*` for all)

3. **Scope** — where should the hook live?
   - `project`: `.claude/hooks/` — committed to git, shared with team
   - `global`: `~/.claude/hooks/` — applies to all your projects
   - `project-local`: registered in `.claude/settings.local.json` — your personal preference, gitignored

4. **Claude integration** — should Claude see the hook's output and act on it?
   - Yes → use `additionalContext` in the response body for errors; Claude will try to fix them
   - No → use `suppressOutput: true` for silent operation

5. **File scope** — what file extensions should trigger it? (e.g. `.ts,.tsx`, `*` for all)

## Step 3 — Create the hook script

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

Add an entry under the correct event key:
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
