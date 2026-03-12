---
name: 0_spec
description: Write a feature spec from requirements in .claude/input/
disable-model-invocation: true
---
> **Recommended model: `claude-opus-4-6`** — spec writing requires deep reasoning about requirements, architecture, and edge cases.

Create a detailed spec for the following feature: $ARGUMENTS

$ARGUMENTS is an optional feature name or focus hint. The primary requirements source is .claude/input/.

Steps:
1. Read CLAUDE.md for project context and conventions
2. Read all files in `.claude/context/` if the directory exists — these are long-lived project references (schemas, API docs, glossaries)
3. Read all files in `.claude/input/` if the directory exists — these are the raw requirements materials (docs, images, wireframes, PDFs). Treat them as the primary source of truth for what to build
4. Explore the codebase to understand the relevant architecture — find and read the files most likely affected by this feature
5. Identify: which files will change, what new files are needed, and what existing patterns to follow
6. Before writing the spec, surface any ambiguous requirements or missing decisions. Ask 2–3 targeted clarifying questions — use selectable answer options where possible to keep responses fast. Wait for answers before proceeding. Skip this step if the requirements are already unambiguous.
   6b. For PRDs that involve UI/UX decisions or architectural patterns not explicitly stated in the requirements, always surface these as questions — even if the PRD appears complete. Mark them as "(Implementation choice — not in PRD)" so the user knows they are optional and can be skipped if Claude should decide freely. Examples: component selection, state management granularity, polling intervals, retry logic, file upload UX patterns, where to place cross-cutting concerns in the service layer.
   6c. After writing the spec, explicitly state which decisions were made freely (not specified in the PRD) under a section called "Decisions made by Claude". This makes assumptions visible and prevents silent architectural drift.
7. Write the spec to `.claude/specs/<kebab-case-feature-name>.md` with these sections:
   - **Goal**: one-sentence summary
   - **Requirements**: bulleted list of what it must do
   - **Out of scope**: what it explicitly will not do
   - **Affected files**: list existing files that will change and why
   - **New files**: list any new files needed
   - **Patterns to mirror**: 2–3 specific existing files whose structure, naming, or style the implementation should follow — this is the codebase intelligence that lets `/1_implement` match conventions without exploring
   - **Implementation notes**: key decisions, edge cases to handle
   - **Validation criteria**: explicit, observable conditions that confirm the feature is done (e.g. "navigating to /results shows a radar chart with 6 axes"); complement the test cases. These will be verified by both `/1_implement` and `/3_fix` — write them precisely enough to be checkable.
   - **Test cases**: describe expected behavior with enough specificity to write a failing test from each case — include inputs, expected outputs, and key error/edge cases
   - **Decisions made by Claude**: list any architectural or implementation decisions that were not specified in the requirements — makes assumptions visible to the reviewer
8. After writing: count the total files listed under "Affected files" + "New files". If the total exceeds 10, add a **⚠ Complexity flag** section noting that this feature may be too large for a single implementation session and suggesting decomposition into sub-specs.
9. Suggest to the user that they move the processed files from `.claude/input/` to `.claude/archive/` now that the spec is written.

Create the `.claude/specs/` directory if it doesn't exist. Do not implement anything — spec only.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

Ask: "Spec written to `.claude/specs/<name>.md`. Ready to implement — shall I run `/1_implement <name>`? (The full pipeline is: spec → implement → review → fix → commit)"

Do not summarize and stop. Always end with a direct question to the user.
