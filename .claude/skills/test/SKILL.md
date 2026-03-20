---
name: test
description: Run the full verify suite and report results — no fixes applied. Use to check baseline health before starting work, after a merge, or when CI is red.
disable-model-invocation: true
argument-hint: "[file-or-pattern]"
---
Run the full verify suite and report the results. Do not fix anything — report only.

Primary use case: run this skill when CI is red, after a merge/rebase, or before starting a new PRD to confirm the baseline is clean. This is intentionally read-only — no fixes are applied here.

Use a subagent to run the commands so the output does not consume the main session's context. The subagent should return a structured summary.

Steps:
1. Read CLAUDE.md to discover the project's verify commands (typecheck, lint, tests, build). If no commands are listed, detect them from the project structure (e.g. package.json scripts, Makefile, pyproject.toml, Cargo.toml, etc.)
2. If $ARGUMENTS is provided, run only that specific test file or test pattern using the project's test runner
3. Otherwise run all verify commands in this order:
   a. Typecheck (e.g. `tsc --noEmit`, `mypy`, `pyright`, or equivalent — skip if none detected)
   b. Lint (e.g. `eslint`, `ruff`, `clippy`, or equivalent — skip if none detected)
   c. Tests (e.g. `vitest`, `pytest`, `cargo test`, `go test ./...`, or equivalent)
   d. Build (e.g. `npm run build`, `cargo build`, `go build`, or equivalent — skip if none detected)
4. Report:
   - Each command run and its exit status
   - How many tests passed / failed / skipped
   - Any typecheck or lint errors with file and line reference
   - A clear overall status: **PASS** or **FAIL**

**ACTION REQUIRED — do not end your response without doing this:**

If running as a subagent (no direct user interaction), skip the question and return the structured summary instead.

- If overall status is **PASS**: Ask: "All checks pass. This was run as [standalone check / part of pipeline]. Shall I proceed to `/2_review <spec-name>`?"
- If overall status is **FAIL**: Identify the root cause for each failure and suggest a specific fix — but do not apply fixes. Then ask: "Suite is FAIL with [N] failures. How do you want to proceed? A) Route to `/3_fix` if these are known review issues B) Route to `/debug` for a specific error C) Show me the full error output first"

Do not end your response without asking this question.
