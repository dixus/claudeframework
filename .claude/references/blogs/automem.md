
The New Claude Code’s Auto-Memory Feature Just Changed How My Team Works — Here Is the Setup I Actually Build
Reza Rezvani
Reza Rezvani

Follow
8 min read
·
1 day ago
31


3





The error kept coming back. Third session this week, same mistake — Claude suggesting npm install when our entire monorepo runs on pnpm. I had corrected it Monday. I had corrected it Tuesday. Wednesday morning, there it was again.

“Remember that we use pnpm, not npm.”

I typed it for probably the fiftieth time since adopting Claude Code for our team.

That is when the changelog notification caught my eye:

“Claude automatically saves useful context to auto-memory.”

Press enter or click to view image in full size
Auto-Memory Feature by Claude Code
Auto-Memory Feature by Claude Code | Image Generated with Gemini 3 Pro ©
Note: AI tools helped researh for this piece. The testing, team workflows, and configurations described are from my direct experience.

I have spent my time testing auto-memory across my team of engineers — and the feature itself is only half the story. The real unlock is understanding how auto-memory fits into a broader memory architecture that makes Claude Code actually useful for teams, not just individual developers.

Most coverage I have seen treats this as a solo developer feature. It is not. Or rather, it should not be.

The Memory System Most Teams Get Wrong
Here is what tripped us up initially: auto-memory and CLAUDE.md look like they do the same thing. They do not.

CLAUDE.md is what you write for Claude — committed to Git, shared across every developer who clones the repo. Think of it as your team’s constitution. Auto-memory (MEMORY.md) is what Claude writes for itself — stored locally at ~/.claude/projects/<project>/memory/, never touching version control.

The hierarchy loads in a specific order every session:

Organization policy (enterprise)
    ↓
Project CLAUDE.md (committed to Git → shared with team)
    ↓
User ~/.claude/CLAUDE.md (your personal defaults)
    ↓
MEMORY.md (first 200 lines, auto-generated, local only)
More specific instructions override broader ones. This is the part most articles skip, and it is the part that matters for teams.

When one of my engineers discovers that our GraphQL resolver tests need a local Redis instance running, Claude auto-saves that to their MEMORY.md. But that knowledge stays trapped on their machine. Meanwhile, three other developers hit the same wall the following week.

The fix is not auto-memory. It is knowing when to promote auto-memory insights into shared CLAUDE.md.

The Two-Layer Pattern That Actually Works
After testing across two projects over three weeks, we settled on a pattern I am calling “local discovery, shared codification.”

Layer 1: Let auto-memory do its thing. Each developer’s Claude instance accumulates project-specific notes — debugging patterns, quirky test commands, API endpoints that timeout under load. This happens automatically. No setup required beyond having it enabled (which it is by default).

Layer 2: Weekly CLAUDE.md promotion. Every Friday during our team sync, we spend 10 minutes reviewing what Claude has learned. Each developer runs:

