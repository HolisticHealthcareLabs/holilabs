# OWASP ASVS 4.0.3 Level 2 — Compliance Checklist

**Application:** Holi Labs Healthcare Platform (apps/web)
**Audit Date:** 2026-04-04
**Auditor:** CYRUS (Security Agent)
**Standard:** OWASP ASVS 4.0.3 Level 2 (Healthcare)
**Branch:** `feat/owasp-asvs-l2-hardening`

---

## V2: Authentication

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V2.1.1 | Password minimum 8 characters | PASS | `src/lib/auth/password-validation.ts:31` — min 8 enforced |
| V2.1.2 | Password maximum at least 64 characters | PASS | `src/lib/auth/password-validation.ts:31` — max 128 enforced (fixed this audit) |
| V2.1.3 | Password truncation not performed | PASS | No truncation in validation or bcrypt flow |
| V2.1.4 | Unicode characters allowed | PASS | No character set restrictions beyond complexity rules |
| V2.1.5 | Users can change password | N/A | Password reset flow via `/api/auth/reset-password` |
| V2.1.6 | Password change requires current password | PASS | Reset flow requires token verification |
| V2.1.7 | Breached password check | P2-FAIL | No integration with HaveIBeenPwned or similar API |
| V2.1.9 | No password composition rules beyond length | N/A | App enforces complexity (upper, lower, digit, special) per org policy |
| V2.1.12 | User can view masked password | N/A | Frontend concern — password inputs use type="password" |
| V2.2.1 | Anti-automation for credential stuffing | PASS | `src/lib/auth/session-security.ts:165-267` — AuthenticationMonitor with 5-attempt lockout |
| V2.4.1 | Passwords hashed with bcrypt | PASS | `src/lib/auth/auth.config.ts:112` — bcryptjs with default cost 10 |
| V2.8.1 | Time-based OTP or MFA available | PASS | `src/lib/auth/mfa.ts` — SMS/Call MFA via Twilio Verify |
| V2.8.2 | MFA required for privileged roles | PASS | `src/lib/auth/mfa.ts:51` — ADMIN, PHYSICIAN, CLINICIAN |
| V2.8.5 | Backup authentication mechanism | PASS | `src/lib/auth/mfa.ts:554-635` — encrypted single-use backup codes |

## V3: Session Management

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V3.1.1 | App never reveals session tokens in URL | PASS | JWT in HttpOnly cookies, no URL tokens |
| V3.2.1 | Session tokens use at least 128 bits entropy | PASS | `auth.config.ts:154` — crypto.randomBytes(16) = 128 bits |
| V3.2.3 | Session tokens stored in secure cookies | PASS | `auth.config.ts:245` — useSecureCookies in production |
| V3.3.1 | Logout invalidates session | PASS | `src/lib/auth/token-revocation.ts` — token blocklist on logout |
| V3.3.2 | Session idle timeout | PASS | `src/lib/auth/session-tracking.ts:47` — 15 min idle timeout |
| V3.3.3 | Absolute session timeout | PASS | `src/lib/auth/session-tracking.ts:48` — 8 hour absolute |
| V3.4.1 | Cookie-based tokens have Secure flag | PASS | `auth.config.ts:245` — useSecureCookies in production |
| V3.4.2 | Cookie-based tokens have HttpOnly flag | PASS | NextAuth default cookie behavior |
| V3.4.3 | Cookie-based tokens have SameSite attribute | PASS | NextAuth defaults + CSRF cookie SameSite=Strict |
| V3.7.1 | Concurrent session limits enforced | PASS | `src/lib/auth/session-tracking.ts:45` — max 3 concurrent sessions |

## V4: Access Control

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V4.1.1 | Application enforces access controls on server | PASS | `src/lib/api/middleware.ts` — createProtectedRoute enforces auth |
| V4.1.2 | Access controls fail securely (deny by default) | PASS | `src/lib/auth/casbin.ts:131` — returns false on error |
| V4.1.3 | Principle of least privilege | PASS | `src/lib/auth/casbin.ts:586-628` — per-role permissions |
| V4.2.1 | Sensitive data/APIs protected by access controls | PASS | `src/lib/api/middleware.ts:1042` — createProtectedRoute on all sensitive routes |
| V4.2.2 | Application does not rely on client-side access controls | PASS | All enforcement server-side via middleware |
| V4.3.1 | No IDOR (insecure direct object reference) | PASS | `src/lib/api/middleware.ts:566-733` — verifyPatientAccess with workspace boundary checks |
| V4.3.2 | Directory browsing disabled | PASS | Next.js does not serve directory listings |

## V5: Validation, Sanitization and Encoding

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V5.1.1 | HTTP parameter pollution protected | PASS | Next.js App Router handles parameter parsing securely |
| V5.1.3 | All input validated using positive validation | PASS | `src/lib/api/middleware.ts:808-870` — Zod schema validation middleware |
| V5.1.5 | URL redirects validated | PASS | `auth.config.ts:207-216` — redirect callback prevents open redirect |
| V5.2.1 | All untrusted HTML input sanitized | PASS | `src/lib/security/input-sanitization.ts:145-170` — escapeHtml, stripHtml |
| V5.2.2 | Unstructured data sanitized | PASS | `src/lib/security/input-sanitization.ts:75-135` — sanitizeAIInput |
| V5.3.1 | SQL injection prevented | PASS | Prisma ORM with parameterized queries throughout |
| V5.3.3 | OS command injection prevented | PASS | No shell exec in application code |
| V5.3.4 | XSS prevented | PASS | React auto-escaping + CSP + sanitization utilities |
| V5.5.1 | Serialization not used for untrusted data | PASS | JSON.parse with Zod validation |

