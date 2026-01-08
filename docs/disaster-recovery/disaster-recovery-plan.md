# Disaster Recovery Plan - Holi Labs EMR Platform

**Document Version:** 1.0
**Last Updated:** 2024-01-07
**Review Frequency:** Quarterly
**Next Review:** 2024-04-07

---

## Executive Summary

This Disaster Recovery (DR) plan provides procedures for recovering the Holi Labs EMR platform in the event of a catastrophic failure or disaster. The plan ensures business continuity, data protection, and compliance with HIPAA requirements.

**Recovery Objectives:**
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 1 hour
- **Uptime Target:** 99.9% (43 minutes downtime/month allowed)

---

## Scope

### Systems Covered
- **Application Server**: Next.js API and web application
- **Database**: PostgreSQL (patient data, appointments, prescriptions)
- **Cache/Queue**: Redis (sessions, email queue)
- **File Storage**: Object storage (documents, lab results, images)
- **External Services**: Resend, SendGrid, Twilio

### Disaster Scenarios
1. **Infrastructure Failure**: Cloud provider outage, data center failure
2. **Database Failure**: Corruption, accidental deletion, hardware failure
3. **Application Failure**: Deployment failure, critical bug, denial of service
4. **Security Incident**: Ransomware, data breach, malicious attack
5. **Data Loss**: Accidental deletion, database corruption
6. **Natural Disaster**: Earthquake, fire, flood affecting primary data center

---

## Recovery Time & Point Objectives

### RTO (Recovery Time Objective)

Maximum acceptable downtime for each system:

| System | RTO | Priority | Business Impact |
|--------|-----|----------|-----------------|
| Database (PostgreSQL) | **2 hours** | P0 - Critical | Complete system outage |
| Application Server | **1 hour** | P0 - Critical | Users cannot access system |
| Redis (sessions/queue) | **30 minutes** | P1 - High | Login failures, email delays |
| File Storage | **4 hours** | P2 - Medium | Cannot view documents |
| External APIs | **8 hours** | P3 - Low | Use fallback providers |

**Overall System RTO: 4 hours** (time to restore full functionality)

### RPO (Recovery Point Objective)

Maximum acceptable data loss for each system:

| System | RPO | Backup Frequency | Data Loss Risk |
|--------|-----|-----------------|----------------|
| Database | **1 hour** | Continuous (WAL) + Daily snapshots | Up to 1 hour of patient data |
| File Storage | **24 hours** | Daily backups | Up to 1 day of documents |
| Redis | **None** | No backups (ephemeral data) | Sessions invalidated |
| Audit Logs | **15 minutes** | Real-time + Daily archival | Up to 15 min of audit trail |

**Overall System RPO: 1 hour** (maximum acceptable data loss)

---

## Disaster Recovery Team

### Team Structure

**Disaster Recovery Commander** (DRC)
- **Primary**: CTO
- **Backup**: Lead DevOps Engineer
- **Responsibilities**: Declare disaster, coordinate recovery, communicate with stakeholders

**Database Recovery Lead**
- **Primary**: Database Administrator
- **Backup**: Senior Backend Engineer
- **Responsibilities**: Database restoration, data integrity verification

**Application Recovery Lead**
- **Primary**: Lead Backend Engineer
- **Backup**: Senior Full-Stack Engineer
- **Responsibilities**: Application deployment, configuration, testing

**Infrastructure Lead**
- **Primary**: DevOps Engineer
- **Backup**: SRE Engineer
- **Responsibilities**: Cloud infrastructure, networking, monitoring

**Communication Lead**
- **Primary**: VP of Operations
- **Backup**: Customer Success Manager
- **Responsibilities**: User communication, status updates, stakeholder management

**Compliance Officer**
- **Primary**: HIPAA Privacy Officer
- **Backup**: Legal Counsel
- **Responsibilities**: HIPAA compliance, breach assessment, regulatory notifications

### Contact Information

```markdown
## DR Team Emergency Contacts

| Role | Name | Phone | Email | Backup Phone |
|------|------|-------|-------|--------------|
| DRC | [Name] | [Phone] | [Email] | [Backup] |
| DB Lead | [Name] | [Phone] | [Email] | [Backup] |
| App Lead | [Name] | [Phone] | [Email] | [Backup] |
| Infra Lead | [Name] | [Phone] | [Email] | [Backup] |
| Comm Lead | [Name] | [Phone] | [Email] | [Backup] |
| Compliance | [Name] | [Phone] | [Email] | [Backup] |

**Emergency Communication Channel**: #disaster-recovery (Slack)
**War Room**: Zoom link: [URL]
```

