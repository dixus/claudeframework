---
name: learn
description: Process references into skill/rule improvement proposals. Use after adding blog posts, repos, or docs to .claude/references/, or pass a URL to fetch and ingest directly.
disable-model-invocation: true
argument-hint: "[url]"
---

Process new material from `.claude/references/` and propose concrete changes to skills and rules. No intermediate knowledge files — findings route directly to actionable proposals.

## URL ingestion (when $ARGUMENTS is a URL)

If `$ARGUMENTS` starts with `http://` or `https://`, treat it as a URL to ingest:

1. WebFetch the URL and extract the main content (article text, README, docs — skip nav/ads/boilerplate)
2. Generate a slug from the page title or URL path (e.g. `claude-code-best-practices.md`)
3. Write the extracted content as markdown to `references/blogs/<slug>.md`
4. Log: "Saved <url> → references/blogs/<slug>.md"
5. Continue to the processing steps below — the new file will be picked up as unprocessed

This bridges the scout-learn pipeline: `/scout` produces "Worth investigating" URLs, and `/learn <url>` ingests them directly.

## Idempotency rule — filesystem-based, read this first

Processed state is tracked on the filesystem — do NOT rely on the index table for deduplication:

- Blog files: physically moved to a `processed/` subfolder
- Repo directories: marked with an empty `processed/.done` file inside the repo dir (too large to move)

1. Scan the filesystem for **unprocessed** candidate items:
   - `references/blogs/` — every file directly in this folder (NOT inside `processed/`)
   - `references/repos/` — every **subdirectory** that does NOT have a `processed/` marker file inside it (i.e., `references/repos/<dir>/processed/.done` does not exist)
   - Ignore `references/index.md` and any `processed/` subfolders
2. If there are no new items, skip to **Skill review** below.

## Processing steps (only for unprocessed items)

**For blog/article files** (individual files in `references/blogs/`):

1. Read the full content. For PDF files, use the `pages` parameter to read in chunks of 20 pages (e.g. `pages: "1-20"`, then `pages: "21-40"`) — do not attempt to read an entire large PDF at once.
2. Extract only actionable, durable insights — skip opinions, anecdotes, and general knowledge Claude already has
3. For each insight, map it to a **concrete change target**:
   - A specific skill file (`.claude/skills/<name>/SKILL.md`) — what line/section to change
   - A rule file (`.claude/rules/<name>.md`) — create new or update existing
   - `CLAUDE.md` — if it's a project-wide convention
   - If an insight doesn't map to any file, discard it — it's not actionable
4. Tag each insight with the affected skills: `**Affects:** [skill1, skill2]`
5. **Immediately after processing**, move the file into the `processed/` subfolder: `references/blogs/processed/<filename>`

**For repo subdirectories** (full repos in `references/repos/<dir>/`):

1. **Check for harvest report.** If `references/repos/<dir>/harvest-report.md` exists, this repo was already analyzed by `/harvest`. Read the harvest report instead of scanning the repo directly — it contains a structured inventory, classification, and key findings. Skip to step 3 using the harvest report as the source material.
2. If no harvest report: identify the key files to read — prioritize: `README.md`, files under `resources/`, `docs/`, `commands/`, `skills/`; skip: CI configs, scripts, tests, lock files, generated files
3. Read those key files selectively (not every file — focus on workflow, command patterns, CLAUDE.md examples, and architectural decisions)
4. Extract actionable insights and map each to a concrete change target (same as blog step 3 above)
5. Tag affected skills: `**Affects:** [skill1, skill2]`
6. **Immediately after processing**, mark the repo directory as done by creating `references/repos/<dir>/processed/.done` (an empty marker file). Do NOT move the entire directory — repos are large and the marker is sufficient for idempotency

## Skill review (always run — even when no new references)

1. **Identify which skills to review.** Collect all `**Affects:**` tags from insights extracted in this run. Also include any skill with a `deferred` proposal in `learn-proposals.md`, and any skill targeted by harvest-sourced proposals (proposals where `**Source:**` contains "harvested") with status `pending`. If no new references were processed (and no deferred or harvest proposals exist), fall back to reviewing all skills.
   - **Targeted mode** (new references processed): read only the identified skill files
   - **Fallback mode** (no new references): read all skill files, but limit depth — check only for obvious gaps, not speculative improvements
2. For each skill in scope, ask: do the insights extracted in this run suggest a concrete improvement to this skill's steps, inputs, outputs, or guardrails? Consider:
   - Are there missing steps that current best practices demand?
   - Are there steps that are now outdated or weaker than the state of the art?
   - Does a skill lack a safety check, decomposition gate, or verification step that the context recommends?
3. **Propose, do not apply.** Append new skill improvement proposals to `.claude/reviews/learn-proposals.md`. Follow these sub-steps:

   a. **Read existing proposals.** If `learn-proposals.md` exists, read it and parse the `**Status:**` line of each proposal. Proposals without a Status line (legacy) are treated as `pending`.
   b. **Skip closed items.** Do not re-propose any item whose Status is `accepted` or `rejected`.
   c. **Re-evaluate deferred items.** For proposals with Status `deferred`, check if new knowledge strengthens the case. Re-propose only if new evidence exists — append as a new proposal referencing the original.
   d. **Append under a dated separator.** Add new proposals below a `## Proposals — YYYY-MM-DD` heading. Do not overwrite or remove existing sections.
   e. **Use this format** for each new proposal:

   ```
   ### Skill: <skill-name>
   **What:** <one-line description of the change>
   **Why:** <which reference or context insight motivates this>
   **Source tier:** T1/T2/T3
   **Status:** pending
   **Diff:** <show the specific lines to change — old → new>
   ```

   For T3-sourced proposals, add a `**Justification:**` line explaining why the insight is trustworthy despite the general source.

   f. **Update the summary table** at the bottom of the file. Add a Status column if missing:

   ```
   | Priority | Status  | Count | Proposals |
   ```

   Do NOT modify skill files directly. The user reviews proposals and decides which to accept. This prevents a poorly written reference from corrupting a working skill.

   **Status values:** `pending` (new, awaiting review), `accepted` (user approved and applied), `rejected` (user declined), `deferred` (postponed — re-evaluate next run).

4. For each proposal, note: which skill, what would change, and why (one line each)

## After processing

1. Update `.claude/references/index.md`:
   - For each newly processed file, add a row to the "Processed entries" table with ✅ and a one-line insight summary
   - The "File" column value should be the original relative path (e.g. `` `blogs/uninterrupted.pdf` ``) — this is an audit log only, not used for deduplication
   - Remove the file from "Unprocessed entries" if it was listed there
2. Report:
   - Which reference files were processed (or "none — already up to date")
   - How many proposals were generated and for which skills/rules
   - Next step: run `/apply-proposals` to review and apply, or review manually in `.claude/reviews/learn-proposals.md`
