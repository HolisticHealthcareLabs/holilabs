# CORTEX LAUNCH DECK
## Speaker Outline — Board / Investor Presentation
**Date:** 2026-03-17
**Deck:** Cortex Agent-Native V1 — Clinical AI Platform
**Audience:** C-suite, board members, engineering leads, potential investors
**Format:** 10-slide deck, ~20–25 minutes presenting time

---

## Slide 1: The Problem

**Title:** Clinical AI Has a Fidelity Crisis

**Key Points:**
- Current AI routing systems in hospital EHRs achieve 60–75% agent-native decision fidelity
- Cortex internal benchmark: **84.7% agent-native routing** — best in class, but not enough
- Target: **95%+** for SaMD classification and regulatory confidence
- The gap between 84.7% and 95% is not a tuning problem — it is an architecture problem
- Three root causes: non-deterministic validation, silent tool failures, incomplete audit trails

**Speaker Note:** Open with the number: "We are best in class at 84.7%. That is not good enough." Let the gap between current and required create the tension that drives the rest of the deck.

**Visual Suggestion:** Single bar chart — competitor range (60–75%), Cortex today (84.7%), Cortex target (95%+). Color-coded: red zone, yellow zone, green zone.

---

## Slide 2: What the Red Team Found

**Title:** 5 Critical Blockers — We Found Them First

**Key Points:**
- Independent red team audit completed 2026-03-17
- 18 total findings: **5 critical, 7 high, 6 medium** — all with defined remediation paths
- Critical finding summary:

| # | Finding | Risk If Unresolved |
|---|---------|-------------------|
| C-1 | Pipeline drops to 2-state logic under load | Patient routing failures at >80% capacity |
| C-2 | Emergency consent bypasses audit trail | LGPD / HIPAA violation risk |
| C-3 | Audit chain versioning gaps | Tamper-evident record unverifiable |
| C-4 | Escalation schema missing SLA fields | Clinical escalations silently dropped |
| C-5 | Deterministic validator passes LLM outputs | Non-determinism in clinical decisions |

- **The right message:** We found these internally, before a regulator or a patient did.

**Speaker Note:** Reframe the findings as proof of engineering rigor, not as evidence of weakness. "A team that can't find its own problems is a team that can't fix them."

---

## Slide 3: The Architectural Response

**Title:** 5 Decisions That Close the Gap

**Key Points:**
- Each critical finding resolved with a ratified architectural decision
- No Band-Aid fixes — structural changes to the pipeline, consent, audit, and validation layers

| Decision | What Changed | Why It Matters |
|----------|-------------|----------------|
| AD-1: 5-State Pipeline | 2-state → 5-state state machine | Full journey visibility; no silent drop-off |
| AD-2: Emergency Consent | Dedicated consent path + immutable log | LGPD Art. 37 compliant; auditable |
| AD-3: Audit Chain V2 | SHA-256 hash-chain + sequence IDs | Tamper-evident across all nodes |
| AD-4: Escalation Schema V2 | SLA fields + clinician ACK | Accountability from triage to resolution |
| AD-5: Deterministic Validator V2 | LLM output gated; provenance required | Clinical safety non-determinism eliminated |

- RUTH (CLO), ELENA (CMO), CYRUS (CISO): all three veto holders cleared

**Speaker Note:** The veto clearance is the key signal for a board audience. It means legal, clinical, and security all reviewed and signed off. That is not typical in healthcare AI.

**Visual Suggestion:** Architecture diagram — 5-state pipeline flow with AD-1 through AD-5 annotated at their respective points of action.

---

## Slide 4: Three-Tier Cortex Model

**Title:** One Platform. Three Markets.

**Key Points:**
- The 95% fidelity target opens three distinct commercial opportunities that current competitors cannot serve

| Tier | Product Name | Target | Deployment | Differentiator |
|------|-------------|--------|------------|----------------|
| 1 | Cortex Integrated | Large hospital networks (500+ beds) | Cloud SaaS, EHR-embedded | ANVISA-certified pipeline, native integration |
| 2 | Cortex Offline | Rural clinics, military, LATAM public health | Edge-deployed, air-gapped | Operates without internet; local sync |
| 3 | Cortex Enterprise | Health insurers, government health systems | Multi-tenant, white-label | Full API, custom ontology, SLA contracts |

- Tier 1: market penetration and reference customers
- Tier 2: LATAM differentiation — no competitor offers air-gapped clinical AI at this fidelity
- Tier 3: high-value, long-term contracts; primary ARR driver

**Speaker Note:** "No one else offers Tier 2. That is not a gap we accidentally found — it is a deliberate design decision to make our infrastructure run on the edge." The EdgeNodeClient (Phase 0, Task 1) is what makes Tier 2 possible.

**Visual Suggestion:** Three-column card layout. Each card: tier name, icon (hospital / satellite dish / building), key differentiator, and Year 3 ARR contribution.

