---
name: 2_review
description: Review implementation changes and write a report to .claude/reviews/
disable-model-invocation: true
---
> **Recommended model: `claude-opus-4-6`** — multi-lens review (correctness, security, spec validation, etc.) requires deep reasoning. Using Sonnet risks missing subtle issues.

Review the current implementation changes and produce a written review report.

IMPORTANT: For best results, run this skill in a fresh session (/clear first) so the review is unbiased by the implementation context.

Use a subagent to do the file investigation so the reading does not consume the main session's context. The subagent should return its findings and you write the report from those findings.

Steps:
1. Read CLAUDE.md for project context and conventions
2. If $ARGUMENTS is provided, treat it as a spec filename and read `.claude/specs/<name>.md` to understand what was intended
3. **Phase awareness**: check if `.claude/specs/<name>-phases.md` exists. If it does:
   - Read it and identify the current phase (the phase with status `in-progress`, or the latest `done` phase)
   - Scope all review lenses to the current phase's requirements and validation criteria only
   - Requirements belonging to later phases (status: `pending`) are explicitly **out of scope** — do not flag them as missing in Correctness, PM, or Spec validation
   - State at the top of the review report: "**Reviewing Phase N of M** — later-phase items are out of scope"
   - On the **final phase** (no `pending` phases remain), review against the **full spec** to catch cross-phase integration issues
4. Read all files in `.claude/context/` if the directory exists — for additional project context when evaluating correctness
5. **Detect review mode** — check if `.claude/reviews/<name>-review.md` already exists from a previous cycle:
   - **If no previous review exists → full review mode** (steps 6-8 below)
   - **If a previous review exists → delta review mode** (step 9 below)

### Full Review Mode (first review cycle)

6. Identify what changed: use the project's version control system (e.g. `git diff main` or `git diff HEAD~1`); if not in a VCS repo, ask the user which files to review
7. Read each changed file in full
8. Evaluate against these criteria (multi-role review — address each lens):
   - **Correctness**: does it match the spec requirements? Are there logic bugs or missing cases?
   - **Code quality**: does it follow existing patterns? Is anything over-engineered or unnecessarily complex?
   - **Security**: any injection risks, exposed secrets, or missing input validation at system boundaries? OWASP top-10 considerations?
   - **Tests / QA**: are the relevant cases covered? Are there obvious edge-case gaps? Any regression risk to existing behavior?
   - **UX / Minimal impact**: does the change touch only what's necessary? Any scope creep? Are any fixes patches hiding a root-cause problem that should be fixed properly?
   - **PM**: does the change deliver business value? Does it align with the stated goal in the spec? Is anything built that wasn't asked for?
   - **DevOps**: any CI/CD implications? Environment variables, build config, or deployment steps affected? Any observability gaps (missing logs, metrics)?
   - **Spec validation**: check "Validation criteria" in the spec if present — can each criterion be confirmed from the diff? List each criterion and whether it is met or unmet.

### Delta Review Mode (subsequent review cycles)

9. When a previous review file exists, do a **focused delta review** instead of a full re-review. This prevents discovering "new" issues each cycle and ensures convergence:
   a. Read the previous review file (`.claude/reviews/<name>-review.md`)
   b. Identify what changed since the last review: `git diff` against the state before fixes (use commit hashes or stash references from the fix cycle)
   c. **Escalation check**: if the fix diff is large (>50% of the original implementation diff) or touches files not mentioned in the previous review, the fixes are too invasive for delta mode — fall back to **full review mode** (steps 6-8) to catch issues the broader changes may have introduced. State "escalating to full review — fix scope was too broad" in the report.
   d. For each issue from the previous review:
      - **Verify the fix**: read the affected code — is the issue actually resolved? Mark as ✅ fixed or ❌ still present
   e. **Regression scan**: review ONLY the lines/files changed by the fix cycle — check for:
      - New bugs introduced by the fix
      - Verify step regressions (did something that was passing now break?)
      - Scope creep (did the fix touch more than necessary?)
   f. Do NOT re-evaluate unchanged code against the full 8-lens criteria — that was already done in the first cycle
   g. Only flag genuinely new issues that exist in code touched by the fix cycle

### Severity-Based Verdict (applies to both modes)

10. Write the review to `.claude/reviews/<name>-review.md` (use spec name if available, otherwise `latest-review.md`) with sections:
   - **Summary**: overall assessment — use the severity-based verdict rules below
   - **Issues**: numbered list, each with severity (critical / major / minor), affected file + line, and a clear description
   - **Suggestions**: optional improvements that are not blockers (never block a "pass" verdict)

   **Verdict rules:**
   - **"pass"** → no critical or major issues. Minor-only issues (if any) go in the Suggestions section, not Issues. The implementation ships as-is.
   - **"pass with fixes"** → no critical issues, but 1+ major issues that must be fixed. Minor issues go in Suggestions.
   - **"needs rework"** → 1+ critical issues (architectural problems, security vulnerabilities, spec requirements not met, data loss risk).

   Key principle: **minor issues never block shipping.** Style nits, optional refactors, "nice to have" improvements, and subjective preferences belong in Suggestions and do not trigger another fix/review cycle.

11. Print the issue list to the chat so the user sees it immediately without opening the file.

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

Based on the verdict, perform the applicable action and ask the user a direct question:

- If **"pass"** and **more phases remain**: update the phase manifest (mark current phase status as `done`). Ask: "Phase N passed. Ready to run `/1_implement <spec-name>` for Phase N+1 — shall I proceed?"
- If **"pass"** and **no phases remain**: Ask: "Review passed. Shall I mark PRD-XX as done in the backlog and prepare a commit?"
- If **"pass with fixes"** or **"needs rework"**: Ask: "There are [N] issues ([X] major, [Y] critical). Shall I run `/3_fix <spec-name>` now, or do you want to review the findings first? (Tip: /clear before fixing gives a cleaner context)"

Do not summarize and stop. Always end with a direct question to the user.
