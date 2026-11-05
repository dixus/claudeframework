---
name: changelog
description: Write or refresh the per-ticket changelog file (changelog/<branch>.md) for the current ticket branch. Use before committing or pushing work on a ticket branch when NOT running the full /pipeline:ship pipeline — the changelog is what feeds the work item's manual-steps flag and the release notes.
argument-hint: "[spec-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
effort: medium
---

Write the per-ticket changelog for the current branch: `changelog/<working-branch>.md`.

One file per branch — not a shared `CHANGELOG.md` — so changelog updates never conflict on the main branch.

## Why this skill exists

`/pipeline:ship` writes the changelog as Step 5b. When you work without `/pipeline:ship`, it never gets written, and three things fail **silently**:

- **The work item's "manual steps required" flag** (if the project's tracker has one) is derived from the `## Manual Steps` section. No changelog → the flag stays unset even when the ticket needs a DB script, a routing change or a cache flush.
- **The tracker comment** that mirrors those steps into the work item is never posted. Deployers then find them neither in the repo nor in the ticket.
- **`/pipeline:release-notes`** aggregates every changelog's `## Manual Steps` into `releases/<quarter>.md`. A missing changelog means a missing entry — the person deploying never learns the step exists.

In all three cases a missing changelog is indistinguishable from "this ticket needs no manual steps". Nothing turns red. It surfaces when a deployment fails.

## Step 1 — Determine the target file

**Normal case:** `changelog/<working-branch>.md`, using the full branch name.

```
changelog/1234.Improvement.Api.ChatSecureDefaults.md
```

**PRD-mode:** if `$ARGUMENTS` names a spec, or the branch is an epic branch hosting several PRDs, write `changelog/<spec-name>.md` instead (e.g. `changelog/prd07-document-upload.md`). An epic branch carries many PRDs as separate commits over weeks; a per-branch filename would overwrite each prior PRD's changelog. The spec name is unique per PRD and already used as the spec filename.

**Idempotent:** if the file exists, overwrite it with the current state. Never append, never create a second file.

## Step 2 — Resolve ticket context from the branch

```bash
git rev-parse --abbrev-ref HEAD
```

Parse with the convention from `.claude/rules/branch-management.md` if the project defines one. The framework default:

- Primary: `^(\d+)\.(Bug|Improvement|Feature)\.([^.]+)\.(.+)$` → ticket ID, type, module, description
- Fallback for legacy branches: `^(\d+)\.(.+)$` → at least the ticket ID

If the branch matches neither, **stop and ask** which ticket this work belongs to. Do not invent an ID and do not write a changelog without one — an unattributable changelog is worse than none, because it looks complete.

If a work-item tracker MCP tool is available (Azure DevOps, Jira, Linear, GitHub Issues, …), fetch the work item by the parsed ID to get the real title and type. Use it when the branch description is terse. Never let a guessed title into the file.

## Step 3 — Collect the changed files

```bash
git fetch origin --quiet
git diff --name-only origin/<main>...HEAD   # committed on this branch (<main> = main or master)
git status --short                          # plus anything still uncommitted
```

Union of both, minus files you are about to exclude deliberately. List repo-relative paths.

Mark new files with `*(new)*`. If a path needs explanation (a file that exists for a non-obvious reason, or one whose absence would break references elsewhere), add a short clause after it — but do not restate what the Summary already says.

## Step 4 — Manual Steps — the part that matters

`## Manual Steps` is a **mandatory section**, default `_None._`.

Inspect the actual diff against these triggers. Fill the section when the change includes any of:

- a new table, stored procedure, or schema change that is not applied by an automatic migration on deploy
- changes to routing / gateway / reverse-proxy configuration — a new route, port, or downstream service
- a new cache key or config value that needs a cache flush after deploy
- a new per-environment or per-tenant setting that must be rolled out outside the code deploy
- a feature flag or configuration toggle an administrator must enable
- an external dependency: new service account, provisioned credential, third-party API registration

Write one bullet per step, always saying **what** to do and **where** (file path, database, system). Group by category when several apply:

```markdown
## Manual Steps

- **Database:** Run `database/manual/<TicketId>_<Description>.sql` against each environment DB — adds table `MagicPin` and seeds default config rows.
- **Gateway config:** Add route `/magicpin/{everything}` → `core-api` (exact diff in commit `<sha>`).
- **Cache:** Flush the cache after deploy — the new key `MagicPin.Enabled` is read once and cached.
```

Two rules that are easy to get wrong:

- **Never delete the section.** A missing section is ambiguous — the reader cannot tell whether it was forgotten or genuinely empty. `_None._` is an assertion; absence is not.
- **When in doubt, write the step.** A superfluous line costs a deployer ten seconds. A missing one costs a failed deployment, and the failure appears far from its cause. Err toward writing it, and say so if you are unsure.

If a step carries risk (something that can break existing installations), write the risk and the safe order into the bullet — not just the command. A deployer reading only this file must be able to act without reconstructing your reasoning.

## Step 5 — Write the file

```markdown
# <working-branch>

**Ticket:** #<ticketId> — <type> · <module>
**Branch:** `<working-branch>`

## Summary

<2-5 sentences: what was built and why. Plain language — the audience is QA, product and future devs. Call out behaviour changes, new config surface, and anything a reader would be surprised by. Do NOT restate file names; they are listed below.>

## Manual Steps

_None._

## Changed files

- <path1>
- <path2>
```

If `branch-management.md` defines a work-item URL pattern, link the ticket: `[#<ticketId>](<url>)`. Otherwise the plain `#<ticketId>` is enough — most trackers auto-link it.

Optional sections, only when they carry weight:

- **`## Deviations from the ticket`** — when the implementation deviated from the ticket's description, or when something in the ticket turned out to be wrong. This is the single most valuable thing a changelog can carry, because the ticket will not be re-read but the changelog will.
- **`## Side observations`** — findings outside the ticket scope that you deliberately did not act on. Keeps them from being lost without widening the commit.

Do not commit here. The changelog is staged with the rest of the work — it belongs in the same commit as the change it describes.

## Step 6 — Name the derived actions

`/pipeline:ship` performs these automatically. Running standalone, you must at least surface them, because nobody else will:

1. **Manual-steps flag on the work item** — if the project's tracker has a boolean field for it (name it in `branch-management.md`) and the MCP update tool supports it, set it to `true` exactly when the `## Manual Steps` section is ≠ `_None._`. Otherwise tell the user which value the field needs and why.
2. **Tracker comment** with the verbatim `## Manual Steps` content (without the heading) when the section is non-empty, so deployers filtering on the flag see the steps without opening the repo.

The changelog is the single source of truth; the field and the comment are derived from it. Never set the field without a matching section — the two drift and then neither is trustworthy.

## Relationship to /pipeline:ship

`/pipeline:ship` Step 5b delegates here. This file is the single definition of the changelog format and the Manual-Steps heuristic; `/pipeline:ship` must not restate them. If you change the template or the triggers, change them here — `/pipeline:ship`, `/pipeline:release-notes` and the tracker-field derivation all read from this contract.

## Enforcement — what this skill cannot do

A skill is an offer, not a guarantee. If the changelog must be unmissable, that needs a hook: a `Stop` or pre-commit hook that checks for `changelog/<branch>.md` whenever the current branch matches the ticket-branch regex and warns when it is absent. Use the `create-hook` skill for that. This skill is the prerequisite for such a hook, not a substitute for it.
