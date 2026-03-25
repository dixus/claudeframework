---
name: harvest
description: Clone and analyze a Git repo's Claude Code setup. Discovers adoptable skills, hooks, agents, and patterns, then generates adoption proposals. Use after /scout finds interesting repos, or directly with a repo URL.
disable-model-invocation: true
argument-hint: "<repo-url> [--clean] [--deep]"
model: claude-opus-4-6
effort: high
---

Clone a Git repository, analyze its Claude Code setup (skills, hooks, agents, rules, CLAUDE.md), compare against this framework, and generate adoption proposals.

`$ARGUMENTS` must include a Git-cloneable URL. Optional flags:

- `--clean` — delete the cloned repo after analysis (harvest report is preserved)
- `--deep` — detailed line-level comparison for `new` and `enhancement` items

## Phase 0 — Validate and prepare

1. Parse `$ARGUMENTS` for the repo URL and flags (`--clean`, `--deep`)
2. Extract `<owner>/<repo>` from the URL. Derive a slug: `<owner>-<repo>` (e.g. `anthropics-skills`, `travisvn-awesome-claude-skills`)
3. **Idempotency check:** if `references/repos/<slug>/processed/.done` exists, report "Already harvested — run with a different repo or delete the marker to re-harvest" and stop
4. Check `.claude/references/scout-registry.md` — if the URL exists with status `fetched` and type `repo`, also stop (already analyzed)
5. **Load framework inventory.** Read and catalog our current capabilities:
   - All skill names and descriptions: glob `.claude/skills/*/SKILL.md`, extract `name` and `description` from frontmatter
   - All agents: glob `.claude/agents/*.md`
   - All hooks: glob `.claude/hooks/*`
   - All rules: glob `.claude/rules/*.md`
   - `CLAUDE.md` top-level headings
   - This inventory is used for comparison in Phase 3

## Phase 1 — Clone

1. Create the target directory if needed: `references/repos/`
2. Run: `git clone --depth 1 <repo-url> .claude/references/repos/<slug>/`
3. If clone fails (private repo, invalid URL, network error), report the error and stop — do not create partial state
4. Log: "Cloned <repo-url> → references/repos/<slug>/ (shallow)"

## Phase 2 — Assess

1. Check the cloned repo for framework indicators:
   - `.claude/` directory (or `.claude-code/`, `claude/`)
   - `CLAUDE.md` (or `.cursorrules`, `.windsurfrules` — note as alternative AI config)
   - `package.json`, `pyproject.toml`, `Cargo.toml` (identify tech stack)
   - `.mcp.json` or `mcp_config.json` (MCP server config)

2. **Fetch repo metadata** via `gh api repos/<owner>/<repo>` (if `gh` is available):
   - Stars count, description, last push date, primary language
   - If `gh` is not available, skip — metadata is nice-to-have, not required

3. **Classify source tier:**
   - **T1** — owner is `anthropics` (official Anthropic repos)
   - **T2** — stars >= 100, or owner is a known expert/org
   - **T3** — everything else

4. **Non-framework repo handling:** If no `.claude/` directory AND no `CLAUDE.md` found:
   - Write a minimal report noting "Non-framework repo — no `.claude/` or `CLAUDE.md` detected"
   - Still scan for interesting patterns: `package.json` scripts, CI workflows, MCP configs
   - Skip to Phase 6 (report) with findings from this shallow scan
   - Register and mark as processed

## Phase 3 — Structural inventory

Scan the repo's Claude Code artifacts and build a comparison inventory. For each category:

| Category   | What to scan in repo                                                      | Compare against                          |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| Skills     | `.claude/skills/*/SKILL.md` or `.claude/commands/*.md` or `commands/*.md` | Our `.claude/skills/`                    |
| Agents     | `.claude/agents/*.md` or `agents/*.md`                                    | Our `.claude/agents/`                    |
| Hooks      | `.claude/hooks/*` or `hooks/*`                                            | Our `.claude/hooks/`                     |
| Rules      | `.claude/rules/*.md`                                                      | Our `.claude/rules/`                     |
| CLAUDE.md  | Top-level sections and rules                                              | Our `CLAUDE.md`                          |
| MCP config | `.mcp.json`, `mcp_config.json`                                            | (note as new — flag interesting servers) |
| Scripts    | `package.json` scripts, `Makefile` targets                                | (note automation patterns)               |

For each discovered artifact:

1. Read its content (for skills: full SKILL.md; for hooks: the script; for agents: the persona file)
2. **Classify** against our framework inventory:
   - **new** — we have no equivalent capability (no skill with similar purpose)
   - **enhancement** — improves or extends something we already have (similar skill exists but theirs adds steps, flags, or safety checks we lack)
   - **duplicate** — we already do this equally well or better
   - **incompatible** — interesting but conflicts with our architecture or conventions
