# Cortex Weekly Board Scorecard (Example)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-10
- Owner: OIL
- Cadence: monfri
- Last Run Mode: monday
- Next Recommended Update: 2026-02-13
<!-- CORTEX_AUTOMATION:END -->

**Week Ending:** 2026-02-13  
**Overall Status:** Yellow  
**Scope:** Bolivia wave (first pilot site), Brazil/Argentina pre-launch

---

## 1) Executive Snapshot

- **Primary headline:** First Bolivia inpatient cardiology pilot launched with stable usage and measurable workflow throughput in week 1.
- **Primary risk:** Completion rate is below 90% target due to missing renal lab inputs in initial shifts.
- **Primary ask:** Approve sprint priority for faster lab-attestation UX and one-site clinical onboarding session.

---

## 2) Core KPI Scorecard (Target vs Actual)

| KPI | Target | This Week | Last Week | Trend | Status | Notes |
|-----|--------|-----------|-----------|-------|--------|-------|
| Checklist completion rate | >= 90% | 82% | n/a | Up | Yellow | Early adoption week; high missing data share |
| Median verification time | <= 90s | 104s | n/a | Down | Yellow | Improved from day 1 (129s) to day 5 (92s) |
| Intervention rate | track | 18% | n/a | Flat | Green | Expected range for initial deployment |
| Override rate | explainable | 12% | n/a | Flat | Green | Dominant reason: missing recent creatinine |
| Missing critical data rate | down QoQ | 27% | n/a | Down | Yellow | Targeted fix in week 2 |
| Reminder reach rate | >= 95% | 96% | n/a | Flat | Green | WhatsApp delivery stable |
| Follow-up adherence proxy | >= 60% by day 90 | 41% | n/a | Up | Yellow | Early baseline |
| Weekly active clinical users (WAU) | >= 70% enrolled | 74% | n/a | Up | Green | 17/23 enrolled users active |
| Champion NPS | >= 8/10 | 8.1 | n/a | Flat | Green | Strong qualitative feedback |

---

## 3) Country View

| Country | Sites Active | This Week Cases | Completion | Median Time | WAU | Top Risk | Top Win | Next Week Focus |
|---------|--------------|-----------------|------------|-------------|-----|----------|---------|-----------------|
| Bolivia | 1 | 56 | 82% | 104s | 74% | Missing labs at intake | High clinician engagement | Improve attestation flow + refresher training |
| Brazil | 0 | 0 | n/a | n/a | n/a | Site onboarding not started | Stakeholder mapping done | Kickoff scheduling |
| Argentina | 0 | 0 | n/a | n/a | n/a | Site selection pending | Clinical champion identified | Finalize pilot scope |

---

## 4) Product and Delivery Health

| Stream | Milestone | Planned Date | Current Status | Delta | Owner | Blockers |
|--------|-----------|--------------|----------------|-------|-------|----------|
| Safety Engine | DOAC v1 live | 2026-02-12 | On Track | 0d | EL/CL | None |
| Action Console | KPI cards v1 | 2026-02-20 | At Risk | +3d | DAL/EL | Need event reconciliation helper |
| Follow-up Orchestrator | Reminder + escalation v1 | 2026-02-26 | On Track | 0d | EL/OIL | None |
| Integrations | CSV intake adapter v1 | 2026-02-24 | At Risk | +4d | IL | Site export format variance |

---

## 5) Commercial Signal

| Metric | This Week | Last Week | Target | Status | Notes |
|--------|-----------|-----------|--------|--------|-------|
| New pilot conversations | 3 | 2 | 3+ | Green | 1 in Brazil, 2 in Argentina |
| Active pilot stakeholders | 7 | 5 | 6+ | Green | Clinical + quality + IT |
| Expansion requests (new unit/site) | 1 | 0 | 1+ | Green | Bolivia champion requested 2nd unit by month 2 |
| Time-to-value (first KPI movement) | 5 days | n/a | <= 14 days | Green | Verification time improved during week |

---

## 6) Clinical Governance Summary

- **Top 3 override reasons this week**
  1. Missing recent renal function value
  2. Pending med reconciliation during handoff
  3. Discharge timing pressure

- **Protocol changes approved this week**
  - Version: `DOAC-BOL-v1.0.1`
  - Change: clarified attestation text for missing creatinine timestamp
  - Clinical approver: Site cardiology lead

- **Safety incidents / near misses**
  - Count: 0 reportable incidents
  - Summary: two near-miss cases flagged and resolved before completion
  - Corrective action: add quick-link to lab reference field in checklist step 1

---

## 7) Red Flags and Recovery Plan

| Red Flag Trigger | Triggered? | Owner | Recovery Plan | Due Date |
|------------------|------------|-------|---------------|----------|
| Completion < 70% after day 60 | No | PL | Continue weekly monitoring | n/a |
| Median verification > 150s | No | EL | Optimize form focus order | 2026-02-19 |
| "Workflow too slow" overrides > 25% | No (9%) | CL/OIL | Keep micro-training on shift handoff | 2026-02-21 |
| No KPI movement after day 90 | No | DAL | n/a | n/a |

---

## 8) Decisions Needed

| Decision | Why Now | Options | Recommended | Owner | Deadline |
|----------|---------|---------|-------------|-------|----------|
| Country wave sequencing confirmation | Brazil onboarding prep starts next week | Bolivia-only vs Bolivia+Brazil parallel | Bolivia active + Brazil kickoff in parallel | CEO/PL | 2026-02-16 |
| Sprint tradeoff for UX polish | Completion KPI at risk | Keep scope vs prioritize attestation UX | Prioritize attestation UX in sprint | PL/EL | 2026-02-16 |

---

## 9) Next Week Commitments (Top 5)

1. Ship attestation UX improvement for missing labs.
2. Complete KPI reconciliation checks for console metrics.
3. Run one-site refresher training with cardiology champion.
4. Finalize Brazil kickoff agenda and stakeholder roster.
5. Publish first pilot evidence mini-report (week 1 baseline).

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

