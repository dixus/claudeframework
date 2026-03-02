# Skills Reference

Generated and maintained by `/6_doc`. Last updated: 2026-03-02 (updated 2026-03-02, added /debug + permission hook, fixed step numbering in /3_fix, added PM + DevOps lenses to /2_review).

Each skill is defined in `.claude/skills/<name>/SKILL.md`. Skills are technology-agnostic — they read project commands from `CLAUDE.md` rather than hardcoding tools.

---

## `/0_spec`

**Purpose**: Translate raw requirements into a structured spec.

**When to use**: Before starting any non-trivial feature. Do not implement without a spec.

**Input**: Files in `.claude/input/` (requirements, wireframes, docs). Optional `$ARGUMENTS` as a focus hint.

**Output**: `.claude/specs/<kebab-name>.md`

**What it does**:
1. Reads CLAUDE.md, context files, and all input materials
2. Explores codebase to find affected files and patterns
3. **Asks 2–3 clarifying questions** (with selectable options) before writing — skips if requirements are unambiguous
4. Writes the spec with: Goal, Requirements, Out of scope, Affected files, New files, **Patterns to mirror** (2–3 existing files whose structure/naming the implementation should follow — codebase intelligence for `/1_implement`), Implementation notes, **Validation criteria** (observable conditions confirming the feature is done), **Test cases** (with enough specificity to write a failing test from each case)
5. **Flags complexity**: adds a ⚠ section if the total affected + new files exceeds 10, suggesting decomposition

**Usage**:
```
/0_spec
/0_spec user authentication
```

**After running**: Read the spec before proceeding. Move processed files from `input/` to `archive/`.

---

## `/1_implement`

**Purpose**: Implement a spec with a mandatory plan approval gate.

**When to use**: After reviewing and approving a spec from `/0_spec`.

**Input**: `.claude/specs/<name>.md`. Defaults to most recently modified spec.

**What it does**:
1. Reads spec, context, affected files, and **"Patterns to mirror"** files from the spec — these are the primary convention references for naming, structure, and style
2. **Decomposition gate**: if total files > 10 or spec has ⚠ complexity flag, asks whether to proceed or break into sub-specs
3. Creates a git stash checkpoint (safe rollback point)
4. Proposes a step-by-step plan — **waits for your approval**
5. Implements step by step using the **TDD loop**: write test → run to confirm it fails (red) → implement → run to confirm it passes (green) — tests are never deferred to end
6. Runs: typecheck → lint → tests → build
7. Fixes any failures before reporting done
8. **(Optional)** Runs `/simplify` for an automated quality pass before handing off — catches code smells and CLAUDE.md violations that tests don't cover. Skip for trivial changes.
9. If the implementation touches multiple distinct concerns, suggests **atomic commits** using conventional commit format (`✨ feat:`, `✅ test:`, `📝 docs:`, etc.)

**Usage**:
```
/1_implement zustand-store
/1_implement                  ← uses most recent spec
```

**After running**: Start a fresh session (`/clear`) before running `/2_review`.

---

## `/2_review`

**Purpose**: Unbiased code review against the spec.

**When to use**: After `/1_implement` or `/3_fix`. **Always run in a fresh session.**

**Why fresh session**: Claude is biased toward code it wrote in the same session. A clean context produces more honest reviews.

**Input**: Git diff. Optional `$ARGUMENTS` to load the corresponding spec for context.

**Output**: `.claude/reviews/<name>-review.md`

**Review criteria** (multi-role lenses):
- **Correctness**: does it match the spec? Logic bugs, missing cases?
- **Code quality**: follows existing patterns? Over-engineered or unnecessarily complex?
- **Security**: injection risks, exposed secrets, missing input validation, OWASP top-10?
- **Tests / QA**: relevant cases covered? Edge-case gaps? Regression risk?
- **UX / Minimal impact**: does the change touch only what's necessary? Scope creep? Patches hiding root causes?
- **PM**: does the change deliver business value? Aligned with spec goal? Anything built that wasn't asked for?
- **DevOps**: CI/CD implications? Environment variables, build config, or deployment steps affected? Observability gaps?
- **Spec validation**: if spec has "Validation criteria", can each criterion be confirmed from the diff?

