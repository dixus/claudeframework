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

Compare each entry against the current framework: does it affect any of our 18 skills, hooks, or settings? Flag anything that does.

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

Status values: `fetched` (already read and analyzed), `queued` (flagged for next run), `skip` (manually marked irrelevant).

Build a set of known URLs from this file. These are used in the search and fetch phases to avoid re-reading content.

## Search phase

Run these web searches (use WebSearch):

a. `"Claude Code" best practices 2026`
b. `"Claude Code" skills site:github.com`
c. `"Claude Code" hooks OR subagents OR "agent teams" new`
d. `"CLAUDE.md" patterns OR framework`

For each search, collect the top 3 results (title, URL, snippet).

Deduplicate by URL. Discard results older than 60 days if the date is visible in the snippet. **Remove any URL already in the registry with status `fetched` or `skip`.**

## Fetch phase

**If `--quick` was passed:** skip this phase entirely. Go straight to the Quick report.

Collect fetch candidates from two sources:

1. **Queued URLs** from the registry (status = `queued`) — these were flagged by a previous run
2. **New URLs** from the search phase that are not in the registry

Prioritize: queued items first, then new items. From the combined list, take the top 5 (prioritize: official Anthropic docs > GitHub repos with skills > blog posts):

a. Fetch the page content with WebFetch
b. Extract only actionable information: new Claude Code features or CLI flags, new skill frontmatter fields or hook events, workflow patterns this framework doesn't use, breaking changes that affect current skills, community skills worth evaluating
c. For each insight, assess: does our framework already handle this? (yes / partially / no)

## Report

Write the report to `.claude/references/blogs/scout-<YYYY-MM-DD>.md` with this structure (this ensures `/learn` automatically picks it up for processing):

```markdown
# Scout Report — <YYYY-MM-DD>

## Claude Code release notes (last 60 days)

| Version   | Date   | Change           | Affects our framework? | Action needed |
| --------- | ------ | ---------------- | ---------------------- | ------------- |
| <version> | <date> | <change summary> | /<skill> or "none"     | <what to do>  |

## Official Anthropic skills repo analysis

| Field/Convention | Official spec | Our framework | Gap               |
| ---------------- | ------------- | ------------- | ----------------- |
| <field>          | <spec status> | <our status>  | <gap description> |

## New features we're not using

| Feature   | Source | Impact          | Recommendation |
| --------- | ------ | --------------- | -------------- |
| <feature> | <link> | high/medium/low | <what to do>   |

## Skills that could be improved

| Skill    | Insight           | Source | Suggested change       |
| -------- | ----------------- | ------ | ---------------------- |
| /<skill> | <what we learned> | <link> | <specific improvement> |

## Breaking changes / deprecations

| Change   | Affects  | Source | Action needed    |
| -------- | -------- | ------ | ---------------- |
| <change> | /<skill> | <link> | <what to update> |

## Worth investigating

Links to save into `.claude/references/` for deeper `/learn` processing:

- [<title>](url) — <why it's relevant>

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
3. **Add queued URLs**: every URL from the "Worth investigating" section gets status `queued` with today's date (unless already in the registry)
4. **Promote queued → fetched**: any URL that was `queued` and got fetched this run, update its status to `fetched`
5. **Keep existing entries**: never remove rows — the registry is append-only (users can manually set `skip` status)

## Metrics

Append a row to `.claude/metrics.csv` (create if missing, with header row):

```
timestamp,skill,model,findings_count,new_findings_count,action_items_count
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

Ask: "Scout report written to `.claude/references/blogs/scout-<date>.md`. Run `/learn` to process it into context and generate skill improvement proposals. Or:
A) Run `/learn` now to process the scout report and all "Worth investigating" URLs
B) Implement a specific suggestion now
C) Done — I'll review manually"
