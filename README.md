# Claude Code Development Framework

By [Holger Kreissl](https://github.com/hkreissl)

A reusable `.claude/` directory that turns Claude Code into a disciplined software engineering pipeline. Drop it into any project, any tech stack. One command — `/ship` — takes a feature from requirements to committed code.

### What makes this different

Most Claude Code workflows run everything in one session. This framework doesn't.

- **Bias-free review** — the review phase runs in isolated context, never seeing implementation decisions. Claude can't rubber-stamp its own code.
- **The framework learns** — every correction from a review cycle is captured. After 14 days, proven rules graduate into permanent `CLAUDE.md` rules. The framework gets stricter with every feature shipped.
- **Zero context pollution** — each phase (spec, implement, review, fix, commit) runs in its own subagent. Files on disk are the handoff mechanism, not the context window.
- **Configurable guardrails** — complexity gates, circuit breakers, recurring issue detection, and all thresholds tunable per project.

---

## The problem

Claude Code is powerful but context-hungry. Without structure:

- Sessions accumulate unrelated work and quality degrades
- Claude reviews code it just wrote — biased by default
- Type errors and lint issues slip through when verification is ad hoc
- Knowledge from blog posts and external repos is lost between sessions
- Large features overwhelm a single session's context window
- The same mistakes repeat because there's no learning mechanism between sessions

## The solution

22 skills that enforce a **spec → implement → review → fix → test** pipeline, with file-based handoffs between phases and guardrails that catch scope creep, recurring bugs, and quality regressions automatically.

---

## Quick start

**1. Add the framework to your project:**

Option A — **Symlink** (recommended): keeps all projects in sync with one source of truth.

```bash
git clone https://github.com/holgerimbery/claude-code-framework.git ~/claude-code-framework
ln -s ~/claude-code-framework/.claude/skills your-project/.claude/skills
ln -s ~/claude-code-framework/.claude/hooks your-project/.claude/hooks
ln -s ~/claude-code-framework/.claude/context your-project/.claude/context
```

Project-specific directories (`input/`, `specs/`, `reviews/`, `handoffs/`) stay local — only the shared framework pieces are symlinked. Update the framework once, every project gets the latest skills.

Option B — **Copy**: full ownership, diverge freely.

```bash
git clone https://github.com/holgerimbery/claude-code-framework.git
cp -r claude-code-framework/.claude your-project/
```

**2. Update `CLAUDE.md`** in your project root with your tech stack, commands, and architecture.

**3. Drop your requirements into `.claude/input/`:**

Put anything that describes what you want to build — PRDs, requirement docs, sketches, wireframes, screenshots, API specs, PDFs, plain text notes. The spec phase reads everything in this directory as the primary source of truth.

```
.claude/input/
  auth-prd.md          # product requirements document
  login-wireframe.png  # UI sketch
  api-contract.yaml    # API specification
```

**4. Ship it:**

```
/ship add user authentication
```

`/ship` orchestrates the entire pipeline automatically — spec (from your input docs), implement, review, fix loop, lesson graduation, and commit — each phase in a clean subagent. After the spec is written, processed input files move to `.claude/archive/`.

### Or run phases manually

```bash
# Drop requirements into .claude/input/, then write the spec
/0_spec add user authentication

# Implement (enters plan mode first)
/1_implement user-authentication

# Fresh session for unbiased review
/clear
/2_review user-authentication
/3_fix user-authentication-review

# Smoke test against Docker (optional)
/smoke user-authentication

# Commit when clean
/commit
```

---

## `/ship` — the orchestrator

`/ship` is a thin orchestrator that never accumulates implementation context. Each phase runs in a dedicated subagent; **files on disk are the handoff mechanism** between them.

```
/ship <feature description>
    │
    ├─ 0. Create feature branch
    ├─ 1. Front-load all questions (single batch)
    ├─ 1b. Historical pattern analysis        → reads metrics-pipeline.csv → builds spec guidance
    ├─ 2. ▸ Subagent: /0_spec        [opus]   → writes spec file (informed by patterns)
    ├─ 3. ▸ Subagent: /1_implement   [opus]   → implements with TDD
    ├─ 4. ▸ Subagent: /2_review      [opus]   → review report
    │   └─ Subagent: /3_fix          [sonnet] → fix → re-review (max 3 cycles)
    ├─ 4b. Lesson graduation                  → matures lessons → CLAUDE.md rules
    ├─ 4c. Integration check        [opus]   → cross-phase glue review (phased only)
    ├─ 5. Final verify gate                   → typecheck → lint → tests → build
    ├─ 6. ▸ Subagent: /commit        [sonnet] → atomic conventional commits
    └─ 7. Finalize: merge / PR / branch / smoke
```

**Model routing:** Opus for phases that require deep reasoning (spec, implement, review). Sonnet for mechanical phases (fix, commit) — faster and cheaper without sacrificing quality.

**Built-in guardrails:**

- Complexity gate — stops if >10 files need changing, suggests decomposition
- Review circuit breaker — escalates after 3 fix cycles without resolution
- Recurring issue detection — if the same issue appears twice, escalates instead of retrying
- Lesson graduation — proven corrections become permanent rules in `CLAUDE.md`
- Metrics tracking — appends pipeline stats to `.claude/metrics-pipeline.csv` after every run
- **Dry-run mode** — `/ship --dry-run <feature>` runs only the spec phase, reports scope and complexity, then stops. No branch, no implementation, no commits. Review the spec before committing to a full pipeline run.

---

## All skills

### Core pipeline

| Skill                 | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `/decompose`          | Break a concept doc or product brief into independent PRDs, then ship each   |
| `/ship <feature>`     | Full pipeline orchestrator — spec → implement → review → fix → commit        |
| `/0_spec <feature>`   | Write a structured spec from requirements in `.claude/input/`                |
| `/1_implement <spec>` | Implement with mandatory plan approval, TDD enforcement, and impact analysis |
| `/2_review [spec]`    | 9-lens code review with severity classification and spec completeness check  |
| `/3_fix [review]`     | Fix issues by severity (critical → major → minor) with circuit breaker       |
| `/test [file]`        | Run typecheck → lint → tests → build (report only, no fixes)                 |

### Development tools

| Skill                 | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `/commit`             | Atomic conventional commits with multi-concern detection                           |
| `/debug`              | Diagnose and fix a failing test, type error, or runtime error                      |
| `/impact <function>`  | Blast radius analysis — find all call sites, test mocks, and consumers (read-only) |
| `/smoke [spec]`       | Write and run smoke tests against a Docker stack from a spec                       |
| `/audit`              | Find and fix vulnerable dependencies across package managers                       |
| `/healthcheck`        | Scan Docker container logs for errors, crashes, and warnings                       |
| `/create-hook`        | Scaffold a Claude Code lifecycle hook                                              |
| `/harvest <repo-url>` | Clone and analyze a repo's Claude Code setup; generate adoption proposals          |
| `/deploy <path>`      | Deploy framework to a project via symlinks (junctions on Windows)                  |

### Knowledge & session management

| Skill       | Purpose                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| `/learn`           | Process blog posts and repos into the knowledge base; propose skill improvements |
| `/scout`           | Search the web for new Claude Code patterns and suggest framework optimizations  |
| `/apply-proposals` | Apply accepted proposals from learn-proposals.md to skill/rule files             |
| `/doc`             | Regenerate `.claude/docs/` from current skills and context                       |
| `/handoff`         | Capture session state before `/clear`                                            |
| `/continue`        | Resume from a handoff file in a new session                                      |

All skills are **technology-agnostic** — they read project commands from `CLAUDE.md`, so they work with Node, Python, Rust, Go, or any other stack.

---

## Pipeline guardrails

The framework doesn't just run phases — it enforces quality at every step. All numeric thresholds are configurable in `CLAUDE.md` under `## Framework thresholds`:

| Guardrail                  | Where          | What it does                                                                                    |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| **Complexity flag**        | `/0_spec`      | Warns when spec implies >10 files; suggests decomposition                                       |
| **Ambiguity gate**         | `/0_spec`      | Blocks on vague requirements; surfaces clarifying questions                                     |
| **TDD enforcement**        | `/1_implement` | Red-green cycle — test must fail before implementation                                          |
| **Impact analysis**        | `/1_implement` | Checks blast radius before modifying shared function signatures                                 |
| **Pre-flight self-review** | `/1_implement` | Checks 6 lenses before handing off to review                                                    |
| **Phase support**          | `/1_implement` | Splits large features into multi-phase implementation                                           |
| **Delta review**           | `/2_review`    | Cycle 2+ only reviews changes since last fix                                                    |
| **9-lens review**          | `/2_review`    | Correctness, code quality, security, tests, UX, PM, DevOps, spec validation, spec completeness  |
| **Spec completeness**      | `/2_review`    | Walks every requirement from the spec; missing = critical, partial = major                      |
| **Circuit breaker**        | `/3_fix`       | Escalates recurring issues instead of retrying                                                  |
| **Lessons capture**        | `/3_fix`       | Writes preventive rules to `context/lessons.md`                                                 |
| **Lesson graduation**      | `/ship`        | Matures proven lessons into permanent one-line rules in `CLAUDE.md`                             |
| **Integration check**      | `/ship`        | After all phases complete, verifies data flow, interface contracts, and glue code across phases |
| **Spec sync**              | `/3_fix`       | Updates spec if fixes diverged from requirements                                                |
| **Metrics**                | `/ship`        | Tracks files changed, review cycles, issues, area, and issue categories per feature             |
| **Historical patterns**    | `/ship`        | Reads metrics history; auto-refines spec depth in areas with recurring review friction          |

All numeric thresholds have sensible defaults but can be tuned per project. Add a `## Framework thresholds` section to your `CLAUDE.md` to override any of them:

| Threshold                     | Default | What it controls                                                           |
| ----------------------------- | ------- | -------------------------------------------------------------------------- |
| `complexity_gate_max_files`   | 10      | Max files before spec/implement triggers a decomposition warning           |
| `review_fix_max_cycles`       | 3       | Max review → fix iterations before `/ship` escalates                       |
| `lesson_graduation_age_days`  | 14      | Days before a lesson graduates from inbox to permanent CLAUDE.md rule      |
| `delta_review_escalation_pct` | 50      | % of original diff size that triggers escalation from delta to full review |

If the section is omitted, all defaults apply — zero configuration required.

---

## How the framework learns

The framework has two learning channels that reinforce each other:

### Channel 1: Rule-based learning (lessons → CLAUDE.md)

```
/3_fix captures a correction
    → writes to context/lessons.md (inbox)
    → all future sessions read this on startup

After 14+ days, /ship graduates proven lessons:
    → one-line rule appended to CLAUDE.md (permanent)
    → lesson removed from inbox
    → every future session enforces the rule automatically
```

### Channel 2: Pattern-based learning (metrics → spec refinement)

```
/ship completes → appends metrics row (area, review cycles, issue categories)
    ↓
Next /ship in same area → reads metrics-pipeline.csv
    ↓
Detects: "api features average 2.8 review cycles, recurring: validation, edge-cases"
    ↓
Passes pattern context to /0_spec → spec adds explicit validation rules + edge case sections
    ↓
Better spec → fewer review issues → metrics improve over time
```

This is a **self-improving loop**: the framework doesn't just remember _rules_ — it recognizes _patterns_ across runs and automatically produces more detailed specs in areas that historically cause review friction.

**Instincts** (`.claude/context/instincts.md`) are universal rules loaded every session: read before editing, no speculative code, never skip typecheck, plan mode for 3+ step tasks.

**Lessons** (`.claude/context/lessons.md`) are the inbox — corrections captured during review cycles. They graduate into permanent `CLAUDE.md` rules once proven over time.

**Metrics** are split into two files: `.claude/metrics-pipeline.csv` (pipeline run data, read by `/ship` to guide spec depth) and `.claude/metrics-scout.csv` (scout and harvest run data).

This means the framework gets stricter, more project-aware, and more precise with every feature shipped.

---

## Project structure

```
.claude/
  skills/          ← 22 skills defining the full pipeline
  agents/          ← subagent personas (code-reviewer, explorer)
  rules/           ← auto-loaded instructions (like CLAUDE.md shards)
  context/         ← curated knowledge read by all skills
    instincts.md   ← universal rules loaded every session
    lessons.md     ← corrections inbox (graduates to CLAUDE.md)
  hooks/           ← lifecycle hooks (auto-approve, safety guards)
  docs/            ← generated documentation
  references/      ← drop zone for blog posts and repos (+ harvested repos)
  specs/           ← generated feature specs
  reviews/         ← review reports + learn proposals
  input/           ← drop zone for PRDs, wireframes, sketches, requirement docs
  handoffs/        ← session state files (gitignored)
  metrics-pipeline.csv  ← /ship pipeline run log (append-only)
  metrics-scout.csv     ← /scout and /harvest run log (append-only)
```

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
    → Extracts insights → updates context/
    → Proposes skill improvements (user reviews before applying)
    → Runs /doc to regenerate documentation
    → All future sessions benefit
```

`/learn` is safe — it proposes skill changes but never applies them directly. Proposals go to `.claude/reviews/learn-proposals.md` for review.

Processed files are moved to `processed/` so `/learn` is idempotent.

### Staying current

`/scout` searches the web for new Claude Code features, community skills, and best practices, then compares them against the current framework. It also discovers GitHub repos with Claude Code setups worth analyzing:

```
/scout              # Full analysis — fetches top 5 results, discovers repos, writes report
/scout --quick      # Titles and links only — fast scan
```

Scout reports go to `.claude/references/blogs/scout-<date>.md`. Promising links feed into `/learn`; discovered repos feed into `/harvest`.

### Harvesting repos

`/harvest` clones a GitHub repo, inventories its `.claude/` setup (skills, hooks, agents, rules), and compares against the framework. Items classified as `new` or `enhancement` become adoption proposals:

```
/harvest https://github.com/someone/cool-claude-setup
/harvest https://github.com/anthropics/skills --deep    # Line-level comparison
```

The three skills chain naturally: `/scout` discovers repos → `/harvest` analyzes them → `/learn` integrates accepted patterns into the knowledge base.

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

## Metrics

`/ship` appends one row to `.claude/metrics-pipeline.csv` after every pipeline run:

```
date,spec,area,files_changed,review_cycles,issues_found,issues_critical,issues_major,issue_categories,commits,outcome
2026-03-15,user-auth,auth,8,1,3,0,2,validation,2,shipped
2026-03-17,file-upload,api,12,2,7,1,4,validation;edge-cases,3,shipped
```

This is append-only — open in any spreadsheet or `column -t -s, .claude/metrics-pipeline.csv` to spot trends like rising review cycles or recurring issue categories. Scout and harvest metrics are tracked separately in `.claude/metrics-scout.csv`.

---

## Further reading

- [Framework overview](.claude/docs/README.md)
- [Workflow rationale](.claude/docs/workflow.md)
- [Skills reference](.claude/docs/skills-reference.md)
- [Knowledge base](.claude/docs/knowledge-base.md)

---

## License

MIT
