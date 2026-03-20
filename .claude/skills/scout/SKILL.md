---
name: scout
description: Search the web for new Claude Code patterns, release notes, and community skills. Use periodically to check for framework optimization opportunities.
disable-model-invocation: true
argument-hint: "[--quick]"
---

> **Recommended model: `claude-opus-4-6`** — comparing external patterns against framework internals requires deep reasoning.

Search the web for recent Claude Code developments and compare against the current framework. Report optimization opportunities without modifying any files.

$ARGUMENTS is optional. Pass `--quick` to search only (no page fetching) — returns titles and links for manual review.

## Steps

1. Read CLAUDE.md for current framework context
2. Read all skill files in `.claude/skills/` to understand current capabilities
3. Read `.claude/context/instincts.md` and `.claude/context/lessons.md` if they exist

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

## Search phase

Run these web searches (use WebSearch):

a. `"Claude Code" best practices 2026`
b. `"Claude Code" skills site:github.com`
c. `"Claude Code" hooks OR subagents OR "agent teams" new`
d. `"CLAUDE.md" patterns OR framework`

For each search, collect the top 3 results (title, URL, snippet).

Deduplicate by URL. Discard results older than 60 days if the date is visible in the snippet.

## Fetch phase

**If `--quick` was passed:** skip this phase entirely. Go straight to the Quick report.

For the top 5 most relevant results (prioritize: official Anthropic docs > GitHub repos with skills > blog posts):

a. Fetch the page content with WebFetch
b. Extract only actionable information:
   - New Claude Code features or CLI flags
   - New skill frontmatter fields or hook events
   - Workflow patterns this framework doesn't use
   - Breaking changes that affect current skills
   - Community skills worth evaluating
c. For each insight, assess: does our framework already handle this? (yes / partially / no)

## Report

Write the report to `.claude/reviews/scout-<YYYY-MM-DD>.md` with this structure:

```markdown
# Scout Report — <YYYY-MM-DD>

## Claude Code release notes (last 60 days)

| Version | Date | Change | Affects our framework? | Action needed |
|---|---|---|---|---|
| <version> | <date> | <change summary> | /<skill> or "none" | <what to do> |

## New features we're not using

| Feature | Source | Impact | Recommendation |
|---|---|---|---|
| <feature> | <link> | high/medium/low | <what to do> |

## Skills that could be improved

| Skill | Insight | Source | Suggested change |
|---|---|---|---|
| /<skill> | <what we learned> | <link> | <specific improvement> |

## Breaking changes / deprecations

| Change | Affects | Source | Action needed |
|---|---|---|---|
| <change> | /<skill> | <link> | <what to update> |

## Worth investigating

Links to save into `.claude/references/` for deeper `/learn` processing:

- [<title>](<url>) — <why it's relevant>

## No action needed

Patterns we already implement correctly:

- <pattern> — ✅ already in /<skill>
```

If no findings in a section, write "None found." — do not omit the section.

### Quick report (when `--quick` is passed)

Skip the full report format. Instead, print a concise list:

```markdown
# Scout Quick Scan — <YYYY-MM-DD>

## Search results worth reading

1. [<title>](<url>) — <one-line relevance note>
2. ...

Run `/scout` (without --quick) to fetch and analyze the top results.
```

## After reporting

Ask: "Scout report written to `.claude/reviews/scout-<date>.md`. Want me to:
A) Save promising links to `.claude/references/` for `/learn` processing
B) Implement a specific suggestion now
C) Done — I'll review manually"
