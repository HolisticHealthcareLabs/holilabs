# Cortex Product Requirements Document (PRD) v1

**Product:** Cortex by Holi Labs  
**Version:** 1.0  
**Date:** 2026-02-10  
**Owner:** Product Lead (PL)  
**Status:** Execution-ready

---

## 0) Purpose

This PRD translates strategy into buildable requirements for the first production pilot phase:
- Geography: Bolivia -> Brazil -> Argentina
- Clinical wedge: inpatient cardiology
- Workflow wedge: DOAC safety verification + discharge follow-up

This document is the implementation contract for Product, Clinical, Engineering, Analytics, Ops, and GTM.

---

## 1) Problem Statement

Clinical teams in LATAM often operate across fragmented EHR workflows and inconsistent data quality.  
High-risk decisions (like anticoagulation and discharge handoff) are vulnerable to:
- missing or stale critical data,
- inconsistent protocol application,
- weak follow-up completion after discharge.

Current systems emphasize recordkeeping and retrospective audits, not real-time safety action.

---

## 2) Product Vision (v1)

**Cortex is a clinical safety infrastructure layer** that:
- applies deterministic checks for safety-critical steps,
- enforces attestation/override structure when data is incomplete,
- provides actionable governance metrics,
- closes the loop with consented follow-up workflows.

Design principle:
- Generative AI for documentation support.
- Deterministic logic for safety-critical decisions.

---

## 3) Goals and Non-Goals

## 3.1 Goals (first 12 weeks)
- G1: Launch deterministic DOAC safety checks in at least one live Bolivia site.
- G2: Achieve measurable workflow adoption and KPI visibility (completion/time/override/follow-up).
- G3: Produce board-grade evidence export from live pilot data.
- G4: Enable country/payer-aware protocol context in rollout and reporting.

## 3.2 Non-Goals (v1)
- No multi-specialty protocol expansion beyond defined pilot scope.
- No dependence on deep EHR integration before KPI proof.
- No unverifiable compliance/certification claims in product surfaces.

---

## 4) Primary Users and Jobs-to-be-Done

## 4.1 Clinician (Cardiology)
- JTBD: Complete safety verification quickly before decision/discharge.
- Success criteria: flow completed in <=90s median with clear rationale and low friction.

## 4.2 Quality/Governance Leader
- JTBD: See protocol adherence/override patterns and intervene operationally.
- Success criteria: weekly actionable dashboard with explainable KPI definitions.

## 4.3 Ops/Implementation Lead
- JTBD: Onboard sites, monitor adoption, resolve friction fast.
- Success criteria: weekly tracker + clear blocker/action ownership.

## 4.4 GTM/Executive
- JTBD: Translate pilot outcomes into expansion decisions.
- Success criteria: board-ready scorecard and evidence report.

---

## 5) Scope: v1 Feature Set

## 5.1 Safety Engine (deterministic)
- DOAC rule pack v1
- Required attestation on missing/stale critical fields
- Mandatory structured override reasons
- Versioned protocol identifiers in event metadata

## 5.2 Action Console
- KPI cards: completion, median verification time, intervention rate, override rate, follow-up metrics
- Country/site/unit filtering
- Export-ready summaries

## 5.3 Follow-up Orchestrator
- Consent-aware reminder scheduling (WhatsApp/email)
- Retry + escalation policy
- Closure events for escalations

## 5.4 Rollout/Configuration
- Compliance country selector
- Payer/insurer focus field
- Protocol mode preference (deterministic-first vs hybrid for non-blocking support)

---

## 6) Functional Requirements (FR)

## Epic A: Safety Engine

- **FR-A1** Cortex MUST run deterministic DOAC checks against required input fields.
  - Acceptance:
    - same input context always returns same rule result and rationale.
- **FR-A2** Cortex MUST block completion when required critical data is missing/stale unless attested.
  - Acceptance:
    - missing critical field triggers attestation prompt before completion.
- **FR-A3** Cortex MUST require override reason code for any override action.
  - Acceptance:
    - override cannot be submitted without a reason code.
- **FR-A4** Every rule execution MUST store protocol version and country context.
  - Acceptance:
    - event payload contains `protocol_version`, `country`, `site_id`.

## Epic B: Console & Governance

- **FR-B1** Console MUST display core KPI cards with defined denominator/numerator.
  - Acceptance:
    - each card links to query definition in docs/runbook.
- **FR-B2** Console MUST support filtering by country/site/unit and date range.
  - Acceptance:
    - selected filter values consistently affect all cards.
- **FR-B3** Console MUST surface top override reasons.
  - Acceptance:
    - ranked list by count and percentage for selected filters.

## Epic C: Follow-up Orchestration

