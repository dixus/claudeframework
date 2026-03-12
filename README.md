# Claude Code Development Framework

By [Holger Kreissl](https://github.com/hkreissl)

A reusable `.claude/` directory that turns Claude Code into a disciplined software engineering pipeline. One command — `/ship` — takes a feature from requirements to committed code, with spec writing, implementation, review, and fixes each running in isolated subagents with clean context.

Drop it into any project. Works with any tech stack.

---

## The problem

Claude Code is powerful but context-hungry. Without structure:

- Sessions accumulate unrelated work and quality degrades
- Claude reviews code it just wrote — biased by default
- Type errors and lint issues slip through when verification is ad hoc
- Knowledge from blog posts and external repos is lost between sessions
- Large features overwhelm a single session's context window

## The solution

A set of 15 skills that enforce a **spec → implement → review → fix → test** pipeline, with file-based handoffs between phases and guardrails that catch scope creep, recurring bugs, and quality regressions automatically.

---

## Quick start

**1. Copy `.claude/` into your project:**

```bash
git clone https://github.com/holgerimbery/claude-code-framework.git
cp -r claude-code-framework/.claude your-project/
```

**2. Update `CLAUDE.md`** in your project root with your tech stack, commands, and architecture.

**3. Ship a feature:**

```
/ship add user authentication
```

That's it. `/ship` orchestrates the entire pipeline automatically — spec, implement, review, fix loop, and commit — each phase in a clean subagent.

### Or run phases manually

```bash
# Write the spec
/0_spec add user authentication

# Implement (enters plan mode first)
/1_implement user-authentication

# Fresh session for unbiased review
/clear
/2_review user-authentication
/3_fix user-authentication-review
```

---

## `/ship` — the orchestrator

`/ship` is a thin orchestrator that never accumulates implementation context. Each phase runs in a dedicated subagent; **files are the handoff mechanism** between them.

```
/ship <feature description>
    │
    ├─ 1. Create feature branch
    ├─ 2. Front-load all questions (single batch)
    ├─ 3. ▸ Subagent: /0_spec → writes spec file
    ├─ 4. ▸ Subagent: /1_implement → implements with TDD
    ├─ 5. ▸ Subagent: /2_review + /3_fix (max 3 cycles)
    │       └─ Delta review: cycle 2+ only reviews new changes
    ├─ 6. ▸ Subagent: /test → final verification
    └─ 7. Finalize: merge / push / PR
```

**Built-in guardrails:**
- Complexity gate — stops if >10 files need changing, suggests decomposition
- Review circuit breaker — escalates after 3 fix cycles without resolution
- Recurring issue detection — if the same issue appears twice, escalates instead of retrying

---

## All skills

### Core pipeline

| Skill | Purpose |
|---|---|
| `/ship <feature>` | Full pipeline orchestrator — spec → implement → review → fix → commit |
| `/0_spec <feature>` | Write a structured spec from requirements in `.claude/input/` |
| `/1_implement <spec>` | Implement with mandatory plan approval and TDD enforcement |
| `/2_review [spec]` | 8-lens code review with severity classification |
| `/3_fix [review]` | Fix issues by severity (critical → major → minor) with circuit breaker |
| `/test [file]` | Run typecheck → lint → tests → build (report only, no fixes) |

### Development tools

| Skill | Purpose |
|---|---|
| `/commit` | Atomic conventional commits with multi-concern detection |
| `/debug` | Diagnose and fix a failing test, type error, or runtime error |
| `/audit` | Find and fix vulnerable dependencies across package managers |
| `/healthcheck` | Scan Docker container logs for errors, crashes, and warnings |
| `/create-hook` | Scaffold a Claude Code lifecycle hook |

### Knowledge & session management

| Skill | Purpose |
|---|---|
| `/learn` | Process blog posts and repos into the knowledge base |
| `/doc` | Regenerate `.claude/docs/` from current skills and context |
| `/handoff` | Capture session state before `/clear` |
| `/continue` | Resume from a handoff file in a new session |

All skills are **technology-agnostic** — they read project commands from `CLAUDE.md`, so they work with Node, Python, Rust, Go, or any other stack.

---

## Pipeline guardrails

The framework doesn't just run phases — it enforces quality at every step:

| Guardrail | Where | What it does |
|---|---|---|
| **Complexity flag** | `/0_spec` | Warns when spec implies >10 files; suggests decomposition |
| **Ambiguity gate** | `/0_spec` | Blocks on vague requirements; surfaces clarifying questions |
| **TDD enforcement** | `/1_implement` | Red-green cycle — test must fail before implementation |
| **Pre-flight self-review** | `/1_implement` | Checks 6 lenses before handing off to review |
| **Phase support** | `/1_implement` | Splits large features into multi-phase implementation |
| **Delta review** | `/2_review` | Cycle 2+ only reviews changes since last fix |
| **8-lens review** | `/2_review` | Correctness, code quality, security, tests, UX, PM, DevOps, spec validation |
| **Circuit breaker** | `/3_fix` | Escalates recurring issues instead of retrying |
| **Lessons capture** | `/3_fix` | Writes preventive rules to `context/lessons.md` |
| **Spec sync** | `/3_fix` | Updates spec if fixes diverged from requirements |

---

## Project structure

```
.claude/
  skills/          ← 15 skills defining the full pipeline
  context/         ← curated knowledge read by all skills
    instincts.md   ← universal rules loaded every session
    lessons.md     ← corrections captured from fix cycles
  hooks/           ← lifecycle hooks (auto-approve, safety guards)
  docs/            ← generated documentation
  references/      ← drop zone for blog posts and repos
  specs/           ← generated feature specs
  reviews/         ← review reports
  input/           ← raw requirements (archived after spec)
  handoffs/        ← session state files (gitignored)
```

---

## Instincts & lessons

**Instincts** (`.claude/context/instincts.md`) are universal rules loaded before every session: read before editing, no speculative code, never skip typecheck, plan mode for 3+ step tasks. Edit this file to encode rules for mistakes Claude keeps repeating.

**Lessons** (`.claude/context/lessons.md`) are automatically captured by `/3_fix` during review cycles. Every fixed issue becomes a preventive rule — so the same mistake doesn't happen twice across any future session. Over time, this file builds up a project-specific knowledge base of corrections and patterns that all skills read at startup. This is how the framework learns from your project.

---

## Session management

`/clear` kills context. `/handoff` saves it first.

```bash
/handoff          # Captures task, pipeline position, decisions, next step
/clear            # Clean slate
/continue         # Restores everything in the new session
```

Handoff files live in `.claude/handoffs/` (gitignored — they're personal session state, not project artifacts).

---

## Knowledge base

Drop blog posts or repo files into `.claude/references/`, then run `/learn`:

```
Blog post / repo file
    → .claude/references/blogs/ or repos/
    → /learn
    → Extracts insights → updates context/ → improves skills → runs /doc
    → All future sessions benefit
```

Processed files are moved to `processed/` so `/learn` is idempotent.

---

## Permission hook

`.claude/hooks/auto-approve.js` auto-approves safe tools (Read, Write, Edit, Glob, Grep, Bash) and blocks destructive patterns (`rm -rf /`, force-push to main). Removes approval fatigue without disabling safety. Registered in `.claude/settings.json`.

---

## Demo project

The `src/` directory contains an **AI Maturity Score** app — a Next.js 14 + TypeScript project built entirely using this framework:

- Pure TypeScript scoring engine with unit tests
- Multi-step assessment UI (48 questions across 6 dimensions)
- Radar chart results with bottleneck detection
- Zustand state management

```bash
npm install
npm run dev        # localhost:3000
npx vitest run     # Unit tests
npm run build      # Production build
```

---

## Further reading

- [Framework overview](.claude/docs/README.md)
- [Workflow rationale](.claude/docs/workflow.md)
- [Skills reference](.claude/docs/skills-reference.md)
- [Knowledge base](.claude/docs/knowledge-base.md)

---

## License

MIT