---

## Disaster Declaration Criteria

### When to Declare a Disaster

A disaster should be declared when ANY of the following occur:

#### Immediate Disaster (Declare within 5 minutes)
- [ ] Database completely unavailable for >15 minutes
- [ ] Complete data loss (all backups failed)
- [ ] Ransomware/malware encrypting production data
- [ ] Cloud provider confirms >4 hour outage
- [ ] Physical data center destruction (fire, flood, earthquake)
- [ ] Security breach exposing >500 patient records

#### Urgent Disaster (Declare within 30 minutes)
- [ ] Application unavailable for >30 minutes with no resolution
- [ ] Critical data corruption affecting >1000 patients
- [ ] Partial data loss requiring restoration from backup
- [ ] Infrastructure failure requiring multi-region failover

#### Non-Emergency (Standard incident response)
- [ ] Single service degradation (email, scheduling)
- [ ] Performance issues not affecting availability
- [ ] Minor security incidents
- [ ] Isolated component failures

### Declaration Process

```bash
# 1. On-call engineer assesses situation
# 2. Contact DRC (CTO) immediately
# 3. DRC declares disaster level

# Declaration command
cat > /tmp/disaster-declared.txt <<EOF
=== DISASTER DECLARED ===
Time: $(date)
Declared by: [Name]
Level: [P0 Critical / P1 Urgent]
Situation: [Brief description]
Estimated RTO: [Hours]
Estimated RPO: [Data loss estimate]

DR Team: Assemble immediately
War Room: [Zoom URL]
EOF

# Notify DR team
# Slack: @channel in #disaster-recovery
# PagerDuty: Escalate to "Disaster Recovery" policy
# SMS: All DR team members
```

---

## Recovery Procedures

### Phase 1: Assessment & Containment (0-30 Minutes)

#### 1. Disaster Declaration
```bash
# DRC declares disaster and assembles team
echo "DISASTER DECLARED: $(date)" > /tmp/dr-incident-$(date +%Y%m%d-%H%M).log

# Start incident timer
START_TIME=$(date +%s)
```

#### 2. Situation Assessment
```markdown
**Assessment Checklist:**
- [ ] What failed? (Database, application, infrastructure)
- [ ] Root cause identified? (If known)
- [ ] How many users affected? (All, subset, specific region)
- [ ] Is data at risk? (Data loss, corruption, exposure)
- [ ] Are backups available? (Verify backup integrity)
- [ ] What is the estimated RTO? (Hours to recovery)
- [ ] What is the estimated RPO? (Data loss amount)
```

```bash
# Check system status
curl -I https://api.holilabs.xyz/api/health || echo "API DOWN"

# Check database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" || echo "DATABASE DOWN"

# Check recent backups
doctl databases backups list <database-id>
# or
aws rds describe-db-snapshots --db-instance-identifier holi-db | jq '.DBSnapshots[0]'

# Check monitoring dashboards
# - Grafana: https://grafana.holilabs.xyz
# - Sentry: https://sentry.io/organizations/holi-labs
```

#### 3. Preserve Evidence
```bash
# Take forensic snapshots (if security incident)
doctl compute snapshot create <droplet-id> --snapshot-name "disaster-$(date +%Y%m%d-%H%M%S)"

# Copy critical logs
tar -czf /tmp/disaster-logs-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/log/holi-api/*.log \
  /var/log/nginx/*.log \
  /var/log/postgresql/*.log

# Upload to secure storage
aws s3 cp /tmp/disaster-logs-*.tar.gz s3://holi-forensics/disasters/
```

#### 4. Containment (If Security Incident)
```bash
# See: Security Incident Response runbook
# - Isolate affected systems
# - Block malicious IPs
# - Revoke compromised credentials
```

---

### Phase 2: Communication (30-60 Minutes)

#### 1. Internal Communication

