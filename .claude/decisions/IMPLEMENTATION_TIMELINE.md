# IMPLEMENTATION TIMELINE
## Cortex Agent-Native V1 — Full Roadmap
**Date:** 2026-03-17
**Total Duration:** ~20 weeks to GA
**Status:** Phase 0 Active | Phases 1–4 Queued

---

## Timeline at a Glance

```
WEEK:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
       ├──Phase 0──┤
                   ├────Phase 1–2 (Units 1–4 sequential)────┤
                                                             ├──Phase 3–4 (Units 5–10 parallel)──┤
       ├─────────Deterministic Validator V2 (parallel track)────────────────────────────────────┤
                                                                                        ├─Deploy─┤
```

---

## Phase 0: Red Team Blockers
**Duration:** 2–3 weeks
**Execution:** Sequential (tasks are dependent)
**Status:** 🔴 BLOCKING

| Week | Task | Owner | Dependency | Exit Criteria |
|------|------|-------|------------|---------------|
| 1 | Task 4: Answer 14 Design Questions | ARCHIE + all leads | None — must go first | All 14 DQs logged to ROUTER.md |
| 1–2 | Task 3: Register Dead Tools | Backend Engineer | DQ-12 answered (route table) | All 3 tools registered, integration tests green |
| 2 | Task 2: Escalation Schema Update | Backend Engineer | DQ-3 answered (SLA windows) | Migration clean, db:generate green, ELENA + QUINN cleared |
| 2–3 | Task 1: EdgeNodeClient Implementation | Backend Engineer | DQ-7 answered (retry policy), DQ-10 answered (tenant isolation) | EdgeNodeClient merged, CYRUS cleared |
| Parallel | Task 5: Deterministic Validator V2 (kickoff) | ELENA + Senior Engineer | DQ-8, DQ-13 answered | V2 spec signed off; implementation begins |

**Phase 0 Exit:** All Tasks 1–4 complete → Go/No-Go decision logged → Phase 1 kickoff.

---

## Phase 1–2: WS-1 Core Tools
**Duration:** 6 weeks
**Execution:** **Sequential** (Units 1–4 touch overlapping files; parallelism causes merge conflicts)
**Status:** 🟡 Queued

### Why Sequential?

Units 1–4 all modify core files in the tool registry, RBAC middleware, and the 5-state pipeline state machine. Running them in parallel generates unresolvable merge conflicts and introduces non-deterministic test failures. Each unit must merge and pass CI before the next begins.

### Unit Schedule

| Unit | Name | Duration | Owner | Key Deliverables |
|------|------|----------|-------|-----------------|
| **Unit 1** | Tool Registry Hardening | 1–1.5 weeks | Backend Engineer A | All tools registered, schema validated, `GET /tools/registry` returns complete manifest |
| **Unit 2** | RBAC Route Guards | 1 week | Backend Engineer B | All 4 unguarded routes wrapped with `createProtectedRoute`; CYRUS sign-off |
| **Unit 3** | 5-State Pipeline Implementation | 2 weeks | Backend Engineer A + ARCHIE | Full state machine: `PENDING → ROUTING → TRIAGED → ESCALATED → RESOLVED`; invalid transitions rejected |
| **Unit 4** | Audit Chain V2 | 1–1.5 weeks | Backend Engineer B + CYRUS | `sequenceId` + SHA-256 hash-chain on `AuditLog`; cross-node replication verified |

**Phase 1–2 Exit:** Unit 4 merged, all tests green, CYRUS audit chain verification complete → Phase 3 kickoff.

### Phase 1–2 File Touch Map

Files modified by multiple units (source of sequential requirement):

| File | Unit 1 | Unit 2 | Unit 3 | Unit 4 |
|------|--------|--------|--------|--------|
| `/lib/tools/registry.ts` | ✏️ | | ✏️ | |
| `/middleware/rbac.ts` | | ✏️ | ✏️ | |
| `/lib/pipeline/stateMachine.ts` | | | ✏️ | ✏️ |
| `/lib/audit/auditLog.ts` | | | ✏️ | ✏️ |
| `/prisma/schema.prisma` | | | | ✏️ |

