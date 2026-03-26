---
name: Framework demo app patterns
description: Key conventions and patterns in the RadarChartPanel / results components (src/components/results/)
type: project
---

## Test environment

All component tests use `// @vitest-environment jsdom` at line 1. Tests that use Radix UI (Tooltip, HelpSection) must be rendered with `{ wrapper: Wrapper }` where Wrapper provides `TooltipPrimitive.Provider`.

## Recharts in tests

`globalThis.ResizeObserver` must be mocked at the top of any test file that renders Recharts `ResponsiveContainer`. Without it, jsdom throws on `ResizeObserver is not defined`.

## Legend pattern in RadarChartPanel

The legend is a plain HTML `<div className="flex items-center ...">` below the `ResponsiveContainer`. Legend entries are `<span>` elements — not Recharts `<Legend>`. This means legend text is directly queryable via `screen.getByText(...)` in tests.

## Spec deferral decisions

When a spec requirement is intentionally deferred (e.g., label truncation in radar-chart spec Decision #5), the implementation omits the feature but does NOT add a code comment to document the decision. Future reviewers should check `.claude/specs/<name>.md` "Decisions made by Claude" section before flagging omissions as missing requirements.

**Why:** Observed during radar-chart review (2026-03-25). The label truncation requirement was listed in the spec Requirements but explicitly deferred in Decision #5. No comment in the code recorded this.

**How to apply:** When reviewing and a spec requirement appears missing from the implementation, always check the spec's "Decisions made by Claude" section for sanctioned omissions before filing as a missing requirement.
