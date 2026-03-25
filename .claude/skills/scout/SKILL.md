---
name: scout
description: Search the web for new Claude Code patterns, release notes, and community skills. Use periodically to check for framework optimization opportunities.
disable-model-invocation: true
argument-hint: "[--quick]"
model: claude-opus-4-6
effort: high
---

Search the web for recent Claude Code developments and compare against the current framework. Report optimization opportunities without modifying any files.

$ARGUMENTS is optional. Pass `--quick` to search only (no page fetching) — returns titles and links for manual review.

## Steps

1. Read CLAUDE.md for current framework context
2. Read all skill files in `.claude/skills/` to understand current capabilities
3. Read `.claude/context/lessons.md` if it exists (`.claude/rules/instincts.md` is auto-loaded by Claude Code)
4. Find the most recent previous scout report: glob `.claude/references/blogs/scout-*.md` and read the latest one. This is used in the diff phase later. If none exists, skip diffing.
5. **Read metrics trend.** If `.claude/metrics-scout.csv` exists and contains 2+ rows, compute the trend direction for `findings_count` and `action_items_count` across the last 3 scout runs (increasing / decreasing / stable). Store as a one-line summary for the report header. If fewer than 2 scout rows exist, note "First/second run — no trend data."

## Release notes phase (always runs first)

Fetch the official Claude Code changelog directly — do not rely on search for this:

a. WebFetch `https://docs.anthropic.com/en/docs/claude-code/changelog`
b. If that fails, try: WebFetch `https://code.claude.com/docs/en/changelog`
c. If both fail, fall back to WebSearch: `"Claude Code" changelog site:anthropic.com`

Extract all entries from the last 60 days. For each entry, note:

- Version number and date
- New features, new CLI flags, new skill frontmatter fields
- New hook events or hook types
- Breaking changes or deprecations
- New tool capabilities

Compare each entry against the current framework: does it affect any of our skills, hooks, or settings? Flag anything that does.

**Actionable mapping:** For each flagged entry, map it to a concrete change target: which skill file and what to change (e.g., "add `maxTurns: 15` to `3_fix/SKILL.md` frontmatter"), or which rule file to create/update in `.claude/rules/`. If the change doesn't map to any skill or rule, note it as "informational only" — do not propose writing it to a knowledge file.

## Official skills repo phase (always runs)

Check the official Anthropic skills repository for new patterns and spec changes:

a. WebFetch `https://github.com/anthropics/skills` — extract README, directory listing, skill format docs
b. WebFetch `https://agentskills.io/specification` — extract the Agent Skills spec (frontmatter fields, directory conventions, file naming)

For each finding:

- Compare official frontmatter fields against our skill frontmatter — flag new or missing fields
- Compare official directory structure (`scripts/`, `references/`, `assets/`) against ours
- Note any new official skills worth adopting or adapting
- Check if the plugin packaging format has changed
- Assess: does our framework already handle this? (yes / partially / no)

Include findings in the report under a dedicated "Official Anthropic skills repo analysis" section.

## Registry phase (runs before search)

Read `.claude/references/scout-registry.md` if it exists. This file tracks every URL the scout has already fetched. Format:

```markdown
# Scout Registry

| URL                       | Title      | Status  | Date       |
| ------------------------- | ---------- | ------- | ---------- |
| https://example.com/post  | Some Post  | fetched | 2026-03-20 |
| https://example.com/other | Other Post | queued  | 2026-03-20 |
```

Status values: `fetched` (already read and analyzed), `queued` (flagged for next run), `queued-repo` (GitHub repo flagged for `/harvest`), `skip` (manually marked irrelevant).

If the table has a Type column, use it. If not, treat all existing rows as type `article`. When adding new rows, always include the Type column (`article` or `repo`).

Build a set of known URLs from this file. These are used in the search and fetch phases to avoid re-reading content.

## Adaptive query phase (runs before search)

Read `.claude/reviews/learn-proposals.md` if it exists. Identify proposals with Status `pending` or `deferred`. From the top 3 by priority, generate 1–2 targeted search queries that could find supporting evidence, alternatives, or updated information. Example: if a pending proposal suggests adding worktree isolation to `/ship`, generate `"Claude Code" worktree isolation workflow 2026`.