---

## Phase 3–4: Clinical Pipeline + Privacy
**Duration:** 8 weeks
**Execution:** **Parallel** (Units 5–10 touch distinct domain files)
**Status:** 🟡 Queued

### Why Parallel?

Units 5–10 are domain-isolated: clinical biomarker logic, consent/privacy layer, drug interaction engine, i18n, and export/erasure routes do not share implementation files. Parallel execution cuts calendar time from 12 weeks to 8.

### Unit Schedule

| Unit | Name | Duration | Owner | Key Deliverables | Blocking Dependency |
|------|------|----------|-------|-----------------|---------------------|
| **Unit 5** | Biomarker Dual-Range Display | 2 weeks | Frontend Engineer + ELENA | All biomarkers display both Pathological + Functional ranges; ELENA sign-off | DQ-6 (biomarker list) |
| **Unit 6** | Consent Layer V2 | 2 weeks | Backend Engineer + RUTH | `emergencyConsent` boolean on `ConsentRecord`; granular consent types enforced; LGPD consent audit hook | DQ-4, DQ-5 |
| **Unit 7** | Drug Interaction Engine | 3 weeks | Senior Engineer + ELENA | `drug_interaction_checker` tool live; severity taxonomy implemented; provenance metadata on all rules | DQ-11 |
| **Unit 8** | LGPD Export/Erasure Routes | 2 weeks | Backend Engineer + RUTH | All export/erasure routes include `legalBasis` field; erasure soft-deletes PHI but retains `AuditLog` | DQ-5 |
| **Unit 9** | i18n Clinical Alerts | 1.5 weeks | Frontend Engineer + PAUL | All clinical alert copy i18n-complete (pt-BR, es-LATAM, en); PAUL UX sign-off | None |
| **Unit 10** | Deterministic Validator V2 Integration | 2 weeks | Senior Engineer + ELENA | V2 integrated into 5-state pipeline; `humanReviewRequired` gate enforced; ELENA + QUINN sign-off | V2 complete (parallel track) |

**Phase 3–4 Exit:** All 6 units merged, tests green, all veto holders cleared → Deployment phase.

### Phase 3–4 Parallel Execution Map

```
Week 7:   [Unit 5 start] [Unit 6 start] [Unit 8 start] [Unit 9 start]
Week 8:   [Unit 5 cont.] [Unit 6 cont.] [Unit 8 cont.] [Unit 9 cont.] [Unit 7 start]
Week 9:   [Unit 5 done✓] [Unit 6 done✓] [Unit 8 done✓] [Unit 9 done✓] [Unit 7 cont.]
Week 10:  [Unit 10 start (V2 complete)] [Unit 7 cont.]
Week 11:  [Unit 10 cont.] [Unit 7 done✓]
Week 12:  [Unit 10 done✓] → Phase 3–4 COMPLETE
Week 13:  [Board docs complete] [Staging deployment begins]
Week 14:  [Deployment/Integration complete] → GA READY
```

---

## Deterministic Validator V2 (Parallel Track)
**Duration:** 4–6 weeks (starts Week 1, runs alongside all phases)
**Owner:** ELENA (spec) + Senior Engineer (implementation)
**Status:** 🟡 Queued (kickoff in Phase 0, Week 1)

| Week | Milestone | Gate |
|------|-----------|------|
| 1–2 | Rule corpus design; ELENA signs off initial ruleset | ELENA sign-off required |
| 3–4 | Core validator engine built; unit tests ≥ 90% | QUINN CI gate |
| 5 | Integration tests with mock pipeline outputs | QUINN |
| 6 | Integration with 5-state pipeline (Unit 10 dependency) | ELENA + QUINN |

**If V2 slips past Week 6:** Unit 10 is blocked. Phase 3–4 exit delayed. This is the primary schedule risk (see Risk Dependencies below).