**War Room Activation:**
```markdown
## War Room Agenda

**Meeting:** Disaster Recovery - $(date)
**Zoom:** [URL]
**Duration:** Until recovery complete

**Attendees:**
- [ ] DRC (CTO)
- [ ] Database Lead
- [ ] Application Lead
- [ ] Infrastructure Lead
- [ ] Communication Lead
- [ ] Compliance Officer

**Agenda:**
1. Situation briefing (5 min)
2. Recovery strategy agreement (10 min)
3. Task assignments (5 min)
4. Status updates (every 30 min)

**Notes:** [Live document URL]
```

#### 2. External Communication

**Status Page Update:**
```bash
# Update status page (if using Statuspage.io, Atlassian)
curl -X PATCH https://api.statuspage.io/v1/pages/<page-id>/incidents/<incident-id> \
  -H "Authorization: OAuth <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "status": "investigating",
      "name": "Service Disruption",
      "message": "We are experiencing technical difficulties. Our team is working to restore service. Updates every 30 minutes.",
      "impact": "major"
    }
  }'
```

**User Notification Email:**
```markdown
Subject: Service Disruption - Holi Labs

Dear Holi Labs User,

We are currently experiencing technical difficulties affecting access to the Holi Labs platform.

**Status:** System unavailable
**Estimated Resolution:** [X] hours
**Next Update:** [Time]

Our engineering team is working urgently to restore service. We will provide updates every 30 minutes on our status page:
https://status.holilabs.xyz

We apologize for the inconvenience and appreciate your patience.

- Holi Labs Team
```

**Stakeholder Notification:**
```markdown
To: CEO, Board Members, Investors
Subject: URGENT: Disaster Recovery in Progress

We have declared a disaster recovery situation for the Holi Labs platform.

**Situation:** [Brief description]
**Impact:** [User impact]
**Estimated Recovery:** [X] hours
**Team Status:** DR team activated, recovery in progress

I will provide updates every hour until resolution.

[DRC Name]
CTO, Holi Labs
```

---

### Phase 3: Recovery Execution (1-4 Hours)

#### Scenario 1: Database Failure - Complete Loss

**Recovery Steps:**

```bash
# 1. Identify latest good backup
doctl databases backups list <database-id>
# Select backup from before failure (within RPO window)

BACKUP_DATE="2024-01-07T10:00:00Z"  # Last known good backup

# 2. Create new database from backup (DigitalOcean)
doctl databases fork <database-id> \
  --name holi-protocol-recovered-$(date +%Y%m%d) \
  --restore-from-backup $BACKUP_DATE \
  --region nyc3

# Wait for database creation (15-30 minutes)
watch -n 30 'doctl databases get holi-protocol-recovered-$(date +%Y%m%d) | grep status'

# 3. Get new database connection details
NEW_DB_HOST=$(doctl databases get <new-db-id> --format Host --no-header)
NEW_DB_PORT=$(doctl databases get <new-db-id> --format Port --no-header)

# 4. Verify data integrity
PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -p $NEW_DB_PORT -U holi -d holi_protocol -c "
  SELECT
    (SELECT COUNT(*) FROM \"Patient\") AS patients,
    (SELECT COUNT(*) FROM \"Appointment\") AS appointments,
    (SELECT COUNT(*) FROM \"Prescription\") AS prescriptions,
    (SELECT MAX(\"createdAt\") FROM \"Patient\") AS latest_patient;
"

# Compare with expected counts (from monitoring)

# 5. Update application connection string
NEW_DATABASE_URL="postgresql://holi:$DB_PASSWORD@$NEW_DB_HOST:$NEW_DB_PORT/holi_protocol?schema=public&sslmode=require"

doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: DATABASE_URL
        value: "$NEW_DATABASE_URL"
EOF

# 6. Restart application
doctl apps create-deployment <app-id>

# 7. Monitor recovery
doctl apps logs <app-id> --type=run --follow
```

**Data Loss Reconciliation:**
```bash
# Identify data created after backup (lost data)
# RPO = 1 hour, so up to 1 hour of data may be lost

# 1. Check audit logs for operations after backup time
# (Audit logs may be in separate system/archive)

# 2. Notify users of potential data loss
echo "Patients who registered between $BACKUP_DATE and $(date): [list]"

# 3. Manual data re-entry may be required
# Contact affected users to re-enter data
```

#### Scenario 2: Application Failure - Cannot Deploy

**Recovery Steps:**

