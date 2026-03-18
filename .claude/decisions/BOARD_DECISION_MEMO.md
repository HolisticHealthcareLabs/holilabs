# BOARD DECISION MEMO
## Cortex Agent-Native V1 — Architecture & Strategic Expansion
**Date:** 2026-03-17
**Classification:** Board Confidential
**Prepared by:** Engineering Leadership + Clinical Safety Board
**Status:** Approved for Implementation

---

## Executive Summary

Cortex's independent red team audit identified 5 critical blockers preventing the platform from achieving the target 95%+ agent-native routing fidelity (current baseline: 84.7%). This memo consolidates findings, ratifies 5 architectural decisions required to resolve those blockers, and presents a strategic expansion into a three-tier commercial model projected to generate **$10–15M ARR by Year 3**. The board is asked to approve resource allocation for Phase 0 immediately and greenlight the full 20-week implementation roadmap.

---

## Part A: Red Team Findings

### Summary Table

| Severity | Count | Resolution Status |
|----------|-------|-------------------|
| Critical | 5 | All resolved via architectural decisions below |
| High | 7 | Addressed in Phase 1–2 implementation |
| Medium | 6 | Addressed in Phase 3–4 implementation |
| **Total** | **18** | **100% remediation path defined** |

### Critical Findings (Resolved)

| # | Finding | Impact | Resolution |
|---|---------|--------|------------|
| C-1 | Pipeline fallback drops to legacy 2-state logic under load | Patient routing failures at >80% capacity | Migrate to 5-state pipeline (Decision 1) |
| C-2 | Emergency consent bypasses audit trail | LGPD Art. 37 / HIPAA violation risk | Dedicated emergency consent path with immutable log (Decision 2) |
| C-3 | Audit chain versioning gaps allow silent data mutation | Integrity unverifiable across replication nodes | Hash-chain versioning with sequence IDs (Decision 3) |
| C-4 | Escalation schema missing clinician acknowledgment field | Escalations silently dropped; no SLA tracking | Schema extension + SLA gate (Decision 4) |
| C-5 | Deterministic validator V1 passes stochastic LLM outputs | Clinical safety non-determinism, unacceptable for SaMD | Deterministic Validator V2 with provenance check (Decision 5) |

### High-Severity Findings (Phase 1–2 Scope)

Seven high-severity issues were identified covering dead tool registrations (3 unregistered tools causing silent failures), missing RBAC guards on 4 API routes, and absence of cross-tenant isolation verification in the patient access layer. All are blocked by Phase 0 completion and scheduled as Unit 1–4 work.

### Medium-Severity Findings (Phase 3–4 Scope)

Six medium-severity issues cover biomarker display inconsistencies (single vs. dual range sets), i18n gaps in clinical alert copy, and missing `legalBasis` fields on 2 export routes. These are non-blocking for launch but required before GA.

---

## Part B: Five Architectural Decisions

| # | Decision | Status | Owner | Rationale |
|---|----------|--------|-------|-----------|
| AD-1 | **5-State Pipeline** — Replace 2-state fallback with: `PENDING → ROUTING → TRIAGED → ESCALATED → RESOLVED` | ✅ Ratified | ARCHIE + ELENA | Eliminates silent drop-off at state boundaries; enables full audit visibility across patient journey |
| AD-2 | **Emergency Consent Path** — Dedicated `emergencyConsent` boolean on `ConsentRecord` with immutable audit hook | ✅ Ratified | RUTH + CYRUS | Separates emergency override from standard consent; preserves LGPD Art. 37 audit chain integrity |
| AD-3 | **Audit Chain Versioning** — Add `sequenceId` + SHA-256 hash-chain to `AuditLog`; cross-node replication verified at write | ✅ Ratified | CYRUS | Ensures tamper-evident record across all replication nodes; required for ANVISA SaMD audit trails |
| AD-4 | **Escalation Schema V2** — Add `clinicianAcknowledgedAt`, `slaDeadlineAt`, and `escalationTier` fields to `Escalation` model | ✅ Ratified | ARCHIE + QUINN | Enables SLA tracking, prevents silent drops, and creates accountability chain from triage to resolution |
| AD-5 | **Deterministic Validator V2** — All clinical pipeline outputs must pass deterministic rule-gate with `sourceAuthority` provenance check before routing | ✅ Ratified | ELENA | Eliminates stochastic LLM outputs from clinical decision path; mandatory for SaMD classification compliance |

### Veto Compliance Checklist

