# Feature Backlog — AI Maturity Score Demo App

> Prioritized list of open features derived from the 18 framework documents.
> Each item links to a dedicated PRD spec for use with `/ship`.

## Status Key

| Status         | Meaning                         |
| -------------- | ------------------------------- |
| 🟢 Ready       | PRD complete, ready for `/ship` |
| 🔵 In Progress | Currently being implemented     |
| ✅ Done        | Shipped and tested              |

---

## Tier 1 — High Impact (core formula + results value)

| #   | Feature                                                                              | PRD                                                    | Priority | Status   |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | -------- | -------- |
| 1   | **ANST Superlinear Exponents** — Apply C₁^1.5 and C₃^1.5 in META/ANST formula        | [anst-exponents.md](anst-exponents.md)                 | P0       | 🟢 Ready |
| 2   | **Intervention Model Playbooks** — 4 capability-specific playbooks on results page   | [intervention-playbooks.md](intervention-playbooks.md) | P0       | 🟢 Ready |
| 3   | **Stage-specific Roadmaps** — Funding-stage-aware priorities and AI maturity targets | [stage-roadmaps.md](stage-roadmaps.md)                 | P1       | 🟢 Ready |

## Tier 2 — Medium Impact (deeper analysis)

| #   | Feature                                                                                 | PRD                                          | Priority | Status   |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------- | -------- | -------- |
| 4   | **Growth Engine Classification** — PLG/SLG/CLG identification with scaling implications | [growth-engines.md](growth-engines.md)       | P1       | 🟢 Ready |
| 5   | **Scaling Velocity Calculator** — Full ANST S-formula with interactive visualization    | [scaling-velocity.md](scaling-velocity.md)   | P2       | 🟢 Ready |
| 6   | **Coordination Cost Model** — O(n²) vs O(n log n) team scaling visualization            | [coordination-cost.md](coordination-cost.md) | P2       | 🟢 Ready |

## Tier 3 — Nice-to-have (report & export)

| #   | Feature                                                                | PRD                            | Priority | Status   |
| --- | ---------------------------------------------------------------------- | ------------------------------ | -------- | -------- |
| 7   | **PDF Report Export** — Downloadable assessment report with all panels | [pdf-export.md](pdf-export.md) | P2       | 🟢 Ready |

---

## Implementation Order

Recommended `/ship` sequence:

```
/ship anst-exponents        # Pure engine fix, no UI changes
/ship intervention-playbooks # New results panel
/ship stage-roadmaps         # New results panel, uses existing enabler data
/ship growth-engines         # New assessment step + results panel
/ship scaling-velocity       # New results visualization
/ship coordination-cost      # New results visualization
/ship pdf-export             # Export layer on top of everything
```
