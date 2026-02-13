# Cortex Pilot Tracker (Example - Week 1)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-13
- Owner: OIL
- Cadence: monfri
- Last Run Mode: friday
- Next Recommended Update: 2026-02-16
<!-- CORTEX_AUTOMATION:END -->

**Country:** Bolivia  
**Site:** Example Site A (inpatient cardiology)  
**Week Ending:** 2026-02-13  
**Note:** Illustrative sample for operational use.

---

## 1) Site Identity

- **Country:** Bolivia
- **Site name:** Example Site A
- **Unit/service line:** Inpatient cardiology
- **Pilot start date:** 2026-02-10
- **Current pilot week #:** 1
- **Site champion:** Dr. Lucia R. (Cardiology)
- **Quality lead:** Maria P. (Quality & Safety)

---

## 2) Weekly KPI Entry

| KPI | This Week | Last Week | Delta | Target | Status | Comments |
|-----|-----------|-----------|-------|--------|--------|----------|
| Eligible cases | 56 | n/a | n/a | n/a | Green | First week baseline |
| Cases with checklist started | 51 | n/a | n/a | n/a | Green | 91% start rate |
| Checklist completion rate | 82% | n/a | n/a | >= 90% | Yellow | Missing lab entries in some shifts |
| Median verification time (seconds) | 104 | n/a | n/a | <= 90s | Yellow | Improving through week |
| Intervention count | 10 | n/a | n/a | track | Green | Expected for initial case mix |
| Override count | 6 | n/a | n/a | explainable | Green | All with reason codes |
| Missing critical data cases | 15 | n/a | n/a | down trend | Yellow | Main source: creatinine timestamp |
| Reminder sent count | 32 | n/a | n/a | track | Green | Post-discharge queue active |
| Reminder reach rate | 96% | n/a | n/a | >= 95% | Green | 1 failed delivery (invalid number) |
| Adherence proxy (%) | 41% | n/a | n/a | >= 60% by day 90 | Yellow | Early baseline |
| Weekly active clinical users (WAU) | 17/23 (74%) | n/a | n/a | >= 70% enrolled | Green | Good first-week adoption |

---

## 3) Override and Safety Review

### Top override reasons (ranked)
| Rank | Reason code | Count | % of overrides | Action owner | Action by date |
|------|-------------|-------|----------------|--------------|----------------|
| 1 | MISSING_RENAL_LAB | 3 | 50% | CL | 2026-02-19 |
| 2 | MED_REC_PENDING | 2 | 33% | OIL | 2026-02-20 |
| 3 | DISCHARGE_TIME_PRESSURE | 1 | 17% | PL | 2026-02-21 |

### Safety-critical notes
- Any near miss or incident this week? **Yes (near misses only)**
- Summary: 2 high-risk dose scenarios flagged before finalization; corrected by clinician.
- Immediate mitigation: reinforced required field guidance in morning handoff.
- Follow-up owner/date: EL/CL by 2026-02-19.

---

## 4) Workflow Friction Log

| Issue | Severity (1-3) | Frequency | Evidence | Owner | ETA |
|-------|-----------------|-----------|----------|-------|-----|
| Missing lab timestamp causes repeat input | 2 | High | `attestation_submitted` spikes Tue/Wed | EL | 2026-02-19 |
| Slower use during night shift | 2 | Medium | median time by shift | OIL | 2026-02-21 |
| Reminder phone formatting errors | 1 | Low | 1 failed delivery event | OIL | 2026-02-18 |

---

## 5) Integrations and Data Quality

| Check | Status | Notes | Owner |
|-------|--------|-------|-------|
| Event ingestion complete | Pass | no missing daily batches | DAL |
| KPI query reconciliation complete | Pass | dashboard matches event table counts | DAL |
| Country profile correctly applied | Pass | `BOLIVIA` in all events | EL |
| Payer-focus metadata captured | Pass | entered on 86% of completed checks | OIL |
| Reminder delivery logs complete | Pass | 31 delivered, 1 failed | EL |

---

## 6) Adoption Notes (Qualitative)

- **What clinicians liked this week**
  - Clear rationale for intervention prompts
  - Faster than expected once familiar with flow
- **What clinicians disliked this week**
  - Extra friction when renal lab timestamp unavailable
  - Some uncertainty on when to use override vs attestation
- **What quality/admin stakeholders asked for**
  - Weekly summary by shift and service
  - Quick view of top override reason trend

---

## 7) Action Plan for Next Week

| Priority | Action | Type | Owner | Due Date | Success Criteria |
|----------|--------|------|-------|----------|------------------|
| P1 | Simplify missing-lab attestation UX | Product | EL | 2026-02-19 | completion +4 points week-over-week |
| P2 | 30-min clinician refresher on override vs attestation | Ops/Clinical | OIL/CL | 2026-02-20 | reduce ambiguous overrides by 30% |
| P3 | Add shift-level KPI view in weekly readout | Analytics | DAL | 2026-02-21 | quality lead confirms usability |

---

## 8) Go/No-Go Readiness

- [x] Completion >= 85% (day 60 milestone path)  
- [ ] Median verification <= 90s  
- [x] Override reasons stable and interpretable  
- [x] Reminder reach >= 95%  
- [x] Champion confidence >= 8/10  
- [x] Leadership support to continue/expand

**Weekly readiness decision:** Continue with targeted changes.

---

## 9) Weekly Sign-off

- **Site champion:** Dr. Lucia R.  
- **Quality lead:** Maria P.  
- **Holi Labs owner:** [Your Name]  
- **Date:** 2026-02-13

---

## Optional CSV Block

```csv
week_ending,country,site,unit,eligible_cases,checklist_started,completion_rate,median_verification_seconds,interventions,overrides,missing_critical_data,reminders_sent,reminder_reach_rate,adherence_proxy,wau,status
2026-02-13,Bolivia,Example Site A,Inpatient Cardiology,56,51,0.82,104,10,6,15,32,0.96,0.41,0.74,Yellow
```

---

## Weekly Auto Log

### 2026-02-13 (FRIDAY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:


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

