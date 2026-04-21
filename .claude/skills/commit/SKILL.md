---
name: commit
description: Create well-structured atomic commits with conventional commit messages. Use when ready to commit working changes.
disable-model-invocation: true
argument-hint: "[--all]"
effort: medium
metadata:
  note: "When invoked by /ship, runs with sonnet model for cost efficiency"
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

- Proceed to the next step

4. **Read project commit conventions:** Check if `.claude/rules/branch-management.md` exists. If it does, read it to understand project-specific branch naming and commit message conventions. Then:
   - Run `git branch --show-current` to get the current branch name
   - Attempt to parse the branch name according to the documented convention to extract a ticket/issue identifier (e.g. regex `^(\d+)\.(Bug|Improvement|Feature)\.([^.]+)\.(.+)$` extracts ticket ID from segment 1)
   - If the full pattern does not match, try a fallback pattern `^(\d+)\.(.+)$` to extract at least the ticket number
   - If a ticket ID is found, note it for use in the commit message (step 8)
   - If no ticket ID can be parsed **and** the project rules require one, ask the user for the ticket ID before proceeding
   - If no `branch-management.md` exists, skip this step

5. **Backlog check**: if the commit message references a task/PRD identifier (e.g. `PRD-17`, `TASK-5`), search for a backlog or tracker file in `.claude/input/` that contains that identifier as a heading. If found and the heading does not already have a ✅ marker, add ✅ to the heading and include the file in the commit. Skip this step if no backlog file exists.

6. Run pre-commit checks in this order — read the commands from CLAUDE.md (skip any not listed):
   a. Typecheck (e.g. `tsc --noEmit`)
   b. Lint (e.g. `npm run lint`)
   - Do NOT run tests or build here — those are for `/4_test`, not commit gates
   - If a check fails: report the failure and ask the user whether to fix it first or proceed anyway

7. Stage the appropriate files:
   - If specific files were agreed for this commit, stage only those: `git add <files>`
   - If committing everything: `git add -A`

8. Compose the commit message using conventional commit format:

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

   **Project-specific ticket suffix:** If a ticket ID was extracted in step 4, append ` #<ticketId>` to the end of the commit message. Ensure the `#` is NOT at the start of the message (git treats leading `#` as a comment). The final format becomes:

   ```
   <emoji> <type>(<scope>): <short description> #<ticketId>
   ```

   Example: `✨ feat(ui): add loading spinner to search results #1234`

   If the project's `branch-management.md` defines a different commit message format, follow that format instead.

9. Create the commit:

   ```
   git commit -m "<message>"
   ```

10. If multiple commits were planned, repeat steps 7–9 for each remaining group

11. Report:

- Each commit created (hash + message)
- Any pre-commit check failures that were skipped
- Reminder: push only when explicitly asked
