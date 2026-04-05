# HoliLabs — Business Strategy
## Clinical Intelligence Platform for Latin American Healthcare

**Document Classification:** CONFIDENTIAL — L3
**Version:** 1.0 | **Date:** April 4, 2026
**Author:** Nico (CEO/Founder)
**Review Cycle:** Quarterly

---

## Executive Summary

HoliLabs is a clinical intelligence platform purpose-built for the Brazilian and Latin American healthcare market. We provide hospitals, clinics, and health systems with a unified operating system: electronic health records, deterministic clinical decision support, AI-assisted medical scribe, e-prescriptions with ICP-Brasil digital signatures, and LGPD-compliant data infrastructure — all within a single SaaS platform.

Our thesis is grounded in three empirical observations:

1. **Brazil's digital health market reached USD 12.4 billion in 2025** and is projected to grow at 15-23% CAGR through 2030, making it the largest digital health economy in Latin America.

2. **Brazil's EMR market is USD 1.67 billion (2025)** growing to USD 2.64 billion by 2030, yet adoption remains fragmented — the majority of Brazil's 4,745 private hospitals and tens of thousands of private clinics still rely on paper-based or legacy systems that cannot meet RNDS interoperability mandates.

3. **Regulatory timing is optimal.** ANVISA RDC 657/2022 created a simplified Class I notification pathway for deterministic CDS software. HoliLabs' JSON-Logic rule engine, traffic-light clinical alerts, and safety envelope architecture qualify for this pathway — meaning we can enter the market in months, not years.

We are not building another EMR. We are building the clinical intelligence layer that Brazilian healthcare providers need to comply with LGPD, connect to RNDS, digitize prescriptions via SNCR, and — critically — make better clinical decisions without adding cognitive burden to physicians.

---

## 0. Honest Assessment: What We Know vs. What We Assume

Before any strategy section, an investor deserves transparency on our evidence quality:

| Claim | Evidence Type | Confidence |
|-------|-------------|------------|
| Brazil digital health = USD 12.4B | Third-party market reports (Grand View, IMARC) | HIGH — triangulated across 3 sources |
| Mid-market clinics are underserved | Inference from competitor analysis + public pricing | MEDIUM — no primary interviews yet |
| Physicians want CDS in their workflow | Published burnout studies + RNDS/SNCR mandates | MEDIUM — need to validate with target users |
| Clinics will pay R$599/provider/month | Competitor pricing benchmarks + cost modeling | LOW — completely unvalidated with actual buyers |
| 70% pilot-to-paid conversion | Industry benchmarks (healthcare SaaS typically 30-60%) | LOW — aggressive assumption, no evidence |
| Break-even at 30-40 clinics | Financial model with assumed unit economics | LOW — ignores support costs (see §5.2) |

**Critical gap:** We have not conducted customer discovery interviews with target clinics. Before any capital is deployed beyond regulatory filings, we need 15-20 structured interviews with clinic owners/administrators in São Paulo to validate: (a) willingness to switch from current workflow, (b) price sensitivity, (c) feature priority, and (d) procurement process and timeline.

**Action item:** Weeks 1-2 of pre-pilot should be dedicated to customer discovery, not just engineering. Use the Mom Test methodology — ask about their current problems, not whether they'd buy our product.

---

## 1. Market Analysis

### 1.1 Total Addressable Market (TAM)

Brazil's healthcare system comprises 7,191 hospitals (4,745 private), approximately 300,000+ private clinics, 546,000 physicians, and 710 health insurance companies (operadoras). The digital health market is USD 12.4 billion (2025), projected to reach USD 21.9 billion by 2030 at a 23.2% CAGR.

Within this, the EMR/EHR segment specifically is USD 1.67 billion growing to USD 2.64 billion at 9.66% CAGR — but this understates the opportunity because HoliLabs captures revenue across EHR, CDS, e-prescribing, billing automation, and AI scribe — categories that collectively represent a USD 4-6 billion addressable market in Brazil alone.

### 1.2 Serviceable Addressable Market (SAM)

