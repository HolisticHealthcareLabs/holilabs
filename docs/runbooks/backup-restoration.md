# Runbook: Backup Restoration

**Severity:** Critical (P0) - Data loss scenario
**Expected Resolution Time:** 1-4 hours (depends on database size)
**On-Call Required:** Yes + Database Administrator

⚠️ **CRITICAL**: Practice this procedure quarterly. Never test backup restoration for the first time during a real emergency.

---

## When to Restore from Backup

### Restoration Triggers
- ✅ **Ransomware/Malware** - Database encrypted or corrupted
- ✅ **Accidental data deletion** - DROP TABLE, DELETE without WHERE clause
- ✅ **Database corruption** - Hardware failure, file system corruption
- ✅ **Failed migration** - Data loss during schema change
- ✅ **Disaster recovery drill** - Quarterly testing

### Do NOT Restore For
- ❌ Single record deletion - Use audit logs to recreate
- ❌ Application bugs - Fix forward unless massive data loss
- ❌ Performance issues - Not a backup problem

---

## Pre-Restoration Checklist

### 1. Assess Data Loss

```bash
# Identify what data needs restoration
# Questions to answer:
# - What time did the incident occur?
# - Which tables/data are affected?
# - What is the acceptable data loss window?

# Check most recent backup
# DigitalOcean Managed Database
doctl databases backups list <database-id>

# AWS RDS
aws rds describe-db-snapshots --db-instance-identifier holi-db

# Self-hosted (pg_dump)
ls -lh /var/backups/postgresql/*.gz | tail -5
```

### 2. Calculate Recovery Point Objective (RPO)

```markdown
**Recovery Point Objective (RPO)**: Maximum acceptable data loss

Example:
- Last backup: 2024-01-07 02:00 AM (automated daily backup)
- Incident time: 2024-01-07 10:30 AM
- Data loss window: 8.5 hours

**Question**: Is 8.5 hours of data loss acceptable?
- For EMR system: Usually NO
- Consider: Point-in-time recovery (if available)
```

### 3. Decision Matrix

| Scenario | Data Loss | RPO | Action |
|----------|-----------|-----|--------|
| Ransomware (all tables) | 8 hours | Acceptable | **Restore from backup** |
| Single table dropped | 0 hours | Use WAL logs | **Point-in-time recovery** |
| Massive DELETE | 2 hours | Acceptable | **Restore from backup** |
| Database corruption | 12 hours | Acceptable | **Restore from backup** |

---

## Backup Restoration Procedures

### Method 1: DigitalOcean Managed Database Restore (Fastest)

```bash
# 1. List available backups
doctl databases backups list <database-id>

# Example output:
# Created At               Size
# 2024-01-07T02:00:00Z    2.5 GB  <- Most recent
# 2024-01-06T02:00:00Z    2.4 GB
# 2024-01-05T02:00:00Z    2.4 GB

# 2. Choose restore point
# Select backup BEFORE the incident
# Example: Incident at 10:30 AM, use 02:00 AM backup

# 3. IMPORTANT: Restoration creates a NEW database
# Old database is NOT overwritten

# 4. Restore to new database
doctl databases fork <database-id> \
  --name holi-protocol-restored-$(date +%Y%m%d) \
  --restore-from-backup 2024-01-07T02:00:00Z

# 5. Wait for restoration (30 min - 2 hours depending on size)
watch -n 30 'doctl databases get <new-database-id> | grep Status'
# Wait for Status: online

# 6. Get connection details
doctl databases connection <new-database-id>

# 7. Test restored database
PGPASSWORD=<new-password> psql -h <new-host> -U <new-user> -d holi_protocol -c "
  SELECT COUNT(*) FROM \"Patient\";
  SELECT MAX(\"createdAt\") FROM \"Patient\";
"

# 8. Verify data integrity
# Check key tables
PGPASSWORD=<new-password> psql -h <new-host> -U <new-user> -d holi_protocol -c "
  SELECT
    (SELECT COUNT(*) FROM \"Patient\") as patients,
    (SELECT COUNT(*) FROM \"Appointment\") as appointments,
    (SELECT COUNT(*) FROM \"Prescription\") as prescriptions,
    (SELECT COUNT(*) FROM \"User\") as users;
"

# 9. Update application to point to restored database
# Update DATABASE_URL environment variable
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: DATABASE_URL
        value: "postgresql://<new-user>:<new-password>@<new-host>:25060/holi_protocol?sslmode=require"
EOF

# 10. Deploy application
doctl apps create-deployment <app-id>

# 11. After verification, delete old corrupted database
# ONLY after 24-48 hours of successful operation
doctl databases delete <old-database-id>
```