```bash
# 1. Rollback to last known good deployment
doctl apps list-deployments <app-id>
# Identify last successful deployment

LAST_GOOD_DEPLOYMENT="<deployment-id>"

# 2. Rollback
doctl apps rollback <app-id> $LAST_GOOD_DEPLOYMENT

# 3. Monitor recovery
doctl apps logs <app-id> --type=build --follow

# 4. Verify health
curl https://api.holilabs.xyz/api/health
# Should return {"status":"ok"}

# 5. If rollback fails, deploy from git
git checkout <last-good-commit>
git push origin main --force  # Use with caution

# 6. Investigate root cause
# Fix issue in separate branch, test thoroughly
```

#### Scenario 3: Multi-Region Failover

**Recovery Steps:**

```bash
# 1. Activate secondary region (if configured)
# Update DNS to point to secondary region

# 2. Promote read replica to primary
doctl databases promote-replica <replica-id>

# 3. Update application to use new primary
NEW_DATABASE_URL="postgresql://holi:$DB_PASSWORD@$NEW_DB_HOST:5432/holi_protocol"

# 4. Verify replication lag (should be <1 minute)
PGPASSWORD=$DB_PASSWORD psql -h $NEW_DB_HOST -U holi -d holi_protocol -c "
  SELECT
    pg_last_wal_receive_lsn() AS receive_lsn,
    pg_last_wal_replay_lsn() AS replay_lsn,
    pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag_bytes;
"

# 5. Update DNS (if using Route53)
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.holilabs.xyz",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "<new-ip>"}]
      }
    }]
  }'

# 6. Wait for DNS propagation (1-5 minutes)
watch -n 10 'dig api.holilabs.xyz +short'
```

#### Scenario 4: Ransomware Attack

**Recovery Steps:**

```bash
# 1. IMMEDIATELY isolate all systems
# Disconnect from network to prevent spread

# 2. DO NOT PAY RANSOM
# Contact law enforcement (FBI Cyber Division: 855-292-3937)

# 3. Identify clean backup (before ransomware infection)
# Use backup from >7 days ago to ensure pre-infection

# 4. Rebuild ALL infrastructure from scratch
# DO NOT reuse potentially compromised systems

# 5. Rotate ALL credentials
# Database passwords, API keys, encryption keys

# 6. Restore from clean backup
# Follow database recovery procedures above

# 7. Conduct forensic analysis
# Determine infection vector and patch vulnerability

# 8. HIPAA breach assessment
# See: HIPAA Breach Notification runbook
```

---

### Phase 4: Verification (4-5 Hours)

#### 1. System Health Checks

**Application Health:**
```bash
# Test health endpoints
curl https://api.holilabs.xyz/api/health
curl https://api.holilabs.xyz/api/health/database
curl https://api.holilabs.xyz/api/health/redis

# Expected: All return {"status":"ok"}
```

**Critical User Flows:**
```bash
# 1. Test login
curl -X POST https://api.holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should return session token

# 2. Test patient read
curl https://api.holilabs.xyz/api/patients/123 \
  -H "Authorization: Bearer $TOKEN"

# Should return patient data

# 3. Test appointment creation
curl -X POST https://api.holilabs.xyz/api/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patientId":"123","scheduledFor":"2024-01-10T10:00:00Z"}'

# Should create appointment

# 4. Test prescription creation
curl -X POST https://api.holilabs.xyz/api/prescriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patientId":"123","medication":"Amoxicillin"}'

# Should create prescription
```

#### 2. Data Integrity Verification

```sql
-- Verify record counts match expected
SELECT
  'Patient' AS table_name,
  COUNT(*) AS record_count,
  MAX("createdAt") AS latest_record
FROM "Patient"
UNION ALL
SELECT
  'Appointment',
  COUNT(*),
  MAX("createdAt")
FROM "Appointment"
UNION ALL
SELECT
  'Prescription',
  COUNT(*),
  MAX("createdAt")
FROM "Prescription";

-- Compare with pre-disaster counts
-- Difference should be within RPO window (1 hour of data)

-- Check for data corruption
SELECT
  id,
  "firstName",
  "lastName",
  "dateOfBirth"
FROM "Patient"
WHERE "firstName" IS NULL
  OR "lastName" IS NULL
  OR "dateOfBirth" IS NULL
LIMIT 10;

-- Should return 0 rows (no NULL required fields)
```