Our initial SAM is the private clinic and small-to-mid hospital segment in São Paulo, Rio de Janeiro, Minas Gerais, and the Southern states — representing approximately 65% of Brazil's private healthcare revenue. Within this geography, clinics with 5-50 physicians and hospitals with 50-300 beds are our sweet spot: large enough to need clinical decision support but underserved by the enterprise incumbents (MV, Philips Tasy, Pixeon) who require 12-18 month implementations and seven-figure contracts.

**SAM estimate:** 15,000-20,000 private clinics and 2,000-3,000 mid-size hospitals across the Sudeste and Sul regions. At an average annual contract value (ACV) of R$60,000-R$180,000 (USD 12,000-36,000), the SAM is approximately USD 300-700 million.

### 1.3 Serviceable Obtainable Market (SOM) — 24-Month Target

**Year 1 target:** 5-10 pilot clinics in São Paulo (validation)
**Year 2 target:** 50-100 clinics, 5-10 hospitals (commercialization)
**Year 2 ARR target:** R$3-6 million (USD 600K-1.2M)

These numbers are conservative relative to Bessemer's healthtech SaaS benchmarks, where AI-native healthtech firms show ARR/FTE of USD 500K-1M+ and top performers achieve 6-10x annual growth. We target capital-efficient growth at 3-5x YoY, prioritizing unit economics over vanity metrics.

### 1.4 Competitive Landscape

| Competitor | Segment | Weakness HoliLabs Exploits |
|-----------|---------|---------------------------|
| **MV Informática** | Enterprise hospitals | 12-18 month implementations, legacy architecture, no native CDS |
| **Philips Tasy** | Large hospital chains | Expensive, requires on-premise infrastructure, limited AI |
| **Pixeon** | Radiology/imaging focused | Not a general EHR, narrow clinical scope |
| **iClinic / Doctoralia** | Small clinics, scheduling | No clinical decision support, no e-prescribing, no ANVISA compliance |
| **Memed** | E-prescription only | Single-feature product, no EHR integration, no CDS |

**HoliLabs' differentiation is the integration.** No Brazilian competitor offers deterministic CDS + AI scribe + ICP-Brasil e-prescriptions + LGPD-compliant PHI encryption + RNDS/FHIR interoperability in a single cloud-native platform. We are the first to build for ANVISA RDC 657/2022 compliance from day one, not as a retrofit.

### 1.5 Porter's Five Forces Assessment

**Threat of new entrants: MODERATE.** Regulatory complexity (ANVISA, LGPD, ICP-Brasil, RNDS) creates a meaningful moat. Building IEC 62304-compliant software lifecycle documentation and obtaining AFE takes 6-12 months — time we've already invested.

**Bargaining power of buyers: HIGH.** Hospitals have long procurement cycles (6-18 months) and sophisticated IT/security teams. Our mitigation: start with clinics (30-60 day sales cycles), prove value, and use clinic success stories to enter hospitals.

**Bargaining power of suppliers: LOW.** Our stack uses commodity cloud infrastructure (PostgreSQL, Redis, Next.js), open standards (FHIR, HL7), and multi-provider AI (Gemini, Claude, GPT-4o with local Ollama fallback). No single vendor lock-in.

**Threat of substitutes: MODERATE.** Paper-based workflows are the primary substitute. The RNDS mandate and SNCR e-prescribing requirements are forcing digital adoption — working in our favor.

**Industry rivalry: LOW-MODERATE.** The Brazilian healthtech market is fragmented, with no dominant cloud-native EHR+CDS platform for the mid-market. This is a greenfield opportunity.

---

## 2. Business Model

### 2.1 Revenue Model

**Tiered SaaS subscription, per-provider-per-month (PPPM):**

| Tier | Target | Monthly (per provider) | Includes |
|------|--------|----------------------|----------|
| **Essentials** | Small clinics (1-5 providers) | R$299/mo | EHR, scheduling, patient portal, basic CDS alerts |
| **Professional** | Mid clinics (5-20 providers) | R$599/mo | + AI scribe, e-prescriptions, FHIR sync, advanced CDS |
| **Enterprise** | Hospitals / chains (20+ providers) | R$999/mo | + custom rules, API access, SLA, dedicated support, RBAC admin |

**Additional revenue streams:**
- Implementation and training fees (one-time): R$5,000-R$50,000 depending on size
- FHIR/HL7 integration services: R$10,000-R$100,000 per integration
- Data analytics (de-identified, opt-in, LGPD-compliant): Future revenue stream

