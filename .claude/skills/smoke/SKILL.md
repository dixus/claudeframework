---
name: smoke
description: Write and run smoke tests against the Docker stack from a spec. Use after deploying to a Docker environment to verify end-to-end behavior.
disable-model-invocation: true
argument-hint: "[spec-name]"
compatibility: Requires Docker and docker compose
effort: medium
---

Run smoke tests against the running Docker stack for a spec.

$ARGUMENTS is the spec name (e.g. `prd-45-file-virus-scanning`). If omitted, uses the most recently modified spec in `.claude/specs/`.

## Prerequisites

- Docker stack must be running (`docker compose up -d`)
- A smoke test file must exist in the project (auto-detected in Step 2)
- The spec's API routes must already be implemented

## Steps

### 1. Health check

Run `docker compose ps` to verify all containers are running. Then poll the project's health endpoint (read from CLAUDE.md, default: `GET http://localhost:8000/health`) every 5 seconds, up to 60 seconds.

- If all containers are healthy → proceed
- If any container is down or health check fails → stop and report. Do NOT attempt to fix Docker infrastructure — that is out of scope for this skill.

### 2. Detect and write smoke tests

Detect the smoke test file and runner:

1. Check CLAUDE.md for a `smoke_test` or `smoke` command/path
2. If not specified, auto-detect by looking for: `smoke_test.py`, `smoke_test.ts`, `smoke.test.ts`, `tests/smoke.py`, `tests/smoke.ts`, `test/smoke.*`
3. Determine the runner from the file extension: `.py` → `python`, `.ts` → `npx tsx` or `npx ts-node`, `.js` → `node`
4. If no smoke test file exists, create one following the project's primary language (read from CLAUDE.md or `package.json`/`pyproject.toml`)

Read the smoke test file, the spec at `.claude/specs/<name>.md`, and the response schemas referenced in the spec's Affected/New files list.

Add smoke test coverage for the spec's API routes:

- Follow existing patterns in the smoke test file
- Match field names exactly to response schemas — do not guess
- Test happy-path only (smoke tests verify routes respond, not edge cases)

### 3. Run and fix loop (max 3 attempts)

Maintain an attempt counter starting at 0.

1. Run the smoke test file with its detected runner and capture output
2. If all checks pass → proceed to Step 4
3. If any check fails → increment counter. If counter ≥ 3, run `git checkout <smoke-test-file>` to restore the original file, then stop and report the failure output
4. On failure, fix **only the smoke test assertions** — do not modify API code. Common causes: wrong field names, wrong response structure (object vs list), wrong status codes
5. Loop back to step 1

### 4. Final verify

Run the project's full verify suite (typecheck → lint → tests → build) to ensure smoke test changes didn't introduce regressions.

- If all pass → report success
- If any fail → fix and re-run. If still failing after 2 attempts, restore the smoke test file with `git checkout <smoke-test-file>` and report

### 5. Report

- Which routes were tested
- Which assertions were added
- Pass/fail status
- Any routes that could not be smoke-tested and why