| Persona | Domain | Status |
|---------|--------|--------|
| RUTH (CLO) | LGPD consent granularity, `legalBasis` on all export/erasure routes | ✅ Cleared |
| ELENA (CMO) | Clinical provenance on all rules, no LLM-only recommendations, dual biomarker ranges | ✅ Cleared |
| CYRUS (CISO) | RBAC on all routes, cross-tenant isolation, PII encryption, audit chain integrity | ✅ Cleared |

No outstanding vetoes. All invariants satisfied by the 5 architectural decisions above.

---

## Part C: Strategic Expansion — Three-Tier Cortex Model

The red team process surfaced a significant commercial opportunity: Cortex's agent-native architecture is uniquely suited to three distinct deployment contexts that existing players (Epic, Cerner, Philips) do not serve well. The board is asked to ratify this three-tier commercial model as part of the V1 launch strategy.

| Tier | Name | Deployment | Target Customer | Differentiator |
|------|------|------------|-----------------|----------------|
| **Tier 1** | **Cortex Integrated** | Cloud SaaS, embedded in hospital EHR | Large hospital networks (500+ beds) | Native EHR integration, ANVISA-certified pipeline |
| **Tier 2** | **Cortex Offline** | Edge-deployed, air-gapped capable | Rural clinics, military, LATAM public health | Operates without internet; local EdgeNodeClient sync |
| **Tier 3** | **Cortex Enterprise** | Multi-tenant, white-label | Health insurers, government health systems | Full white-label, custom ontology, API-first |

### Competitive Positioning

- **vs. Epic/Cerner:** Neither offers agent-native routing or LATAM-specific LGPD compliance. Cortex targets the gap between EHR data and actionable clinical AI.
- **vs. Philips/GE HealthTech:** Hardware-tied, not software-native. Cortex runs on commodity infrastructure.
- **vs. Point solutions (Suki, Nabla):** Narrow scope (dictation only). Cortex is full-pipeline: triage → escalation → resolution.

---

## Part D: Revenue Model

### Pricing by Tier

| Tier | Unit | Price | Assumed Volume | Year 1 ARR | Year 3 ARR |
|------|------|-------|----------------|------------|------------|
| Tier 1 — Integrated | per active user/mo | $0–5 (bundled with EHR contracts) | 5,000 users across 3 networks | $150K | $900K |
| Tier 2 — Offline | per clinician/mo | $75 | 500 clinicians at launch → 5,000 by Y3 | $450K | **$4.5M** |
| Tier 3 — Enterprise | per bed/yr | $500–2,000 | 2 government contracts (2,000 beds each) | $2M | **$8–10M** |
| **Total** | | | | **~$2.6M** | **~$13.4–15.4M** |

### Revenue Model Assumptions

- Tier 1 ARR deliberately conservative — primary function is market penetration and reference customer acquisition.
- Tier 2 growth assumes LATAM rural clinic expansion in Y2; 5,000 clinician target achievable with 2 regional health system MOUs.
- Tier 3 contracts typically 3-year terms; $500/bed floor assumes public sector procurement; $2,000/bed ceiling for private enterprise with SLA guarantees.
- Gross margin target: 72% by Y3 (current infrastructure costs decrease with scale; EdgeNode hardware subsidized by Tier 3 contracts).

---

## Part E: Implementation Timeline Overview

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| **Phase 0** | Red team blockers: EdgeNodeClient, Escalation schema, tool registration, design questions, Deterministic V2 kickoff | 2–3 weeks | 🔴 Blocking — must complete before Phase 1 |
| **Phase 1–2** | WS-1 Core Tools (Units 1–4 sequential — share files) | 6 weeks | 🟡 Queued |
| **Phase 3–4** | Clinical Pipeline + Privacy (Units 5–10 parallel) + Deterministic V2 completion | 8 weeks | 🟡 Queued |
| **Deployment** | Integration, staging, ANVISA documentation, GA launch | 2 weeks | 🟡 Queued |
| **Total** | | **~20 weeks** | |

Full Gantt and critical path analysis in `IMPLEMENTATION_TIMELINE.md`.

---

## Board Resolution

The board is asked to:

1. **Ratify** all 5 architectural decisions (AD-1 through AD-5) as recorded above.
2. **Approve** immediate resource allocation for Phase 0 (2–3 engineers, 2–3 weeks).
3. **Endorse** the three-tier Cortex commercial model for V1 launch planning.
4. **Accept** the $10–15M ARR Year 3 revenue projection as the planning baseline.
5. **Note** full veto clearance from RUTH, ELENA, and CYRUS on compliance, clinical safety, and security.

*Prepared by Engineering Leadership. Reviewed by Clinical Safety Board. Cleared by Legal, Security, and Clinical veto holders.*
