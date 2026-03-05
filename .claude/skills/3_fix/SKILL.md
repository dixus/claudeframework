---
name: 3_fix
description: Fix issues found in a review report in .claude/reviews/
disable-model-invocation: true
---
Fix issues found in a review report.

Steps:
1. Read CLAUDE.md — note the project's test command, lint command, build command, and typecheck command if listed
2. If $ARGUMENTS is provided, read `.claude/reviews/<name>-review.md`. Otherwise read the most recently modified file in `.claude/reviews/`
3. If a corresponding spec exists in `.claude/specs/`, read it too — fixes must stay within the spec's stated requirements
4. Parse the Issues section — work through them in order of severity: critical first, then major, then minor
5. Circuit breaker: for each issue, check whether it appeared in a previous review of the same spec. If the same issue has recurred across two or more review cycles, flag it as a recurring failure, stop fixing, and escalate to the user with a description of the root cause — do not attempt a third fix for the same problem without user guidance.
6. For each issue: read the affected file, understand the problem, then apply a minimal fix — do not refactor surrounding code
7. After fixing all issues, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
   a. Typecheck
   b. Lint
   c. Tests
   d. Build (if listed)
8. If any verify step fails, fix those failures too. If a verify step still fails after two fix attempts, stop and escalate to the user — do not loop.
9. Validation criteria check: if the spec has a "Validation criteria" section, confirm each criterion is still met after the fixes — list each criterion and its status. Any failing criterion is a new critical issue that must be fixed before continuing.
10. Spec-anchored check: review whether any fixes diverged from the spec's stated requirements. If they did, update the spec file to reflect the actual intent — keep spec and code in sync.
11. Self-improvement gate: for each fixed issue, ask whether a rule added to CLAUDE.md or a context file would prevent recurrence. If yes, note it in the report — flag it as a suggested rule addition for the team to review.
12. Report:
    - Which issues were fixed
    - Which (if any) were intentionally skipped and why
    - Any recurring issues escalated to the user
    - Whether the spec was updated and why
    - Any suggested CLAUDE.md rules to prevent recurrence (from step 11)
    - Final verify status for each command
    - Validation criteria status (each criterion: met / unmet)

**Pipeline handoff (mandatory — state this explicitly in chat):** The fix cycle is not complete until review passes clean. Next step: run `/2_review <spec-name>` in a fresh session (`/clear` first) to confirm all issues are resolved and no new ones were introduced. Repeat the fix → review loop until `/2_review` returns "pass".
