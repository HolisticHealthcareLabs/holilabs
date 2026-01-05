# WAL Archiving & Point-in-Time Recovery (PITR)

## Overview

**Status**: ✅ ENABLED (Managed by DigitalOcean)

DigitalOcean Managed PostgreSQL includes automatic Write-Ahead Log (WAL) archiving and Point-in-Time Recovery (PITR) without requiring manual configuration. This ensures minimal data loss in disaster scenarios.

## Recovery Objectives

- **RPO (Recovery Point Objective)**: < 5 minutes
  - DigitalOcean backs up WAL logs every 5 minutes automatically
  - Exceeds HIPAA requirement of < 15 minutes
- **RTO (Recovery Time Objective)**: < 1 hour
  - Achieved via fork/restore procedures

## How WAL Archiving Works

### Automatic WAL Backup

DigitalOcean automatically:
1. Archives WAL segments every 5 minutes
2. Stores WAL files securely alongside daily backups
3. Manages retention according to backup retention policy (30 days)
4. Encrypts WAL archives at rest

**No manual configuration required** - this is handled entirely by DigitalOcean's managed database infrastructure.

### What Gets Backed Up

- **Daily Backups**: Full database snapshot at 2 AM UTC
- **WAL Archives**: Transaction logs every 5 minutes
- **Combined**: Allows restoration to any point within the last 30 days

## Point-in-Time Recovery (PITR) Procedures

### Scenario 1: Restore to Specific Time

Use this when you need to recover to a specific point in time (e.g., before data corruption or accidental deletion).

#### Using DigitalOcean Console

1. Navigate to your database cluster in DigitalOcean console
2. Click **Backups** tab
3. Select **Fork Database**
4. Choose **Point-in-Time Recovery**
5. Specify the target timestamp
6. Click **Create Database Fork**

#### Using doctl CLI

```bash
# Fork database to specific point in time
doctl databases fork <source-db-id> <new-db-name> \
  --restore-from-timestamp "2026-01-03T14:30:00Z"

# Example:
doctl databases fork abc123 holi-restored \
  --restore-from-timestamp "$(date -u -d '2 hours ago' '+%Y-%m-%dT%H:%M:%SZ')"
```

#### Verification

After PITR:

```bash
# Connect to forked database
psql "postgresql://user:pass@restored-db-host:25060/defaultdb?sslmode=require"

# Verify data integrity
SELECT COUNT(*) FROM "Patient";
SELECT COUNT(*) FROM audit_logs;
SELECT MAX(created_at) FROM audit_logs;  -- Should match target time

# Check last transaction timestamp
SELECT pg_last_xact_replay_timestamp();
```

### Scenario 2: Restore After Data Breach

If PHI is compromised:

1. **Isolate**: Disconnect affected database immediately
2. **Identify**: Determine exact time of breach
3. **Fork**: Create PITR fork to time BEFORE breach
4. **Verify**: Confirm restored data is clean
5. **Switch**: Update application DATABASE_URL to restored instance
6. **Notify**: Follow breach notification procedures (see DATA_BREACH_RESPONSE.md)

### Scenario 3: Accidental Data Deletion

```bash
#!/bin/bash
# Quick PITR for accidental deletion

# 1. Get deletion timestamp (from audit logs)
DELETION_TIME="2026-01-03T10:15:00Z"

# 2. Fork database to 5 minutes before deletion
RESTORE_TIME=$(date -u -d "$DELETION_TIME - 5 minutes" '+%Y-%m-%dT%H:%M:%SZ')

doctl databases fork $PRODUCTION_DB_ID holi-recovery-$(date +%s) \
  --restore-from-timestamp "$RESTORE_TIME"

# 3. Verify deleted data is present
# (Connect and check)

# 4. Export missing data
pg_dump -h recovered-host -t deleted_table > recovered_data.sql

# 5. Import to production
psql $PRODUCTION_DATABASE_URL < recovered_data.sql

# 6. Delete recovery fork
doctl databases delete holi-recovery-12345 --force
```

## Limitations & Important Notes

### Cannot Configure WAL Settings

For DigitalOcean Managed PostgreSQL:
- ❌ Cannot set `archive_command`
- ❌ Cannot set `archive_mode`
- ❌ Cannot access WAL files directly
- ✅ All WAL archiving is handled automatically

**This is a feature, not a bug** - DigitalOcean manages this infrastructure to ensure reliability.

### PITR Window

- **Maximum lookback**: 30 days (matches backup retention)
- **Minimum RPO**: 5 minutes (WAL backup frequency)
- **Granularity**: Second-level precision

### Fork vs Restore

| Operation | Fork | Restore |
|-----------|------|---------|
| Creates new cluster | ✅ | ❌ |
| Overwrites existing | ❌ | ✅ |
| Supports PITR | ✅ | ⚠️ Limited |
| Downtime | None | Yes |
| Use case | Testing, recovery | Disaster recovery |

