---
name: handoff
description: Capture current session state to a handoff file. Use before /clear, when context is getting full, or when ending a session mid-task.
disable-model-invocation: true
argument-hint: "[label]"
effort: low
---
Capture the current session state into a timestamped handoff file.

$ARGUMENTS is optional — pass a short label to identify the handoff (e.g. `scoring-engine-wip`).

## Goal

Write a concise handoff file that lets a fresh session resume exactly where this one left off — without needing to re-read the conversation history.

## Steps

1. Run `git status` and `git diff HEAD --stat` to see what files changed this session
2. Check `.claude/specs/` for the most recently modified spec (the active work item)
3. Check `.claude/reviews/` for any open review reports
4. Identify the current pipeline position:
   - Speccing → implementing → reviewing → fixing → testing → done
5. Write `.claude/handoffs/YYYY-MM-DD-HH-MM.md` using this structure:

```markdown
# Handoff: <label or inferred task name>
Date: <timestamp>

## Current task
<One sentence: what are we building or fixing?>

## Pipeline position
<Which skill was running or is next: /0_spec / /1_implement / /2_review / /3_fix / /4_test>

## Active files
- Spec: `.claude/specs/<name>.md` (if applicable)
- Review: `.claude/reviews/<name>-review.md` (if applicable)
- Key source files: <list only files actively being worked on>

## Decisions made this session
<Bullet list of non-obvious choices made — things not visible from reading the code>

## Open questions
<Unresolved issues or things to verify before continuing. Write "None" if clean.>

## Next step
<Exact action to take when resuming — specific enough to execute without rereading the conversation>
```

6. Report the handoff file path
7. Remind the user: run `/clear` after confirming the handoff looks correct, then `/continue` in the new session to restore context
