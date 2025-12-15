# Disaster Recovery Runbook

**Last Updated**: 2025-12-15
**Version**: 1.0.0
**Classification**: CONFIDENTIAL - OPERATIONAL USE ONLY

## Purpose

This runbook provides step-by-step procedures for recovering from catastrophic failures affecting the Holi Labs healthcare platform. Use this guide during production incidents requiring data restoration.

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Incident Classification](#incident-classification)
3. [Pre-Recovery Checklist](#pre-recovery-checklist)
4. [Recovery Scenarios](#recovery-scenarios)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Recovery Procedures](#post-recovery-procedures)
7. [Communication Templates](#communication-templates)

---

## Emergency Contacts

### Primary On-Call Team

| Role                    | Name              | Phone            | Email                    | Availability   |
|-------------------------|-------------------|------------------|--------------------------|----------------|
| On-Call Engineer        | [Your Name]       | +1-XXX-XXX-XXXX  | oncall@holilabs.com      | 24/7           |
| Database Administrator  | [DBA Name]        | +1-XXX-XXX-XXXX  | dba@holilabs.com         | 24/7           |
| Security Officer        | [Security Name]   | +1-XXX-XXX-XXXX  | security@holilabs.com    | 24/7           |
| CTO                     | [CTO Name]        | +1-XXX-XXX-XXXX  | cto@holilabs.com         | Business hours |

### Escalation Chain

```
Level 1: On-Call Engineer (0-30 min)
    ↓ (if unresolved)
Level 2: Database Administrator + DevOps Lead (30-60 min)
    ↓ (if major incident)
Level 3: CTO + Security Officer (60+ min)
```

### External Support

| Provider          | Support URL                              | SLA Response Time |
|-------------------|------------------------------------------|-------------------|
| DigitalOcean      | https://cloud.digitalocean.com/support   | 30 minutes (Business), 1 hour (Pro) |
| Cloudflare        | https://dash.cloudflare.com/support      | 2 hours (Pro)     |
| Supabase          | https://supabase.com/dashboard/support   | 4 hours (Pro)     |
| AWS               | https://console.aws.amazon.com/support   | 15 minutes (Business) |

---

## Incident Classification

### Severity Levels

#### P0 - CRITICAL (IMMEDIATE ACTION REQUIRED)

**RTO: < 4 hours**

- Complete database failure
- Data loss or corruption affecting patient records
- Security breach with data exfiltration
- Complete application unavailability

**Response**: Activate full team immediately

#### P1 - HIGH (URGENT)

**RTO: < 8 hours**

- Partial database failure
- Degraded performance affecting multiple users
- Failed deployment requiring rollback
- Data inconsistencies detected

**Response**: On-call engineer + DBA

#### P2 - MEDIUM (SCHEDULED)

**RTO: < 24 hours**

- Single component failure with workaround available
- Non-critical data inconsistencies
- Planned maintenance requiring restore

**Response**: On-call engineer during business hours

#### P3 - LOW (MONITORED)

**RTO: < 7 days**

- Development/staging environment issues
- Test restore verification
- Backup verification failures

**Response**: Regular team during business hours

---

## Pre-Recovery Checklist

Before proceeding with any recovery procedure, complete this checklist:

### 1. Assess the Situation (5 minutes)

- [ ] Confirm the incident severity (P0/P1/P2/P3)
- [ ] Identify affected systems (database, application, storage, network)
- [ ] Determine the root cause (if known)
- [ ] Estimate data loss window (how much data might be lost)
- [ ] Check if incident is still ongoing (stop the bleeding first)

### 2. Notify Stakeholders (5 minutes)

- [ ] Create incident in incident management system
- [ ] Notify on-call team via PagerDuty/Slack
- [ ] Send initial status update to stakeholders
- [ ] Start incident timeline document

### 3. Preserve Evidence (10 minutes)

**CRITICAL: Do this BEFORE any recovery actions**

```bash
# Create incident directory
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
mkdir -p /tmp/incidents/$INCIDENT_ID
cd /tmp/incidents/$INCIDENT_ID

# Capture system state
echo "Capturing system state at $(date)" | tee capture.log

# Database status
psql $DATABASE_URL -c "SELECT version();" > db-version.txt 2>&1
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;" > db-connections.txt 2>&1
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;" > db-stats.txt 2>&1

# Application logs (last 1000 lines)
doctl apps logs $DIGITALOCEAN_APP_ID --type=run --tail=1000 > app-logs.txt 2>&1

# System metrics
doctl monitoring alert list > alerts.txt 2>&1

# Recent deployments
git log -10 --oneline > recent-commits.txt 2>&1

# Backup status
ls -lh /path/to/backups/ > backup-list.txt 2>&1
tsx scripts/verify-backups.ts > backup-verification.txt 2>&1

# Package the evidence
tar -czf $INCIDENT_ID-evidence.tar.gz *.txt capture.log
echo "Evidence preserved: /tmp/incidents/$INCIDENT_ID/$INCIDENT_ID-evidence.tar.gz"
```

### 4. Make Go/No-Go Decision (5 minutes)

**Decision Matrix:**

| Condition                          | Action                    |
|------------------------------------|---------------------------|
| Issue resolved without restore     | Cancel recovery, monitor  |
| Data loss < 1 hour, PITR available | Use PITR (fastest)        |
| Data loss < 24 hours, backups OK   | Full restore from backup  |
| Backups corrupted/missing          | Escalate to Level 3       |
| Active attack ongoing              | Isolate system first      |

**Authorization Required:**

- P0 incidents: CTO approval required before restore
- P1 incidents: DBA approval sufficient
- P2/P3 incidents: On-call engineer can proceed

---

## Recovery Scenarios

---

## Scenario 1: Complete Database Failure

**Symptoms:**
- Application cannot connect to database
- `psql` connection refused
- DigitalOcean shows database as "down"

**Estimated Recovery Time: 2-4 hours**

### Step 1: Assess Database Status (5 minutes)

```bash
# Check database health
doctl databases list | grep holi-labs

# Check database logs
doctl databases logs YOUR_DB_ID --type=postgresql

# Attempt connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Step 2: Attempt Quick Recovery (15 minutes)

Try restarting database first:

```bash
# Restart managed database
doctl databases restart YOUR_DB_ID

# Wait for restart (2-5 minutes)
sleep 300

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

**If restart succeeds**: Skip to [Post-Recovery Procedures](#post-recovery-procedures)

**If restart fails**: Continue to full restore

### Step 3: Full Database Restore (90-120 minutes)

#### Option A: Restore from DigitalOcean Managed Backup (FASTER)

```bash
# 1. Fork database from latest backup
doctl databases fork YOUR_DB_ID \
  --name "holi-labs-restored-$(date +%Y%m%d)" \
  --region nyc3

# Output: New database ID
# NEW_DB_ID=dbaas-xxxxx

# 2. Wait for fork to complete (30-60 minutes)
watch -n 30 "doctl databases get $NEW_DB_ID | grep status"

# 3. Get new connection string
doctl databases connection $NEW_DB_ID --format Host,Port,User,Password,Database

# 4. Update application environment variable
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env DATABASE_URL="postgresql://user:pass@new-host:25060/database?sslmode=require"

# 5. Restart application
doctl apps create-deployment $DIGITALOCEAN_APP_ID --wait
```

#### Option B: Restore from Custom Backup (If managed backup unavailable)

```bash
# 1. Create new database
doctl databases create holi-labs-restored \
  --engine postgresql \
  --version 14 \
  --region nyc3 \
  --size db-s-1vcpu-1gb

# Get new database ID
NEW_DB_ID=$(doctl databases list --format ID,Name --no-header | grep holi-labs-restored | awk '{print $1}')

# 2. Download latest backup from R2/S3
export AWS_ENDPOINT_URL=$R2_ENDPOINT
aws s3 cp s3://holi-labs-backups/database/backup-daily-$(date +%Y-%m-%d).sql.gz . \
  --endpoint-url=$R2_ENDPOINT

# Fallback to yesterday if today's backup doesn't exist
if [ ! -f "backup-daily-$(date +%Y-%m-%d).sql.gz" ]; then
  aws s3 cp s3://holi-labs-backups/database/backup-daily-$(date -d "yesterday" +%Y-%m-%d).sql.gz . \
    --endpoint-url=$R2_ENDPOINT
fi

# 3. Get new database connection string
NEW_DATABASE_URL=$(doctl databases connection $NEW_DB_ID --format URI --no-header)

# 4. Restore backup
echo "Restoring backup at $(date)..."
gunzip -c backup-daily-*.sql.gz | psql "$NEW_DATABASE_URL"

# 5. Verify restore
psql "$NEW_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$NEW_DATABASE_URL" -c "SELECT COUNT(*) FROM patients;"
psql "$NEW_DATABASE_URL" -c "SELECT COUNT(*) FROM appointments;"

# 6. Update application
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env DATABASE_URL="$NEW_DATABASE_URL"

# 7. Restart application
doctl apps create-deployment $DIGITALOCEAN_APP_ID --wait
```

### Step 4: Verify Recovery (15 minutes)

```bash
# 1. Health check
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready

# Expected: {"status":"healthy","database":"ok"}

# 2. Test authentication
# Open browser: https://holilabs-lwp6y.ondigitalocean.app/auth/login
# Try logging in

# 3. Test data access
psql $NEW_DATABASE_URL -c "SELECT email FROM users LIMIT 5;"

# 4. Check application logs
doctl apps logs $DIGITALOCEAN_APP_ID --type=run --follow
```

### Step 5: Cleanup (10 minutes)

```bash
# Keep old database for 7 days (forensics)
# DO NOT DELETE IMMEDIATELY

# Tag old database
doctl databases update YOUR_OLD_DB_ID \
  --tag "failed-$(date +%Y%m%d)"

# Set reminder to delete after 7 days
echo "TODO: Delete old database $YOUR_OLD_DB_ID after $(date -d '+7 days' +%Y-%m-%d)" \
  >> /tmp/cleanup-reminders.txt
```

---

## Scenario 2: Data Corruption Detected

**Symptoms:**
- Invalid or inconsistent data in database
- Foreign key constraint violations
- Users report incorrect data

**Estimated Recovery Time: 1-2 hours**

### Step 1: Isolate Corruption (10 minutes)

```bash
# 1. Put application in maintenance mode
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env MAINTENANCE_MODE="true"

# 2. Identify corrupted tables
psql $DATABASE_URL << 'EOF'
-- Check for orphaned records
SELECT 'appointments' AS table_name, COUNT(*) AS orphaned_count
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT 'prescriptions', COUNT(*)
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id
WHERE p.id IS NULL;

-- Check for constraint violations
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'f';
EOF

# 3. Determine corruption scope
# If limited to specific records: Manual fix
# If widespread: Full restore
```

### Step 2: Point-in-Time Recovery (30-45 minutes)

**If corruption happened recently (< 7 days):**

```bash
# 1. Determine corruption timestamp
# Check audit logs, application logs, or user reports
CORRUPTION_TIME="2025-12-15 14:30:00 UTC"

# 2. Fork database to point before corruption
doctl databases fork YOUR_DB_ID \
  --name "holi-labs-pitr-$(date +%Y%m%d-%H%M)" \
  --restore-from-timestamp "$(date -d "$CORRUPTION_TIME - 1 hour" --iso-8601=seconds)" \
  --region nyc3

# 3. Get new database ID
NEW_DB_ID=$(doctl databases list --format ID,Name --no-header | grep holi-labs-pitr | awk '{print $1}')

# 4. Wait for PITR completion
watch -n 30 "doctl databases get $NEW_DB_ID | grep status"

# 5. Verify data integrity
NEW_DATABASE_URL=$(doctl databases connection $NEW_DB_ID --format URI --no-header)
psql "$NEW_DATABASE_URL" -c "SELECT COUNT(*) FROM appointments WHERE created_at >= '$CORRUPTION_TIME'::timestamp - interval '2 hours';"

# 6. Update application
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env DATABASE_URL="$NEW_DATABASE_URL" \
  --set-env MAINTENANCE_MODE="false"

# 7. Restart
doctl apps create-deployment $DIGITALOCEAN_APP_ID --wait
```

### Step 3: Manual Data Recovery (15-30 minutes)

**If only specific records affected:**

```bash
# 1. Export corrupted data for analysis
psql $DATABASE_URL -c "COPY (SELECT * FROM corrupted_table WHERE conditions) TO STDOUT CSV HEADER;" \
  > corrupted-data.csv

# 2. Restore affected records from backup
# Download backup
aws s3 cp s3://holi-labs-backups/database/backup-daily-$(date -d "yesterday" +%Y-%m-%d).sql.gz . \
  --endpoint-url=$R2_ENDPOINT

# Extract specific table
gunzip -c backup-daily-*.sql.gz | \
  sed -n '/COPY corrupted_table/,/\\\./p' | \
  psql $DATABASE_URL

# 3. Verify fix
psql $DATABASE_URL -c "SELECT COUNT(*) FROM corrupted_table;"

# 4. Exit maintenance mode
doctl apps update $DIGITALOCEAN_APP_ID --set-env MAINTENANCE_MODE="false"
```

---

## Scenario 3: Failed Deployment

**Symptoms:**
- Application not starting after deployment
- Health checks failing
- New version has critical bugs

**Estimated Recovery Time: 15-30 minutes**

### Step 1: Quick Rollback (10 minutes)

```bash
# 1. Check recent deployments
doctl apps deployments list $DIGITALOCEAN_APP_ID

# Output shows deployment IDs
# CURRENT_DEPLOYMENT_ID: abc123 (failed)
# PREVIOUS_DEPLOYMENT_ID: xyz789 (working)

# 2. Rollback to previous deployment
doctl apps deployments rollback $DIGITALOCEAN_APP_ID $PREVIOUS_DEPLOYMENT_ID

# 3. Monitor rollback
doctl apps logs $DIGITALOCEAN_APP_ID --type=run --follow

# 4. Verify health
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready
```

### Step 2: Rollback Database Migration (if applicable)

**If deployment included database migration:**

```bash
# 1. Check migration status
psql $DATABASE_URL -c "SELECT * FROM prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# 2. Rollback last migration
cd /path/to/holilabsv2/apps/web

# If using Prisma migrate
# Create rollback migration manually
psql $DATABASE_URL -f prisma/migrations/ROLLBACK-$(date +%Y%m%d).sql

# 3. Verify schema
npx prisma migrate status
```

### Step 3: Git Revert (if needed)

```bash
# 1. Identify bad commit
git log --oneline -10

# 2. Revert commit (creates new commit)
git revert COMMIT_HASH

# 3. Push revert
git push origin main

# This triggers new deployment with reverted code
```

---

## Scenario 4: Security Breach / Data Exfiltration

**Symptoms:**
- Suspicious database access patterns
- Unauthorized API calls
- Data dump detected
- Security alerts from monitoring

**Estimated Recovery Time: 4-8 hours**

**CRITICAL: Follow security incident response plan**

### Step 1: Immediate Containment (5 minutes)

```bash
# 1. Enable maintenance mode
doctl apps update $DIGITALOCEAN_APP_ID --set-env MAINTENANCE_MODE="true"

# 2. Rotate all secrets IMMEDIATELY
# Generate new secrets
NEW_DATABASE_PASSWORD=$(openssl rand -base64 32)
NEW_API_KEYS=$(openssl rand -hex 32)

# 3. Update database password
doctl databases user update YOUR_DB_ID YOUR_USER --password "$NEW_DATABASE_PASSWORD"

# 4. Update application secrets
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env DATABASE_URL="postgresql://user:$NEW_DATABASE_PASSWORD@host:port/db" \
  --set-env API_KEY="$NEW_API_KEYS"

# 5. Force logout all users
psql $DATABASE_URL -c "DELETE FROM user_sessions;"
```

### Step 2: Assess Damage (30 minutes)

```bash
# 1. Check audit logs
psql $DATABASE_URL << 'EOF'
SELECT *
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
EOF

# 2. Identify compromised data
# Check for unusual queries, bulk exports, or suspicious access patterns

# 3. Notify security team
# Send incident report with evidence package
```

### Step 3: Restore to Pre-Breach State (2-3 hours)

**Use PITR to restore to point before breach:**

```bash
# Determine breach timestamp
BREACH_TIME="2025-12-15 16:00:00 UTC"

# Fork database to 1 hour before breach
doctl databases fork YOUR_DB_ID \
  --name "holi-labs-security-restore-$(date +%Y%m%d)" \
  --restore-from-timestamp "$(date -d "$BREACH_TIME - 1 hour" --iso-8601=seconds)"

# Follow steps from Scenario 1 for restore
```

### Step 4: Compliance Notifications (REQUIRED)

**HIPAA Breach Notification Rule - 45 CFR 164.404-414**

```bash
# 1. Document breach details
cat > breach-report-$INCIDENT_ID.md << EOF
# Security Breach Report - $INCIDENT_ID

## Breach Details
- Discovery Date: $(date)
- Estimated Breach Time: $BREACH_TIME
- Affected Systems: [Database, Application, API]
- Data Affected: [Patient records, appointments, etc.]
- Number of Affected Individuals: [TO BE DETERMINED]

## Actions Taken
- [x] System isolated
- [x] Secrets rotated
- [x] Data restored from pre-breach backup
- [ ] Forensic analysis ongoing
- [ ] Law enforcement notified (if applicable)

## Compliance Notifications
- [ ] OCR notification (if > 500 records) - within 60 days
- [ ] Affected individuals notification - within 60 days
- [ ] Media notification (if > 500 residents in a state)
EOF

# 2. Notify compliance officer immediately
mail -s "URGENT: Security Breach - $INCIDENT_ID" compliance@holilabs.com < breach-report-$INCIDENT_ID.md
```

---

## Scenario 5: Cloud Storage Failure (R2/S3)

**Symptoms:**
- Cannot upload/download patient documents
- Backup uploads failing
- File retrieval errors

**Estimated Recovery Time: 1-2 hours**

### Step 1: Verify Outage (5 minutes)

```bash
# 1. Test R2 connectivity
aws s3 ls s3://holi-labs-backups/ --endpoint-url=$R2_ENDPOINT

# 2. Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# 3. Test with alternate credentials
# If API keys expired, generate new ones
```

### Step 2: Failover to Alternate Storage (30 minutes)

**If using R2, failover to S3:**

```bash
# 1. Provision S3 bucket
aws s3 mb s3://holi-labs-backups-failover

# 2. Enable encryption
aws s3api put-bucket-encryption \
  --bucket holi-labs-backups-failover \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 3. Update application to use S3
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env S3_ENDPOINT="https://s3.amazonaws.com" \
  --set-env S3_BUCKET="holi-labs-backups-failover" \
  --set-env AWS_ACCESS_KEY_ID="$AWS_KEY" \
  --set-env AWS_SECRET_ACCESS_KEY="$AWS_SECRET"

# 4. Restart application
doctl apps create-deployment $DIGITALOCEAN_APP_ID --wait
```

### Step 3: Sync Backups (60 minutes)

```bash
# Copy existing backups from R2 to S3
aws s3 sync s3://holi-labs-backups/ s3://holi-labs-backups-failover/ \
  --endpoint-url=$R2_ENDPOINT \
  --source-region auto \
  --exclude "*" \
  --include "database/*"
```

---

## Rollback Procedures

### Component-Specific Rollback

#### 1. Application Code Rollback

```bash
# Via DigitalOcean (recommended)
doctl apps deployments rollback $DIGITALOCEAN_APP_ID $PREVIOUS_DEPLOYMENT_ID

# Via Git (manual)
git revert $COMMIT_HASH
git push origin main
```

#### 2. Database Schema Rollback

```bash
# Check current migrations
npx prisma migrate status

# Create manual rollback script
cat > prisma/migrations/ROLLBACK-$(date +%Y%m%d).sql << 'EOF'
-- Rollback migration: add_new_column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- Rollback migration: create_new_table
DROP TABLE IF EXISTS new_table CASCADE;
EOF

# Apply rollback
psql $DATABASE_URL -f prisma/migrations/ROLLBACK-$(date +%Y%m%d).sql

# Verify
npx prisma migrate status
```

#### 3. Environment Variables Rollback

```bash
# List current env vars
doctl apps spec get $DIGITALOCEAN_APP_ID

# Restore previous values
doctl apps update $DIGITALOCEAN_APP_ID \
  --set-env VARIABLE_NAME="previous_value"
```

#### 4. DNS Rollback (if custom domain)

```bash
# Update DNS records to point to previous server
# Via Cloudflare API
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"content":"previous-ip-address"}'
```

---

## Post-Recovery Procedures

### 1. Verification Checklist (30 minutes)

**After any recovery, verify these items:**

- [ ] **Health Checks Pass**
  ```bash
  curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready
  ```

- [ ] **Database Connectivity**
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] **User Authentication**
  - Test login via web interface
  - Verify session creation

- [ ] **Core Features**
  - Create test appointment
  - Upload test document
  - Send test notification

- [ ] **Data Integrity**
  ```bash
  psql $DATABASE_URL << 'EOF'
  -- Verify record counts
  SELECT 'users' AS table_name, COUNT(*) AS count FROM users
  UNION ALL
  SELECT 'patients', COUNT(*) FROM patients
  UNION ALL
  SELECT 'appointments', COUNT(*) FROM appointments;

  -- Check for orphaned records
  SELECT COUNT(*) AS orphaned_appointments
  FROM appointments a
  LEFT JOIN patients p ON a.patient_id = p.id
  WHERE p.id IS NULL;
  EOF
  ```

- [ ] **Application Logs**
  ```bash
  # Check for errors
  doctl apps logs $DIGITALOCEAN_APP_ID --type=run --tail=100 | grep -i error
  ```

- [ ] **Monitoring Systems**
  - Check Sentry for new errors
  - Verify monitoring dashboards

### 2. Root Cause Analysis (2-4 hours)

**Create RCA document:**

```bash
cat > rca-$INCIDENT_ID.md << 'EOF'
# Root Cause Analysis - $INCIDENT_ID

## Incident Summary
- **Date**: [Incident date]
- **Duration**: [Start time] to [End time] ([Total duration])
- **Severity**: [P0/P1/P2/P3]
- **Impact**: [Description of user impact]

## Timeline
- [HH:MM] - Incident detected
- [HH:MM] - Team notified
- [HH:MM] - Recovery initiated
- [HH:MM] - Service restored
- [HH:MM] - Incident closed

## Root Cause
[Detailed explanation of what caused the incident]

## Detection
[How was the incident detected? Monitoring alert, user report, etc.]

## Response
[What actions were taken to resolve the incident?]

## Recovery
[How was service restored? Which recovery procedure was used?]

## Data Loss
[How much data was lost? What was the actual RPO?]

## Lessons Learned

### What Went Well
- [Positive aspects of the response]

### What Didn't Go Well
- [Areas that need improvement]

### Action Items
- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]

## Prevention Measures
[What can we do to prevent this from happening again?]

## Related Documents
- Incident ticket: [Link]
- Communication log: [Link]
- Evidence package: /tmp/incidents/$INCIDENT_ID/
EOF
```

### 3. Update Documentation (1 hour)

```bash
# If runbook was insufficient, update it
git checkout -b update-runbook-$INCIDENT_ID
vim docs/runbooks/DISASTER_RECOVERY.md
git commit -m "Update disaster recovery runbook based on $INCIDENT_ID"
git push origin update-runbook-$INCIDENT_ID
```

### 4. Team Debrief (1 hour)

Schedule team meeting to discuss:
- What happened
- What went well
- What could be improved
- Action items

### 5. Compliance Documentation (2 hours)

**For HIPAA compliance, document:**

```bash
cat > compliance-report-$INCIDENT_ID.md << 'EOF'
# HIPAA Incident Report - $INCIDENT_ID

## Incident Classification
- [ ] Security Incident
- [ ] Privacy Incident
- [ ] Breach (notification required)
- [ ] Near miss (no PHI affected)

## PHI Impact Assessment
- Records affected: [Number]
- Data elements exposed: [List]
- Individuals affected: [Number]
- Risk level: [Low/Medium/High]

## Breach Determination
- [ ] PHI accessed by unauthorized person? [Yes/No]
- [ ] PHI used inappropriately? [Yes/No]
- [ ] PHI disclosed impermissibly? [Yes/No]

## Risk Assessment
[Low/Medium/High risk to individuals]

## Mitigation Actions
- [x] Incident contained
- [x] Data restored
- [ ] Individuals notified (if required)
- [ ] OCR notified (if required)
- [ ] Law enforcement notified (if required)

## Prevention Measures
[What controls are being implemented?]

## Completed By
Name: [Your name]
Title: [Your title]
Date: [Completion date]
EOF
```

---

## Communication Templates

### Template 1: Initial Incident Notification

**Subject**: [P0/P1/P2] INCIDENT: Database Failure

```
TO: engineering-team@holilabs.com, cto@holilabs.com
SEVERITY: P0 - CRITICAL
STATUS: INVESTIGATING

INCIDENT: $INCIDENT_ID
DETECTED: [Timestamp]
IMPACT: Application unavailable, database unreachable
AFFECTED: All users

CURRENT STATUS:
- Team notified and responding
- Evidence preserved
- Assessing recovery options

NEXT UPDATE: [+30 minutes]

INCIDENT COMMANDER: [Your name]
```

### Template 2: Recovery in Progress

**Subject**: [P0] INCIDENT UPDATE: Recovery in Progress

```
TO: engineering-team@holilabs.com, cto@holilabs.com
SEVERITY: P0 - CRITICAL
STATUS: RECOVERING

INCIDENT: $INCIDENT_ID
UPDATE: #2 at [Timestamp]

ACTIONS TAKEN:
- Root cause identified: [Brief description]
- Recovery initiated: Restoring from backup
- ETA for recovery: [Time estimate]

CURRENT STATUS:
- Database restore 60% complete
- Application in maintenance mode
- No additional data loss expected

NEXT UPDATE: [+30 minutes]

INCIDENT COMMANDER: [Your name]
```

### Template 3: Service Restored

**Subject**: [P0] INCIDENT RESOLVED: Service Restored

```
TO: engineering-team@holilabs.com, cto@holilabs.com
SEVERITY: P0 - CRITICAL
STATUS: RESOLVED

INCIDENT: $INCIDENT_ID
RESOLVED: [Timestamp]
DURATION: [Total time]

RESOLUTION:
- Service fully restored
- All health checks passing
- Users can access application

IMPACT SUMMARY:
- Downtime: [Duration]
- Data loss: [Amount, or "None"]
- Affected users: [Number or "All"]

NEXT STEPS:
- Root cause analysis scheduled
- Team debrief: [Date/time]
- Postmortem document: [Link]

INCIDENT COMMANDER: [Your name]
```

### Template 4: User-Facing Status Update

**For status page or customer communication:**

```
[RESOLVED] Database Maintenance - Dec 15, 2025

We experienced an unplanned database issue today from 2:30 PM to 4:45 PM UTC.

IMPACT:
During this time, users were unable to access the application.

RESOLUTION:
Our team identified and resolved the issue. All services are now operating normally.

DATA SAFETY:
All patient data remains secure and intact. No data was lost during this incident.

PREVENTION:
We are implementing additional monitoring and redundancy measures to prevent similar issues.

We apologize for any inconvenience.

Status: ✅ Resolved at 4:45 PM UTC
```

---

## Testing and Validation

### Quarterly Disaster Recovery Drill

**Schedule quarterly DR drills to ensure readiness:**

```bash
# Create drill plan
cat > dr-drill-$(date +%Y-Q1).md << 'EOF'
# Disaster Recovery Drill - Q1 2025

## Objectives
- Test backup restore procedure
- Verify team readiness
- Validate documentation accuracy
- Measure actual RTO/RPO

## Scenario
Simulated database corruption requiring PITR

## Participants
- On-call engineer
- Database administrator
- Observer (for scoring)

## Success Criteria
- Restore completed within 4-hour RTO
- All data integrity checks pass
- Communication protocols followed
- Documentation followed successfully

## Schedule
- Date: [First Saturday of quarter]
- Time: 10:00 AM - 2:00 PM
- Location: Remote/Virtual
EOF
```

---

## Quick Reference Card

**Print this and keep near your desk:**

```
╔════════════════════════════════════════════════════════╗
║        DISASTER RECOVERY QUICK REFERENCE               ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  EMERGENCY CONTACTS                                    ║
║  On-Call: [Phone]                                      ║
║  DBA: [Phone]                                          ║
║  CTO: [Phone]                                          ║
║                                                        ║
║  CRITICAL COMMANDS                                     ║
║  • Health: curl https://app-url/api/health/ready       ║
║  • Logs: doctl apps logs $APP_ID --follow              ║
║  • Rollback: doctl apps deployments rollback ...       ║
║  • Restore: gunzip -c backup.sql.gz | psql $DB_URL     ║
║                                                        ║
║  RTO TARGET: < 4 hours                                 ║
║  RPO TARGET: < 1 hour                                  ║
║                                                        ║
║  RUNBOOK: /docs/runbooks/DISASTER_RECOVERY.md          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## Appendix: Command Cheat Sheet

### Database Commands

```bash
# Check database status
psql $DATABASE_URL -c "SELECT version();"

# Connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Kill all connections (for maintenance)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'holi_labs' AND pid <> pg_backend_pid();"

# Vacuum and analyze
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

### DigitalOcean Commands

```bash
# List apps
doctl apps list

# Get app details
doctl apps get $APP_ID

# List deployments
doctl apps deployments list $APP_ID

# Rollback deployment
doctl apps deployments rollback $APP_ID $DEPLOYMENT_ID

# View logs
doctl apps logs $APP_ID --type=run --follow

# Update env var
doctl apps update $APP_ID --set-env KEY=VALUE

# List databases
doctl databases list

# Get database connection
doctl databases connection $DB_ID

# Restart database
doctl databases restart $DB_ID

# Fork database (PITR)
doctl databases fork $DB_ID --name new-name --restore-from-timestamp "2025-12-15T10:30:00Z"
```

### Backup Commands

```bash
# Create backup
tsx scripts/backup-database.ts --type=daily --upload

# Verify backups
tsx scripts/verify-backups.ts

# List local backups
ls -lh backups/

# List cloud backups
aws s3 ls s3://holi-labs-backups/database/ --endpoint-url=$R2_ENDPOINT

# Download backup
aws s3 cp s3://holi-labs-backups/database/backup-daily-2025-12-15.sql.gz . --endpoint-url=$R2_ENDPOINT

# Restore from backup
gunzip -c backup-daily-2025-12-15.sql.gz | psql $DATABASE_URL
```

---

**Document Maintained By**: DevOps Team
**Last Tested**: [Date of last DR drill]
**Next Review**: Quarterly
**Version**: 1.0.0

---

## Document Change Log

| Date       | Version | Author      | Changes                          |
|------------|---------|-------------|----------------------------------|
| 2025-12-15 | 1.0.0   | Agent 22    | Initial creation                 |

---

**END OF RUNBOOK**

For questions or updates to this runbook, contact: devops@holilabs.com
