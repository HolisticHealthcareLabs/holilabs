# Cortex by Holi Labs — Product Overview

**Clinical Safety Infrastructure for AI-Assisted Healthcare**

*Confidential — February 2026*

---

## Executive Summary

Cortex is a clinical intelligence platform that ensures every AI-assisted medical decision is safe, governed, and auditable. Built for Latin American healthcare systems with global compliance readiness, Cortex sits between large language models and the clinician, capturing real-time physician feedback to build a proprietary dataset of Clinical Ground Truth.

The platform does not replace clinical judgment. It makes clinical judgment faster, safer, and provably compliant.

**Core thesis:** As AI scales in healthcare, the value accrues not to the model builders (OpenAI, Google, Anthropic) but to whoever owns the trust and validation layer on top. Cortex is that layer.

---

## Page 1: What Cortex Does

### The Problem

LATAM healthcare loses $12B+ annually to adverse drug events, preventable readmissions, and billing denials (glosas). The root cause is not a lack of clinical knowledge — it is a lack of workflow reliability in fragmented EHR environments.

A typical LATAM clinician has 7 minutes per patient, stale lab results, no drug-interaction alerts, and coordinates care over WhatsApp. Hospital leadership has no real-time visibility into whether protocols are being followed. Insurers absorb loss ratios (sinistralidade) above 83%.

Existing solutions are either built for US workflows (Epic, Optum — $500-1,000/user) or cover only narrow use cases (Robo Laura for sepsis detection). No platform in LATAM delivers safety, governance, and longitudinal care as a unified system.

### The Solution: Three Engines, One Clinical System

Cortex operates through three integrated engines:

**Safety Engine** — Real-time clinical decision support using deterministic logic, not LLM guesses. The Safety Engine evaluates drug interactions, renal dosing adjustments, formulary compliance, and billing risk using traffic-light visualization (RED / YELLOW / GREEN). When a clinician overrides a safety alert, the system captures a structured rationale. This creates an auditable trail and feeds the governance layer. Key capabilities include:

- Drug-drug and drug-allergy interaction checking against RxNorm and DCB ontologies
- Renal dose adjustment alerts based on eGFR calculations
- Formulary compliance nudges with preferred alternative suggestions and cost-savings estimates
- Billing risk scoring (glosa probability) before claim submission
- Break-glass override with mandatory justification capture

**Prevention Hub** — Longitudinal care management across seven health domains (Cardiometabolic, Oncology, Musculoskeletal, Neurocognitive, Gut, Immune, Hormonal). The Prevention Hub provides dynamic risk scoring (0-100 per domain), collaborative clinical templates with version control, automated screening reminders, and one-click workflows for orders, referrals, and patient tasks. It integrates 50+ evidence-based protocols from WHO, NHS, ESC, RACGP, and USPSTF. Key capabilities include:

- AI-powered longitudinal risk assessment with visual risk indicators
- Collaborative templates with commenting, sharing, and @mention functionality
- Automated reminder management with status tracking (DUE / OVERDUE / SCHEDULED / COMPLETED)
- Version-controlled protocol templates with audit trail
- Real-time condition detection via WebSocket integration
- 100+ integrative and naturopathic interventions alongside conventional protocols

**Governance Console** — A real-time audit and compliance dashboard for hospital leadership and quality teams. The Governance Console provides a live validation stream showing every clinical decision as it happens — what was approved, what was overridden, and where protocols are drifting. It includes fleet management for multi-site deployments, trust scoring, and tamper-evident hash-chain audit trails that satisfy HIPAA and LGPD requirements. Key capabilities include:

- Live validation stream with real-time clinical event monitoring
- Global trust score (0-100) with trend analysis
- Override reason ranking and pattern analysis
- KPI cards with manifest-backed metric definitions (Interventions, Hard Brakes, Uptime, Protocols Active)
- Fleet management with device heartbeat monitoring and ruleset versioning
- Code focus controls for filtering by ICD/CPT/protocol codes
- Exportable audit summaries for compliance reviews

