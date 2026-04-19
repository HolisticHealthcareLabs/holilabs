# Branch Merge Strategy — Pilot Launch

**Target:** All agent branches merged to `main` by end of Week 3 (~April 25, 2026)

---

## Merge Order (sequential, not parallel)

Each merge must be followed by `pnpm test` passing before proceeding to the next.

### 1. `docs/legal-and-regulatory-prep` → main (Agent 3)
- **Risk:** None — docs only, no code conflicts
- **Verification:** `git diff --stat` shows only `docs/` and `.husky/` changes
- **Note:** Includes the pre-commit hook fix for markdown-only commits

### 2. `feat/e2e-clinical-validation` → main (Agent 1)
- **Risk:** Low — adds test files, no production code changes
- **Verification:** `pnpm test:e2e` passes all new specs
- **Conflict zone:** None expected (test files are additive)

### 3. `docs/pilot-readiness` → main (Agent 4)
- **Risk:** None — docs only (3 markdown files, 136 lines)
- **Verification:** `git diff --stat` shows only `docs/onboarding/` changes

### 4. `security/attack-surface-audit` → main (Agent 5)
- **Risk:** Low-Medium — includes a code change to `lib/security-headers.ts` and `packages/shared-kernel/index.d.ts`
- **Verification:** `pnpm test` passes, `pnpm build` succeeds (TypeScript check)
- **Conflict zone:** `packages/shared-kernel/index.d.ts` — if Agent 2 also modified this file

### 5. `fix/phi-route-hardening` → main (Agent 6) ← run AFTER Agent 5 merges
- **Risk:** Medium — modifies 20-30 route files (auth wrapper changes)
- **Verification:** `pnpm test` passes, `grep -r "createPublicRoute" apps/web/src/app/api/ -l` count matches hardening changelog
- **Conflict zone:** Any route file also modified by Agent 2's offline-mode
- **Dependency:** Must merge AFTER Agent 5 because Agent 6 references the ROUTE-AUTH-MATRIX

### 6. `feat/offline-mode` → main (Agent 2 + Agent 7 fixes) ← LAST, highest conflict risk
- **Risk:** High — touches production code across many files, adds new modules
- **Verification:** `pnpm test` passes with <20 failures (Agent 7 target), `pnpm build` succeeds
- **Conflict zone:** Middleware, shared-kernel types, possibly route files
- **Strategy:** Rebase onto main (which now has merges 1-5) before merge. Resolve conflicts manually.
- **Fallback:** If rebase creates >20 conflicts, create a `feat/offline-mode-integration` branch and cherry-pick clean commits

---

## Conflict Resolution Rules

1. **Auth wrapper conflicts:** Always prefer the more restrictive auth pattern. If Agent 6 changed a route to `createProtectedRoute` and Agent 2 modified the handler, keep Agent 6's wrapper with Agent 2's handler body.

2. **Type conflicts in shared-kernel:** Merge both type additions. Neither agent should have removed types.

3. **Test file conflicts:** Prefer the version with more comprehensive mocking (usually Agent 7's fixes).

4. **Middleware conflicts:** The middleware file is the most sensitive. If both agents modified it, do a 3-way diff and merge manually. Do NOT auto-resolve.

---

## Post-Merge Checklist

After all 6 branches are merged:

- [ ] `pnpm test` — full suite passes (target: >95% of 750 tests)
- [ ] `pnpm build` — TypeScript compilation succeeds
- [ ] `pnpm test:e2e` — Agent 1's E2E specs still pass
- [ ] `grep -r "createPublicRoute" apps/web/src/app/api/ -l | wc -l` — count matches Agent 6 changelog
- [ ] Security headers present: `X-DNS-Prefetch-Control`, no `X-Powered-By`
- [ ] Pre-commit hook works for docs-only commits (no TS check triggered)
- [ ] Feature flags: AI kill switch (`disableAllAIForClinic`) still functional
- [ ] Staging deploy: `scripts/setup-staging.sh` runs clean
