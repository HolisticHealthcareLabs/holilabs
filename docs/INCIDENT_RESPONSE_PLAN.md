# Incident Response Plan
**Version:** 1.0
**Last Updated:** 2026-01-01
**Owner:** Security Team
**Review Cycle:** Quarterly

---

## Executive Summary

This Incident Response Plan (IRP) establishes procedures for detecting, responding to, and recovering from security incidents at Holi Labs. The plan ensures compliance with:
- **HIPAA §164.308(a)(6)** - Security Incident Procedures
- **HIPAA §164.308(a)(1)(ii)(B)** - Risk Management
- **HIPAA Breach Notification Rule §164.404-414** - 60-day notification requirement

**Critical Timeline:**
- **Detection to Acknowledgment:** < 5 minutes
- **Acknowledgment to Initial Assessment:** < 15 minutes
- **P1 Resolution:** < 1 hour
- **Breach Notification:** 60 days from discovery (HIPAA requirement)

---

## Table of Contents

1. [Incident Response Team](#incident-response-team)
2. [Incident Classification](#incident-classification)
3. [Response Procedures](#response-procedures)
4. [Breach Notification](#breach-notification)
5. [Communication Protocols](#communication-protocols)
6. [Post-Incident Review](#post-incident-review)
7. [Training and Drills](#training-and-drills)
8. [Appendix: Runbook Integration](#appendix-runbook-integration)

---

## 1. Incident Response Team

### 1.1 Core Team Roles

| Role | Responsibilities | Contact |
|------|-----------------|---------|
| **Incident Commander (IC)** | Overall incident response, decision-making, stakeholder communication | On-call rotation |
| **Technical Lead** | Technical investigation, system recovery, log analysis | DevOps/SRE team |
| **Security Lead** | Security assessment, threat analysis, forensics | Security team |
| **Compliance Officer** | HIPAA breach determination, regulatory notification, legal liaison | Compliance team |
| **Communications Lead** | Internal/external communication, status updates, patient notification | Marketing/Comms team |
| **Executive Sponsor** | Final approval for major decisions, budget approval, board notification | CTO/CEO |

### 1.2 On-Call Rotation

**Primary On-Call:** Rotates weekly among DevOps/SRE team
**Secondary On-Call:** Backup for primary (responds if primary unavailable after 10 minutes)
**Escalation:** Security Lead → CTO → CEO (for P1 incidents)

**On-Call Tool:** PagerDuty
**Alert Channels:**
- Phone call (immediate)
- SMS (immediate)
- Email (backup)
- Slack #incidents (context)

### 1.3 External Contacts

| Entity | Purpose | Contact Info |
|--------|---------|--------------|
| **Legal Counsel** | Breach determination, regulatory guidance | [Legal firm contact] |
| **Public Relations** | Media inquiries, public statement review | [PR firm contact] |
| **Cyber Insurance** | Incident reporting, coverage verification | [Insurance policy #] |
| **FBI (Cyber Division)** | Ransomware, nation-state attacks | 1-800-CALL-FBI |
| **HHS Office for Civil Rights (OCR)** | HIPAA breach notification | https://ocrportal.hhs.gov/ |
| **Cloud Provider Support** | Infrastructure issues, DDoS mitigation | DigitalOcean Premium Support |

---

## 2. Incident Classification

### 2.1 Severity Levels

#### Priority 1 (P1) - CRITICAL 🚨
**Response Time:** < 5 minutes
**Resolution Target:** < 1 hour
**Escalation:** Immediate to CTO/CEO

**Examples:**
- Production system down (API unavailable)
- Database failure/corruption
- **Confirmed PHI breach** (unauthorized access/disclosure)
- Active ransomware/malware infection
- DDoS attack impacting service
- Complete loss of audit logging

**Impact:**
- Patient safety at risk
- PHI confidentiality/integrity compromised
- Service unavailable to all users
- Regulatory violation likely

**Response Actions:**
- Page on-call immediately
- Activate full incident response team
- Create Slack #incident-[timestamp] channel
- Start incident timeline documentation
- Consider engaging external support (forensics, legal)

---

#### Priority 2 (P2) - HIGH ⚠️
**Response Time:** < 15 minutes
**Resolution Target:** < 4 hours
**Escalation:** To Security Lead

**Examples:**
- Service degraded (API latency > 3s)
- Partial database failure (read replicas down)
- **Suspected PHI access** (unusual patterns, failed auth spikes)
- Single server compromised (isolated)
- Critical vulnerability disclosure (public exploit)
- Audit log write failures

**Impact:**
- Service degraded but operational
- Potential PHI exposure (investigation required)
- Security controls weakened
- Compliance at risk

**Response Actions:**
- Notify on-call via PagerDuty
- Activate technical and security leads
- Create Slack thread in #incidents
- Begin investigation and containment
- Assess breach likelihood

---

#### Priority 3 (P3) - MEDIUM ℹ️
**Response Time:** < 1 hour
**Resolution Target:** < 24 hours
**Escalation:** To Technical Lead

**Examples:**
- Non-critical service issues (non-PHI features)
- High rate of non-PHI errors
- Security scan findings (medium severity)
- Failed backup (secondary only)
- Certificate expiring soon (< 7 days)

**Impact:**
- Minor service disruption
- No PHI exposure
- Compliance risk if unresolved
- User experience degraded

**Response Actions:**
- Email/Slack notification to on-call
- Standard troubleshooting procedures
- Document in issue tracker
- Schedule fix within SLA

---

#### Priority 4 (P4) - LOW 📝
**Response Time:** < 4 hours
**Resolution Target:** < 1 week
**Escalation:** Team lead approval

**Examples:**
- Minor bugs (cosmetic issues)
- Security scan findings (low severity)
- Documentation issues
- Feature requests

**Impact:**
- No service disruption
- No security/compliance risk
- Annoyance only

**Response Actions:**
- Create ticket in backlog
- Address in next sprint
- No immediate action required

---

### 2.2 HIPAA Breach Determination Flowchart

```
┌─────────────────────────────────────┐
│ Was PHI accessed, used, or disclosed? │
└───────────┬─────────────────────────┘
            │
            ├─ NO ──> NOT A BREACH (Document as security incident)
            │
            └─ YES
                │
                ▼
┌─────────────────────────────────────┐
│ Was access permitted under HIPAA?   │
│ (Treatment, payment, ops, authorized)│
└───────────┬─────────────────────────┘
            │
            ├─ YES ──> NOT A BREACH (Document as authorized access)
            │
            └─ NO
                │
                ▼
┌─────────────────────────────────────┐
│ Does a HIPAA exception apply?       │
│ (Unintentional, good faith, unlikely │
│  retained, corrected immediately)    │
└───────────┬─────────────────────────┘
            │
            ├─ YES ──> NOT A BREACH (Document exception, low-level incident report)
            │
            └─ NO
                │
                ▼
┌─────────────────────────────────────┐
│ **CONFIRMED BREACH** 🚨              │
│ • Activate P1 response               │
│ • Engage legal counsel (immediate)   │
│ • Start 60-day notification clock    │
│ • Notify Compliance Officer          │
│ • Begin forensic investigation       │
└─────────────────────────────────────┘
```

**Key HIPAA Exceptions (§164.402):**
1. **Unintentional Access:** Workforce member accidentally accesses PHI beyond authorization in good faith (e.g., clicked wrong patient)
2. **Inadvertent Disclosure:** Authorized person inadvertently discloses PHI to another authorized person at same facility
3. **Not Reasonably Retained:** Unauthorized person receives PHI but couldn't reasonably retain it (e.g., PHI encrypted, recipient deletes immediately)

**Important:** Even if an exception applies, document the incident and implement corrective action to prevent recurrence.

---

## 3. Response Procedures

### 3.1 Phase 1: DETECTION (0-5 minutes)

**Incident Detection Sources:**
- Automated monitoring alerts (Prometheus, Grafana, CloudWatch)
- Security alerts (Sentry, audit log analysis)
- User reports (support tickets, emails)
- Penetration testing findings
- Threat intelligence feeds

**Automated Alerting:**
- **API_SERVER_DOWN** → PagerDuty → On-call phone
- **DATABASE_FAILURE** → PagerDuty → On-call phone
- **HIGH_FAILED_AUTH_RATE** → Slack #security-alerts
- **AUDIT_LOG_FAILURE** → PagerDuty → On-call phone
- **ENCRYPTION_KEY_ACCESS_ANOMALY** → Slack #security-alerts

**Initial Actions:**
1. **Acknowledge alert** (stop paging)
2. **Check dashboards:**
   - Grafana: https://metrics.holilabs.xyz/dashboards
   - Sentry: https://sentry.io/holi-labs
   - CloudWatch: https://console.aws.amazon.com/cloudwatch
3. **Assess severity** using classification matrix (Section 2.1)
4. **Escalate if P1/P2:**
   - Create Slack incident channel: `#incident-YYYY-MM-DD-HHMM`
   - Page Incident Commander
   - Notify Security Lead (if potential breach)

---

### 3.2 Phase 2: TRIAGE (5-15 minutes)

**Incident Commander Actions:**

**Step 1: Assemble Team (2 minutes)**
```
IF P1:
  - Page: Technical Lead, Security Lead, Compliance Officer
  - Notify: CTO, CEO
  - Activate: Full incident response team

IF P2:
  - Notify: Technical Lead, Security Lead
  - Standby: Compliance Officer
```

**Step 2: Initial Assessment (5 minutes)**
- **What happened?** (symptoms, error messages, user reports)
- **What systems affected?** (API, database, web app, mobile)
- **What data affected?** (PHI, PII, non-sensitive)
- **How many users/patients impacted?** (estimated count)
- **Is PHI confidentiality/integrity/availability compromised?**

**Step 3: Breach Determination (5 minutes) - CRITICAL**

Use HIPAA Breach Determination Flowchart (Section 2.2) to answer:
- Was PHI accessed by unauthorized person?
- Was PHI disclosed outside permitted scope?
- Does a HIPAA exception apply?

**If CONFIRMED BREACH:**
1. **Engage legal counsel IMMEDIATELY** (privileged communication)
2. **Start breach notification clock** (60 days from discovery)
3. **Preserve evidence** (logs, databases, system snapshots)
4. **Do NOT delete/modify logs** (spoliation concerns)
5. **Notify Compliance Officer** to coordinate HHS/OCR notification
6. **Consider external forensics** (preserve chain of custody)

**Step 4: Communicate Status (3 minutes)**
- Update Slack incident channel with initial assessment
- Set next update time (15 minutes for P1, 1 hour for P2)
- Notify stakeholders (CTO, CEO for P1)

---

### 3.3 Phase 3: CONTAINMENT (15-60 minutes)

**Goal:** Stop the bleeding, prevent further damage

**Technical Lead Actions:**

#### 3.3.1 Immediate Containment (SHORT-TERM)

**For Active Attacks (Ransomware, DDoS, Unauthorized Access):**
```bash
# 1. ISOLATE affected systems (cut network access)
docker stop holi-web-1  # Stop compromised container
iptables -A INPUT -s [ATTACKER_IP] -j DROP  # Block attacker IP

# 2. SNAPSHOT systems for forensics (before any changes)
docker commit holi-web-1 incident-evidence-$(date +%Y%m%d%H%M%S)
doctl compute volume-snapshot create vol-123 --snapshot-name breach-evidence-$(date +%Y%m%d%H%M%S)

# 3. ROTATE credentials (assume compromise)
# - Database passwords
# - API keys (Anthropic, Upstash, Twilio, Resend)
# - Encryption keys (if key compromise suspected)
# - Staff passwords (forced reset)

# 4. ENABLE additional logging/monitoring
# - Increase log verbosity (DEBUG level)
# - Enable database query logging
# - Enable pgAudit (if not already enabled)
```

**For Service Outages (API Down, Database Failure):**
```bash
# 1. CHECK health endpoints
curl https://api.holilabs.xyz/api/health
curl https://api.holilabs.xyz/api/health/metrics

# 2. CHECK infrastructure
docker ps -a  # Are containers running?
docker logs holi-web-1 --tail 100  # Recent errors?
pg_isready -h localhost -p 5432  # Is PostgreSQL up?

# 3. RESTORE from backup if needed
# See: /docs/runbooks/DATABASE_FAILURE.md
# See: /scripts/restore-database.sh

# 4. FAILOVER to backup systems
# - Promote read replica to primary
# - Redirect traffic to standby region (if multi-region)
```

**For Suspected PHI Breach:**
```bash
# 1. PRESERVE LOGS (copy to immutable storage)
aws s3 cp /var/log/holi/ s3://holi-breach-evidence-$(date +%Y%m%d)/ \
  --recursive \
  --storage-class GLACIER_IR \
  --sse AES256

# 2. QUERY audit logs (identify scope)
# Query: What PHI was accessed?
SELECT
  timestamp,
  user_id,
  user_email,
  action,
  resource,
  resource_id,
  details->>'patientId' as patient_id,
  ip_address
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND action IN ('READ', 'UPDATE', 'DELETE', 'EXPORT')
  AND resource = 'Patient'
ORDER BY timestamp DESC;

# Query: Who accessed it?
SELECT DISTINCT user_email, user_id, COUNT(*) as access_count
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND resource = 'Patient'
GROUP BY user_email, user_id
ORDER BY access_count DESC;

# 3. REVOKE ACCESS (disable compromised accounts)
UPDATE "User" SET is_active = false WHERE id = '[COMPROMISED_USER_ID]';

# 4. IDENTIFY affected patients (for notification)
# Create list of patient_ids whose PHI was breached
```

#### 3.3.2 System Recovery (Restore Service)

**For Database Failures:**
```bash
# See detailed procedures: /docs/runbooks/DATABASE_FAILURE.md

# Quick recovery steps:
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
./scripts/restore-database.sh \
  --backup-date 2026-01-01 \
  --target production

# Verify data integrity:
SELECT COUNT(*) FROM "Patient";  # Compare to pre-incident count
SELECT COUNT(*) FROM "AuditLog";  # Ensure audit trail intact
```

**For Application Failures:**
```bash
# Rollback to last known good version
git checkout [LAST_GOOD_COMMIT]
docker-compose -f docker-compose.prod.yml up -d --build

# Or restore from container image
docker pull registry.holilabs.xyz/holi-web:[LAST_GOOD_TAG]
docker-compose -f docker-compose.prod.yml up -d
```

---

### 3.4 Phase 4: ERADICATION (1-4 hours)

**Goal:** Remove the threat completely

**Security Lead Actions:**

**For Malware/Ransomware:**
1. **Identify infection vector** (phishing email, vulnerable dependency, unpatched server)
2. **Scan all systems** for indicators of compromise (IOCs)
   ```bash
   # Run ClamAV scan
   clamscan -r /home /var/www --infected --log=/tmp/clamscan-$(date +%Y%m%d).log

   # Check for unauthorized users/SSH keys
   cat /etc/passwd | grep -v nologin
   cat ~/.ssh/authorized_keys
   ```
3. **Remove malware** (use antivirus, manual removal, or reimage)
4. **Patch vulnerabilities** (update dependencies, apply security patches)
5. **Harden systems** (disable unnecessary services, update firewall rules)

**For Unauthorized Access:**
1. **Identify access method** (stolen credentials, SQL injection, API vulnerability)
2. **Close entry point** (patch vulnerability, disable compromised account)
3. **Search for persistence mechanisms** (backdoors, scheduled jobs, modified binaries)
   ```bash
   # Check for unauthorized cron jobs
   crontab -l
   ls -la /etc/cron.*

   # Check for suspicious processes
   ps aux | grep -v "\[" | awk '{print $11}' | sort | uniq

   # Check for unauthorized Docker containers
   docker ps -a
   ```
4. **Review all privileged accounts** (ADMIN, CLINICIAN roles with elevated access)
5. **Force password reset** for all potentially compromised accounts

**For Vulnerabilities (No Active Exploitation):**
1. **Patch vulnerability** (update package, apply hotfix)
2. **Deploy patch to production** (emergency deployment process)
3. **Verify fix** (rerun security scan, manual testing)

---

### 3.5 Phase 5: RECOVERY (4-24 hours)

**Goal:** Return to normal operations with confidence

**Technical Lead Actions:**

**Step 1: Verify Systems Secure (1-2 hours)**
- [ ] All malware removed
- [ ] Vulnerabilities patched
- [ ] Unauthorized access revoked
- [ ] Credentials rotated
- [ ] Logs/monitoring restored
- [ ] Backups verified

**Step 2: Restore Normal Operations (2-4 hours)**
```bash
# 1. Restart services (if stopped for containment)
docker-compose -f docker-compose.prod.yml up -d

# 2. Verify health checks
curl https://api.holilabs.xyz/api/health
# Expected: {"status": "healthy"}

# 3. Verify key functionality
# - User login
# - Patient record access (with audit logging)
# - Appointment creation
# - Prescription creation

# 4. Monitor closely (30-60 minutes)
# - Watch logs for errors: docker logs -f holi-web-1
# - Watch metrics: Grafana dashboard
# - Watch alerts: Slack #alerts channel
```

**Step 3: Enable Monitoring (30 minutes)**
- [ ] Prometheus alerts active
- [ ] Grafana dashboards refreshing
- [ ] CloudWatch metrics flowing
- [ ] Audit log writes verified
- [ ] Error tracking (Sentry) active

**Step 4: Communicate Resolution (15 minutes)**
- [ ] Update Slack incident channel: "Incident resolved, monitoring closely"
- [ ] Update status page: https://status.holilabs.xyz
- [ ] Notify affected users (if applicable)
- [ ] Send internal all-hands update (for P1 incidents)

---

### 3.6 Phase 6: POST-INCIDENT (24-72 hours)

**See Section 6: Post-Incident Review for detailed procedures**

**Immediate Actions (24 hours):**
- [ ] Schedule post-mortem meeting (all incident responders)
- [ ] Document timeline (use Slack thread as source)
- [ ] Identify root cause
- [ ] Create Jira tickets for corrective actions

**Follow-Up Actions (72 hours):**
- [ ] Write post-mortem report (blameless)
- [ ] Update runbooks with lessons learned
- [ ] Implement corrective actions
- [ ] Schedule follow-up review (30 days)

---

## 4. Breach Notification

### 4.1 HIPAA Breach Notification Requirements

**Timeline:**
```
Day 0: Breach Discovery
  ↓
Day 0-10: Investigation & Breach Determination (Compliance Officer + Legal)
  ↓
Day 10-60: Notification (if confirmed breach)
  ↓
Day 60: DEADLINE for notification (HIPAA §164.404)
  ↓
Day 60+: Annual report to HHS (if <500 individuals affected)
```

**Notification Requirements:**

#### 4.1.1 Individual Notification (Affected Patients)

**Timeline:** Within **60 days** of breach discovery
**Method:**
- **First-class mail** (primary)
- **Email** (if patient consented)
- **Phone** (if urgent)

**Required Content (§164.404(c)):**
```
Subject: Important Notice About Your Health Information

Dear [Patient Name],

We are writing to notify you of a breach involving your protected health information.

**What Happened:**
[Brief description of breach - what, when, how]
On [DATE], we discovered that [DESCRIPTION].

**What Information Was Involved:**
[Description of PHI compromised]
The breach involved the following information:
- Name, date of birth, medical record number
- [List all PHI types: diagnoses, medications, lab results, etc.]

**What We Are Doing:**
[Steps taken to investigate and mitigate]
- Immediately [CONTAINMENT ACTIONS]
- Conducted forensic investigation
- Implemented [CORRECTIVE ACTIONS]

**What You Can Do:**
[Recommendations for affected individuals]
- Monitor your medical records for unusual activity
- Review your health insurance statements
- Contact us at [PHONE] with questions
- Consider placing fraud alert on credit reports (if SSN/financial info involved)

**Additional Resources:**
- Federal Trade Commission: www.identitytheft.gov
- Credit Bureau Fraud Alerts: [PHONE NUMBERS]

**Contact Information:**
Holi Labs Privacy Officer
Email: privacy@holilabs.xyz
Phone: [PHONE]

We sincerely apologize for this incident and the concern it may cause.

Sincerely,
[Name]
[Title]
Holi Labs
```

**Substitute Notice (if contact info insufficient for <10 individuals):**
- **Phone call** or **other written notice**

**Substitute Notice (if contact info insufficient for ≥10 individuals):**
- **Website notice** (90 days)
- **Major media outlet** (press release)

---

#### 4.1.2 HHS Office for Civil Rights (OCR) Notification

**Timeline:**
- **≥500 individuals:** Within **60 days** via https://ocrportal.hhs.gov/
- **<500 individuals:** **Annual report** (within 60 days of year-end)

**Required Information:**
- Name and contact info of covered entity
- Date of breach discovery
- Date range of breach (estimated if unknown)
- Brief description of breach
- Number of individuals affected (estimated if unknown)
- Types of PHI involved
- Description of investigation/mitigation

**Submission Process:**
```bash
# 1. Gather breach data
BREACH_DATE="2026-01-01"
INDIVIDUALS_AFFECTED=1500
PHI_TYPES="Names, DOBs, MRNs, Diagnoses, Medications"

# 2. Log into OCR Breach Portal
# URL: https://ocrportal.hhs.gov/ocr/breach/breach.jsf

# 3. Complete breach report form
# - Entity info (Holi Labs, NPI, address)
# - Breach details (date, individuals, PHI types)
# - Narrative description

# 4. Submit electronically

# 5. Save confirmation number for records
echo "OCR Breach Report Confirmation: [CONFIRMATION_NUMBER]" >> breach-evidence/ocr-submission.txt
```

---

#### 4.1.3 Media Notification (≥500 individuals in same state)

**Timeline:** Within **60 days**
**Method:** **Press release** to major media outlets in affected state(s)

**Required Content:**
- Same information as individual notice
- Contact info for individuals to request more info

**Template Press Release:**
```
FOR IMMEDIATE RELEASE

Holi Labs Notifies Patients of Data Security Incident

[CITY, STATE] – [DATE] – Holi Labs is notifying approximately [NUMBER]
patients that their protected health information may have been accessed
without authorization.

What Happened:
On [DATE], Holi Labs discovered [DESCRIPTION]. The incident involved
[PHI TYPES].

What We Are Doing:
Holi Labs immediately [ACTIONS TAKEN]. We have engaged cybersecurity
experts to investigate and have implemented [CORRECTIVE ACTIONS].

What Patients Should Do:
Affected patients will receive notification by mail with detailed
information and resources. Patients with questions may contact our
dedicated hotline at [PHONE] or privacy@holilabs.xyz.

Contact:
[NAME]
[TITLE]
Holi Labs
[PHONE]
[EMAIL]
```

---

#### 4.1.4 Business Associates Notification

**Timeline:** Within **60 days** (or per BAA terms)
**Method:** Written notice to all Business Associates whose systems/data were affected

**Template:**
```
Subject: URGENT - Security Incident Notification

Dear [Business Associate Name],

Pursuant to our Business Associate Agreement dated [DATE], this letter
serves as notice of a security incident involving protected health
information (PHI).

Incident Details:
- Date of Discovery: [DATE]
- Nature of Incident: [DESCRIPTION]
- PHI Involved: [TYPES]
- Individuals Affected: [NUMBER]

Your Data/Systems:
[Describe whether BA's systems were affected or if PHI from BA was involved]

Actions Required:
Please [SPECIFIC ACTIONS BA SHOULD TAKE, IF ANY].

We will provide updates as our investigation continues. Please contact
us at security@holilabs.xyz with questions.

Sincerely,
[Name]
[Title]
Holi Labs
```

---

### 4.2 Notification Workflow

```
┌─────────────────────────────────────┐
│ BREACH CONFIRMED (Day 0)            │
│ - Legal counsel determination       │
│ - Compliance Officer notified       │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ INVESTIGATION (Day 0-10)            │
│ • Forensic analysis                 │
│ • Determine scope (# individuals)   │
│ • Identify PHI types involved       │
│ • Query audit logs for affected IDs │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ NOTIFICATION PREP (Day 10-30)       │
│ • Draft notification letters        │
│ • Legal review                      │
│ • Obtain affected patient addresses │
│ • Prepare OCR portal submission     │
│ • Draft press release (if ≥500)    │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ NOTIFICATION SENT (Day 30-60)       │
│ ✉️  Mail to affected individuals     │
│ 🌐 OCR portal submission            │
│ 📰 Press release (if applicable)    │
│ 📧 Business Associate notification  │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ DOCUMENTATION (Day 60+)             │
│ • Maintain breach log (6 years)     │
│ • Annual report to HHS (if <500)    │
│ • Post-incident review              │
│ • Corrective action tracking        │
└─────────────────────────────────────┘
```

---

### 4.3 Breach Notification Log

**Requirement:** Maintain documentation of breaches for **6 years** (HIPAA §164.316(b)(2)(i))

**Template:** `/breach-evidence/BREACH_LOG_[YEAR].md`

```markdown
# Breach Notification Log - 2026

## Breach #2026-001

**Discovery Date:** 2026-01-15
**Incident Date Range:** 2026-01-10 to 2026-01-15
**Individuals Affected:** 1,247
**PHI Involved:** Names, DOBs, MRNs, Diagnoses

**Breach Determination:**
- Date Determined: 2026-01-16
- Determined By: [Compliance Officer], [Legal Counsel]
- Rationale: Unauthorized external access to patient database. No HIPAA exceptions apply.

**Root Cause:** SQL injection vulnerability in search endpoint

**Notification Timeline:**
- Individual Notification: 2026-03-10 (within 60 days ✓)
- OCR Notification: 2026-03-10 (within 60 days ✓)
- Media Notification: 2026-03-10 (≥500 in CA)
- Business Associate Notification: 2026-02-01

**Evidence Preserved:**
- `/breach-evidence/2026-001/database-snapshot-20260115.sql.gz`
- `/breach-evidence/2026-001/audit-logs-20260110-20260115.json.gz`
- `/breach-evidence/2026-001/forensic-report.pdf`

**Corrective Actions:**
- [X] Patched SQL injection vulnerability (2026-01-16)
- [X] Implemented parameterized queries (2026-01-18)
- [X] Enhanced security testing (2026-01-25)
- [X] Security training for developers (2026-02-01)

**Post-Incident Review:** `/breach-evidence/2026-001/post-mortem.md`
```

---

## 5. Communication Protocols

### 5.1 Internal Communication

#### 5.1.1 Slack Incident Channels

**Channel Naming:** `#incident-YYYY-MM-DD-HHMM`
**Purpose:** Real-time incident coordination

**Channel Template:**
```
📌 Pinned Message:
**Incident:** [BRIEF DESCRIPTION]
**Severity:** P1 / P2 / P3 / P4
**Status:** Investigating / Contained / Resolved
**Incident Commander:** @[NAME]
**Started:** 2026-01-01 14:32 UTC
**Last Update:** 2026-01-01 15:15 UTC

**Runbook:** /docs/runbooks/[RUNBOOK_NAME].md
**Dashboards:**
- Grafana: [LINK]
- Sentry: [LINK]

**Next Update:** 15:30 UTC (15 min)
```

**Update Frequency:**
- **P1:** Every 15 minutes
- **P2:** Every 30 minutes
- **P3:** Every 2 hours
- **P4:** Daily

**Channel Members:**
- Incident Response Team (auto-invite)
- Stakeholders (CTO, CEO for P1/P2)
- Observers (do not interrupt, read-only)

---

#### 5.1.2 Email Notifications

**To:** executives@holilabs.xyz, board@holilabs.xyz
**Subject:** `[P1 INCIDENT] Brief Description - Status Update`

**Template:**
```
Subject: [P1 INCIDENT] Database Failure - Resolved

Incident Summary:
- Severity: P1 (Critical)
- Start Time: 2026-01-01 14:32 UTC
- Resolution Time: 2026-01-01 15:47 UTC
- Duration: 1 hour 15 minutes

What Happened:
Primary PostgreSQL database failed due to disk full condition.

Impact:
- API unavailable for 1 hour 15 minutes
- ~500 users affected
- No data loss
- No PHI breach

Resolution:
- Cleared old log files (freed 50GB)
- Restarted database
- Implemented disk monitoring alerts

Next Steps:
- Post-mortem meeting: 2026-01-02 10:00 AM
- Corrective actions: Increase disk size, automated log rotation

Contact:
[Incident Commander Name]
[Email]
[Phone]
```

---

#### 5.1.3 All-Hands Communication (Major Incidents)

**When:** P1 incidents affecting >1000 users or confirmed PHI breach
**Method:** Company-wide email + Slack #general

**Template:**
```
Subject: Important Update: Service Disruption Resolved

Team,

Earlier today (14:32-15:47 UTC), we experienced a service disruption
affecting our production environment. I want to update you on what happened
and what we're doing.

What Happened:
[Brief, non-technical explanation]

Impact:
[How many users, what features]

Resolution:
[How we fixed it]

PHI/Data:
[Explicitly state if PHI was affected or not]

Next Steps:
- Post-mortem tomorrow at 10am (invite: [LINK])
- Corrective actions tracked in Jira

Thank you to the incident response team for your rapid response. If you
have questions, please reach out to me directly.

[Name]
[Title]
```

---

### 5.2 External Communication

#### 5.2.1 Status Page Updates

**Platform:** https://status.holilabs.xyz (e.g., Atlassian Statuspage)

**Update Template:**
```
Title: [Service Degradation / Service Outage / Resolved]
Status: [Investigating / Identified / Monitoring / Resolved]
Timestamp: 2026-01-01 14:35 UTC

We are currently investigating reports of API errors. Users may experience
difficulty accessing patient records. We will provide an update in 15 minutes.

[15 minutes later]
Update - Identified (14:50 UTC):
We have identified the root cause as a database issue and are working to restore service.

[30 minutes later]
Update - Monitoring (15:20 UTC):
Service has been restored and we are monitoring closely.

[1 hour later]
Resolved (15:47 UTC):
This incident has been resolved. All systems are operational. We apologize for the disruption.
```

---

#### 5.2.2 Customer Support Communication

**Zendesk Macro Template:**
```
Subject: Re: [Ticket ID] - Service Issue

Hi [Customer Name],

Thank you for reporting this issue. We are aware of the problem and our
engineering team is actively working on a resolution.

What We Know:
[Brief description of issue]

Current Status:
[Investigating / In Progress / Resolved]

Updates:
You can track real-time updates at: https://status.holilabs.xyz

We sincerely apologize for the inconvenience and will follow up when resolved.

Best regards,
Holi Labs Support Team
```

---

#### 5.2.3 Media Inquiries (Breach Only)

**Process:**
1. **All media inquiries** forwarded to Communications Lead
2. **No unauthorized statements** (could create liability)
3. **Legal review required** before any public statement

**Template Response:**
```
Thank you for your inquiry. We take the security and privacy of patient
information very seriously. We are investigating this matter and will
provide updates as appropriate. Affected individuals are being notified
directly.

For more information, please contact:
[Communications Lead Name]
[Email]
[Phone]
```

---

### 5.3 Communication Channels Summary

| Audience | Channel | Timing | Owner |
|----------|---------|--------|-------|
| **Incident Response Team** | Slack #incident-[id] | Real-time (every 15 min for P1) | Incident Commander |
| **Executives (CTO, CEO)** | Email + Slack DM | Immediate (P1), 1 hour (P2) | Incident Commander |
| **Board of Directors** | Email | Within 24 hours (P1 only) | CEO |
| **All Employees** | Email + Slack #general | After resolution (P1/P2) | CTO or CEO |
| **Customers/Users** | Status page | Real-time updates | Communications Lead |
| **Affected Patients (Breach)** | First-class mail | Within 60 days | Compliance Officer |
| **HHS OCR (Breach ≥500)** | OCR Portal | Within 60 days | Compliance Officer |
| **Media (Breach ≥500)** | Press release | Within 60 days | Communications Lead |
| **Business Associates** | Email | Within 60 days | Legal Counsel |

---

## 6. Post-Incident Review

### 6.1 Post-Mortem Process

**Timeline:** Within **72 hours** of incident resolution

**Attendees:**
- Incident Commander
- All incident responders
- Technical Lead
- Security Lead
- Compliance Officer (if breach)
- CTO
- Product/Engineering Managers (relevant teams)

**Meeting Agenda (1-2 hours):**
1. **Timeline Review (15 min):** What happened, when?
2. **Root Cause Analysis (30 min):** Why did it happen?
3. **Response Evaluation (15 min):** What went well? What didn't?
4. **Action Items (30 min):** What will we do differently?

---

### 6.2 Post-Mortem Template

**File:** `/incident-reports/YYYY-MM-DD-[INCIDENT_NAME].md`

```markdown
# Post-Mortem: [Incident Name]

**Date:** 2026-01-01
**Severity:** P1
**Duration:** 1 hour 15 minutes (14:32-15:47 UTC)
**Incident Commander:** [Name]
**Responders:** [Names]

---

## Executive Summary

[2-3 sentence summary of incident, impact, and resolution]

---

## Impact

**User Impact:**
- ~500 users unable to access API
- ~1,247 patient records accessed by unauthorized user (BREACH)

**Revenue Impact:**
- Estimated $5,000 in lost billings (1 hour downtime)

**PHI Impact:**
- ✅ No PHI breach
- ⚠️ PHI BREACH: 1,247 patient records (names, DOBs, MRNs, diagnoses)

**Reputation Impact:**
- [Describe customer/media response]

---

## Timeline (UTC)

| Time | Event | Actor |
|------|-------|-------|
| 14:32 | Alert: API_SERVER_DOWN | Prometheus |
| 14:33 | On-call acknowledges alert | DevOps Engineer |
| 14:35 | Incident channel created | DevOps Engineer |
| 14:37 | IC paged, investigation begins | Incident Commander |
| 14:45 | Root cause identified: Disk full | Technical Lead |
| 14:50 | Containment: Clearing logs | Technical Lead |
| 15:05 | Database restarted | Technical Lead |
| 15:10 | Health checks passing | DevOps Engineer |
| 15:20 | Monitoring, no errors | All |
| 15:47 | Incident declared resolved | Incident Commander |

**Detection Time (alert to acknowledgment):** 1 minute ✅
**Response Time (acknowledgment to mitigation):** 18 minutes ✅
**Resolution Time (mitigation to resolution):** 1 hour 15 minutes (target: <1 hour ⚠️)

---

## Root Cause

**What happened:**
PostgreSQL disk usage reached 100% due to unrotated logs.

**Why it happened (5 Whys):**
1. **Why did the database fail?** → Disk was full
2. **Why was the disk full?** → PostgreSQL logs not rotating
3. **Why were logs not rotating?** → Log rotation not configured
4. **Why was log rotation not configured?** → Missed in initial setup
5. **Why was it missed?** → No infrastructure checklist for production launch

**Contributing Factors:**
- No disk space monitoring alert
- No automated log rotation
- Manual database setup (not Infrastructure as Code)

---

## What Went Well

- ✅ Alert fired immediately (Prometheus working)
- ✅ On-call acknowledged within 1 minute
- ✅ IC assembled team quickly
- ✅ Root cause identified in 13 minutes
- ✅ Clear communication in Slack incident channel
- ✅ No data loss (backups intact)

---

## What Didn't Go Well

- ❌ Exceeded P1 resolution target (1h 15m vs 1h target)
- ❌ No disk monitoring alert (should have prevented)
- ❌ Log rotation not configured (preventable)
- ❌ Manual remediation required (should be automated)
- ❌ Runbook incomplete (missing disk cleanup steps)

---

## Action Items

| ID | Action | Owner | Due Date | Priority | Status |
|----|--------|-------|----------|----------|--------|
| AI-001 | Configure disk monitoring alert (80% threshold) | DevOps | 2026-01-02 | P1 | ✅ Done |
| AI-002 | Implement automated log rotation (logrotate) | DevOps | 2026-01-03 | P1 | ✅ Done |
| AI-003 | Create infrastructure checklist | DevOps | 2026-01-05 | P2 | 🚧 In Progress |
| AI-004 | Update runbook with disk cleanup steps | DevOps | 2026-01-03 | P2 | ✅ Done |
| AI-005 | Migrate to Infrastructure as Code (Terraform) | DevOps | 2026-01-15 | P3 | 📋 Planned |

---

## Lessons Learned

**Technical:**
- Disk space monitoring is critical for database availability
- Automated log rotation prevents disk exhaustion
- Infrastructure as Code prevents configuration drift

**Process:**
- Incident response timeline was good (alert → mitigation in 18 min)
- Communication was clear (Slack channel worked well)
- Runbooks need continuous improvement (update after each incident)

**Cultural:**
- Blameless post-mortems encourage honesty
- Team rallied quickly (good on-call culture)

---

## Follow-Up

**30-Day Review:** 2026-02-01
**Verify all action items completed and effective**

**Trending Analysis:**
- Is this a recurring issue? (Check past incidents)
- Are there patterns? (e.g., always on Fridays, always disk-related)

---

## Appendix

**Related Incidents:**
- 2025-12-15: Disk space warning (resolved proactively)

**Relevant Metrics:**
- Uptime this month: 99.85% (target: 99.9%)
- P1 incidents this quarter: 3 (target: <2)

**Cost of Incident:**
- Lost revenue: ~$5,000
- Engineering time: 6 hours × 4 people = 24 hours
- Customer support: 10 tickets

**Links:**
- Slack incident thread: [LINK]
- Sentry errors: [LINK]
- Grafana dashboard: [LINK]
- Runbook: /docs/runbooks/DATABASE_FAILURE.md
```

---

### 6.3 Continuous Improvement

**Monthly Incident Review:**
- Aggregate all incidents from past month
- Identify trends (common root causes, affected systems)
- Prioritize systemic improvements

**Quarterly Metrics:**
- **MTTD (Mean Time To Detect):** Target < 5 minutes
- **MTTR (Mean Time To Resolve):** Target < 1 hour (P1), < 4 hours (P2)
- **Incident Count:** Target < 2 P1 incidents per quarter
- **Post-Mortem Completion:** Target 100% within 72 hours

**Annual Review:**
- Review all post-mortems from past year
- Update Incident Response Plan
- Conduct tabletop exercise (full team simulation)
- Certification renewal (if applicable)

---

## 7. Training and Drills

### 7.1 Incident Response Training

**Audience:** All Incident Response Team members
**Frequency:** Annually + upon hire
**Duration:** 4 hours

**Training Modules:**
1. **Incident Classification (30 min):** P1/P2/P3/P4 severity matrix
2. **Incident Commander Role (45 min):** Leadership, decision-making, communication
3. **Technical Response (60 min):** Containment, eradication, recovery
4. **HIPAA Breach Response (45 min):** Breach determination flowchart, notification requirements
5. **Communication Protocols (30 min):** Slack, status page, customer communication
6. **Post-Mortem Process (30 min):** Blameless culture, root cause analysis

**Certification:**
- Complete all modules + pass quiz (80%)
- Participate in at least one tabletop exercise

---

### 7.2 Incident Response Drills

#### 7.2.1 Tabletop Exercises

**Frequency:** Quarterly
**Duration:** 2 hours
**Participants:** Full Incident Response Team

**Scenario Examples:**

**Scenario 1: Ransomware Attack**
```
11:45 AM: Multiple servers display ransomware warning
"Your files have been encrypted. Pay 5 BTC to recover."

Questions:
- Who do you page first?
- Do you pay the ransom? (Spoiler: No, FBI recommends against)
- How do you contain spread?
- When do you notify HHS OCR?
- What communication do you send to customers?
```

**Scenario 2: Unauthorized PHI Access**
```
2:30 PM: Audit log query shows unusual pattern:
User "john@example.com" (STAFF role) accessed 5,000 patient records in 30 minutes.

Questions:
- Is this a breach? (Use flowchart)
- What immediate actions do you take?
- How do you identify affected patients?
- What is the notification timeline?
- What corrective actions prevent recurrence?
```

**Scenario 3: Database Corruption**
```
3:15 AM: On-call paged: Database health check failing
`ERROR: invalid page header in block 123 of relation "Patient"`

Questions:
- How do you assess data loss?
- When do you restore from backup?
- How do you verify backup integrity?
- What communication do you send at 3am?
- How do you prevent data loss in future?
```

**Evaluation Criteria:**
- ✅ Correct severity classification
- ✅ Appropriate escalation
- ✅ Timely communication
- ✅ Correct technical steps
- ✅ HIPAA compliance awareness

---

#### 7.2.2 Simulated Breaches (Fire Drills)

**Frequency:** Semi-annually
**Duration:** Full incident lifecycle (4-8 hours)
**Participants:** Full Incident Response Team + support staff

**Purpose:** Test end-to-end incident response with realistic scenario

**Example Fire Drill:**
```
Scenario: SQL Injection Breach

Day 1, 10:00 AM:
Security team triggers alert: "Suspicious SQL in /api/patients/search"
- Actual vulnerability introduced in staging
- No real patient data at risk
- Team must respond as if production

Expected Actions:
1. On-call acknowledges alert (target: <5 min)
2. IC creates incident channel
3. Technical Lead investigates (log analysis, code review)
4. Security Lead determines: "CONFIRMED BREACH - 1,247 records"
5. Compliance Officer begins breach determination process
6. Team patches vulnerability
7. Team drafts notification letters
8. Post-mortem conducted

Evaluation:
- Did team meet response time targets?
- Was breach determination correct?
- Were notification requirements understood?
- What surprised the team?
- What improvements needed?
```

**Debrief:**
- What went well?
- What needs improvement?
- Update runbooks with lessons learned

---

### 7.3 On-Call Readiness

**Before Going On-Call:**
- [ ] Complete incident response training
- [ ] Read all runbooks in `/docs/runbooks/`
- [ ] Test PagerDuty connectivity (phone, SMS, push)
- [ ] Verify VPN access
- [ ] Verify database access (read-only for investigation)
- [ ] Verify cloud console access (DigitalOcean, AWS)
- [ ] Save emergency contacts (IC, Security Lead, CTO)

**During On-Call:**
- [ ] Respond to pages within 5 minutes (P1/P2)
- [ ] Acknowledge alert immediately (stops paging)
- [ ] Escalate if needed (don't struggle alone)
- [ ] Document all actions in incident channel

**After On-Call:**
- [ ] Hand off open incidents to next on-call
- [ ] Update runbooks if gaps found
- [ ] Provide feedback on alerting (false positives?)

---

## 8. Appendix: Runbook Integration

The following runbooks provide detailed technical procedures for specific incident types. This Incident Response Plan provides the **process** (who, when, how to communicate), while runbooks provide the **technical steps** (commands, queries, configurations).

### 8.1 Runbook Index

| Runbook | Incident Type | Severity | Location |
|---------|---------------|----------|----------|
| **API_SERVER_DOWN.md** | Production API unavailable | P1 | `/docs/runbooks/` |
| **DATABASE_FAILURE.md** | Database connectivity/corruption | P1 | `/docs/runbooks/` |
| **SECURITY_INCIDENT.md** | Unauthorized access, malware | P1/P2 | `/docs/runbooks/` |
| **DATA_BREACH_RESPONSE.md** | Confirmed PHI breach | P1 | `/docs/runbooks/` |
| **HIPAA_AUDIT_LOG_FAILURE.md** | Audit logging not writing | P1 | `/docs/runbooks/` |
| **REDIS_FAILURE.md** | Redis unavailable (rate limiting fails) | P2 | `/docs/runbooks/` |
| **DISASTER_RECOVERY_PLAN.md** | Complete data center loss | P1 | `/docs/runbooks/` |

### 8.2 Using Runbooks During Incidents

**Step 1: Identify Runbook**
```
Alert: API_SERVER_DOWN
↓
Open: /docs/runbooks/API_SERVER_DOWN.md
```

**Step 2: Follow Checklist**
```markdown
## Immediate Actions (0-5 min)
- [x] Acknowledge PagerDuty alert
- [x] Check dashboard: https://metrics.holilabs.xyz/d/api-health
- [x] Assess patient impact: ~500 users affected
```

**Step 3: Execute Technical Steps**
```bash
# From runbook:
curl https://api.holilabs.xyz/api/health
# Expected: {"status": "healthy"}
# Actual: Connection refused
```

**Step 4: Document Actions**
```
15:32 - Ran health check, connection refused
15:33 - Checking Docker containers...
```

**Step 5: Update Runbook (Post-Incident)**
```
If step 3 doesn't work, also try:
- Check Docker logs: docker logs holi-web-1 --tail 100
```

---

## 9. Appendix: Incident Response Checklist

**Print and post in team area for quick reference during incidents.**

---

### P1 INCIDENT RESPONSE CHECKLIST 🚨

#### Phase 1: DETECTION (0-5 min)
- [ ] Alert acknowledged (PagerDuty/Slack)
- [ ] Initial assessment (dashboards, logs)
- [ ] Severity confirmed: **P1**
- [ ] Incident channel created: `#incident-YYYY-MM-DD-HHMM`
- [ ] IC paged
- [ ] CTO/CEO notified

#### Phase 2: TRIAGE (5-15 min)
- [ ] Team assembled (Technical Lead, Security Lead, Compliance Officer)
- [ ] Systems affected identified
- [ ] Data affected identified (PHI?)
- [ ] User impact estimated
- [ ] **Breach determination started** (if PHI involved)
- [ ] Status page updated: "Investigating"
- [ ] Runbook identified and opened

#### Phase 3: CONTAINMENT (15-60 min)
- [ ] Threat contained (isolated, credentials rotated)
- [ ] Evidence preserved (logs, snapshots)
- [ ] Additional monitoring enabled
- [ ] Status page updated: "Identified"
- [ ] Update frequency: Every 15 minutes

#### Phase 4: ERADICATION (1-4 hours)
- [ ] Root cause identified
- [ ] Vulnerability patched
- [ ] Malware removed (if applicable)
- [ ] Systems hardened
- [ ] Status page updated: "Monitoring"

#### Phase 5: RECOVERY (4-24 hours)
- [ ] Normal operations restored
- [ ] Health checks verified
- [ ] Monitoring confirmed operational
- [ ] Status page updated: "Resolved"
- [ ] Customer communication sent
- [ ] All-hands update sent (if applicable)

#### Phase 6: POST-INCIDENT (24-72 hours)
- [ ] Post-mortem scheduled (within 72 hours)
- [ ] Timeline documented
- [ ] Incident report written
- [ ] Action items created (Jira)
- [ ] Runbook updated

#### BREACH-SPECIFIC CHECKLIST (if applicable)
- [ ] Legal counsel engaged (immediate)
- [ ] Breach notification clock started (Day 0 = discovery)
- [ ] Forensic investigation initiated
- [ ] Affected patients identified (query audit logs)
- [ ] OCR notification prepared (within 60 days if ≥500)
- [ ] Individual notification letters prepared (within 60 days)
- [ ] Press release prepared (within 60 days if ≥500)
- [ ] Breach log updated (maintain 6 years)

---

## 10. Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-01 | Security Team | Initial release |

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **CTO** | [Name] | _____________ | ________ |
| **Compliance Officer** | [Name] | _____________ | ________ |
| **Legal Counsel** | [Name] | _____________ | ________ |

**Review Schedule:** Quarterly (January, April, July, October)

**Next Review Date:** 2026-04-01

---

## 11. Contact Information

### Emergency Contacts (24/7)

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **Incident Commander** | On-call rotation | [PagerDuty] | oncall@holilabs.xyz |
| **CTO** | [Name] | [Phone] | cto@holilabs.xyz |
| **CEO** | [Name] | [Phone] | ceo@holilabs.xyz |
| **Security Lead** | [Name] | [Phone] | security@holilabs.xyz |
| **Compliance Officer** | [Name] | [Phone] | compliance@holilabs.xyz |

### External Resources

| Entity | Purpose | Contact |
|--------|---------|---------|
| **Legal Counsel** | Breach determination | [Law firm] [Phone] |
| **Cyber Insurance** | Incident reporting | [Provider] [Policy #] |
| **DigitalOcean Support** | Infrastructure | Premium Support [Portal] |
| **HHS OCR** | Breach notification | https://ocrportal.hhs.gov/ |

---

**END OF INCIDENT RESPONSE PLAN**

This plan is a living document and will be updated based on lessons learned from incidents and drills. All workforce members should be familiar with their role in incident response.

**For questions or suggestions, contact:** security@holilabs.xyz