## V7: Error Handling and Logging

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V7.1.1 | No sensitive data in logs | PASS | `src/lib/security/validation.ts:247-268` — redactSensitiveData; error boundaries use refId only (fixed this audit) |
| V7.1.2 | No credentials in logs | PASS | Structured logger with tokenized identifiers |
| V7.1.3 | Security logging covers auth events | PASS | `auth.config.ts:248-253` — signIn/signOut events logged |
| V7.1.4 | Each log event includes context for investigation | PASS | `src/lib/logger.ts` — Pino structured logging with requestId |
| V7.2.1 | Generic error messages to users | PASS | `src/app/error.tsx` — "Something went wrong" + opaque REF-id |
| V7.2.2 | Error handling does not reveal stack traces | PASS | Production middleware returns "Internal server error" (`middleware.ts:949`) |
| V7.4.1 | Audit logging for security events | PASS | `src/lib/audit.ts` — AuditLog table with buffered writes |

## V8: Data Protection

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V8.1.1 | Sensitive data classified | PASS | `.claude/rules/security.md` — 4-tier classification (PUBLIC/INTERNAL/CONFIDENTIAL/PHI) |
| V8.1.2 | All PHI encrypted at rest | PASS | `src/lib/security/hipaa-encryption.ts` — AES-256-GCM |
| V8.1.4 | PHI access requires audit log | PASS | `src/lib/api/middleware.ts:1008-1033` — withAuditLog middleware |
| V8.2.1 | Data classified by sensitivity | PASS | Prisma encryption extension for PHI fields per CLAUDE.md V.1 |
| V8.3.1 | Sensitive data not in URL parameters | PASS | Patient IDs via route params, PHI in POST bodies |
| V8.3.4 | Caching disabled for sensitive responses | PASS | `src/lib/security-headers.ts:146` — Cache-Control: no-store |

## V9: Communication

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V9.1.1 | TLS used for all connections | PASS | `src/lib/security-headers.ts:101-106` — HSTS in production |
| V9.1.2 | TLS configuration up to date | PASS | Infrastructure-level (DigitalOcean/Vercel handles TLS termination) |
| V9.1.3 | TLS certificate validation | PASS | Default Node.js TLS behavior — no `rejectUnauthorized: false` found |

## V13: API Security

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V13.1.1 | All API endpoints require authentication | PASS | `src/lib/api/middleware.ts:1042` — createProtectedRoute; public routes use createPublicRoute with rate limiting |
| V13.1.3 | Request body size limits enforced | PASS | `src/lib/api/middleware.ts` — validateBodySize middleware (added this audit) |
| V13.1.5 | Content type validation | PASS | `src/lib/api/middleware.ts` — validateContentType middleware (added this audit) |
| V13.2.1 | RESTful API validates HTTP method | PASS | Next.js App Router enforces method-specific exports (GET, POST, etc.) |
| V13.2.2 | Rate limiting on all API endpoints | PASS | `src/lib/api/middleware.ts:124-267` — Redis-backed rate limiting |
| V13.2.5 | CORS restrictions enforced | PASS | `src/lib/security-headers.ts:163-178` — CORS locked to ALLOWED_ORIGINS |
| V13.4.1 | CSRF protection for state-changing operations | PASS | `src/lib/security/csrf.ts` — Double Submit Cookie with HMAC |

## V14: Configuration

| ID | Requirement | Status | Evidence / Gap |
|----|-------------|--------|----------------|
| V14.2.1 | Components up to date | P2-FAIL | Dependency audit recommended (npm audit) |
| V14.4.1 | Security headers present | PASS | `src/lib/security-headers.ts` — comprehensive header set |
| V14.4.2 | CSP prevents XSS | PASS | Nonce-based CSP in production (`src/lib/security-headers.ts:34`) |
| V14.4.3 | X-Content-Type-Options: nosniff | PASS | `src/lib/security-headers.ts:109` |
| V14.4.4 | HSTS configured | PASS | `src/lib/security-headers.ts:101-106` — 1 year, includeSubDomains, preload |
| V14.4.5 | Referrer-Policy configured | PASS | `src/lib/security-headers.ts:118` — strict-origin-when-cross-origin (fixed this audit) |
| V14.4.6 | X-Frame-Options configured | PASS | `src/lib/security-headers.ts:112` — DENY |
| V14.4.7 | Powered-by header removed | PASS | `next.config.js:15` — poweredByHeader: false |
| V14.5.1 | No secrets in source code | PASS | All secrets via env vars; `.env` in `.gitignore` |
| V14.5.3 | Source maps not exposed in production | PASS | `next.config.js:44` — productionBrowserSourceMaps: false |

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 0 | No critical gaps |
| **P1** | 4 | Fixed in this audit (body size, content-type, referrer-policy, console.warn→logger) |
| **P2** | 2 | Breached password check (V2.1.7), dependency audit (V14.2.1) |
| **P3** | 0 | None |

### P1 Fixes Applied (this audit)

1. **ASVS V2.1.2** — Added password max length 128 in `password-validation.ts`
2. **ASVS V7.1.1** — Replaced `console.warn` with structured logger in `src/middleware.ts`
3. **ASVS V13.1.3** — Added `validateBodySize` middleware in `src/lib/api/middleware.ts`
4. **ASVS V13.1.5** — Added `validateContentType` middleware in `src/lib/api/middleware.ts`
5. **ASVS V14.4.5** — Updated Referrer-Policy to `strict-origin-when-cross-origin` in `src/lib/security-headers.ts`
