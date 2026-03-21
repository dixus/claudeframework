# Lessons

Corrections and patterns captured across sessions. Updated automatically after any user correction.
Each entry: what went wrong → rule that prevents it.

---

<!-- Add entries below this line as: "## YYYY-MM-DD — <topic>" -->

## 2026-03-21 — Test coverage for all spec test cases

**What went wrong**: When implementing a feature, the code change for the glossary back link (`href="/"`) was made correctly, but the corresponding spec test case (test case 7: "Glossary back link updated") was not added to the test file. The implementation was complete but the spec test coverage was incomplete.

**Rule**: After implementing all code changes for a spec, cross-reference every numbered test case in the spec's "Test cases" section against the actual test file. For each test case, verify a corresponding test exists. If any test case is missing, add it before marking the task done. Server components that import static data (no React hooks, no API calls) can be rendered directly in jsdom tests without mocking.
