---
name: 1_implement
description: Implement a feature from a spec file in .claude/specs/. Use after a spec is written and approved.
disable-model-invocation: true
argument-hint: <spec-name>
model: claude-fable-5-1
effort: high
---

Implement the feature described in a spec file. $ARGUMENTS should be the spec filename (without path or extension), e.g. `export-zip`. If no argument is given, use the most recently modified file in `.claude/specs/`.

Steps:

1. Read the spec from `.claude/specs/<name>.md`
2. Read CLAUDE.md — note the project's test command, lint command, build command, and typecheck command if listed
3. Read all files in `.claude/context/` if the directory exists — long-lived project references (schemas, API docs, glossaries)
4. Read all files listed under "Affected files", "New files", and "Patterns to mirror" in the spec — the "Patterns to mirror" files are the primary convention references; follow their structure, naming, and style
   4b. Context budget check: count the total files from steps 3 and 4. If the total exceeds 15, read "Patterns to mirror" files in full and only read the relevant sections of remaining files. Note which files were fully read vs. partially read.
5. Decomposition gate: count the total files listed under "Affected files" + "New files". If the total exceeds `complexity_gate_max_files` from CLAUDE.md (default: 10), or if the spec has a ⚠ Complexity flag, pause and ask the user whether to proceed as a single session or break the spec into smaller sub-specs first. Continue only after confirmation.
6. Create a safety checkpoint: if the project uses git and `checkpoint/<spec-name>` does not already exist (e.g., already created by `/pipeline:ship`), run `git checkout -b checkpoint/<spec-name>` from the current branch, then immediately switch back with `git checkout -`. This creates a named rollback point that survives crashes and avoids stash collisions. Skip if the checkpoint branch already exists or the working tree is already clean (no staged or unstaged changes).
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
   Contract items:
   - <ids from the spec's ## Contract that this phase must satisfy, e.g. C1, C2>

   ## Phase 2 — <title>
   Status: pending
   Scope:
   - <spec requirement covered in this phase>
   Contract items:
   - <ids from the spec's ## Contract that this phase must satisfy, e.g. C1, C2>

   ## Artifact coverage
   Every file from the spec's "Affected files" + "New files" must appear in exactly one phase above.
   Unassigned:
   - (none)
   ```

   **Phase reconciliation (mandatory when creating or resuming a phase manifest):**
   Before proceeding, cross-reference the spec's "Affected files" + "New files" lists against all phases in the manifest. Every spec artifact must be assigned to exactly one phase. If any artifact is missing from all phases, add it to the appropriate phase or create an additional phase for it. The "Unassigned" block in the manifest must be empty — if it is not, stop and resolve before continuing. This prevents silent scope loss where entire subsystems (e.g. frontend) are dropped during decomposition.

   Apply the same reconciliation to the contract: **every id in the spec's `## Contract` must be assigned to exactly one phase.** An unassigned contract id is the same class of silent scope loss as an unassigned file — the criterion would never be gated by any phase.

   When in phased mode, all subsequent steps (9-18) apply only to the current phase's scope and its assigned contract items — do not flag later-phase items as missing. The step-14 gate runs only the `verify` commands of this phase's contract ids.