### 2.2 Unit Economics (Target at Scale)

| Metric | Target | Benchmark |
|--------|--------|-----------|
| **CAC** | R$3,000-R$8,000 per clinic | HealthTech avg: USD 5-15K |
| **ACV** | R$60,000-R$180,000 per clinic | Based on 5-15 providers per clinic |
| **LTV** | R$300,000-R$900,000 | 5-year average lifecycle, <5% annual churn |
| **LTV:CAC** | >10:1 | Best-in-class SaaS: 3:1 minimum |
| **Gross Margin** | 75-80% | AI-native healthtech benchmark: 70-80% |
| **Net Revenue Retention** | 110-120% | Top-quartile SaaS: 110-120% |
| **Payback Period** | <6 months | Efficient for bootstrapped growth |

### 2.3 Go-to-Market Strategy

**Phase 1 — Validation (Q2-Q3 2026): 5-10 pilot clinics in São Paulo**

- **Channel:** Direct founder-led sales. I (Nico) personally onboard each clinic.
- **Pricing:** Free 90-day pilot, converting to Essentials or Professional tier.
- **Success metric:** 70% pilot-to-paid conversion rate.
- **Clinical champion strategy:** Identify one physician per clinic who becomes our internal advocate. Provide white-glove support and weekly check-ins.
- **Selection criteria:** Clinics with 5-15 providers, currently using paper or basic scheduling software, physician owner who is personally frustrated with current workflow.

**Phase 2 — Commercialization (Q4 2026 - Q2 2027): 50-100 clinics**

- **Channel:** Inside sales team (2-3 reps) + referral program from Phase 1 clinics.
- **Pricing:** Standard pricing with 20% annual prepay discount.
- **Success metric:** R$200K MRR by end of Q2 2027.
- **Content marketing:** Publish case studies from Phase 1 pilots showing measurable outcomes (time saved per encounter, prescription error reduction, compliance improvements).

**Phase 3 — Hospital Entry (Q3 2027+): 5-10 hospitals**

- **Channel:** Enterprise sales + channel partnerships with hospital IT consultants.
- **Pricing:** Enterprise tier with custom SLAs.
- **Success metric:** First hospital contract signed, ARR crosses R$3M.
- **Requirements:** SOC 2 Type II (or equivalent), pentest report, SBIS certification (intermediate level), completed ANVISA notification.

### 2.4 Pricing Philosophy

We price below the approval threshold. Bessemer's research confirms that hospital procurement committees have specific budget thresholds — anything above a certain dollar amount requires VP or board approval, adding 3-6 months to the sales cycle. Our Professional tier at R$599/provider/month for a 10-provider clinic totals R$71,880/year — deliberately positioned below the R$100,000 threshold that typically triggers formal procurement processes in Brazilian clinics.

---

## 3. Regulatory Strategy

### 3.1 ANVISA RDC 657/2022 — Class I SaMD Notification

**Classification rationale:** HoliLabs' CDS engine uses deterministic JSON-Logic rules with a traffic-light alert system (RED/YELLOW/GREEN). No machine learning models influence clinical decisions. Per ANVISA RDC 657/2022, deterministic CDS that provides information to support (not replace) clinical judgment qualifies as Class I (low risk).

**Notification pathway (not registration):** Class I SaMD requires notification to ANVISA, not approval. The notification form is submitted through ANVISA's electronic portal. ANVISA does not need to approve the submission, but may inspect post-notification.

**Prerequisites (critical path):**

| Requirement | Status | Timeline |
|------------|--------|----------|
| Active CNPJ | Required | Complete or in process |
| AFE (Autorização de Funcionamento de Empresa) | Required — ANVISA company license | 30-60 days from submission |
| Local health authority inspection (VISA) | Required for AFE | Scheduled with municipal VISA |
| IEC 62304 lifecycle documentation | Complete (Agent 1 delivered 7 documents) | Done |
| ISO 14971 risk management file | Complete (10 hazards analyzed, all mitigated) | Done |
| Technical dossier per IMDRF standards | In preparation | 2-3 weeks |
| TFVS fee payment | Required | Same day as submission |

**Estimated timeline to notification:** 45-75 days from today, bottlenecked by AFE processing.

