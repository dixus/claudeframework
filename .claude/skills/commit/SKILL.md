---
name: commit
description: Create well-structured atomic commits with conventional commit messages
disable-model-invocation: true
---
Create one or more commits from the current working tree changes.

$ARGUMENTS is optional. Pass `--all` to skip the diff analysis and commit everything as a single commit.

## Steps

1. Run `git status` to see staged and unstaged changes
2. Run `git diff HEAD` (staged + unstaged) to understand the full scope of changes
3. Analyse the diff for distinct logical concerns — ask: would a reviewer understand this as one coherent change, or are there multiple independent things happening?

**If multiple distinct concerns are detected** (and `--all` was not passed):
- List the concerns found (e.g. "engine logic change", "new test file", "updated README")
- Propose a split: one atomic commit per concern
- For each proposed commit: describe what it covers and suggest the message
- Ask the user to confirm the split or adjust it
- After confirmation, guide through staging and committing each group in sequence

**If a single concern** (or `--all` was passed):
- Proceed to pre-commit checks (step 4)

4. **Backlog check**: if the commit message references a task/PRD identifier (e.g. `PRD-17`, `TASK-5`), search for a backlog or tracker file in `.claude/input/` that contains that identifier as a heading. If found and the heading does not already have a ✅ marker, add ✅ to the heading and include the file in the commit. Skip this step if no backlog file exists.

5. Run pre-commit checks in this order — read the commands from CLAUDE.md (skip any not listed):
   a. Typecheck (e.g. `tsc --noEmit`)
   b. Lint (e.g. `npm run lint`)
   - Do NOT run tests or build here — those are for `/4_test`, not commit gates
   - If a check fails: report the failure and ask the user whether to fix it first or proceed anyway

6. Stage the appropriate files:
   - If specific files were agreed for this commit, stage only those: `git add <files>`
   - If committing everything: `git add -A`

7. Compose the commit message using conventional commit format:

   ```
   <emoji> <type>(<scope>): <short description>
   ```

   - Keep the first line under 72 characters
   - Present tense, imperative mood ("add feature" not "added feature")
   - `<scope>` is optional — use the primary directory or module affected (e.g. `scoring`, `ui`, `store`)

   **Type → emoji mapping:**
   | Type | Emoji | Use when |
   |---|---|---|
   | `feat` | ✨ | New feature or capability |
   | `fix` | 🐛 | Bug fix |
   | `docs` | 📝 | Documentation only |
   | `refactor` | ♻️ | Code restructured, no behaviour change |
   | `test` | ✅ | Tests added or updated |
   | `chore` | 🔧 | Build, config, tooling, dependencies |
   | `perf` | ⚡️ | Performance improvement |
   | `style` | 🎨 | Formatting, whitespace, no logic change |
   | `ci` | 🚀 | CI/CD pipeline changes |
   | `revert` | ⏪️ | Reverts a previous commit |

8. Create the commit:
   ```
   git commit -m "<message>"
   ```

9. If multiple commits were planned, repeat steps 6–8 for each remaining group

10. Report:
   - Each commit created (hash + message)
   - Any pre-commit check failures that were skipped
   - Reminder: push only when explicitly asked
