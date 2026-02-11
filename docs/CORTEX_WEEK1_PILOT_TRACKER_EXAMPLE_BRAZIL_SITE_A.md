# Cortex Pilot Tracker (Example - Week 1)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-10
- Owner: OIL
- Cadence: monfri
- Last Run Mode: monday
- Next Recommended Update: 2026-02-13
<!-- CORTEX_AUTOMATION:END -->

**Country:** Brazil  
**Site:** Example Site A (inpatient cardiology)  
**Week Ending:** 2026-02-20  
**Note:** Illustrative sample for larger-site rollout assumptions.

---

## 1) Site Identity

- **Country:** Brazil
- **Site name:** Example Site A
- **Unit/service line:** Inpatient cardiology
- **Pilot start date:** 2026-02-17
- **Current pilot week #:** 1
- **Site champion:** Dr. Rafael M. (Cardiology)
- **Quality lead:** Ana T. (Quality & Safety)

---

## 2) Weekly KPI Entry

| KPI | This Week | Last Week | Delta | Target | Status | Comments |
|-----|-----------|-----------|-------|--------|--------|----------|
| Eligible cases | 124 | n/a | n/a | n/a | Green | High-volume tertiary site |
| Cases with checklist started | 106 | n/a | n/a | n/a | Yellow | 85% start rate; onboarding still in progress |
| Checklist completion rate | 76% | n/a | n/a | >= 90% | Yellow | Main gap: shift handoff and pending labs |
| Median verification time (seconds) | 118 | n/a | n/a | <= 90s | Yellow | Improving trend after day 3 |
| Intervention count | 25 | n/a | n/a | track | Green | Expected for broader case complexity |
| Override count | 14 | n/a | n/a | explainable | Yellow | More overrides during night shifts |
| Missing critical data cases | 41 | n/a | n/a | down trend | Yellow | Creatinine timing and med rec completeness |
| Reminder sent count | 58 | n/a | n/a | track | Green | Follow-up queue active |
| Reminder reach rate | 94% | n/a | n/a | >= 95% | Yellow | Formatting issues in some numbers |
| Adherence proxy (%) | 36% | n/a | n/a | >= 60% by day 90 | Yellow | Early baseline |
| Weekly active clinical users (WAU) | 31/48 (65%) | n/a | n/a | >= 70% enrolled | Yellow | Need additional bedside adoption |

---

## 3) Override and Safety Review

### Top override reasons (ranked)
| Rank | Reason code | Count | % of overrides | Action owner | Action by date |
|------|-------------|-------|----------------|--------------|----------------|
| 1 | MISSING_RENAL_LAB | 6 | 43% | CL | 2026-02-26 |
| 2 | DISCHARGE_TIME_PRESSURE | 4 | 29% | OIL | 2026-02-27 |
| 3 | MED_REC_PENDING | 3 | 21% | PL | 2026-02-27 |

### Safety-critical notes
- Any near miss or incident this week? **Yes (near misses only)**
- Summary: 3 near-miss dose scenarios corrected before chart finalization.
- Immediate mitigation: added shift checklist huddle and escalation reminders.
- Follow-up owner/date: EL/CL by 2026-02-26.

---

## 4) Workflow Friction Log

| Issue | Severity (1-3) | Frequency | Evidence | Owner | ETA |
|-------|-----------------|-----------|----------|-------|-----|
| Onboarding inconsistency across shifts | 2 | High | lower completion nights/weekend | OIL | 2026-02-27 |
| Phone number formatting mismatch | 1 | Medium | reminder_failed logs | EL | 2026-02-24 |
| Duplicate manual lab entry in edge cases | 2 | Medium | repeated attestation events | EL | 2026-02-26 |

---

## 5) Integrations and Data Quality

| Check | Status | Notes | Owner |
|-------|--------|-------|-------|
| Event ingestion complete | Pass | all daily batches received | DAL |
| KPI query reconciliation complete | Pass | card totals match event tables | DAL |
| Country profile correctly applied | Pass | `BRAZIL` metadata present | EL |
| Payer-focus metadata captured | Pass | available in 79% of completed checks | OIL |
| Reminder delivery logs complete | Pass | 54 delivered, 4 failed | EL |

---

## 6) Adoption Notes (Qualitative)

- **What clinicians liked this week**
  - Clear “why” behind deterministic warnings
  - Useful override rationale structure for quality reviews
- **What clinicians disliked this week**
  - Extra steps during high discharge load periods
  - Re-entering lab context when source data is incomplete
- **What quality/admin stakeholders asked for**
  - Shift-level and physician-level trend view
  - A simple weekly “improvement actions” summary

---

## 7) Action Plan for Next Week

| Priority | Action | Type | Owner | Due Date | Success Criteria |
|----------|--------|------|-------|----------|------------------|
| P1 | Standardize shift onboarding micro-training (3 sessions) | Ops | OIL | 2026-02-27 | WAU +5 points, completion +6 points |
| P2 | Fix phone normalization for reminders | Product | EL | 2026-02-24 | reach >= 96% by next Friday |
| P3 | Add shift trend cuts to weekly report | Analytics | DAL | 2026-02-28 | quality lead confirms usefulness |

---

## 8) Go/No-Go Readiness

- [ ] Completion >= 85% (day 60 milestone path)  
- [ ] Median verification <= 90s  
- [x] Override reasons stable and interpretable  
- [ ] Reminder reach >= 95%  
- [ ] Champion confidence >= 8/10  
- [x] Leadership support to continue/expand

**Weekly readiness decision:** Continue with focused remediation plan.

---

## 9) Weekly Sign-off

- **Site champion:** Dr. Rafael M.  
- **Quality lead:** Ana T.  
- **Holi Labs owner:** [Your Name]  
- **Date:** 2026-02-20

---

## Optional CSV Block

```csv
week_ending,country,site,unit,eligible_cases,checklist_started,completion_rate,median_verification_seconds,interventions,overrides,missing_critical_data,reminders_sent,reminder_reach_rate,adherence_proxy,wau,status
2026-02-20,Brazil,Example Site A,Inpatient Cardiology,124,106,0.76,118,25,14,41,58,0.94,0.36,0.65,Yellow
```

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

