# PHASE 0 TASKS
## Cortex Agent-Native V1 — Red Team Blockers
**Date:** 2026-03-17
**Owner:** ARCHIE (CTO) + Engineering Lead
**Status:** 🔴 BLOCKING — Must complete before Phase 1 begins
**Target Duration:** 2–3 weeks (sequential execution)

---

## Overview

Phase 0 resolves all 5 critical blockers identified by the red team. These tasks are sequential — each one must reach its success criteria before the next Phase 1 unit begins. Deterministic Validator V2 (Task 5) is the exception: it runs in parallel with Phase 1–4 and must complete before GA launch.

Phase 0 gate: **All 4 blocking tasks (1–4) complete + Go/No-Go decision logged before Phase 1 kickoff.**

---

## Task 1: EdgeNodeClient Implementation

**Severity:** Critical (blocks Tier 2 offline deployment)
**Estimate:** 3–4 engineering days
**Owner:** ARCHIE (architecture) + Backend Engineer
**Persona Gate:** CYRUS must review before merge (RBAC + PII isolation on edge node)

### Scope

Implement the `EdgeNodeClient` class responsible for:
- Local queue management when the cloud sync endpoint is unavailable
- Deterministic retry with exponential backoff (max 3 attempts, then `CIRCUIT_BREAKER_TRIPPED`)
- Encrypted local storage for PHI during offline periods (`encryptPHIWithVersion` required)
- Sync reconciliation protocol on reconnect (conflict resolution: server wins, local delta logged to `AuditLog`)
- Health check endpoint (`GET /edge/health`) for monitoring

### Acceptance Criteria

- [ ] `EdgeNodeClient` instantiates and passes self-test without cloud connection
- [ ] PHI written to local store passes `encryptPHIWithVersion` validation
- [ ] Offline queue survives process restart (persisted, not in-memory)
- [ ] Sync reconciliation logs delta to `AuditLog` with `sequenceId` (AD-3 compliant)
- [ ] CYRUS review complete; no cross-tenant isolation violations
- [ ] Unit test coverage ≥ 90% (`pnpm test --coverage`)
- [ ] CIRCUIT_BREAKER behavior verified: 3 consecutive failures halt sync, emit block

### Definition of Done

Code merged to `main`, tests green, CYRUS sign-off documented in PR.

---

## Task 2: Escalation Schema Update

**Severity:** Critical (C-4 blocker — escalations silently dropped)
**Estimate:** 1 engineering day
**Owner:** Backend Engineer + ARCHIE
**Persona Gate:** ELENA must review (clinical SLA logic); QUINN must verify migration

### Scope

Extend the `Escalation` model in Prisma schema with 3 new fields:

```prisma
model Escalation {
  // ... existing fields ...
  clinicianAcknowledgedAt DateTime?           // Nullable; set when clinician ACKs
  slaDeadlineAt           DateTime            // Required; set at escalation creation
  escalationTier          EscalationTier      // Enum: TIER_1_NURSE | TIER_2_PHYSICIAN | TIER_3_SPECIALIST
}

enum EscalationTier {
  TIER_1_NURSE
  TIER_2_PHYSICIAN
  TIER_3_SPECIALIST
}
```

Also required:
- Migration file (`prisma migrate dev --name add_escalation_sla_fields`)
- `db:generate` after migration
- Backfill script for existing `Escalation` records (set `slaDeadlineAt = createdAt + 4h` as default)
- API route updates: `POST /escalation` must now populate `slaDeadlineAt` based on `escalationTier`
- SLA breach alert hook: if `slaDeadlineAt` passes without `clinicianAcknowledgedAt`, emit alert to `AuditLog`

### Acceptance Criteria

- [ ] Migration runs clean on staging database (no data loss)
- [ ] `db:generate` completes without TypeScript errors
- [ ] Backfill script verified on staging (all existing records have valid `slaDeadlineAt`)
- [ ] `POST /escalation` rejects requests missing `slaDeadlineAt` and `escalationTier`
- [ ] SLA breach hook fires correctly in integration test (mock clock advance past deadline)
- [ ] ELENA review complete; SLA tiers aligned with Manchester Triage thresholds
- [ ] QUINN: migration test added to CI pipeline

### Definition of Done

Migration merged, `db:generate` green, ELENA + QUINN sign-off documented.

---

## Task 3: Register Dead Tools

**Severity:** High (3 unregistered tools causing silent failures in agent routing)
**Estimate:** 2–4 engineering hours
**Owner:** Backend Engineer
**Persona Gate:** ARCHIE reviews tool registry after registration

### Scope

Three tools identified in the red team audit as unregistered in the agent tool registry:

| Tool Name | Expected Behavior | Current State |
|-----------|-------------------|---------------|
| `lab_result_fetcher` | Fetches and normalizes lab results from EHR integration | Exists in codebase, not registered → silent 404 |
| `drug_interaction_checker` | Validates drug combinations against formulary | Exists in codebase, not registered → agent skips check |
| `consent_status_verifier` | Checks patient consent before data access | Exists in codebase, not registered → CYRUS veto risk |

Registration steps per tool:
1. Add to tool registry (`/lib/tools/registry.ts`)
2. Add schema definition (name, description, input/output shape)
3. Add integration test: agent routing test that verifies tool is invoked correctly
4. Verify `consent_status_verifier` is added to RBAC pre-check middleware (CYRUS requirement)

### Acceptance Criteria

- [ ] All 3 tools appear in `GET /tools/registry` response
- [ ] Agent routing test passes for each tool (tool invoked, not skipped)
- [ ] `consent_status_verifier` integrated into RBAC middleware; CYRUS confirms no bypass possible
- [ ] No regressions in existing tool routing tests
- [ ] ARCHIE confirms tool registry structure is consistent with AD-1 (5-state pipeline)

### Definition of Done

All 3 tools registered, integration tests green, ARCHIE sign-off.

---

## Task 4: Answer 14 Design Questions

**Severity:** Blocking (architectural ambiguity prevents implementation of Units 1–4)
**Estimate:** 1–2 engineering days (cross-functional workshop)
**Owner:** ARCHIE (facilitator) + all relevant persona leads
**Format:** Synchronous working session → decisions logged to `.cursor/rules/ROUTER.md`

### The 14 Design Questions

These questions emerged from the red team audit and must be answered before Unit 1 implementation begins. Unanswered questions will cause implementation divergence across the 11 parallel workers.

| # | Question | Domain | Owner |
|---|----------|--------|-------|
| DQ-1 | What is the canonical state machine for the 5-state pipeline? Define all valid transitions and invalid transitions. | Architecture | ARCHIE |
| DQ-2 | Does `ESCALATED` state allow re-entry from `TRIAGED`, or is it terminal until `RESOLVED`? | Architecture + Clinical | ARCHIE + ELENA |
| DQ-3 | What is the SLA window per `EscalationTier`? (TIER_1, TIER_2, TIER_3 — hours to ACK) | Clinical | ELENA |
| DQ-4 | Is `emergencyConsent` a boolean flag on `ConsentRecord` or a separate model? | Legal + Security | RUTH + CYRUS |
| DQ-5 | What happens to `AuditLog` records if a patient exercises LGPD erasure rights? Soft-delete or retain with anonymization? | Legal | RUTH |
| DQ-6 | Which biomarkers require dual (Pathological + Functional) range sets at launch? Full list required. | Clinical | ELENA |
| DQ-7 | What is the retry policy for `EdgeNodeClient` sync failures? Max attempts, backoff formula, dead-letter handling? | Architecture | ARCHIE |
| DQ-8 | Does the deterministic validator apply to all pipeline outputs or only clinical recommendation outputs? | Clinical + Architecture | ELENA + ARCHIE |
| DQ-9 | What is the RBAC role taxonomy? Define all roles and their access scope (e.g., `NURSE`, `PHYSICIAN`, `ADMIN`, `AUDITOR`). | Security | CYRUS |
| DQ-10 | Are Tier 2 (Offline) and Tier 3 (Enterprise) tenants isolated at the database level or application level? | Architecture + Security | ARCHIE + CYRUS |
| DQ-11 | What is the canonical drug interaction severity taxonomy? (e.g., CONTRAINDICATED / MAJOR / MODERATE / MINOR) | Clinical | ELENA |
| DQ-12 | Which endpoints are public (no auth) vs. protected? Full route table required. | Security | CYRUS |
| DQ-13 | What is the minimum provenance metadata required for a clinical rule to pass ELENA's veto invariant? (sourceAuthority, citationUrl — what else?) | Clinical | ELENA |
| DQ-14 | How is the Manchester Triage Score mapped to `EscalationTier`? Is the mapping configurable per deployment? | Clinical | ELENA |

### Acceptance Criteria

- [ ] All 14 questions answered in writing by the designated owner
- [ ] Answers reviewed and ratified in a single working session (no async back-and-forth)
- [ ] All answers logged to `.cursor/rules/ROUTER.md` under a new `<design_decisions>` section
- [ ] Any answers that change AD-1 through AD-5 trigger a re-ratification memo (addendum to this document)
- [ ] ARCHIE confirms implementation units have sufficient clarity to proceed

### Definition of Done

All 14 DQs answered, logged to ROUTER.md, ARCHIE confirms Phase 1 unblocked.

