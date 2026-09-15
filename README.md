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

26 skills that enforce a **spec → implement → review → fix → test** pipeline, with file-based handoffs between phases, a machine-checkable spec contract that the pipeline executes as a gate, and guardrails that catch scope creep, recurring bugs, and quality regressions automatically.

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
# Single feature:
/ship add user authentication

# Multiple features in parallel:
/decompose                    # break concept into PRDs
/fleet                        # parallel /ship with conflict-aware batching
```

`/ship` orchestrates the entire pipeline automatically — spec (from your input docs), implement, review, fix loop, lesson graduation, and commit — each phase in a clean subagent. After the spec is written, processed input files move to `.claude/archive/`.

`/fleet` takes decomposed PRDs, analyzes file conflicts across features, groups non-conflicting features into parallel batches, runs `/ship` for each in isolated worktrees, and merges results back to main conflict-free.

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
/ship <ticket-id | prd | feature description>
    │
    ├─ 0.  Branch setup                        → ticket branch from origin/<main>
    ├─ 0b. Ticket resolution                   → loads the work item from the tracker (if configured)
    ├─ 0c. Complexity classifier               → fast path or full pipeline
    │
    │   [fast path]
    ├─ F.  ▸ Subagent: implement    [fable]   → implements directly from the ticket
    │
    │   [full pipeline]
    ├─ 1.  Front-load all questions (single batch)
    ├─ 2.  ▸ Subagent: /0_spec       [opus]   → writes spec file incl. ## Contract
    ├─ 3.  ▸ Subagent: /1_implement  [fable]  → implements with TDD, runs the contract gate
    ├─ 4.  ▸ Subagent: /2_review     [opus]   → review report with per-item contract verdict
    │   └─ Subagent: /3_fix          [sonnet] → fix → re-review (max 3 cycles)
    ├─ 4b. Lesson graduation                   → moves mature lessons → archive + CLAUDE.md rule
    ├─ 4c. Integration check        [opus]    → cross-phase glue review (phased only)
    │
    │   [both paths rejoin]
    ├─ 5.  Contract gate                       → verify suite + every Contract verify command
    ├─ 5b. Changelog entry                     → changelog/<branch>.md incl. Manual Steps
    ├─ 6.  ▸ Subagent: /commit       [sonnet] → atomic conventional commits
    ├─ 6b. Tracker feedback                    → derived fields + at most one comment
    ├─ 7a. Finalize gate                       → summary + contract coverage, waits for yes
    └─ 7b. Push + finalize                     → pushes branch, transitions the ticket
```

**Model routing:** Opus for phases that require deep reasoning (spec, review, critical fixes). Fable for implementation. Sonnet for mechanical phases (simple fixes, commit) — faster and cheaper without sacrificing quality.

**Built-in guardrails:**

- **Contract gate** — every acceptance criterion in the spec is bound to a command that exits 0 only when the criterion holds; `/ship` runs them all before committing. A failing check is never fixed by editing the contract.
- Complexity gate — stops if >10 production files need changing, suggests decomposition
- Review circuit breaker — escalates after 3 fix cycles without resolution
- Recurring issue detection — if the same issue appears twice, escalates instead of retrying
- Lesson graduation — proven corrections become permanent rules in `CLAUDE.md`; nothing is ever deleted, entries move to an archive
- **Fast path** — trivial tickets (narrow scope, no new behaviour, no decisions, no restricted areas) skip spec and review; `--fast` / `--full` override the classifier
- **Dry-run mode** — `/ship --dry-run <feature>` runs only the spec phase, reports scope and complexity, then stops. No branch, no implementation, no commits. Review the spec before committing to a full pipeline run.
- **No-finalize mode** — `/ship --no-finalize <feature>` runs the full pipeline but skips push and state change. Used by `/fleet` to manage merges centrally.

---

## All skills

### Core pipeline

| Skill                 | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `/decompose`          | Break a concept doc or product brief into independent PRDs, then ship each   |
| `/fleet`              | Ship decomposed PRDs in parallel — conflict analysis, batched worktrees, merge to main |
| `/ship <feature>`     | Full pipeline orchestrator — spec → implement → review → fix → commit (`--dry-run`, `--no-finalize`, `--fast`/`--full`) |
| `/0_spec <feature>`   | Write a structured spec from requirements in `.claude/input/`, incl. a machine-checkable `## Contract` |
| `/1_implement <spec>` | Implement with mandatory plan approval, TDD enforcement, impact analysis, and the contract gate |
| `/2_review [spec]`    | 10-lens code review with severity classification, per-item contract verdict, and spec completeness check |
| `/3_fix [review]`     | Fix issues by severity (critical → major → minor) with circuit breaker       |
| `/test [file]`        | Run typecheck → lint → tests → build (report only, no fixes)                 |

