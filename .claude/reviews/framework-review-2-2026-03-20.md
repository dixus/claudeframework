# Framework Review #2 — 2026-03-20

**Reviewer**: Claude Opus 4.6 (fresh session, post-hook implementation)
**Subject**: Claude Code Development Framework (.claude/ directory)
**Scope**: Full re-audit — all skills, hooks, context, docs, settings, specs, references
**Delta from Review #1**: Added 2 hooks (protect-secrets, post-compact), registered auto-format

---

## Overall Rating: 8.4 / 10 — Advanced, Near State-of-the-Art (+0.2 from Review #1)

| Category                         | Review #1 | Review #2 | Delta    | Notes                                                             |
| -------------------------------- | --------- | --------- | -------- | ----------------------------------------------------------------- |
| Pipeline Architecture            | 9.0       | 9.0       | —        | Unchanged — still best-in-class                                   |
| Skill Quality & Coverage         | 8.5       | **8.0**   | -0.5     | **Downgraded**: audit found 3 missing skills claimed in CLAUDE.md |
| Review & Quality Assurance       | 9.5       | 9.5       | —        | Still the strongest component                                     |
| Knowledge Management             | 8.0       | 8.0       | —        | Unchanged                                                         |
| Context Management               | 7.5       | **7.8**   | +0.3     | PostCompact hook adds compaction recovery                         |
| Modern Feature Adoption          | 6.0       | 6.0       | —        | No new features adopted yet                                       |
| Documentation & Onboarding       | 8.5       | **8.0**   | -0.5     | **Downgraded**: CLAUDE.md claims skills that don't exist          |
| Hook & Automation Infrastructure | 7.0       | **8.0**   | +1.0     | 4 hooks now registered, covering 4 lifecycle events               |
| **Weighted Total**               | **8.2**   | **8.4**   | **+0.2** |                                                                   |

---

## What Changed Since Review #1

### Improvements

- **+1 hook**: [protect-secrets.js](.claude/hooks/protect-secrets.js) — blocks writes to `.env`, `*.pem`, `*.key`, `credentials.*`, etc. via PreToolUse exit code 2
- **+1 hook**: [post-compact.js](.claude/hooks/post-compact.js) — re-injects git state, active spec, review, and handoff after context compaction
- **auto-format.js now registered** in settings.json — was written but not wired up
- **4 lifecycle events covered**: PermissionRequest, PreToolUse, PostToolUse, PostCompact

### New Issues Found (not caught in Review #1)

These are **critical integrity issues** — the framework claims capabilities it doesn't have:

| Issue                                                | Severity     | Detail                                                                                              |
| ---------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `/impact` skill missing                              | **Critical** | Listed in CLAUDE.md (line 67) and docs but no SKILL.md exists in `.claude/skills/`                  |
| `/smoke` skill missing                               | **Critical** | Listed in CLAUDE.md table but no SKILL.md exists in `.claude/skills/`                               |
| `/scout` skill missing                               | **Major**    | Listed in CLAUDE.md table but no SKILL.md exists in `.claude/skills/`                               |
| `metrics.csv` doesn't exist                          | **Minor**    | `/ship` claims to append to it, but the file was never created (will auto-create on first run)      |
| CLAUDE.md says 18 skills                             | **Major**    | Audit found only 15 SKILL.md files. The count is wrong.                                             |
| `settings.local.json` references multi-app structure | **Minor**    | References `apps/api`, `apps/web-buyer`, `apps/web-supplier` — doesn't match the single Next.js app |

---

## Updated Category Breakdown

### Skill Quality & Coverage — 8.0/10 (was 8.5)

**What exists (15 skills):**

| Category           | Skills                                     | Status      |
| ------------------ | ------------------------------------------ | ----------- |
| Core pipeline      | ship, 0_spec, 1_implement, 2_review, 3_fix | All present |
| Dev utilities      | test, commit, debug, create-hook, audit    | All present |
| Quality/knowledge  | healthcheck, learn, doc                    | All present |
| Session management | handoff, continue                          | All present |

**What's claimed but missing (3 skills):**