### 3.2 LGPD Compliance

All technical controls are implemented in the codebase:

- AES-256-GCM field-level encryption with key versioning for all PHI fields
- Consent management with granular opt-in/opt-out
- Data subject rights: export, erasure, portability, consent revocation
- Tamper-evident audit logging with access reasons
- Data Protection Impact Assessment (RIPD) — Agent 4 deliverable
- Processing records (Art. 37) — Agent 4 deliverable
- DPO designation template — Agent 4 deliverable

### 3.3 IEC 62304 / ISO 14971 Compliance

Sprint 6, Agent 1 delivered the complete IEC 62304 Class A documentation package:

1. Software Development Plan (204 lines)
2. Software Requirements Specification (41 traced requirements)
3. Software Architecture Documentation (5 Mermaid diagrams, SOUP inventory)
4. Risk Management File (ISO 14971 — 10 hazards, severity/probability matrix)
5. Verification & Validation Plan (Jest/Playwright/AxeBuilder/k6 strategy)
6. Traceability Matrix (41 requirements, 0 orphans)
7. ANVISA Notification Checklist

### 3.4 Future Certifications

| Certification | Purpose | Timeline | Cost |
|--------------|---------|----------|------|
| **SBIS-CFM Basic** | Brazilian health informatics standard | Post-pilot (Q4 2026) | R$15,000-R$30,000 |
| **SOC 2 Type I** | Security assurance for hospital procurement | Pre-hospital entry (Q2 2027) | USD 30,000-50,000 |
| **SOC 2 Type II** | 6-month observation period | Q4 2027 | USD 50,000-100,000 |
| **HITRUST CSF** | US market entry (if applicable) | Series A funding event | USD 60,000-200,000 |

---

## 4. Technology Moat

### 4.1 Architecture

Next.js 14 monorepo with Prisma, PostgreSQL, Redis. 100+ API routes, 100+ pages, 120+ test files, 24 CI/CD workflows. Enterprise-grade from day one — not a prototype scaled up.

### 4.2 Clinical Decision Support — Deterministic by Design

Our CDS engine uses JSON-Logic rules evaluated in a traffic-light framework:
- **RED (block):** Contraindicated actions (e.g., drug-drug interactions, allergy alerts)
- **YELLOW (warn):** Caution required (e.g., dose adjustments for renal function)
- **GREEN (proceed):** Safe to continue

Every CDS response is wrapped in a safety envelope containing: processing method (deterministic), confidence score, ANVISA disclaimer, and provenance chain. This architecture is not a compliance afterthought — it's the foundation that qualifies us for ANVISA Class I.

### 4.3 AI Scribe — Augmentation, Not Automation

Deepgram transcription feeds into structured SOAP note generation. The AI suggests; the physician approves and signs. No AI output reaches the patient record without explicit physician attestation. This "human-in-the-loop" design is both clinically responsible and regulatorily safe.

### 4.4 Security Posture (OWASP ASVS Level 2 Verified)

Sprint 6, Agent 2 completed a systematic OWASP ASVS 4.0.3 Level 2 audit across 10 chapters (V2-V14):

- Authentication: bcrypt, MFA via Twilio, backup codes, lockout after 5 failures
- Session management: 30-min JWT, 15-min idle timeout, 8-hr absolute, 3 concurrent max
- Access control: Casbin RBAC (default-deny), 8 roles, IDOR protection
- Data protection: AES-256-GCM, PBKDF2 100K iterations, key rotation
- Security headers: CSP nonce-based, HSTS 1yr+preload, DENY framing
- API security: Rate limiting, body size limits (1MB), content-type validation

All P0/P1 gaps remediated. Two P2 items remain in backlog (breached password check, dependency audit in CI).

### 4.5 Infrastructure Readiness

Sprint 6, Agent 3 delivered:
- Kubernetes-compatible health endpoints (/api/health/live, /ready, /startup)
- Dockerfile with multi-stage build and OCI labels
- PHI-scrubbing Sentry configuration
- Structured JSON metrics (API latency, auth events, clinical events, PHI access)
- Backup/DR plan (RPO: 1 hour, RTO: 4 hours)

---

## 5. Financial Projections

### 5.1 Capital Requirements