---

## Deployment / Integration Phase
**Duration:** 2 weeks
**Status:** 🟡 Queued

| Task | Owner | Duration |
|------|-------|----------|
| Staging environment full integration test | QUINN | 3 days |
| ANVISA SaMD documentation package | RUTH | 4 days |
| Performance load test (>80% capacity) | ARCHIE + DevOps | 2 days |
| Security penetration test (CYRUS-led) | CYRUS | 3 days |
| Board docs finalized for stakeholder distribution | Engineering Lead | 1 day |
| GA launch decision + release tag | ARCHIE | 1 day |

---

## Critical Path Analysis

The critical path — the sequence of tasks that directly determines the earliest possible GA date — is:

```
DQ answered (1w) → EdgeNodeClient (2w) → Unit 1 (1.5w) → Unit 2 (1w) → Unit 3 (2w) → Unit 4 (1.5w) → Unit 10 (2w) → Deploy (2w)
= ~14 weeks on critical path (GA at Week 15–16 optimistic, Week 20 conservative)
```

**Critical path tasks:** DQ-7, DQ-10, EdgeNodeClient, Unit 3, Unit 4, V2 completion, Unit 10.
**Float exists on:** Unit 5, 6, 8, 9 (2–4 weeks each), Unit 7 (1 week).

---

## Resource Allocation Matrix

| Phase | Engineers Required | Personas Active | Notes |
|-------|--------------------|-----------------|-------|
| Phase 0 | 2 Backend + 1 Senior | ARCHIE, RUTH, ELENA, CYRUS, QUINN | All leads needed for DQ session |
| Phase 1–2 | 2 Backend | ARCHIE, CYRUS, QUINN | Sequential; 1 engineer per unit alternating |
| Phase 3–4 | 2 Backend + 1 Frontend + 1 Senior | PAUL, RUTH, ELENA, CYRUS, QUINN | Parallel; needs 4-engineer concurrent capacity |
| V2 Track | 1 Senior | ELENA, QUINN | Dedicated; cannot share with Phase 1–2 |
| Deployment | 1 Backend + DevOps | ARCHIE, RUTH, CYRUS, QUINN | DevOps separate from engineering headcount |
| **Peak (Phase 3–4)** | **5 engineers concurrent** | | Budget accordingly |

---

## Risk Dependencies

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Deterministic V2 slips past Week 6 | Medium | High — blocks Unit 10, delays GA 2–4 weeks | Dedicate senior engineer exclusively to V2; ELENA pre-approves rule corpus by Week 1 |
| Design Question 14 (MTS mapping) requires clinical committee | Low-Medium | Medium — blocks Unit 7 (drug interaction) by 1 week | Pre-schedule MTS working session for Week 1 |
| Escalation schema migration fails on production data | Low | High — requires rollback, 1-week delay | Backfill script tested on full production-scale data snapshot before merge |
| CYRUS rejects EdgeNodeClient PII isolation design | Low | Medium — 3–5 day redesign | CYRUS involved in architecture review at Task 1 kickoff, not at review |
| Phase 3–4 parallel unit creates unexpected shared-file conflict | Low | Low — caught in CI | Strict file ownership enforced; cross-unit PR reviews required |
| ANVISA documentation delays SaMD classification | Medium | High for LATAM launch | Begin documentation in Week 1 (parallel with Phase 0); RUTH owns |

---

## Summary: Key Dates (Conservative Estimate from 2026-03-17)

| Milestone | Target Date |
|-----------|------------|
| Phase 0 complete + Go/No-Go decision | ~2026-04-07 |
| Phase 1–2 complete (Unit 4 merged) | ~2026-05-19 |
| Phase 3–4 complete (all units merged) | ~2026-07-14 |
| Deployment phase complete | ~2026-07-28 |
| **GA Launch (conservative)** | **~2026-08-04** |
| **GA Launch (optimistic)** | **~2026-07-07** |
