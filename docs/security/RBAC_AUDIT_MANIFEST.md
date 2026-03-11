# RBAC Audit Manifest

**Generated:** March 11, 2026
**Coverage:** 448/448 routes (100%)
**Protected routes (createProtectedRoute):** 325 — require authenticated session + role-based access
**Public routes (createPublicRoute):** 122 — no auth required but have CORS, request IDs, security headers, and optional rate limiting

---

## Auth Classification Summary

| Auth Type | Count | Description |
|-----------|-------|-------------|
| `createProtectedRoute` | 325 | Requires NextAuth session, RBAC role check, CSRF protection, audit logging |
| `createPublicRoute` | 122 | No auth required; provides CORS, request IDs, security headers, rate limiting |
| **Total** | **448** | **100% coverage** |

---

## Route Classification by Category

### Clinician Routes (createProtectedRoute)

These require an authenticated clinician session with role-based access control.

| Category | Count | Typical Roles | Patient Data |
|----------|-------|---------------|--------------|
| Patients CRUD | 20+ | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Clinical (CDSS, decision support, alerts) | 25+ | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Prevention (plans, templates, hub) | 40+ | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Prescriptions | 8 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Appointments | 15 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Lab Results | 6 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Imaging / DICOM | 8 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Billing / Invoices | 10 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Scribe / Recordings | 12 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| AI (chat, insights, training) | 12 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Conversations / Messages | 8 | CLINICIAN, PHYSICIAN, ADMIN, PATIENT | Yes |
| Notifications | 8 | CLINICIAN, PHYSICIAN, ADMIN, PATIENT | No |
| Templates / Forms | 10 | CLINICIAN, PHYSICIAN, ADMIN | No |
| Settings / Workspace | 8 | CLINICIAN, PHYSICIAN, ADMIN | No |
| Admin-only | 15 | ADMIN | Varies |
| Scheduling | 11 | CLINICIAN, PHYSICIAN, ADMIN | Yes |
| Other (EHR, referrals, QR, video) | 20+ | CLINICIAN, PHYSICIAN, ADMIN | Varies |

### Public Routes (createPublicRoute)

These are intentionally public with specific auth mechanisms.

| Category | Count | Auth Mechanism | Rate Limited |
|----------|-------|---------------|--------------|
| Auth endpoints (login, register, OTP, magic-link) | 14 | Internal (checkRateLimit, NextAuth) | Yes (10 req/15min) |
| Patient portal | 38 | Internal (requirePatientSession) | Yes (30 req/min) |
| Health checks | 12 | None | Yes (60 req/min) |
| Cron jobs | 10 | CRON_SECRET bearer token | No |
| Enterprise API | 8 | validateEnterpriseKey | No |
| Token-based (forms, deletion, confirmation) | 10 | URL token validation | No |
| OAuth callbacks (Google, Microsoft, FHIR) | 6 | OAuth flow | No |
| Public info (waitlist, CSRF, CDS discovery) | 8 | None | No |
| Demo | 2 | None (gated by NODE_ENV in production) | No |
| Edge cases (telemetry, command-center, etc.) | 14 | Various (bearer, HMAC, API key) | No |

---

## Security Properties by Auth Type

| Property | createProtectedRoute | createPublicRoute |
|----------|---------------------|-------------------|
| Session required | Yes (NextAuth) | No |
| RBAC role check | Yes | No |
| CSRF protection | Yes (unless skipCsrf) | No |
| Rate limiting | Optional (via config) | Optional (via config) |
| Request ID | Yes | Yes |
| CORS headers | Yes | Yes |
| Security headers | Yes | Yes |
| Error handling | Yes | Yes |
| Patient session fallback | Optional (allowPatientAuth) | N/A |

---

## Compliance Notes

- **HIPAA:** All patient data routes use `createProtectedRoute` with role-based access. Audit events emitted on data access.
- **LGPD:** PHI endpoints require `X-Access-Reason` header (enforced in middleware.ts). PII fields encrypted at rest via Prisma extension.
- **SOC 2:** Every route has a request ID for tracing. Protected routes log auth decisions. Health endpoints are rate-limited to prevent abuse.
- **SaMD (ANVISA):** No forbidden words ("diagnose", "detect", "prevent", "treat") in UI or API marketing copy.

---

## How to Add a New Route

1. Create `apps/web/src/app/api/{path}/route.ts`
2. Import `createProtectedRoute` (or `createPublicRoute` if intentionally public)
3. Wrap your handler: `export const GET = createProtectedRoute(handler, { roles: [...] });`
4. For patient-scoped routes, add `verifyPatientAccess` inside the handler
5. Update this manifest

**Never export a raw `async function GET/POST` without a wrapper.**