**Advantages:**
- ✅ Fast (managed service)
- ✅ Point-in-time recovery available
- ✅ Automated backups
- ✅ Creates new database (old one preserved for forensics)

**Limitations:**
- ⚠️ Data loss = time between backup and incident
- ⚠️ Downtime during DNS/connection string update

---

### Method 2: AWS RDS Point-in-Time Recovery

```bash
# 1. List available restore points
aws rds describe-db-instances --db-instance-identifier holi-db \
  --query 'DBInstances[0].LatestRestorableTime'

# 2. Choose restore time (BEFORE incident)
RESTORE_TIME="2024-01-07T10:25:00Z"  # 5 minutes before incident

# 3. Restore to new RDS instance
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier holi-db \
  --target-db-instance-identifier holi-db-restored-$(date +%Y%m%d) \
  --restore-time $RESTORE_TIME

# 4. Monitor restoration progress
aws rds describe-db-instances \
  --db-instance-identifier holi-db-restored-* \
  --query 'DBInstances[0].DBInstanceStatus'

# 5. Get new connection endpoint
aws rds describe-db-instances \
  --db-instance-identifier holi-db-restored-* \
  --query 'DBInstances[0].Endpoint'

# 6. Test and verify (same as Method 1)

# 7. Update application connection string
# (same as Method 1)
```

**Advantages:**
- ✅ Point-in-time recovery (minimal data loss)
- ✅ Can recover to any second within retention period

---

### Method 3: Self-Hosted PostgreSQL Restore

```bash
# 1. Stop application (prevent writes during restoration)
pm2 stop api
# Or
systemctl stop node-api

# 2. Create backup of current (corrupted) database
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U holi -d holi_protocol \
  -F c -f /tmp/corrupted-db-$(date +%Y%m%d-%H%M%S).backup

# 3. Find most recent good backup
ls -lht /var/backups/postgresql/ | head -10

# Example:
# holi_protocol_2024-01-07_02-00.sql.gz  <- Use this (before incident)
# holi_protocol_2024-01-06_02-00.sql.gz

# 4. Drop current database (⚠️ POINT OF NO RETURN)
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol';
"

PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "
  DROP DATABASE holi_protocol;
"

# 5. Create fresh database
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "
  CREATE DATABASE holi_protocol OWNER holi;
"

# 6. Restore from backup
gunzip -c /var/backups/postgresql/holi_protocol_2024-01-07_02-00.sql.gz | \
  PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d holi_protocol

# 7. Verify restoration
PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d holi_protocol -c "
  SELECT COUNT(*) FROM \"Patient\";
  SELECT MAX(\"createdAt\") FROM \"AuditLog\";
"

# 8. Rebuild indexes and analyze
PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d holi_protocol -c "
  REINDEX DATABASE holi_protocol;
  VACUUM ANALYZE;
"

# 9. Restart application
pm2 restart api
# Or
systemctl start node-api

# 10. Monitor for errors
pm2 logs api
tail -f /var/log/holi-api/error.log
```

**Advantages:**
- ✅ Full control over restoration process
- ✅ Can restore specific tables (if needed)

**Limitations:**
- ⚠️ Longer downtime
- ⚠️ More manual steps
- ⚠️ Higher risk of user error

---

### Method 4: Table-Level Restoration (Minimal Data Loss)