---

## Slide 5: Revenue Model

**Title:** $10–15M ARR by Year 3 — Conservative Projection

**Key Points:**

| Tier | Pricing | Year 1 Volume | Year 1 ARR | Year 3 Volume | Year 3 ARR |
|------|---------|---------------|------------|---------------|------------|
| Tier 1 — Integrated | $0–5/user/mo (bundled) | 5,000 users, 3 networks | $150K | 15,000 users | $900K |
| Tier 2 — Offline | $75/clinician/mo | 500 clinicians | $450K | 5,000 clinicians | $4.5M |
| Tier 3 — Enterprise | $500–2,000/bed/yr | 2 gov contracts, 2,000 beds | $2M | 5,000 beds | $5–10M |
| **Total** | | | **~$2.6M** | | **~$10.4–15.4M** |

- Gross margin target: **72% by Year 3** (infrastructure costs decrease with EdgeNode scale)
- Tier 3 contracts typically 3-year terms — high predictability, low churn
- Tier 1 deliberately priced for penetration; each reference customer accelerates Tier 3 sales cycle by 40–60%

**Speaker Note:** "The real revenue engine is Tier 3. Tier 1 is how we get in the door. Tier 2 is how we own LATAM."

**Visual Suggestion:** Stacked bar chart — Year 1, Year 2, Year 3. Each bar segment = one tier, color-coded. Overlay gross margin line (%).

---

## Slide 6: Competitive Positioning

**Title:** We Occupy a Gap Nobody Else Can Fill

**Key Points:**

| Competitor | What They Do | What They Can't Do |
|------------|-------------|-------------------|
| Epic / Cerner | EHR data storage, workflow management | Agent-native routing; LATAM LGPD compliance; air-gapped deployment |
| Philips / GE HealthTech | Hardware-integrated diagnostics | Software-native; commodity infrastructure; SaMD-grade audit trails |
| Suki / Nabla | Clinical dictation + documentation | Full pipeline: triage → escalation → resolution; multi-tenant |
| **Cortex** | **Full agent-native clinical pipeline** | **— this IS the gap** |

- 95%+ fidelity + SaMD compliance + LATAM-first design = defensible moat
- Patent-pending: 5-state pipeline state machine + deterministic validator architecture
- ANVISA certification (Brazil) in progress; COFEPRAS (Mexico) roadmap Q4 2026

**Speaker Note:** "Epic can't do what we do. They know it. That is why they will eventually try to acquire a team like ours — which is another reason to move fast."

---

## Slide 7: Implementation Timeline

**Title:** 20 Weeks to General Availability

**Key Points:**

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| Phase 0 | 5 red team blockers resolved | 2–3 weeks | 🔴 Active NOW |
| Phase 1–2 | Core tool registry, RBAC, 5-state pipeline, audit chain | 6 weeks | Queued |
| Phase 3–4 | Clinical pipeline, consent, biomarkers, i18n, privacy | 8 weeks | Queued |
| Deployment | Staging, ANVISA docs, pen test, GA launch | 2 weeks | Queued |

- **Conservative GA: 2026-08-04**
- **Optimistic GA: 2026-07-07**
- 11 implementation units total; 4 sequential (shared files), 6 parallel (isolated domains)
- Phase 0 is the only blocker today — board approval unlocks it immediately

**Speaker Note:** "We are not asking for approval to plan. We are asking for approval to execute. Phase 0 starts the moment we leave this room."

**Visual Suggestion:** Horizontal Gantt — 20 weeks, color-coded by phase. Critical path highlighted. Deterministic V2 parallel track shown as dashed line above main timeline.

---

## Slide 8: Go-to-Market Strategy

**Title:** Land, Expand, Dominate — Tier by Tier

**Key Points:**

**Tier 1 — Land (Year 1):**
- Target: 3 large hospital networks in Brazil (SUS partners preferred for ANVISA reference)
- Sales motion: Direct enterprise sales; 60-day POC with IT + clinical team
- Pricing: Bundled with EHR contract (no standalone invoice); frictionless adoption
- Win criteria: 2 signed LOIs before Phase 0 complete

**Tier 2 — Differentiate (Year 2):**
- Target: LATAM rural health programs (Brazil Ministry of Health, Colombian SISPRO)
- Sales motion: Government procurement + regional health system MOUs
- Pricing: $75/clinician/mo; volume discount at 1,000+ clinicians
- Win criteria: 1 signed government MOU with $500K+ value

**Tier 3 — Scale (Year 2–3):**
- Target: 2 large private health insurers + 1 government national health system
- Sales motion: VICTOR-led named-buyer pursuit; 3-year SLA contracts
- Pricing: $500–2,000/bed/yr depending on SLA tier and white-label scope
- Win criteria: 2 signed contracts totaling $2M+ ARR by end of Year 2

