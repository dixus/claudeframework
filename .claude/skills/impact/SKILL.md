---
name: impact
description: Analyze blast radius of a code change — find all call sites, test mocks, and consumers. Use before modifying shared functions, interfaces, or modules.
disable-model-invocation: true
argument-hint: <function, file, class, or method name>
allowed-tools: Read, Glob, Grep, Agent
---

Analyze the blast radius of changing a function, method, class, or file before making the change.

$ARGUMENTS is the target to analyze. Can be:

- A function name: `enqueue_email`
- A file path: `src/modules/documents/services.py`
- A class: `SupplierInvitation`
- A method: `Tender.clone`

## Steps

1. **Resolve the target** — find the definition:
   - Use Grep to locate the function/class/method definition
   - Read the file to understand its signature (params, return type)
   - Note any recent signature changes (new optional params, changed return type)

2. **Find all call sites** — everywhere the target is used:
   - Grep for the function/class name across the entire codebase
   - Group results by module: API services, routes, worker tasks, tests, frontend hooks
   - For each call site, note whether it passes all current params or relies on defaults

3. **Find all test mocks** — tests that patch or mock the target:
   - Grep for `patch("...target_name")`, `mock_target_name`, `AsyncMock` references
   - Grep for `vi.mock` and `vi.fn` in frontend test files that reference the endpoint
   - Note which mock factories would need updating if the signature changes

4. **Find frontend consumers** (if the target is a route or service behind a route):
   - Identify the API endpoint(s) that call this function
   - Grep frontend `hooks/` and `lib/` for the endpoint path
   - Check TypeScript types in `types/api.ts` that would need updating

5. **Find downstream dependencies** — other functions that depend on the target's return value:
   - If the target returns an ORM object or dict, find code that accesses specific fields of that return value
   - If the target writes to DB, find queries that read from the same table

6. **Report** — print a structured summary:

```
## Impact Analysis: `<target>`

### Definition
- File: <path>:<line>
- Signature: <current signature>

### Call Sites (<count>)
| File | Line | Passes all params? |
|---|---|---|
| ... | ... | ✅ / ❌ missing: param_x, param_y |

### Test Mocks (<count>)
| Test file | Mock pattern | Needs update? |
|---|---|---|

### Frontend Consumers (<count>)
| File | Hook/Function | Endpoint |
|---|---|---|

### Downstream Dependencies
- <any functions that consume this target's return value>

### Risk Assessment
- **Blast radius**: small (≤3 files) / medium (4-10 files) / large (>10 files)
- **Recommended approach**: <one-line suggestion>
```

Do NOT make any code changes. This skill is read-only analysis.
