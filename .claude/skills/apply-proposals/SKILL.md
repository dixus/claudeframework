---
name: apply-proposals
description: Review and apply accepted proposals from learn-proposals.md to skill and rule files. Closes the scout→learn→apply loop. Use after reviewing proposals and marking them as accepted.
disable-model-invocation: true
argument-hint: "[--all | --proposal <number>]"
model: claude-opus-4-6
effort: high
---

Apply accepted proposals from `.claude/reviews/learn-proposals.md` to the target skill and rule files.

$ARGUMENTS is optional:

- `--all` — apply all proposals with Status `accepted`
- `--proposal <N>` — apply only proposal number N (by order of appearance), regardless of Status
- No arguments — interactive mode: present pending proposals for review, then apply accepted ones

## Step 0 — Load proposals

1. Read `.claude/reviews/learn-proposals.md`. If the file doesn't exist, report "No proposals file found. Run `/scout` or `/learn` first." and stop.
2. Parse each proposal block. A proposal starts with `### Skill:` or `### New skill:` or `### Rule:` and contains:
   - `**What:**` — one-line description
   - `**Why:**` — motivation
   - `**Source:**` or `**Source tier:**` — provenance
   - `**Status:**` — pending / accepted / rejected / deferred
   - `**Diff:**` — the proposed change (old → new)
3. Build a numbered list of all proposals with their Status.

## Step 1 — Select proposals to apply

**If `--all`:** select every proposal with Status `accepted`.

**If `--proposal <N>`:** select only that proposal. If its Status is not `accepted`, ask: "Proposal #N has status `<status>`. Apply anyway? (Y/N)" — proceed only if Y.

**If no arguments (interactive mode):**

1. Print all proposals in a numbered table:
   ```
   | #  | Target            | What                          | Status   | Tier |
   | -- | ----------------- | ----------------------------- | -------- | ---- |
   | 1  | /2_review         | Add disallowedTools           | pending  | T1   |
   | 2  | /3_fix            | Add maxTurns: 15              | pending  | T1   |
   ```
2. Ask: "Which proposals to apply? Enter numbers (e.g. `1,3,5`), `all` for all pending, or `q` to quit."
3. For each selected proposal, update its Status to `accepted` in `learn-proposals.md` before applying.

If no proposals are selected (or all are already `accepted`/`rejected`), report and stop.

## Step 2 — Validate diffs before applying

For each selected proposal:

1. **Identify the target file.** Extract from the proposal heading:
   - `### Skill: <name>` → `.claude/skills/<name>/SKILL.md`
   - `### New skill: <name>` → `.claude/skills/<name>/SKILL.md` (new file)
   - `### Rule: <name>` → `.claude/rules/<name>.md`
2. **Read the target file** (skip for new files).
3. **Validate the diff.** Check if the "old" text from the proposal's Diff block actually exists in the current file:
   - **Match found** → proposal is applicable
   - **No match** → proposal is **stale** (file has changed since proposal was written). Report: "Proposal #N is stale — the target text no longer matches. Skipping. Mark as `deferred` for re-evaluation."
   - Update the Status to `deferred` in `learn-proposals.md` and skip this proposal.
4. **Dependency check.** If the proposal's Diff references a frontmatter field that requires a specific Claude Code version (e.g., `maxTurns` requires v2.1.78+), note this but do not block — Claude Code versions are forward-compatible.

## Step 3 — Apply changes

For each validated proposal, in order:

**For existing files (edits):**

1. Read the target file
2. Apply the change described in the Diff block:
   - If the diff says "add line after X" → insert after the matched line
   - If the diff says "old: X → new: Y" → replace X with Y
   - If the diff shows a frontmatter addition → add to the YAML frontmatter block
3. After editing, re-read the file to confirm the change was applied correctly

**For new files:**

1. Create the directory if needed (e.g., `.claude/skills/<name>/`)
2. Write the new SKILL.md or rule file with the content from the Diff block
3. Confirm the file exists

## Step 4 — Verify

After all proposals are applied:

1. **Syntax check.** For each modified skill file, verify:
   - YAML frontmatter is valid (opens with `---`, closes with `---`)
   - Required fields present: `name`, `description`
   - No duplicate frontmatter fields
2. **Cross-reference check.** If a proposal added a reference to another file (e.g., a new skill referenced in CLAUDE.md), verify the referenced file exists.
3. If any verification fails, revert the change (`git checkout -- <file>`) and report the failure.

## Step 5 — Update proposal statuses

1. For each successfully applied proposal, update its Status in `learn-proposals.md`:
   - `pending` → `accepted`
   - Already `accepted` → keep as `accepted`
2. For each failed proposal, update Status to `deferred` with a note.
3. Update the summary table at the bottom of `learn-proposals.md` to reflect the new counts.

## Step 6 — Report

Print a summary:

```
## Apply results

Applied: N proposals
Skipped: N (stale diffs)
Failed: N (verification errors)

### Changes made
- /2_review: added disallowedTools frontmatter
- /3_fix: added maxTurns: 15 frontmatter

### Skipped (stale)
- Proposal #4: target text changed since proposal was written

### Next steps
- Run `/test` to verify no regressions
- Commit with `/commit`
```

## Proposal aging (runs at end of every invocation)

After the main apply flow, check all remaining proposals:

1. **Auto-defer stale proposals.** Any proposal with Status `pending` that appears in 3+ consecutive scout reports (check the `**Source:**` dates) without being accepted → update Status to `deferred` and add note: "Auto-deferred: pending for 3+ scout cycles."
2. **Flag abandoned proposals.** Any proposal with Status `deferred` for 30+ days → add note: "Consider rejecting — deferred since <date>."
3. Do NOT delete or reject automatically — that's the user's decision.