3. For `new` and `enhancement` items, note what specifically is worth adopting (1–2 sentences)

Build the inventory as a markdown table for the report.

## Phase 4 — Deep analysis (only with `--deep`)

**Skip this phase unless `--deep` was passed.**

For each item classified as `new` or `enhancement` in Phase 3:

1. Read the full artifact content in detail
2. If `enhancement`: read our equivalent skill/hook/agent side-by-side
3. Identify specific lines, steps, or patterns worth adopting
4. Assess adaptation effort:
   - **trivial** — copy/paste with minor path adjustments
   - **moderate** — needs restructuring to fit our conventions
   - **significant** — requires new infrastructure or multi-file changes
5. Note any dependencies the artifact requires that we don't have (MCP servers, npm packages, external tools)

## Phase 5 — Generate proposals

For each `new` or `enhancement` item from Phase 3 (or Phase 4 if `--deep`):

1. **Read existing proposals.** If `.claude/reviews/learn-proposals.md` exists, read it and check for duplicates (same skill + similar change). Skip items already proposed with status `pending`, `accepted`, or `rejected`.

2. **Append proposals** under a `## Proposals — YYYY-MM-DD (harvest: <slug>)` heading:

   For **new** items (skills/agents/hooks we don't have):

   ```
   ### New skill: <name>
   **What:** <one-line description of the capability>
   **Why:** <what problem it solves, how it complements our framework>
   **Source:** <repo-url> (harvested YYYY-MM-DD)
   **Source tier:** T1/T2/T3
   **Status:** pending
   **Adaptation:** trivial/moderate/significant
   **Diff:** New file: `.claude/skills/<name>/SKILL.md` — <key phases/steps summary>
   ```

   For **enhancement** items (improvements to existing skills):

   ```
   ### Skill: <our-skill-name>
   **What:** <one-line description of the improvement>
   **Why:** <what the source repo does better and the benefit>
   **Source:** <repo-url> (harvested YYYY-MM-DD)
   **Source tier:** T1/T2/T3
   **Status:** pending
   **Diff:** <specific old → new changes in our skill>
   ```

   For T3-sourced proposals, add a `**Justification:**` line explaining why the insight is trustworthy.

3. **Update the summary table** at the bottom of `learn-proposals.md`.

## Phase 6 — Write harvest report

Write a structured report to `references/repos/<slug>/harvest-report.md`:

```markdown
# Harvest Report: <slug>

**URL:** <repo-url>
**Stars:** <count or "unknown"> | **Tier:** T1/T2/T3 | **Date:** YYYY-MM-DD
**Language:** <primary language> | **Last push:** <date or "unknown">
**Has .claude/:** yes/no | **Has CLAUDE.md:** yes/no

## Inventory

| Category | Artifact | Classification                         | Our equivalent      | Notes           |
| -------- | -------- | -------------------------------------- | ------------------- | --------------- |
| skill    | /<name>  | new/enhancement/duplicate/incompatible | /<our-skill> or "—" | <one-line note> |
| agent    | <name>   | ...                                    | ...                 | ...             |
| hook     | <name>   | ...                                    | ...                 | ...             |

## Key findings

- <bullet point summaries of the most valuable discoveries>

## Proposals generated

- <count> proposals written to `learn-proposals.md`
- <list of proposal one-liners>

## Not adopted (and why)

- <items classified as duplicate or incompatible, with brief reasoning>
```

## Phase 7 — Finalize

1. **Update scout-registry.** Add or update the repo URL in `.claude/references/scout-registry.md`:
   - URL: the repo URL
   - Title: repo description or slug
   - Type: `repo`
   - Status: `fetched`
   - Date: today

   If the registry doesn't have a Type column yet, add it (backfill existing rows as `article`).

2. **Mark as processed.** Create the marker: `references/repos/<slug>/processed/.done`

3. **Append metrics.** Add a row to `.claude/metrics-scout.csv` (create with header if missing):

   ```
   date,skill,model,artifacts_found,new_count,enhancement_count,proposals_count
   ```

4. **Clean up (if `--clean`).** If `--clean` was passed:
   - Copy `harvest-report.md` to `references/blogs/harvest-<slug>.md` (so `/learn` can find it)
   - Delete the entire `references/repos/<slug>/` directory
   - The report is preserved; the clone is removed

## After harvesting

Print a summary and suggest next steps:

"Harvest complete for `<slug>`. Found <N> artifacts: <new_count> new, <enhancement_count> enhancements, <dup_count> duplicates. <proposals_count> proposals written to `learn-proposals.md`.

A) Review proposals in `reviews/learn-proposals.md`
B) Run `/learn` to process harvest insights into context knowledge
C) Run `/harvest <another-url>` to analyze another repo
D) Done — I'll review manually"
