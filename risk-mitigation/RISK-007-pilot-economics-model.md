# RISK-007: Pilot Economics & Brazilian Hospital Procurement Reality

## Executive Summary

A 90-day free pilot serving 3 hospitals consumes ~R$150,000 in compute infrastructure before any revenue is realized. Brazilian public hospital procurement cycles extend 6–12 months post-pilot completion, creating a severe cash-burn problem. This document establishes:

1. **Procurement Reality Check**: Timelines, stakeholders, and institutional friction in Brazilian hospital technology adoption.
2. **Pilot Pricing Strategy**: Nominal-fee model with outcome-linked escalation to maintain engagement and signal commitment.
3. **Conversion Acceleration Tactics**: Clinical champion identification, LOI structures, and tie-breaker mechanisms.
4. **Financial Scenario Analysis**: Best/base/worst-case outcomes over 180 days with monthly burn forecasts.
5. **Runway Trigger Thresholds**: Decision gates for board escalation if conversion stalls.
6. **Recommended Pilot Agreement Terms**: Commercial structure that de-risks procurement delay.

---

## 1. Brazilian Hospital Procurement Reality Check

### Market Overview

Brazil's healthtech market is growing robustly—medical device imports surged to **USD $9.33 billion in 2024** (18% YoY growth)—but procurement cycles remain rigid, especially in public hospital systems dominated by government budget cycles.

**Key Finding**: The new Public Procurement and Administrative Contracts Law (Law No. 14,133/2021) introduced in 2024 mandates **lifecycle cost evaluation** and **past performance scoring** in public tenders. This *lengthens* initial vendor evaluation but *accelerates* contract amendments if performance meets benchmarks.

### Typical Procurement Timeline (Public Hospitals)

| Phase | Duration | Stakeholders | Decision Trigger |
|-------|----------|--------------|-----------------|
| Planning & Budget Allocation | 2–4 months | CFO, IT Director, Clinical Leads | Annual budget cycle (Jan–Apr) |
| Technical Requirements Definition | 1–3 months | Clinical Staff, IT, Procurement | Regulatory compliance review |
| Formal Tender Announcement | 2–4 weeks | Procurement Office (Central Board) | Posted on public marketplace |
| Vendor Evaluation & Scoring | 4–8 weeks | Committee (Clinical, IT, Finance) | Lifecycle cost + past performance weighting |
| Contract Negotiation | 2–4 weeks | Legal, CFO, Vendor | Brazil-specific terms (LGPD, SaMD classification) |
| Approval & Signature | 1–2 weeks | Hospital Board, State Finance | Budget reserved, contract live |
| **Total Public Sector** | **6–12 months** | Multi-layer governance | Annual budget + tender calendar |

### Private Hospital Procurement (Faster Track)

Private hospitals (e.g., Hospital Sírio-Libanês, Hospital Israelita Albert Einstein) move faster but remain cautious:
- Budget owners (CEO, CMO) evaluate pilots directly.
- Procurement review is 6–8 weeks (not 12+).
- Revenue model clarity required before contracting.
- **Total: 3–6 months post-pilot** (vs. 6–12 months public).

### Key Institutional Friction Points

1. **Budget Cycle Rigidity**: Public hospitals operate on fixed annual budgets (Jan–Dec). A pilot completed in Month 8 must wait until the January budget cycle for procurement.
2. **Committee Voting**: Multiple stakeholders (CFO, CTO, Chief Medical Officer, Procurement Board) must align. Consensus requires consensus-building across clinical and administrative domains.
3. **LGPD Compliance Gate**: Any software handling patient data triggers a mandatory legal review by hospital counsel and state health authority (if public). This adds 4–6 weeks.
4. **SaMD Classification Uncertainty**: If Cortex Swarm is deemed a "Software as Medical Device" (diagnostic/therapeutic use), ANVISA pre-market approval becomes mandatory—adding 3–6 months.
5. **Reference Site Requirement**: Hospitals request proof of clinical efficacy at a peer institution before budgeting. No peer reference = no budget approval.