### The Architectural Insight

All safety-critical decisions use deterministic logic (JSON-Logic rules), not probabilistic AI outputs. AI handles context-gathering and documentation — tasks where hallucinations are low-risk. Deterministic rules handle prescribing safety, dosing, and compliance — tasks where errors are dangerous. The clinician always makes the final call.

This architecture achieves two critical outcomes: it earns trust from regulators (ANVISA classifies deterministic CDS as Class I, avoiding multi-year clinical trial requirements) and it earns trust from clinicians (they can audit exactly why a recommendation was made).

---

## Page 2: How Cortex Works in Practice

### The Validation Loop

When a clinician opens a patient chart, Cortex executes the following workflow in under two seconds:

1. **Context Loading.** EHR data, lab results, active medications, allergies, and risk factors are extracted and normalized against standard ontologies (LOINC for labs, ICD-10 + SNOMED CT for conditions, RxNorm/DCB for medications).

2. **Rule Evaluation.** The traffic-light engine evaluates all applicable clinical rules in parallel. The worst color wins: a single RED rule makes the entire assessment RED. Rules are version-controlled and follow a governance lifecycle (DRAFT, REVIEW, APPROVED, ACTIVE, DEPRECATED).

3. **Clinician Verification.** The results are presented as a pre-filled verification flow. The clinician reviews the traffic-light assessment, confirms or overrides the rationale, and completes sign-off with a single action.

4. **Documentation and Governance.** An audit note, governance event, and follow-up actions are queued automatically. The override reason (if applicable) is structured and exportable. The care team is notified.

This loop is designed to take less than 30 seconds. If the AI recommends something and the clinician rejects it, that rejection feeds back into the system — creating the dataset of Clinical Ground Truth that trains the safety firewall over time.

### The Technology Stack

- **Frontend:** Next.js 14+ with React, Tailwind CSS, and Framer Motion. Server components for auth-aware routing. Client components for interactive workflows.
- **Backend:** Next.js API routes + PostgreSQL via Prisma ORM. NextAuth v5 with JWT sessions for HIPAA-compliant session management (15-minute idle timeout, 8-hour absolute timeout).
- **Clinical Ontologies:** LOINC (lab tests), ICD-10 + SNOMED CT (conditions), RxNorm/DCB (medications), TUSS (Brazilian billing codes with 50 procedure codes across 4 categories).
- **Internationalization:** Full trilingual support (English, Spanish, Portuguese) across all user-facing interfaces and clinical content.
- **Audit Infrastructure:** Tamper-evident hash-chain audit trails. Bemi integration for PostgreSQL WAL-level auditing (SOC 2 Control CC7.2). Structured override reason tracking.
- **Email and Notifications:** Resend for transactional emails (welcome, magic link, appointment reminders). Novu integration for multi-channel notification preferences.
- **Real-Time:** WebSocket-based real-time prevention detection. Live governance event streaming.

### Compliance Posture

Cortex is designed to operate within the regulatory frameworks of its target markets:

- **LGPD (Brazil):** Granular consent management with toggleable purposes (Service, Research, Marketing). Right to Be Forgotten implementation. Data minimization principles enforced at the API level. Anonymization proxy for any data sent to external AI providers.
- **ANVISA RDC 657/2022:** Classified as Class I Clinical Decision Support. All UI, API, and marketing copy avoids SaMD-triggering language ("diagnose," "detect," "prevent," "treat"). Every clinical assessment includes a disclaimer: "This tool does not replace clinical judgment."
- **HIPAA:** Session security with 15-minute idle timeout. Encrypted PHI storage. Business Associate Agreement framework. De-identification workflows for enterprise data.
- **Explainability:** All high-stakes risk scores return contributing factors (equivalent to Shapley Values). No black-box AI decisions on safety-critical paths.

---

## Page 3: Market Strategy and Defensibility

