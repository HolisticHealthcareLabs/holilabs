# Cortex LATAM Execution Roadmap (2026)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-10
- Owner: PL
- Cadence: weekly
- Last Run Mode: monday
- Next Recommended Update: 2026-02-17
<!-- CORTEX_AUTOMATION:END -->

**Scope:** Bolivia, Brazil, Argentina pilots  
**Product:** Cortex by Holi Labs (Clinical Safety Infrastructure)  
**Primary Wedge:** Inpatient cardiology (DOAC safety + discharge follow-up)  
**Version:** 1.0  
**Status:** Execution-ready draft

---

## 1) Strategic Thesis

### Market opportunity
- The highest-value gap is not model quality alone; it is **workflow reliability** in fragmented EHR environments.
- LATAM hospitals and clinics need a **System of Action**: deterministic safety checks, auditable decisions, and follow-up completion.
- Existing global leaders are strong in acute imaging and US workflows, but there is whitespace in:
  - EHR-fragmented environments
  - WhatsApp-native follow-up
  - country/payer-specific protocol operations

### Product thesis
- **Generative AI for documentation.**
- **Deterministic clinical logic for safety-critical decisions.**
- **Action + governance layer** that can start without deep integration.

---

## 2) What We Build First

### Core product modules (Phase 1)
- **Safety Engine**
  - DOAC dosing and contraindication checks
  - Required attestation on missing or stale labs
  - Structured override reasons
- **Action Console**
  - completion, intervention, override, and adherence metrics
  - unit and service-line views
- **Follow-up Orchestrator**
  - consented reminders (WhatsApp/email)
  - escalation queues for non-response
- **Deployment Ladder**
  - manual/copy-paste intake first
  - CSV/FHIR-lite adapters second

### Explicit non-goals (Phase 1)
- No broad multi-specialty protocol library launch
- No deep custom integrations before workflow KPI proof
- No compliance/certification claims that are not audit-backed

---

## 3) ICP and Commercial Packaging

### ICP A: Private practice / small clinics
- Need fast setup, low IT burden, immediate operational benefit.
- **Offer:** Web-first checklist + reminders + basic reporting.
- **Primary CTA:** Start Free Beta.

### ICP B: Hospital systems / enterprise
- Need governance, auditability, and controlled rollout.
- **Offer:** Cortex Pilot with command center, policy controls, and audit exports.
- **Primary CTA:** Request Cortex Pilot.

### Packaging recommendation
- **Practice SKU:** per clinician/site monthly
- **Enterprise SKU:** annual pilot + implementation + governance seats

---

## 4) Owner Map (RACI-lite)

## 4.1 Core team roles
- **Product Lead (PL):** scope, sequencing, acceptance criteria
- **Clinical Lead (CL):** protocol validity, override taxonomy, safety review
- **Engineering Lead (EL):** architecture, delivery, reliability
- **Data/Analytics Lead (DAL):** event schema, dashboards, KPI integrity
- **Integrations Lead (IL):** CSV/FHIR-lite and EHR adapters
- **Ops/Implementation Lead (OIL):** pilot onboarding and rollout runbooks
- **GTM Lead (GTM):** pilot pipeline, pricing feedback, stakeholder comms
- **Security/Compliance Lead (SCL):** policy claims hygiene and controls

## 4.2 Domain ownership
- **Safety Engine:** EL + CL
- **Rule content and country packs:** CL + PL
- **Console analytics:** DAL + EL
- **Follow-up workflows:** EL + OIL
- **Implementation playbook:** OIL + GTM
- **Messaging/claims governance:** SCL + GTM + PL

---

## 5) 12-Week Build Plan (Sprint-Level)

Assumption: 6 sprints, 2 weeks each.

## Sprint 1-2 (Weeks 1-4): DOAC Safety Core
- **Goals**
  - DOAC rule pack v1 (deterministic)
  - Attestation flow for missing renal data
  - Override reason taxonomy v1
  - Event logging baseline
- **Feature acceptance criteria**
  - Deterministic rule evaluation produces reproducible output for same input
  - Missing critical lab blocks completion unless attested
  - Override requires mandatory reason code
  - Events emitted for start/check/attest/override/complete
- **Owner**
  - Primary: EL, CL
  - Supporting: DAL
- **Exit KPI gates**
  - 0 blocker severity defects in happy-path and safety-path tests
  - 95%+ successful checklist completion in internal UAT sessions

## Sprint 3-4 (Weeks 5-8): Command Center + Country Profiles
- **Goals**
  - Action Console v1
  - Country protocol profile selector (Bolivia, Brazil, Argentina)
  - Payer/insurer focus metadata
  - Pilot admin controls for protocol mode
- **Feature acceptance criteria**
  - Console cards: completion rate, intervention rate, override rate, adherence
  - Country profile is auditable in event metadata
  - Default mode supports deterministic-first operations
- **Owner**
  - Primary: DAL, EL
  - Supporting: CL, PL
- **Exit KPI gates**
  - Dashboard latency p95 < 2s for standard org views
  - 100% event traceability for displayed KPI numerators/denominators

## Sprint 5-6 (Weeks 9-12): Follow-up + Evidence Pack
- **Goals**
  - WhatsApp/email reminder orchestration
  - Escalation queues for non-response
  - Pilot evidence export (monthly PDF/CSV)
  - Sales-ready pilot summary template
- **Feature acceptance criteria**
  - Consent is required before outbound reminders
  - Retry/escalation policy configurable by site
  - Evidence export includes baseline vs current KPI trend
- **Owner**
  - Primary: EL, OIL, DAL
  - Supporting: GTM, CL
