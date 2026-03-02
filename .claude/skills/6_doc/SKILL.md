---
name: 6_doc
description: Regenerate .claude/docs/ from current skills and context
disable-model-invocation: true
---
Regenerate the framework documentation in `.claude/docs/` to reflect the current state of skills, context, and processed references.

Steps:
1. Read all skill definitions in `.claude/skills/` — every `SKILL.md` file
2. Read all context files in `.claude/context/`
3. Read `.claude/references/index.md` for the processed references changelog
4. Read the existing docs in `.claude/docs/` so you can update rather than overwrite content that is still accurate

Update each of the following files. Preserve the "Generated and maintained by `/6_doc`" header and update the "Last updated" date:

**`.claude/docs/README.md`**
- Framework overview and purpose
- Quick start workflow (skill sequence)
- Skills overview table (name, one-line purpose)
- Directory layout

**`.claude/docs/workflow.md`**
- The pipeline diagram (with all current skills)
- Rationale for each step (why it exists, what it prevents)
- Session patterns (fresh session rules, resuming, parallel sessions)
- Context hygiene rules table
- CLAUDE.md maintenance guidelines
- Knowledge base loop description

**`.claude/docs/skills-reference.md`**
- One section per skill
- For each skill: purpose, when to use, inputs, outputs, what it does (numbered), usage examples
- Keep in sync with actual SKILL.md content — if a skill was updated, update its docs section too

**`.claude/docs/knowledge-base.md`**
- Table of context files with last-updated dates
- Processed references log (one entry per processed reference, with date and key insights summary)
- Pending references section (anything in references/ not yet processed)
- Suggested references to collect (carry forward existing suggestions, add new ones if context suggests gaps)

Rules:
- Do not invent content — only document what actually exists in skills and context files
- If a skill was changed since the last doc run, update its section to match
- If a new context file was added, add it to the knowledge-base.md table
- Write for a developer reading this for the first time — explain the why, not just the what
- Keep each doc file focused — do not merge them
