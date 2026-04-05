# Risk Management File

**Document ID:** RMF-HHL-001  
**ISO 14971 Reference:** Risk Management Process for Medical Devices  
**IEC 62304 Reference:** Clause 7 — Software Risk Management  
**Safety Classification:** Class A  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. Intended Use Statement

### 1.1 Product Description

The Holi Labs Clinical Platform is a Software as a Medical Device (SaMD) that provides deterministic clinical decision support (CDS) for healthcare providers in Brazil. The system uses a traffic light pattern (RED, YELLOW, GREEN) to present safety alerts for prescriptions, clinical encounters, and billing compliance.

### 1.2 Intended Users

- Licensed physicians (CRM holders)
- Clinical nurses
- Pharmacists
- Clinic administrators

### 1.3 Intended Use Environment

- Brazilian healthcare facilities (clinics, hospitals, pharmacies)
- Internet-connected workstations
- Portuguese-language interface

### 1.4 Indications for Use

- Prescription safety checking against ANVISA drug schedules
- Drug interaction and allergy alerting
- Clinical documentation support
- Billing compliance pre-validation (TUSS/ANS codes)

### 1.5 Contraindications

- This software SHALL NOT be used as the sole basis for clinical decisions
- This software SHALL NOT be used for autonomous treatment decisions
- This software is NOT intended for use in emergency/critical care triage without clinician oversight

### 1.6 Processing Method — Determinism Statement

The CDS engine is **fully deterministic**. It uses JSON-Logic rules evaluated against structured patient data. The system does NOT use:
- Machine learning models
- Neural networks or deep learning
- Probabilistic inference
- Natural language processing for clinical decisions

All outputs are reproducible: the same input always produces the same output. This is architecturally enforced by:
- Operation allowlist in `rule-engine.ts` (lines 40–51)
- JSON-Logic validation before execution (`validateJsonLogicOperations()`)
- TypeScript compliance rules that are compile-time verified

---

## 2. Risk Estimation Criteria

### 2.1 Severity Scale

| Level | Rating | Definition | Example |
|-------|--------|-----------|---------|
| S1 | Negligible | No clinical impact, cosmetic issue | UI formatting error in non-clinical field |
| S2 | Minor | Inconvenience, workaround available | Slow response time requiring page reload |
| S3 | Serious | Incorrect information displayed, clinician must verify | Wrong drug interaction severity shown (YELLOW shown as GREEN) |
| S4 | Critical | Potential for clinical error if clinician does not independently verify | Missed contraindication alert (false negative) |
| S5 | Catastrophic | Direct contribution to patient harm | N/A — System is advisory only; clinician always makes final decision |

**Note:** S5 is included for completeness but is not achievable in this system because the clinician always retains override capability and clinical responsibility.

### 2.2 Probability Scale

| Level | Rating | Definition |
|-------|--------|-----------|
| P1 | Improbable | < 1 in 100,000 uses |
| P2 | Remote | 1 in 10,000 to 1 in 100,000 uses |
| P3 | Occasional | 1 in 1,000 to 1 in 10,000 uses |
| P4 | Probable | 1 in 100 to 1 in 1,000 uses |
| P5 | Frequent | > 1 in 100 uses |

### 2.3 Risk Acceptability Matrix

| | S1 Negligible | S2 Minor | S3 Serious | S4 Critical |
|---|---|---|---|---|
| **P5 Frequent** | Acceptable | ALARP | Unacceptable | Unacceptable |
| **P4 Probable** | Acceptable | ALARP | Unacceptable | Unacceptable |
| **P3 Occasional** | Acceptable | Acceptable | ALARP | Unacceptable |
| **P2 Remote** | Acceptable | Acceptable | ALARP | ALARP |
| **P1 Improbable** | Acceptable | Acceptable | Acceptable | ALARP |

- **Acceptable:** No additional risk control required
- **ALARP:** As Low As Reasonably Practicable — risk controls applied, residual risk documented
- **Unacceptable:** Must be mitigated to acceptable level before release

---

## 3. Hazard Analysis

### HAZ-001: False Negative — Missed Drug Interaction Alert

| Attribute | Value |
|-----------|-------|
| **Hazard** | The CDS fails to flag a known drug interaction |
| **Harm** | Clinician prescribes interacting drugs without awareness of risk |
| **Cause** | Missing or incorrect rule in JSON-Logic database; rule cache serving stale data |
| **Initial Severity** | S4 (Critical — incorrect info if not independently verified) |
| **Initial Probability** | P2 (Remote — rules are validated before deployment) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Compliance rules (TypeScript, immutable) cover known lethal interactions — `rule-engine.ts` lines 234–275; (2) Business rule cache TTL of 60s limits stale data window; (3) Safety envelope disclaimer reminds clinician to verify; (4) Rule validation on upsert via `validateJsonLogic()` |
| **Residual Severity** | S3 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-002: False Positive — Unnecessary Blocking Alert

