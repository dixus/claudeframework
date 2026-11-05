---
name: release
description: Cut a quarterly release. Branches `Q<N>-Release-<YYYY>` from the main branch, generates release notes via `/pipeline:release-notes`, tags the cut, and pushes — with a gate before any push.
disable-model-invocation: true
argument-hint: <quarter> [--dry-run] [--tag <name>] [--no-tag] [--since <ref>]
model: claude-sonnet-4-6
effort: medium
---

Cut a quarterly release. Replaces a hand-rolled release workflow (which tends to drift — tags get forgotten, notes get written late) with a deterministic, reproducible cut.

**What this skill does:**
1. Validate state (clean tree, on the main branch, up to date)
2. Cut a release branch `Q<N>-Release-<YYYY>` from the main branch
3. Run the `/pipeline:release-notes` skill to generate `releases/<quarter>.md`
4. Commit the release-notes file on the new branch
5. Tag the cut commit (default: same name as the branch)
6. Show a summary, gate before push
7. Push branch + tag on confirmation

**What this skill does NOT do:**
- Trigger the project's build/release pipelines. If the project has pipelines that must be started manually for a release branch, the final report lists them as next steps. Automating that trigger is a project-specific follow-up (credentials, pipeline ids, API choice).
- Handle hotfix releases. Those go through `<ticket>-on-<release-branch>` branches as documented in `.claude/rules/branch-management.md` (if the project defines one) and merge into the release branch, not the main branch.

Throughout, `<main>` is the repo's default branch (`main` or `master` — check `git symbolic-ref --short refs/remotes/origin/HEAD`). If `branch-management.md` defines a different release-branch convention, follow that instead of the `Q<N>-Release-<YYYY>` default.

---

## Step 0 — Parse arguments

`<quarter>` is required. Accepted formats (case-insensitive):
- `2026-Q2` (preferred — sortable)
- `Q2-2026`
- `Q2 2026`

Extract:
- `Q` (integer, 1–4) — abort if invalid
- `YYYY` (4-digit year) — abort if not in `(current year - 1)..(current year + 1)`
- Compute:
  - `branch_name = Q<Q>-Release-<YYYY>`
  - `quarter_id = <YYYY>-Q<Q>` (sortable, used for `releases/<quarter_id>.md`)
  - `default_tag = <branch_name>` (override with `--tag`)

Optional flags:
- `--dry-run` — run validation + computation + release-notes preview, but do not create branch/tag/commit/push
- `--tag <name>` — override the default tag name
- `--no-tag` — skip tag creation entirely
- `--since <ref>` — passed through to `/pipeline:release-notes` to override the range start (default: auto-detect from latest `releases/*.md`)

---

## Step 1 — Validate state

All checks must pass before any mutation. Abort with a clear error on the first failure.

```bash
# Working tree clean
git status --porcelain
# Expect: empty output

# On the main branch
git rev-parse --abbrev-ref HEAD
# Expect: <main>

# Main branch up to date with origin
git fetch origin
git rev-list --count <main>..origin/<main>
git rev-list --count origin/<main>..<main>
# Expect: both 0 — local == remote, no pulls or pushes pending

# Target branch must not already exist
git rev-parse --verify <branch_name> 2>/dev/null     # local
git rev-parse --verify origin/<branch_name> 2>/dev/null  # remote
# Expect: both fail (branch doesn't exist)

# Target tag must not already exist (unless --no-tag)
git rev-parse --verify refs/tags/<tag_name> 2>/dev/null   # local
git ls-remote --tags origin refs/tags/<tag_name>          # remote — output should be empty
```

If any check fails, print a clear diagnostic and exit. Do **not** auto-fix (don't auto-pull, don't auto-stash) — the user should know the repo state explicitly before cutting a release.

---

## Step 2 — Cut the branch (skip on `--dry-run`)

```bash
git checkout <main>
git checkout -b <branch_name>
```

Do not push yet. The branch stays local until the gate (Step 5) is passed.

---

## Step 3 — Generate release notes

Invoke the `/pipeline:release-notes` skill — read `${CLAUDE_PLUGIN_ROOT}/skills/release-notes/SKILL.md` and follow its steps with these inputs:
- quarter argument: `<quarter_id>` (e.g. `2026-Q2`)
- `--since` if the user passed it through; otherwise let `/pipeline:release-notes` auto-detect