cat ~/.claude/projects/*/memory/MEMORY.md
When we spot patterns that apply to the whole team — and we always do — we promote them to the shared CLAUDE.md:

# CLAUDE.md (committed to Git)

## Build & Test
- Package manager: pnpm (NEVER npm or yarn)
- Test command: pnpm test:unit (not pnpm test, which runs e2e)
- E2E requires local Redis: redis-server --port 6380
## Architecture Decisions
- GraphQL resolvers: always return typed DTOs, never raw DB entities
- Error handling: use AppError class from src/shared/errors
- Auth: JWT validation happens in middleware, not resolvers
## Code Style
- Named imports only (tree-shaking compatibility)
- Prefer const assertions for union types
- No barrel exports in feature modules (circular dependency risk)
The result: Claude starts every session already knowing what took us weeks to discover individually.

What Auto-Memory Actually Captures (And What It Does Not)
I had unrealistic expectations here. After Brent Peterson’s observation went semi-viral — he found only 12 lines in his MEMORY.md after use, calling it “configuration, not learning” — I checked mine.

He is right, partially. After three weeks of active use across a production codebase, my MEMORY.md had 23 lines. Not exactly a knowledge base.

But here is what those 23 lines contained:

# MEMORY.md (auto-generated)
- Project uses pnpm workspaces with 3 packages: api, web, shared
- Test DB runs on port 5433 (not default 5432) to avoid conflicts
- The deploy script requires AWS_PROFILE=staging set explicitly
- PR titles must follow conventional commits (enforced by CI)
- src/shared/types/index.ts is the source of truth for API contracts
Individually, none of this is groundbreaking. Collectively, it eliminates the “cold start” problem that kills productivity in every new Claude session. Before auto-memory, reconnecting context took roughly 45 seconds of back-and-forth at the start of each session. Now it is zero.

What auto-memory does not capture well: architectural reasoning, trade-off discussions, or “why” decisions. It captures “what” — commands, paths, patterns. The “why” belongs in CLAUDE.md, written by humans.

Modular Rules: The Team Feature Nobody Is Using
The .claude/rules/ directory is the most underutilized part of this system for teams. While CLAUDE.md gives Claude project-wide instructions, modular rules let you scope directives to specific file types using YAML frontmatter:

# .claude/rules/api-standards.md
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules
- All endpoints must include Zod input validation
- Use the standard AppError format for error responses
- Include OpenAPI JSDoc comments on every handler
- Rate limiting configuration goes in src/api/middleware/
# .claude/rules/testing.md
---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Testing Conventions
- Use vitest, not jest (migrated January 2026)
- Factory functions live in __fixtures__/, not inline
- E2E tests must clean up test data in afterAll()
- Mock external services with msw, not manual mocks
This matters for teams because different people work on different parts of the codebase. Your frontend engineers get React-specific rules loaded automatically. Your API developers get validation standards. Nobody gets overwhelmed with irrelevant context.

We went from one 180-line CLAUDE.md to a 40-line root file plus 6 modular rules. Claude’s output quality improved noticeably — SFEIR Institute’s training materials cite a 40% reduction in hallucinations when rules are properly scoped, and that tracks with what we observed. Fewer irrelevant instructions means less noise in Claude’s context window.

Press enter or click to view image in full size
Claude Code Auto-Memory Architecture
Claude Code Auto-Memory Architecture | Image Generated With Gemini 3 Pro ©
The Onboarding Shortcut
This is where the team angle gets compelling. When we onboarded a new engineer last month, her first day with Claude Code looked like this:

Clone the repo (CLAUDE.md and .claude/rules/ come with it)
Run claude in the project directory
Start working
No “let me explain how we structure our resolvers” conversation. No “actually, we use pnpm” correction loop. No “the test database runs on a different port” debugging session. Claude already knew all of it.

Previous onboarding with Claude Code: roughly 2 hours before the tool was useful.

With the shared memory setup: about 10 minutes. That is not a metric I can prove with scientific rigor — it is what we experienced.

141 Claude Code Agents: The Setup That Actually Works. A Complete Guide
After 6 months building agents in production, here’s the 10-team structure, 8 autonomous skills, and 19 slash commands…
alirezarezvani.medium.com

Privacy Boundaries That Actually Matter
One thing that initially concerned me:

auto-memory is local-only, but CLAUDE.md is shared. For teams working across multiple clients or regulated industries, this boundary is critical.

Auto-memory respects Git repository scope. Each repo gets its own directory at ~/.claude/projects/<project>/memory/. If you work on Client A's codebase and Client B's codebase, those memories never cross-contaminate.

For personal preferences that should not be shared — your editor shortcuts, your preferred comment style, your debugging quirks — use CLAUDE.local.md at the project root. It is automatically added to .gitignore.

Repository (shared via Git):
├── CLAUDE.md                    # Team conventions
├── .claude/rules/               # Scoped team rules
└── CLAUDE.local.md              # Your preferences (.gitignored)

Local machine (never shared):
└── ~/.claude/projects/<project>/memory/
    ├── MEMORY.md                # Claude's auto-notes
    ├── debugging.md             # Topic-specific notes
    └── api-conventions.md       # Topic-specific notes
This separation is not accidental. It is what makes the system workable for teams handling sensitive projects.

Forcing It Off in CI Environments
We learned this one the hard way. Our staging pipeline ran Claude Code for automated code reviews, and after days we found a MEMORY.md stuffed with CI noise — Docker image tags, ephemeral database URLs, test runner flags.

That junk was loading into every local development session, quietly degrading Claude’s suggestions.

The fix is one environment variable:

# CC AUTO-MEMORY Force off in CI
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1

# CC AUTO-MEMORY Force on in CI
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=0
This takes precedence over both the /memory toggle and any settings.json configuration.

Add it to your CI config once, and auto-memory never accumulates notes from automated runs again. If you are running Claude Code anywhere besides a developer's local machine — CI pipelines, staging environments, automated review workflows — set this before anything else.

Where This Falls Short
Auto-memory has a hard 200-line limit on the main MEMORY.md file — only the first 200 lines load at session start. Beyond that, Claude creates topic files (debugging.md, patterns.md) that load on-demand when relevant. In practice, I have not hit this limit, but teams with complex projects might.

The bigger limitation: there is no mechanism for sharing auto-memory insights across team members automatically. The weekly promotion to CLAUDE.md I described? That is a manual process we invented. Anthropic has not built team-level memory sync, and I am not sure they should — the privacy implications get complicated fast.

Git worktrees get separate memory directories, which is useful for parallel feature development but means your worktree-based workflow fragments Claude’s learning. If you are running 5 parallel sessions Boris Cherny-style, each worktree starts with a slightly different context.

And the honest uncertainty: I have not tested this pattern beyond our scale of 7 developers on two projects. A team of 30 across a monorepo with 15 microservices might need a different approach entirely.

The Setup Checklist
If you want to replicate this for your team, here is the sequence:

Day 1: Create a minimal CLAUDE.md at your project root. Include your package manager, test commands, and the three architectural decisions that cause the most confusion. Commit it to Git.

Week 1: Let auto-memory accumulate naturally. Do not touch it. Let each developer build their local context.

Week 2: Review everyone’s MEMORY.md in your team sync. Promote recurring patterns to the shared CLAUDE.md. Create your first modular rule in .claude/rules/ for the area of the codebase that generates the most questions.

Ongoing: Add CLAUDE.md updates to your PR template. When someone discovers a project quirk worth sharing, it goes in the next commit alongside the code change.

The pattern is not complicated. The value comes from treating Claude’s memory as a team knowledge system, not just a personal productivity hack.

✨ Thanks for reading! If you would like more practical insights on AI development tools and engineering systems, hit subscribe to stay updated.

What is your team’s approach to sharing Claude Code context? Are you using CLAUDE.md in version control, or is everyone still repeating themselves every session? I would love to hear what is working.

About the Author
I am Alireza Rezvani (Reza), CTO building AI development systems for engineering teams. I write about turning individual expertise into collective infrastructure through practical automation.