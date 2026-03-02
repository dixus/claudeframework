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
5. For each issue: read the affected file, understand the problem, then apply a minimal fix — do not refactor surrounding code
6. After fixing all issues, run the project's verify commands in this order (read them from CLAUDE.md, skip any not listed):
   a. Typecheck
   b. Lint
   c. Tests
   d. Build (if listed)
7. If any verify step fails, fix those failures too
8. Spec-anchored check: review whether any fixes diverged from the spec's stated requirements. If they did, update the spec file to reflect the actual intent — keep spec and code in sync.
9. Self-improvement gate: for each fixed issue, ask whether a rule added to CLAUDE.md or a context file would prevent recurrence. If yes, note it in the report — flag it as a suggested rule addition for the team to review.
10. Report:
    - Which issues were fixed
    - Which (if any) were intentionally skipped and why
    - Whether the spec was updated and why
    - Any suggested CLAUDE.md rules to prevent recurrence (from step 9)
    - Final verify status for each command
11. Remind the user to run `/2_review` again in a fresh session to confirm all issues are resolved and no new ones were introduced
