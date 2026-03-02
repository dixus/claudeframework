---
name: 4_test
description: Run the full verify suite and report results — no fixes applied
disable-model-invocation: true
---
Run the full verify suite and report the results. Do not fix anything — report only.

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
   - A clear overall status: PASS or FAIL
5. If there are failures, identify the root cause for each and suggest a fix — but do not apply fixes unless the user asks
