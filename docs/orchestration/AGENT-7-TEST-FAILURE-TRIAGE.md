# Agent 7 — Test Failure Triage & Stabilization (feat/offline-mode)

**Branch:** `feat/offline-mode` (existing — do NOT create a new branch)
**Base:** This branch already has 120 test failures out of 750 total tests
**Estimated duration:** 60-90 minutes

---

## PHASE 1 — GROUND (Read before writing a single line)

You are triaging test failures on a feature branch (`feat/offline-mode`) for a Brazilian clinical healthcare platform. This branch was created by Agent 2 (Gemini) and adds CSV patient import and offline-first PWA capabilities. The 120 failures are likely a mix of:

1. **Genuine bugs** introduced by the offline-mode feature code
2. **Mock drift** — new modules added but not mocked in existing tests
3. **Import path changes** — the offline module may have reorganized shared imports
4. **Flaky tests** — timing-dependent tests that break under load
5. **Pre-existing failures** — tests that were already broken on main

Your job is to **classify, prioritize, and fix** these failures, not to refactor the feature code itself.

### Required reading (ingest each file fully before proceeding):

1. **`CLAUDE.md`** at project root — Read the Jest Mocking rules (NEVER use ES6 import to resolve mocked modules — use `require()` after `jest.mock()`). Read the Circuit Breaker protocol (halt after 3 consecutive fix failures).

2. **`apps/web/jest.config.ts`** or **`jest.config.js`** — Understand the test configuration, module aliases, transform settings, and test match patterns.

3. **`packages/shared-kernel/src/types/`** — Understand what types are exported. Agent 5 found a TypeScript error in `packages/shared-kernel/index.d.ts` where `apps/*/src/types/` was interpreted as an unterminated regex. Verify this has been fixed (should now be `apps/<app>/src/types/`).

4. **`apps/web/src/lib/api/middleware.ts`** — Many test files mock this module. Understand `createProtectedRoute`, `createPublicRoute`, and `compose` signatures so you can fix mock mismatches.

5. **Run `pnpm test 2>&1 | head -200`** first to capture the actual failure output. Do NOT start fixing anything until you've read the failure summary.

### DO NOT read or modify:
- `.env` or `.env.local` files
- Any file in `node_modules/`
- The Prisma schema (unless a migration is the root cause of a failure)

---

## PHASE 2 — PRODUCE

### Step 1: Capture and Classify

Run the full test suite and capture output:
```bash
cd apps/web && pnpm test --no-coverage 2>&1 | tee /tmp/test-output.txt
```

Then classify each failing test into exactly one bucket:

| Bucket | Description | Fix strategy |
|--------|------------|--------------|
| **A — Mock Drift** | Test imports a module that was restructured by offline-mode. `jest.mock()` path no longer matches. | Update mock path or add missing mock |
| **B — Missing Mock** | New dependency added by offline-mode (e.g., IndexedDB adapter, service worker registration) not mocked in existing tests | Add `jest.mock()` for new module |
| **C — Type Error** | TypeScript compilation failure in test or source | Fix type, usually a missing export or changed interface |
| **D — Logic Bug** | Test correctly catches a bug introduced by offline-mode code | Fix the source code, not the test |
| **E — Flaky / Timing** | Test uses `setTimeout`, `setInterval`, real timers, or race conditions | Add `jest.useFakeTimers()` or increase timeout |
| **F — Pre-existing** | Test was already failing on main (verify by checking `git stash && pnpm test <file> && git stash pop`) | Document but do NOT fix (out of scope) |

### Step 2: Fix in Priority Order

Fix in this order: **C → A → B → D → E**. Skip F entirely.

**For each fix:**
1. Identify the root cause (1 sentence)
2. Apply the minimal change
3. Run ONLY that test file to confirm green: `pnpm test -- <file-path>`
4. Move to the next failure

**Circuit breaker:** If you fail to fix the same test file 3 times consecutively, emit the `CIRCUIT_BREAKER_TRIPPED` block and move to the next failure. Do not burn time.

### Step 3: Jest Mocking Rules (mandatory)

When fixing mocks, follow these rules exactly:

```typescript
// ✅ CORRECT
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));
const { prisma } = require('@/lib/prisma');

// ❌ WRONG — never import mocked modules with ES6 import
import { prisma } from '@/lib/prisma'; // This defeats jest.mock hoisting
```

Reset mocks in every test:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Step 4: Document Results

Create `docs/testing/TRIAGE-REPORT-OFFLINE-MODE.md` with:

```markdown
# Test Failure Triage — feat/offline-mode

## Summary
- Total tests: <N>
- Failing before triage: 120
- Failing after triage: <N>
- Fixed: <N> (breakdown by bucket)
- Skipped (pre-existing): <N>
- Circuit-breaker'd: <N>

## Bucket Breakdown

### A — Mock Drift (<count>)
| Test file | Root cause | Fix |
|-----------|-----------|-----|
| ... | ... | ... |

### B — Missing Mock (<count>)
...

### C — Type Error (<count>)
...

### D — Logic Bug (<count>)
...

### E — Flaky / Timing (<count>)
...

### F — Pre-existing (<count>)
| Test file | Notes |
|-----------|-------|
| ... | Already failing on main — not related to offline-mode |

## Remaining Failures
<List any tests still failing after triage with root cause analysis>

## Recommendations
<What the team should tackle next — e.g., "The IndexedDB adapter needs integration tests", "Service worker registration mock is brittle">
```

---

## PHASE 3 — CONSTRAIN

### What you must NOT do:
- Do NOT delete or skip failing tests (no `.skip`, no `xit`, no `xdescribe`)
- Do NOT modify business logic in the offline-mode feature to make tests pass (fix the test or the mock, not the feature — unless bucket D)
- Do NOT install new npm packages
- Do NOT modify the Prisma schema
- Do NOT touch files outside `apps/web/` unless the failure traces to `packages/shared-kernel/`
- Do NOT use `--no-verify` when committing
- Do NOT rebase onto main — work on the branch as-is
- Do NOT modify any `.env` files

### Test hygiene rules:
- Every `jest.mock()` must appear BEFORE any `require()` or `import` of the mocked module
- Every test file must have `beforeEach(() => { jest.clearAllMocks(); })`
- No `any` type assertions in test files unless unavoidable (prefer `as jest.Mock`)
- No hardcoded timeout values over 10000ms

### Commit rules:
- Conventional Commits format: `fix(tests): resolve 87 test failures on feat/offline-mode`
- 3-sentence body: what, how, why
- `pnpm test` must show improvement (fewer failures than 120) before committing
- If you can't get to zero failures, commit what you have with the triage report documenting the remainder

---

## PHASE 4 — VERIFY

After all fixes:

1. Run `pnpm test --no-coverage` — capture final pass/fail count
2. Compare: `120 failures → <N> failures` (target: <20 remaining)
3. For any remaining failures, confirm they're bucket F (pre-existing) by spot-checking against main
4. Ensure the triage report is complete and accurate
5. Commit with the triage report included

6. Emit the architecture review snapshot:
```
[ARCHITECTURE REVIEW — QUINN]
type_safety:            <pass | fail — any remaining TS errors?>
backward_compatibility: <pass | fail — did any test changes break API contracts?>
kernel_integrity:       <pass | fail — mocks match real module signatures?>
ci_status:              <tests passing: X/750>
```
