# On-Call Rotation & Incident Escalation Guide

## Overview
This document outlines the on-call rotation schedule, escalation policies, and handoff procedures for the Holi Labs engineering team. Operating a HIPAA-compliant healthcare system requires 24/7 availability for critical P1 incidents.

## 1. Rotation Schedule

The primary rotation is divided into weekly shifts. Handoff occurs every **Monday at 10:00 AM Local Time** during the weekly engineering sync.

- **Primary On-Call:** First responder to all alerts. Expected to acknowledge P1 alerts within 15 minutes.
- **Secondary On-Call:** Backup responder. Gets paged if Primary does not acknowledge within 15 minutes.

### Current Schedule (Template)
| Week | Dates | Primary On-Call | Secondary On-Call |
|---|---|---|---|
| Week 1 | [Date] - [Date] | [Name 1] | [Name 2] |
| Week 2 | [Date] - [Date] | [Name 2] | [Name 3] |
| Week 3 | [Date] - [Date] | [Name 3] | [Name 4] |
| Week 4 | [Date] - [Date] | [Name 4] | [Name 1] |

*(Schedule managed and tracked in PagerDuty)*

## 2. Escalation Policy

Alerts are routed through PagerDuty based on severity.

### Severity Levels
*   **SEV-1 (Critical):** Complete system outage, data breach, or loss of critical functionality (e.g., Doctors cannot access the system). 
    *   **Response Time:** 15 minutes (24/7).
    *   **Action:** Immediate page to Primary. Auto-escalate to Secondary after 15m. Auto-escalate to Engineering Manager after 30m.
*   **SEV-2 (High):** Major feature degraded, but system is usable.
    *   **Response Time:** 30 minutes (Business Hours), Next Business Day (Off-hours).
    *   **Action:** Slack notification and high-urgency page during business hours.
*   **SEV-3 (Medium/Low):** Minor bug, cosmetic issue, or isolated failure.
    *   **Response Time:** 24-48 hours. Ticket created for triage.

### Escalation Path for SEV-1
1.  **Immediate:** PagerDuty calls/texts **Primary**.
2.  **+15 mins (unacknowledged):** PagerDuty calls/texts **Secondary**.
3.  **+30 mins (unacknowledged):** PagerDuty calls/texts **Engineering Manager / CTO**.
4.  **+1 hour (unresolved):** Create bridge (Google Meet) and page required domain experts.

## 3. Communication Matrix

| Role | Name | Phone Number | Slack Handle |
|---|---|---|---|
| Engineering Manager | [Name] | [Phone] | @[Slack] |
| DevSecOps / Infra | [Name] | [Phone] | @[Slack] |
| Compliance Officer | [Name] | [Phone] | @[Slack] |
| CTO | [Name] | [Phone] | @[Slack] |

## 4. Shift Handoff Checklist

**Outgoing Primary On-Call must complete:**
- [ ] Review all triggered alerts from the past week.
- [ ] Ensure all resolved incidents have a drafted post-mortem (if SEV-1 or SEV-2).
- [ ] Brief the incoming Primary on any ongoing monitoring situations or known degraded systems.
- [ ] Verify PagerDuty schedule override is set if swapping shifts manually.

**Incoming Primary On-Call must complete:**
- [ ] Acknowledge shift acceptance in the `#eng-oncall` Slack channel.
- [ ] Verify phone volume/DND bypass is correctly configured for PagerDuty calls.
- [ ] Review the `WHATS_LEFT_MASTER_PLAN.md` and active runbooks.

## 5. Active Incident Runbooks
When responding to an alert, immediately refer to the relevant runbook:
- System Down: `docs/runbooks/API_SERVER_DOWN.md`
- DB Issues: `docs/runbooks/DATABASE_FAILURE.md`
- Breach/Security: `docs/runbooks/DATA_BREACH_RESPONSE.md`
- Audit/HIPAA: `docs/runbooks/HIPAA_AUDIT_LOG_FAILURE.md`
- Caching: `docs/runbooks/REDIS_FAILURE.md`