### Development tools

| Skill                 | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `/commit`             | Atomic conventional commits with multi-concern detection                           |
| `/changelog`          | Write the per-ticket `changelog/<branch>.md` (Summary, Manual Steps) outside `/ship` |
| `/release <quarter>`  | Cut a quarterly release branch, generate notes, tag the cut (gated before push)    |
| `/release-notes`      | Aggregate per-ticket changelogs into `releases/<quarter>.md`                       |
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

## Azure DevOps integration (optional)

The framework ships with an optional MCP (Model Context Protocol) server that gives Claude Code read + write access to Azure DevOps work items. When configured, `/ship <ticketId>` automatically loads the ticket from DevOps — no manual copy & paste. When not configured, everything works as before; the MCP integration is simply skipped.

### What it enables

| Pipeline step | Without MCP | With MCP |
|---|---|---|
| **Ticket resolution** | User provides feature description manually | Auto-loads title + description + acceptance criteria + all comments from the work item |
| **Branch naming** | User answers questions | Auto-derived from ticket metadata per `.claude/rules/branch-management.md` |
| **After commit** | Nothing | Non-obvious context posted as a comment (only when needed — not boilerplate) |
| **After push** | Nothing | Work item state transitioned (e.g. → Resolved / Development finished) |
| **`/commit` on ticket branch** | Standard conventional commit | Appends ` #<ticketId>` if the branch name matches the project's convention |

### Setup (one-time per developer)

1. Update `.mcp.json` at the repo root — replace `your-org` and `your-project` with your Azure DevOps organisation and project
2. Create a PAT at `https://dev.azure.com/<your-org>/_usersSettings/tokens` with **Work Items > Read & Write** scope
3. Create `.claude/mcp-servers/azure-devops/.env` (gitignored):
   ```
   AZURE_DEVOPS_PAT=your-token-here
   ```
4. Build the server:
   ```bash
   cd .claude/mcp-servers/azure-devops
   npm install
   npm run build
   ```
5. Reload VS Code (`Ctrl+Shift+P` → *Developer: Reload Window*)

Each developer maintains their own `.env`. Without a PAT the MCP server simply doesn't start and the framework falls back to the non-MCP path.

### Available tools (13)

Read — `ado_get_work_item`, `ado_get_work_item_with_context`, `ado_search_work_items`, `ado_get_work_item_comments`, `ado_download_attachments`
Write — `ado_create_work_item`, `ado_update_work_item`, `ado_update_work_item_state`, `ado_link_work_items`, `ado_add_work_item_comment`, `ado_update_work_item_comment`, `ado_delete_work_item_comment`, `ado_upload_attachment`

See [`.claude/mcp-servers/azure-devops/README.md`](.claude/mcp-servers/azure-devops/README.md) for full documentation.

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
| **Contract**               | `/0_spec`      | Every acceptance criterion bound to a `verify` command (or an honest `manual` reason)           |
| **Test strategy**          | `/0_spec`      | Every spec declares `test-required` / `test-recommended` / `no-test-needed:<category>`          |
| **Contract gate**          | `/1_implement`, `/3_fix`, `/ship` | Runs every `verify` command and gates on the exit code; editing the contract is never a fix |
| **10-lens review**         | `/2_review`    | Correctness, code quality, security, tests, UX, PM, DevOps, contract validation, spec completeness, test strategy |
| **Spec completeness**      | `/2_review`    | Walks every requirement from the spec; missing = critical, partial = major                      |
| **Circuit breaker**        | `/3_fix`       | Escalates recurring issues instead of retrying                                                  |
| **Lessons capture**        | `/3_fix`       | Writes preventive rules to `context/lessons.md`, classified by error mechanism                  |
| **Lesson graduation**      | `/ship`        | Moves proven lessons to the archive and appends a one-line rule to `CLAUDE.md`                  |
| **Integration check**      | `/ship`        | After all phases complete, verifies data flow, interface contracts, and glue code across phases |
| **Spec anchoring**         | `/3_fix`       | Never edits the spec; divergence is documented and left to the user                             |
| **Fast path**              | `/ship`        | Trivial tickets skip spec and review after a 4-signal classifier                                |

