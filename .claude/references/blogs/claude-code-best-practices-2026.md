# Claude Code Best Practices (2026)

Source: Web research — code.claude.com/docs/en/best-practices, f22labs, boristane, infoq
Date collected: 2026-03-02
Status: processed

---

## Core constraint: context window

- LLM performance degrades as context fills — this drives every best practice
- Track context usage; use a custom status line
- `/clear` between unrelated tasks
- `/compact Focus on X` mid-task to slim context
- Use subagents for investigation so file reading doesn't pollute main session

## CLAUDE.md

- Run `/init` to generate a starter file
- Keep it ruthlessly short — if removing a line wouldn't cause mistakes, remove it
- Bloated CLAUDE.md causes Claude to ignore half of it
- Only include: bash commands Claude can't guess, non-default style rules, architecture constraints, environment quirks, gotchas
- Never include: things Claude infers from reading code, standard conventions, file-by-file descriptions
- Add emphasis (`IMPORTANT`, `YOU MUST`) for critical rules
- Use `@path/to/file` imports to avoid duplication
- Check it into git so the team can contribute
- Can live in: `~/.claude/CLAUDE.md` (all projects), `./CLAUDE.md` (project), parent dirs (monorepo), child dirs (loaded on demand)

## Explore → Plan → Implement → Commit workflow

1. Enter Plan Mode — Claude reads, does not write
2. Ask for a detailed plan — press Ctrl+G to open plan in editor
3. Switch to Normal Mode — implement with verification
4. Commit with descriptive message and PR

Plan mode is most useful when: scope is unclear, change touches multiple files, unfamiliar code. Skip for single-line fixes.

## Prompting

- Scope the task: specify which file, scenario, testing preferences
- Point to sources: "look through git history of X"
- Reference existing patterns: "follow the pattern in HotDogWidget.php"
- Describe the symptom: provide location and what "fixed" looks like
- Provide verification criteria (test cases, screenshots, expected output)
- For larger features: have Claude interview you first using AskUserQuestion tool
- Vague prompts are ok when exploring

## Session management

- Esc: stop Claude, context preserved
- Esc+Esc / /rewind: restore to checkpoint
- Every action creates a checkpoint — can restore code only, conversation only, or both
- Checkpoints persist across sessions
- /clear: reset context, use between unrelated tasks
- claude --continue: resume most recent session
- claude --resume: pick from recent sessions
- /rename: name sessions descriptively ("oauth-migration")
- If corrected 2+ times on same issue: /clear and write better prompt

## Subagents

- Single highest-leverage tool for context management
- "Use a subagent to investigate X" — subagent explores, reports back summary
- Define in .claude/agents/ with specific tools and model
- Great for: investigation, review, test running, security audit
- Writer/Reviewer pattern: Session A implements, Session B reviews (unbiased context)

## Skills vs CLAUDE.md vs Hooks

- CLAUDE.md: always-on, short, project-wide conventions
- Skills (.claude/skills/): domain knowledge or workflows loaded on demand
- Hooks: deterministic actions that MUST happen (auto-lint, block writes to protected dirs)
- Subagents (.claude/agents/): isolated context for specialized tasks

## Parallel sessions

- Creator Boris Cherny runs 5+ sessions in parallel, each in its own git checkout
- Desktop app: manage multiple sessions with isolated worktrees
- Web: run on Anthropic cloud in isolated VMs
- Fan-out: loop through files calling `claude -p` in parallel for migrations

## Non-interactive / CI mode

- `claude -p "prompt"` — one-off, no session
- `--output-format json` or `stream-json` for scripting
- `--allowedTools` to restrict permissions for batch operations
- Pipe: `cat error.log | claude -p "alert me if anomalies"`
- `--dangerously-skip-permissions` for fully contained lint/boilerplate workflows (use in container without internet)

## Common failure patterns

- Kitchen sink session: mixing unrelated tasks — fix with /clear
- Correcting over and over: polluted context — fix with /clear + better prompt
- Over-specified CLAUDE.md: important rules get lost — prune ruthlessly
- Trust-then-verify gap: plausible-looking but wrong — always provide verification
- Infinite exploration: unscoped investigation fills context — use subagents
