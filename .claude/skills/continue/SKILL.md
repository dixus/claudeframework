---
name: continue
description: Resume work from a handoff file after /clear or in a new session
disable-model-invocation: true
---
Restore context from a handoff file and prepare to resume work.

$ARGUMENTS is optional — pass a filename or label to load a specific handoff. Without arguments, loads the most recently modified file in `.claude/handoffs/`.

## Steps

1. Find the handoff file:
   - If $ARGUMENTS provided: look for `.claude/handoffs/<ARGUMENTS>.md` or the closest match by name
   - Otherwise: find the most recently modified `.md` file in `.claude/handoffs/`
2. Read the handoff file in full
3. Read the referenced spec file (if listed under "Active files")
4. Read the referenced review file (if listed under "Active files")
5. Briefly read the listed key source files — enough to understand current state, not full implementation detail
6. Report a summary to the user:
   - Current task (one sentence)
   - Pipeline position
   - Open questions (if any)
   - Proposed next step (verbatim from handoff)
7. Ask: "Ready to continue with [next step]?" — wait for confirmation before doing anything