| Phase | Capital Needed | Source | Use |
|-------|---------------|--------|-----|
| **Pre-pilot** (now - Q2 2026) | R$50,000-R$100,000 | Bootstrapped / angel | AFE fees, hosting, pentest, first hires |
| **Pilot** (Q2-Q4 2026) | R$200,000-R$500,000 | Pre-seed / angel round | 2-3 engineers, 1 sales, infrastructure |
| **Commercialization** (2027) | R$2-5 million | Seed round | Sales team, support, SOC 2, SBIS cert |

### 5.2 Path to Break-Even

At the Professional tier (R$599/provider/month), a single 10-provider clinic generates R$71,880/year. With our estimated CAC of R$5,000 per clinic and marginal hosting costs of ~R$500/month per clinic, each clinic reaches payback in under one month.

**However, this model has a critical gap: support costs.** Healthcare SaaS support burden is substantially higher than general SaaS. A 10-provider clinic will generate 10-20 support tickets in the first month (login issues, workflow questions, data questions, integration problems). Without dedicated support staff, the founder absorbs this — which means less time for sales, engineering, and regulatory work.

**Revised unit economics including support:**

| Cost Line | Per Clinic/Year |
|-----------|----------------|
| Hosting (compute, DB, AI inference) | R$6,000 |
| Customer support (amortized, 0.1 FTE at R$80K/yr) | R$8,000 |
| AI inference costs (25 encounters/day × R$0.03 × 250 days) | R$4,688 |
| **Total marginal cost** | **R$18,688** |
| **Gross profit per clinic** | **R$53,192** (74% margin) |

**Break-even at 30-40 clinics** (covering a lean team of 5-7 people at Brazilian salary levels). This is achievable within 12 months of commercial launch — but only if customer support is systematically managed from clinic #5 onward. A customer success hire before the 10th clinic is non-negotiable.

### 5.3 Key Assumptions and Risks

| Assumption | Risk if Wrong | Mitigation |
|-----------|---------------|------------|
| Clinics will pay R$599/provider/month | Price sensitivity in Brazilian market | Essentials tier at R$299 as fallback |
| 70% pilot-to-paid conversion | Lower-than-expected stickiness | Intensive onboarding, weekly check-ins, rapid feature response |
| AFE obtained within 60 days | Bureaucratic delays | Start paperwork immediately, engage regulatory consultant |
| 5% annual churn | Higher churn in early cohorts | Lock-in through data gravity + workflow integration |
| AI costs remain manageable | Gemini/GPT pricing increases | Multi-provider strategy + local Ollama fallback |

---

## 6. Team and Hiring Plan

### 6.1 Current

- **Nico (Founder/CEO):** Product, engineering, strategy. São Paulo based.

### 6.2 First Hires (Pre-pilot)

| Role | Priority | Why |
|------|----------|-----|
| **Senior Full-Stack Engineer** | P0 | Own the clinical workflow features. Must understand healthcare data. |
| **Regulatory Affairs Consultant** (part-time) | P0 | Navigate AFE, ANVISA notification, SBIS. Domain expertise we lack. |
| **Clinical Advisor** (part-time) | P1 | Practicing physician who validates CDS rules and pilot workflows. |

### 6.3 Post-Pilot Hires

| Role | Priority | Timing |
|------|----------|--------|
| **Customer Success Manager** | P0 | Before 10th clinic onboard |
| **Sales Representative** | P1 | Q4 2026 |
| **QA/Security Engineer** | P1 | Pre-hospital entry |
| **DPO (Data Protection Officer)** | Required | Before commercial launch (LGPD Art. 41) |

---

## 7. 18-Month Milestone Roadmap

| Quarter | Milestone | Success Metric |
|---------|-----------|----------------|
| **Q2 2026** | AFE submitted, 3 pilot clinics onboarded, LGPD docs complete | Clinics actively using the platform |
| **Q3 2026** | ANVISA notification submitted, 7-10 pilots active, first clinical outcomes data | 5+ clinicians using daily |
| **Q4 2026** | First paid conversions, SBIS basic certification started | R$50K+ MRR |
| **Q1 2027** | 30-50 paying clinics, pentest complete, SOC 2 Type I initiated | R$150K+ MRR, <5% monthly churn |
| **Q2 2027** | 80-100 clinics, first hospital pilot signed | R$300K+ MRR, seed round closed |
| **Q3 2027** | Hospital pilot live, Colombia expansion exploration | ARR >R$3M trajectory |

