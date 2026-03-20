---
name: 0_spec
description: Write a feature spec from requirements in .claude/input/. Use when starting a new feature, before implementation begins.
disable-model-invocation: true
argument-hint: <feature name or description>
---
> **Recommended model: `claude-opus-4-6`** — spec writing requires deep reasoning about requirements, architecture, and edge cases.

Create a detailed spec for the following feature: $ARGUMENTS

$ARGUMENTS is an optional feature name or focus hint. The primary requirements source is .claude/input/.

Steps:
1. Read CLAUDE.md for project context and conventions
2. Read all files in `.claude/context/` if the directory exists — these are long-lived project references (schemas, API docs, glossaries)
3. Read all files in `.claude/input/` if the directory exists — these are the raw requirements materials (docs, images, wireframes, PDFs). Treat them as the primary source of truth for what to build
4. Explore the codebase to understand the relevant architecture — find and read the files most likely affected by this feature
   4b. **Check completed work**: Before deferring any scope (especially frontend) because a dependency "is not yet implemented", verify the actual completion status using whatever tracking the project uses (see CLAUDE.md). Never assume a dependency is missing — check first.
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
   - **UX concept** *(REQUIRED when the PRD includes a Frontend section — never silently drop frontend scope; if deferring, state the target PRD explicitly)*:
     - **Component tree**: hierarchical breakdown of components needed (leaf → container), noting which are new vs existing. Use indentation to show nesting.
     - **Interaction flows**: describe each distinct user journey as a numbered sequence of steps. For multi-step flows (wizards, forms, onboarding), include: trigger → intermediate states → success state → error/edge states. Use mermaid `stateDiagram-v2` for complex flows with branching.
     - **State & data flow**: which component owns which state, what gets lifted, what goes into global store vs local state. Map data dependencies (e.g. "ResultsChart reads `scores` from Zustand store, computed by `calculateScores()` in scoring engine").
     - **Responsive behavior**: specify layout changes at breakpoints if the feature involves layout (e.g. "stack cards vertically below `md`"). Skip if not applicable.
     - **Accessibility**: required keyboard navigation, ARIA roles, focus management, screen reader considerations. At minimum: all interactive elements keyboard-reachable, form inputs labeled, error states announced.
     - **Reuse check**: list existing UI components/patterns in the codebase that can be reused or extended instead of built from scratch. Avoid creating new components when existing ones can be composed.
   - **Validation criteria**: explicit, observable conditions that confirm the feature is done (e.g. "navigating to /results shows a radar chart with 6 axes"); complement the test cases. These will be verified by both `/1_implement` and `/3_fix` — write them precisely enough to be checkable.
   - **Test cases**: describe expected behavior with enough specificity to write a failing test from each case — include inputs, expected outputs, and key error/edge cases
   - **Decisions made by Claude**: list any architectural or implementation decisions that were not specified in the requirements — makes assumptions visible to the reviewer
8. After writing: count the total files listed under "Affected files" + "New files". If the total exceeds `complexity_gate_max_files` from CLAUDE.md (default: 10), add a **⚠ Complexity flag** section noting that this feature may be too large for a single implementation session and suggesting decomposition into sub-specs.
9. Suggest to the user that they move the processed files from `.claude/input/` to `.claude/archive/` now that the spec is written.

Create the `.claude/specs/` directory if it doesn't exist. Do not implement anything — spec only.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

Ask: "Spec written to `.claude/specs/<name>.md`. Ready to implement — shall I run `/1_implement <name>`? (The full pipeline is: spec → implement → review → fix → commit)"

Do not summarize and stop. Always end with a direct question to the user.