**Severity levels**: `critical` / `major` / `minor`

**Usage**:
```
/clear
/2_review zustand-store
/2_review                     ← reviews latest changes without spec context
```

---

## `/3_fix`

**Purpose**: Fix review issues in severity order (critical → major → minor) while keeping spec and code in sync.

**When to use**: After `/2_review` has produced a report.

**Input**: `.claude/reviews/<name>-review.md`. Defaults to most recently modified review.

**What it does**:
1. Reads the review report and corresponding spec (if available)
2. Fixes each issue — minimal change only, no refactoring
3. Runs: typecheck → lint → tests → build
4. Fixes any verify failures
5. **Spec-anchored check**: if any fixes diverged from the spec's requirements, updates the spec to stay in sync
6. **Validation criteria check**: confirms every "Validation criteria" item in the spec still passes after fixes
7. **Self-improvement gate**: flags any issues where a CLAUDE.md or context rule would prevent recurrence — surfaces these as suggestions in the report
8. Reports what was fixed, what was skipped, spec changes, and recurrence-prevention suggestions
9. Reminds you to re-run `/2_review` to confirm

**Usage**:
```
/3_fix zustand-store
/3_fix                        ← uses most recent review
```

---

## `/4_test`

**Purpose**: Full verification suite — report only, no fixes.

**When to use**: As a final gate before shipping, or to check the state of the project at any time.

**What it runs** (in order, reads commands from `CLAUDE.md`):
1. Typecheck
2. Lint
3. Tests
4. Build

**Output**: Pass/Fail status per command, failure details with file + line references.

**Does not apply fixes** — diagnosis only. Ask explicitly to fix.

**Usage**:
```
/4_test
/4_test src/lib/scoring/engine.test.ts   ← specific file only
```

---

## `/5_learn`

**Purpose**: Process new references, distill insights into the knowledge base, and improve skills.

**When to use**: After dropping new blog posts or repo files into `.claude/references/`. Also run periodically to review if skills need updating even without new references.

**How to add material**:
- Blog posts / articles: paste full text as `.md` or `.pdf` into `.claude/references/blogs/`
- Repositories: copy README and key files into `.claude/references/repos/<name>/`

**What it does**:
1. Detects unprocessed items in `references/` — individual files in `blogs/`, and repo subdirectories in `repos/` (marked done when `processed/.done` exists inside the repo dir)
2. For **blog files**: reads full content, extracts insights, moves file to `processed/` subfolder
3. For **repo directories**: selectively reads key files (README, resources, docs, command patterns) — skips CI configs, scripts, lock files; creates `processed/.done` marker when done
4. Appends durable, actionable insights to context files
5. **Reviews every skill** against accumulated context knowledge — applies improvements directly
6. Updates `references/index.md` with processing status
7. Runs `/6_doc` to regenerate documentation

**Usage**:
```
/5_learn
```

---

## `/6_doc`

**Purpose**: Regenerate all documentation in `.claude/docs/` from the current state of skills and context.

**When to use**: Automatically triggered by `/5_learn`. Run manually after modifying skills or context files.

**What it reads**:
- All skill definitions in `.claude/skills/`
- All context files in `.claude/context/`
- `references/index.md` for the knowledge base changelog

**What it writes**:
- `.claude/docs/README.md` — framework overview
- `.claude/docs/workflow.md` — workflow rationale and patterns
- `.claude/docs/skills-reference.md` — this file
- `.claude/docs/knowledge-base.md` — distilled insights changelog

**Usage**:
```
/6_doc
```

---

## `/audit`

**Purpose**: Find and fix vulnerable dependencies.

**When to use**: Periodically, or when `npm audit` / equivalent reports vulnerabilities.

**What it does**:
1. Detects package manager from lockfiles (npm / yarn / pnpm / bun / pip / cargo / go)
2. Runs audit command
3. Applies safe (non-breaking) fixes automatically
4. Reports breaking-change fixes separately — asks before applying
5. Runs tests to verify nothing broke

**Usage**:
```
/audit
```

---

