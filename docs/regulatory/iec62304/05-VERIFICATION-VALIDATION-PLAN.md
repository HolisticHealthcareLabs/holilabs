# Verification & Validation Plan

**Document ID:** VVP-HHL-001  
**IEC 62304 Reference:** Clause 5.7 — Software Verification; Clause 5.8 — Software Validation  
**Safety Classification:** Class A  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. Scope

This document defines the verification and validation (V&V) strategy for the Holi Labs Clinical Platform. It covers all testing levels from unit tests through clinical validation of the CDS rule engine.

**Verification** confirms that the software was built correctly (meets specifications).  
**Validation** confirms that the right software was built (meets intended use).

---

## 2. Test Infrastructure

### 2.1 Test Runners & Frameworks

| Framework | Purpose | Configuration |
|-----------|---------|--------------|
| Jest | Unit tests, integration tests | `pnpm test` — runs all Jest suites |
| Playwright | E2E tests, accessibility, visual regression | `apps/web/playwright.config.ts` |
| AxeBuilder | WCAG 2.1 AA automated accessibility | Integrated with Playwright |
| k6 | Load and performance testing | `scripts/load-test-api.js` |

### 2.2 Test Execution Commands

```bash
pnpm test                    # All Jest unit/integration tests
pnpm typecheck               # TypeScript strict compilation check
npx playwright test          # All Playwright E2E tests
npx playwright test --grep "accessibility"  # Accessibility suite only
```

### 2.3 CI/CD Integration

All tests execute automatically in the GitHub Actions CI pipeline (`.github/workflows/ci.yml`):
- **On every push:** Linting, TypeScript compilation, unit tests, `npm audit`
- **On PR to main:** Full E2E suite, accessibility tests, security tests
- **Merge blocked** if any test fails or coverage drops below thresholds

---

## 3. Coverage Thresholds

Per `CLAUDE.md` Section VII.1, the following coverage thresholds are enforced in CI:

| Metric | Threshold | Enforcement |
|--------|-----------|-------------|
| Branch coverage | 80% | CI blocks merge |
| Function coverage | 80% | CI blocks merge |
| Line coverage | 80% | CI blocks merge |
| Statement coverage | 80% | CI blocks merge |

---

## 4. Unit Testing Strategy

### 4.1 Scope

Every service, utility, and pure function requires unit tests. Tests are co-located in `__tests__/` directories alongside the module under test.

### 4.2 Patterns

**Mock ordering** (per `CLAUDE.md` Section VII.3):
```typescript
// 1. Mock dependencies FIRST
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: Function) => handler,
}));
// 2. THEN require modules that use mocked dependencies
const { handler } = require('../route');
```

**Transaction mocks:** Defined in `jest.mock` factory with `_test` properties, or set via `prisma.$transaction.mockImplementation` in `beforeEach`.

**Type safety:** No `any` in test types — use `as unknown as MockType` pattern.

### 4.3 Critical Unit Test Suites

| Suite | Location | What It Tests |
|-------|----------|--------------|
| RBAC isolation | `src/app/api/__tests__/rbac-isolation.test.ts` | Horizontal/vertical privilege escalation |
| Consent lifecycle | `src/lib/services/__tests__/consent-lifecycle.test.ts` | LGPD consent guard checks |
| Audit trail | `src/lib/services/__tests__/audit-trail.test.ts` | Hash chain integrity + LGPD accessReason |
| Habeas data export | `src/app/api/__tests__/habeas-data-export.test.ts` | Patient data export (LGPD Art. 18) |
| Habeas data rectification | `src/app/api/__tests__/habeas-data-rectification.test.ts` | PII update + versioning |
| Cryptographic erasure | `src/app/api/__tests__/cryptographic-erasure.test.ts` | Deletion request + erasure cascade |
| Auth rate limiting | `src/app/api/__tests__/auth-rate-limiting.test.ts` | Brute force protection + encryption-before-write |

