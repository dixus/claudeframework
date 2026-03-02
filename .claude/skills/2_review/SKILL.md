---
name: 2_review
description: Review implementation changes and write a report to .claude/reviews/
disable-model-invocation: true
---
Review the current implementation changes and produce a written review report.

IMPORTANT: For best results, run this skill in a fresh session (/clear first) so the review is unbiased by the implementation context.

Use a subagent to do the file investigation so the reading does not consume the main session's context. The subagent should return its findings and you write the report from those findings.

Steps:
1. Read CLAUDE.md for project context and conventions
2. If $ARGUMENTS is provided, treat it as a spec filename and read `.claude/specs/<name>.md` to understand what was intended
3. Read all files in `.claude/context/` if the directory exists — for additional project context when evaluating correctness
4. Identify what changed: use the project's version control system (e.g. `git diff main` or `git diff HEAD~1`); if not in a VCS repo, ask the user which files to review
5. Read each changed file in full
6. Evaluate against these criteria (multi-role review — address each lens):
   - **Correctness**: does it match the spec requirements? Are there logic bugs or missing cases?
   - **Code quality**: does it follow existing patterns? Is anything over-engineered or unnecessarily complex?
   - **Security**: any injection risks, exposed secrets, or missing input validation at system boundaries? OWASP top-10 considerations?
   - **Tests / QA**: are the relevant cases covered? Are there obvious edge-case gaps? Any regression risk to existing behavior?
   - **UX / Minimal impact**: does the change touch only what's necessary? Any scope creep? Are any fixes patches hiding a root-cause problem that should be fixed properly?
   - **PM**: does the change deliver business value? Does it align with the stated goal in the spec? Is anything built that wasn't asked for?
   - **DevOps**: any CI/CD implications? Environment variables, build config, or deployment steps affected? Any observability gaps (missing logs, metrics)?
   - **Spec validation**: check "Validation criteria" in the spec if present — can each criterion be confirmed from the diff?
7. Write the review to `.claude/reviews/<name>-review.md` (use spec name if available, otherwise `latest-review.md`) with sections:
   - **Summary**: overall assessment (pass / pass with fixes / needs rework)
   - **Issues**: numbered list, each with severity (critical / major / minor), affected file + line, and a clear description
   - **Suggestions**: optional improvements that are not blockers
8. Print the issue list to the chat so the user sees it immediately without opening the file
