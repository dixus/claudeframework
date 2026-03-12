---
name: 1_implement
description: Implement a feature from a spec file in .claude/specs/
disable-model-invocation: true
---
> **Recommended model: `claude-opus-4-6`** — plan mode (step 7) requires architectural reasoning; Sonnet is acceptable for straightforward implementations with no plan mode.

Implement the feature described in a spec file. $ARGUMENTS should be the spec filename (without path or extension), e.g. `export-zip`. If no argument is given, use the most recently modified file in `.claude/specs/`.

Steps:
1. Read the spec from `.claude/specs/<name>.md`
2. Read CLAUDE.md — note the project's test command, lint command, build command, and typecheck command if listed
3. Read all files in `.claude/context/` if the directory exists — long-lived project references (schemas, API docs, glossaries)
4. Read all files listed under "Affected files", "New files", and "Patterns to mirror" in the spec — the "Patterns to mirror" files are the primary convention references; follow their structure, naming, and style
   4b. Context budget check: count the total files from steps 3 and 4. If the total exceeds 15, read "Patterns to mirror" files in full and only read the relevant sections of remaining files. Note which files were fully read vs. partially read.
5. Decomposition gate: count the total files listed under "Affected files" + "New files". If the total exceeds 10, or if the spec has a ⚠ Complexity flag, pause and ask the user whether to proceed as a single session or break the spec into smaller sub-specs first. Continue only after confirmation.
6. Create a safety checkpoint: if the project uses git, run `git checkout -b checkpoint/<spec-name>` from the current branch, then immediately switch back with `git checkout -`. This creates a named rollback point that survives crashes and avoids stash collisions. Skip if the working tree is already clean (no staged or unstaged changes).
7. Enter plan mode: propose a step-by-step implementation plan and wait for approval before writing any code
8. **Phase management** — check whether this is a phased implementation:
   a. If `.claude/specs/<name>-phases.md` already exists (resuming a later phase): read it, find the next `pending` phase, set its status to `in-progress`, and implement only that phase's scope. If all phases are `done`, report completion and stop.
   b. If no phase manifest exists but the approved plan proposes splitting into multiple phases: write `.claude/specs/<name>-phases.md` using the format below. Mark Phase 1 as `in-progress`, others as `pending`. Implement only Phase 1.
   c. If no phases are needed, skip the phase manifest and proceed normally.

   Phase manifest format (`.claude/specs/<name>-phases.md`):
   ```
   # Phases for <name>

   ## Phase 1 — <title>
   Status: in-progress
   Scope:
   - <spec requirement covered in this phase>
   Validation criteria:
   - <criterion from spec that applies to this phase>

   ## Phase 2 — <title>
   Status: pending
   Scope:
   - <spec requirement covered in this phase>
   Validation criteria:
   - <criterion from spec that applies to this phase>
   ```

   When in phased mode, all subsequent steps (9-18) apply only to the current phase's scope and validation criteria — do not flag later-phase items as missing.
9. After approval, implement each step in order, marking todos as you go. For each logical unit of code added, apply the TDD loop: (a) write the test cases from the spec's "Test cases" section, (b) run the tests to confirm they **fail** (red) — if the test runner cannot find the test file at all, that counts as red; do not skip this step, (c) implement the code, (d) run tests again to confirm they **pass** (green). Do not defer tests to the end. Do not proceed to the next unit until the current unit is green.
10. Follow existing code patterns — match the style, naming conventions, and architecture of surrounding code
11. Do not add comments, docstrings, or extra error handling beyond what the spec requires
12. After all changes are made, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
    a. Typecheck (e.g. `tsc --noEmit` or equivalent)
    b. Lint
    c. Tests
    d. Build (if a build command is listed)
13. Fix any failures — if a verify step still fails after two fix attempts, stop and report the blocker to the user. Do not loop indefinitely.
    13b. Write the blocker to `.claude/blockers/<spec-name>.md` with: which verify step failed, the exact error message, what was already attempted, and suggested next action for the user.
14. Validation criteria gate: read the spec's "Validation criteria" section. For each criterion, confirm it can be observed in the current implementation. If any criterion cannot be confirmed, treat it as a failure and fix it before proceeding.
15. Pre-flight self-review: before handing off, review your own changes against the lenses that `/2_review` will use. This step catches issues early and reduces review/fix loops from 3-5 down to 0-1.
    a. Re-read the full diff (`git diff` or `git diff --cached`)
    b. Check each lens — stop and fix any critical or major finding before proceeding:
       - **Correctness**: logic bugs, missing cases, spec requirements not met?
       - **Code quality**: patterns diverge from "Patterns to mirror" files? Over-engineering? Dead code?
       - **Security**: injection risks, exposed secrets, missing input validation at boundaries?
       - **Tests**: obvious edge-case gaps? Tests assert the right things? Coverage matches spec's test cases?
       - **Scope**: anything built that wasn't in the spec? Unnecessary refactoring?
       - **CLAUDE.md compliance**: any rule violations? (Literal types, pagination, error format, etc.)
    c. Fix any critical/major issues found, then re-run verify (step 12) to confirm nothing broke
    d. Do NOT aim for perfection — ignore minor style nits. The goal is zero critical/major findings in `/2_review`.
16. Quality pass: run `/simplify` to catch code smells, dead code, and CLAUDE.md violations before handing off to `/2_review`. Skip only if the change is fewer than 5 lines.
17. If the implementation touches multiple distinct concerns (e.g. engine logic + UI component + tests), suggest splitting into atomic commits: one commit per concern, using conventional commit format (`✨ feat:`, `✅ test:`, etc.)
18. Report which files were changed and summarize what was implemented.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

- If **phased and more phases remain**: Ask: "Phase N of M complete. Next: `/2_review <spec-name>` in a fresh session. After it passes, run `/1_implement <spec-name>` again for Phase N+1. Shall I proceed with `/2_review`?"
- If **final phase or no phases**: Ask: "Implementation complete. Ready for `/2_review <spec-name>` — shall I proceed? (Recommended: /clear first for an unbiased review)"

Do not summarize and stop. Always end with a direct question to the user.
