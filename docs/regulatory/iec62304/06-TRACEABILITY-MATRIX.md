# Requirements Traceability Matrix

**Document ID:** RTM-HHL-001  
**IEC 62304 Reference:** Clause 5.7.4 — Software Verification of Traceability  
**Safety Classification:** Class A  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. Purpose

This matrix traces every requirement from `02-SOFTWARE-REQUIREMENTS-SPEC.md` to its implementing design component, verifying test case, and associated risk control. No requirement shall be orphaned (without implementation or test), and no risk control shall be unverified.

---

## 2. Clinical Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-CLIN-001 | Deterministic JSON-Logic rule engine with operation allowlist | `apps/web/src/lib/clinical/rule-engine.ts` — `ALLOWED_JSON_LOGIC_OPERATIONS` (line 40), `evaluateRules()` (line 221) | Unit tests for rule-engine; JSON-Logic evaluation tests | HAZ-007 (injection prevention) |
| REQ-CLIN-002 | Compliance rules evaluated before business rules; blocking on compliance failure | `rule-engine.ts` — `evaluateRules()` lines 234–275: compliance first, return early if blocked | Unit test: compliance block stops evaluation; integration test: blocked response shape | HAZ-001 (missed alerts) |
| REQ-CLIN-003 | JSON-Logic operation validation before execution | `rule-engine.ts` — `validateJsonLogicOperations()` (lines 60–91) | Unit test: disallowed operations rejected; unit test: nested disallowed operations caught | HAZ-007 (injection prevention) |
| REQ-CLIN-004 | Traffic light pattern (RED/YELLOW/GREEN/GREY), worst color wins | `apps/web/src/lib/traffic-light/engine.ts` — `COLOR_PRIORITY` (line 57), `determineOverallColor()` (line 420) | `prescription-safety.spec.ts`; unit tests for color priority logic | HAZ-001, HAZ-002 |
| REQ-CLIN-005 | Override capability: RED=supervisor, YELLOW=justification, lethal=blocked | `engine.ts` — `determineOverrideRequirements()` (lines 478–506) | `prescription-safety.spec.ts`; unit tests for override requirement logic | HAZ-002 (alert fatigue) |
| REQ-CLIN-006 | Safety envelope wrapping every CDS response | `apps/web/src/lib/clinical/safety-envelope.ts` — `wrapInSafetyEnvelope()` | Unit test: envelope contains all required fields (processingMethod, confidence, disclaimer, provenance) | HAZ-001 (transparency) |
| REQ-CLIN-007 | Clinical disclaimer text in every CDS response | `safety-envelope.ts` — `CLINICAL_DISCLAIMER` (lines 25–29) | Unit test: disclaimer text present and unmodified | HAZ-001 (clinician awareness) |
| REQ-CLIN-008 | Safety events persisted to GovernanceLog chain in transaction | `apps/web/src/lib/clinical/safety-audit-logger.ts` — `logSafetyEvent()` (lines 22–83) | `audit-trail.test.ts`; integration test: transaction creates Session + Log + Event | HAZ-004 (audit trail) |
| REQ-CLIN-009 | Audit failure does not interrupt clinical workflow | `safety-audit-logger.ts` — catch block (lines 74–82) | Unit test: DB failure caught, error logged, no throw propagation | HAZ-004 (availability) |
| REQ-CLIN-010 | ANVISA CATMAT code classification for medications | `apps/web/src/lib/brazil-interop/anvisa-drug-registry.ts` — `classifyMedication()`, `classifyPrescription()` | `billing-validation.spec.ts`; unit tests for drug lookup and classification | HAZ-003 (wrong classification) |
| REQ-CLIN-011 | ICP-Brasil signature required for controlled substances | `apps/web/src/lib/auth/icp-brasil-signer.ts` — `verifyIcpBrasilSignature()` | Unit tests for signature verification, certificate parsing, expired cert handling | HAZ-008 (signature bypass) |
| REQ-CLIN-012 | Business rules cached 60s with clinic-specific override | `rule-engine.ts` — `CACHE_TTL_MS` (line 189), `getBusinessRules()` (lines 388–458) | Unit tests for cache behavior, clinic override precedence | HAZ-010 (stale rules) |
| REQ-CLIN-013 | Rules evaluated in parallel | `engine.ts` — `Promise.all(signalPromises)` (line 104) | Performance test: parallel evaluation latency | HAZ-009 (latency) |
| REQ-CLIN-014 | Non-GREEN evaluations captured for RLHF | `engine.ts` — `captureForRLHF()` (lines 533–561) | Unit test: GREEN not captured, RED/YELLOW captured | — |

