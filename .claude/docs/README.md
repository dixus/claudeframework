# Claude Code Development Framework

> A structured, safe, and technology-agnostic development workflow for Claude Code.
> Designed for production-grade projects — especially SaaS platforms.

Generated and maintained by `/doc`. Last updated: 2026-04-01.

---

## What this is

A reusable framework that wraps Claude Code with a disciplined pipeline:
**spec -> plan -> implement -> review -> fix -> test**

Every step is a skill — a reusable prompt that Claude executes on demand. Skills are technology-agnostic: they discover project commands from `CLAUDE.md` rather than hardcoding tools.

## Why this exists

Claude Code is powerful but context-hungry. Without structure:

- Sessions accumulate unrelated work and degrade in quality
- Reviews are biased because Claude reviews code it just wrote
- Bugs slip through because TypeScript is never type-checked separately
- Knowledge from blog posts and repos is lost between sessions

This framework solves all of these systematically.

## Quick start

```
# Ship a single feature end-to-end:
/ship <feature name>

# Ship multiple features in parallel:
/decompose                    # break concept into PRDs
/fleet                        # parallel /ship with conflict-aware batching

# Or step-by-step (manual):
/0_spec <feature name>
/1_implement <spec name>
/clear
/2_review <spec name>
/3_fix <review name>
/test
```

## Skills overview

### Core pipeline

| Skill                                             | When to use                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`/decompose`](skills-reference.md#decompose)     | Break a concept doc into independent PRDs that each feed into `/ship`                                     |
| [`/fleet`](skills-reference.md#fleet)             | Ship decomposed PRDs in parallel — conflict analysis, batched worktrees, merge to main                    |
| [`/ship`](skills-reference.md#ship)               | Full pipeline orchestrator — spec -> implement -> review -> fix -> commit (`--dry-run`, `--no-finalize`)  |
| [`/0_spec`](skills-reference.md#0_spec)           | Translating requirements into a structured spec                                                           |
| [`/1_implement`](skills-reference.md#1_implement) | Implementing a spec with plan approval and TDD                                                            |
| [`/2_review`](skills-reference.md#2_review)       | 9-lens code review against spec (fresh session)                                                           |
| [`/3_fix`](skills-reference.md#3_fix)             | Fixing review issues by severity with circuit breaker                                                     |
| [`/test`](skills-reference.md#test)               | Full verify suite — report only, no fixes                                                                 |

### Development tools

| Skill                                             | When to use                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`/commit`](skills-reference.md#commit)           | Creating atomic commits with conventional messages and multi-concern detection     |
| [`/debug`](skills-reference.md#debug)             | Diagnosing and fixing a failing test, type error, or runtime error                 |
| [`/impact`](skills-reference.md#impact)           | Blast radius analysis — find all call sites, test mocks, and consumers (read-only) |
| [`/smoke`](skills-reference.md#smoke)             | Write and run smoke tests against a Docker stack from a spec                       |
| [`/audit`](skills-reference.md#audit)             | Finding and fixing vulnerable dependencies                                         |
| [`/healthcheck`](skills-reference.md#healthcheck) | Scanning Docker container logs for errors, crashes, and warnings                   |
| [`/create-hook`](skills-reference.md#create-hook) | Scaffolding Claude Code lifecycle hooks for this project                           |
| [`/harvest`](skills-reference.md#harvest)         | Clone and analyze a repo's Claude Code setup; generate adoption proposals          |
| [`/deploy`](skills-reference.md#deploy)           | Deploy framework to a project via symlinks (junctions on Windows)                  |

### Knowledge and session management

| Skill                                                     | When to use                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`/learn`](skills-reference.md#learn)                     | Processing new references into the knowledge base; proposing skill improvements       |
| [`/scout`](skills-reference.md#scout)                     | Searching the web for new Claude Code patterns and suggesting framework optimizations |
| [`/apply-proposals`](skills-reference.md#apply-proposals) | Applying accepted proposals from learn-proposals.md to skill/rule files               |
| [`/doc`](skills-reference.md#doc)                         | Regenerating this documentation                                                       |
| [`/handoff`](skills-reference.md#handoff)                 | Capturing session state before `/clear`                                               |
| [`/continue`](skills-reference.md#continue)               | Restoring context from a handoff file                                                 |

## Lifecycle hooks

Four hooks are registered in `.claude/settings.json` to enforce quality automatically:

| Hook                 | Event               | Matcher       | What it does                                                                                     |
| -------------------- | ------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `auto-approve.js`    | `PermissionRequest` | `*`           | 3-tier auto-approve: safe tools approved, destructive patterns blocked, ambiguous passed through |
| `protect-secrets.js` | `PreToolUse`        | `Edit\|Write` | Blocks writes to sensitive files (`.env`, `*.pem`, `*.key`, credentials, etc.) via exit code 2   |
| `auto-format.js`     | `PostToolUse`       | `Edit\|Write` | Auto-formats files after edits (Prettier for JS/TS/CSS/JSON/MD, ruff for Python)                 |
| `post-compact.js`    | `PostCompact`       | (all)         | Re-injects pipeline state (active spec, review, handoff, git branch) after context compaction    |

## Directory layout

```
.claude/
  docs/           <- you are here (generated by /doc)
  skills/         <- 23 skill definitions (the framework itself)
  agents/         <- subagent personas (code-reviewer, explorer)
  rules/          <- auto-loaded instructions (instincts.md — high-priority session rules)
  context/        <- curated knowledge read by skills on demand
  references/     <- drop zone: blog posts, repos, and harvested repos
    blogs/
    repos/
    index.md
    scout-registry.md
  hooks/          <- lifecycle hook scripts (4 hooks)
  specs/          <- generated feature specs
  reviews/        <- generated review reports + learn-proposals.md
  input/          <- raw requirements (archived after spec)
  archive/        <- processed input files
  handoffs/       <- session state files (gitignored)
  metrics-pipeline.csv  <- /ship pipeline run log (append-only)
  metrics-scout.csv     <- /scout and /harvest run log (append-only)
```

## Further reading

- [Workflow guide](workflow.md) — detailed rationale, session patterns, and lifecycle hooks
- [Skills reference](skills-reference.md) — each skill documented with examples
- [Knowledge base](knowledge-base.md) — distilled insights from collected references

## Changelog

| Date       | Change                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 2026-04-01 | Added `/decompose` and `/fleet` skills for parallel multi-feature shipping with conflict analysis |
| 2026-04-01 | Added `--no-finalize` flag to `/ship` for fleet integration                                     |
| 2026-04-01 | Synced root README.md with `/fleet`, `/decompose`, skill count (23)                             |
| 2026-03-25 | Initial documentation generated by `/doc`                                                       |
