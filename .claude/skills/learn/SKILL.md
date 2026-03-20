---
name: learn
description: Process new references into context knowledge and propose skill improvements. Use after adding blog posts, repos, or docs to .claude/references/.
disable-model-invocation: true
---

Process new material from `.claude/references/` and distill insights into `.claude/context/`. Then review every skill against the accumulated knowledge and apply any improvements.

## Idempotency rule — filesystem-based, read this first

Processed state is tracked on the filesystem — do NOT rely on the index table for deduplication:

- Blog files: physically moved to a `processed/` subfolder
- Repo directories: marked with an empty `processed/.done` file inside the repo dir (too large to move)

1. Scan the filesystem for **unprocessed** candidate items:
   - `references/blogs/` — every file directly in this folder (NOT inside `processed/`)
   - `references/repos/` — every **subdirectory** that does NOT have a `processed/` marker file inside it (i.e., `references/repos/<dir>/processed/.done` does not exist)
   - Ignore `references/index.md` and any `processed/` subfolders
2. If there are no new items, skip to **Skill review** below.

## Processing steps (only for unprocessed items)

**For blog/article files** (individual files in `references/blogs/`):

1. Read the full content
2. Identify which context file(s) it belongs to:
   - Claude Code workflow, prompting, session management → `.claude/context/claude-code-workflow.md`
   - SaaS architecture, auth, billing, infra, multi-tenancy → `.claude/context/saas-architecture-patterns.md`
   - Other topics → `.claude/context/` (create a new clearly-named file if needed)
3. Extract only actionable, durable insights — skip opinions, anecdotes, and anything already captured in the target context file
4. Append to the relevant context file under a dated section heading: `## Added YYYY-MM-DD`
5. **Immediately after processing**, move the file into the `processed/` subfolder: `references/blogs/processed/<filename>`

**For repo subdirectories** (full repos in `references/repos/<dir>/`):

1. Identify the key files to read — prioritize: `README.md`, files under `resources/`, `docs/`, `commands/`, `skills/`; skip: CI configs, scripts, tests, lock files, generated files
2. Read those key files selectively (not every file — focus on workflow, command patterns, CLAUDE.md examples, and architectural decisions)
3. Extract actionable insights per the same routing rules above
4. Append to the relevant context file(s) under a dated section heading: `## Added YYYY-MM-DD`
5. **Immediately after processing**, mark the repo directory as done by creating `references/repos/<dir>/processed/.done` (an empty marker file). Do NOT move the entire directory — repos are large and the marker is sufficient for idempotency

## Skill review (always run — even when no new references)

6. Read every skill file in `.claude/skills/` (all `SKILL.md` files)
7. Read all context files in `.claude/context/`
8. For each skill, ask: does the current knowledge in context suggest a concrete improvement to this skill's steps, inputs, outputs, or guardrails? Consider:
   - Are there missing steps that current best practices demand?
   - Are there steps that are now outdated or weaker than the state of the art?
   - Does a skill lack a safety check, decomposition gate, or verification step that the context recommends?
9. **Propose, do not apply.** Write all suggested skill improvements to `.claude/reviews/learn-proposals.md` with this format for each proposal:
   ```
   ### Skill: <skill-name>
   **What:** <one-line description of the change>
   **Why:** <which reference or context insight motivates this>
   **Diff:** <show the specific lines to change — old → new>
   ```
   Do NOT modify skill files directly. The user reviews proposals and decides which to accept. This prevents a poorly written reference from corrupting a working skill.
10. For each proposal, note: which skill, what would change, and why (one line each)

## After processing

11. Update `.claude/references/index.md`:
    - For each newly processed file, add a row to the "Processed entries" table with ✅ and a one-line insight summary
    - The "File" column value should be the original relative path (e.g. `` `blogs/uninterrupted.pdf` ``) — this is an audit log only, not used for deduplication
    - Remove the file from "Unprocessed entries" if it was listed there
12. Run `/doc` to regenerate documentation
13. Report:
    - Which reference files were processed (or "none — already up to date")
    - Which context files were updated
    - Which skills were changed and what improved
    - Confirmation that `/doc` completed