All numeric thresholds have sensible defaults but can be tuned per project. Add a `## Framework thresholds` section to your `CLAUDE.md` to override any of them:

| Threshold                     | Default | What it controls                                                           |
| ----------------------------- | ------- | -------------------------------------------------------------------------- |
| `complexity_gate_max_files`   | 10      | Max files before spec/implement triggers a decomposition warning           |
| `review_fix_max_cycles`       | 3       | Max review → fix iterations before `/ship` escalates                       |
| `lesson_graduation_age_days`  | 14      | Days before a lesson graduates from inbox to permanent CLAUDE.md rule      |
| `delta_review_escalation_pct` | 50      | % of original diff size that triggers escalation from delta to full review |
| `contract_manual_max_pct`     | 40      | Share of `manual` contract items above which the finalize gate warns       |

If the section is omitted, all defaults apply — zero configuration required.

---

## How the framework learns

The framework has two learning channels that reinforce each other:

### Channel 1: Rule-based learning (lessons → CLAUDE.md)

```
/3_fix captures a correction
    → writes to context/lessons.md (inbox), tagged with scope + error class
    → all future sessions read this on startup

After 14+ days, /ship graduates proven lessons:
    → one-line rule appended to CLAUDE.md (permanent)
    → full entry moved to context/lessons-archive/graduated.md (never deleted)
    → every future session enforces the rule automatically
```

### Channel 2: Error-class cycle (lessons → mechanisms → skill changes)

```
Every lesson carries a class: from a closed taxonomy (lesson-cycle.md)
    ↓
node .claude/scripts/lesson-cycle.mjs --mode report → lessons per class, close due?
    ↓
Once a month a human closes the cycle → entries archived losslessly per cycle
    ↓
Classes that keep filling up point at a mechanism, not a defect
    ↓
Fix the mechanism: a rule, a skill step, a hook — not the single symptom
```

The unit of improvement is the **error class**, not the individual mistake: "test does not prove what it claims", "silent semantic regression for untouched callers", "incomplete sweep", "guard fails open" and so on. Counting per class shows which mechanisms the pipeline keeps producing — that is what a rule, a skill change, or a hook should target.

**Instincts** (`.claude/rules/instincts.md`) are universal rules loaded every session: read before editing, no speculative code, never skip typecheck, plan mode for 3+ step tasks.

**Lessons** (`.claude/context/lessons.md`) are the inbox for the open cycle — corrections captured during review cycles. Closed cycles live in `.claude/context/lessons-archive/`; archived does not mean obsolete.

This means the framework gets stricter, more project-aware, and more precise with every feature shipped.

---

## Project structure

```
.claude/
  skills/          ← 26 skills defining the full pipeline
  agents/          ← subagent personas (code-reviewer, explorer)
  rules/           ← auto-loaded instructions (like CLAUDE.md shards)
    instincts.md   ← universal rules loaded every session
  scripts/         ← framework tooling (lesson-cycle.mjs + tests)
  context/         ← curated knowledge read by all skills
    lessons.md         ← corrections inbox for the open cycle (graduates to CLAUDE.md)
    lesson-cycle.md    ← error-class taxonomy + cycle definition
    lessons-archive/   ← closed cycles + graduated lessons (lossless)
  hooks/           ← lifecycle hooks (auto-approve, safety guards, commit-message validation)
  mcp-servers/     ← optional MCP servers (e.g. Azure DevOps integration)
  docs/            ← generated documentation
  references/      ← drop zone for blog posts and repos (+ harvested repos)
  specs/           ← generated feature specs
  reviews/         ← review reports + learn proposals
  input/           ← drop zone for PRDs, wireframes, sketches, requirement docs
  handoffs/        ← session state files (gitignored)
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

`/scout` and `/harvest` append one row per run to `.claude/metrics-scout.csv` (append-only — open in any spreadsheet). Pipeline quality is tracked through the lesson cycle instead of a per-run CSV: `node .claude/scripts/lesson-cycle.mjs --mode report` prints lessons per error class and whether a cycle close is due.

---

## Further reading

- [Framework overview](.claude/docs/README.md)
- [Workflow rationale](.claude/docs/workflow.md)
- [Skills reference](.claude/docs/skills-reference.md)
- [Knowledge base](.claude/docs/knowledge-base.md)
- [Changelog](.claude/docs/README.md#changelog) — one row per framework change, maintained with every skill/feature update

---

## License

MIT