Output goes to `releases/<quarter_id>.md`. The skill is idempotent — overwriting a previous `releases/<quarter_id>.md` if the user re-runs.

**On `--dry-run`:** invoke `/pipeline:release-notes <quarter_id> --dry-run` so the content is printed but no file is written. Skip Steps 4–7.

---

## Step 4 — Commit the release-notes file

```bash
git add releases/<quarter_id>.md
git commit -m "🚀 ci(release): cut <branch_name> from <main>"
```

If the project's commit convention requires a ticket reference (see `branch-management.md` / the `validate-commit-msg` hook), append the release ticket's `#<id>` — ask the user for it if none was given.

The commit is on `<branch_name>`, not on the main branch. The main branch is untouched by this skill.

---

## Step 5 — Gate before push

Print this summary and wait for confirmation:

```
## Cut release <quarter_id>?

Branch:        <branch_name> (local only — not pushed yet)
Tag:           <tag_name> (skipped — --no-tag)   ← or just <tag_name> if tagging
Cut commit:    <short-sha> (<main> @ <main-sha>)
Release notes: releases/<quarter_id>.md
  - <N> tickets in range
  - <M> with manual deployment steps

Manual deployment steps for this release (see file for full content):
  - <module1>: <count> ticket(s) — <one-line summary of first ticket>
  - <module2>: <count> ticket(s) — ...
  (or: "None — pure code release.")

### After push (manual, per CLAUDE.md):
  - Trigger the build/release pipeline(s) for branch `<branch_name>`
  - Hand `releases/<quarter_id>.md` to whoever deploys

### Confirm
- `y` — push branch + tag to origin
- `n` — pause. Branch + commit + (local) tag stay so you can inspect.
        Resume manually with `git push -u origin <branch_name>` later.
- `q` — abort. Delete local branch + tag, leaves you back on <main> with a clean tree.
```

**Wait for input.** Route on the answer:
- **`y`** → proceed to Step 6.
- **`n`** → exit silently. Final report mentions the resume command.
- **`q`** → run cleanup:
  ```bash
  git checkout <main>
  git branch -D <branch_name>
  git tag -d <tag_name> 2>/dev/null  # ignore failure if --no-tag
  rm -f releases/<quarter_id>.md     # only if it was newly created — check git status before deleting
  ```
  Confirm cleanup, exit.

---

## Step 6 — Tag (skip on `--no-tag`)

```bash
git tag <tag_name> -m "Release cut: <quarter_id> from <main> @ <main-sha>"
```

Annotated tags (`-m`), not lightweight, so the cut date and source ref are preserved in the tag itself.

---

## Step 7 — Push

```bash
git push -u origin <branch_name>
git push origin <tag_name>     # skip on --no-tag
```

---

## Step 8 — Final report

```
✓ Released <quarter_id>

Branch:  <branch_name> (pushed to origin)
Tag:     <tag_name>
Notes:   releases/<quarter_id>.md (<N> tickets, <M> with manual steps)

Next steps (manual):
  1. Kick off the build/release pipeline(s) for `<branch_name>`
  2. Forward `releases/<quarter_id>.md` to whoever performs the manual deployment steps
```

If `--no-tag` was set, omit the Tag line. If `--dry-run` was set, the report shows what would have been done but with a `[DRY RUN]` prefix on every line.

---

## Notes

- **Why annotated tags?** Lightweight tags lose the metadata about when and how the release was cut. Annotated tags carry the message, date, and tagger — re-creating an annotated tag from history is painful, so do it right at cut time.
- **Why default tag = branch name?** Branch-name = tag is unambiguous, sortable by year, and needs no separate versioning decision. If the project uses semver tags, override per cut with `--tag` or change the default in `branch-management.md`.
- **Why no auto-pipeline trigger?** Adding it requires choosing a trigger mechanism, credentials handling, and pipeline ids. That is a separate, project-specific change. The `Next steps` block in the final report keeps the manual hand-off explicit so it doesn't get forgotten.
- **Why gate before push?** A release cut is visible to the entire team and is the kind of action the user should sign off on explicitly — same reason `/pipeline:ship` Step 7a gates before pushing a feature branch.