---

## 3. Security Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-SEC-001 | AES-256-GCM encryption for PHI with PBKDF2 | `apps/web/src/lib/security/hipaa-encryption.ts` — `encrypt()` (line 88), `deriveKey()` (line 81) | Unit tests: encrypt/decrypt round-trip, algorithm verification | HAZ-005 (PHI exposure) |
| REQ-SEC-002 | Versioned key rotation | `hipaa-encryption.ts` — `rotateEncryption()` (lines 263–301) | Unit test: rotate produces new ciphertext, version incremented, old key can't decrypt new data | HAZ-005 |
| REQ-SEC-003 | Casbin RBAC with role hierarchy | `apps/web/src/lib/auth/casbin.ts` — `initializeDefaultPolicies()` (lines 575–638) | `rbac-isolation.test.ts`; unit tests for role hierarchy | HAZ-006 (unauthorized access) |
| REQ-SEC-004 | Fail-closed authorization | `casbin.ts` — `enforce()` catch block (lines 130–132) | Unit test: error returns false (deny) | HAZ-006 |
| REQ-SEC-005 | Audit log for RBAC changes | `casbin.ts` — `createAuditLog()` calls in `addRoleForUser()`, `deleteRoleForUser()`, `addPolicy()`, `removePolicy()` | Unit test: audit log created on role/policy change | HAZ-006 |
| REQ-SEC-006 | Zod input validation on all API routes | API route handlers — Zod schemas per route | Integration tests: invalid input → 400 | HAZ-005, HAZ-007 |
| REQ-SEC-007 | `createProtectedRoute` middleware required | API route handlers — middleware wrapper | `auth.spec.ts`; integration test: unauthenticated → 401 | HAZ-006 |
| REQ-SEC-008 | AuditLog with accessReason for PHI access | Prisma schema `AuditLog` model — `accessReason` field | `audit-trail.test.ts`; unit test: PHI read creates audit entry with reason | HAZ-004, HAZ-006 |
| REQ-SEC-009 | HttpOnly, Secure, SameSite=Strict session cookies | NextAuth configuration | `auth.spec.ts`; E2E: verify cookie attributes | HAZ-006 |
| REQ-SEC-010 | CORS restricted to known origins | `next.config.js` — CORS headers | Security E2E: cross-origin request blocked | HAZ-005 |
| REQ-SEC-011 | Rate limiting on all environments | `apps/web/src/lib/rate-limit.ts` | `auth-rate-limiting.test.ts`; E2E: burst requests → 429 | HAZ-006 |
| REQ-SEC-012 | CSP headers enforced | `next.config.js`, `middleware.ts` | Security E2E: CSP header present with expected directives | HAZ-005 |
| REQ-SEC-013 | ICP-Brasil trust store verification | `icp-brasil-signer.ts` — `ICP_BRASIL_ROOT_FINGERPRINTS` (lines 40–45) | Unit tests: valid cert accepted, expired rejected, unknown CA rejected | HAZ-008 |
| REQ-SEC-014 | No PHI in logs | `.claude/rules/security.md` — pre-commit hook enforcement | Code review; grep-based CI check for PHI field names in log statements | HAZ-005 |
| REQ-SEC-015 | No SELECT * on patient tables | `.claude/rules/security.md` — pre-commit hook enforcement | Code review; Prisma select fields verified in tests | HAZ-005 |
| REQ-SEC-016 | MFA support (TOTP + WebAuthn) | Prisma `User.mfaEnabled`, `WebAuthnCredential` model; `src/lib/auth/webauthn-*` | Integration tests for WebAuthn registration/verification flow | HAZ-006 |
| REQ-SEC-017 | Timing-safe string comparison | `hipaa-encryption.ts` — `secureCompare()` (lines 248–253) | Unit test: equal strings return true, unequal return false, no timing leak | HAZ-005 |

