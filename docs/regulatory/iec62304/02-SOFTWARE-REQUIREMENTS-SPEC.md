# Software Requirements Specification

**Document ID:** SRS-HHL-001  
**IEC 62304 Reference:** Clause 5.2 — Software Requirements Analysis  
**Safety Classification:** Class A  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. Purpose

This document specifies the software requirements for the Holi Labs Clinical Platform (holilabsv2), a web-based SaaS application providing deterministic clinical decision support for Brazilian healthcare providers. Requirements are traced to design components, test cases, and risk controls in the Traceability Matrix (`06-TRACEABILITY-MATRIX.md`).

---

## 2. Functional Requirements — Clinical Decision Support

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-CLIN-001 | The system SHALL evaluate clinical rules using a deterministic JSON-Logic engine with a strict operation allowlist (comparison, logic, numeric, array, and data access operators only). | `apps/web/src/lib/clinical/rule-engine.ts` lines 40–51 | Mandatory |
| REQ-CLIN-002 | The system SHALL evaluate compliance rules (TypeScript-based, immutable) before business rules (JSON-Logic from database). If any compliance rule blocks, evaluation SHALL stop immediately. | `rule-engine.ts` lines 234–275 | Mandatory |
| REQ-CLIN-003 | The system SHALL validate all JSON-Logic operations against the allowlist before execution. Rules containing disallowed operations SHALL be skipped and logged. | `rule-engine.ts` function `validateJsonLogicOperations()` lines 60–91 | Mandatory |
| REQ-CLIN-004 | The system SHALL implement a traffic light pattern (RED, YELLOW, GREEN, GREY) where the worst color across all evaluated rules determines the overall result. | `apps/web/src/lib/traffic-light/engine.ts` lines 57–62, 420–435 | Mandatory |
| REQ-CLIN-005 | RED signals SHALL be overridable with supervisor approval. YELLOW signals SHALL be overridable with clinician justification. Lethal interactions (SEVERE_ALLERGY, LETHAL) SHALL be blocked. | `engine.ts` lines 478–506 | Mandatory |
| REQ-CLIN-006 | Every CDS response SHALL be wrapped in a `ClinicalSafetyEnvelope` containing: processing method, confidence score (0.0–1.0), disclaimer text, fallback status, and provenance metadata. | `apps/web/src/lib/clinical/safety-envelope.ts` | Mandatory |
| REQ-CLIN-007 | The clinical disclaimer SHALL state that the system does NOT constitute a medical diagnosis and that the treating physician retains full responsibility for all clinical decisions. | `safety-envelope.ts` lines 25–29 | Mandatory |
| REQ-CLIN-008 | All clinical safety events SHALL be persisted to the governance audit trail (InteractionSession → GovernanceLog → GovernanceEvent) within a database transaction. | `apps/web/src/lib/clinical/safety-audit-logger.ts` lines 22–83 | Mandatory |
| REQ-CLIN-009 | If audit trail persistence fails, the clinical workflow SHALL NOT be interrupted. The failure SHALL be logged to the system logger for reconciliation. | `safety-audit-logger.ts` lines 74–82 | Mandatory |
| REQ-CLIN-010 | The system SHALL classify medications against ANVISA CATMAT codes and controlled substance schedules (A1/A2/B1/C1/ANTIMICROBIAL) per Portaria SVS/MS 344/1998. | `apps/web/src/lib/brazil-interop/anvisa-drug-registry.ts` | Mandatory |
| REQ-CLIN-011 | Prescriptions containing controlled substances (AZUL/AMARELA) SHALL require ICP-Brasil digital signature verification. | `apps/web/src/lib/auth/icp-brasil-signer.ts` | Mandatory |
| REQ-CLIN-012 | Business rules SHALL be cached with a 60-second TTL. Clinic-specific rules SHALL override global rules when both exist. | `rule-engine.ts` lines 176–189, 388–458 | Mandatory |
| REQ-CLIN-013 | The traffic light engine SHALL evaluate all applicable rules in parallel for performance. | `engine.ts` lines 100–104 | Mandatory |
| REQ-CLIN-014 | Non-GREEN traffic light evaluations SHALL be captured for assurance/RLHF training (async, non-blocking). | `engine.ts` lines 533–561 | Desirable |

---