9. After approval, implement each step in order, marking todos as you go. For each logical unit of code added, apply the TDD loop: (a) write the test cases from the spec's "Test cases" section, (b) run the tests to confirm they **fail** (red) — if the test runner cannot find the test file at all, that counts as red; do not skip this step, (c) implement the code, (d) run tests again to confirm they **pass** (green). Do not defer tests to the end. Do not proceed to the next unit until the current unit is green.
   9a. **Test strategy — same commit as code** — read the spec's `## Test strategy` section before starting. If the classification is `test-required`, the tests MUST land in the **same commit** as the production code they cover. No red/green separation at the commit level, no follow-up "add tests" commit. The TDD loop above still runs locally (red → green) — the same-commit rule is about *git history*, not about skipping the red step.
   **Every new test must contain at least one real assertion.** `Assert.True(true)`, `Assert.False(false)`, `expect(true).toBe(true)`, `expect(1).toBe(1)`, and `Assert.IsNotNull(null)`-style lies are NOT real assertions — they are vacuous and will be called out by `2_review`. A real assertion checks an observable outcome against an expected value derived from the test's Act step. Arrange- or Act-only tests with no assertion are not acceptable.
   If the spec's classification is `test-recommended`, tests are encouraged but not mandatory — if the change is a pure refactor with no behaviour change, shipping without new tests is acceptable as long as the existing test suite still passes. If the classification is `no-test-needed:<category>`, no new tests are expected; skip the TDD loop for this unit.
   9b. **Impact check** — before modifying a shared function's signature (adding/removing/renaming params, changing return type), run an impact analysis first:
   - Grep for all call sites of the function across the codebase
   - Grep for all test mocks that patch it (`patch("...function_name")`, `vi.mock`)
   - List every site that needs updating alongside the signature change
   - Update ALL call sites and mocks in the same step — do not leave stale call sites for a later step
   - If the blast radius is large (>10 call sites), pause and flag to the user before proceeding
   - This prevents the recurring pattern: "changed helper, forgot 6 call sites, broke unrelated tests"
   9c. **Contract bindings must resolve** — every test named by a `verify` command in the spec's `## Contract` has to exist by the time the step-14 gate runs. A `verify` whose filter or spec path matches **zero** tests is worse than no binding at all: on some runners it exits 0 and reports green while proving nothing. So when you create the tests for a contract item, run that item's `verify` command once immediately — for `type: e2e` items against the environment its `env` field names, with the local stack running for `env: local` — and confirm both: (a) it selects a non-zero number of tests, and (b) it fails before the implementation exists and passes after. This is the red-first rule from step 9 applied to the binding itself, and it is the only way to catch a zero-match filter — the step-14 gate cannot tell one apart from a real pass.
10. Follow existing code patterns — match the style, naming conventions, and architecture of surrounding code
11. Do not add comments, docstrings, or extra error handling beyond what the spec requires
12. After all changes are made, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
    a. Typecheck (e.g. `tsc --noEmit` or equivalent)
    b. Lint
    c. Tests
    d. Build (if a build command is listed)
13. Fix any failures — if a verify step still fails after two fix attempts, stop and report the blocker to the user. Do not loop indefinitely.
    13b. Write the blocker to `.claude/blockers/<spec-name>.md` with: which verify step failed, the exact error message, what was already attempted, and suggested next action for the user.
14. **Contract gate**: read the spec's `## Contract` section. For each item:

- Item has a non-null `verify` → **run the command** (from its `cwd` if set, otherwise the repo root). Exit 0 means the criterion is met; a non-zero exit is a failure — fix it and re-run. Do not mark an item met because the code "looks right": the exit code is the only evidence that counts here. For `type: e2e` items, run against the environment the item's `env` field names, and before any `env: local` run probe that the local stack is up (the project's health check from CLAUDE.md, `/pipeline:healthcheck`, or a reachability check on the URL the test targets) — an unreachable stack is a blocker to report (step 13b), not a failed criterion.
- Item is `manual` → confirm the criterion is observable in the implementation by reading the code, exactly as the older prose `Validation criteria` gate did. Record it as `manual — confirmed by inspection`.

  Report one line per item (`C1 ✓ · C2 ✓ · C3 manual · C4 ✗`) in your step-18 summary so `/pipeline:ship` can surface it without re-running anything.

  If a `verify` still fails after two fix attempts, stop and write the blocker (step 13b). **Editing the spec's Contract so that it passes is never a valid fix** — not relaxing a criterion, not widening a filter, not flipping an item to `manual`. If a criterion turns out to be wrong or unachievable, that is a scope change: report it as a blocker and let the user decide.

  If the spec has no `## Contract` section (legacy spec written before the contract format), fall back to the previous behaviour: read the spec's `Validation criteria` section and, for each criterion, confirm it can be observed in the current implementation. If any criterion cannot be confirmed, treat it as a failure and fix it before proceeding.
    14b. **Artifact inventory check** — extract every file path from the spec's "Affected files" + "New files" sections. If in phased mode, filter to only the files assigned to the current phase. Run `git diff --name-only` (against the branch point or checkpoint) and compare:

- For each spec file assigned to this phase, confirm it appears in the changeset
- If any assigned file was **not touched**, this is a scope gap — stop and resolve before proceeding:
  a. Implement the missing file now (return to step 9), OR
  b. If the file genuinely belongs in a later phase, move it in the phase manifest and document why
- This check is **mandatory** — do not skip it. It catches silent scope loss where entire subsystems (e.g. frontend UI) pass the contract gate (all APIs work) while being completely unimplemented.

  14c. **Spec requirements checklist** — walk every bullet in the spec's "Requirements" section. For each requirement, confirm it is implemented in the current code. Mark each as ✅ done or ❌ missing. If any requirement is ❌, treat it as a scope gap and resolve before proceeding (return to step 9). This is the same check `/pipeline:2_review` performs in its spec completeness lens — running it here catches drift one hop earlier and reduces review/fix cycles.

15. Pre-flight self-review: before handing off, review your own changes against the lenses that `/pipeline:2_review` will use. This step catches issues early and reduces review/fix loops from 3-5 down to 0-1.
    a. Re-read the full diff (`git diff` or `git diff --cached`)
    b. Check each lens — stop and fix any critical or major finding before proceeding:
    - **Correctness**: logic bugs, missing cases, spec requirements not met?
    - **Code quality**: patterns diverge from "Patterns to mirror" files? Over-engineering? Dead code?
    - **Security**: injection risks, exposed secrets, missing input validation at boundaries?
    - **Tests**: obvious edge-case gaps? Tests assert the right things? Coverage matches spec's test cases?
    - **Scope**: anything built that wasn't in the spec? Unnecessary refactoring? Run `git diff --name-only` and check for files outside the spec's scope — revert formatting-only or cosmetic changes to unrelated files (e.g. linter auto-fixes in files you didn't intentionally edit).
    - **CLAUDE.md compliance**: any rule violations? (Literal types, pagination, error format, etc.)
      c. Fix any critical/major issues found, then re-run verify (step 12) to confirm nothing broke
      d. Do NOT aim for perfection — ignore minor style nits. The goal is zero critical/major findings in `/pipeline:2_review`.
16. Quality pass (optional): run `/simplify` to catch code smells, dead code, and CLAUDE.md violations before handing off to `/pipeline:2_review`. Skip if the change is fewer than 5 lines.
17. If the implementation touches multiple distinct concerns (e.g. engine logic + UI component + tests), suggest splitting into atomic commits: one commit per concern, using conventional commit format (`✨ feat:`, `✅ test:`, etc.)
18. Report which files were changed and summarize what was implemented. The returned summary MUST include a line `Tests added: N` where N is the number of net-new test **functions** in the diff — count whatever the stack uses to declare a test: new `it(` / `test(` calls, `[Fact]` / `[Theory]` attributes, `def test_` functions, `@Test` annotations. If an exact grep is impractical on a very large diff, report `Tests added: ~N` to flag the number as an estimate. When the spec's classification was `no-test-needed`, the line reads `Tests added: 0 (no-test-needed:<category>)` so the review subagent can cross-check the declared category against what actually landed.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

- If **phased and more phases remain**: Ask: "Phase N of M complete. Next: `/pipeline:2_review <spec-name>` in a fresh session. After it passes, run `/pipeline:1_implement <spec-name>` again for Phase N+1. Shall I proceed with `/pipeline:2_review`?"
- If **final phase or no phases**: Ask: "Implementation complete. Ready for `/pipeline:2_review <spec-name>` — shall I proceed? (Recommended: /clear first for an unbiased review)"

Do not summarize and stop. Always end with a direct question to the user.
