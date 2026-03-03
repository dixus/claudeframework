# Claude Code Development Framework

By [Holger Kreissl](https://github.com/hkreissl)

A reusable `.claude/` directory structure that wraps Claude Code with a disciplined **spec → implement → review → fix → test** pipeline. Drop it into any project to get structured, session-safe AI-assisted development.

---

## What's included

```
.claude/
  skills/         ← 13 skills for the full development pipeline
  context/        ← curated knowledge read automatically by all skills
    instincts.md  ← universal "never do X" rules, loaded by every skill
  hooks/          ← lifecycle hooks (auto-approve, safety guards)
  docs/           ← generated documentation
  references/     ← drop zone for blog posts and repos (/learn processes these)
  specs/          ← generated feature specs
  reviews/        ← generated review reports
  handoffs/       ← session state files written by /handoff, read by /continue
```

## Why use this

Claude Code is powerful but context-hungry. Without structure:

- Sessions accumulate unrelated work and quality degrades
- Reviews are biased because Claude reviews code it just wrote
- Type errors slip through because `tsc` is never run independently
- Knowledge from blog posts and external repos is lost between sessions

This framework fixes all of these systematically with a set of reusable skills.

---

## Quick start

**1. Copy `.claude/` into your project:**

```bash
git clone https://github.com/holgerimbery/claude-code-framework.git
cp -r claude-code-framework/.claude your-project/
```

**2. Update `CLAUDE.md`** in your project root with your tech stack and commands.

**3. Drop your requirements into `.claude/input/`:**

Paste PRDs, sketches, design docs, or any raw requirements there. `/0_spec` reads this directory and archives files after processing.

**4. Start a feature:**

```
/0_spec <feature name>
/1_implement <spec name>
```

**5. Review in a fresh session:**

```
/clear
/2_review <spec name>
/3_fix <review name>
/4_test
```

---

## Skills

| Skill | Purpose |
|---|---|
| `/0_spec` | Translate requirements into a structured spec |
| `/1_implement` | Implement a spec with mandatory plan approval |
| `/2_review` | Unbiased code review (always run in a fresh session) |
| `/3_fix` | Fix review issues by severity: critical → major → minor |
| `/4_test` | Full verify suite — typecheck → lint → tests → build |
| `/learn` | Process blog posts and repos into the knowledge base |
| `/doc` | Regenerate all docs from current skills and context |
| `/audit` | Find and fix vulnerable dependencies |
| `/commit` | Create atomic commits with conventional messages |
| `/create-hook` | Scaffold a Claude Code lifecycle hook |
| `/debug` | Diagnose and fix a failing test or type error |
| `/handoff` | Capture session state before `/clear` |
| `/continue` | Restore context from a handoff file in a new session |

Skills are **technology-agnostic** — they read project commands from `CLAUDE.md` rather than hardcoding tools, so they work with any stack (Node, Python, Rust, Go, etc.).

---

## The pipeline

```
Requirements
    │
    ▼
/0_spec ──────────── writes: .claude/specs/<name>.md
    │
    ▼ (you review the spec)
    │
/1_implement ──────── runs TDD loop, verifies typecheck + lint + tests + build
    │
    ▼ (/clear — fresh session for unbiased review)
    │
/2_review ─────────── writes: .claude/reviews/<name>-review.md
    │
    ▼
/3_fix ────────────── fixes by severity, re-verifies
    │
    ▼
/4_test ───────────── final gate before shipping
```

---

## Session handoffs

`/clear` kills context. `/handoff` saves it first.

```
# Mid-task, context getting long:
/handoff

# Review the file, then clear:
/clear

# New session — resume exactly where you left off:
/continue
```

The handoff file (`.claude/handoffs/<timestamp>.md`) captures the current task, pipeline position, decisions made, open questions, and the exact next step — so the next session doesn't have to rediscover any of it.

---

## Instincts

`.claude/context/instincts.md` holds short, universal "never do X" rules that every skill reads automatically: things like "read before editing", "no speculative code", "never skip typecheck". Edit this file to add rules for mistakes Claude keeps repeating.

---

## Knowledge base loop

Drop blog posts or repo files into `.claude/references/blogs/` or `references/repos/`, then run `/learn`. It extracts insights, updates the context files, improves the skills, and regenerates docs — so every future session benefits automatically.

```
Find a useful blog post or repo
    │
    ▼
Paste into .claude/references/blogs/ or references/repos/
    │
    ▼
/learn  ←── extracts insights → updates context/ → improves skills → runs /doc
    │
    ▼
All future sessions automatically benefit
```

---

## Permission hook

`.claude/hooks/auto-approve.js` intercepts every permission prompt before it reaches the UI. It auto-approves safe tools (Read, Write, Edit, Glob, Grep, Bash) and blocks known destructive patterns (`rm -rf /`, force-push to main). This removes approval fatigue without disabling safety.

Registered automatically in `.claude/settings.json`.

---

## Demo project

The `src/` directory contains an **AI Maturity Score** app — a full Next.js 14 + TypeScript project built using this framework. It demonstrates the framework applied to a real product:

- Pure TypeScript scoring engine with 16 unit tests
- Multi-step assessment UI (Likert scale, 48 questions across 6 dimensions)
- Radar chart results with bottleneck detection
- Zustand state management

```bash
npm install
npm run dev        # Start dev server at localhost:3000
npx vitest run     # Run unit tests
npm run build      # Production build
```

---

## Further reading

- [`.claude/docs/README.md`](.claude/docs/README.md) — framework overview
- [`.claude/docs/workflow.md`](.claude/docs/workflow.md) — workflow rationale and session patterns
- [`.claude/docs/skills-reference.md`](.claude/docs/skills-reference.md) — each skill documented with examples
- [`.claude/docs/knowledge-base.md`](.claude/docs/knowledge-base.md) — distilled insights from collected references