## 3. Functional Requirements — User Interface

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-FUNC-001 | The system SHALL provide a dashboard with modules for: My Day, Patients, Prescriptions, Appointments (Agenda), Analytics, Billing, Settings, and Administration. | `apps/web/src/app/dashboard/` directory structure | Mandatory |
| REQ-FUNC-002 | The system SHALL provide a clinical co-pilot interface for real-time CDS interaction. | `apps/web/src/app/dashboard/co-pilot/` | Mandatory |
| REQ-FUNC-003 | The system SHALL provide a governance console for reviewing clinical safety events and override rationale. | `apps/web/src/app/dashboard/governance/` | Mandatory |
| REQ-FUNC-004 | The system SHALL provide a patient portal for patient self-service access. | `apps/web/src/app/portal/` | Mandatory |
| REQ-FUNC-005 | The system SHALL support clinical encounter workflows including: scheduling, check-in, in-progress, and completion states. | `apps/web/src/app/api/encounters/` | Mandatory |
| REQ-FUNC-006 | The system SHALL provide SOAP note generation and clinical documentation. | `apps/web/src/app/dashboard/diagnosis/` | Mandatory |
| REQ-FUNC-007 | The system SHALL support lab order creation and result review. | `apps/web/src/app/dashboard/lab-orders/` | Mandatory |
| REQ-FUNC-008 | The system SHALL provide prescription management with safety checks integrated at the point of prescribing. | `apps/web/src/app/dashboard/prescriptions/` | Mandatory |
| REQ-FUNC-009 | The system SHALL support clinical document upload and management. | `apps/web/src/app/dashboard/upload/` | Mandatory |
| REQ-FUNC-010 | The system SHALL provide an enterprise admin interface for organization-level management. | `apps/web/src/app/enterprise/` | Desirable |

---

## 4. Security Requirements

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-SEC-001 | All PHI fields SHALL be encrypted at rest using AES-256-GCM with PBKDF2 key derivation (100,000 iterations, 256-bit key). | `apps/web/src/lib/security/hipaa-encryption.ts` lines 24–29, 81–83 | Mandatory |
| REQ-SEC-002 | Encryption keys SHALL support versioned rotation. Re-encryption SHALL use new salt and IV for each rotation. | `hipaa-encryption.ts` function `rotateEncryption()` lines 263–301 | Mandatory |
| REQ-SEC-003 | The system SHALL implement role-based access control (RBAC) using Casbin with role hierarchy (ADMIN > PHYSICIAN > CLINICIAN > NURSE > RECEPTIONIST > LAB_TECH > PHARMACIST > STAFF). | `apps/web/src/lib/auth/casbin.ts` lines 575–638 | Mandatory |
| REQ-SEC-004 | Authorization checks SHALL fail-closed: access denied on any error during policy evaluation. | `casbin.ts` lines 130–132 | Mandatory |
| REQ-SEC-005 | All RBAC policy changes SHALL create audit log entries. | `casbin.ts` lines 218–226, 271–278 | Mandatory |
| REQ-SEC-006 | All API routes SHALL require Zod schema validation for input parameters. | `.claude/rules/security.md` — Prohibited Patterns | Mandatory |
| REQ-SEC-007 | All API routes SHALL use `createProtectedRoute` middleware for authentication. No raw/unprotected route handlers are permitted. | `.claude/rules/security.md` — Architecture Patterns | Mandatory |
| REQ-SEC-008 | All patient data access SHALL create an AuditLog entry with `accessReason` (LGPD Art. 20 compliance). | Prisma schema: `AuditLog` model, `accessReason` field | Mandatory |
| REQ-SEC-009 | Session tokens SHALL be HttpOnly, Secure, SameSite=Strict. No auth tokens in localStorage. | `CLAUDE.md` Section V.2 | Mandatory |
| REQ-SEC-010 | CORS SHALL be restricted to known origins (`NEXT_PUBLIC_APP_URL`) in production. | `CLAUDE.md` Section V.4 | Mandatory |
| REQ-SEC-011 | Rate limiting SHALL be enabled on all environments. | `CLAUDE.md` Section V.4 | Mandatory |
| REQ-SEC-012 | CSP headers SHALL be enforced via `next.config.js` and `middleware.ts`. | `CLAUDE.md` Section V.4 | Mandatory |
| REQ-SEC-013 | ICP-Brasil digital signatures SHALL be verified against the ITI root CA trust store for controlled substance prescriptions. | `apps/web/src/lib/auth/icp-brasil-signer.ts` lines 40–45, 103–189 | Mandatory |
| REQ-SEC-014 | PHI field values SHALL never appear in application logs. Only tokenized identifiers (`tokenId`) are permitted in log output. | `.claude/rules/security.md` — Prohibited Patterns | Mandatory |
| REQ-SEC-015 | Database queries on patient tables SHALL use explicit column lists, never `SELECT *`. | `.claude/rules/security.md` — Prohibited Patterns | Mandatory |
| REQ-SEC-016 | The system SHALL support MFA via TOTP and WebAuthn biometric authentication. | Prisma schema: `User.mfaEnabled`, `WebAuthnCredential` model | Mandatory |
| REQ-SEC-017 | String comparisons for security-sensitive values SHALL use constant-time comparison to prevent timing attacks. | `hipaa-encryption.ts` function `secureCompare()` lines 248–253 | Mandatory |

