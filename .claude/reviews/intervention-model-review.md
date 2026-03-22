# Review: intervention-model

**Date**: 2026-03-22
**Verdict**: **pass**

## Summary

The intervention model feature is well-implemented and meets all spec requirements. The data layer is framework-agnostic, the selection logic covers all specified cases with correct priority ordering, types are properly integrated into the engine result, and the UI renders a model recommendation header with 3-model comparison cards above the existing playbook content. All 152 tests pass and the build is clean. No critical or major issues found.

## Lens Evaluation

### Correctness

The selection logic correctly implements the spec's priority order: bottleneck gap > 20 → Bottleneck Resolution, transitional stage → Stage Transition, theta near level boundary → Level Transition, default → Bottleneck Resolution. The `LEVEL_THRESHOLDS` array `[20, 50, 80, 100]` is indexed by `level` (0-based), which correctly maps each level to its next boundary. All three models have the correct data from the spec (labels, durations, whenToUse criteria, sImprovement values).

### Code quality

Clean, idiomatic TypeScript. Follows existing patterns (e.g., `coordination.ts`, `growth-engines.ts`). The `intervention.ts` file is well-structured with clear separation between data constants and selection logic. The `import()` type syntax in `types.ts` is consistent with how other modules (roadmaps, growth-engines, coordination) are referenced.

### Security

No security concerns — pure data transformation with no user input boundaries, no secrets, no external calls.

### Tests / QA

All 4 spec-required test cases are implemented: large gap, transitional stage, theta near boundary, and no capabilities default. An additional test validates all model fields are populated. The engine integration test confirms `interventionModel` is attached when capabilities are provided. Good coverage.

### UX / Minimal impact

The UI adds the recommendation header above existing playbook content as specified, without modifying the existing playbook rendering. The 3-column card comparison with highlight on the recommended model is clean and informative. The `interventionModel` prop is optional, so the panel degrades gracefully when no model is available.

### PM

All spec requirements are delivered. Nothing was built that wasn't asked for. The feature adds the "which model" and "why" context that was missing from the playbook panel.

### DevOps

No CI/CD implications. No new env vars or build config changes.

### Spec validation

| Criterion                                                             | Status          |
| --------------------------------------------------------------------- | --------------- |
| 3 intervention models defined with correct data from source documents | ✅              |
| Selection logic correctly identifies the right model based on inputs  | ✅              |
| Model recommendation visible above playbook in results                | ✅              |
| Rationale text explains the selection                                 | ✅              |
| All 3 models shown with recommended one highlighted                   | ✅              |
| `npx vitest run` — all tests pass                                     | ✅ (152 passed) |
| `npm run build` — clean build                                         | ✅              |

### Spec completeness

| Requirement                                                          | Status |
| -------------------------------------------------------------------- | ------ |
| NEW FILE `src/lib/scoring/intervention.ts`                           | ✅     |
| `InterventionModelType` type                                         | ✅     |
| `InterventionModel` interface with all fields                        | ✅     |
| `INTERVENTION_MODELS` record with 3 models                           | ✅     |
| Bottleneck Resolution model data                                     | ✅     |
| Stage Transition model data                                          | ✅     |
| Level Transition model data                                          | ✅     |
| `selectInterventionModel()` function with correct signature          | ✅     |
| Selection: bottleneck gap > 20 → Bottleneck Resolution               | ✅     |
| Selection: transitional funding stage → Stage Transition             | ✅     |
| Selection: theta near level boundary → Level Transition              | ✅     |
| Selection: default fallback → Bottleneck Resolution                  | ✅     |
| Framework-agnostic, no React imports in data layer                   | ✅     |
| Engine calls `selectInterventionModel()` when capabilities available | ✅     |
| `interventionModel` added to `AssessmentResult` in `types.ts`        | ✅     |
| Model badge with label and duration                                  | ✅     |
| Rationale text displayed                                             | ✅     |
| All 3 models shown as cards with recommended highlighted             | ✅     |
| Existing playbook content unchanged below                            | ✅     |
| Test: large gap → Bottleneck Resolution                              | ✅     |
| Test: transitional stage → Stage Transition                          | ✅     |
| Test: theta near boundary → Level Transition                         | ✅     |
| Test: no capabilities → default                                      | ✅     |
| Test: engine attaches model when capabilities provided               | ✅     |

## Issues

None.

## Suggestions

1. **Minor — model card responsiveness**: The 3-column grid (`grid-cols-3`) may be tight on small mobile screens. Consider `grid-cols-1 sm:grid-cols-3` for better mobile layout.
2. **Minor — edge case**: The level transition check uses `LEVEL_THRESHOLDS[level]` where `level` is 0-indexed. If `level` is already at the max (3), `LEVEL_THRESHOLDS[3]` returns 100, and since `thetaScore` can never exceed 100, the condition `100 - thetaScore <= 10 && 100 - thetaScore > 0` would only trigger for scores 90-99. This is technically correct behavior but worth documenting.
3. **Minor — test naming**: The `makeCap` helper in tests uses the key string as the label. Using human-readable labels (e.g., "Strategy", "Setup") would make test output clearer if a test fails.