Cap adaptive queries at 2. If no proposals file exists or no open proposals remain, skip this phase.

## Search phase

Run the 4 standard searches below, plus any adaptive queries from the previous phase (max 6 total). Use WebSearch:

a. `"Claude Code" best practices 2026`
b. `"Claude Code" skills site:github.com`
c. `"Claude Code" hooks OR subagents OR "agent teams" new`
d. `"CLAUDE.md" patterns OR framework`
e–f. (adaptive queries, if generated above)

For each search, collect the top 3 results (title, URL, snippet).

Deduplicate by URL. Discard results older than 60 days if the date is visible in the snippet. **Remove any URL already in the registry with status `fetched` or `skip`.**

**Classify each result by source tier:**

- **T1** — official Anthropic sources: `anthropic.com`, `code.claude.com`, `agentskills.io`, `github.com/anthropics`
- **T2** — known community experts, GitHub repos with 100+ stars, established tech blogs (e.g. Builder.io, Substack engineering blogs)
- **T3** — general blog posts, unknown authors, unverified sources

Include the tier in all report tables that reference external sources.

## Repo discovery phase (runs after search)

Search GitHub specifically for Claude Code framework repos and skill collections:

a. WebSearch `"Claude Code" framework skills site:github.com`
b. WebSearch `".claude" commands OR skills directory site:github.com`
c. WebSearch `CLAUDE.md hooks OR agents "best practices" site:github.com`

For each result that is a GitHub **repository** URL (not a file blob, issue, or discussion):

1. Check if the URL is already in scout-registry.md — skip if status is `fetched`, `queued-repo`, or `skip`
2. If new, add to the registry with status `queued-repo`, type `repo`, and today's date
3. Collect for the "Repos worth harvesting" report section

Do NOT clone or deeply analyze repos — that is `/harvest`'s job. Scout only discovers and queues.

## Fetch phase

**If `--quick` was passed:** skip this phase entirely. Go straight to the Quick report.

Collect fetch candidates from two sources:

1. **Queued URLs** from the registry (status = `queued`) — these were flagged by a previous run
2. **New URLs** from the search phase that are not in the registry

Prioritize: queued items first, then new items. From the combined list, take the top 5 (prioritize: T1 > T2 > T3; within each tier: docs > GitHub repos > blog posts):

a. Fetch the page content with WebFetch
b. Extract only actionable information: new Claude Code features or CLI flags, new skill frontmatter fields or hook events, workflow patterns this framework doesn't use, breaking changes that affect current skills, community skills worth evaluating
c. For each insight, assess: does our framework already handle this? (yes / partially / no)

## Report

Write the report to `.claude/references/blogs/scout-<YYYY-MM-DD>.md` with this structure (this ensures `/learn` automatically picks it up for processing):

```markdown
# Scout Report — <YYYY-MM-DD>

**Trend:** <trend summary from step 5, e.g. "Findings ↓ (66→48), action items ↓ (34→18) over last 3 runs" or "First run — no trend data">

## Claude Code release notes (last 60 days)

| Version   | Date   | Change           | Affects our framework? | Action needed |
| --------- | ------ | ---------------- | ---------------------- | ------------- |
| <version> | <date> | <change summary> | /<skill> or "none"     | <what to do>  |

## Official Anthropic skills repo analysis

| Field/Convention | Official spec | Our framework | Gap               |
| ---------------- | ------------- | ------------- | ----------------- |
| <field>          | <spec status> | <our status>  | <gap description> |

## Proposed changes

Concrete edits to skills and rules. Each proposal maps directly to a file and change.

| #   | Target file                       | Change                                  | Source | Tier   | Priority        |
| --- | --------------------------------- | --------------------------------------- | ------ | ------ | --------------- |
| 1   | `.claude/skills/<skill>/SKILL.md` | <specific edit: add/change/remove what> | <link> | T1/2/3 | high/medium/low |
| 2   | `.claude/rules/<rule>.md`         | <create or update rule>                 | <link> | T1/2/3 | high/medium/low |

For each high-priority proposal, include a diff block:
```

### Proposal 1 — <skill>/<rule>

**File:** .claude/skills/<skill>/SKILL.md
**What:** <one-line description>
**Why:** <which finding motivates this>
**Diff:**

- old: <current line or "new file">

* new: <proposed line>

