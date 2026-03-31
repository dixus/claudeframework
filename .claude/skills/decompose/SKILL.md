---
name: decompose
description: Break a concept document, draft, or product brief into independent PRDs that each feed into /ship. Use when input contains multiple features or a big-picture vision.
disable-model-invocation: true
argument-hint: [concept name or description]
model: claude-opus-4-6
effort: high
---

Decompose concept documents in `.claude/input/` into independent, shippable PRDs.

$ARGUMENTS is an optional name or focus hint. The primary source is `.claude/input/`.

---

## Step 1 — Ingest all input materials

Read every file in `.claude/input/` — documents, images, screenshots, PDFs, sketches, markdown, plain text. Treat them collectively as a single concept brief.

Also read:
- `CLAUDE.md` for project context, tech stack, and conventions
- All files in `.claude/context/` for long-lived project references (schemas, API docs, glossaries)

Build a mental model of what the concept describes: the overall goal, the user-facing features, the technical components, and any constraints or priorities mentioned.

---

## Step 2 — Identify feature boundaries

Analyze the concept and identify **independent features** — units of work that:

1. **Have a clear, single purpose** — each delivers one user-visible capability or one infrastructure change
2. **Can be implemented without the others existing** — no hard runtime dependency on another feature from this decomposition (soft dependencies like "uses the same data model" are fine)
3. **Can be reviewed and tested in isolation** — each has its own validation criteria
4. **Touch mostly different files** — overlap of 1-2 shared files (e.g., a route config, a nav menu) is acceptable, but features that modify the same core logic in conflicting ways should be merged or sequenced

For each candidate feature, note:
- A short name (kebab-case, suitable for filenames)
- Which parts of the concept it covers
- Which codebase areas it likely touches
- Any dependencies on other features from this decomposition

---

## Step 3 — Dependency analysis and ordering

Build a dependency graph between the identified features:

- **Independent** — can run in any order, no dependency
- **Soft dependency** — benefits from another feature existing first (e.g., a dashboard that shows data from a new API), but can be implemented with stubs or existing data
- **Hard dependency** — cannot be implemented until another feature ships (e.g., a feature that extends a new data model created by another feature)

Produce an **implementation order** — a suggested sequence that respects hard dependencies. Group independent features at the same level. Example:

```
Level 1 (independent — can run in any order):
  - user-profile-api
  - notification-settings-ui

Level 2 (depends on Level 1):
  - notification-delivery  (depends on: user-profile-api)

Level 3 (depends on Level 2):
  - notification-analytics  (depends on: notification-delivery)
```

If all features are independent, say so — that's the ideal case.

---

## Step 4 — Surface ambiguities

Before writing PRDs, ask clarifying questions about:

1. **Scope conflicts** — if the concept mentions something that could be one feature or three, ask how to split it
2. **Priority** — if there are more than 5 features, ask which are must-have vs. nice-to-have
3. **Dependencies** — if hard dependencies exist, confirm the user wants to sequence them (alternative: merge dependent features into one larger PRD)
4. **Missing context** — if the concept references systems, APIs, or patterns not visible in the codebase or `.claude/context/`, ask about them

Use selectable options where possible. Wait for answers before proceeding.

If the concept is clear and unambiguous, skip this step.

---

## Step 5 — Write individual PRDs

For each feature, write a PRD to `.claude/input/<kebab-case-feature-name>.md` with this structure:

```markdown
# <Feature Name>

> Decomposed from: <original concept doc filename(s)>
> Dependency: none | soft(<other-feature>) | hard(<other-feature>)
> Priority: <from user answers, or "not specified">

## Problem

What user problem or business need does this feature address? 1-2 sentences.

## Requirements

Bulleted list of what this feature must do. Be specific — these become the spec's requirements.

## Out of scope

What this PRD explicitly does NOT cover (especially things that belong to sibling PRDs from the same decomposition).

## User stories / flows

- As a <role>, I want <action> so that <outcome>
- Include the key interaction flows if UI is involved

## Acceptance criteria

Observable conditions that confirm the feature is done. Write them as testable statements:
- "When X happens, Y is visible"
- "API returns Z when called with W"

## Technical hints

Optional notes about:
- Existing codebase patterns to follow
- Known constraints or gotchas
- Suggested approach (without being prescriptive)

## Assets

Reference any specific screenshots, wireframes, or diagrams from the original input that apply to this feature. Use relative paths to `.claude/input/` files.
```

**Important:**
- Each PRD must be self-contained — someone reading only that PRD should understand what to build
- Cross-reference sibling PRDs by name in the "Out of scope" section so boundaries are clear
- Keep PRDs concise — they feed into `/0_spec` which will expand them into full specs

---

## Step 6 — Archive original input

Move the original concept documents to `.claude/input/archive/`:

```bash
mkdir -p .claude/input/archive
mv .claude/input/<original-files> .claude/input/archive/
```

Do NOT move the newly written PRDs — only the original source documents.

If any original files are images or screenshots referenced by the PRDs (in their "Assets" section), **copy** instead of move so the references remain valid.

---

## Step 7 — Write the decomposition manifest

Write `.claude/specs/decomposition-<name>.md` with:

```markdown
# Decomposition: <concept name>

> Source: <list of original input files>
> Date: <today>
> Features: <count>

## Implementation order

<paste the dependency graph from Step 3>

## Features

| # | Feature | PRD | Dependencies | Status |
|---|---------|-----|--------------|--------|
| 1 | <name>  | `.claude/input/<name>.md` | none | pending |
| 2 | <name>  | `.claude/input/<name>.md` | soft(1) | pending |
| ...

## Pipeline commands

Run each feature through the standard pipeline:

\`\`\`bash
# Feature 1 (no dependencies — start here)
/ship <feature-1-name>

# Feature 2 (independent of 1 — can run after or in parallel)
/ship <feature-2-name>

# Feature 3 (depends on 1 — run after Feature 1 ships)
/ship <feature-3-name>
\`\`\`
```

---

## Step 8 — Report

Print a summary:

```
## Decomposition complete

**Source:** <original input files>
**Features identified:** N

| # | Feature | Dependencies | Estimated size |
|---|---------|-------------|----------------|
| 1 | <name>  | none        | S / M / L      |
| 2 | <name>  | soft(1)     | S / M / L      |

**Suggested start:** `/ship <first-feature-name>` (no dependencies)

**Manifest:** `.claude/specs/decomposition-<name>.md`
```

Size estimates: **S** = 1-3 files, **M** = 4-7 files, **L** = 8+ files. These are rough — `/ship --dry-run` gives precise counts.

Then ask: "Ready to start shipping? Pick a feature or I'll begin with the first independent one."