### 4.4 Current Test Metrics

| Metric | Value | Date |
|--------|-------|------|
| Total test suites | 109 | 2026-03-05 |
| Total tests | 1,944 | 2026-03-05 |
| Pass rate | 99.9% (1,942 pass, 2 pre-existing failures) | 2026-03-05 |

---

## 5. Integration Testing Strategy

### 5.1 API Route Integration Tests

Every API route requires both happy path and error case coverage:

| Test Category | Pattern | Verification |
|--------------|---------|-------------|
| Happy path | Valid input → expected response | Status code, response shape |
| Auth required | No session → 401 | Authentication enforcement |
| RBAC enforced | Wrong role → 403 | Authorization enforcement |
| Input validation | Invalid payload → 400 | Zod schema enforcement |
| Not found | Missing resource → 404 | Error handling |
| Prisma errors | Unique constraint → 409, Not found → 404 | Database error handling |

### 5.2 Middleware Integration

The `createProtectedRoute` middleware is verified to enforce:
- Session authentication (NextAuth)
- Role-based authorization (Casbin)
- Zod input validation
- Rate limiting
- Audit log creation

---

## 6. End-to-End Testing Strategy

### 6.1 Test Suite

30 E2E test specification files in `apps/web/tests/e2e/`:

| Test File | Clinical Relevance | Requirements Covered |
|-----------|-------------------|---------------------|
| `auth.spec.ts` | Authentication flows | REQ-SEC-007, REQ-SEC-009 |
| `prescription-safety.spec.ts` | Prescription CDS workflow | REQ-CLIN-004, REQ-CLIN-005 |
| `clinical-command.spec.ts` | Clinical command center | REQ-FUNC-002 |
| `billing-validation.spec.ts` | Billing compliance checks | REQ-CLIN-010 |
| `consent-flow.spec.ts` | LGPD consent management | REQ-REG-002, REQ-DATA-004 |
| `data-export.spec.ts` | Patient data export | REQ-DATA-004 |
| `patient-registration.spec.ts` | Patient onboarding | REQ-FUNC-001 |
| `appointment-scheduling.spec.ts` | Scheduling workflow | REQ-FUNC-005 |
| `lab-orders.spec.ts` | Lab order creation | REQ-FUNC-007 |
| `soap-note-generation.spec.ts` | Clinical documentation | REQ-FUNC-006 |
| `medication-refill.spec.ts` | Prescription renewal | REQ-FUNC-008 |
| `critical-flows.spec.ts` | End-to-end critical paths | Multiple |

### 6.2 Viewport Coverage

Per `apps/web/playwright.config.ts`, E2E tests run across:

| Project | Viewport | Device |
|---------|----------|--------|
| Desktop Chrome | 1920 x 1080 | Desktop |
| Tablet | 768 x 1024 | iPad-class |
| Mobile | 390 x 844 | iPhone 14 |

---

## 7. Accessibility Testing

### 7.1 Standard

WCAG 2.1 Level AA conformance is required for all patient-facing pages (REQ-A11Y-001).

### 7.2 Automated Testing

- **Tool:** AxeBuilder integrated with Playwright
- **Test file:** `apps/web/tests/accessibility/a11y.spec.ts`
- **Additional:** `apps/web/tests/e2e/accessibility-fixes.spec.ts`
- **Execution:** Runs on every PR via CI pipeline

### 7.3 Checks Performed

- Color contrast ratios (4.5:1 normal text, 3:1 large text)
- Keyboard navigation and focus management
- ARIA labels and roles
- Form input labels and error messages
- Image alt text
- Heading hierarchy

---

## 8. Security Testing

### 8.1 OWASP ASVS Level 2

Security testing targets OWASP Application Security Verification Standard (ASVS) Level 2:

