---
name: debug
description: Diagnose and fix a failing test, type error, or runtime error. Use when a specific test or build step is failing.
disable-model-invocation: true
argument-hint: "<error message, test name, or file path>"
effort: medium
---
Diagnose and fix a specific failure. $ARGUMENTS is optional — pass an error message, test name, or file path to focus the investigation.

## Goal

Identify the root cause and apply a minimal fix. Do not refactor surrounding code.

## Steps

1. Read CLAUDE.md — note the verify commands (typecheck, lint, test, build)
2. Identify the failure:
   - If $ARGUMENTS contains an error message or test name, use it as the starting point
   - Otherwise run the full verify suite (typecheck → lint → tests) and capture the first failure
3. Read the failing file(s) in full — understand the surrounding context before touching anything
4. Form a hypothesis: one sentence describing the suspected root cause
5. Validate the hypothesis before changing code:
   - Check if the problem is in the implementation, the test, or the type definitions
   - Look for similar patterns elsewhere in the codebase that work correctly — use Grep to find them
   - If the hypothesis is wrong, revise it; do not apply fixes based on an unvalidated guess
6. Apply the minimal fix — change only what the root cause demands
   - Do not add defensive code, logging, or error handling unless directly required by the bug
   - If the fix requires touching more than 3 files, pause and describe the situation to the user — the bug may be systemic
7. Re-run the specific failing command to confirm the fix works
8. Run the full verify suite to confirm no regressions were introduced
9. If the verify suite still fails, return to step 4 with the new failure — do not apply a second fix on top of an incomplete first fix
10. Report:
    - Root cause (one sentence)
    - Files changed and what changed
    - Verify status before and after
    - If the bug suggests a missing rule in CLAUDE.md or a context file, flag it — do not add it unilaterally