- **Exit KPI gates**
  - Reminder delivery success >= 95% for valid contacts
  - End-to-end pilot report generated with no manual spreadsheet joins

---

## 6) Country Rollout Plan

## 6.1 Sequence
- **Wave 1:** Bolivia (fastest execution, clinical champions available)
- **Wave 2:** Brazil (larger scale, stricter ops complexity)
- **Wave 3:** Argentina (cross-site replication + payer nuance)

## 6.2 Country-specific setup checklist
- Clinical protocol owner identified
- Site safety policy approved
- Contact/consent workflow approved
- Baseline metrics captured for at least 2 weeks
- Weekly review cadence confirmed

## 6.3 Minimum pilot footprint per country
- At least 1 clinical champion
- At least 1 quality/governance stakeholder
- 20+ relevant cases per month for meaningful trend signal

---

## 7) Pilot Success Thresholds (Go/No-Go)

Measure at 30, 60, 90 days by site and by country.

## 7.1 Clinical workflow KPIs
- **Checklist completion rate:** target >= 85% by day 60; >= 90% by day 90
- **Median verification time:** target <= 90 seconds by day 60
- **Missing-critical-data attestations:** trend down 20% by day 90
- **Override rate:** monitored by reason code (no absolute target initially; must be explainable)

## 7.2 Follow-up KPIs
- **Reminder reach rate:** >= 95% of valid contacts
- **Patient response/adherence proxy:** >= 60% by day 90 (initial benchmark)
- **Escalation closure rate:** >= 80% within configured SLA

## 7.3 Operational and business KPIs
- **Weekly active clinical users (WAU):** >= 70% of enrolled users by day 60
- **Champion NPS (clinical + quality):** >= 8/10 by day 90
- **Expansion readiness signal:** at least one additional unit requests pilot expansion

## 7.4 Red flags (stop or redesign)
- Completion rate < 70% after day 60
- Median verification time > 150 seconds after optimization
- Persistent override reason "workflow too slow" > 25%
- No measurable trend in key process KPIs after day 90

---

## 8) Measurement and Data Contract

## 8.1 Mandatory event schema (minimum)
- `check_started`
- `check_completed`
- `rule_triggered`
- `attestation_submitted`
- `override_submitted`
- `reminder_sent`
- `reminder_failed`
- `escalation_created`
- `escalation_closed`

## 8.2 Required dimensions
- country
- site_id
- unit/service_line
- protocol_version
- protocol_mode
- payer_focus (if provided)
- actor_role
- timestamp

## 8.3 Dashboard guardrails
- Every KPI card must link to the underlying query definition.
- No vanity metrics without denominator and time window.
- No compliance claim displayed unless legal/compliance sign-off exists.

---

## 9) Commercialization Plan by Milestone

## Milestone A (End of Week 4): "Safety Core Live"
- Sell pilot design workshops.
- Message: deterministic safety checks with auditable overrides.

## Milestone B (End of Week 8): "Governance Visibility"
- Sell department-level pilots.
- Message: measurable process control, not retrospective blame.

## Milestone C (End of Week 12): "Closed Loop"
- Sell enterprise pilots and multi-site expansions.
- Message: from in-hospital verification to post-discharge completion.

---

## 10) Risk Register and Mitigations

## 10.1 Product risk
- **Risk:** workflow friction reduces adoption.
- **Mitigation:** enforce 90-second interaction budget and monitor friction reasons weekly.

## 10.2 Clinical risk
- **Risk:** ambiguous rule definitions create unsafe variability.
- **Mitigation:** clinical sign-off process per protocol version; immutable change log.

## 10.3 Integration risk
- **Risk:** EHR heterogeneity delays implementation.
- **Mitigation:** manual-first intake, then adapters by proven ROI.

## 10.4 Trust/claims risk
- **Risk:** overclaiming certifications or outcomes damages credibility.
- **Mitigation:** claims governance checklist in release process.

---

## 11) Immediate Next 10 Execution Tasks

1. Freeze DOAC protocol v1 rule definitions and attestation list.
2. Finalize override reason taxonomy and coding.
3. Implement mandatory event contract and schema tests.
4. Build command center KPI cards with query definitions.
5. Configure country profile selector and payer-focus fields.
6. Ship reminder orchestration v1 with consent checks.
7. Produce pilot onboarding runbook per country.
8. Define weekly pilot review template (clinical + ops + business).
9. Build evidence export template (PDF + CSV).
10. Create claims governance checklist for all marketing/product copy.

---

## 12) Decision Framework: 100% Deterministic vs 70/30 Hybrid

- **Safety-critical checks:** deterministic-first (required)
- **Documentation/explanation/coaching:** hybrid allowed
- **Default policy for pilots:** deterministic-first for blocking logic, hybrid optional for non-blocking support

This preserves trust and clinician safety while retaining AI productivity value.

---

## Appendix A: Pilot Cadence

- **Daily:** operational triage (incidents, failed reminders, user blockers)
- **Weekly:** KPI and override review with clinical champion
- **Bi-weekly:** protocol tuning review
- **Monthly:** executive readout (site leadership + GTM)

## Appendix B: Expansion Trigger

A site is expansion-ready when all of the following hold for 4 consecutive weeks:
- completion >= 90%
- WAU >= 70%
- median check time <= 90s
- champion NPS >= 8
- leadership requests additional unit rollout

---

## Weekly Auto Log

### 2026-02-10 (MONDAY)
- Focus this week:
- Top 3 priorities:
- Risks to monitor:
- Decisions needed:


### 2026-02-10 (WEEKLY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:

