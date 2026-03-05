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
   - A clear overall status: **PASS** or **FAIL**

**Pipeline routing (mandatory — state this explicitly in chat):**
- Overall status is **PASS** → the verify suite is clean. If this was run as part of the pipeline, the next step is `/2_review` to validate correctness against the spec.
- Overall status is **FAIL** → identify the root cause for each failure and suggest a specific fix — but do not apply fixes. Route to `/debug <error>` to investigate and fix individual failures, or to `/3_fix` if the failures are review-identified issues. The pipeline cannot advance with a failing suite.