#### 3. Monitoring Verification

```bash
# Verify monitoring is functioning
# Grafana should show green metrics
# Prometheus should be scraping metrics
# Sentry should receive test error

# Send test alert
curl -X POST https://api.holilabs.xyz/api/test/alert

# Should receive PagerDuty notification
```

---

### Phase 5: Post-Recovery (5+ Hours)

#### 1. Service Restoration Announcement

**Status Page Update:**
```markdown
**RESOLVED** - Service Restored

All systems have been restored and are functioning normally.

**Timeline:**
- 10:00 AM: Issue detected
- 10:15 AM: Disaster declared
- 10:30 AM: Recovery initiated
- 2:00 PM: Service restored
- 2:30 PM: Verification complete

**Root Cause:** [Brief description]

**Impact:** [Users affected, duration]

**Resolution:** [What was done to fix]

**Data Loss:** [None / Minimal - within 1 hour RPO]

**Prevention:** [Measures implemented to prevent recurrence]

We apologize for the disruption and appreciate your patience.
```

#### 2. Data Loss Communication (If Applicable)

```markdown
Subject: Important: Potential Data Loss During Service Disruption

Dear [Affected User],

We have successfully restored the Holi Labs platform after today's service disruption.

**Data Loss Notice:**
Due to the nature of the incident, some data created between [time] and [time] may have been lost during recovery.

**Potentially Affected Data:**
- Patient registrations
- Appointment bookings
- Prescription records
- [Other data types]

**Action Required:**
Please review your records and re-enter any missing data from this time period.

If you need assistance, please contact support@holilabs.xyz or call [phone].

We sincerely apologize for this inconvenience.

- Holi Labs Team
```

#### 3. Post-Mortem Report

```markdown
## Disaster Recovery Post-Mortem

**Incident ID:** DR-2024-01-07
**Date:** 2024-01-07
**Duration:** 4 hours 15 minutes (10:00 AM - 2:15 PM)

### What Happened
[Detailed chronological description]

### Timeline
- 10:00 AM: Issue first detected by monitoring
- 10:05 AM: On-call engineer began investigation
- 10:15 AM: DRC declared disaster (P0 Critical)
- 10:20 AM: DR team assembled in war room
- 10:30 AM: Recovery plan agreed, execution started
- 11:00 AM: Database restoration initiated
- 12:30 PM: New database online
- 1:00 PM: Application redeployed with new DB
- 1:30 PM: Health checks passing
- 2:00 PM: Critical user flows verified
- 2:15 PM: Service restored announcement

### Root Cause
[Technical analysis of what caused the disaster]

### Impact Assessment
- **Users Affected:** [Number / Percentage]
- **Downtime:** 4 hours 15 minutes
- **Data Loss:** [Amount within RPO]
- **Revenue Impact:** [Estimate]
- **Reputation Impact:** [Assessment]

### What Went Well
- [ ] Disaster declared quickly (15 minutes)
- [ ] Team assembled rapidly
- [ ] Backups were available and restored successfully
- [ ] Communication was clear and frequent
- [ ] RTO met (4 hours target, 4h 15m actual)
- [ ] RPO met (1 hour target, 45m actual data loss)

### What Went Poorly
- [ ] [Issue 1]
- [ ] [Issue 2]
- [ ] [Issue 3]

### Action Items
1. [ ] [Preventive measure 1] - Owner: [Name] - Due: [Date]
2. [ ] [Preventive measure 2] - Owner: [Name] - Due: [Date]
3. [ ] [Process improvement 1] - Owner: [Name] - Due: [Date]
4. [ ] [Documentation update] - Owner: [Name] - Due: [Date]

### Lessons Learned
[Key takeaways for future incidents]

**Reviewed By:**
- DRC: [Signature] [Date]
- CEO: [Signature] [Date]
- Compliance: [Signature] [Date]
```

#### 4. Compliance Documentation

**HIPAA Documentation (If PHI Affected):**
```markdown
## HIPAA Breach Assessment - Disaster Recovery

**Incident:** DR-2024-01-07
**Assessment Date:** 2024-01-07

### Was PHI Compromised?
- [ ] No - System unavailable but no unauthorized access
- [ ] Yes - Unauthorized access occurred
- [ ] Unknown - Forensic investigation required

### Breach Determination
[Complete 4-factor risk assessment]

### Notification Required
- [ ] Yes - Proceed with HIPAA Breach Notification runbook
- [ ] No - Document decision rationale

**Reviewed by Compliance Officer:** [Signature] [Date]
```

