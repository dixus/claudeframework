# Instincts

Short, high-priority rules that apply in every session regardless of project or task. These override default behaviour. Read before starting any implementation.

---

## Files

- **Read before editing.** Never modify a file you haven't read in the current session.
- **Prefer editing over creating.** If an existing file can be extended, extend it. Only create a new file when there is no reasonable alternative.
- **Minimal footprint.** Only touch files the task directly requires. Do not clean up unrelated code, add comments to untouched functions, or refactor things that aren't broken.

## Code

- **Minimal change.** Apply the smallest change that solves the problem. A three-line fix is better than a refactored module.
- **No speculative code.** Do not add error handling, fallbacks, or configurability for scenarios that don't exist yet.
- **No dead code.** Do not leave commented-out code, unused variables, or orphaned imports. Delete them.
- **One concern per commit.** If a task touches multiple unrelated things, split the commit.

## Planning

- **Plan mode threshold.** Enter plan mode for any task with 3+ steps or architectural decisions. Use `EnterPlanMode` before starting.
- **Stop and re-plan.** If something goes sideways mid-task, stop immediately and re-plan — don't keep pushing.

## Verification

- **Never skip typecheck.** Tests can pass while types are broken. Always run typecheck independently.
- **Failing test = red first.** In a TDD loop, confirm the test fails before implementing. A test that passes immediately was never testing anything.
- **No fix stacking.** If a fix doesn't resolve the failure, revert and re-diagnose. Do not apply a second fix on top of an unresolved first fix.

## Self-improvement

- **Capture corrections.** After any user correction, add the lesson to `.claude/context/lessons.md` — what went wrong and the rule that prevents it.
- **Read lessons on start.** Check `.claude/context/lessons.md` at the start of any session that resembles a past correction.
- **Prefer root causes.** Fix the underlying mistake pattern, not just the symptom.

## Communication

- **State what you're doing, then do it.** Don't narrate every micro-step, but be explicit about non-obvious decisions.
- **Flag before deviating.** If the spec or task description conflicts with what you're seeing in the code, say so before proceeding.
- **Surface blockers early.** If a task requires more than 3 files changed beyond what was discussed, pause and describe the situation.
