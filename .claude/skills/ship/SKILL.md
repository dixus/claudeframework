---
name: ship
description: Orchestrate the full pipeline — each phase runs in a clean subagent context, files on disk are the handoff mechanism
disable-model-invocation: true
---
> **Recommended model: `claude-opus-4-6`** — orchestration decisions and the review subagent both require deep reasoning.

Orchestrate the full spec-to-commit pipeline for the feature described in $ARGUMENTS or in `.claude/input/`.

**Architecture:** The main session is a thin orchestrator only — it never reads code files or accumulates implementation context. Each phase runs in a dedicated subagent with a clean context. The spec file, review file, and git diff are the handoff mechanism between phases.

```
Main session (orchestrator — reads summaries only)
  ├── Step 0: branch setup          →  creates feat/<spec-name>
  ├── Subagent A: questions + spec  →  writes .claude/specs/<name>.md
  ├── Subagent B: implement         →  commits to branch, returns summary
  ├── Subagent C: review            →  writes .claude/reviews/<name>-review.md
  ├── Subagent D: fix               →  applies fixes  →  loop back to C
  ├── Subagent E: smoke test        →  validates against Docker stack
  ├── Subagent F: commit            →  atomic commits on feature branch
  └── Step 7: merge + push          →  merges feat/<spec-name> → main
```

---

## Step 0 — Branch setup (orchestrator)

Before doing anything else:
1. Check the current branch with `git branch --show-current`
2. If already on a feature branch (not `main` or `master`), skip this step
3. Otherwise run: `git checkout -b feat/<spec-name>` where `<spec-name>` is derived from $ARGUMENTS or the most recently modified file in `.claude/input/`
4. Confirm the branch was created and note the branch name — all subsequent subagent commits will land here

---

## Step 1 — Front-load questions (orchestrator)

Read only CLAUDE.md and `.claude/input/` to understand the feature scope.
Ask all clarifying questions in a **single batch** before launching any subagent. Use selectable options where possible.
Wait for answers. This is the only user interruption before commit.

If requirements are fully unambiguous, skip to Step 2.

---

## Step 2 — Spec subagent

Launch a subagent with:
> "Read `.claude/skills/0_spec/SKILL.md` and follow all steps exactly. The feature to spec is: $ARGUMENTS. The user has already answered clarifying questions; their answers are: [paste answers from Step 1 here, or 'none — requirements are unambiguous']. Do not ask further questions — skip step 6. You are running as a subagent. Write the spec and return: (1) the spec filename, (2) the file count from Affected files + New files, (3) a one-paragraph summary of what will be built."

Read the returned summary. Do not read the spec file itself.

**Complexity gate:** if the returned file count > 10, stop and tell the user — suggest decomposing into sub-specs. Do not continue without user confirmation.

---

## Step 3 — Implement subagent

Launch a subagent with:
> "Read `.claude/skills/1_implement/SKILL.md` and follow all steps exactly for spec: <spec-name>. Auto-proceed through plan mode (step 7) without waiting for approval. You are running as a subagent. Return: (1) list of files changed, (2) verify suite status (pass/fail), (3) any blockers that prevented completion."

Read the returned summary. Do not read any changed files.

If the subagent reports a blocker (verify suite failing after two attempts), stop and report to the user — do not continue to review.

---

## Step 4 — Review/Fix loop (max 3 cycles)

Maintain a cycle counter starting at 0.

### Review subagent

Launch a subagent with:
> "Read `.claude/skills/2_review/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) the overall assessment (pass / pass with fixes / needs rework), (2) the full numbered issue list with severities."

Read the returned assessment. Do not read the review file itself.

Route:
- **"pass"** → go to Step 5 (smoke test)
- **"pass with fixes"** or **"needs rework"** → increment cycle counter. If counter ≥ 3, stop and escalate to the user with the recurring issues — do not attempt a fourth fix cycle. Otherwise proceed to Fix subagent.

### Fix subagent

Launch a subagent with:
> "Read `.claude/skills/3_fix/SKILL.md` and follow all steps exactly for spec: <spec-name>. You are running as a subagent. Return: (1) list of issues fixed, (2) any issues skipped and why, (3) verify suite status, (4) any lessons written to `.claude/context/lessons.md`."

Read the returned summary. Loop back to Review subagent.

---

## Step 5 — Smoke test (orchestrator-managed, max 3 fix attempts)

Skip this step if no `smoke_test.py` exists in the project root.

### 5a. Start Docker stack

Run `docker compose up -d` from the `infra/docker/` directory (or project root — check where `docker-compose.yml` lives). Wait for the API to be healthy: poll `GET http://localhost:8000/health` every 5 seconds, up to 60 seconds. If health check never passes, stop and report to the user.

### 5b. Write smoke tests

Launch a subagent with:
> "Read `smoke_test.py`, the spec at `.claude/specs/<spec-name>.md`, and the Pydantic response schemas in the relevant `schemas.py` file (check the spec's Affected/New files list). Add smoke test coverage for the new PRD's API routes — follow the existing patterns in `smoke_test.py`. Match field names exactly to the Pydantic response schemas — do not guess field names. You are running as a subagent. Return: (1) which routes were added, (2) list of response schema field names used."

### 5c. Run and fix loop (max 3 attempts)

Maintain an attempt counter starting at 0.

1. Run `python smoke_test.py` and capture output
2. If all checks pass → proceed to Step 6
3. If any check fails → increment attempt counter. If counter ≥ 3, run `git checkout smoke_test.py` to restore the original smoke test file, then stop and escalate to user with the failure output
4. On failure, launch a fix subagent:
   > "Read `smoke_test.py` and the Pydantic response schemas in the relevant `schemas.py`. The smoke test failed with this output: [paste failure output]. Fix only the smoke test assertions — do not modify API code. Common causes: wrong field names, wrong response structure (object vs list), wrong status codes. You are running as a subagent. Return: what was fixed and why."
5. Loop back to step 1

---

## Step 6 — Commit subagent

Launch a subagent with:
> "Read `.claude/skills/commit/SKILL.md` and follow all steps exactly. Split into atomic commits if multiple concerns are present. You are running as a subagent. Return the commit hash(es) and message(s)."

---

## Step 7 — Finalize (orchestrator)

Ask the user: "Branch `feat/<spec-name>` is ready and all checks pass. How do you want to finalize?
A) Merge to main now (`git merge` + `push`)
B) Open a PR (show me the GitHub PR URL)
C) Leave on branch — I'll handle it manually"

Execute the chosen option. If A: `git checkout main && git merge feat/<spec-name> && git push`. If push fails, report to the user — do not force-push.

---

## Final report (orchestrator)

Print a summary assembled from subagent return values:
- Branch: `feat/<spec-name>` → merged to `main`
- Spec: `.claude/specs/<name>.md`
- Files changed: [from Step 3]
- Review cycles: N
- Final status: pass
- Commits: [hash + message from Step 6]
- Pushed: yes / no (with reason if failed)
