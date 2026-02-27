# HOLI LABS — ADVISOR STRATEGY BRIEF

**Cortex: Clinical Safety Infrastructure for Latin America**
*Confidential — Internal Partners & Advisors | February 2026*

---

## PAGE 1: THE OPPORTUNITY

### The Problem — $12B in Preventable Clinical Waste Across LATAM

Every year, LATAM hospitals lose **$12B+ to adverse drug events, preventable readmissions, and billing denials** (glosas). The root cause is not a lack of clinical knowledge — it is a lack of **workflow reliability** in fragmented EHR environments.

**Today's reality for a LATAM clinician:**
- 7 minutes per patient. Lab results that are 3 days stale. No drug-interaction alerts.
- Paper-based or siloed EHRs with zero clinical decision support.
- No auditable trail when things go wrong. Governance is retrospective, not real-time.
- WhatsApp is the coordination layer — but it's unstructured and non-compliant.

**For hospital leadership and insurers:**
- **Sinistralidade (loss ratio) at 82-84%** — SulAmérica reported 83.6% in 2024. Every percentage point costs millions.
- Readmission penalties are rising. Follow-up completion rates are below 60%.
- Regulatory pressure is accelerating: Brazil's LGPD (data privacy), ANVISA RDC 657 (software as medical device), and CFM 2.314 (telemedicine limits).

**Existing solutions are broken.** Global players (Epic, Optum) are designed for US workflows and cost $500-1,000/user. Regional incumbents (MV Sistemas, Feegow, Robô Laura) offer either basic EHR tools or narrow AI models — none deliver safety + governance + longitudinal care as a unified system.

---

### The Solution — Cortex: Three Engines, One Clinical System

**Cortex is a Clinical Intelligence Platform that turns every clinical decision into an auditable, evidence-backed, governed event.**

| Engine | What It Does | Buyer Value |
|--------|-------------|-------------|
| **Safety Engine** | Real-time traffic-light alerts for drug interactions, renal dosing, formulary compliance, and billing risk. Deterministic rules, not LLM guesses. | Reduces adverse events and billing denials (glosas) |
| **Prevention Hub** | Longitudinal care across 7 health domains with 50+ evidence-based protocols (WHO, NHS, ESC). AI-powered risk scoring, collaborative templates, automated reminders. | Reduces readmissions and improves screening completion |
| **Governance Console** | Live audit stream with trust scores, override intelligence, protocol drift monitoring. Tamper-evident hash-chain audit trails. | Real-time compliance for LGPD, HIPAA, and ANVISA |

**The key architectural insight:** AI pre-fills context and documentation. **Deterministic logic** handles all safety-critical decisions. The clinician makes the final call. This is how you build trust with regulators and avoid SaMD classification risk.

---

### Why Now — Three Converging Forces

1. **Regulatory tailwind.** Brazil's LGPD enforcement is accelerating (ANPD Resolution 19/2024). ANVISA's RDC 657 creates SaMD classification requirements. Hospitals need compliant infrastructure — not spreadsheets.
2. **WhatsApp saturation.** 96% of LATAM smartphones have WhatsApp. It is already the coordination layer for patient follow-up. But it's unstructured and non-compliant. Cortex turns WhatsApp into a governed clinical channel.
3. **AI cost collapse.** DeepSeek at $0.028/1M tokens makes AI-assisted documentation affordable for SMB clinics. Three years ago, this cost 100x more.

---

### Traction & Current Status

| Metric | Value |
|--------|-------|
| **Product readiness** | 95% production-ready. Platform live. |
| **Test coverage** | 1,587 tests passing |
| **Clinical protocols** | 50+ evidence-based protocols (WHO, NHS, ESC, RACGP) |
| **Language support** | English, Spanish, Portuguese |
| **Pilot pipeline** | Bolivia (Wave 1), Brazil (Wave 2), Argentina (Wave 3) |
| **Primary wedge** | Inpatient cardiology — DOAC safety + discharge follow-up |
| **First 100 Program** | Active — 1-year free Professional tier for early adopters |

---

## PAGE 2: THE MACHINE

### Market — $18B TAM with Clear Bottoms-Up Path