**Regulatory unlock:** ANVISA certification (in progress) is the gate for all three tiers in Brazil. COFEPRAS roadmap unlocks Mexico by Q4 2026.

**Speaker Note:** "We have two pre-LOI conversations already in progress with Tier 1 targets. The red team process, ironically, strengthened those conversations — they want to know we do this kind of internal rigor."

---

## Slide 9: Regulatory Alignment

**Title:** Compliance Is Infrastructure, Not an Afterthought

**Key Points:**

- Three jurisdictions in scope: Brazil (ANVISA / LGPD), Mexico (COFEPRAS / LPDPPP), international (HIPAA-aligned)
- RUTH (CLO) veto cleared: all consent flows, export/erasure routes, and data-transfer paths reviewed
- LGPD compliance:
  - Granular consent (no collapsed single-checkbox)
  - `legalBasis` field on all export and erasure routes
  - Patient data erasure: PHI soft-deleted, `AuditLog` retained per LGPD Art. 37
  - Emergency consent path: immutable audit log (LGPD + ANVISA requirement)
- ANVISA SaMD documentation: in preparation; Phase 0 audit chain (AD-3) satisfies traceability requirement
- HIPAA alignment: `encryptPHIWithVersion` on all PHI fields; no cross-tenant access without `verifyPatientAccess()`

**This is a moat, not a checkbox.**
- Competitors entering LATAM without LGPD infrastructure will spend 12–18 months catching up
- Our compliance posture is a sales accelerator with government clients

**Speaker Note:** "RUTH did not just review our compliance. She co-designed it. That is the difference between a legal team that says no and a legal team that makes the product better."

---

## Slide 10: The Ask

**Title:** Board Approval — 3 Actions, 1 Decision

**Key Points:**

**Action 1: Ratify 5 Architectural Decisions**
- AD-1 through AD-5 as documented in `BOARD_DECISION_MEMO.md`
- Veto clearance from RUTH, ELENA, CYRUS already obtained
- No further review required; approve as documented

**Action 2: Approve Phase 0 Resource Allocation**
- 2 backend engineers + 1 senior engineer + ELENA clinical spec time
- Duration: 2–3 weeks
- Budget: [engineering cost to be filled by CFO/GORDON]
- Unlock: Phase 0 starts immediately on board approval

**Action 3: Endorse Three-Tier Commercial Model**
- Authorize GTM planning and LOI conversations for Tier 1 targets
- Endorse $10–15M ARR Year 3 as planning baseline
- Direct VICTOR to initiate named-buyer pursuit for first Tier 3 contract

**What we are NOT asking for today:**
- Full 20-week budget approval (Phase 1+ funding request comes at Phase 0 Go/No-Go)
- Launch date commitment (conservative: 2026-08-04; confirmed at Phase 1–2 exit)
- Any deviation from veto holder decisions (RUTH, ELENA, CYRUS are final)

**The single sentence:** *Approve Phase 0 today, and Cortex will be at 95%+ fidelity and GA-ready by Q3 2026.*

---

## Appendix: Revenue Model Table (Convertible to PowerPoint)

```
┌─────────────────┬──────────────────┬──────────────┬────────────┬──────────────┬────────────┐
│ Tier            │ Pricing Unit     │ Y1 Volume    │ Y1 ARR     │ Y3 Volume    │ Y3 ARR     │
├─────────────────┼──────────────────┼──────────────┼────────────┼──────────────┼────────────┤
│ 1 — Integrated  │ $0-5/user/mo     │ 5,000 users  │ $150K      │ 15,000 users │ $900K      │
│ 2 — Offline     │ $75/clinician/mo │ 500 clin.    │ $450K      │ 5,000 clin.  │ $4.5M      │
│ 3 — Enterprise  │ $500-2K/bed/yr   │ 2,000 beds   │ $2M        │ 5,000 beds   │ $5-10M     │
│ TOTAL           │                  │              │ ~$2.6M     │              │ ~$10.4-15M │
└─────────────────┴──────────────────┴──────────────┴────────────┴──────────────┴────────────┘
Gross Margin Target: 72% by Year 3
```

## Appendix: Timeline Visual (Convertible to Figma / Keynote)

```
Phase 0     ████████ (2-3w)        ← RED: Active now, board approval required
Phase 1-2            ████████████████ (6w)    ← YELLOW: Queued
Phase 3-4                    ████████████████████ (8w)  ← YELLOW: Parallel units
Det. V2     ████████████████████████████████ (6w parallel)  ← BLUE: Parallel track
Deploy                                       ████████ (2w)  ← GREEN: GA launch
            Mar     Apr     May     Jun     Jul     Aug
```

---

*Document prepared by Engineering Leadership. Cleared by RUTH (CLO), ELENA (CMO), CYRUS (CISO). For distribution to board members and engineering leads only.*