---

## 8. Strategic Risks and Mitigations

### 8.1 Execution Risks

**Risk 1: Single founder — existential, not just operational.** A solo technical founder simultaneously doing engineering, regulatory navigation (ANVISA/LGPD), clinical validation, enterprise sales, and customer support is a failure mode, not a strategy. Documentation doesn't replace a person. If Nico burns out, gets sick, or can't context-switch fast enough between regulatory meetings and bug fixes, the company stops.
**Mitigation:** Finding a co-founder or senior hire with complementary skills (regulatory/clinical or sales/operations) is the #1 strategic priority — more urgent than AFE paperwork. Target profile: someone with Brazilian healthcare industry experience (hospital administrator, former MV/Tasy employee, or physician with business background). Offer meaningful equity (15-25%) to attract the right person. Until then, no more than 10 pilot clinics — the support burden of more than that will break a solo founder.

**Risk 1b: Professional liability.** If the CDS engine misses a drug interaction and a patient is harmed, what is HoliLabs' legal exposure? The safety envelope and physician attestation provide some protection (the physician makes the final decision), but product liability in healthcare is real. No insurance is currently in place.
**Mitigation:** Obtain professional liability / errors & omissions insurance before pilot launch. Estimated cost: R$10,000-R$30,000/year for a pre-revenue healthtech startup. Non-negotiable.

**Risk 2: Regulatory delays.** AFE or ANVISA could take longer than projected.
**Mitigation:** Pilot clinics can operate under a research/evaluation agreement before formal ANVISA notification. The software is not making clinical decisions — it's supporting them. Legal counsel to confirm this framing.

**Risk 3: First-impression failure.** A bug in front of a physician destroys trust permanently.
**Mitigation:** 3,014 passing tests, OWASP ASVS L2 verified, 80%+ code coverage, pre-commit security hooks, tamper-evident audit logging. Plus 90-day pilot period specifically designed to catch issues before billing begins.

### 8.2 Market Risks

**Risk 4: Incumbent response.** MV or Tasy could build a competing CDS module.
**Mitigation:** Speed advantage — we're cloud-native, they're legacy. Their upgrade cycles are measured in years, ours in weeks. By the time they respond, we'll have 50+ clinics and clinical outcomes data they can't replicate.

**Risk 5: RNDS mandate enforcement could be delayed.**
**Mitigation:** Our value proposition extends beyond compliance — AI scribe, clinical decision support, and billing automation provide standalone ROI even without regulatory pressure.

---

## 9. Why Now

Three forces are converging simultaneously:

1. **Regulatory push:** RNDS interoperability mandate, SNCR e-prescribing, ANVISA RDC 657/2022 creating a clear SaMD pathway.

2. **Technology readiness:** Generative AI makes the medical scribe viable at R$0.01-0.05 per encounter (Gemini Flash). Field-level encryption and modern RBAC make LGPD compliance achievable for a small team.

3. **Market gap:** Brazil has USD 12.4 billion in digital health spending but no dominant cloud-native EHR+CDS platform for the mid-market. The enterprise incumbents are slow and expensive. The startup competitors are shallow (scheduling only, prescriptions only).

HoliLabs is positioned at the intersection of all three. The question is not whether this market will be served — it's whether we move fast enough to be the ones serving it.

---

*This document is a living strategy. Updated quarterly based on market data, pilot outcomes, and regulatory developments.*

---

**References:**

- Grand View Research. "Brazil Digital Health Market Size & Outlook, 2024-2030."
- IMARC Group. "Brazil Digital Health Market Size Outlook Forecast 2026-2034."
- Knowledge Sourcing. "Brazil Electronic Health Records Market Report: Forecast 2030."
- Bessemer Venture Partners. "Benchmarks for Growing Health Tech Businesses" (2025).
- Bessemer Venture Partners. "State of Health AI 2026" Report.
- ANVISA. "RDC No. 657 of 24 March 2022" — SaMD Regulation.
- Freyr Solutions. "SaMD Regulation in Brazil Key Requirements."
- GalenGrowth. "HealthTech 250: Top Digital Health Startups 2026."