Use when only one table needs restoration:

```bash
# 1. Restore backup to temporary database
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "
  CREATE DATABASE temp_restore OWNER holi;
"

gunzip -c /var/backups/postgresql/holi_protocol_2024-01-07_02-00.sql.gz | \
  PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d temp_restore

# 2. Export specific table from backup
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U holi -d temp_restore \
  -t "Patient" -F c -f /tmp/patient_table.backup

# 3. Drop current (corrupted) table in production
PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d holi_protocol -c "
  DROP TABLE IF EXISTS \"Patient\" CASCADE;
"

# 4. Restore table from backup
pg_restore -h localhost -U holi -d holi_protocol /tmp/patient_table.backup

# 5. Verify restoration
PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d holi_protocol -c "
  SELECT COUNT(*) FROM \"Patient\";
"

# 6. Clean up temp database
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "
  DROP DATABASE temp_restore;
"
```

---

## Data Reconciliation After Restoration

### Identify Missing Data (RPO Gap)

```bash
# Data created AFTER backup but BEFORE incident is lost
# Example: Backup at 02:00 AM, incident at 10:30 AM = 8.5 hours lost

# 1. Check audit logs for operations in RPO window
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "
  SELECT
    action,
    resource,
    \"userId\",
    timestamp
  FROM \"AuditLog\"
  WHERE timestamp BETWEEN '2024-01-07 02:00:00' AND '2024-01-07 10:30:00'
  AND action IN ('CREATE', 'UPDATE')
  ORDER BY timestamp;
"

# 2. Identify affected users
# Users who created/updated data during RPO window
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "
  SELECT DISTINCT
    \"userId\",
    u.email,
    COUNT(*) as operations_lost
  FROM \"AuditLog\" al
  JOIN \"User\" u ON al.\"userId\" = u.id
  WHERE timestamp BETWEEN '2024-01-07 02:00:00' AND '2024-01-07 10:30:00'
  GROUP BY \"userId\", u.email;
"

# 3. Extract lost data from application logs (if available)
grep -A 5 "CREATE Patient\|UPDATE Patient" /var/log/holi-api/*.log | \
  grep -A 5 "2024-01-07 0[2-9]:\|2024-01-07 10:[0-2]" > /tmp/lost-data.txt
```

### Manual Data Recreation

```markdown
## Data Loss Report

**Backup Time:** 2024-01-07 02:00 AM
**Incident Time:** 2024-01-07 10:30 AM
**Data Loss Window:** 8.5 hours

### Lost Data Summary
- 15 new patients created
- 32 appointments scheduled
- 8 prescriptions written
- 45 clinical notes added

### Recovery Plan
1. Contact affected clinicians (list below)
2. Request re-entry of critical data
3. Provide data loss window timeframe
4. Offer assistance with data re-entry

### Affected Clinicians
- Dr. Smith (5 patients, 10 appointments)
- Dr. Johnson (3 patients, 8 appointments)
- ...
```

---

## Verification After Restoration

```bash
# 1. Check database is online
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "SELECT NOW();"

# 2. Verify table counts
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "
  SELECT
    (SELECT COUNT(*) FROM \"Patient\") as patients,
    (SELECT COUNT(*) FROM \"User\") as users,
    (SELECT COUNT(*) FROM \"Appointment\") as appointments,
    (SELECT COUNT(*) FROM \"Prescription\") as prescriptions,
    (SELECT COUNT(*) FROM \"AuditLog\") as audit_logs;
"

# 3. Test critical queries
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "
  SELECT * FROM \"Patient\" ORDER BY \"createdAt\" DESC LIMIT 5;
"

# 4. Test application health endpoint
curl https://api.holilabs.xyz/api/health

# 5. Test user login
curl -X POST https://api.holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 6. Test patient data access
curl https://api.holilabs.xyz/api/patients?limit=10 \
  -H "Authorization: Bearer <token>"

# 7. Check for referential integrity issues
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d holi_protocol -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE contype = 'f'
  AND convalidated = false;
"
# Should return 0 rows

# 8. Monitor error logs for 24 hours
tail -f /var/log/holi-api/error.log

# 9. Check Sentry for new errors
# Dashboard > Issues > Filter by date range
```

