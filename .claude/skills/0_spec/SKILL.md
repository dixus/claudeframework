---
name: 0_spec
description: Write a feature spec from requirements in .claude/input/
disable-model-invocation: true
---
Create a detailed spec for the following feature: $ARGUMENTS

$ARGUMENTS is an optional feature name or focus hint. The primary requirements source is .claude/input/.

Steps:
1. Read CLAUDE.md for project context and conventions
2. Read all files in `.claude/context/` if the directory exists — these are long-lived project references (schemas, API docs, glossaries)
3. Read all files in `.claude/input/` if the directory exists — these are the raw requirements materials (docs, images, wireframes, PDFs). Treat them as the primary source of truth for what to build
4. Explore the codebase to understand the relevant architecture — find and read the files most likely affected by this feature
5. Identify: which files will change, what new files are needed, and what existing patterns to follow
6. Before writing the spec, surface any ambiguous requirements or missing decisions. Ask 2–3 targeted clarifying questions — use selectable answer options where possible to keep responses fast. Wait for answers before proceeding. Skip this step if the requirements are already unambiguous.
7. Write the spec to `.claude/specs/<kebab-case-feature-name>.md` with these sections:
   - **Goal**: one-sentence summary
   - **Requirements**: bulleted list of what it must do
   - **Out of scope**: what it explicitly will not do
   - **Affected files**: list existing files that will change and why
   - **New files**: list any new files needed
   - **Implementation notes**: key decisions, patterns to follow, edge cases to handle
   - **Test cases**: describe expected behavior with enough specificity to write a failing test from each case — include inputs, expected outputs, and key error/edge cases
8. After writing: count the total files listed under "Affected files" + "New files". If the total exceeds 10, add a **⚠ Complexity flag** section noting that this feature may be too large for a single implementation session and suggesting decomposition into sub-specs.
9. Suggest to the user that they move the processed files from `.claude/input/` to `.claude/archive/` now that the spec is written

Create the `.claude/specs/` directory if it doesn't exist. Do not implement anything — spec only.
