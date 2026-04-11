# Next-Auth (Auth.js) v5 Upgrade & Risk Assessment Plan

**Current Status:** `5.0.0-beta.30`
**System:** HoliLabs Clinical Intelligence Platform
**Date:** April 5, 2026

## 1. Risk Assessment

The platform currently uses a beta version of `next-auth` (v5/Auth.js). 

### Critical Risks:
- **API Stability:** Beta versions may introduce breaking changes in minor updates.
- **Security Patches:** Fixes for critical vulnerabilities may require upgrading to newer beta or stable versions which could break existing implementations.
- **Healthcare Compliance:** Using beta software for authentication in a hospital-ready environment (ANVISA Class I / LGPD) requires rigorous validation.

### Mitigation:
- Lock version in `package.json` (already done).
- Comprehensive E2E testing for all auth flows (Login, MFA, Session Timeout).
- Monitoring of Auth.js security advisories.

## 2. Dependency Inventory

Imports from `next-auth` and related packages:
- `next-auth` (core)
- `next-auth/providers/credentials`
- `next-auth/providers/google`
- `@auth/prisma-adapter`

Key integration points:
- `apps/web/src/lib/auth/auth.ts` (Instance & Handlers)
- `apps/web/src/lib/auth/auth.config.ts` (Configuration & Callbacks)
- `apps/web/src/middleware.ts` (Edge Runtime Protection)
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` (API Routes)

## 3. Breaking Changes (Beta → Stable)

While Auth.js v5 is still in beta as of this report, expected changes toward stable include:
- Refinement of the `auth()` helper signature.
- Changes in Adapter API signatures.
- Updates to `Session` and `JWT` type definitions in TypeScript.
- Potentially more restrictive `trustHost` defaults.

## 4. Migration Steps

When migrating to stable `v5.x.x`:

1.  **Prerequisites:**
    - Ensure all tests pass on the current version.
    - Create a dedicated migration branch `task/auth-js-stable-upgrade`.

2.  **Update Dependencies:**
    ```bash
    pnpm update next-auth@latest @auth/prisma-adapter@latest
    ```

3.  **Code Adjustments:**
    - Review `auth.config.ts` for any deprecated callback parameters.
    - Verify `middleware.ts` compatibility with updated `NextRequest` handling.
    - Check TypeScript error output for type changes in `Session['user']`.

4.  **Verification:**
    - `pnpm run typecheck`
    - `pnpm test` (Unit/Integration)
    - `pnpm exec playwright test tests/e2e/auth.spec.ts` (Critical)

5.  **Rollback Plan:**
    - If `playwright` tests fail or session persistence issues occur, revert `package.json` and `pnpm-lock.yaml`.

## 5. Recommendation

**Recommendation: DEFER UPGRADE**

**Rationale:** The platform is preparing for its first pilot clinics in Q2 2026. Stability is paramount. `5.0.0-beta.30` is currently stable within the HoliLabs environment and passes 3,000+ tests. 

**Timeline:** Perform the upgrade to stable after the successful completion of the first 3 pilot clinics, or immediately if a critical security advisory is issued for the beta version.