## `/commit`

**Purpose**: Create one or more well-structured atomic commits from current working tree changes.

**When to use**: Whenever you're ready to commit — especially after `/1_implement` when multiple concerns were touched. Replaces ad-hoc `git commit` with a structured quality gate.

**Input**: Current git working tree. Optional `--all` flag to skip split analysis and commit everything as one.

**What it does**:
1. Runs `git status` + `git diff HEAD` to understand scope
2. **Analyses the diff for distinct concerns** — proposes splitting into atomic commits if multiple unrelated things changed
3. Confirms the split with the user (or proceeds as single commit)
4. Runs pre-commit checks per CLAUDE.md: typecheck → lint (no tests — those are for `/4_test`)
5. Stages the appropriate files and writes the commit message in **conventional commit format**:
   `<emoji> <type>(<scope>): <short description>` — e.g. `✨ feat(scoring): add gating logic`
6. Creates each commit; repeats for multi-commit splits

**Type → emoji**: `feat` ✨ · `fix` 🐛 · `docs` 📝 · `refactor` ♻️ · `test` ✅ · `chore` 🔧 · `perf` ⚡️ · `style` 🎨

**Usage**:
```
/commit
/commit --all     ← skip split analysis, commit everything
```

---

## `/create-hook`

**Purpose**: Scaffold a Claude Code lifecycle hook for this project based on detected tooling.

**When to use**: When you want deterministic quality enforcement that runs automatically on every action — not advisory instructions Claude might ignore.

**Why hooks**: Hooks are shell commands that fire at specific lifecycle events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`). They are the only way to make behaviour truly mandatory rather than suggested.

**Input**: Project tooling (detected automatically). Optional $ARGUMENTS describing the desired hook behaviour.

**What it does**:
1. **Detects tooling** — scans for `tsconfig.json`, `.prettierrc`, `.eslintrc.*`, `package.json` scripts, `.git`
2. **Suggests relevant hooks** based on what's found (type-check, auto-format, lint+fix, secret scanner, protected-dir guard)
3. **Configures** the hook: event type, tool matcher, scope (project / global / project-local), Claude integration, file filtering
4. **Creates** the hook script following technical standards:
   - Reads JSON from `stdin` (never `argv`)
   - Success: `{ continue: true, suppressOutput: true }`
   - Error: `{ continue: true, additionalContext: "..." }` so Claude auto-fixes
   - Block (PreToolUse only): `exit(2)`
5. **Registers** the hook in the appropriate `settings.json` (merges with existing)
6. **Tests** both happy path (hook passes silently) and sad path (hook fires correctly)

**Hook event types**: `PreToolUse` (can block) · `PostToolUse` (feedback/fix) · `UserPromptSubmit` (before prompt)

**Usage**:
```
/create-hook
/create-hook type-check ts files after every edit
/create-hook block writes to migrations/ directory
```

---

## `/debug`

**Purpose**: Diagnose and fix a specific failing test, type error, or runtime error with a structured root-cause approach.

**When to use**: When a verify step fails and you want a systematic diagnosis rather than ad-hoc guessing.

**Input**: Optional `$ARGUMENTS` — an error message, test name, or file path to focus on. Without arguments, runs the full verify suite to find the first failure.

**What it does**:
1. Identifies the failure — from `$ARGUMENTS` or by running verify
2. Reads the failing file(s) in full
3. **Forms and validates a hypothesis** before touching code — checks similar patterns in the codebase to confirm
4. Applies the minimal fix — only what the root cause demands, no defensive code or refactoring
5. Re-runs the specific failing command to confirm the fix
6. Runs the full verify suite to confirm no regressions
7. If still failing, revises the hypothesis and repeats — does **not** stack fixes on top of each other
8. Reports: root cause (one sentence), files changed, before/after verify status

**Key constraints**:
- Hypothesis must be validated before any code is changed
- If the fix requires touching more than 3 files, pauses and reports — the bug may be systemic
- Never applies a second fix on top of an unresolved first fix

**Usage**:
```
/debug
/debug "TypeError: Cannot read properties of undefined"
/debug src/lib/scoring/engine.test.ts
```
