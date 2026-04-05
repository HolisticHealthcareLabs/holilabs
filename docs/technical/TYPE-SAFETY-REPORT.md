# Type Safety & Code Cleanup Report

**Date:** April 5, 2026
**System:** HoliLabs Clinical Intelligence Platform

## 1. Type Safety (Eliminating `any`)

The following critical paths were audited and updated to eliminate the `any` type, replacing it with proper interfaces, `unknown` with type guards, or generics.

### Key Files Updated:
- `apps/web/src/lib/security/validation.ts`: Updated pagination, array, and JSON validation to use strict types.
- `apps/web/src/lib/security/encryption.ts`: Updated encryption/decryption routines to use generics and `unknown`.
- `apps/web/src/lib/security/csrf.ts`: Replaced `any` in core logic; maintained `any` in middleware signature for compatibility with project-wide `Middleware` type.
- `apps/web/src/lib/auth/magic-link.ts`: Integrated `@prisma/client` types for patient authentication.
- `apps/web/src/lib/auth/otp.ts`: Integrated `@prisma/client` types for OTP flows.
- `apps/web/src/lib/auth/AuthProvider.tsx`: Defined `AuthUser` and `AuthSession` interfaces; fixed derived value type errors.
- `apps/web/src/lib/api/client.ts`: Updated `apiClient` and `apiFetch` to use generics and strict error handling.
- `apps/web/src/lib/clinical/safety/override-handler.ts`: Replaced `any` with `unknown` in validation logic.

### Results:
- Estimated `any` reduction in `src/lib/`: ~60-70%.
- Improved IDE autocompletion and compile-time error detection in security/auth paths.

## 2. Console Log Cleanup

A systematic cleanup of console logs was performed across the `apps/web/src/` directory.

### Summary:
- **Removed:** Logs containing potential PHI or diagnostic noise.
- **Replaced:** `console.log/warn/error` replaced with structured `logger` calls (using `@/lib/logger`).
- **Standardized:** Catch blocks now use `logger.error({ err }, 'message')` format for consistent Sentry/CloudWatch ingestion.
- **Excluded:** `legacy_archive/` and test files were preserved to maintain historical context and test output.

## 3. Next-Auth v5 Assessment

A risk assessment and upgrade plan for `next-auth` was created at `docs/technical/NEXTAUTH-UPGRADE-PLAN.md`.

**Current Recommendation:** Defer upgrade to stable until after initial pilot phase to prioritize environment stability.

## 4. Verification Results

- **Type Check:** `npx tsc --noEmit` runs without errors in modified production files (ignoring known test/mcp issues).
- **Unit Tests:** `pnpm test --bail` verified for core security and auth utilities.
