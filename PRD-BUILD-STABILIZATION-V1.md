# PRD: Orbit 1 Build Stabilization & MVP Launch Readiness

## For Claude Code CLI · Opus 4.6 (1M context)
## ~/prototypes/holilabsv2/apps/web
## Date: March 18, 2026 · Deadline: March 19, 2026 (EOD)

---

## CONTEXT FOR THE AGENT

You are resuming an in-progress Orbit 1 launch sprint for holilabsv2, a Next.js 14 + Prisma healthcare platform. The MVP must be usable by a pilot hospital **tomorrow**. The previous session made partial progress on Unit L.1 (build fix) but introduced several `as unknown as any` casts and icon substitutions that are technically unsound. This prompt gives you a prioritized, time-boxed plan to finish the job cleanly.

**Read these files before writing ANY code:**
```bash
cat CLAUDE.md
cat .cursor/rules/ROUTER.md
```

**Pre-flight check (run first, every time):**
```bash
pnpm build 2>&1 | grep -E "(Type error|ERROR|successfully)" | head -10
pnpm test 2>&1 | grep -cE "^(PASS|FAIL)"
git status --short | head -10
```

---

## WHAT HAPPENED IN THE PREVIOUS SESSION

The previous Claude Code session attempted to fix the build (Unit L.1) but hit a whack-a-mole pattern. Here is the exact state of fixes applied — some clean, some need rework:

### Fixes Applied (Keep These)
1. **framer-motion Easing type** — CinematicTransition.tsx — Cast to correct type. ✅ Clean fix.
2. **PatientDetailSplitPanel.tsx** — Moved `patient` variable declaration before `useCallback` that references it. ✅ Correct fix for block-scoped variable hoisting.

### Fixes Applied (Rework Needed)
3. **lucide-react icon imports** — `Music` and `VolumeX` replaced with `AlertCircle` and `X` in SpecialtyWalkthrough.tsx. **Problem:** These are semantically wrong icons. The correct fix is to check which icons are actually exported by your pinned `lucide-react` version and use proper audio icons (`Volume2`, `VolumeX`, or fallback to `Speaker`/`SpeakerOff` if available).
   ```bash
   # Find your lucide-react version
   cat node_modules/lucide-react/package.json | grep '"version"'
   # List available icons matching "volume" or "speaker"
   ls node_modules/lucide-react/dist/esm/icons/ | grep -iE "volume|speaker|music|audio"
   ```

4. **UsageMetrics in gateway.ts** — Changed `queryComplexity: 'standard'` to `'moderate'` and removed `timestamp`. **Problem:** The `as UsageMetrics` cast masks the real issue. The correct fix is to align the object literal with the `UsageMetrics` interface fields. Check what fields are required:
   ```bash
   grep -A 30 "export interface UsageMetrics" src/lib/ai/usage-tracker.ts
   ```
   Then provide all required fields instead of relying on `as` casts.

5. **AuditLogCreateManyInput in audit-buffer.ts** — Changed to `data: batch as unknown as any`. **Problem:** Double-cast (`as unknown as any`) is a type-safety escape hatch that hides real schema mismatches. The correct fix is to ensure the `AuditEntry` interface matches `Prisma.AuditLogCreateManyInput`:
   ```bash
   # Check Prisma's generated type
   grep -A 20 "AuditLogCreateManyInput" node_modules/.prisma/client/index.d.ts | head -25
   # Compare with your AuditEntry interface
   grep -A 15 "interface AuditEntry" src/lib/api/audit-buffer.ts
   ```
   Map any missing/mismatched fields explicitly.

6. **middleware.ts Response → NextResponse casts** — Added `as NextResponse` casts in two places for `applyCorsHeaders` and `applySecurityHeaders` return values. **Problem:** These functions may genuinely return `Response` not `NextResponse`. The fix should be at the function signature level, not the call site:
   ```bash
   grep -B 2 -A 10 "function applyCorsHeaders\|function applySecurityHeaders" src/lib/api/middleware.ts
   ```
   Either change the return types to `NextResponse`, or handle the conversion properly.

7. **legacy_archive WelcomeModal** — Commented out `<WelcomeModal />` in two legacy files. ✅ Acceptable — these are unused archive files.

