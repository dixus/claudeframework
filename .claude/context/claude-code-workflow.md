# Claude Code Workflow — Distilled Best Practices

Maintained by `/5_learn`. Last updated: 2026-03-02.
Source material: `.claude/references/blogs/claude-code-best-practices-2026.md`

---

## The fundamental constraint

Context window fills fast and performance degrades as it fills. Every practice below serves this constraint.

## Workflow pipeline

```
/0_spec → review spec → /1_implement → /2_review (fresh session) → /3_fix → /4_test
```

- Each skill runs in its own session where possible
- `/2_review` MUST run in a fresh session — same-session review is biased
- Tests and typecheck run automatically at the end of `/1_implement` and `/3_fix`

## Session discipline

| Signal | Action |
|---|---|
| Starting a new unrelated task | `/clear` |
| Claude wrong 2+ times on same issue | `/clear` + rewrite prompt with lessons learned |
| Exploring a large codebase | Use a subagent — keeps main context clean |
| Resuming previous work | `claude --continue` or `claude --resume` |

## Prompting patterns that work

- **Scope**: specify file, scenario, testing preferences — not just what to build
- **Pattern reference**: "follow the pattern in `src/components/ExistingWidget.tsx`"
- **Symptom + location**: "login fails after session timeout — check `src/auth/`"
- **Verification criteria**: always include test cases or expected output
- **Interview first**: for large features, ask Claude to interview you before writing a spec

## CLAUDE.md rules

- Keep under ~80 lines — bloated files cause Claude to ignore half
- Only include what Claude can't infer from reading code
- Add `IMPORTANT:` prefix to rules that must never be broken
- Review it when Claude repeatedly makes the same mistake — the rule is probably missing or buried

## Subagent patterns

- Investigation: `"Use a subagent to explore how X works and report back"`
- Review: separate session = unbiased, doesn't see the code it's reviewing
- Test running: subagent runs tests, reports summary, main context stays clean
- Writer/Reviewer: Session A implements, Session B reviews

## Verification order (always run in this sequence)

1. Typecheck (`tsc --noEmit` or language equivalent)
2. Lint
3. Tests
4. Build

Never skip typecheck — it catches errors that tests and lint miss.

## Hooks (deterministic guardrails)

Use hooks for things that MUST happen on every action, not advisory instructions:
- Auto-lint after file edit
- Block writes to protected directories (migrations, generated files)
- Run tests after commit

**Hook-driven state machine pattern** (Nick Tune, 2026-03-02): For legacy or unfamiliar codebases where you can't rely on git hooks, write a real workflow engine (with tests) that enforces phase transitions (planning → developing → reviewing → committing). Claude Code hooks bridge Claude and coding agents to that engine — events notify it, agents transition state. The engine lives in real code with 100% test coverage; hooks are just the interface.

## Added 2026-03-02

### Memory architecture

Claude Code memory loads in this priority order (more specific overrides broader):

```
1. Organization policy (enterprise)
2. Project CLAUDE.md  ← committed to Git, shared with team
3. User ~/.claude/CLAUDE.md  ← personal defaults
4. MEMORY.md (first 200 lines)  ← auto-generated, local-only
```

- **CLAUDE.md captures "why"** — architectural decisions, conventions, constraints. Written by humans.
- **MEMORY.md captures "what"** — commands, paths, patterns. Written by Claude automatically. Stored at `~/.claude/projects/<project>/memory/`. Never touches git.
- Beyond 200 lines, Claude creates topic files (`debugging.md`, `patterns.md`) loaded on-demand.
- **`CLAUDE.local.md`** at project root = your personal preferences; auto-gitignored.
- Git worktrees get separate memory directories — parallel sessions have fragmented context.
- **Disable auto-memory in CI**: `export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (prevents CI noise polluting local sessions).

**Team pattern ("local discovery, shared codification")**: weekly sync — review each developer's MEMORY.md, promote recurring patterns to the shared CLAUDE.md. This is the manual substitute for team-level memory sync.

### Modular rules (`.claude/rules/`)

Scope CLAUDE.md directives to specific file paths using YAML frontmatter. Reduces irrelevant context and improves output quality:

```yaml
# .claude/rules/testing.md
---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---
# Testing Conventions
- Use vitest, not jest
- Factory functions live in __fixtures__/
```

Practical benefit: go from one large CLAUDE.md to a slim root file plus per-domain rule files. Cited ~40% reduction in hallucinations when rules are properly scoped.

### CLAUDE.md pruning rule

For each line in CLAUDE.md, ask: *"Would removing this cause Claude to make mistakes?"* If not, cut it. Prune monthly. An overloaded CLAUDE.md is almost as bad as none — important rules get lost in noise. Target: under ~80 lines for the root file.

Run `/init` to auto-generate a starter CLAUDE.md from the codebase, then refine.

### Task decomposition threshold

Before starting a task: *"Could a senior engineer complete this in one focused session?"* If not, decompose it. Accuracy drops noticeably beyond ~15 file modifications in a single context. One task → one session → verify independently → move on.

### Verification loop (include tests in every task)

Specify test requirements in every task description. Claude writes the code AND the tests. If tests pass, probably good. This eliminates roughly 80% of debugging sessions because Claude can see failure output and self-correct in the same session. "Never trust, always verify" — don't review output visually; let tests be the oracle.

### Spec-driven development levels (Heeki Park, 2026-03-02)

Three levels, in increasing commitment to the spec as source of truth:

1. **spec-first** — write a thorough spec, implement from it; spec may drift after that
2. **spec-anchored** — keep spec alive and update it when course-correcting; spec and code stay in sync
3. **spec-as-source** — only the human edits the spec; Claude regenerates code from spec on every change

Target: **spec-anchored** for this project. At each course-correction, update the spec before continuing. This keeps the original intent visible and prevents context drift across sessions.

Standard prompt pattern to kick off spec creation:
> *"Start by creating a specification document and allow for iteration before starting implementation. Ask clarifying questions, as needed, using selectable inputs to make clarifying responses simpler. Write the specification as SPECIFICATIONS.md at the root of the project."*