| Segment | Size | Our Slice | Pricing |
|---------|------|-----------|---------|
| **TAM** — LATAM Health IT | $18B by 2028 (Mordor Intelligence) | — | — |
| **SAM** — CDS + Governance + Prevention for private clinics and hospitals in Brazil, Mexico, Colombia, Argentina, Bolivia | $3.2B | — | — |
| **SOM** — Private clinics and hospitals in pilot countries (Year 1-3) | $480M | 3,000 practitioners by 2027 | $25-500/practitioner/month |

**Bottoms-up logic:** Brazil alone has 350,000+ physician practices. Mexico has 120,000+. If we capture 1% of Brazilian private clinics within 3 years at R$2,500/month average, that is R$105M ARR (~$20M USD).

**Who pays first:** Private clinics (3-month sales cycle, $75/practitioner). **Who pays most:** Hospital systems and insurers (9-18 month sales cycle, custom contracts).

---

### Business Model — Tiered SaaS with Enterprise Upsell

| Tier | Price | Target | Gross Margin |
|------|-------|--------|-------------|
| **Starter** | $25/month | Solo practitioners | 78% |
| **Professional** | $75/practitioner/month | Small clinics (2-10 doctors) | 83% |
| **Enterprise** | Custom (from $500/user/month) | Hospitals, insurers, multi-site | 85%+ |

**Unit Economics (Professional tier — our growth engine):**

| Metric | Base Case | Bear Case |
|--------|-----------|-----------|
| LTV | $2,700 (36 mo avg lifespan) | $1,800 (24 mo) |
| Blended CAC | $300 | $450 |
| **LTV:CAC** | **9:1** | **4:1** |
| Gross margin | 83.8% | 75% |
| CAC payback | 5.3 months | 8 months |
| Monthly burn | R$66,000 ($12,692) | R$66,000 |
| **Break-even** | **27 clinics at R$2,500/mo** | **40 clinics** |

**Revenue Streams Beyond SaaS:** E-prescribing referral fees ($0.50-1.00/Rx from pharmacy partners), AI add-ons ($20-30/mo), compliance consulting ($200/hr), data migration services.

---

### Competitive Advantage — The Cortex MOAT

**We have four compounding moats. Each one gets stronger the longer we operate.**

| Moat Type | Mechanism | Why It Compounds |
|-----------|-----------|-----------------|
| **Regulatory Compliance Barrier** | LGPD-native architecture. Granular consent. Tamper-evident audit trails. ANVISA SaMD classification defense (Class I CDS). | Competitors must rebuild from scratch. Certification takes 12-18 months. |
| **Clinical Data Network Effects** | Every override, attestation, and protocol deviation feeds the governance model. More clinics = richer protocol intelligence = better safety rules. | Switching cost increases with each patient interaction logged. |
| **Deterministic Trust Architecture** | Safety-critical logic is 100% deterministic (JSON-Logic rules), not LLM-based. Clinicians and regulators can audit every decision. | Trust is earned over time. Competitors using LLMs for clinical logic face regulatory and liability risk. |
| **WhatsApp-Native Patient Engagement** | Governed, consent-based patient messaging via WhatsApp — the default LATAM communication layer. Not SMS. Not email. Not an app download. | 96% smartphone penetration. Zero adoption friction for patients. |

---

### Competitive Landscape

| Competitor | What They Do | Why Cortex Wins |
|------------|-------------|-----------------|
| **Robô Laura (MV Sistemas)** | Sepsis early warning. Narrow AI, single-use case. | We are a platform (safety + prevention + governance), not a point solution. |
| **Feegow** | Practice management at R$129-249/mo. No CDS, no governance. | We add clinical intelligence on top of EHR workflows. |
| **Optum** | US-centric analytics. $500+/user. No LATAM compliance. | We are LGPD-native, WhatsApp-first, priced for LATAM economics. |
| **Grupo Fleury** | Executive check-ups (R$3,180-3,800). Premium lab network. | We are the decision-support layer that makes Fleury data actionable longitudinally. |
| **Epic (LATAM)** | Enterprise EHR. $500-1,000/user. 18-month implementation. | We deploy in weeks with zero deep integration required. Manual/copy-paste first. |

---

## PAGE 3: THE TEAM, FINANCIALS & THE ASK

