---
name: 5_learn
description: Process new references, update context knowledge files, and improve skills
disable-model-invocation: true
---
Process new material from `.claude/references/` and distill insights into `.claude/context/`. Then review every skill against the accumulated knowledge and apply any improvements.

## Idempotency rule — filesystem-based, read this first

Processed files are physically moved to a `processed/` subfolder after each run. This is the single source of truth — do NOT rely on the index table for deduplication.

1. Scan the filesystem for **unprocessed** candidate files:
   - `references/blogs/` — every file directly in this folder (NOT inside `processed/`)
   - `references/repos/<dir>/` — every file inside a named subdirectory
   - Ignore `references/index.md` and any `processed/` subfolder
2. If there are no new files, skip to **Skill review** below.

## Processing steps (only for unprocessed files)

For each unprocessed file:

1. Read the full content
2. Identify which context file(s) it belongs to:
   - Claude Code workflow, prompting, session management → `.claude/context/claude-code-workflow.md`
   - SaaS architecture, auth, billing, infra, multi-tenancy → `.claude/context/saas-architecture-patterns.md`
   - Other topics → `.claude/context/` (create a new clearly-named file if needed)
3. Extract only actionable, durable insights — skip opinions, anecdotes, and anything already captured in the target context file
4. Append to the relevant context file under a dated section heading: `## Added YYYY-MM-DD`
5. **Immediately after processing**, move the file into the `processed/` subfolder next to where it was found:
   - `references/blogs/foo.pdf` → `references/blogs/processed/foo.pdf`
   - `references/repos/bar/README.md` → `references/repos/bar/processed/README.md`
   - Use `mv` (or `Move-Item` on Windows) via Bash; create the `processed/` directory first if it does not exist

## Skill review (always run — even when no new references)

6. Read every skill file in `.claude/skills/` (all `SKILL.md` files)
7. Read all context files in `.claude/context/`
8. For each skill, ask: does the current knowledge in context suggest a concrete improvement to this skill's steps, inputs, outputs, or guardrails? Consider:
   - Are there missing steps that current best practices demand?
   - Are there steps that are now outdated or weaker than the state of the art?
   - Does a skill lack a safety check, decomposition gate, or verification step that the context recommends?
9. Apply all warranted improvements directly to the skill files — do not ask for confirmation
10. For each change made, note: which skill, what changed, and why (one line each)

## After processing

11. Update `.claude/references/index.md`:
    - For each newly processed file, add a row to the "Processed entries" table with ✅ and a one-line insight summary
    - The "File" column value should be the original relative path (e.g. `` `blogs/uninterrupted.pdf` ``) — this is an audit log only, not used for deduplication
    - Remove the file from "Unprocessed entries" if it was listed there
12. Run `/6_doc` to regenerate documentation
13. Report:
    - Which reference files were processed (or "none — already up to date")
    - Which context files were updated
    - Which skills were changed and what improved
    - Confirmation that `/6_doc` completed