---

## 5. Data Requirements

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-DATA-001 | Patient data SHALL be classified as L4 (PHI) and encrypted with AES-256-GCM with key versioning per field. | `.claude/rules/security.md` — Data Classification | Mandatory |
| REQ-DATA-002 | The AuditLog model SHALL record: actor (userId), action, resource, resourceId, IP address, data hash, access reason, actor type (USER/AGENT/SYSTEM), and success status. | Prisma schema: `AuditLog` model | Mandatory |
| REQ-DATA-003 | The GovernanceLog model SHALL record: input prompt, raw model output, sanitized output, provider, latency, token count, safety score, validation status, and override reason. | Prisma schema: `GovernanceLog` model | Mandatory |
| REQ-DATA-004 | The system SHALL support LGPD data subject rights: export, rectification, and erasure (cryptographic deletion). | API routes: `patients/[id]/export`, `deletion-request`, `erasure` | Mandatory |

---

## 6. Performance Requirements

| ID | Requirement | Target | Priority |
|----|------------|--------|----------|
| REQ-PERF-001 | API endpoint response time (p95) SHALL be below 500ms under normal load. | 500ms p95 | Mandatory |
| REQ-PERF-002 | Traffic light CDS evaluation SHALL complete within 200ms for cached rules. | 200ms | Mandatory |
| REQ-PERF-003 | The system SHALL maintain 99.5% uptime (monthly). | 99.5% | Mandatory |
| REQ-PERF-004 | Business rule cache TTL SHALL be 60 seconds to balance freshness and performance. | 60s TTL | Mandatory |
| REQ-PERF-005 | Audit log writes SHALL use fire-and-forget buffering to avoid blocking clinical workflows. | Non-blocking | Mandatory |

---

## 7. Regulatory & Compliance Requirements

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-REG-001 | The CDS engine SHALL be fully deterministic (JSON-Logic). No AI/ML models SHALL be used in clinical decision pathways. | `CLAUDE.md` Section III: "engine.ts MUST stay deterministic" | Mandatory |
| REQ-REG-002 | The system SHALL comply with LGPD (Lei 13.709/2018) including consent management, data minimization, and access justification. | `.claude/rules/security.md` | Mandatory |
| REQ-REG-003 | The system SHALL comply with HIPAA Security Rule for PHI encryption and access control. | `hipaa-encryption.ts` header reference: HIPAA §164.312(a)(2)(iv) | Mandatory |
| REQ-REG-004 | Drug classification SHALL follow Portaria SVS/MS 344/1998 schedule lists and ANVISA RDC 20/2011 for antimicrobials. | `anvisa-drug-registry.ts` | Mandatory |
| REQ-REG-005 | The system SHALL support all Brazilian prescription types: BRANCA, AZUL, AMARELA, ESPECIAL, and ANTIMICROBIAL. | `anvisa-drug-registry.ts` type `PrescriptionTypeCode` | Mandatory |

---

## 8. Accessibility Requirements

| ID | Requirement | Source | Priority |
|----|------------|--------|----------|
| REQ-A11Y-001 | All patient-facing pages SHALL conform to WCAG 2.1 Level AA. | `CLAUDE.md` Section VII.2 | Mandatory |
| REQ-A11Y-002 | Accessibility SHALL be validated via automated AxeBuilder scans in the E2E test suite. | `apps/web/tests/accessibility/a11y.spec.ts` | Mandatory |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