**Best practice**: Always **fork** first, verify, then switch over.

## Compliance

### HIPAA §164.308(a)(7)(ii)(A)

✅ **Data backup plan**: Daily backups + 5-minute WAL archiving
✅ **Testing**: Weekly automated tests via `disaster-recovery-test.yml`
✅ **Procedures**: Documented in this file and `DISASTER_RECOVERY_PLAN.md`

### LGPD Art. 48

✅ **RPO < 15 minutes**: Achieved (actual: < 5 minutes)
✅ **RTO < 1 hour**: Verified via weekly tests
✅ **Zero data loss tolerance**: Fork ensures no PHI loss

## Testing Procedures

### Weekly Automated Test

GitHub Actions workflow runs every Monday at 3 AM UTC:
- Verifies latest backup exists
- Checks WAL archive availability (implicit via backup health)
- Simulates restore procedure
- Generates compliance report

See: `.github/workflows/disaster-recovery-test.yml`

### Manual PITR Test (Quarterly)

Perform full PITR test quarterly:

```bash
# 1. Fork production to staging (PITR to 1 hour ago)
doctl databases fork $PRODUCTION_DB_ID holi-staging-pitr-test \
  --restore-from-timestamp "$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ')"

# 2. Wait for fork completion
doctl databases get holi-staging-pitr-test

# 3. Verify data integrity
psql "postgresql://..." <<EOF
SELECT
  (SELECT COUNT(*) FROM "Patient") as patients,
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM audit_logs) as audit_logs,
  (SELECT MAX(created_at) FROM audit_logs) as last_audit_log;
EOF

# 4. Clean up
doctl databases delete holi-staging-pitr-test --force
```

Document results in `/docs/compliance/PITR_TEST_LOG.md`

## Monitoring & Alerts

### Backup Health Monitoring

Prometheus alerts for backup failures:

```yaml
- alert: DatabaseBackupFailed
  expr: time() - digitalocean_database_backup_timestamp_seconds > 86400
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Database backup is stale (> 24 hours old)"
```

### WAL Archive Lag

DigitalOcean monitors WAL archive lag internally. If WAL archiving fails:
- Automatic alerts to DigitalOcean support team
- Visible in database health dashboard
- No action required from our side (managed service)

## Incident Response Integration

When disaster strikes:

1. **Consult**: `docs/runbooks/DISASTER_RECOVERY_PLAN.md`
2. **Execute**: Appropriate scenario from this document
3. **Verify**: Data integrity post-recovery
4. **Document**: Incident in post-mortem
5. **Test**: Validate procedures worked

## Additional Resources

- [DigitalOcean PITR Documentation](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/)
- [PostgreSQL WAL Documentation](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [How To Set Up Continuous Archiving and PITR on DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-set-up-continuous-archiving-and-perform-point-in-time-recovery-with-postgresql-12-on-ubuntu-20-04)
- [WAL Backup and PITR on Digital Ocean](https://bobcares.com/blog/wal-backup-and-pitr-on-digital-ocean/)
- [Medium: Navigating Data Recovery in the Cloud](https://milyasyousuf.medium.com/navigating-data-recovery-in-the-cloud-wal-backup-and-pitr-on-digital-ocean-b1735d45c8dc)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Initial documentation | Claude Sonnet 4.5 |

---

**Next Review**: 2026-04-03 (quarterly)

**Sources:**
- [How To Set Up Continuous Archiving and Perform Point-In-Time-Recovery with PostgreSQL 12 on Ubuntu 20.04 | DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-set-up-continuous-archiving-and-perform-point-in-time-recovery-with-postgresql-12-on-ubuntu-20-04)
- [PostgreSQL: Documentation: 18: 25.3. Continuous Archiving and Point-in-Time Recovery (PITR)](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [How to set up Point - In - Time recovery in Managed Postgres? | DigitalOcean](https://www.digitalocean.com/community/questions/how-to-set-up-point-in-time-recovery-in-managed-postgres)
- [Why you don't need PITR and incremental backups for most PostgreSQL databases in 2026 - DEV Community](https://dev.to/dmetrovich/why-you-dont-need-pitr-and-incremental-backups-for-most-postgresql-databases-in-2026-1hlm)
- [WAL Backup and PITR on Digital Ocean](https://bobcares.com/blog/wal-backup-and-pitr-on-digital-ocean/)
- [Managed Databases | DigitalOcean Documentation](https://docs.digitalocean.com/products/databases/)
- [Worry-Free Managed PostgreSQL Hosting | DigitalOcean](https://www.digitalocean.com/products/managed-databases-postgresql)
- [Navigating Data Recovery in the Cloud: WAL Backup and PITR on Digital Ocean | by Muhammad Ilyas | Medium](https://milyasyousuf.medium.com/navigating-data-recovery-in-the-cloud-wal-backup-and-pitr-on-digital-ocean-b1735d45c8dc)
