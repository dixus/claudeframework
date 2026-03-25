# Claude Code Knowledge Base — Distilled from External Sources

Maintained by `/learn`. Insights extracted from blog posts, scout reports, and community repos.
Used by `/learn` during skill review to propose improvements. Not a workflow definition.

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

| Signal                              | Action                                         |
| ----------------------------------- | ---------------------------------------------- |
| Starting a new unrelated task       | `/clear`                                       |
| Claude wrong 2+ times on same issue | `/clear` + rewrite prompt with lessons learned |
| Exploring a large codebase          | Use a subagent — keeps main context clean      |
| Resuming previous work              | `claude --continue` or `claude --resume`       |

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

For each line in CLAUDE.md, ask: _"Would removing this cause Claude to make mistakes?"_ If not, cut it. Prune monthly. An overloaded CLAUDE.md is almost as bad as none — important rules get lost in noise. Target: under ~80 lines for the root file.

Run `/init` to auto-generate a starter CLAUDE.md from the codebase, then refine.

### Task decomposition threshold

Before starting a task: _"Could a senior engineer complete this in one focused session?"_ If not, decompose it. Accuracy drops noticeably beyond ~15 file modifications in a single context. One task → one session → verify independently → move on.

### Verification loop (include tests in every task)

Specify test requirements in every task description. Claude writes the code AND the tests. If tests pass, probably good. This eliminates roughly 80% of debugging sessions because Claude can see failure output and self-correct in the same session. "Never trust, always verify" — don't review output visually; let tests be the oracle.

### Spec-driven development levels (Heeki Park, 2026-03-02)

Three levels, in increasing commitment to the spec as source of truth:

1. **spec-first** — write a thorough spec, implement from it; spec may drift after that
2. **spec-anchored** — keep spec alive and update it when course-correcting; spec and code stay in sync
3. **spec-as-source** — only the human edits the spec; Claude regenerates code from spec on every change

Target: **spec-anchored** for this project. At each course-correction, update the spec before continuing. This keeps the original intent visible and prevents context drift across sessions.

Standard prompt pattern to kick off spec creation:

> _"Start by creating a specification document and allow for iteration before starting implementation. Ask clarifying questions, as needed, using selectable inputs to make clarifying responses simpler. Write the specification as SPECIFICATIONS.md at the root of the project."_

## Added 2026-03-02 (batch 2)

### Agent Teams vs Subagents (Reza Rezvani, Feb 2026)

Subagents = hub-and-spoke (parent orchestrates; contractors work independently, report back). Agent Teams = peer-to-peer (shared task board; teammates message each other directly without routing through the parent).

**Enable Agent Teams** (experimental as of Feb 2026): add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to the `env` block in `settings.json`.

**Decision matrix:**