| ASVS Category | Test Coverage | Implementation |
|--------------|--------------|----------------|
| V2 — Authentication | Session management, MFA, password policies | `auth.spec.ts`, `auth-rate-limiting.test.ts` |
| V4 — Access Control | RBAC enforcement, privilege escalation | `rbac-isolation.test.ts` |
| V5 — Input Validation | Zod schema enforcement on all API routes | Integration tests per route |
| V6 — Cryptography | AES-256-GCM, PBKDF2, key rotation | `hipaa-encryption.ts` unit tests |
| V8 — Data Protection | PHI encryption, no plaintext in logs | `security/` E2E suite |
| V13 — API Security | Rate limiting (`src/lib/rate-limit.ts`), CORS, CSP | E2E security tests |

### 8.2 Security E2E Suite

Dedicated security test directory: `apps/web/tests/e2e/security/`

### 8.3 Dependency Scanning

- `npm audit --audit-level=high` runs in CI and blocks merges on failure
- Critical CVEs patched within 24 hours
- GitHub Actions pinned to commit SHA (supply chain protection)

---

## 9. Performance Testing

### 9.1 Load Testing

- **Tool:** k6 (`scripts/load-test-api.js`)
- **Target:** API endpoints under concurrent load
- **Threshold:** p95 response time < 500ms (REQ-PERF-001)
- **Baseline:** p95 = 1.33s on dev server (expected to improve in production)

### 9.2 CDS Performance

- **Target:** Traffic light evaluation < 200ms with cached rules (REQ-PERF-002)
- **Measurement:** `metadata.latencyMs` field in `TrafficLightResult`

---

## 10. Clinical Validation Plan

### 10.1 Purpose

Clinical validation confirms that the CDS rules produce clinically appropriate outputs. This is distinct from software verification (which confirms code correctness).

### 10.2 Rule Validation Process

| Step | Activity | Responsible |
|------|----------|-------------|
| 1 | Define clinical rule based on published guidelines (e.g., UpToDate, ANVISA bulletins) | Clinical team (CRM holder) |
| 2 | Encode rule as JSON-Logic or TypeScript compliance rule | Engineering team |
| 3 | Validate JSON-Logic syntax via `validateJsonLogic()` function | Automated |
| 4 | Test rule against known positive and negative cases | Engineering + Clinical |
| 5 | Review traffic light output for clinical appropriateness | Clinical team (CRM holder) |
| 6 | Document rule source, expected behavior, and approval | Clinical team |
| 7 | Deploy rule and monitor override rates | Operations |
| 8 | Review override rationale for rule refinement | Clinical team (quarterly) |

### 10.3 Clinical Validation Criteria

- Each CDS rule SHALL have a documented clinical source (guideline, formulary, or regulation)
- Each rule SHALL be tested with at least 3 positive cases (should trigger) and 3 negative cases (should not trigger)
- Override rates above 30% for any rule SHALL trigger clinical review
- False negative reports (missed alerts) SHALL be investigated within 24 hours

### 10.4 Post-Market Surveillance

The GovernanceLog chain (`safety-audit-logger.ts`) captures all CDS evaluations and override events, enabling:
- Override rate monitoring per rule
- Clinician feedback collection via assurance capture service
- Trend analysis for rule effectiveness
- Adverse event correlation (if reported externally)

---

## 11. Acceptance Criteria Summary

| Category | Pass Criteria |
|----------|--------------|
| Unit tests | All pass, coverage >= 80% (branches, functions, lines, statements) |
| Integration tests | All API routes: happy path + error cases pass |
| E2E tests | All 30 spec files pass across 3 viewports |
| Accessibility | Zero critical/serious AxeBuilder violations on patient-facing pages |
| Security | npm audit clean (no high/critical), RBAC tests pass, PHI tests pass |
| Performance | p95 < 500ms (production), CDS < 200ms (cached) |
| TypeScript | `pnpm typecheck` exits 0 (strict mode, no errors) |
| Clinical | All CDS rules validated by CRM-holding clinician |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
