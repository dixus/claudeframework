# Skills Reference

Generated and maintained by `/6_doc`. Last updated: 2026-03-02 (updated 2026-03-02, batch 3).

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
4. Writes the spec with: Goal, Requirements, Out of scope, Affected files, New files, Implementation notes, **Test cases** (with enough specificity to write a failing test from each case — inputs, expected outputs, key error/edge cases)
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
1. Reads spec, context, and all affected files
2. **Decomposition gate**: if total files > 10 or spec has ⚠ complexity flag, asks whether to proceed or break into sub-specs
3. Creates a git stash checkpoint (safe rollback point)
4. Proposes a step-by-step plan — **waits for your approval**
5. Implements step by step using the **TDD loop**: write test → run to confirm it fails (red) → implement → run to confirm it passes (green) — tests are never deferred to end
6. Runs: typecheck → lint → tests → build
7. Fixes any failures before reporting done
8. **(Optional)** Runs `/simplify` for an automated quality pass before handing off — catches code smells and CLAUDE.md violations that tests don't cover. Skip for trivial changes.

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

**Review criteria**:
- Correctness vs spec
- Code quality and patterns
- Security (injection, secrets, input validation)
- Test coverage and gaps
- Edge cases
- **Minimal impact**: does the change touch only what's necessary? Are any fixes patches that hide a root-cause problem?

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
4. **Spec-anchored check**: if any fixes diverged from the spec's requirements, updates the spec to stay in sync
5. **Self-improvement gate**: flags any issues where a CLAUDE.md or context rule would prevent recurrence — surfaces these as suggestions in the report
6. Reports what was fixed, what was skipped, spec changes, and recurrence-prevention suggestions
7. Reminds you to re-run `/2_review` to confirm

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
1. Detects unprocessed files in `references/`
2. Reads and extracts durable, actionable insights → appends to context files
3. **Reviews every skill** against accumulated context knowledge — applies improvements directly
4. Updates `references/index.md` with processing status
5. Runs `/6_doc` to regenerate documentation

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