### The Team — Domain Expertise Built for This Problem

Holi Labs is led by a founding team with direct experience at the intersection of **clinical medicine, health technology, and LATAM market operations.**

**Why this team, for this problem, at this time:**
- Deep clinical advisory network across Bolivia, Brazil, and Argentina — active clinical champions in each pilot country.
- Technical architecture designed by engineers who have built HIPAA/LGPD-compliant systems.
- Go-to-market strategy informed by $100M+ in closed enterprise healthcare deals across LATAM.
- Bilingual team (Spanish/Portuguese/English) with on-the-ground operational presence.

---

### Financial Projections — 18-Month Outlook

| | H1 2026 | H2 2026 | H1 2027 | H2 2027 |
|---|---------|---------|---------|---------|
| **Paying practitioners** | 50 | 200 | 600 | 1,500 |
| **MRR** | $5,000 | $19,875 | $55,000 | $107,500 |
| **ARR (run-rate)** | $60K | $238K | $660K | $1.29M |
| **Monthly burn** | $12,700 | $12,700 | $18,000 | $25,000 |
| **Runway remaining** | 18 mo | 14 mo | 12+ mo | Self-sustaining |

**Bear Case (churn 2x, sales cycle 2x):**

| | H2 2026 | H2 2027 |
|---|---------|---------|
| Paying practitioners | 100 | 750 |
| ARR (run-rate) | $120K | $650K |
| Break-even timeline | +6 months (Q1 2028) | — |

**Key Assumptions:**
- Professional tier ($75/mo) represents 40% of revenue mix by H2 2026
- Enterprise pilots begin converting in H1 2027 (9-month sales cycle from Q2 2026 pipeline)
- Monthly burn increases to $25K by H2 2027 as team scales from 4 to 8
- Tax haircut: Simples Nacional 14-16% at R$1M+ ARR. All projections are net of tax + MDR (3.5%)

---

### The Dual-Track Strategy — Revenue Bridge + The Bet

| | Track A: Cortex Clinic (SMB SaaS) | Track B: Cortex Enterprise (The Bet) |
|---|---|---|
| **Customer** | Private clinics (2-10 doctors) | Hospital systems, insurers |
| **Revenue model** | Per-practitioner SaaS ($25-75/mo) | Annual pilot + implementation + governance seats |
| **Sales cycle** | 3 months | 9-18 months |
| **Role** | Revenue bridge — cash flow now | The long-term play — $500K+ ACV |
| **Status** | Product live, pilots launching | Enterprise portal built, pipeline forming |

Track A funds operations while Track B builds enterprise credibility. This is the Y-Split: survive on SaaS, win on enterprise.

---

### The Ask — What We Need From Advisors

**We are not raising capital today.** We are building an advisory board to accelerate three outcomes:

| Need | How Advisors Help |
|------|------------------|
| **Clinical credibility** | Introductions to department heads and quality officers at pilot hospital targets in Brazil and Bolivia |
| **Enterprise pipeline** | Warm introductions to insurer CFOs and hospital network COOs who feel the sinistralidade pain |
| **Regulatory navigation** | Advisory on ANVISA SaMD fast-track, ANPD audit preparation, and cross-border data transfer (SCCs) |
| **Strategic partnerships** | Connections to lab networks (Fleury, DASA), pharmacy chains, and Unimed cooperatives |

**What advisors receive:** Quarterly strategic briefings, product roadmap input, and equity-based advisory agreements (standard 0.25-1% over 2-year vesting, details to be discussed individually).

---

### The Vision — Where We Are in 5 Years

By 2031, Cortex is the **clinical safety infrastructure layer** for LATAM healthcare. Every prescription checked. Every protocol governed. Every follow-up completed. We are the trust layer between clinicians, patients, and payers — processing millions of clinical decisions annually with full auditability.

**The 10x sentence:** If LATAM insurers reduce sinistralidade by just 2 percentage points through governed clinical workflows, that represents **$2.4B in annual savings** — and Cortex captures 1-3% of the value it creates.

---

*Cortex by Holi Labs — Safeguard Every Decision.*
*Contact: [founders@holilabs.com] | cortexbyholi.com*
*This document is confidential and intended for internal partners and advisors only.*
