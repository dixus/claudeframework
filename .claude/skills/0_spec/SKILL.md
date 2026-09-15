---
name: 0_spec
description: Write a feature spec from requirements in .claude/input/. Use when starting a new feature, before implementation begins.
disable-model-invocation: true
argument-hint: <feature name or description>
model: claude-opus-5
effort: high
---

Create a detailed spec for the following feature: $ARGUMENTS

$ARGUMENTS is an optional feature name or focus hint. The primary requirements source is .claude/input/.

Steps:

1. Read CLAUDE.md for project context and conventions
2. Read all files in `.claude/context/` if the directory exists — these are long-lived project references (schemas, API docs, glossaries)
2b. **Resolve linked work items** — if the input or `$ARGUMENTS` mentions a ticket/issue ID (e.g. "Ticket 1234", "#1234", "1234.Improvement..."), try to fetch it using the project's configured work-item tracker. Check which MCP tools are available (Azure DevOps, Jira, Linear, GitHub Issues, or similar). If a tool is available, fetch the ticket with comments and linked items. Review resolved related/parent items: their linked commits, branches, and PRs point to prior work. Run `git show <sha>` or `git log <main>..<branch>` on those references and fold the actual implementation status into the spec. Doing this *before* codebase exploration prevents you from re-scoping work that is already done elsewhere. If no tracker MCP tool is available, skip this step.
3. Read all files in `.claude/input/` if the directory exists — these are the raw requirements materials (docs, images, wireframes, PDFs). Treat them as the primary source of truth for what to build
4. Explore the codebase to understand the relevant architecture — find and read the files most likely affected by this feature
   4b. **Check completed work**: Before deferring any scope (especially frontend) because a dependency "is not yet implemented", verify the actual completion status. If a work-item tracker was queried in Step 2b, resolved related/parent items expose linked commits and branches. Use `git show <sha>` or `git log <main>..<branch>` to inspect what was actually built. If no tracker is available, check `git log` for related branch names or commit messages. Never assume a dependency is missing — check first.
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
   - **UX concept** _(REQUIRED when the PRD includes a Frontend section — never silently drop frontend scope; if deferring, state the target PRD explicitly)_:
     - **Component tree**: hierarchical breakdown of components needed (leaf → container), noting which are new vs existing. Use indentation to show nesting.
     - **Interaction flows**: describe each distinct user journey as a numbered sequence of steps. For multi-step flows (wizards, forms, onboarding), include: trigger → intermediate states → success state → error/edge states. Use mermaid `stateDiagram-v2` for complex flows with branching.
     - **State & data flow**: which component owns which state, what gets lifted, what goes into global store vs local state. Map data dependencies (e.g. "ResultsChart reads `scores` from Zustand store, computed by `calculateScores()` in scoring engine").
     - **Responsive behavior**: specify layout changes at breakpoints if the feature involves layout (e.g. "stack cards vertically below `md`"). Skip if not applicable.
     - **Accessibility**: required keyboard navigation, ARIA roles, focus management, screen reader considerations. At minimum: all interactive elements keyboard-reachable, form inputs labeled, error states announced.
     - **Reuse check**: list existing UI components/patterns in the codebase that can be reused or extended instead of built from scratch. Avoid creating new components when existing ones can be composed.
   - **Contract** _(MANDATORY — this is the machine-checkable gate. It replaces the older prose-only `Validation criteria` section as the canonical statement of "done", so do not write both)_:

     Every acceptance criterion becomes one YAML item that binds the criterion to an executable check. `/ship` Step 5 runs every `verify` command and gates on its exit code. A criterion without a binding is a criterion nobody proves. Write the block as a fenced `yaml` code block under a `## Contract` heading:

     ```yaml
     - id: C1
       criterion: "calculateScores returns 0 for every dimension when no answers were given"
       verify: "npx vitest run src/lib/scoring/engine.test.ts -t 'empty answers'"
       type: unit
     - id: C2
       criterion: "Navigating to /results shows a radar chart with 6 axes"
       verify: "npx playwright test results-radar.spec.ts"
       cwd: e2e
       type: e2e
       env: local
     - id: C3
       criterion: "Sorting by due date stays stable when two rows share a date"
       verify: null
       manual: "Only visually observable — no snapshot harness exists for the data grid"
       type: manual
     ```

     Field rules:
     - `id` — `C1`, `C2`, … unique within the spec. Referenced by `/1_implement`, `/2_review`, `/ship` Step 5 and the phase manifest, so **never renumber an existing id** when revising a spec; append new ones instead.
     - `criterion` — one observable condition, at the precision bar the old `Validation criteria` demanded ("navigating to /results shows a radar chart with 6 axes"). Not a restatement of the requirement bullet.
     - `verify` — **exactly one shell command that exits 0 if and only if the criterion holds.** Prefer the narrowest command that proves it: a filtered test over a whole suite, one e2e spec over a full run. Note that a build command (`npm run build`, `dotnet build`) proves compilation only — never behaviour.
     - `cwd` — optional, relative to the repo root. Required whenever the command does not run from the root: the package directory in a monorepo, the `e2e/` directory for Playwright, the app directory for `npm run build`. Omit for repo-root commands.
     - `type` — one of `unit`, `e2e`, `build`, `manual`.
     - `env` — **required for every `type: e2e` item**, one of `local` or `deployed`; omit for all other types. Names the environment the e2e command runs against — without it the binding is ambiguous, and the two environments mean different things at gate time:
       - `local` — the default choice. The command targets the local stack (started with the project's dev/stack command from CLAUDE.md), which contains this ticket's change. Every criterion about behaviour **this ticket introduces** must be `env: local`: at gate time the change is not deployed anywhere else, so only the local stack can prove it.
       - `deployed` — valid only for criteria observable on the **currently deployed** environment (staging/demo), e.g. a regression guard on existing behaviour. A new-feature criterion bound to `deployed` would fail against correctly implemented code — the feature simply is not there yet — which makes the gate lie in the red direction.
     - `manual` — required **if and only if** `verify: null`. State *why* the criterion cannot be automated and name the missing harness. "Hard to test" is not a reason; "no snapshot harness exists for the data grid" is.

     Each item carries **either** a non-null `verify` **or** a `manual` reason — never both, never neither. `type: manual` with a non-null `verify` is a contradiction, and so is `verify: null` without a `manual` reason.

     A criterion you cannot bind is not a defect in the spec — it is information the pipeline needs, and `/ship` Step 7a reports it to the user as uncovered scope. Write it as `manual` with an honest reason. Never invent a command that does not actually prove the criterion, and never drop the criterion to keep the contract tidy.

     **Coverage:** every bullet in `## Requirements` must be traceable to at least one contract item. **Consistency with `## Test strategy`:** the tests named there are the *plan*; the tests referenced by a `verify` are the *gate*. They must not contradict each other.
   - **Test cases**: describe expected behavior with enough specificity to write a failing test from each case — include inputs, expected outputs, and key error/edge cases. Include both pure-function tests (engine/logic) AND component-level rendering tests (e.g. "renders X when prop Y") — implementations consistently skip component tests when only logic tests are listed
   - **Test strategy** _(MANDATORY — every spec must declare exactly one classification label)_:
     - Declare one of these three labels on its own line, e.g. `Classification: test-required`:
       - `test-required` — behaviour change in production code that needs tests
       - `test-recommended` — code change where tests are useful but not mandatory (e.g. pure refactor with no behaviour change)
       - `no-test-needed` — only valid when paired with a category from the authoritative whitelist below
     - **Authoritative `no-test-needed` category whitelist** (this is the single source of truth — `ship/SKILL.md` and `2_review/SKILL.md` reference this list by name, they do NOT re-declare it):
       - `ci-config` — pipeline YAML, build agent config, no product code
       - `docs-only` — Markdown, comments, changelog text
       - `style-only` — whitespace, formatting, pure cosmetic changes with no behaviour change
       - `rename-only` — identifier / file renames where all references are updated mechanically and no call-graph semantics change
       - `build-system` — project files, `package.json` tooling fields, bundler/compiler wiring that does not flow into runtime behaviour (dep bumps live under `deps-bump`)
       - `db-migration` — pure schema/DDL scripts that are applied outside the application runtime and contain no data-transformation logic
       - `deps-bump` — upgrades of package versions without code changes (`package.json` / project-file version fields only)
     - If `no-test-needed` is chosen, append the category: `Classification: no-test-needed:docs-only`. Declaring `no-test-needed` without a whitelisted category makes the spec malformed — the self-check at the end of step 8 must reject it.
     - If `test-required`, list the concrete tests to be written or extended. One line per entry: test name (or test file + test function) + a short "what is asserted" clause. Example: `calculateScores_withEmptyAnswers_returnsZero → asserts every dimension score is 0 and no NaN appears`. Vague entries like "add tests for the service" are not acceptable.
     - **Restricted-area auto-force**: if CLAUDE.md defines a `## Restricted Areas` section (security-critical paths — typically authentication, tenant filtering, permissions/grants, API-key validation, file upload/delete, inter-service communication) and any file in `Affected files` or `New files` matches a listed path, the classification is forced to `test-required` and the section must include the one-line security hint: `Restricted area touched — include at least one negative test (unauthenticated / wrong-tenant / missing-permission path).` No additional prompt machinery beyond that hint.
     - **Mixed diffs** pick the stronger classification. `test-required` beats any `no-test-needed` category; `no-test-needed` is only valid when the entire diff fits the chosen category.
   - **Decisions made by Claude**: list any architectural or implementation decisions that were not specified in the requirements, each with a risk classification — makes assumptions visible to the reviewer. Risk levels: **(low)** = naming, file structure, cosmetic choices; **(medium)** = state management, data flow, API shape; **(high)** = security, auth, data model, persistence strategy. High-risk decisions should be confirmed by the user before implementation proceeds.
8. After writing: count the total files listed under "Affected files" + "New files". If the total exceeds `complexity_gate_max_files` from CLAUDE.md (default: 10), add a **⚠ Complexity flag** section noting that this feature may be too large for a single implementation session and suggesting decomposition into sub-specs.
   8b. **Test strategy self-check** — before returning, verify the `## Test strategy` section passes all of:
   - Exactly one `Classification:` label is declared (`test-required`, `test-recommended`, or `no-test-needed`).
   - If `no-test-needed`, the label carries a category from the 7-item whitelist above (`no-test-needed:<category>`). A bare `no-test-needed` is malformed — fix the spec before returning.
   - If `test-required`, at least one concrete test entry is listed with an assertion clause (not a vague "add tests" line).
   - Cross-check `Affected files` + `New files` against CLAUDE.md `## Restricted Areas` (if that section exists). If any path matches, the classification MUST be `test-required` and the security hint line MUST be present. If the draft says `test-recommended` or `no-test-needed` but a restricted-area path is touched, override the classification to `test-required`, add the hint, and re-save before returning.
   8c. **Contract self-check** — before returning, verify the `## Contract` section passes all of. Each failure is a malformed spec: fix it and re-save, do not return a spec that fails any line here.
   - The block parses as YAML and contains at least one item. Ids are unique. No pre-existing id was renumbered.
   - Every item has **exactly one** of: a non-null `verify`, or a `manual` reason. Neither-nor and both-and are malformed.
   - Every `type: manual` item has `verify: null`, and no item with a non-null `verify` is typed `manual`.
   - Every command that does not run from the repo root carries a `cwd`.
   - Every bullet in `## Requirements` is traceable to at least one contract item. An untraceable requirement means the gate cannot prove it — add the item, or add an honest `manual` entry saying why not.
   - No `verify` is a bare full-suite run (`npm test`, `npx vitest run`, `dotnet test <solution>`, `npm run build` alone) where a narrower filter would prove the criterion. A green full suite says nothing about *this* criterion, so a full-suite binding is indistinguishable from no binding.
   - Every `type: e2e` item declares `env: local` or `env: deployed`, and no `env: deployed` item covers behaviour this ticket introduces — that behaviour is not deployed at gate time, so a deployed binding would fail correct code. When in doubt, `env: local`.
   - If **every** item is `manual`, say so explicitly in the spec body: the ticket ships with no automated proof of any criterion, and the user needs to see that before implementation starts, not at the Step 7a gate.
9. Suggest to the user that they move the processed files into the `archive/` directory **next to them** now that the spec is written — e.g. `.claude/input/<area>/foo.md` → `.claude/input/<area>/archive/foo.md`, and files at the input root → `.claude/input/archive/`. Create the `archive/` directory if it does not exist yet. Never move them to a top-level `.claude/archive/`: `/ship` Step 0b resolves PRDs with the glob `.claude/input/**/*<arg>*.md`, which descends into a sibling `archive/` but would not find a file outside `input/` — a satisfied `depends_on` would then look unmet.

Create the `.claude/specs/` directory if it doesn't exist. Do not implement anything — spec only.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

Ask: "Spec written to `.claude/specs/<name>.md`. Ready to implement — shall I run `/1_implement <name>`? (The full pipeline is: spec → implement → review → fix → commit)"

Do not summarize and stop. Always end with a direct question to the user.