```

## Breaking changes / deprecations

| Change   | Affects  | Source | Action needed    |
| -------- | -------- | ------ | ---------------- |
| <change> | /<skill> | <link> | <what to update> |

## Worth investigating

Links to save into `.claude/references/` for deeper `/learn` processing:

- [<title>](url) — <why it's relevant>

## Repos worth harvesting

GitHub repos discovered that may contain adoptable skills, hooks, or patterns:

| Repo URL | Description                                 | Tier     | Status      |
| -------- | ------------------------------------------- | -------- | ----------- |
| <url>    | <description from search snippet or README> | T1/T2/T3 | queued-repo |

Run `/harvest <url>` to clone and analyze any of these repos.

## No action needed

Patterns we already implement correctly:

- <pattern> — ✅ already in /<skill>
```

If no findings in a section, write "None found." — do not omit the section.

## Diff phase (skip if no previous report)

If a previous scout report was loaded in step 4, compare the new report against it:

1. Identify findings that are **new since last report** (not present in previous report)
2. Identify findings that are **resolved** (present in previous report but no longer relevant)
3. Add a section at the top of the report, right after the title:

```markdown
## What's new since last scout

- **New findings:** <count> items not in the previous report
- **Resolved:** <count> items from the previous report that are no longer relevant
- **Carried over:** <count> items still open from last time

### New this scan

- <one-line summary of each new finding>
```

This prevents report fatigue — the user can focus on deltas instead of re-reading the full report.

## Update registry

After the report is written, update `.claude/references/scout-registry.md`:

1. **Create the file** if it doesn't exist (with the header row from the registry phase format)
2. **Add fetched URLs**: every URL that was fetched in this run gets status `fetched` with today's date
3. **Add queued URLs**: every URL from the "Worth investigating" section gets status `queued`, type `article`, with today's date (unless already in the registry)
4. **Add queued repos**: every URL from the "Repos worth harvesting" section gets status `queued-repo`, type `repo`, with today's date (unless already in the registry)
5. **Promote queued → fetched**: any URL that was `queued` and got fetched this run, update its status to `fetched`
6. **Keep existing entries**: never remove rows — the registry is append-only (users can manually set `skip` status)

## Write proposals

After the report and registry are updated, write formal proposals directly to `.claude/reviews/learn-proposals.md` for every entry in the "Proposed changes" table:

1. **Read existing proposals.** If `learn-proposals.md` exists, parse the `**Status:**` line of each proposal. Skip any item whose Status is `accepted` or `rejected`. Do not re-propose something already tracked.
2. **Append under a dated separator.** Add new proposals below a `## Proposals — YYYY-MM-DD` heading. Do not overwrite or remove existing sections.
3. **Use this format** for each proposal:

   ```
   ### Skill: <skill-name> (or Rule: <rule-name>)
   **What:** <one-line description of the change>
   **Why:** <which finding motivates this>
   **Source:** scout-<YYYY-MM-DD> — <source URL>
   **Source tier:** T1/T2/T3
   **Status:** pending
   **Diff:** <show the specific lines to change — old → new>
   ```

4. **Update the summary table** at the bottom of the file if it exists.

Do NOT modify skill or rule files directly — proposals are reviewed by the user first.

## Metrics

Append a row to `.claude/metrics-scout.csv` (create if missing, with header row):

```
date,skill,model,findings_count,new_findings_count,action_items_count
```

Count: total findings across all tables, new findings (from diff phase, 0 if first run), and items with action needed (non-"none" entries).

### Quick report (when `--quick` is passed)

Skip the full report format. Instead, print a concise list:

```markdown
# Scout Quick Scan — <YYYY-MM-DD>

## Search results worth reading

1. [<title>](url) — <one-line relevance note>
2. ...

Run `/scout` (without --quick) to fetch and analyze the top results.
```

Still update the registry: add all discovered URLs as `queued` (they weren't fetched, so they'll be prioritized next full run).

## After reporting

Ask: "Scout report written to `.claude/references/blogs/scout-<date>.md`. Proposals added to `.claude/reviews/learn-proposals.md`. Options:
A) Run `/apply-proposals` to review and apply proposals now
B) Run `/learn <url>` on a "Worth investigating" URL
C) Run `/harvest <url>` on a discovered repo
D) Done — I'll review manually"
