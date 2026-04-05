# Backup & Disaster Recovery Plan

**Status:** Plan — implementation requires infrastructure access
**Owner:** SRE / DevOps
**Last updated:** 2026-04-04
**Review cadence:** Quarterly

---

## 1. Recovery Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RPO** (Recovery Point Objective) | 1 hour | WAL archiving interval; max data loss = 1 hour of transactions |
| **RTO** (Recovery Time Objective) | 4 hours | Time from incident declaration to service restored |

---

## 2. PostgreSQL Backup Strategy

### 2.1 Daily Logical Backups (pg_dump)

- **Frequency:** Daily at 02:00 UTC (23:00 BRT)
- **Tool:** `pg_dump --format=custom --compress=9`
- **Destination:** Encrypted S3 bucket (`s3://holilabs-backups/postgres/daily/`)
- **Encryption:** AES-256 server-side encryption (SSE-S3)
- **Retention:** 30 days (lifecycle policy auto-deletes older dumps)
- **Naming:** `holilabs_YYYY-MM-DD_HHmmss.dump`

```bash
# Example cron job (runs on backup host, NOT app server)
0 2 * * * pg_dump \
  --host=$DB_HOST \
  --username=$DB_USER \
  --format=custom \
  --compress=9 \
  --file=/tmp/holilabs_$(date +%Y-%m-%d_%H%M%S).dump \
  holilabs_prod \
  && aws s3 cp /tmp/holilabs_*.dump s3://holilabs-backups/postgres/daily/ \
     --sse AES256 \
  && rm /tmp/holilabs_*.dump
```

### 2.2 Point-in-Time Recovery (WAL Archiving)

- **Method:** Continuous WAL archiving to S3
- **Archive interval:** 1 hour (or when 16 MB WAL segment fills)
- **Destination:** `s3://holilabs-backups/postgres/wal/`
- **Retention:** 7 days of WAL segments
- **Enables:** Recovery to any point within the retention window

PostgreSQL config requirements:
```ini
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://holilabs-backups/postgres/wal/%f --sse AES256'
archive_timeout = 3600
```

### 2.3 Verification

- Automated weekly restore test to a staging database
- Verify row counts on key tables: Patient, User, AuditLog, Prescription
- Alert if backup size deviates >20% from previous day (possible data loss or corruption)

---

## 3. Redis Backup Strategy

- **Snapshot (RDB):** Every 60 seconds if 1000+ keys changed
- **AOF (Append Only File):** Enabled, fsync every second
- **Destination:** `s3://holilabs-backups/redis/`
- **Retention:** 7 days
- **Note:** Redis is a cache layer. Full data loss is recoverable — cache warms from PostgreSQL.

---

## 4. Application Artifacts

| Artifact | Backup Method | Retention |
|----------|--------------|-----------|
| Docker images | Container registry (GHCR / DO Registry) | 90 days (tagged) |
| S3 patient documents | Cross-region replication | Same as source |
| Encryption keys | AWS Secrets Manager with versioning | Indefinite |
| Environment config | Encrypted in CI/CD secrets store | Current + 1 previous |

---

## 5. Restore Procedures

### 5.1 PostgreSQL — Full Restore from pg_dump

```bash
# 1. Download latest backup
aws s3 cp s3://holilabs-backups/postgres/daily/holilabs_YYYY-MM-DD.dump /tmp/restore.dump

# 2. Create fresh database
psql -h $DB_HOST -U $DB_ADMIN -c "CREATE DATABASE holilabs_restore;"

# 3. Restore
pg_restore \
  --host=$DB_HOST \
  --username=$DB_ADMIN \
  --dbname=holilabs_restore \
  --jobs=4 \
  --verbose \
  /tmp/restore.dump

# 4. Verify row counts
psql -h $DB_HOST -U $DB_ADMIN -d holilabs_restore -c "
  SELECT 'patients' as tbl, count(*) FROM patients
  UNION ALL SELECT 'users', count(*) FROM users
  UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;
"

# 5. Swap databases (maintenance window required)
psql -h $DB_HOST -U $DB_ADMIN -c "
  ALTER DATABASE holilabs_prod RENAME TO holilabs_old;
  ALTER DATABASE holilabs_restore RENAME TO holilabs_prod;
"

# 6. Restart application to pick up new database
# 7. Verify health endpoints return 200
curl -sf https://app.holilabs.xyz/api/health/ready | jq .
```

### 5.2 PostgreSQL — Point-in-Time Recovery

```bash
# 1. Stop PostgreSQL
# 2. Clear data directory
# 3. Restore base backup
# 4. Configure recovery.conf with target time:
#    recovery_target_time = '2026-04-04 15:30:00 UTC'
#    restore_command = 'aws s3 cp s3://holilabs-backups/postgres/wal/%f %p'
# 5. Start PostgreSQL — it replays WAL to target time
# 6. Verify data integrity
# 7. Promote to primary
```

### 5.3 Redis — Restore from RDB

```bash
# 1. Stop Redis
# 2. Download snapshot
aws s3 cp s3://holilabs-backups/redis/dump.rdb /var/lib/redis/dump.rdb
# 3. Start Redis
# Note: If Redis restore fails, it self-heals from PostgreSQL on cache miss.
```

---

## 6. Disaster Recovery Scenarios

| Scenario | RPO | RTO | Procedure |
|----------|-----|-----|-----------|
| Single pod crash | 0 | <1 min | Kubernetes auto-restart via liveness probe |
| Database corruption | 1 hour | 2 hours | PITR from WAL archive |
| Full region outage | 1 hour | 4 hours | Restore from S3 cross-region backup |
| Accidental data deletion | 1 hour | 1 hour | PITR to timestamp before deletion |
| Ransomware / breach | 24 hours | 4 hours | Restore from immutable S3 backup (Object Lock) |

---

## 7. DR Test Schedule

| Test | Frequency | Duration | Owner |
|------|-----------|----------|-------|
| Restore pg_dump to staging | Weekly (automated) | 30 min | CI pipeline |
| PITR to staging | Monthly | 1 hour | SRE |
| Full DR simulation | Quarterly | 4 hours | SRE + Engineering |
| Encryption key rotation | Quarterly | 1 hour | Security Lead |
| Backup integrity audit | Monthly | 30 min | SRE |

---

## 8. Monitoring & Alerting

| Check | Alert Condition | Severity |
|-------|----------------|----------|
| Daily backup completed | Missing backup by 04:00 UTC | P1 |
| Backup size anomaly | >20% deviation from 7-day average | P2 |
| WAL archiving lag | >2 hours behind | P1 |
| S3 bucket accessibility | HEAD request fails | P0 |
| Restore test failure | Weekly test returns non-zero | P1 |

---

## 9. Compliance Notes

- **HIPAA §164.308(a)(7):** Contingency plan with data backup, DR, and emergency mode
- **LGPD Art. 46:** Appropriate technical measures to protect personal data
- All backups are encrypted at rest (AES-256) and in transit (TLS 1.2+)
- Backup access is restricted to SRE role via IAM policy
- Backup access events are logged in CloudTrail
- Retention periods meet HIPAA 6-year audit log requirement for audit_logs table
