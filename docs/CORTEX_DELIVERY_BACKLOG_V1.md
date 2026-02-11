# Cortex Delivery Backlog v1 (FR-Mapped)

**Source PRD:** `docs/CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md`  
**Version:** 1.0  
**Owner:** Engineering Lead + Product Lead  
**Status:** Ready for sprint ticket creation

---

## 1) Backlog Model

- **Epic** -> Groups related FR requirements
- **Story** -> User-level deliverable
- **Task** -> Build/test/deploy unit of work
- Every story is mapped to one or more `FR-*` IDs.

---

## 2) Sprint Allocation (12-week plan)

- **Sprint 1-2 (Weeks 1-4):** Epic A (Safety Engine core)
- **Sprint 3-4 (Weeks 5-8):** Epic B + D (Console + rollout config)
- **Sprint 5-6 (Weeks 9-12):** Epic C (Follow-up orchestration) + evidence outputs

---

## 3) Epic A - Safety Engine (FR-A1..A4)

## Story A1 - Deterministic DOAC checks run reliably
**Maps to:** `FR-A1`  
**Acceptance:** same input => same output + rationale

Tasks:
- [ ] Implement deterministic rule executor interface for DOAC v1.
- [ ] Add versioned rule pack loader (`protocol_version`).
- [ ] Add golden test fixtures for reproducibility checks.
- [ ] Add API/service contract tests for stable outputs.

## Story A2 - Missing/stale critical fields enforce attestation
**Maps to:** `FR-A2`  
**Acceptance:** completion blocked until attestation or data provided

Tasks:
- [ ] Define critical-field policy for DOAC workflow.
- [ ] Implement stale-data detection logic (timestamp validation).
- [ ] Implement attestation modal/step and persistence.
- [ ] Add completion guard in API and UI layers.

## Story A3 - Overrides require structured reason
**Maps to:** `FR-A3`  
**Acceptance:** override submit rejected without reason code

Tasks:
- [ ] Define override reason taxonomy v1 with Clinical Lead.
- [ ] Enforce reason code required in UI and backend schema.
- [ ] Add audit event on override submission.
- [ ] Add validation tests for missing/invalid reason code.

## Story A4 - Rule execution events carry protocol/country context
**Maps to:** `FR-A4`  
**Acceptance:** each execution event contains required context dimensions

Tasks:
- [ ] Extend event payload with `protocol_version`, `country`, `site_id`.
- [ ] Add event schema validator and contract tests.
- [ ] Add logging guard for dropped/malformed events.
- [ ] Add QA dashboard check for event completeness.

---

## 4) Epic B - Action Console (FR-B1..B3)

## Story B1 - KPI cards are definition-linked and trustworthy
**Maps to:** `FR-B1`  
**Acceptance:** card has documented numerator/denominator + query reference

Tasks:
- [ ] Build KPI dictionary markdown with query IDs.
- [ ] Render KPI cards with tooltip/link to metric definitions.
- [ ] Implement reconciliation script/query parity checks.
- [ ] Add test that blocks release if KPI definitions missing.

## Story B2 - Console filtering works by country/site/unit/date
**Maps to:** `FR-B2`  
**Acceptance:** all cards react consistently to selected filters

Tasks:
- [ ] Implement shared filter state model.
- [ ] Add backend query filter adapters.
- [ ] Add integration tests for filter consistency across cards.
- [ ] Add performance check for common filter combinations.

## Story B3 - Override reasons are ranked and actionable
**Maps to:** `FR-B3`  
**Acceptance:** ranked reasons with count + percentage for selected filter scope

Tasks:
- [ ] Build aggregation query for override reasons.
- [ ] Add ranked list component with count/% columns.
- [ ] Add trend comparison vs prior week.
- [ ] Add export endpoint for governance review.

---

## 5) Epic C - Follow-up Orchestration (FR-C1..C3)

## Story C1 - Consent gate prevents unauthorized reminders
**Maps to:** `FR-C1`  
**Acceptance:** no reminder dispatch when consent flag is false

Tasks:
- [ ] Add consent check middleware in reminder pipeline.
- [ ] Add explicit reason logging for skipped reminders.
- [ ] Add unit/integration tests for consent scenarios.

## Story C2 - Retry and escalation policy is enforced
**Maps to:** `FR-C2`  
**Acceptance:** failed reminders retry and escalate per policy

Tasks:
- [ ] Define retry schedule and max-attempt policy.
- [ ] Implement escalation queue creation on policy threshold.
- [ ] Add queue worker monitoring and dead-letter handling.
- [ ] Add SLA timers and breach markers.

## Story C3 - Reminder/escalation lifecycle is event-complete
**Maps to:** `FR-C3`  
**Acceptance:** send/success/fail/escalate/open/closed events all emitted

Tasks:
- [ ] Emit lifecycle events for each state transition.
- [ ] Add end-to-end tests for each lifecycle path.
- [ ] Add delivery observability panel in console.

---

## 6) Epic D - Rollout & Configuration (FR-D1..D2)

## Story D1 - Country and payer context persists and reports
**Maps to:** `FR-D1`  
**Acceptance:** values captured in onboarding appear in downstream reports/events

Tasks:
- [ ] Persist `complianceCountry` and `insurerFocus` on profile save.
- [ ] Include both fields in event context where applicable.
- [ ] Add QA report to validate field propagation.

## Story D2 - Protocol mode policy is visible and persisted
**Maps to:** `FR-D2`  
**Acceptance:** deterministic-first policy selectable and stored

Tasks:
- [ ] Finalize protocol mode enum and defaults.
- [ ] Persist mode setting in config/settings store.
- [ ] Expose effective mode in runtime diagnostics.
- [ ] Add admin-level update audit event.

---

## 7) Cross-Cutting Implementation Tasks

- [ ] Create FR traceability matrix (`FR-ID -> story -> tests -> release note`).
- [ ] Add release checklist item for claims hygiene verification.
- [ ] Add weekly KPI data integrity check job.
- [ ] Add pilot-week evidence export command/runbook.

---

## 8) Definition of Done (DoD)

A story is `Done` only if:
- [ ] PR merged and CI green
- [ ] Acceptance criteria passed in test evidence
- [ ] Event contract validated (if applicable)
- [ ] KPI/query definition updated (if applicable)
- [ ] Docs updated (PRD/backlog/status tracker if scope changed)
- [ ] Pilot owner sign-off recorded (for workflow-impacting changes)

---

## 9) Suggested Ticket Labels

- `cortex-v1`
- `epic-a-safety`
- `epic-b-console`
- `epic-c-followup`
- `epic-d-config`
- `fr-a1` ... `fr-d2`
- `pilot-bolivia` / `pilot-brazil` / `pilot-argentina`
- `kpi-integrity`

---

## 10) Immediate Ticket Creation Order (Top 12)

1. A1 deterministic executor scaffold
2. A2 attestation + completion guard
3. A3 override reason enforcement
4. A4 event payload context completion
5. B1 KPI dictionary + query IDs
6. B2 filter consistency implementation
7. D1 country/payer propagation checks
8. D2 protocol mode persistence + audit
9. C1 consent gate middleware
10. C2 retry/escalation worker
11. C3 lifecycle event completeness tests
12. Evidence export generation + validation