| Attribute | Value |
|-----------|-------|
| **Hazard** | The CDS generates a RED alert for a safe prescription |
| **Harm** | Clinician experiences alert fatigue; may delay necessary treatment |
| **Cause** | Overly broad rule matching; incorrect rule logic |
| **Initial Severity** | S2 (Minor — clinician can override with justification) |
| **Initial Probability** | P3 (Occasional) |
| **Initial Risk** | Acceptable |
| **Controls** | (1) Override capability with justification for YELLOW, supervisor approval for RED — `engine.ts` lines 478–506; (2) RLHF capture of override rationale for rule tuning — `engine.ts` lines 533–561; (3) Clinic-specific rule overrides |
| **Residual Risk** | **Acceptable** |

### HAZ-003: Wrong Controlled Substance Classification

| Attribute | Value |
|-----------|-------|
| **Hazard** | Medication classified under wrong ANVISA schedule (e.g., A1 drug classified as BRANCA) |
| **Harm** | Controlled substance prescribed without required safeguards (ICP-Brasil signature, witness) |
| **Cause** | Incorrect CATMAT code mapping in drug registry |
| **Initial Severity** | S3 (Serious — regulatory non-compliance) |
| **Initial Probability** | P2 (Remote — static registry verified against Portaria 344/1998) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Static drug registry with source authority metadata — `anvisa-drug-registry.ts`; (2) `classifyPrescription()` determines most restrictive type across all medications; (3) ICP-Brasil signature enforced for AZUL/AMARELA — `icp-brasil-signer.ts`; (4) Registry entries include `lastUpdated` date for currency verification |
| **Residual Severity** | S2 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-004: Audit Trail Failure

| Attribute | Value |
|-----------|-------|
| **Hazard** | Clinical safety events not persisted to the governance log |
| **Harm** | Loss of regulatory traceability; inability to reconstruct clinical decision chain |
| **Cause** | Database transaction failure; connection timeout |
| **Initial Severity** | S3 (Serious — compliance gap) |
| **Initial Probability** | P2 (Remote — database in managed cloud with HA) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Failsafe: clinical workflow continues even if audit persistence fails — `safety-audit-logger.ts` lines 74–82; (2) System logger captures the original event context as backup; (3) Structured log events (`SAFETY_EVENT_PERSISTENCE_FAILED`) for reconciliation; (4) Database transaction wraps InteractionSession + GovernanceLog + GovernanceEvent atomically |
| **Residual Severity** | S2 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-005: PHI Data Exposure

| Attribute | Value |
|-----------|-------|
| **Hazard** | Patient health information exposed via logs, API responses, or database breach |
| **Harm** | Privacy violation (LGPD Art. 5, HIPAA §164.312) |
| **Cause** | PHI logged in plaintext; encryption key compromise; SQL injection |
| **Initial Severity** | S4 (Critical — regulatory + patient harm) |
| **Initial Probability** | P2 (Remote — multiple layers of protection) |
| **Initial Risk** | ALARP |
| **Controls** | (1) AES-256-GCM field-level encryption with key versioning — `hipaa-encryption.ts`; (2) PHI logging prohibition enforced by code rules and pre-commit hooks — `.claude/rules/security.md`; (3) Zod input validation on all API routes; (4) Parameterized queries via Prisma ORM; (5) Explicit column selection (no `SELECT *`); (6) Timing-safe comparison for sensitive values |
| **Residual Severity** | S3 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-006: Unauthorized Access to Patient Records

| Attribute | Value |
|-----------|-------|
| **Hazard** | User accesses patient data beyond their role permissions |
| **Harm** | Privacy violation; unauthorized clinical actions |
| **Cause** | RBAC bypass; session hijacking; privilege escalation |
| **Initial Severity** | S4 (Critical) |
| **Initial Probability** | P2 (Remote) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Casbin RBAC with fail-closed enforcement — `casbin.ts` lines 130–132; (2) Role hierarchy with principle of least privilege; (3) Session tokens: HttpOnly, Secure, SameSite=Strict; (4) MFA (TOTP + WebAuthn); (5) AuditLog with `accessReason` for all PHI access; (6) Rate limiting on all endpoints |
| **Residual Severity** | S3 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-007: JSON-Logic Injection via Database Rules

| Attribute | Value |
|-----------|-------|
| **Hazard** | Malicious or dangerous JSON-Logic operations injected via the business rules database |
| **Harm** | Arbitrary code execution; data exfiltration; denial of service |
| **Cause** | Compromised admin account; SQL injection into rules table |
| **Initial Severity** | S4 (Critical) |
| **Initial Probability** | P1 (Improbable — requires admin access + RBAC bypass) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Operation allowlist: only 20 safe, side-effect-free operations permitted — `rule-engine.ts` lines 40–51; (2) Recursive validation of all rule trees before execution — `validateJsonLogicOperations()`; (3) Rules with disallowed operations are skipped and logged; (4) Admin-only rule management with audit logging |
| **Residual Severity** | S2 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-008: ICP-Brasil Signature Verification Bypass

| Attribute | Value |
|-----------|-------|
| **Hazard** | Controlled substance prescription accepted without valid ICP-Brasil digital signature |
| **Harm** | Regulatory non-compliance with ANVISA RDC 1.000/2025 |
| **Cause** | Certificate validation failure; expired trust store; software bug |
| **Initial Severity** | S3 (Serious — regulatory violation) |
| **Initial Probability** | P2 (Remote) |
| **Initial Risk** | ALARP |
| **Controls** | (1) Certificate validity period check (notBefore/notAfter) — `icp-brasil-signer.ts` lines 117–133; (2) SHA-256 signature verification against public key; (3) CRM extraction and validation from certificate subject DN; (4) Trust store fingerprint verification against ICP-Brasil root CAs |
| **Residual Severity** | S2 |
| **Residual Probability** | P1 |
| **Residual Risk** | **Acceptable** |

### HAZ-009: System Unavailability During Clinical Workflow

| Attribute | Value |
|-----------|-------|
| **Hazard** | Platform becomes unavailable while clinician is mid-encounter |
| **Harm** | Clinical workflow disruption; delayed patient care |
| **Cause** | Infrastructure failure; deployment error; database connection exhaustion |
| **Initial Severity** | S2 (Minor — clinician falls back to manual processes) |
| **Initial Probability** | P2 (Remote — cloud HA infrastructure) |
| **Initial Risk** | Acceptable |
| **Controls** | (1) 99.5% uptime target; (2) GREY traffic light returned on evaluation error — `engine.ts` lines 156–181; (3) Graceful degradation: compliance rules continue without database business rules |
| **Residual Risk** | **Acceptable** |

### HAZ-010: Stale Business Rules Served from Cache

| Attribute | Value |
|-----------|-------|
| **Hazard** | Updated safety rule not applied due to cache serving previous version |
| **Harm** | Brief window where new safety check is not enforced |
| **Cause** | 60-second cache TTL; cache invalidation race condition |
| **Initial Severity** | S2 (Minor — maximum 60-second window) |
| **Initial Probability** | P3 (Occasional — expected during any rule update) |
| **Initial Risk** | Acceptable |
| **Controls** | (1) Cache TTL limited to 60 seconds — `rule-engine.ts` line 189; (2) Cache invalidation on rule upsert — `rule-engine.ts` line 518; (3) Compliance rules (TypeScript, not cached) are always current; (4) Critical safety rules are implemented as compliance rules, not business rules |
| **Residual Risk** | **Acceptable** |

---

## 4. Residual Risk Summary

| Hazard ID | Description | Initial Risk | Residual Risk |
|-----------|-------------|-------------|---------------|
| HAZ-001 | Missed drug interaction alert | ALARP | Acceptable |
| HAZ-002 | Unnecessary blocking alert | Acceptable | Acceptable |
| HAZ-003 | Wrong controlled substance classification | ALARP | Acceptable |
| HAZ-004 | Audit trail failure | ALARP | Acceptable |
| HAZ-005 | PHI data exposure | ALARP | Acceptable |
| HAZ-006 | Unauthorized access | ALARP | Acceptable |
| HAZ-007 | JSON-Logic injection | ALARP | Acceptable |
| HAZ-008 | ICP-Brasil signature bypass | ALARP | Acceptable |
| HAZ-009 | System unavailability | Acceptable | Acceptable |
| HAZ-010 | Stale cached rules | Acceptable | Acceptable |

**Overall Residual Risk Assessment:** All identified hazards have been mitigated to an **Acceptable** level. The combination of deterministic CDS, clinician-in-the-loop design, and multi-layered security controls ensures that the overall residual risk of the Holi Labs Clinical Platform is acceptable per ISO 14971 Clause 7.4.

---

## 5. Benefit-Risk Analysis

The benefits of the Holi Labs Clinical Platform include:
- Real-time drug interaction and allergy checking at point of prescribing
- ANVISA controlled substance classification enforcement
- Billing compliance pre-validation reducing glosa (claim denial) rates
- Complete audit trail for clinical decisions and overrides

These benefits outweigh the residual risks identified above, particularly given that the system is advisory-only with mandatory clinician oversight.

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