---

## Task 5: Deterministic Validator V2 (Parallel Track)

**Severity:** Critical (C-5 — clinical safety non-determinism)
**Estimate:** 4–6 weeks (parallel with Phase 1–4; must complete before GA)
**Owner:** ELENA (clinical spec) + Senior Engineer (implementation)
**Persona Gate:** ELENA supreme veto; QUINN quality gate (coverage ≥ 95%)

### Scope

Replace the current Deterministic Validator V1 (which allows stochastic LLM outputs to pass through the clinical pipeline) with a fully deterministic rule-gate engine:

**V2 Requirements:**
- All clinical pipeline outputs must pass a deterministic rule-gate before routing
- Each rule must carry `sourceAuthority` (e.g., "WHO ICD-11", "ANVISA RDC 204/2017") and `citationUrl`
- LLM outputs are permitted as *input* to the rule-gate but never as the final clinical decision
- `INSUFFICIENT_DATA` returned when required fields are missing (no imputation)
- Rule corpus version-controlled; each clinical rule has a `ruleId` and `version`
- Output includes `validatorVersion`, `rulesApplied[]`, and `humanReviewRequired` boolean
- `humanReviewRequired: true` triggers mandatory clinician ACK before routing continues

**Phase Milestones:**
| Week | Milestone |
|------|-----------|
| 1–2 | Rule corpus design + ELENA sign-off on initial ruleset |
| 3–4 | Core validator engine implementation + unit tests |
| 5 | Integration with 5-state pipeline (AD-1) |
| 6 | QUINN quality gate: coverage ≥ 95%, edge case suite complete |

### Acceptance Criteria

- [ ] Zero stochastic outputs pass through clinical pipeline to patient-facing routing
- [ ] All rules have `sourceAuthority` and `citationUrl` (ELENA invariant)
- [ ] `INSUFFICIENT_DATA` path covered with test cases (no silent imputation)
- [ ] `humanReviewRequired` flag correctly set and ACK gate enforced in pipeline
- [ ] Test coverage ≥ 95% (QUINN gate)
- [ ] ELENA formal sign-off on complete ruleset before GA
- [ ] Validator versioned; rollback to V1 documented (emergency path only, requires board approval)

### Definition of Done

V2 merged, ELENA + QUINN sign-off, integrated into 5-state pipeline, all tests green.

---

## Success Criteria Checklist

### Phase 0 Gate Criteria (Tasks 1–4 only — Task 5 runs parallel)

- [ ] **Task 1:** `EdgeNodeClient` merged, tested, CYRUS cleared
- [ ] **Task 2:** Escalation schema migrated, `db:generate` green, ELENA + QUINN cleared
- [ ] **Task 3:** All 3 dead tools registered, integration tests passing, ARCHIE cleared
- [ ] **Task 4:** All 14 design questions answered and logged to ROUTER.md

### System-Level Gate Criteria

- [ ] `pnpm test` exits code 0 after all Phase 0 merges
- [ ] No CIRCUIT_BREAKER_TRIPPED events in staging environment
- [ ] `git diff --staged` clean (no `console.log`, no secrets, no TODOs)
- [ ] All veto holders (RUTH, ELENA, CYRUS) have reviewed Phase 0 output
- [ ] QUINN CI pipeline green across all test suites

---

## Go / No-Go Decision Template

Complete this template at Phase 0 completion. File as `PHASE_0_GONO_GO.md` in `.claude/decisions/`.

```markdown
# PHASE 0 GO/NO-GO DECISION
Date: ___________
Facilitator: ___________

## Task Completion Status
- [ ] Task 1 (EdgeNodeClient): COMPLETE / INCOMPLETE
- [ ] Task 2 (Escalation Schema): COMPLETE / INCOMPLETE
- [ ] Task 3 (Dead Tools): COMPLETE / INCOMPLETE
- [ ] Task 4 (Design Questions): COMPLETE / INCOMPLETE
- [ ] Task 5 (Deterministic V2): IN PROGRESS (expected completion: ___________)

## Test Gate
- pnpm test result: PASS / FAIL
- Coverage delta: ___________
- Open blocking issues: ___________

## Veto Holder Sign-Off
- RUTH (CLO): CLEARED / HOLDS (details: ___________)
- ELENA (CMO): CLEARED / HOLDS (details: ___________)
- CYRUS (CISO): CLEARED / HOLDS (details: ___________)

## Decision
[ ] GO — Phase 1 begins immediately
[ ] NO-GO — Reason: ___________
[ ] CONDITIONAL GO — Conditions: ___________

## Approvers
- CTO (ARCHIE): ___________
- Engineering Lead: ___________
- Date of decision: ___________
```