---

## 4. Data Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-DATA-001 | PHI classified L4, AES-256-GCM encrypted | `hipaa-encryption.ts`; Prisma schema `Patient` model with `*KeyVersion` fields | `cryptographic-erasure.test.ts`; encryption unit tests | HAZ-005 |
| REQ-DATA-002 | AuditLog captures actor, action, resource, IP, hash, reason | Prisma schema `AuditLog` model | `audit-trail.test.ts` | HAZ-004, HAZ-006 |
| REQ-DATA-003 | GovernanceLog captures prompt, output, provider, validation | Prisma schema `GovernanceLog` model | `audit-trail.test.ts`; safety-audit-logger unit tests | HAZ-004 |
| REQ-DATA-004 | LGPD data subject rights (export, rectification, erasure) | API routes: `patients/[id]/export`, `deletion-request`, `erasure` | `habeas-data-export.test.ts`, `habeas-data-rectification.test.ts`, `cryptographic-erasure.test.ts`, `data-export.spec.ts` | HAZ-005 |

---

## 5. Performance Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-PERF-001 | API p95 < 500ms | API routes + middleware stack | k6 load tests (`scripts/load-test-api.js`) | HAZ-009 |
| REQ-PERF-002 | CDS evaluation < 200ms (cached) | `engine.ts` — `metadata.latencyMs` | Performance unit test; k6 CDS endpoint test | HAZ-009 |
| REQ-PERF-003 | 99.5% monthly uptime | Infrastructure (managed cloud) | Uptime monitoring (external) | HAZ-009 |
| REQ-PERF-004 | Rule cache TTL 60s | `rule-engine.ts` — `CACHE_TTL_MS = 60_000` (line 189) | Unit test: cache expiry behavior | HAZ-010 |
| REQ-PERF-005 | Audit writes non-blocking | `src/lib/api/audit-buffer.ts` | Load test: audit buffer under concurrent writes | HAZ-004, HAZ-009 |

---

## 6. Regulatory Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-REG-001 | CDS fully deterministic (no AI/ML) | `rule-engine.ts` (JSON-Logic), `engine.ts` (deterministic evaluation) | Architecture review; operation allowlist test | HAZ-001 |
| REQ-REG-002 | LGPD compliance | Consent service, audit logs, data export/rectification/erasure | `consent-lifecycle.test.ts`, habeas data test suites | HAZ-005 |
| REQ-REG-003 | HIPAA PHI encryption | `hipaa-encryption.ts` | Encryption unit tests | HAZ-005 |
| REQ-REG-004 | Portaria 344/1998 drug schedules | `anvisa-drug-registry.ts` — `DRUG_REGISTRY` entries with `sourceAuthority` | Unit tests: schedule lookup for known drugs | HAZ-003 |
| REQ-REG-005 | All Brazilian prescription types supported | `anvisa-drug-registry.ts` — `PrescriptionTypeCode` type: BRANCA, AZUL, AMARELA, ESPECIAL, ANTIMICROBIAL | Unit tests: classification returns correct type for each drug class | HAZ-003 |

---

## 7. Accessibility Requirements Traceability

| Req ID | Requirement Summary | Design Component | Test Case | Risk Control |
|--------|-------------------|-----------------|-----------|-------------|
| REQ-A11Y-001 | WCAG 2.1 AA on patient-facing pages | All pages in `apps/web/src/app/` | `apps/web/tests/accessibility/a11y.spec.ts`, `accessibility-fixes.spec.ts` | — |
| REQ-A11Y-002 | AxeBuilder automated validation | Playwright + AxeBuilder integration | `a11y.spec.ts` — AxeBuilder scans per page | — |

---

## 8. Orphan Check

### 8.1 Requirements Without Tests

**None identified.** All 41 requirements are traced to at least one test case.

### 8.2 Requirements Without Design Components

**None identified.** All 41 requirements are traced to at least one design component with file path.

### 8.3 Risk Controls Without Verification

**None identified.** All 10 hazard controls (HAZ-001 through HAZ-010) are traced to at least one requirement and test case.

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
