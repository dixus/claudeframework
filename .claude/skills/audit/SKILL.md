---
name: audit
description: Audit dependencies for vulnerabilities and scan for committed secrets. Use periodically or when security alerts flag a dependency.
disable-model-invocation: true
---

Check for and fix vulnerable dependencies.

Steps:

0. **Secret scan** (runs before dependency audit):
   1. Check if `gitleaks` is available: `which gitleaks || gitleaks version`
   2. If available, run: `gitleaks detect --verbose --redact`
   3. Report any findings as CRITICAL severity — committed secrets must be rotated
   4. If gitleaks not installed, note "gitleaks not available — secret scan skipped" and continue
1. Detect the package manager by looking for lockfiles in the project root:
   - `package-lock.json` or `npm-shrinkwrap.json` → npm
   - `yarn.lock` → yarn
   - `pnpm-lock.yaml` → pnpm
   - `bun.lockb` → bun
   - `Pipfile.lock` or `poetry.lock` → Python (pip-audit / poetry)
   - `Cargo.lock` → Rust (cargo audit)
   - `go.sum` → Go (govulncheck)
   - If multiple exist, read CLAUDE.md to determine which is authoritative
2. Run the appropriate audit command for the detected package manager
3. Apply safe/non-breaking fixes using the package manager's fix command (e.g. `npm audit fix`, `poetry update`, `cargo update`)
4. Do not apply breaking changes (e.g. `npm audit fix --force`) without explicit user approval — report them instead
5. Read CLAUDE.md to discover the project's test command, then run it to verify the updates did not break anything
6. Report:
   - Which vulnerabilities were found
   - Which were fixed automatically
   - Which remain and why (e.g. require a breaking change or have no fix available)
   - Final test status
