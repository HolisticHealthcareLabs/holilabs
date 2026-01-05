# On-Call Guide
**Version:** 1.0
**Last Updated:** 2026-01-01
**Owner:** DevOps Team
**Review Cycle:** Quarterly

---

## Welcome to On-Call! 👋

Being on-call is a critical responsibility at Holi Labs. As an on-call engineer, you are the first responder for production incidents, ensuring our healthcare platform remains available and secure for patients and clinicians.

**This guide will help you:**
- Prepare for your on-call shift
- Respond effectively to incidents
- Know when and how to escalate
- Maintain your well-being during on-call

**Remember:** You are not alone. Escalate early and often. No one expects you to solve everything solo, especially at 3 AM.

---

## Table of Contents

1. [On-Call Overview](#1-on-call-overview)
2. [Before Your Shift](#2-before-your-shift)
3. [During Your Shift](#3-during-your-shift)
4. [Responding to Alerts](#4-responding-to-alerts)
5. [Common Scenarios](#5-common-scenarios)
6. [Escalation Guide](#6-escalation-guide)
7. [After Your Shift](#7-after-your-shift)
8. [On-Call Best Practices](#8-on-call-best-practices)
9. [Tools and Access](#9-tools-and-access)
10. [FAQ](#10-faq)

---

## 1. On-Call Overview

### 1.1 On-Call Schedule

**Rotation:** Weekly (Monday 9:00 AM to Monday 9:00 AM)
**Platform:** PagerDuty
**Compensation:** On-call stipend + overtime pay for incident response

**Typical Rotation:**
```
Week 1: Engineer A (Primary) + Engineer B (Secondary)
Week 2: Engineer B (Primary) + Engineer C (Secondary)
Week 3: Engineer C (Primary) + Engineer A (Secondary)
...
```

**Primary On-Call:**
- First responder to all alerts
- Expected to acknowledge within 5 minutes
- Handle P1/P2/P3 incidents
- Escalate to secondary if overwhelmed

**Secondary On-Call:**
- Backup for primary (responds after 10 minutes if primary unavailable)
- Available for consultation
- Shares on-call duties if multiple simultaneous incidents

---

### 1.2 Expected Response Times

| Alert Severity | Acknowledgment | Initial Assessment | Expected Resolution |
|----------------|----------------|-------------------|-------------------|
| **P1 (Critical)** | < 5 minutes | < 15 minutes | < 1 hour |
| **P2 (High)** | < 15 minutes | < 30 minutes | < 4 hours |
| **P3 (Medium)** | < 1 hour | < 2 hours | < 24 hours |
| **P4 (Low)** | Next business day | Next business day | < 1 week |

**Important:** These are acknowledgment and assessment times, not necessarily resolution times. For complex P1 incidents, you may need >1 hour to resolve, but you should acknowledge within 5 minutes and provide regular updates.

---

### 1.3 What Counts as "On-Call Work"

**Compensated:**
- Responding to alerts (phone, Slack, PagerDuty)
- Incident investigation and resolution
- Post-incident documentation
- Preventive actions during on-call period

**Not Compensated:**
- Regular work you choose to do during on-call
- Reading documentation proactively
- Scheduled meetings

**Gray Area (Talk to Manager):**
- Proactively fixing issues before they alert
- Improving monitoring/alerting during on-call

---

## 2. Before Your Shift

### 2.1 Pre-On-Call Checklist (Complete 24 Hours Before)

#### Step 1: Verify Access and Tools (15 minutes)

- [ ] **PagerDuty notifications working**
  ```bash
  # Test PagerDuty alert (via web UI)
  # Settings > Test Notification
  # Should receive: phone call + SMS + push notification
  ```

- [ ] **VPN access configured**
  ```bash
  # Connect to VPN and verify
  # (If using VPN for production access)
  ```

- [ ] **Database read-only access**
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  # Should return PostgreSQL version
  ```

- [ ] **Cloud console access (DigitalOcean)**
  ```bash
  # Log in: https://cloud.digitalocean.com/
  # Verify: Can view droplets, database, load balancer
  ```

- [ ] **AWS console access (S3 logs/backups)**
  ```bash
  # Log in: https://console.aws.amazon.com/
  # Verify: Can access holi-logs and holi-database-backups buckets
  ```

- [ ] **Secrets access (Doppler)**
  ```bash
  # Log in: https://dashboard.doppler.com/
  # Verify: Can view production secrets (read-only)
  ```

- [ ] **Monitoring dashboards**
  ```bash
  # Grafana: https://metrics.holilabs.xyz/
  # Sentry: https://sentry.io/holi-labs/
  # CloudWatch: https://console.aws.amazon.com/cloudwatch/
  ```

- [ ] **Communication channels**
  ```bash
  # Slack: Ensure you're in #incidents, #alerts, #on-call
  # Email: Check email is working (PagerDuty uses email as backup)
  ```

---

#### Step 2: Review Recent Incidents (15 minutes)

```bash
# Read incident reports from past 2 weeks
ls -lt /Users/nicolacapriroloteran/prototypes/holilabsv2/incident-reports/ | head -5

# Review recent alerts in PagerDuty
# https://holilabs.pagerduty.com/incidents
# Look for:
# - Recurring issues (know the fixes)
# - False positives (know to ignore)
# - Seasonal patterns (e.g., Monday morning traffic spikes)
```

---

#### Step 3: Read Key Runbooks (30 minutes)

**Must-Read Runbooks:**
- [ ] `/docs/runbooks/API_SERVER_DOWN.md` (most common P1)
- [ ] `/docs/runbooks/DATABASE_FAILURE.md` (most critical P1)
- [ ] `/docs/runbooks/SECURITY_INCIDENT.md` (know when to escalate)
- [ ] `/docs/INCIDENT_RESPONSE_PLAN.md` (process overview)

**Skim These:**
- [ ] `/docs/runbooks/REDIS_FAILURE.md`
- [ ] `/docs/runbooks/HIPAA_AUDIT_LOG_FAILURE.md`
- [ ] `/docs/OPS_MANUAL.md` (sections 3 and 8)

---

#### Step 4: Prepare Your Environment (10 minutes)

**On Your Laptop:**
```bash
# 1. Clone/update repository
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
git pull origin main

# 2. Open critical links in browser tabs
# - Grafana: https://metrics.holilabs.xyz/d/overview
# - Sentry: https://sentry.io/holi-labs/
# - PagerDuty: https://holilabs.pagerduty.com/
# - Status Page Admin: https://manage.statuspage.io/

# 3. Test quick commands
curl https://api.holilabs.xyz/api/health
psql $DATABASE_URL -c "SELECT 1;"

# 4. Keep laptop charged and near you
# 5. Ensure phone volume is MAX (critical for nighttime alerts)
```

**On Your Phone:**
- [ ] PagerDuty app installed and notifications enabled
- [ ] Slack app installed
- [ ] Phone charged and ringer volume MAX
- [ ] Set alarm for on-call shift start time (so you don't forget)

---

#### Step 5: Review Handoff from Previous On-Call (10 minutes)

**Handoff Meeting (Optional but Recommended):**
Meet with the previous on-call engineer for 15 minutes to discuss:
- Any ongoing issues
- Recent incidents and resolutions
- Known issues to watch for
- Upcoming maintenance windows

**Handoff Template:**
```markdown
# On-Call Handoff - 2026-01-01

**From:** [Previous On-Call Engineer]
**To:** [Your Name]

## Ongoing Issues
- [ ] Issue 1: Description (expected resolution: date)
- [ ] Issue 2: Description

## Recent Incidents (Past Week)
- 2025-12-28: API latency spike (resolved - DB query optimization)
- 2025-12-30: Redis connection timeout (resolved - Upstash restart)

## Known Issues (Not Yet Fixed)
- Occasional 429 rate limit errors on /api/search (investigating)
- Slow query on patient export (optimization planned)

## Upcoming Maintenance
- 2026-01-05: Database minor version upgrade (30-minute downtime, 2am)

## Notes
- High traffic expected Monday AM (holiday weekend ending)
- CTO on vacation (escalate to VP Eng if needed)
```

---

### 2.2 On-Call Readiness Self-Check

**Am I ready for on-call?**

- [ ] I can acknowledge PagerDuty alerts within 5 minutes
- [ ] I have reliable internet access (home + backup)
- [ ] I have my laptop charged and accessible
- [ ] I know where to find runbooks
- [ ] I know who to escalate to
- [ ] I've read recent incident reports
- [ ] I understand the incident response process
- [ ] I know how to update the status page
- [ ] I have all access credentials (DB, cloud, monitoring)
- [ ] My phone volume is MAX and PagerDuty app is working

**If you answered "no" to any of these, address it before your shift starts.**

---

## 3. During Your Shift

### 3.1 What to Expect

**Typical Week:**
- **0-5 alerts** (average: 2)
- **0-2 P1/P2 incidents** (average: 0.5)
- **Most alerts:** Auto-resolve or false positives
- **Most incidents:** Resolved within 1 hour

**Alert Volume by Day/Time:**
```
Highest: Monday 9am-12pm (morning traffic, deployments)
Moderate: Tuesday-Thursday business hours
Lowest: Weekends and nights (2am-6am)
```

**You May Get Alerted For:**
- API server down or degraded
- Database connection issues
- High error rates
- Failed deployments
- Security events (failed auth spikes)
- Resource exhaustion (disk, memory, connections)

---

### 3.2 Staying Alert-Ready

**During Business Hours (9am-6pm):**
- Keep laptop open with monitoring dashboards visible
- Keep phone on loud/vibrate
- Stay within 5 minutes of your laptop
- Let your team know you're on-call (they'll be understanding)

**During Evenings/Nights (6pm-9am):**
- Keep phone by bedside (MAX volume + vibrate)
- Keep laptop charged near bed
- Consider sleeping with phone under pillow (serious!)
- Plan light activities (no alcohol, avoid loud environments)

**During Weekends:**
- Keep phone and laptop accessible
- Avoid remote locations without internet
- Let family know you may need to step away
- Plan activities near home if possible

**Important:** Take breaks! Just ensure you can respond within 5 minutes.

---

### 3.3 Daily On-Call Routine

**Morning (within 1 hour of waking):**
```bash
# Run morning health check (see OPS_MANUAL.md Section 2.1)
curl https://api.holilabs.xyz/api/health | jq .

# Check for overnight alerts (that auto-resolved)
# PagerDuty > Incidents > Last 24 hours

# Post in Slack #on-call
"Good morning! On-call engineer here. All systems healthy. 0 incidents overnight."
```

**End of Day:**
```bash
# Check for any latent issues before bed
# Review Grafana dashboards for anomalies
# Review Sentry for error trends

# Set phone to MAX volume (if going to sleep)
```

---

## 4. Responding to Alerts

### 4.1 Alert Response Workflow

```
┌─────────────────────────────────────┐
│ 🚨 ALERT RECEIVED                   │
│ (Phone rings, SMS, push notification)│
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 1: ACKNOWLEDGE (< 5 minutes)   │
│ - Stop paging: Open PagerDuty app   │
│ - Click "Acknowledge"               │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 2: ASSESS (< 15 minutes)       │
│ - What's the alert?                 │
│ - What system is affected?          │
│ - What's the severity?              │
│ - Is there a runbook?               │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 3: COMMUNICATE                 │
│ - Create Slack #incident channel    │
│ - Update status page (if customer-facing)│
│ - Set expectations (next update time)│
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 4: INVESTIGATE & FIX           │
│ - Follow runbook (if exists)        │
│ - Check logs, metrics, dashboards   │
│ - Apply fix or escalate             │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 5: VERIFY & COMMUNICATE        │
│ - Verify issue resolved             │
│ - Update Slack and status page      │
│ - Resolve PagerDuty incident        │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Step 6: DOCUMENT                    │
│ - Document timeline in Slack thread │
│ - Create post-mortem (P1/P2)       │
│ - Update runbook (if gaps found)    │
└─────────────────────────────────────┘
```

---

### 4.2 Step-by-Step Alert Response

#### Step 1: Acknowledge the Alert (< 5 minutes)

**Goal:** Stop the paging, give yourself time to assess

**Actions:**
```bash
# 1. Open PagerDuty (app or web)
# https://holilabs.pagerduty.com/incidents

# 2. Click the incident

# 3. Click "Acknowledge"
# - This stops paging you
# - Gives you time to investigate
# - Alerts your team you're working on it

# 4. Read the alert details
# - Alert name (e.g., "APIServerDown")
# - Triggered time
# - Alert description
# - Runbook link (if provided)
```

**Important:** Even if you're confused or don't know what to do yet, acknowledge first. This stops the paging and gives you breathing room.

---

#### Step 2: Assess the Situation (< 15 minutes)

**Goal:** Understand what's happening, how severe, and whether you can handle it

**Questions to Answer:**
1. **What system is affected?** (API, database, Redis, etc.)
2. **What's the user impact?** (Service down? Degraded? No impact yet?)
3. **What's the severity?** (P1/P2/P3/P4)
4. **Is there a runbook?** (Check alert description or `/docs/runbooks/`)
5. **Do I have the skills to fix this?** (If no, escalate immediately)

**Quick Checks:**
```bash
# Check health endpoint
curl https://api.holilabs.xyz/api/health
# Expected: {"status": "healthy"} (if API is up)

# Check Grafana dashboard
# https://metrics.holilabs.xyz/d/overview
# Look for: Red panels, spike in errors, drop in traffic

# Check Sentry for recent errors
# https://sentry.io/holi-labs/errors/
# Look for: New error types, error rate spike

# Check recent deployments (could be a bad deploy)
# GitHub: https://github.com/holilabs/holilabsv2/deployments
# Look for: Deploy in last 30 minutes
```

**Severity Assessment:**

| User Impact | Severity | Example |
|-------------|----------|---------|
| **Service completely down** | P1 | API returns 500 to all requests |
| **Critical feature broken** | P1 | Users can't log in |
| **Service degraded significantly** | P2 | API latency >3 seconds |
| **Minor feature broken** | P3 | Export button not working |
| **No user impact yet** | P3/P4 | Warning threshold reached |

---

#### Step 3: Communicate Status (Immediately After Assessment)

**Goal:** Let stakeholders know you're working on it and what to expect

**For P1/P2 Incidents:**

```bash
# 1. Create Slack incident channel
# Name: #incident-YYYY-MM-DD-HHMM
# Example: #incident-2026-01-01-1432

# 2. Invite key people
# - @incident-response-team (auto-invites IC, Tech Lead, Security Lead)
# - @cto (for P1 only)

# 3. Post initial status (template below)
```

**Initial Status Template:**
```
📌 INCIDENT: [Brief Description]
**Severity:** P1 / P2 / P3
**Status:** Investigating
**Impact:** [User-facing impact, e.g., "API unavailable to all users"]
**Started:** [Timestamp]
**Incident Commander:** @[your-name]

**Next update:** [Time - e.g., 15 minutes for P1]

**Runbook:** /docs/runbooks/[RUNBOOK_NAME].md (if applicable)
**Dashboards:**
- Grafana: https://metrics.holilabs.xyz/d/overview
- Sentry: https://sentry.io/holi-labs/
```

**Update Status Page (for customer-facing P1/P2):**
```bash
# https://manage.statuspage.io/

# 1. Create incident
# Title: "Service Disruption - Investigating"
# Status: "Investigating"
# Components Affected: "API" or "Web Application"

# 2. Write update
# Template:
"We are currently investigating reports of [ISSUE]. Users may experience
[IMPACT]. We will provide an update within 15 minutes."

# 3. Notify subscribers (checkbox)
```

---

#### Step 4: Investigate and Fix

**Goal:** Resolve the issue or gather enough information to escalate

**If Runbook Exists:**
```bash
# 1. Open runbook
cat /docs/runbooks/API_SERVER_DOWN.md

# 2. Follow checklist step-by-step
# - Don't skip steps
# - Document each step in Slack incident channel
# - If a step doesn't work, note it and continue

# 3. If runbook doesn't resolve issue, escalate (see Section 6)
```

**If No Runbook Exists (Investigation Mode):**
```bash
# General troubleshooting workflow:

# 1. Check application logs
docker logs holi-web-1 --tail 100 --follow

# Look for:
# - Error messages
# - Stack traces
# - Unusual patterns
# - Timestamps matching incident start

# 2. Check database
psql $DATABASE_URL -c "
  SELECT
    count(*) as active_connections,
    state
  FROM pg_stat_activity
  GROUP BY state;
"

# Look for:
# - Too many connections (>20 out of 25)
# - Long-running queries
# - Lock waits

# 3. Check resource utilization
# CPU, memory, disk space (via DigitalOcean console or Grafana)

# 4. Check recent changes
git log --since="1 hour ago" --oneline
# Did a recent deployment cause this?

# 5. Check external dependencies
# - Upstash Redis status: https://status.upstash.com/
# - AWS S3 status: https://status.aws.amazon.com/
# - Anthropic API status: https://status.anthropic.com/

# 6. If you're stuck, escalate (see Section 6)
```

**Common Quick Fixes:**

| Problem | Quick Fix | Command |
|---------|-----------|---------|
| **API unresponsive** | Restart container | `docker-compose restart web` |
| **Database connections exhausted** | Kill idle connections | `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 min'` |
| **Disk full** | Clear logs | `find /var/log -name "*.log" -mtime +7 -delete` |
| **Bad deployment** | Rollback | `git checkout HEAD~1 && docker-compose up -d --build` |
| **Redis down** | Service continues (fail-open) | No action needed, monitor |

---

#### Step 5: Verify Resolution and Communicate

**Goal:** Confirm the issue is fixed and let everyone know

**Verification Steps:**
```bash
# 1. Check health endpoint (should be healthy)
curl https://api.holilabs.xyz/api/health | jq .

# 2. Check metrics (should be normal)
# Grafana: Error rate back to <1%, latency back to <500ms

# 3. Check error rate (should be low)
# Sentry: No new errors in last 5 minutes

# 4. Monitor for 10-15 minutes
# Ensure issue doesn't immediately recur
```

**Communication:**

**Update Slack Incident Channel:**
```
✅ RESOLVED

**Resolution:** [What fixed it, e.g., "Restarted web containers"]
**Root Cause:** [Brief explanation, e.g., "Memory leak caused OOM"]
**Resolution Time:** [Start time] - [End time] ([Duration, e.g., 45 minutes])

**Monitoring:** Watching closely for next 30 minutes

**Next Steps:**
- [ ] Post-mortem scheduled (for P1/P2)
- [ ] Follow-up action items (if any)
```

**Update Status Page:**
```
# https://manage.statuspage.io/

# 1. Update incident status to "Resolved"
# 2. Write resolution message:
"The issue has been resolved. All systems are operating normally. We will
continue to monitor closely."

# 3. Click "Publish"
```

**Resolve PagerDuty Incident:**
```
# PagerDuty > Incident > Resolve
# Add resolution note: "Restarted web containers, monitoring closely"
```

---

#### Step 6: Document the Incident

**Goal:** Create a record for future reference and learning

**Immediate Documentation (within 1 hour of resolution):**
```bash
# In Slack incident channel, document:
# 1. Timeline (key events with timestamps)
# 2. Root cause (what actually caused it)
# 3. Resolution steps (what fixed it)
# 4. Lessons learned (what could be improved)

# Example:
```

**Timeline:**
```
14:32 - Alert: APIServerDown
14:33 - Acknowledged alert, began investigation
14:35 - Created #incident-2026-01-01-1432
14:37 - Identified issue: Memory usage at 99%
14:45 - Restarted web containers
14:50 - Health checks passing
14:55 - Monitoring, no errors
15:10 - Declared resolved
```

**Post-Mortem (Required for P1/P2, within 72 hours):**
See `/docs/INCIDENT_RESPONSE_PLAN.md` Section 6 for post-mortem template

---

## 5. Common Scenarios

### 5.1 Scenario: "API Server Down" Alert (P1)

**Alert:** `APIServerDown - API health check failing for >2 minutes`

**Response:**
```bash
# Step 1: Acknowledge alert (PagerDuty)

# Step 2: Verify API is actually down
curl https://api.holilabs.xyz/api/health
# If returns error, API is down. If returns 200, false alarm.

# Step 3: Create incident channel
# Slack > Create channel: #incident-YYYY-MM-DD-HHMM

# Step 4: Update status page
# https://manage.statuspage.io/ > Create Incident

# Step 5: Check if containers are running
docker ps | grep holi-web
# If no containers running, restart:
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
docker-compose -f docker-compose.prod.yml up -d

# Step 6: Check logs for crash reason
docker logs holi-web-1 --tail 100

# Step 7: If restart doesn't work, escalate to Tech Lead
# Step 8: Once resolved, verify and communicate
```

**Typical Resolution Time:** 15-30 minutes
**Escalate If:** Restart doesn't work, issue persists >30 minutes

---

### 5.2 Scenario: "High Failed Auth Rate" Alert (P2)

**Alert:** `HighFailedAuthRate - >10 failed login attempts in last hour`

**Response:**
```bash
# Step 1: Acknowledge alert

# Step 2: Investigate - is this a brute force attack?
psql $DATABASE_URL -c "
  SELECT
    ip_address,
    COUNT(*) as attempts,
    MIN(timestamp) as first_attempt,
    MAX(timestamp) as last_attempt
  FROM audit_logs
  WHERE
    action = 'LOGIN_FAILED'
    AND timestamp >= NOW() - INTERVAL '1 hour'
  GROUP BY ip_address
  HAVING COUNT(*) > 5
  ORDER BY attempts DESC;
"

# Step 3: If attacks from specific IPs, consider blocking
# (Requires escalation to Security Lead for decision)

# Step 4: Notify Security Lead via Slack #security-alerts

# Step 5: Monitor for continued attacks

# Step 6: If attack intensifies, escalate to P1
```

**Typical Resolution Time:** Monitoring/investigation (may be ongoing)
**Escalate If:** Attack intensifies (>100/hour), or if you see evidence of successful unauthorized access

---

### 5.3 Scenario: "Database Connection Pool Exhausted" (P2)

**Alert:** `HighDatabaseConnections - Using >90% of connection pool`

**Response:**
```bash
# Step 1: Acknowledge alert

# Step 2: Check current connections
psql $DATABASE_URL -c "
  SELECT
    application_name,
    state,
    COUNT(*) as conn_count
  FROM pg_stat_activity
  GROUP BY application_name, state
  ORDER BY conn_count DESC;
"

# Step 3: Check for long-running queries
psql $DATABASE_URL -c "
  SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND now() - pg_stat_activity.query_start > interval '1 minute'
  ORDER BY duration DESC;
"

# Step 4: If you see idle connections hanging, kill them
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes';
"

# Step 5: If issue persists, check for connection leak in application
# (Escalate to Tech Lead)

# Step 6: Monitor connection pool utilization
```

**Typical Resolution Time:** 10-20 minutes (kill idle connections)
**Escalate If:** Connections remain high after cleanup, or issue recurs frequently

---

### 5.4 Scenario: "Disk Space Low" Alert (P3)

**Alert:** `DiskSpaceLow - Disk usage >80%`

**Response:**
```bash
# Step 1: Acknowledge alert

# Step 2: Check what's using disk space
df -h
du -h /var/lib/postgresql/data | sort -rh | head -20

# Step 3: Clear old logs (safe)
find /var/log -name "*.log" -mtime +7 -delete
docker system prune -a --volumes  # Clear old Docker images/volumes

# Step 4: If PostgreSQL logs are large, archive them
cd /var/lib/postgresql/data/pg_log
tar -czf archived-logs-$(date +%Y%m%d).tar.gz *.log.1 *.log.2
rm *.log.1 *.log.2
aws s3 cp archived-logs-*.tar.gz s3://holi-database-backups/archived-logs/

# Step 5: If still low, check for old audit logs
psql $DATABASE_URL -c "
  SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
  FROM audit_logs;
"
# If audit logs are excessive, consider archiving old ones (>90 days)

# Step 6: If still low, expand disk (escalate to DevOps Lead)
```

**Typical Resolution Time:** 20-30 minutes
**Escalate If:** Can't clear enough space, or disk >95% full (urgent)

---

### 5.5 Scenario: "Deployment Failed" Alert (P2/P3)

**Alert:** `DeploymentFailed - CI/CD pipeline failed in production deployment`

**Response:**
```bash
# Step 1: Acknowledge alert

# Step 2: Check deployment logs
# GitHub Actions: https://github.com/holilabs/holilabsv2/actions
# Look for failed step and error message

# Step 3: Assess impact
# - Did deployment partially complete? (some servers updated, some not)
# - Is service still running on old version? (good)
# - Is service down? (P1 - escalate immediately)

# Step 4: If service is down, rollback immediately
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d --build

# Step 5: If service is running (old version), investigate deployment failure
# Common causes:
# - Test failure (check test logs)
# - Build failure (check build logs)
# - Docker registry issue (check registry status)

# Step 6: Notify team in #deployments Slack channel
# Don't attempt to re-deploy until issue understood

# Step 7: Escalate to Tech Lead if unclear
```

**Typical Resolution Time:** 10-30 minutes (rollback) or defer to business hours
**Escalate If:** Service is down, or if deployment issue is unclear

---

### 5.6 Scenario: False Alarm / Auto-Resolved Alert

**Alert:** `HighAPILatency - p95 latency >1000ms` (but auto-resolves before you investigate)

**Response:**
```bash
# Step 1: Acknowledge/resolve alert in PagerDuty

# Step 2: Quick check - was it a real spike or false alarm?
# Grafana: Look at latency graph over past hour
# - Sharp spike then recovery = temporary issue (acceptable)
# - Sustained high latency = investigate further

# Step 3: Check if anything unusual happened at that time
# - Deployment?
# - Traffic spike?
# - Database maintenance?

# Step 4: Document in Slack #on-call (optional)
"FYI: HighAPILatency alert auto-resolved. Brief spike at 14:32, likely due to
morning traffic surge. No action needed."

# Step 5: If this alert fires frequently and auto-resolves, consider tuning
# (Discuss with team - may need to adjust threshold or add cooldown)
```

**Typical Resolution Time:** 5 minutes (just verification)
**Escalate If:** Alert fires repeatedly (>3 times in 24 hours)

---

## 6. Escalation Guide

### 6.1 When to Escalate

**Escalate Immediately If:**
- You don't understand the issue (no shame - escalate!)
- Issue is outside your expertise (e.g., database internals, networking)
- **PHI breach suspected** (escalate to Security Lead + Compliance Officer)
- Issue persists despite following runbook
- Multiple simultaneous incidents (overwhelmed)
- You need to step away (personal emergency, exhaustion)

**Escalate Within 30 Minutes If:**
- P1 incident not resolved within 30 minutes
- You're making no progress
- Issue is escalating (degradation → complete outage)

**Don't Escalate If:**
- Minor P3/P4 issue that can wait until business hours
- You're making progress and close to resolution
- Issue is within your skillset and you're confident

**Remember:** It's better to escalate early than to spend 2 hours stuck. No one will blame you for escalating.

---

### 6.2 Escalation Paths

```
┌─────────────────────────────────────┐
│ PRIMARY ON-CALL ENGINEER (You)      │
└───────────┬─────────────────────────┘
            │
            │ Overwhelmed? Need backup?
            ▼
┌─────────────────────────────────────┐
│ SECONDARY ON-CALL ENGINEER          │
│ (10-minute timeout if primary unresponsive)│
└───────────┬─────────────────────────┘
            │
            │ Technical expertise needed?
            ▼
┌─────────────────────────────────────┐
│ TECHNICAL LEAD / SENIOR ENGINEER    │
│ (Deep technical expertise)          │
└───────────┬─────────────────────────┘
            │
            │ P1 not resolved in 1 hour?
            ▼
┌─────────────────────────────────────┐
│ CTO                                 │
│ (Executive decision-making)         │
└───────────┬─────────────────────────┘
            │
            │ Major incident, customer/board impact?
            ▼
┌─────────────────────────────────────┐
│ CEO                                 │
│ (External communication, legal)     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ SECURITY LEAD                       │
│ (PHI breach, security incident)     │
│ Escalate in parallel for security issues│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ COMPLIANCE OFFICER                  │
│ (HIPAA breach determination)        │
│ Escalate immediately if PHI breach  │
└─────────────────────────────────────┘
```

---

### 6.3 How to Escalate

#### Method 1: PagerDuty Escalation (Automatic)

```bash
# PagerDuty will auto-escalate if:
# - You don't acknowledge within 5 minutes → Secondary on-call paged
# - You don't resolve within configured timeout → Next escalation tier

# Manual escalation:
# PagerDuty > Incident > "Escalate" button > Select escalation policy
```

#### Method 2: Slack (Preferred for Non-Urgent)

```bash
# In the #incident-YYYY-MM-DD-HHMM channel:
@tech-lead Hey, I need help with this incident. I've tried [X, Y, Z] but
issue persists. Can you take a look?

# Or in #on-call channel:
@secondary-oncall Can you jump in on #incident-2026-01-01-1432? I could use
a second pair of eyes.
```

#### Method 3: Phone Call (Urgent P1)

```bash
# For urgent P1 incidents, call directly:
# Tech Lead: [Phone Number]
# CTO: [Phone Number]

# Script:
"Hi, this is [Your Name], I'm on-call. We have a P1 incident - [brief description].
I've tried [X, Y] but it's not working. I need your help."
```

---

### 6.4 Escalation Template

When escalating, provide this information:

```markdown
# Escalation Request

**Incident:** #incident-2026-01-01-1432
**Severity:** P1 / P2
**Issue:** [Brief description, e.g., "API server down, restart didn't work"]
**Impact:** [User impact, e.g., "All users unable to access application"]
**Started:** [Time]
**What I've Tried:**
- [Action 1]
- [Action 2]
- [Action 3]

**Why I'm Escalating:**
[e.g., "Issue is outside my expertise - looks like database corruption"]

**Runbook Used:** [Link or "No runbook available"]
**Dashboards:** [Links to Grafana, Sentry]
```

---

## 7. After Your Shift

### 7.1 Handoff to Next On-Call

**Handoff Meeting (Optional but Recommended):**
- **When:** Within 1 hour of shift end (e.g., Monday 9-10am)
- **Who:** You + Next on-call engineer
- **Duration:** 15 minutes

**Handoff Checklist:**
- [ ] Review any ongoing incidents
- [ ] Share recent incidents and resolutions
- [ ] Highlight known issues to watch for
- [ ] Mention upcoming maintenance windows
- [ ] Transfer any open tickets or follow-ups

**Handoff Document:**
Use the template from Section 2.1 Step 5 (Handoff from Previous On-Call)

---

### 7.2 Post-On-Call Checklist

- [ ] **Resolve all PagerDuty incidents** (if closed)
- [ ] **Complete post-mortems** for P1/P2 incidents (within 72 hours)
- [ ] **Update runbooks** if you found gaps or inaccuracies
- [ ] **Submit on-call hours** for compensation (timesheet/HR system)
- [ ] **Provide feedback** on on-call experience (what went well, what didn't)
- [ ] **Take comp time** if you worked significant hours off-hours (company policy)

---

### 7.3 On-Call Retrospective (Optional)

**After your first on-call week, reflect:**
- What went well?
- What was stressful or unclear?
- What would have helped you respond faster?
- Were runbooks accurate and helpful?
- Do you feel prepared for next time?

**Share feedback with:** DevOps Lead or in #on-call Slack channel

This helps improve the on-call experience for everyone.

---

## 8. On-Call Best Practices

### 8.1 Technical Best Practices

**Do:**
- ✅ Follow runbooks step-by-step
- ✅ Document every action in Slack incident channel
- ✅ Communicate early and often (over-communicate)
- ✅ Verify resolution before closing incident
- ✅ Update status page for customer-facing issues
- ✅ Ask for help when stuck (escalate early)
- ✅ Take screenshots/copy logs before making changes

**Don't:**
- ❌ Skip steps in runbooks
- ❌ Make changes without documenting them
- ❌ Assume issue is fixed without verification
- ❌ Struggle alone for >30 minutes on P1 incidents
- ❌ Delete logs or evidence (especially for security incidents)
- ❌ Make major changes without approval (e.g., database schema changes)

---

### 8.2 Communication Best Practices

**Do:**
- ✅ Set expectations (e.g., "I'll update in 15 minutes")
- ✅ Use simple language (avoid jargon with non-technical stakeholders)
- ✅ Be honest (e.g., "I don't know yet, but I'm investigating")
- ✅ Keep incident channel updated every 15-30 minutes (P1/P2)
- ✅ Acknowledge when others offer help

**Don't:**
- ❌ Go silent for long periods (stakeholders will worry)
- ❌ Make promises you can't keep (e.g., "Fixed in 10 minutes")
- ❌ Blame others (blameless culture)
- ❌ Share sensitive details publicly (PHI, security vulnerabilities)

---

### 8.3 Well-Being Best Practices

**Preventing Burnout:**
- Take breaks between incidents
- Don't work your regular job 8 hours + on-call (discuss with manager)
- Take comp time after high-intensity incidents
- Set boundaries (e.g., no on-call during vacation)
- Ask for help if on-call is affecting your health

**During High-Stress Incidents:**
- Take deep breaths (sounds cliché, but helps)
- Focus on one step at a time (don't panic)
- Remember: This is software, not life-or-death (even in healthcare, our app crashing won't harm patients immediately)
- It's okay to escalate if you're overwhelmed

**After Intense Incidents:**
- Decompress (take a walk, talk to a friend, exercise)
- Don't dive back into regular work immediately
- Attend post-mortem to get closure
- Talk to your manager if incident was particularly stressful

**Know When to Step Back:**
If you're experiencing:
- Persistent anxiety about on-call
- Sleep issues
- Dread before shifts
- Physical symptoms (headaches, stomach issues)

→ Talk to your manager immediately. On-call should be stressful but manageable, not harmful to your health.

---

## 9. Tools and Access

### 9.1 Essential Tools

| Tool | Purpose | URL | Credentials |
|------|---------|-----|-------------|
| **PagerDuty** | Alert management | https://holilabs.pagerduty.com | SSO (Google) |
| **Grafana** | Metrics dashboards | https://metrics.holilabs.xyz | Admin in Doppler |
| **Sentry** | Error tracking | https://sentry.io/holi-labs | SSO (Google) |
| **DigitalOcean** | Infrastructure | https://cloud.digitalocean.com | 2FA enabled |
| **AWS Console** | S3 logs/backups | https://console.aws.amazon.com | IAM user |
| **Doppler** | Secrets | https://dashboard.doppler.com | SSO (Google) |
| **StatusPage** | Customer status | https://manage.statuspage.io | Admin in Doppler |
| **Slack** | Communication | https://holilabs.slack.com | SSO (Google) |
| **GitHub** | Code/deployments | https://github.com/holilabs | Personal account |

---

### 9.2 Key Slack Channels

| Channel | Purpose | Who's There |
|---------|---------|-------------|
| **#on-call** | On-call discussions, handoffs | On-call engineers, DevOps team |
| **#incidents** | Active incidents (not incident-specific) | Engineering team |
| **#incident-[timestamp]** | Specific incident coordination | Incident response team |
| **#alerts** | Non-urgent alerts, monitoring | DevOps team |
| **#security-alerts** | Security-related alerts | Security team, DevOps |
| **#deployments** | Deployment notifications | Engineering team |

---

### 9.3 Runbook Locations

**All runbooks:** `/Users/nicolacapriroloteran/prototypes/holilabsv2/docs/runbooks/`

**Key runbooks:**
- `API_SERVER_DOWN.md`
- `DATABASE_FAILURE.md`
- `SECURITY_INCIDENT.md`
- `DATA_BREACH_RESPONSE.md`
- `HIPAA_AUDIT_LOG_FAILURE.md`
- `REDIS_FAILURE.md`
- `DISASTER_RECOVERY_PLAN.md`

**Also see:**
- `/docs/INCIDENT_RESPONSE_PLAN.md` - Overall incident process
- `/docs/OPS_MANUAL.md` - Day-to-day operations
- `/docs/ON_CALL_GUIDE.md` - This document

---

### 9.4 Quick Commands Cheat Sheet

**Health Checks:**
```bash
# API health
curl https://api.holilabs.xyz/api/health | jq .

# Database connection
psql $DATABASE_URL -c "SELECT 1;"

# Docker containers status
docker ps
```

**Log Viewing:**
```bash
# Application logs (last 100 lines)
docker logs holi-web-1 --tail 100

# Follow logs (real-time)
docker logs -f holi-web-1

# Database logs
docker logs holi-postgres-1 --tail 100
```

**Database Queries:**
```bash
# Active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# Recent audit logs
psql $DATABASE_URL -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20;"
```

**Emergency Actions:**
```bash
# Restart application
docker-compose -f docker-compose.prod.yml restart web

# Rollback deployment
git checkout HEAD~1 && docker-compose -f docker-compose.prod.yml up -d --build

# Kill idle database connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"
```

---

## 10. FAQ

**Q: What if I get paged at 3 AM and I'm too tired to think clearly?**
A: Acknowledge the alert first (stops paging). Take 2-3 minutes to wake up (splash water on face, drink water). Assess severity - if it's P1 and you're not confident, escalate to secondary immediately. Don't try to be a hero when exhausted.

**Q: What if I accidentally make the issue worse?**
A: It happens. Document what you did, escalate immediately, and be honest. Blameless culture means we learn from mistakes, not punish them.

**Q: What if I'm unsure if something is a real incident or false alarm?**
A: Err on the side of caution. Create an incident channel, investigate, and downgrade/close if it's a false alarm. Better to over-communicate than under-communicate.

**Q: What if I have personal plans during my on-call week?**
A: You can still have a life! Just ensure you have your laptop and phone, and can respond within 5 minutes. Avoid situations where you can't (flights, movies, loud concerts). If you have unmissable plans, trade shifts with another engineer.

**Q: What if I get multiple alerts simultaneously?**
A: Acknowledge all alerts to stop paging. Triage by severity (P1 first). Immediately escalate to secondary on-call and say "I have multiple P1/P2 incidents, need help." Don't try to handle multiple P1s alone.

**Q: What if the runbook doesn't work?**
A: Document what didn't work in the Slack incident channel. Try general troubleshooting (Section 4.2). If still stuck after 15-20 minutes, escalate. After incident is resolved, update the runbook.

**Q: What if I think PHI was breached?**
A: Stop. **DO NOT** continue troubleshooting. Immediately:
1. Escalate to Security Lead (page them)
2. Escalate to Compliance Officer (email/call)
3. Do not delete anything (evidence preservation)
4. Follow breach response procedures in `/docs/runbooks/DATA_BREACH_RESPONSE.md`

**Q: What if I'm on-call but need to take a day off?**
A: Notify your manager and the on-call team as early as possible. Arrange a coverage swap with another engineer. Don't just hope you won't get paged.

**Q: Can I deploy code while on-call?**
A: Generally no, unless it's an emergency hotfix for an ongoing incident. Deployments can cause incidents, and you don't want to be investigating your own deployment. If you must deploy, have another engineer review and be ready to rollback.

**Q: What if I made a mistake during an incident?**
A: Document it honestly in the post-mortem. Blameless culture means we focus on systems and processes, not individuals. Your honesty helps us improve.

**Q: How do I know if I'm doing a good job as on-call?**
A: Good signs:
- You acknowledge alerts within 5 minutes
- You communicate clearly and often
- You escalate when appropriate (not too early, not too late)
- You document incidents well
- You update runbooks when you find gaps
- You take care of yourself (not burnt out)

**Q: What if I'm on-call and I want to go for a run / to the gym?**
A: Totally fine! Just keep your phone with you (max volume) and be prepared to cut your activity short if paged. Many on-call engineers use Bluetooth headphones so they can hear pages while exercising.

**Q: Is it okay to drink alcohol while on-call?**
A: Company policy says: Light drinking is okay (1-2 drinks), but you must remain capable of responding to incidents. If you drink more, you should arrange backup coverage or notify your manager. Never respond to a P1 incident if impaired.

---

## Conclusion

On-call is a responsibility, but it's also an opportunity to learn, grow, and build confidence in your operational skills. You'll see the system from a different perspective and develop battle-tested troubleshooting skills.

**Remember:**
- You're not alone - escalate when needed
- Communication is key - over-communicate
- It's okay to not know everything - that's why we have runbooks and teams
- Take care of yourself - on-call should be manageable, not harmful

**You've got this!** 💪

If you have questions about on-call, reach out in #on-call Slack channel or talk to your manager.

---

**Document Contacts:**
- **On-Call Program Owner:** DevOps Lead
- **Questions/Feedback:** #on-call Slack channel
- **Emergencies:** PagerDuty escalation chain

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-01 | Initial release |

**Next Review:** 2026-04-01

---

**END OF ON-CALL GUIDE**

Good luck on your shift! 🚀
