---
name: 3_fix
description: Fix issues found in a review report in .claude/reviews/. Use after a review identifies issues that need fixing.
disable-model-invocation: true
argument-hint: "[review-file]"
model: claude-opus-4-6
effort: high
maxTurns: 15
---

Fix issues found in a review report.

Steps:

1. Read CLAUDE.md — note the project's test command, lint command, build command, and typecheck command if listed
2. If $ARGUMENTS is provided, read `.claude/reviews/<name>-review.md`. Otherwise read the most recently modified file in `.claude/reviews/`
3. If a corresponding spec exists in `.claude/specs/`, read it too — fixes must stay within the spec's stated requirements
   a. **Phase awareness**: if `.claude/specs/<name>-phases.md` exists, read it. Fixes must stay within the **current phase's scope**. If a review issue references a requirement that belongs to a later (`pending`) phase, skip it with "out of scope for current phase" — do not implement it.
4. Parse the Issues section — work through them in order of severity: critical first, then major, then minor
5. Circuit breaker: for each issue, check whether it appeared in a previous review of the same spec. If the same issue has recurred across two or more review cycles, flag it as a recurring failure, stop fixing, and escalate to the user with a description of the root cause — do not attempt a third fix for the same problem without user guidance.
6. Scope gate: only touch files that are explicitly mentioned in the Issues section of the review report. For each issue: read the affected file, understand the problem, then apply a minimal fix — do not refactor, clean up, or improve any code outside those files. Unrelated issues belong in the next review cycle, not this fix cycle.
7. After fixing all issues, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
   a. Typecheck
   b. Lint
   c. Tests
   d. Build (if listed)
8. If any verify step fails, fix those failures too. If a verify step still fails after two fix attempts, stop and escalate to the user — do not loop.
9. Validation criteria check: if the spec has a "Validation criteria" section, confirm each criterion is still met after the fixes — list each criterion and its status. Any failing criterion is a new critical issue that must be fixed before continuing. (In phased mode, only check criteria assigned to the current phase.)
10. **Self-check against review items**: before declaring done, re-read the review file and verify each issue one by one:
    a. For each issue marked in the review, re-read the affected file at the specific line
    b. Confirm the fix actually addresses the issue described — not just a nearby change
    c. Check that the fix didn't introduce a new problem in the same area (e.g. breaking an import, changing a signature without updating callers)
    d. If any issue is NOT actually resolved, fix it now before proceeding
    This step prevents the common pattern where `/3_fix` reports "all fixed" but the next `/2_review` finds the same issues still present.
11. Spec-anchored check: review whether any fixes diverged from the spec's stated requirements. If they did, update the spec file to reflect the actual intent — keep spec and code in sync.
12. Self-improvement gate: for each fixed issue, ask whether a rule would prevent recurrence. If yes, write it to `.claude/context/lessons.md` immediately using this format:

    ```
    ## YYYY-MM-DD — <topic>
    **scope:** framework | project

    **What went wrong**: ...
    **Rule**: ...
    ```

    Scope guidelines:
    - `scope: framework` — the lesson applies to any project using this framework (e.g., "never skip typecheck", "circular import prevention"). These can graduate to CLAUDE.md rules via `/ship` Step 4b.
    - `scope: project` — the lesson is specific to the current codebase (e.g., "HelpSection goes below panel header", "Likert zero-value bug"). These stay in `lessons.md` and are stripped by `/deploy`.

    When in doubt, use `scope: project` — it's safer to under-promote than to pollute the framework with project-specific rules. Also flag it in the report so the team can consider promoting it to CLAUDE.md.

13. Report:
    - Which issues were fixed
    - Which (if any) were intentionally skipped and why
    - Any recurring issues escalated to the user
    - Whether the spec was updated and why
    - Any suggested CLAUDE.md rules to prevent recurrence (from step 11)
    - Final verify status for each command
    - Validation criteria status (each criterion: met / unmet)

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

After all fixes are applied and verify commands pass, ask: "Fixes applied to [N] files. Ready for re-review — shall I run `/2_review <spec-name>`? (Recommended: /clear first for an unbiased review)"

The fix cycle is not complete until review passes clean. Repeat the fix → review loop until `/2_review` returns "pass".