8. **middleware.ts handler return** — Changed `return handler(request, context)` to a conditional `NextResponse.json(result)`. **Problem:** This may break handlers that already return `NextResponse`. The correct pattern is:
   ```typescript
   const result = await handler(request, context);
   return result instanceof Response ? result : NextResponse.json(result);
   ```
   (Note: `await` is needed if handler is async, and check against `Response`, not `NextResponse`)

### Current Build Status
The build was still failing when the session ended, with a `Response is not assignable to NextResponse` error in middleware.ts. **This is the active blocker.**

---

## EXECUTION PLAN — TIME-BOXED

Total available time: ~6-8 hours before tomorrow's deadline. Allocate ruthlessly.

### PHASE 1: FIX THE BUILD (Unit L.1) — 60 minutes max

**Goal:** `pnpm build` exits 0 with no `as unknown as any` hacks.

**Step 1.1 — Diagnose remaining type errors (5 min)**
```bash
rm -rf apps/web/.next apps/web/.turbo
pnpm build 2>&1 | grep "Type error" | sort | uniq -c | sort -rn
```

**Step 1.2 — Fix middleware.ts properly (15 min)**
The `Response` vs `NextResponse` mismatch is likely in the middleware composition chain. The fix is:
- Check if `applyCorsHeaders` and `applySecurityHeaders` signatures return `Response`
- If so, change them to return `NextResponse` (since they're only used in Next.js middleware context)
- Or wrap: `NextResponse.rewrite(new URL(response.url))` with the original headers
- For the handler chain: ensure `next()` and `handler()` both return `NextResponse`, not `Response`

**Step 1.3 — Fix gateway.ts UsageMetrics properly (10 min)**
- Read the `UsageMetrics` interface
- Provide all required fields explicitly (no `as` cast needed if all fields match)
- If `estimatedCost` or `timestamp` are computed, compute them before the object literal

**Step 1.4 — Fix audit-buffer.ts properly (10 min)**
- Compare `AuditEntry` interface with Prisma's generated `AuditLogCreateManyInput`
- Add missing fields (likely `timestamp`, `id`, or enum type for `action`)
- Map the data explicitly instead of double-casting

**Step 1.5 — Fix lucide-react icons properly (5 min)**
- Check available exports for your version
- Use semantically correct audio icons
- Update tests to match

**Step 1.6 — Verify clean build (5 min)**
```bash
pnpm build 2>&1 | tail -5
# Must see: "Compiled successfully" or routes compiled count
```

**Exit gate:** `pnpm build` exits 0. Zero `as unknown as any` casts in diff. Commit:
```
fix(build): resolve all type errors for production build

Aligned UsageMetrics, AuditEntry, and middleware types with their contracts.
Clean build enables production deployment for pilot hospital.
```

---

### PHASE 2: TEST STABILIZATION (Unit L.2) — 90 minutes max

**Goal:** Fewer than 5 failing test suites. All failures documented.

**Step 2.1 — Triage (10 min)**
```bash
pnpm test 2>&1 | grep "FAIL" | sort
```
Categorize into: logger mocks, cuid fixtures, CDSS contract, other.

**Step 2.2 — Fix logger mocks (30 min)**
This is the biggest bang-for-buck fix. The pattern is:
```typescript
jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
```
Apply to all suites that fail with "logger.warn is not a function" or similar.

**IMPORTANT — Jest mocking rule from CLAUDE.md:**
```typescript
// ✅ CORRECT: Mock first, then require
jest.mock('@/lib/prisma', () => ({ ... }));
const { prisma } = require('@/lib/prisma');
// ❌ NEVER: import { prisma } from '@/lib/prisma' after jest.mock
```

**Step 2.3 — Fix cuid fixtures (10 min)**
Replace string IDs in `send-reminder.test.ts` fixtures with valid cuid format: `clxxxxxxxxxxxxxxxxxxxxxxxxx` (25 chars, starts with `cl`).

**Step 2.4 — Handle CDSS contract tests (15 min)**
For fields that are not yet implemented (provenance.timestamp, provenance.model, metadata.processingMethod):
```typescript
test.skip('provenance.timestamp — not yet implemented (tracked: Orbit 2)', () => { ... });
```

**Step 2.5 — Fix any remaining failures (15 min)**
Address up to 3 more. If a failure is non-trivial, skip with documentation.

**Step 2.6 — Run full suite, document (10 min)**
```bash
pnpm test 2>&1 | tail -30
```

**Exit gate:** < 5 failing suites. Commit:
```
fix(tests): stabilize test suite for launch readiness

Logger mock standardization, cuid fixture fixes, CDSS contract skips.
<N> suites remaining, all documented as non-blocking for pilot.
```

---

### PHASE 3: PILOT INVITE FLOW (Unit L.3) — 45 minutes max

**Goal:** The path from admin invite → user signup → dashboard works end-to-end.

**Step 3.1 — Check for passwordHash contamination (5 min)**
```bash
grep -rn "passwordHash" src/app/api/onboarding/ --include="*.ts"
grep -rn "passwordHash" src/app/actions/onboarding* --include="*.ts"
```
If found, remove from any Prisma write operation. The field no longer exists in the schema.

**Step 3.2 — Trace the invite flow (15 min)**
Read these files in order:
1. The admin invite API: `grep -rn "invite" src/app/api/ --include="*.ts" -l`
2. The email template that sends the invite link
3. The onboarding/complete route that processes the invite token
4. The redirect to dashboard after completion

Verify:
- [ ] Admin-only access guard (`createProtectedRoute`) on invite endpoint
- [ ] Token is single-use, time-limited, cryptographically random
- [ ] No PII in URL query parameters
- [ ] Prisma write matches current schema (no removed fields)

**Step 3.3 — Run invite flow tests (10 min)**
```bash
pnpm test -- --testPathPattern="onboarding|invite" 2>&1 | tail -20
```

**Step 3.4 — Fix any issues found (15 min)**

**Exit gate:** Invite flow tests pass. No passwordHash references in onboarding routes. Commit:
```
fix(auth): verify and secure pilot invite flow

Removed stale passwordHash references. RBAC and token guards confirmed.
Pilot onboarding path functional for first hospital deployment.
```

---

### PHASE 4: ERROR BOUNDARIES (Unit L.4) — 60 minutes max

**Goal:** Every Priority 1-2 dashboard route has an error.tsx that catches errors gracefully.

**Step 4.1 — Identify existing pattern (5 min)**
```bash
find src/app/dashboard -name "error.tsx" | sort
cat src/app/dashboard/error.tsx  # Use as template
```

**Step 4.2 — Create error.tsx for missing routes (40 min)**

Priority 1 (must have):
- `src/app/dashboard/agenda/error.tsx`
- `src/app/dashboard/command-center/error.tsx`

Priority 2 (should have):
- `src/app/dashboard/escalations/error.tsx`
- `src/app/dashboard/governance/error.tsx`
- `src/app/dashboard/reminders/error.tsx`

Each error boundary must:
1. Be a `'use client'` component
2. Accept `{ error, reset }` props
3. Show bilingual message (PT-BR + EN)
4. Offer "Tentar novamente" / "Try again" button calling `reset()`
5. Log to console.error (Sentry will pick up from there)

**Step 4.3 — Verify boundaries isolate failures (15 min)**
```bash
pnpm build 2>&1 | tail -5  # Ensure new files compile
```

**Exit gate:** All Priority 1-2 routes have error.tsx. Commit:
```
fix(ui): add error boundaries to high-traffic dashboard routes

Prevents cascading failures across dashboard sections.
Users see retry prompt instead of blank screen on errors.
```

---

### PHASE 5: LOADING STATES (Unit L.5) — 60 minutes max

**Goal:** High-traffic routes show skeleton screens instead of blank pages during data fetch.

**Step 5.1 — Check existing pattern (5 min)**
```bash
find src/app/dashboard -name "loading.tsx" | sort
cat src/app/dashboard/loading.tsx  # Use as template
```

**Step 5.2 — Create loading.tsx for high-traffic routes (45 min)**

Must have (in priority order):
- `src/app/dashboard/patients/loading.tsx`
- `src/app/dashboard/agenda/loading.tsx`
- `src/app/dashboard/analytics/loading.tsx`
- `src/app/dashboard/command-center/loading.tsx`
- `src/app/dashboard/prevention/loading.tsx`
- `src/app/dashboard/billing/loading.tsx`
- `src/app/dashboard/escalations/loading.tsx`
- `src/app/dashboard/reminders/loading.tsx`
- `src/app/dashboard/settings/loading.tsx`

Each loading.tsx should:
1. Be a default export React component
2. Use pulsing gray skeleton boxes matching the page layout
3. Be lightweight — no data fetching, no heavy dependencies

**Step 5.3 — Verify (10 min)**
```bash
pnpm build 2>&1 | tail -5
```

**Exit gate:** All high-traffic routes have loading.tsx. Commit:
```
fix(ui): add skeleton loading states to dashboard routes

Users see content placeholders instead of blank screens.
Covers patients, agenda, analytics, and 6 more high-traffic routes.
```

---

### PHASE 6: FINAL HARDENING (Unit L.6) — 30 minutes max

**Step 6.1 — Console.log audit (10 min)**
```bash
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules" | grep -v "\.d\.ts" | grep -v "legacy_archive"
```
Remove all. Replace with `logger.info/debug` if the log is actually needed.

**Step 6.2 — Full build + test (10 min)**
```bash
pnpm build && pnpm test 2>&1 | tail -30
```

**Step 6.3 — Git cleanup (10 min)**
```bash
git status
git diff --staged | grep -E "console\.log|TODO|FIXME|as unknown as any"
# Commit only if clean
```

**Exit gate:** Build passes. Tests < 5 failures. No console.log in production code.

```
chore(launch): final hardening sweep for MVP pilot

Console.log cleanup, dead import removal, env validation.
Orbit 1 launch gate passed — ready for pilot hospital deployment.
```

---

## CONSTRAINTS & RULES

1. **NEVER `git push`** — human only.
2. **NEVER commit without `pnpm test` exit 0** (or documented < 5 known failures).
3. **NEVER use `as unknown as any`** — fix the type mismatch at the source.
4. **NEVER modify clinical logic** (CDSS, biomarker ranges, triage rules) — ELENA veto.
5. **NEVER weaken RBAC, encryption, or audit trail** — CYRUS veto.
6. **NEVER collapse consent granularity** — RUTH veto.
7. **Conventional Commits only** — `fix(scope): message` format.
8. **Circuit breaker** — If any fix/test cycle fails 3 times consecutively, HALT and output `CIRCUIT_BREAKER_TRIPPED`.

---

## TIME BUDGET SUMMARY

| Phase | Unit | Time | Cumulative | Priority |
|-------|------|------|------------|----------|
| 1 | L.1 Build Fix | 60 min | 1h | P0 — BLOCKING |
| 2 | L.2 Test Stabilization | 90 min | 2.5h | P0 — BLOCKING |
| 3 | L.3 Invite Flow | 45 min | 3.25h | P0 — BLOCKING |
| 4 | L.4 Error Boundaries | 60 min | 4.25h | P1 |
| 5 | L.5 Loading States | 60 min | 5.25h | P1 |
| 6 | L.6 Hardening | 30 min | 5.75h | P1 |

**Total: ~6 hours.** If time runs short, Phases 1-3 are non-negotiable. Phases 4-5 can be partially completed (Priority 1 routes only). Phase 6 is fastest and most skippable.

---

## SUCCESS CRITERIA

Before declaring Orbit 1 complete:

```
[  ] pnpm build exits 0 — no type errors, no as-unknown-as-any
[  ] pnpm test: < 5 failing suites, all documented
[  ] Invite flow: admin can invite → user can sign up → lands on dashboard
[  ] Error boundaries on all Priority 1+2 routes (7 routes minimum)
[  ] Loading states on all high-traffic routes (9 routes minimum)
[  ] Zero console.log in production code
[  ] Git clean, all changes committed with conventional commit messages
[  ] Dashboard loads without errors on desktop (1280px) and tablet (768px)
```

**When all boxes are checked:** The MVP is ready for pilot hospital deployment.

---

## BEGIN

Start with the pre-flight check. Then Phase 1, Step 1.1. Go.