| Use Agent Teams when                                                             | Use Subagents when                                                       | Use Single Session when                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Parallel exploration (same problem, multiple approaches tested simultaneously)   | Focused, isolated tasks (code review on one file)                        | Same-file edits (multiple agents → merge conflicts)        |
| Cross-domain coordination (security + perf + tests — findings affect each other) | Token-conscious work (subagents are lighter)                             | Simple tasks (if one agent needs 10 min, don't spawn five) |
| Research-heavy tasks (synthesize multiple perspectives before building)          | Well-defined scope (no exploration needed)                               | Debugging (iterative back-and-forth)                       |
| Competing hypotheses (let agents argue it out)                                   | Sequential dependencies (Step 2 truly can't start until Step 1 finishes) | Context-heavy work (full picture matters more than speed)  |

**Rule of thumb:** if you can describe the task in one sentence, use one agent. If 3+ distinct workstreams benefit from different perspectives, consider a team.

**Known limitations:** no shared filesystem between teammates (plan artifacts as messages, not files), token usage scales roughly linearly with team size, one team per session, task status can lag.

**Sweet spot:** 3–4 teammates for daily work. At 5+ the coordination overhead starts to outweigh the parallelism gain.

### /simplify and /batch built-in commands (Joe Njenga, Feb 2026)

Native Claude Code commands available since v2.1.63:

- **`/simplify`** — run after making code changes; launches 3 parallel agents (code reuse review, code quality review, efficiency review) that check against your CLAUDE.md rules and apply all fixes in one pass. Catches: dead code, commented-out blocks, redundant logic, code smells, CLAUDE.md violations.

- **`/batch`** — for large-scale parallel migrations; enters plan mode first, explores scope, asks one clarifying question about end-to-end verification, creates per-file work units, and runs each in an isolated git worktree where each agent verifies its own work. Example: `/batch migrate src/ from Jest to Vitest`.

Recommended workflow when migrating or refactoring: make changes → `/simplify` (quality pass) → `/2_review` (unbiased fresh session).

### CLAUDE.md as a behavioral contract (Youssef Hosni, Feb 2026)

CLAUDE.md is a behavioral contract — it defines HOW to work, not WHAT to build. Beyond the existing "under 80 lines" rule, the most impactful sections to add:

- **Verification Before Done**: never mark complete without proof. Gate: "Would a staff engineer approve this?" Diff behavior between main and your changes. Run tests, check logs, demonstrate correctness.
- **Self-Improvement Loop**: after any user correction, write a rule to prevent the same mistake. Review lessons at session start. Ruthlessly iterate until mistake rate drops.
- **Demand Elegance (Balanced)**: for non-trivial changes, pause and ask "is there a more elegant way?" Skip for simple, obvious fixes — don't over-engineer.
- **Autonomous Bug Fixing**: when given a bug report, investigate independently (logs, errors, failing tests) — no hand-holding. Fix root causes, not symptoms.
- **Core principles**: Simplicity First, No Laziness (root causes not patches), Minimal Impact (only touch what's necessary).

### Permission Hook: 3-tier permission system (Code Coup, Feb 2026)

Middle ground between full manual approval and `--dangerously-skip-permissions`. Hooks into Claude Code's `PermissionRequest` event with a three-tier decision:

- **Tier 1 — Fast Approve** (no latency, no cost): Read, Glob, Grep, WebFetch, WebSearch, Write, Edit, MultiEdit, NotebookEdit, TodoWrite, Task, all MCP tools — most operations land here
- **Tier 2 — Fast Deny** (never execute): `rm -rf /`, `git push --force origin main`, `mkfs`, fork bombs
- **Tier 3 — LLM Analysis** (results cached 168 h, ~$1 per 5 000 decisions): ambiguous commands evaluated by a lightweight LLM (e.g. gpt-4o-mini via OpenRouter)

Wire it into `settings.json`: `{"hooks": {"PermissionRequest": [{"matcher": "*", "hooks": [{"type": "command", "command": "cf-approve permission"}]}]}}`. Device-level: `~/.claude/settings.json`; project-level: `.claude/settings.local.json`.

## Added 2026-03-02 (batch 3)

### Agentic TDD loop (Habib Mrad, Dec 2025)

The closed feedback loop for implementation quality:

1. Write tests first (from spec test cases)
2. Run them — confirm they **fail** (red)
3. Implement until they **pass** (green)

Claude sees its own failure output and self-corrects within the same session. This eliminates ~80% of debugging sessions vs writing code then tests after. Never trust visual output — let tests be the oracle.

### Visual iteration loops

When working on UI or data visualization:

1. Provide mocks, wireframes, or screenshots in `.claude/input/` alongside requirements
2. Let Claude generate the initial output
3. Take a screenshot and share it back as feedback
4. Iterate

Claude's performance on visual tasks improves significantly with perceptual feedback. Screenshots are valid spec input — treat them as first-class requirements.

### Autonomy isolation (blast radius principle)

Two distinct operating modes:

- **Exploratory mode** (high supervision): unfamiliar codebase, high-stakes changes — keep permissions tight, approve each action
- **Execution mode** (high autonomy): well-understood, reversible tasks — can use `--dangerously-skip-permissions` safely

**Blast radius rule**: autonomy is safe when consequences are bounded. Isolate high-autonomy sessions in containers with network disabled. Use for reversible tasks (linting, boilerplate, migrations with clear rollback). Never use for production deployments or irreversible operations without a checkpoint.

### Headless mode (Claude as infrastructure)

Claude Code can run as a headless programmable component, not just an interactive assistant:

- CI pipelines — automated code review on every PR
- Issue triage bots — classify, label, suggest fixes
- Data processing pipelines — transform, validate, summarize

Entry point: `claude -p "<task>"` or `claude --headless`. At this level, Claude is part of the system architecture — test it like any other component.

### Custom tool documentation in CLAUDE.md

For non-standard scripts and tools, add to CLAUDE.md:

- What the script does
- Example invocation
- When to use it

Prompt Claude to run `--help` on unfamiliar tools before using them. Tools Claude cannot understand are tools Claude cannot use effectively.

## Added 2026-03-02 (batch 4 — awesome-claude-code repo)

### Hook implementation technical standards

From the `create-hook` slash command pattern (hesreallyhim/awesome-claude-code):

**Input/Output — the most common failure point:**

- Input: always read JSON from `stdin` — never `argv`. Pattern: `JSON.parse(process.stdin.read())`
- Success response: `{continue: true, suppressOutput: true}` — keeps context clean
- Error response: `{continue: true, additionalContext: "error details"}` — lets Claude auto-fix
- Block operation (PreToolUse only): `exit(2)`

**Hook event types:**

- `PreToolUse`: runs before a tool call; can block (exit 2). Use for security/validation gates
- `PostToolUse`: runs after; provides feedback/auto-fixes. Use for quality enforcement
- `UserPromptSubmit`: runs before Claude processes a user message

**Hooks run in parallel** — design each hook to be independent; don't rely on execution order.

**Project tooling → suggested hooks:**
| Detected | Hook suggestion |
|---|---|
| `tsconfig.json` | PostToolUse: type-check after edit; PreToolUse: block with type errors |
| `.prettierrc` | PostToolUse: auto-format after edit |
| `.eslintrc.*` | PostToolUse: lint + auto-fix after edit |
| `test` script in package.json | PreToolUse: run tests before commits |
| git repo | PreToolUse: scan for secrets before commit |

**Scope:** `global` (`~/.claude/hooks/`), `project` (`.claude/hooks/`), `project-local` (`.claude/settings.local.json`).

**Use `$CLAUDE_PROJECT_DIR`** in hook scripts to reference the project root — never relative paths.

### Multi-role PR review (6 lenses)

From the `pr-review` slash command (hesreallyhim/awesome-claude-code). Systematic review from 6 perspectives:

1. **PM lens** — business value, UX impact, strategic alignment
2. **Developer lens** — code quality, readability, performance, standards
3. **QA lens** — test coverage, edge cases, regression risk
4. **Security lens** — vulnerabilities, data handling, compliance (OWASP, GDPR)
5. **DevOps lens** — CI/CD integration, infrastructure config, monitoring
6. **UI/UX lens** — visual consistency, accessibility (WCAG AA+), interaction flow

Principle: "The future is now" — any "future" improvements identified in a review must be fixed immediately, not deferred.

### PRP concept (Product Requirement Prompt)

A PRP = PRD + curated codebase intelligence + implementation runbook. It is the minimum viable packet an AI needs to ship production-ready code on the first pass.

Vs. our `/0_spec`: a spec describes WHAT to build; a PRP packages the spec with WHERE to look in the codebase and HOW to verify correctness. Our spec's "Affected files" + "Test cases" sections are the codebase intelligence and runbook, respectively. The spec is effectively a PRP.

Improvement target: ensure each spec explicitly answers "what existing patterns should the implementation mirror?" (codebase intelligence) and "how do we know it's done?" (validation criteria).

### Commit quality pattern

From the `commit` slash command (hesreallyhim/awesome-claude-code):

- Use conventional commit format: `<emoji> <type>: <description>` (e.g. `✨ feat: add user auth`)
- Common type → emoji mappings: `feat` ✨, `fix` 🐛, `docs` 📝, `refactor` ♻️, `test` ✅, `chore` 🔧, `perf` ⚡️
- Before committing: analyze the diff for distinct logical concerns; if multiple concerns → split into multiple atomic commits
- Run pre-commit checks (lint → build → docs) before each commit
- First line under 72 characters; present tense imperative mood ("add feature" not "added feature")

### Design review with live browser testing

From the Design-Review-Workflow resource (hesreallyhim/awesome-claude-code):

- Use **Playwright MCP** server to test actual UI components in real-time (not just static code analysis)
- Store design principles and brand guidelines in CLAUDE.md so they're always loaded
- Review phases: interaction flows → responsiveness → visual polish → accessibility → robustness → code health
- Trigger automatically via GitHub Actions on PRs, or on-demand via slash command

## Added 2026-03-23

### New CLI flags and frontmatter (v2.1.78–v2.1.81)

- **`--bare` flag** (v2.1.81): For scripted `-p` calls — skips hooks, LSP, and plugin sync. Use in CI pipelines for faster headless execution. Entry point: `claude --bare -p "<task>"`.
- **`maxTurns` frontmatter** (v2.1.78): Caps the number of turns a subagent or skill can take. Use as a circuit breaker complement (e.g., `maxTurns: 15` in `/3_fix` prevents infinite fix loops).
- **`disallowedTools` frontmatter** (v2.1.78): Restrict which tools a skill or agent can use. Example: `/2_review` should use `disallowedTools: [Edit, Write, Bash]` to enforce read-only review.
- **`${CLAUDE_SKILL_DIR}` variable** (v2.1.71): Skills can reference co-located scripts, templates, and data files in their own directory. Useful for `/smoke`, `/create-hook`, `/learn`.
- **`allowRead` sandbox setting** (v2.1.77): Re-allow reads within `denyRead` regions for fine-grained filesystem sandbox control.
- **Agent `resume` parameter removed** (v2.1.78): Use `SendMessage({to: agentId})` instead of the deprecated `resume` pattern.

### Agent Skills specification (agentskills.io)

The official Agent Skills spec defines canonical fields our skills don't yet use:

- **`license`** (optional): License name or reference. Low priority unless publishing as a plugin.
- **`compatibility`** (optional, max 500 chars): Environment requirements (e.g., "Requires Claude Code v2.1.71+"). Medium priority — helps users know minimum version.
- **`metadata`** (optional): Arbitrary key-value for `author`, `version`, etc. Low priority.
- **Progressive disclosure recommendation**: Metadata ~100 tokens, instructions <5000 tokens, resources loaded on-demand via `references/` directory. Some of our skills may exceed the 5000-token recommendation — consider splitting large skills into SKILL.md + `references/`.

### Plugin and distribution patterns

- **`CLAUDE_CODE_PLUGIN_SEED_DIR`** (v2.1.79): Supports multiple directories. Framework could ship as a plugin seed for zero-config onboarding.
- **`source: 'settings'`** (v2.1.80): Plugin marketplace source. Framework could be declared as a settings-source plugin for one-command install.
- **Custom subagents** (`.claude/agents/`): Framework could ship pre-built agents (security-reviewer, test-writer) alongside skills.

### Orchestrator-Worker hierarchy pattern (levnikolaevich/claude-code-skills)

Community framework uses a 4-level hierarchy (L0 orchestrator → L1 coordinator → L2 specialist → L3 worker) with multi-model AI review (Codex/Gemini in parallel) and debate protocol to filter low-confidence findings. Our `/ship` uses a 2-level hierarchy (orchestrator → subagent). Consider expanding for complex features where parallel specialist agents (security, quality, architecture) would add value.

### Pre-approve permissions before spawning agent teams

When using Agent Teams, pre-approve all expected permissions before spawning teammates. This eliminates prompt delays that serialize parallel work. Pattern: approve all tool permissions in the orchestrator session, then spawn teammates that inherit those approvals.

### `/btw` for side questions

Official best practices recommend `/btw` for side questions that shouldn't enter context history. The question is answered but doesn't consume permanent context window space. Document as a workflow tip.

## Added 2026-03-25

### `.claude/agents/` directory (official pattern)

Subagent definitions are now a first-class `.claude/` feature. Each agent is a markdown file with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
---

System prompt here.
```

**Key frontmatter fields:**

| Field             | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `name`            | Unique identifier (lowercase-with-hyphens)                              |
| `description`     | When Claude should delegate (include "proactively" for auto-delegation) |
| `tools`           | Allowlist of tools (inherits all if omitted)                            |
| `disallowedTools` | Denylist (applied before `tools`)                                       |
| `model`           | `sonnet`, `opus`, `haiku`, full ID, or `inherit`                        |
| `permissionMode`  | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`        |
| `maxTurns`        | Circuit breaker for agentic turns                                       |
| `skills`          | Preload skill content into agent context                                |
| `mcpServers`      | Scoped MCP servers (inline definitions or references)                   |
| `hooks`           | Lifecycle hooks scoped to this agent only                               |
| `memory`          | `user`, `project`, or `local` — persistent cross-session learning       |
| `background`      | `true` to always run as background task                                 |
| `effort`          | Override effort level (`low`/`medium`/`high`)                           |
| `isolation`       | `worktree` for isolated git worktree                                    |
| `initialPrompt`   | Auto-submit first turn (v2.1.83+)                                       |

**Scope priority:** CLI `--agents` (1) > `.claude/agents/` (2) > `~/.claude/agents/` (3) > plugins (4).

**Agent persistent memory:** When `memory` is set, agent gets a dedicated directory (`~/.claude/agent-memory/<name>/` for user, `.claude/agent-memory/<name>/` for project). System prompt auto-includes instructions for reading/writing memory. The first 200 lines of `MEMORY.md` in that directory are injected into context.

**`skills` field:** Injects full skill content into agent's context at startup. Agents don't inherit skills from parent — must list explicitly. This is the inverse of `context: fork` in a skill.

**Subagents cannot spawn other subagents.** Chain from the main conversation instead.

### New hook events (v2.1.50–v2.1.83)

Events added since the previous knowledge update:

| Event                | When                               | Matcher input   |
| -------------------- | ---------------------------------- | --------------- |
| `CwdChanged`         | Working directory changed          | —               |
| `FileChanged`        | File modified                      | —               |
| `StopFailure`        | Turn ends due to API error         | —               |
| `PostCompact`        | After context compaction           | —               |
| `InstructionsLoaded` | CLAUDE.md/rules loaded             | —               |
| `ConfigChange`       | Config file changes during session | —               |
| `WorktreeCreate`     | Git worktree created               | —               |
| `WorktreeRemove`     | Git worktree removed               | —               |
| `Elicitation`        | MCP input request                  | —               |
| `ElicitationResult`  | Response to MCP elicitation        | —               |
| `SubagentStart`      | Subagent begins execution          | Agent type name |
| `SubagentStop`       | Subagent completes                 | Agent type name |

Also: `agent_id` and `agent_type` are now available in hook input JSON for tracking subagents.

**HTTP hooks** (v2.1.63): Alternative to shell hooks — POST JSON to a URL and receive JSON. Useful for team notification webhooks.

### `TaskOutput` deprecated (v2.1.83)

Use `Read` on the background task output file path instead. Grep skills for any `TaskOutput` references.

### Effort levels simplified (v2.1.72)

Only `low`, `medium`, `high` — `max` removed. The `effort` frontmatter field can be set on any skill or command.

### Skill authoring best practices (official Anthropic guide)

Key recommendations from platform.claude.com skill authoring docs:

- **SKILL.md body under 500 lines** — move detailed content to referenced files
- **Description field is critical** — Claude uses it to select from 100+ available skills. Write in third person. Include both what and when.
- **Progressive disclosure**: metadata ~100 tokens (loaded always) → instructions <5000 tokens (loaded when activated) → resources (loaded on demand)
- **Keep file references one level deep** — avoid nested reference chains (SKILL.md → file.md → detail.md). Claude may partially read deeply nested files.
- **Evaluation-driven development**: create evaluations BEFORE writing extensive docs. Run Claude without the skill, document failures, then write minimal content to address gaps.
- **Iterative development with Claude**: use Claude A to write/refine the skill, Claude B to test it, observe B's behavior, bring insights back to A.
- **Avoid time-sensitive information** — use "old patterns" collapsible sections instead of date-conditional logic.
- **Use consistent terminology** — pick one term and use it everywhere (e.g., always "API endpoint", never mix with "route" or "path").

### `${CLAUDE_SKILL_DIR}` variable (v2.1.69)

Skills can reference co-located files in their own directory using this variable. Enables portable file references without hardcoding paths. Useful for skills with bundled scripts, templates, or reference docs.