| Skill     | Claimed in                                                    | Actually exists?                                                                   |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/impact` | CLAUDE.md line 67, docs/skills-reference.md                   | **No**                                                                             |
| `/smoke`  | CLAUDE.md skills table                                        | **No**                                                                             |
| `/scout`  | CLAUDE.md skills table, has a review output but no skill file | **No** — the scout report was likely generated from a previous version or manually |

**Why this matters:** A framework that claims 18 skills but ships 15 is a trust issue. Anyone copying `.claude/` into their repo will try `/impact`, `/smoke`, or `/scout` and get nothing. This is the single most important fix.

**Rating justification**: Downgraded from 8.5 to 8.0. The 15 skills that exist are high quality, but 3 claimed skills are missing. The gap between documentation and reality is the issue.

---

### Hook & Automation Infrastructure — 8.0/10 (was 7.0)

**Current hook inventory (4 hooks, 4 lifecycle events):**

| Hook               | Event             | Trigger     | Behavior                                                            |
| ------------------ | ----------------- | ----------- | ------------------------------------------------------------------- |
| auto-approve.js    | PermissionRequest | All tools   | 3-tier: auto-approve safe, auto-deny destructive, pass-through rest |
| protect-secrets.js | PreToolUse        | Edit\|Write | Block writes to .env, _.pem, _.key, credentials.\*, etc. (exit 2)   |
| auto-format.js     | PostToolUse       | Edit\|Write | Run prettier/ruff after edits                                       |
| post-compact.js    | PostCompact       | All         | Re-inject git state, spec, review, handoff after compaction         |

**Strengths:**

- Covers the 4 most impactful lifecycle events
- protect-secrets uses exit code 2 (hard block) — correct pattern
- post-compact reads multiple state sources with graceful fallbacks
- auto-approve has a clean 3-tier architecture

**Remaining gaps:**

- No `SessionStart` hook (could load instincts or check for stale handoffs)
- No `StopFailure` hook (could save partial state on API errors)
- Hook types are all `command` — no `prompt` or `agent` hooks yet
- auto-format.js references multi-app directories that don't exist in this project

**Rating justification**: Upgraded from 7.0 to 8.0. Four hooks covering four events is solid. The "batteries included" recommendation from Review #1 is now met.

---

### Documentation & Onboarding — 8.0/10 (was 8.5)

**Downgrade reason:** CLAUDE.md and docs reference skills that don't exist. Specifically:

- CLAUDE.md lists 18 skills in two tables — 3 don't exist
- `docs/skills-reference.md` documents `/impact`, `/smoke`, `/scout` with full examples
- A user following the docs will encounter missing functionality

The documentation itself is well-written and explains "why" not just "what." The `/doc` auto-generation skill is a strength. But accuracy matters more than quality — wrong docs are worse than no docs.

---

### Context Management — 7.8/10 (was 7.5)

**Upgrade reason:** PostCompact hook now re-injects pipeline state after compaction. This was the single biggest gap in context management.

**Remaining gaps:**

- No `@` imports in CLAUDE.md (still at 110 lines, over the 80-line target)
- No progressive disclosure in skills (some are 200+ lines)
- CLAUDE.md should reference instincts and workflow via `@` imports instead of inlining

---

## Revised Top Recommendations

### Critical (do this week)

1. **Create the 3 missing skills: `/impact`, `/smoke`, `/scout`**
   - These are documented, referenced, and expected by users
   - `/scout` even has a review output file — the skill clearly existed at some point
   - Until these exist, CLAUDE.md is lying about the framework's capabilities
   - **Alternative**: if you don't want these skills, remove them from CLAUDE.md and docs

2. **Fix CLAUDE.md skill count and tables**
   - Change "18 skills" to actual count
   - Remove or mark missing skills
   - Fix `settings.local.json` multi-app references

### High (do this month)

3. **Add `isolation: worktree` to `/ship` implementation phase**
   - Prevents WIP from polluting working directory
   - Available since v2.1.50

4. **Add `maxTurns` to subagent invocations in `/ship`**
   - Prevents runaway agents
   - Available since v2.1.78

5. **Adopt `${CLAUDE_SKILL_DIR}` in skills that reference their own directory**
   - Portable file references
   - Available since v2.1.69

### Medium (do this quarter)

6. **Create `.claude/agents/reviewer.md`** with `memory: project` and `disallowedTools`
   - Cross-session review learning
   - Architecturally enforced read-only review

7. **Add `@` imports to CLAUDE.md**
   - Move skills tables and directory layout to referenced files
   - Get CLAUDE.md under 80 lines

---

## Path to 9.0+

| Action                      | Score Impact                          | Effort                                  |
| --------------------------- | ------------------------------------- | --------------------------------------- |
| Create 3 missing skills     | +0.3 (skill coverage + docs accuracy) | Medium — need to write 3 SKILL.md files |
| Fix CLAUDE.md accuracy      | +0.1 (docs)                           | 15 min                                  |
| Add worktree isolation      | +0.1 (pipeline)                       | 1 skill edit                            |
| Add maxTurns                | +0.05 (pipeline)                      | 1 skill edit                            |
| Adopt `${CLAUDE_SKILL_DIR}` | +0.05 (modern features)               | Find & replace                          |
| Create reviewer agent       | +0.1 (modern features + review)       | 1 new file                              |
| **Total potential**         | **+0.7 → 9.1**                        |                                         |

---

## Verdict

**Still in the top tier.** The pipeline architecture, 9-lens review, and knowledge management loop remain unmatched by any public framework. The hook infrastructure is now solid with 4 lifecycle events covered.

**The biggest issue is integrity**: 3 skills are documented but don't exist. This is the #1 priority — either create them or remove the references. Everything else is incremental improvement.

**Competitive position unchanged**: You beat community frameworks on depth and integration. You implement ~85% of Anthropic's best practices. The missing skills are the only thing preventing a confident 9.0 rating.

---

_Generated by Claude Opus 4.6 — 2026-03-20 (Review #2)_
_Methodology: Full file audit of .claude/ directory (49 files, 13 directories), cross-referenced against CLAUDE.md claims_