---

## DR Testing Schedule

### Quarterly DR Drills (Required)

**Q1 2024: Database Restore Drill**
- **Date:** March 15, 2024
- **Scenario:** Simulated database corruption
- **Scope:** Restore from backup to test environment
- **Duration:** 2 hours
- **Participants:** DB Lead, DRC, Infrastructure Lead

**Q2 2024: Full System Failover**
- **Date:** June 15, 2024
- **Scenario:** Complete primary region failure
- **Scope:** Failover to secondary region
- **Duration:** 4 hours
- **Participants:** Full DR team

**Q3 2024: Ransomware Simulation**
- **Date:** September 15, 2024
- **Scenario:** Ransomware encryption detected
- **Scope:** System isolation, backup verification, rebuild
- **Duration:** 3 hours
- **Participants:** Full DR team + Security

**Q4 2024: Communication Drill**
- **Date:** December 15, 2024
- **Scenario:** Tabletop exercise (no actual recovery)
- **Scope:** Test communication protocols, decision-making
- **Duration:** 2 hours
- **Participants:** Full DR team + Executive leadership

### DR Drill Procedures

```bash
# Before drill
# 1. Schedule in advance (30 days notice)
# 2. Notify all participants
# 3. Prepare test environment
# 4. Set success criteria

# During drill
# 1. Start timer
# 2. Execute recovery procedures
# 3. Document all actions
# 4. Record issues encountered

# After drill
# 1. Debrief with team (30 min)
# 2. Document lessons learned
# 3. Update DR plan
# 4. Create action items for improvements
```

---

## Appendix

### A. Backup Verification Script

```bash
#!/bin/bash
# Script: verify-backups.sh
# Run daily to verify backup integrity

echo "=== Backup Verification: $(date) ==="

# 1. Check database backups
doctl databases backups list <database-id> --format Created,Status

# 2. Verify latest backup is <24 hours old
LATEST_BACKUP=$(doctl databases backups list <database-id> --format Created --no-header | head -1)
BACKUP_AGE_SECONDS=$(( $(date +%s) - $(date -d "$LATEST_BACKUP" +%s) ))
BACKUP_AGE_HOURS=$(( BACKUP_AGE_SECONDS / 3600 ))

if [ $BACKUP_AGE_HOURS -lt 24 ]; then
  echo "✓ Latest backup is $BACKUP_AGE_HOURS hours old"
else
  echo "✗ WARNING: Latest backup is $BACKUP_AGE_HOURS hours old (>24 hours!)"
  # Alert
  curl -X POST $SLACK_WEBHOOK -d '{"text":"⚠️ Database backup is >24 hours old"}'
fi

# 3. Verify file storage backups
aws s3 ls s3://holi-backups/files/ --recursive | tail -5

# 4. Verify audit log archives
ls -lh /var/audits/archives/ | tail -5

echo "=== Verification complete ==="
```

### B. Emergency Contact Card

```
┌─────────────────────────────────────────┐
│   DISASTER RECOVERY EMERGENCY CARD      │
├─────────────────────────────────────────┤
│ DRC (CTO):        [Name] [Phone]        │
│ DB Lead:          [Name] [Phone]        │
│ App Lead:         [Name] [Phone]        │
│ War Room:         [Zoom URL]            │
│ Status Page:      status.holilabs.xyz   │
│ This Plan:        [Document URL]        │
└─────────────────────────────────────────┘
```

---

## Document Control

**Approval:**
- CTO: __________________ Date: __________
- CEO: __________________ Date: __________
- Compliance: ___________ Date: __________

**Revision History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-07 | [Name] | Initial version |

**Next Review:** 2024-04-07

---

## Related Documents
- [Backup Restoration Runbook](../runbooks/backup-restoration.md)
- [Security Incident Response Runbook](../runbooks/security-incident-response.md)
- [HIPAA Breach Notification Runbook](../runbooks/hipaa-breach-notification.md)
- [Database Connection Failure Runbook](../runbooks/database-connection-failure.md)