### The Dual-Track Go-to-Market

Cortex operates a Y-Split strategy with two complementary revenue tracks:

**Track A: Cortex Clinic (Revenue Bridge)** — SaaS for private clinics in LATAM. Entry at $25/practitioner/month (Starter), scaling to $75/practitioner/month (Professional). Three-month sales cycle. Web-first deployment that works with basic EHRs and requires no deep integration. This track generates cash flow immediately.

**Track B: Cortex Enterprise (The Bet)** — Platform for hospitals and insurers. Custom annual contracts starting at $500/user/month. Risk assessment APIs with rate-limited access. Insurer dashboards with anonymized population analytics. 9-18 month sales cycle. This track builds enterprise credibility and captures high-ACV contracts.

Track A funds operations. Track B captures the long-term market.

### Unit Economics

| Metric | Professional Tier (Base Case) |
|--------|-------------------------------|
| Average Revenue Per User | $75/month |
| Lifetime Value (36 months) | $2,700 |
| Blended Customer Acquisition Cost | $300 |
| LTV:CAC Ratio | 9:1 |
| Gross Margin | 83.8% |
| CAC Payback Period | 5.3 months |
| Break-even | 27 clinics at R$2,500/month |

### The Data Moat

Cortex's competitive advantage is not the algorithm — it is the proprietary dataset of physician corrections that trains the algorithm.

Every time a clinician accepts, rejects, or modifies an AI recommendation, that interaction feeds a growing dataset of Clinical Ground Truth. This creates three compounding effects:

1. **The Safety Firewall.** A secondary routing model, trained exclusively on accept/reject data, intercepts previously rejected patterns and known clinical hallucinations before they reach the clinician. More clinicians means fewer hallucinations get through.

2. **Federated Learning.** The learnings from AI corrections are shared across hospital systems without moving Protected Health Information. The guardrail gets smarter globally while patient data stays local.

3. **The "Verified by Cortex" API.** Third-party health apps, telemedicine platforms, and LLM creators will be able to score the clinical safety of their generated outputs against the Cortex dataset before publishing. This positions Cortex as the tollbooth on top of clinical AI.

### Competitive Positioning

| Competitor | Gap | Cortex Advantage |
|------------|-----|------------------|
| Epic / Cerner | US-centric, $500-1,000/user, 18-month implementation | LGPD-native, WhatsApp-first, deploys in weeks, priced for LATAM |
| Robo Laura (MV) | Narrow AI (sepsis only), single-use case | Full platform: safety + prevention + governance |
| Feegow | Practice management, no CDS, no governance | Adds clinical intelligence layer on top of workflow |
| Optum | US analytics platform, no LATAM compliance | LGPD and ANVISA compliant, trilingual, LATAM-first |

### The Vision

By 2031, Cortex is the clinical safety infrastructure layer for LATAM healthcare. Every prescription checked. Every protocol governed. Every follow-up completed. The trust layer between clinicians, patients, and payers — processing millions of clinical decisions annually with full auditability.

If LATAM insurers reduce sinistralidade by just 2 percentage points through governed clinical workflows, that represents $2.4B in annual savings. Cortex captures 1-3% of the value it creates.

---

## Current Status

| Dimension | Status |
|-----------|--------|
| Product readiness | 95% production-ready |
| Test coverage | 1,587 tests passing |
| Clinical protocols | 50+ evidence-based (WHO, NHS, ESC, RACGP, USPSTF) |
| Languages | English, Spanish, Portuguese |
| Pilot pipeline | Bolivia (Wave 1), Brazil (Wave 2), Argentina (Wave 3) |
| Primary clinical wedge | Inpatient cardiology (DOAC safety + discharge follow-up) |
| Research partnership | Johns Hopkins University |
| Launch blocker | Vendor BAA signatures (non-technical) |

---

*Cortex by Holi Labs*
*The Guardrail for Clinical AI.*
*cortexbyholi.com*