---

## 2. Pilot Pricing Model Recommendation

### Strategy: "Nominal Fee + Outcome Escalation"

**Rationale**: Free pilots signal low confidence and attract tire-kickers. Nominal fees ($5K–$15K USD per pilot) combined with outcome-linked conversion create:
- **Skin in the game**: Hospital stakeholders take the pilot seriously (budget committed).
- **Conversion Signal**: Willingness to pay post-pilot signals commercial viability to other prospects.
- **Revenue Baseline**: Offsets 10–20% of pilot compute costs immediately.

### Proposed Structure (per pilot)

| Component | Pricing | Rationale |
|-----------|---------|-----------|
| 90-Day Pilot Fee | USD $10,000 (R$50,000) | Covers compute overhead (partial); signals commitment |
| Outcome Bonus (if triggered) | USD $5,000–$20,000 | Tied to: readmission reduction ≥5%, LOS improvement ≥3% |
| Pilot-to-Contract Discount | 20% off first-year SaaS | Early conversion incentive (payoff in months 7–12) |
| Data Portability Guarantee | Included | IP ownership of simulation outputs stays with hospital |

### Financial Impact (3 Pilots)

```
Pilot Revenue (3 × USD $10K)              = USD $30,000  (R$150,000)
Compute Cost (3 × USD $50K estimate)     = USD $150,000 (R$750,000)
Net Burn (Direct)                         = USD $120,000 (R$600,000)
Outcome Bonus (assume 2/3 triggered)      = USD $25,000  (R$125,000)
Adjusted Burn After Outcome Trigger       = USD $95,000  (R$475,000)
Discount Lost (20% future revenue haircut) ≈ USD $40,000–60,000 total
```

**Reality**: Pilot pricing alone does not break even. The strategy is **to accelerate conversion**, not fund the pilot directly.

---

## 3. Conversion Acceleration Tactics

### Tactic 1: Clinical Champion Identification (Pre-Pilot)

**Objective**: Identify and align the Chief Medical Officer (CMO) or senior clinical lead before pilot kickoff.

**Steps**:
1. During pilot sales cycle, request a 1-hour "pilot design workshop" with the CMO.
2. Co-design simulation parameters with clinical input (e.g., admission volume, LOS benchmarks, readmission triggers).
3. Establish a "pilot steering committee" with CMO as chair (meets bi-weekly).
4. Share outcome targets in writing; CMO signs off (creates accountability loop).

**Outcome**: CMO becomes internal advocate post-pilot. They champion budget approval in the finance committee.

### Tactic 2: Letter of Intent (LOI) Structure

**Objective**: Secure a non-binding LOI at pilot end that commits the hospital to contract terms if clinical outcomes meet thresholds.

**LOI Template**:
```
"If Cortex Swarm achieves ≥5% readmission reduction OR ≥3% LOS improvement
over the 90-day pilot, [Hospital Name] commits to evaluate a 3-year SaaS
contract at [USD X/month] by [Date], subject to budget approval and
standard procurement review."
```

**Benefit**:
- Gives procurement office a clear triggering condition (outcome-based).
- Removes "vendor lock-in" perception (hospital can walk if outcomes miss).
- Forces clinical accountability (CMO and finance align pre-contract).

### Tactic 3: Procurement Fast-Track Rider

**Objective**: Negotiate a "pilot success protocol" that allows pilot-to-contract conversion without full re-tendering if outcomes are met.

**Mechanism** (legal language):
```
"Upon successful completion of pilot and achievement of agreed KPIs,
vendor and hospital may execute a Direct Agreement amendment without
additional tender, provided:
  - Outcomes met per LOI metrics
  - Price remains within ±10% of pilot proposal
  - Hospital board pre-approves in writing before pilot end-date"
```

