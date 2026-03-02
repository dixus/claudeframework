---
name: 5_learn
description: Process new references, update context knowledge files, and improve skills
disable-model-invocation: true
---
Process new material from `.claude/references/` and distill insights into `.claude/context/`. Then review every skill against the accumulated knowledge and apply any improvements.

## Idempotency rule — read this first

Before doing anything else:
1. Read `.claude/references/index.md`
2. Build a list of already-processed filenames from the "Processed entries" table (any row with ✅)
3. Scan all files in `references/blogs/` and all subdirectories in `references/repos/`
4. Compare — files that are already in the processed list are DONE. Never read or re-process them.
5. If there are no new files (unprocessed or unlisted), skip to **Skill review** below.

## Processing steps (only for new files)

For each file/directory that is new (not in the processed list):

1. Read the full content
2. Identify which context file(s) it belongs to:
   - Claude Code workflow, prompting, session management → `.claude/context/claude-code-workflow.md`
   - SaaS architecture, auth, billing, infra, multi-tenancy → `.claude/context/saas-architecture-patterns.md`
   - Other topics → `.claude/context/` (create a new clearly-named file if needed)
3. Extract only actionable, durable insights — skip opinions, anecdotes, and anything already captured in the target context file
4. Append to the relevant context file under a dated section heading: `## Added YYYY-MM-DD`

## Skill review (always run — even when no new references)

5. Read every skill file in `.claude/skills/` (all `SKILL.md` files)
6. Read all context files in `.claude/context/`
7. For each skill, ask: does the current knowledge in context suggest a concrete improvement to this skill's steps, inputs, outputs, or guardrails? Consider:
   - Are there missing steps that current best practices demand?
   - Are there steps that are now outdated or weaker than the state of the art?
   - Does a skill lack a safety check, decomposition gate, or verification step that the context recommends?
8. Apply all warranted improvements directly to the skill files — do not ask for confirmation
9. For each change made, note: which skill, what changed, and why (one line each)

## After processing

10. Update `.claude/references/index.md`:
    - Add each newly processed file to the "Processed entries" table with ✅ and a one-line insight summary
    - Remove it from "Unprocessed entries" if it was listed there
    - If it was an unlisted drop (found by scanning), add it to Processed directly
11. Run `/6_doc` to regenerate documentation
12. Report:
    - Which reference files were processed (or "none — already up to date")
    - Which context files were updated
    - Which skills were changed and what improved
    - Confirmation that `/6_doc` completed