- **FR-C1** Follow-up reminders MUST require explicit patient consent flag.
  - Acceptance:
    - no reminder dispatch when consent=false.
- **FR-C2** Reminder delivery MUST support retries and escalation creation.
  - Acceptance:
    - failed reminder produces retry attempts and escalation event per policy.
- **FR-C3** System MUST track reminder and escalation outcomes as events.
  - Acceptance:
    - event types include send/success/failure/escalation/open/closed.

## Epic D: Rollout & Configuration

- **FR-D1** Onboarding profile MUST capture compliance country and payer focus.
  - Acceptance:
    - fields persist and are available in downstream reporting context.
- **FR-D2** Settings MUST provide protocol mode policy visibility.
  - Acceptance:
    - deterministic-first policy is selectable and persisted.

---

## 7) Non-Functional Requirements (NFR)

- **NFR-1 Reliability:** No blocker-severity defects in safety flow before pilot launch.
- **NFR-2 Performance:** Median verification interaction <= 90 seconds by day 60 target.
- **NFR-3 Traceability:** 100% of displayed KPI metrics must map to event query definitions.
- **NFR-4 Security/Privacy:** No end-user exposure of infra provider credentials (Twilio/Resend API secrets).
- **NFR-5 Claims hygiene:** Product copy must avoid unverifiable compliance/performance claims.

---

## 8) Data and Event Contract (Minimum)

Required events:
- `check_started`
- `rule_triggered`
- `attestation_submitted`
- `override_submitted`
- `check_completed`
- `reminder_sent`
- `reminder_failed`
- `escalation_created`
- `escalation_closed`

Required dimensions:
- `country`, `site_id`, `unit`, `protocol_version`, `protocol_mode`, `payer_focus`, `actor_role`, `timestamp`

---

## 9) KPI Definitions (Pilot Success)

- **KPI-1 Checklist completion rate** = completed / eligible
  - Target: >= 85% by day 60, >= 90% by day 90
- **KPI-2 Median verification time**
  - Target: <= 90s by day 60
- **KPI-3 Missing critical data rate**
  - Target: downtrend by day 90
- **KPI-4 Reminder reach rate**
  - Target: >= 95% on valid contacts
- **KPI-5 Adherence proxy**
  - Target: >= 60% by day 90
- **KPI-6 WAU enrolled clinician ratio**
  - Target: >= 70%
- **KPI-7 Champion confidence**
  - Target: >= 8/10

---

## 10) Milestones and Timeline

## Milestone M1 (Weeks 1-4): Safety Core Live
- Deliver FR-A1..A4 baseline
- Exit criteria:
  - clinical sign-off on rule pack v1
  - no blocker defects in UAT

## Milestone M2 (Weeks 5-8): Governance Visibility
- Deliver FR-B1..B3 + FR-D1
- Exit criteria:
  - KPI query reconciliation complete
  - country context visible in reports

## Milestone M3 (Weeks 9-12): Closed Loop Follow-up
- Deliver FR-C1..C3 + evidence export workflow
- Exit criteria:
  - reminder/escalation flow stable
  - first board-grade evidence report generated from live data

---

## 11) Dependencies

- Clinical protocol ownership and sign-off cadence
- Pilot site champion availability
- Event pipeline integrity and analytics query ownership
- Message channel operations (consent, number/email validity)

---

## 12) Risks and Mitigations

- **R1 Workflow friction** -> Keep <=90s budget, monitor override/friction reasons weekly.
- **R2 Data incompleteness** -> mandatory attestations + UX shortcuts + training.
- **R3 KPI trust gap** -> publish query definitions and reconciliation checks.
- **R4 Expansion too early** -> gate on milestone KPIs before adding new pathways/sites.

---

## 13) Acceptance and Sign-off

This PRD is considered accepted when each function signs:
- Product Lead
- Clinical Lead
- Engineering Lead
- Analytics Lead
- Ops Lead
- GTM Lead

Sign-off date: `TBD`

---

## 14) Linked Execution Documents

- Strategy + execution plan: `docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md`
- Status tracker: `docs/CORTEX_ROADMAP_STATUS_TRACKER.md`
- Board scorecard template: `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md`
- Pilot tracker template: `docs/CORTEX_PILOT_TRACKER_TEMPLATE.md`
- Sheets rollup guide: `docs/CORTEX_SHEETS_ROLLUP_GUIDE.md`
- Board export layout: `docs/CORTEX_BOARD_EXPORT_LAYOUT.md`
- Delivery backlog: `docs/CORTEX_DELIVERY_BACKLOG_V1.md`
- Doc automation setup: `docs/CORTEX_DOC_AUTOMATION_SETUP.md`