**Outcome**: Converts 12-month procurement cycle to 3–4 weeks post-pilot (instead of 6–12 months).

### Tactic 4: Multi-Hospital Cohort Strategy

**Objective**: Run 3 pilots in sequence, not parallel.

**Rationale**:
- Hospital #1 (Month 1–3): Private, fast-moving, willing to take risk.
- Hospital #2 (Month 4–6): Mid-tier public, observes Hospital #1 success.
- Hospital #3 (Month 7–9): Large academic public, requires peer reference (Hospital #1 or #2).

**Outcome**: Each successive pilot reduces sales cycle time (clinical proof + peer reference).

---

## 4. Financial Scenario Analysis (180 Days)

### Scenario 1: Best Case (Accelerated Conversion)

```
Month 1–3:  Pilot #1 (Private Hospital)
  - Pilot Fee Collected:       USD $10,000
  - Compute Cost:              USD $45,000
  - Net Burn:                 -USD $35,000
  - Outcome Bonus (achieved):  USD $10,000
  - Month 3 Outcome:          -USD $25,000 cumulative

Month 4–6:  Pilot #2 (Mid-tier Public) + Pilot #1 Contract Negotiation
  - Pilot #2 Fee Collected:    USD $10,000
  - Pilot #1 Conversion:       3-year SaaS @ USD $5K/month, 20% discount
    - First month payment:     USD $4,000 (discounted)
  - Compute Cost (P2):         USD $45,000
  - Month 6 Outcome:          -USD $36,000 cumulative (pilot burns offset by P1 revenue)

Month 7–9:  Pilot #3 (Large Public) + Pilot #2 Contract Negotiation + P1 SaaS Recurring
  - Pilot #3 Fee Collected:    USD $10,000
  - P1 Recurring Revenue:      USD $4,000
  - P2 Conversion (if LOI achieved): USD $4,000
  - Compute Cost (P3):         USD $45,000
  - Month 9 Outcome:          -USD $27,000 cumulative (burn rate slowing)

Month 10–12: P1 + P2 + P3 SaaS Revenue (post-pilot) + Pilot #3 Conversion
  - Monthly Recurring:         USD $12,000 (3× USD $4K/month)
  - Pilot #3 Conversion:       USD $4,000
  - Month 12 Outcome:          **Break-even to slight positive (recurring revenue covers new pilots)**

Runway Runway at 9 months:     All pilots converted; recurring revenue base established
```

**Best Case Summary**:
- Total 90-day burn: USD $105,000 (Pilot #1 direct).
- Break-even achieved by Month 12 (3 conversions × USD $4K/month recurring).
- Runway extended: Subsequent pilots funded by prior conversions.

---

### Scenario 2: Base Case (Standard Procurement Timeline)

```
Month 1–3:  Pilot #1 (Private Hospital)
  - Pilot Fee:                 USD $10,000
  - Compute Cost:              USD $45,000
  - Outcome Bonus:             USD $5,000
  - Month 3 Outcome:          -USD $30,000 cumulative

Month 4–6:  Pilot #2 (Mid-tier Public)
  - Pilot #2 Fee:              USD $10,000
  - Pilot #1 Procurement Cycle (ongoing, no revenue yet)
  - Compute Cost (P2):         USD $45,000
  - Month 6 Outcome:          -USD $65,000 cumulative

Month 7–9:  Pilot #3 (Large Public)
  - Pilot #3 Fee:              USD $10,000
  - Compute Cost (P3):         USD $45,000
  - Pilot #1 Procurement Stalled (budget cycle wait)
  - Month 9 Outcome:          -USD $100,000 cumulative

Month 10–12: Pilot #1 Contract Closes (post-6-month procurement cycle)
  - P1 Recurring Revenue:      USD $4,000
  - P1 Setup (one-time):       USD $2,000
  - Pilots #2–#3 in procurement review
  - Month 12 Outcome:          -USD $94,000 cumulative

Runway Attrition at 9 months:  Single pilot in revenue; 2 pending procurement
```

**Base Case Summary**:
- Total 9-month burn: USD $100,000.
- Break-even timeline: Month 15–18 (if P2 + P3 close by then).
- Cash runway pressure: High (only 1 of 3 pilots monetized by Month 12).

---

### Scenario 3: Worst Case (Procurement Delay + Low Conversion)

```
Month 1–3:  Pilot #1 (Private Hospital, but clinical outcomes miss KPI targets)
  - Pilot Fee:                 USD $10,000
  - Compute Cost:              USD $45,000
  - Outcome Bonus:             USD $0 (outcomes missed)
  - Month 3 Outcome:          -USD $35,000 cumulative
  - P1 Conversion Status:      Uncertain (hospital hesitant to sign without outcomes)

Month 4–6:  Pilot #2 (Public) Starts; Pilot #1 Conversion Stalls
  - Pilot #2 Fee:              USD $10,000
  - P1 Re-negotiation (2-month delay)
  - Compute Cost (P2):         USD $45,000
  - Month 6 Outcome:          -USD $70,000 cumulative

Month 7–9:  Pilot #3 Starts; P1 Conversion Falls Through (hospital budget vote fails)
  - Pilot #3 Fee:              USD $10,000
  - Compute Cost (P3):         USD $45,000
  - P2 Procurement Committee Delayed (state budget reallocation)
  - Month 9 Outcome:          -USD $105,000 cumulative
  - Runway Status:            CRITICAL (3 pilots, zero conversions; 2–3 months of cash left)

Month 10–12: P2 Procurement Approval (finally, Month 11); P1 Formally Walks; P3 Uncertain
  - P2 Recurring Revenue:      USD $4,000
  - Month 12 Outcome:          -USD $101,000 cumulative
  - Cumulative Spend vs. Revenue: 25:1 burn ratio

Runway Status at 12 months:    CRITICAL (1 pilot monetized, 2 pending, burn rate unsustainable)
```

**Worst Case Summary**:
- Total 12-month burn: USD $105,000+.
- Break-even timeline: Not achievable within 24 months (2 pilots lost to procurement friction or outcome miss).
- **Board Escalation Trigger**: Month 9 (see below).

---

## 5. Runway Trigger Thresholds & Board Escalation

Define decision gates to convene an emergency board meeting if pilots stall.

| Trigger | Threshold | Board Action |
|---------|-----------|--------------|
| **Outcome Miss** | Pilot outcome <3% improvement on any agreed KPI | CMO + CFO review; either re-design pilot or prepare for pilot walk |
| **Procurement Delay** | Pilot conversion stalled >8 weeks post-pilot end | CFO initiates "fast-track rider" negotiation; consider pivot to private-only pipeline |
| **Zero Conversions at Month 9** | No pilot signed contract or LOI by Month 9 | Emergency board meeting: Reassess TAM, pricing, pilot design. Decision: pivot, pause, or raise capital. |
| **Monthly Burn >USD $50K** | 3-month rolling average exceeds USD $50K/month with <USD $10K/month revenue | CFO forecasts runway; prepare for Series A or strategic pivot. |
| **Cumulative Loss >50% Runway** | Cumulative burn > 50% of forecasted 18-month runway | Go/no-go decision: continue current strategy or wind-down pilot program. |

### Recommended Board Escalation Memo Template

```
SUBJECT: Pilot Conversion Status Alert — [TRIGGER NAME]

Trigger Threshold:   [e.g., "Zero conversions at Month 9"]
Date Triggered:      [Date]
Affected Pilots:     [Hospital names]
Recommended Action:  [Specific next step]

Financial Impact:
  - YTD Burn:        [USD X]
  - Projected Runway: [N months]
  - Revenue Today:   [USD Y/month]

Board Decision Required By: [Date]
```

---

## 6. Recommended Pilot Agreement Commercial Terms

### Contract Structure (Per Pilot)

**Title**: "90-Day Proof-of-Concept & Conversion Framework Agreement"

### Section 1: Pilot Scope & Fee

```
1.1 Pilot Duration:  90 calendar days from Effective Date
1.2 Pilot Fee:       USD $10,000 (R$50,000) paid within 30 days of Effective Date
1.3 Scope:           Limited simulation capacity (Agent Swarm)
                     - Max 50 agents per simulation
                     - Max 5 simulations/week
                     - Read-only output (hospital cannot export training data)
1.4 Service Level:   99.0% uptime SLA (pilot-grade, non-contractual)
1.5 Support:         Email support only; 24-hour response time
```

### Section 2: Outcome-Linked Bonus

```
2.1 Outcome Targets (Hospital-Approved, Pre-Pilot):
    - Primary KPI:   [e.g., 30-day readmission reduction ≥5%]
    - Secondary KPI: [e.g., Average LOS reduction ≥3%]

2.2 Bonus Trigger:   If ≥1 of 2 KPIs achieved (as measured by hospital data)
                     Bonus: USD $5,000–$20,000 (tiered)

2.3 Measurement:     Hospital provides pre/post data; Vendor validates
                     Bonus paid within 30 days of validation
```

### Section 3: Data & IP Rights

```
3.1 Simulation Outputs Ownership:  Hospital owns all simulation outputs and
                                    derived analytics (not training data)
3.2 Anonymization Requirement:     Vendor may not re-use pilot data
                                    (de-identified or otherwise) without
                                    written consent
3.3 Confidentiality:               Mutual 3-year NDA
```

### Section 4: Pilot-to-Contract Conversion Option

```
4.1 Conversion Trigger: If outcome KPIs met AND hospital expresses interest
                        in full SaaS contract

4.2 Non-Binding LOI:   Hospital and Vendor execute Letter of Intent
                        (see template below) committing to commercial terms

4.3 LOI Validity:      90 days from Pilot End Date; renewable by mutual consent

4.4 Conversion Discount: 20% off first-year SaaS fees if contract signed
                         within 120 days of Pilot End Date

4.5 Fast-Track Procurement Rider:
    - Hospital may execute Direct Agreement amendment
      (without full re-tendering) if:
      • Outcomes achieved per Section 2.1
      • Price within ±10% of pilot proposal
      • Hospital Board pre-approves in writing
    - This rider does not circumvent legal/compliance review
```

### Section 5: Confidentiality & Compliance

```
5.1 LGPD Compliance:      Vendor shall comply with Brazil's General Data
                          Protection Law (LGPD)

5.2 SaMD Classification:  Vendor represents that Cortex Swarm simulation
                          outputs are for Decision Support only (not clinical
                          recommendation). Hospital is responsible for clinical
                          validation.

5.3 Audit Trail:          All simulation parameters and outputs logged;
                          accessible to hospital and hospital legal team
```

### Section 6: Termination & Liabilities

```
6.1 Pilot Termination:  Either party may terminate with 14 days notice,
                        for any reason

6.2 Fee Refund:         Non-refundable (pilot fee covers 90-day infra reservation)

6.3 Liability Cap:      Total liability capped at USD $10,000
                        (pilot fee amount)
```

---

## 7. Letter of Intent (LOI) Template for Conversion

```
LETTER OF INTENT — PILOT CONVERSION OPTION
Dated: [Date]

From: [Hospital Name]
To:   [Vendor Name]

WHEREAS the parties have successfully completed the 90-Day Pilot (effective
[Date] through [Date]);

AND WHEREAS the pilot achieved the following agreed KPIs:
  - [KPI #1]: [Achieved value] (Target: [Target value]) ✓ ACHIEVED / ✗ MISSED
  - [KPI #2]: [Achieved value] (Target: [Target value]) ✓ ACHIEVED / ✗ MISSED

NOW, THEREFORE, the parties agree as follows:

1. CONVERSION OPTION
   If KPI targets are achieved (≥1 of 2 achieved), Hospital confirms its
   intent to evaluate a full SaaS contract with Vendor on the following terms:

2. PROPOSED SAAS TERMS (Non-Binding)
   - Contract Duration:    3 years
   - Monthly Fee:          USD $5,000/month (USD $60,000/year)
   - Pilot Discount:       20% off Year 1 (USD $4,000/month)
   - Escalation:           2% annual increase (Years 2–3)
   - Implementation:       30 days post-signature
   - Support:              24-hour response SLA, phone + email

3. CONVERSION TIMELINE
   Hospital commits to:
   - Legal review:         Weeks 1–2
   - Finance approval:     Weeks 3–4
   - Board signature:      Week 5

   Vendor commits to:
   - Final contract draft: Week 1
   - Compliance review:    Week 2
   - Redlines accepted:    Week 4

4. CONDITIONS
   - This LOI is non-binding except for Sections 5 (Confidentiality) and 6 (Term).
   - Hospital budget approval not guaranteed; board vote required before signature.
   - Conversion contingent on standard vendor due diligence (financials, insurance).

5. CONFIDENTIALITY
   Binding: Parties agree not to disclose LOI terms to third parties without
   written consent, except to legal/finance teams for due diligence.
   Term: 1 year from this date.

6. TERM
   This LOI is valid for 90 days from [Date]. If parties do not execute
   final contract by [End Date], this LOI expires and parties are released
   from obligations (except Confidentiality).

7. NEXT STEPS
   Within 5 business days, the parties shall:
   - Schedule weekly conversion calls (Vendor CFO, Hospital CFO, CMO)
   - Confirm final contract template (Vendor legal)
   - Confirm LGPD/SaMD compliance checklist (Vendor compliance)

Signed:

For Hospital:
  Name: ________________________  Title: __________  Date: __________

For Vendor:
  Name: ________________________  Title: __________  Date: __________
```

---

## 8. Recommended Actions (Next 30 Days)

1. **Identify 3 Pilot Hospitals** (1 private, 1 mid-tier public, 1 large academic public).
2. **Conduct "Clinical Design Workshops"** with each hospital's CMO; co-design outcomes targets.
3. **Finalize Pilot Agreement & LOI Template** (legal + finance review).
4. **Establish Pilot Steering Committee** at each hospital (chair: CMO).
5. **Set Monthly Board Reporting**: Tracker with pilot status, burn rate, conversion risk flags.
6. **Prepare Conversion Fast-Track Rider** (legal review with Brazilian healthcare law specialist).

---

## Sources

- [Public Health Meets Private Capital: The Promise and Pitfalls of Brazil's Digital Health Economy](https://www.columbiaemergingmarketsreview.com/p/public-health-meets-private-capital)
- [Brazil - Healthcare](https://www.trade.gov/country-commercial-guides/brazil-healthcare)
- [Strategic Acquisition of Healthcare Equipment in Brazil](https://pmc.ncbi.nlm.nih.gov/articles/PMC12670442/)
- [Latin America Healthtech Market Growth & Innovation 2025](https://www.towardshealthcare.com/news/latin-america-healthtech-growth)
- [The Value-Based Care Model Explained](https://swordhealth.com/articles/value-based-care-model-explained)
- [The Rise of Outcome-Based Pricing in SaaS](https://www.lek.com/insights/tmt/us/ei/rise-outcome-based-pricing-saas-aligning-value-cost)
- [B2B SaaS Funnel Conversion Benchmarks](https://userpilot.com/blog/b2b-saas-funnel-conversion-benchmarks/)
- [KLAS Research: Outcomes-Based Pricing Adoption](https://www.klasresearch.com)

---

**Document Version**: 1.0
**Last Updated**: 2026-03-17
**Owner**: CFO & VP Commercial
**Review Schedule**: Monthly (during pilot program)
