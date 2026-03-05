---
name: 1_implement
description: Implement a feature from a spec file in .claude/specs/
disable-model-invocation: true
---
Implement the feature described in a spec file. $ARGUMENTS should be the spec filename (without path or extension), e.g. `export-zip`. If no argument is given, use the most recently modified file in `.claude/specs/`.

Steps:
1. Read the spec from `.claude/specs/<name>.md`
2. Read CLAUDE.md — note the project's test command, lint command, build command, and typecheck command if listed
3. Read all files in `.claude/context/` if the directory exists — long-lived project references (schemas, API docs, glossaries)
4. Read all files listed under "Affected files", "New files", and "Patterns to mirror" in the spec — the "Patterns to mirror" files are the primary convention references; follow their structure, naming, and style
5. Decomposition gate: count the total files listed under "Affected files" + "New files". If the total exceeds 10, or if the spec has a ⚠ Complexity flag, pause and ask the user whether to proceed as a single session or break the spec into smaller sub-specs first. Continue only after confirmation.
6. Create a safety checkpoint: if the project uses git, run `git add -A && git stash` so there is a clean rollback point before any changes are made. Skip if the working tree is already clean.
7. Enter plan mode: propose a step-by-step implementation plan and wait for approval before writing any code
8. After approval, implement each step in order, marking todos as you go
9. For each logical unit of code added, apply the TDD loop: (a) write the test cases from the spec's "Test cases" section, (b) run the tests to confirm they **fail** (red) — if the test runner cannot find the test file at all, that counts as red; do not skip this step, (c) implement the code, (d) run tests again to confirm they **pass** (green). Do not defer tests to the end. Do not proceed to the next unit until the current unit is green.
10. Follow existing code patterns — match the style, naming conventions, and architecture of surrounding code
11. Do not add comments, docstrings, or extra error handling beyond what the spec requires
12. After all changes are made, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
    a. Typecheck (e.g. `tsc --noEmit` or equivalent)
    b. Lint
    c. Tests
    d. Build (if a build command is listed)
13. Fix any failures — if a verify step still fails after two fix attempts, stop and report the blocker to the user. Do not loop indefinitely.
14. Validation criteria gate: read the spec's "Validation criteria" section. For each criterion, confirm it can be observed in the current implementation. If any criterion cannot be confirmed, treat it as a failure and fix it before proceeding.
15. Quality pass: run `/simplify` to catch code smells, dead code, and CLAUDE.md violations before handing off to `/2_review`. Skip only if the change is fewer than 5 lines.
16. If the implementation touches multiple distinct concerns (e.g. engine logic + UI component + tests), suggest splitting into atomic commits: one commit per concern, using conventional commit format (`✨ feat:`, `✅ test:`, etc.)
17. Report which files were changed and summarize what was implemented.

**Pipeline handoff (mandatory):** The implementation is not done until review passes clean. Next step: run `/2_review <spec-name>` — ideally in a fresh session (`/clear` first) to get an unbiased review. Do not skip this step.