---

## Post-Restoration Actions

### 1. Incident Documentation

```markdown
## Database Restoration Incident Report

**Date:** 2024-01-07
**Incident Type:** [Ransomware/Data Deletion/Corruption]
**Restoration Time:** 2 hours 15 minutes
**Data Loss:** 8.5 hours (02:00 AM - 10:30 AM)

### Root Cause
[What caused the need for restoration]

### Restoration Procedure
1. Backup from 02:00 AM selected
2. Restored to new database cluster
3. Application updated to new connection string
4. Verified data integrity
5. Old database preserved for forensics

### Data Loss Impact
- 15 patients
- 32 appointments
- 8 prescriptions
- Affected clinicians notified for data re-entry

### Lessons Learned
- [ ] Increase backup frequency (currently daily → hourly?)
- [ ] Test point-in-time recovery
- [ ] Add automated backup verification
- [ ] Improve monitoring for early detection

### Follow-Up Actions
- [ ] Contact affected users
- [ ] Implement more frequent backups
- [ ] Schedule quarterly DR drills
- [ ] Update backup retention policy
```

### 2. Backup Strategy Review

```markdown
## Backup Strategy Improvements

### Current State
- Daily automated backups at 02:00 AM
- 7-day retention
- No point-in-time recovery tested

### Improvements Needed
- [ ] Enable point-in-time recovery (PITR)
- [ ] Increase backup frequency to every 6 hours
- [ ] Extend retention to 30 days
- [ ] Add backup verification (monthly restore test)
- [ ] Document and test restoration procedures quarterly
- [ ] Add backup monitoring alerts
```

---

## Prevention

### Automated Backup Verification

```bash
# Script: /scripts/verify-backup.sh
#!/bin/bash

# Restore most recent backup to test database
LATEST_BACKUP=$(ls -t /var/backups/postgresql/*.gz | head -1)

# Restore to test database
gunzip -c $LATEST_BACKUP | \
  PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d test_restore_verification

# Run integrity checks
PGPASSWORD=$DB_PASSWORD psql -h localhost -U holi -d test_restore_verification -c "
  SELECT COUNT(*) FROM \"Patient\";
" > /tmp/backup-verification.log

# Alert if restoration fails
if [ $? -ne 0 ]; then
  echo "Backup verification FAILED" | mail -s "CRITICAL: Backup Verification Failed" ops@holilabs.xyz
fi

# Cleanup
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "DROP DATABASE test_restore_verification;"
```

### Backup Monitoring

```yaml
# Prometheus alert
- alert: BackupTooOld
  expr: time() - postgres_backup_last_success_timestamp_seconds > 86400
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL backup is >24 hours old"
    description: "Last successful backup was {{ $value | humanizeDuration }} ago"

- alert: BackupFailed
  expr: postgres_backup_failures_total > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL backup failed"
```

---

## Escalation

### Recovery Time Objective (RTO)
- **Target RTO:** 4 hours (from incident detection to full recovery)
- **Actual RTO:** Variable (1-4 hours depending on database size)

### Escalation Path
1. **0-30 min**: On-call engineer + DBA initiate restoration
2. **30-60 min**: Notify CTO if restoration issues
3. **1-2 hours**: Engage cloud provider support (if managed DB)
4. **2+ hours**: Consider alternative recovery methods

### Emergency Contacts
- **DBA**: [Contact]
- **DigitalOcean Database Support**: Premium support
- **AWS RDS Support**: Enterprise support case
- **PostgreSQL Expert**: [External consultant if needed]

---

## Related Runbooks
- [Database Connection Failure](./database-connection-failure.md)
- [Security Incident Response](./security-incident-response.md)
- [Disaster Recovery Procedures](../disaster-recovery/procedures.md)

---

## Changelog
- **2024-01-07**: Initial version created
