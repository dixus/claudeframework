---
name: deploy
description: Deploy the framework to a target project by replacing shared dirs with symlinks (junctions) back to the framework repo. Run once after copying .claude/ to a new project.
argument-hint: <target-project-path>
model: sonnet
---

Replace shared framework directories in a target project with junctions pointing back to this framework repo, so updates propagate automatically.

## Prerequisites

- The target project must already have a `.claude/` directory (either copied from Framework or created fresh)
- This skill must be run from the Framework repo (the source of truth)

## Shared vs local directories

**Shared (symlinked)** — maintained in Framework, identical across all projects:

| Dir         | Contents                             |
| ----------- | ------------------------------------ |
| `skills/`   | All 18+ skill definitions            |
| `agents/`   | Subagent personas                    |
| `rules/`    | Auto-loaded instructions (instincts) |
| `commands/` | Custom slash commands                |

**Local (never symlinked)** — project-specific, stay as regular directories:

| Dir                   | Why local                          |
| --------------------- | ---------------------------------- |
| `context/`            | Project-specific knowledge base    |
| `specs/`              | Feature specs for this project     |
| `reviews/`            | Review reports for this project    |
| `input/`              | Requirements for this project      |
| `references/`         | Research material for this project |
| `hooks/`              | Project-specific lifecycle hooks   |
| `handoffs/`           | Session state (gitignored)         |
| `docs/`               | Generated docs (project-specific)  |
| `worktrees/`          | Git worktree state                 |
| `settings.json`       | Project-specific settings          |
| `settings.local.json` | Local overrides                    |
| `metrics.csv`         | Pipeline run log                   |

## Steps

1. **Validate target path.** $ARGUMENTS must be an absolute path or relative path to a project directory. Resolve it to absolute. Confirm `<target>/.claude/` exists. If not, ask: "No `.claude/` directory found at `<target>`. Copy the full framework first? (Y/N)" — if Y, copy the entire `.claude/` directory to the target, then continue.

2. **Detect OS.** Run `uname -s` to detect the platform:
   - **Windows** (MINGW/MSYS/CYGWIN): use `cmd.exe //c "mklink /J <link> <target>"` (junctions — no admin rights needed)
   - **Linux/macOS**: use `ln -s <target> <link>` (standard symlinks)

3. **Detect framework root.** The framework repo root is the working directory where this skill is invoked. Store as `$FRAMEWORK_ROOT`. Verify `$FRAMEWORK_ROOT/.claude/skills/` exists.

4. **For each shared directory** (`skills`, `agents`, `rules`, `commands`):

   a. Check if `<target>/.claude/<dir>` is already a symlink/junction pointing to the correct source:
   - On Windows: `cmd.exe //c "dir <target>\.claude\" | grep <dir>` and look for `<JUNCTION>` marker
   - On Linux/macOS: `readlink <target>/.claude/<dir>`
   - If already correctly linked → skip with message: `<dir>/ — already linked ✓`

   b. Check if `<target>/.claude/<dir>` exists as a regular directory:
   - If it exists and contains files, back it up: `mv <target>/.claude/<dir> <target>/.claude/<dir>.bak`
   - Log: `<dir>/ — backed up existing to <dir>.bak`

   c. Create the junction/symlink:
   - Windows: `cmd.exe //c "mklink /J <target>\.claude\<dir> <framework>\.claude\<dir>"`
   - Linux/macOS: `ln -s <framework>/.claude/<dir> <target>/.claude/<dir>`

   d. Verify the link works by listing its contents: `ls <target>/.claude/<dir>/`
   - If listing fails, report error and restore backup if one exists

5. **Ensure local directories exist.** For each local directory (`context`, `specs`, `reviews`, `input`, `references`, `hooks`, `handoffs`, `docs`), create it if missing: `mkdir -p <target>/.claude/<dir>`

6. **Clean up stale files.** If `<target>/.claude/context/instincts.md` exists as a regular file (not via the `rules/` symlink), delete it — `rules/instincts.md` is now provided through the symlink and having both causes duplication.

7. **Report.**

```
## Deploy complete

Target: <target-path>

| Directory   | Status                    |
|-------------|---------------------------|
| skills/     | linked → Framework ✓      |
| agents/     | linked → Framework ✓      |
| rules/      | linked → Framework ✓      |
| commands/   | linked → Framework ✓      |
| context/    | local (kept as-is) ✓      |
| specs/      | local (kept as-is) ✓      |
| ...         | ...                       |

Backups (if any): <list .bak dirs or "none">

The target project now receives framework updates automatically.
To update: pull changes in the Framework repo — all linked projects get them instantly.
```
