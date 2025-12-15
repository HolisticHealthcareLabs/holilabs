# Backup and Disaster Recovery System

**Last Updated**: 2025-12-15
**Version**: 1.0.0
**Compliance**: HIPAA Required

## Table of Contents

1. [Overview](#overview)
2. [Backup Architecture](#backup-architecture)
3. [Backup Schedule](#backup-schedule)
4. [Retention Policy](#retention-policy)
5. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
6. [Backup Storage](#backup-storage)
7. [Recovery Objectives](#recovery-objectives)
8. [Backup Verification](#backup-verification)
9. [Encryption and Security](#encryption-and-security)
10. [Monitoring and Alerts](#monitoring-and-alerts)
11. [Compliance Requirements](#compliance-requirements)

---

## Overview

Holi Labs implements a comprehensive backup and disaster recovery system to protect patient data and ensure business continuity. This document describes our backup infrastructure, policies, and recovery procedures.

### Key Features

- **Automated Daily Backups**: PostgreSQL database backups every 24 hours
- **Multi-Tier Retention**: Daily (7 days), Weekly (4 weeks), Monthly (12 months)
- **Point-in-Time Recovery**: Restore to any point within the last 7 days
- **Encrypted Storage**: All backups encrypted at rest with AES-256
- **Geographic Redundancy**: Backups stored in multiple regions
- **HIPAA Compliant**: Meets all HIPAA data protection requirements

---

## Backup Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Database                       │
│                  (PostgreSQL on DigitalOcean)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ pg_dump + gzip
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backup Script (Automated)                 │
│                 /scripts/backup-database.ts                  │
├─────────────────────────────────────────────────────────────┤
│  • Daily: Every day at 2:00 AM UTC                          │
│  • Weekly: Sunday at 3:00 AM UTC                            │
│  • Monthly: 1st of month at 4:00 AM UTC                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Parallel Upload
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────────┐           ┌───────────────────┐
│  Local Storage    │           │  Cloud Storage    │
│  /backups/        │           │ Cloudflare R2/S3  │
├───────────────────┤           ├───────────────────┤
│ • Fast recovery   │           │ • Geographic      │
│ • Last 7 days     │           │   redundancy      │
│ • Hot standby     │           │ • Long-term       │
└───────────────────┘           │   retention       │
                                │ • AES-256         │
                                │   encrypted       │
                                └───────────────────┘
```

---

## Backup Schedule

### Automated Backups

| Backup Type | Schedule              | Retention | Command                                    |
|-------------|----------------------|-----------|---------------------------------------------|
| Daily       | Every day at 2:00 AM UTC | 7 days   | `pnpm backup:daily`                        |
| Weekly      | Sunday at 3:00 AM UTC    | 4 weeks  | `pnpm backup:weekly`                       |
| Monthly     | 1st of month at 4:00 AM UTC | 12 months | `pnpm backup:monthly`               |

### Cron Configuration

Add to server crontab (`crontab -e`):

```bash
# Database Backups
0 2 * * * cd /path/to/holilabsv2/apps/web && pnpm backup:daily >> /var/log/backup-daily.log 2>&1
0 3 * * 0 cd /path/to/holilabsv2/apps/web && pnpm backup:weekly >> /var/log/backup-weekly.log 2>&1
0 4 1 * * cd /path/to/holilabsv2/apps/web && pnpm backup:monthly >> /var/log/backup-monthly.log 2>&1

# Backup Verification (daily at 6:00 AM)
0 6 * * * cd /path/to/holilabsv2/apps/web && tsx scripts/verify-backups.ts >> /var/log/backup-verify.log 2>&1
```

### Manual Backup

For on-demand backups before major deployments:

```bash
cd /path/to/holilabsv2/apps/web

# Create immediate backup
tsx scripts/backup-database.ts --type=daily --upload --cleanup

# Create and upload to cloud only
tsx scripts/backup-database.ts --type=daily --upload

# Local backup only (for quick tests)
tsx scripts/backup-database.ts --type=daily --local-only
```

---

## Retention Policy

### Retention Strategy

Our retention policy balances storage costs with recovery needs:

```
Daily Backups (Last 7 days)
├── Day 0 (Today)
├── Day 1
├── Day 2
├── Day 3
├── Day 4
├── Day 5
└── Day 6

Weekly Backups (Last 4 weeks)
├── Week 0 (This week)
├── Week 1
├── Week 2
└── Week 3

Monthly Backups (Last 12 months)
├── Month 0 (This month)
├── Month 1
├── Month 2
├── Month 3
├── Month 4
├── Month 5
├── Month 6
├── Month 7
├── Month 8
├── Month 9
├── Month 10
└── Month 11
```

### Retention Configuration

Defined in `/scripts/backup-database.ts`:

```typescript
const RETENTION_POLICY = {
  daily: 7,    // Keep 7 daily backups
  weekly: 4,   // Keep 4 weekly backups (1 month)
  monthly: 12, // Keep 12 monthly backups (1 year)
};
```

### Cleanup Process

Old backups are automatically removed when `--cleanup` flag is used:

```bash
# Manual cleanup
tsx scripts/backup-database.ts --type=daily --cleanup

# Cleanup runs automatically with cron jobs
```

---

## Point-in-Time Recovery (PITR)

### What is PITR?

Point-in-Time Recovery allows restoring the database to any specific moment in time, not just to a backup snapshot.

### PITR Configuration

#### Option 1: DigitalOcean Managed Database PITR

**Recommended for production**

DigitalOcean Managed Databases include automatic PITR:

1. **Continuous Archiving**: Transaction logs backed up continuously
2. **Recovery Window**: Last 7 days (configurable up to 30 days)
3. **Granularity**: Restore to any second within the window

**Enable PITR:**

```bash
# Via DigitalOcean CLI
doctl databases options backups list

# Via Web Console
# Settings → Backups → Point-in-Time Recovery → Enable
```

**Restore to Specific Time:**

```bash
# List available recovery times
doctl databases backups list YOUR_DATABASE_ID

# Restore to specific timestamp
doctl databases fork YOUR_DATABASE_ID \
  --restore-from-timestamp "2025-12-15T10:30:00Z" \
  --name "restored-db-dec15"
```

#### Option 2: Self-Managed PITR (PostgreSQL WAL Archiving)

**For self-hosted databases**

1. **Enable WAL Archiving** (`postgresql.conf`):

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backup/archive/%f && cp %p /backup/archive/%f'
archive_timeout = 300  # Archive every 5 minutes

# Continuous archiving
max_wal_senders = 10
wal_keep_size = 1GB
```

2. **Archive to Cloud Storage**:

```bash
# Archive command that uploads to R2/S3
archive_command = 'aws s3 cp %p s3://your-bucket/wal-archive/%f --endpoint-url=$R2_ENDPOINT'
```

3. **Restore Procedure**:

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
gunzip -c backup-daily-2025-12-15.sql.gz | psql $DATABASE_URL

# Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://your-bucket/wal-archive/%f %p --endpoint-url=$R2_ENDPOINT'
recovery_target_time = '2025-12-15 10:30:00 UTC'
EOF

# Start PostgreSQL (recovery begins automatically)
sudo systemctl start postgresql
```

### RPO and RTO with PITR

| Recovery Type | RPO (Data Loss) | RTO (Downtime) |
|---------------|-----------------|----------------|
| PITR (Managed) | < 1 minute     | < 1 hour       |
| PITR (Self-Managed) | < 5 minutes | < 2 hours      |
| Backup Restore | Up to 24 hours | < 4 hours      |

---

## Backup Storage

### Primary Storage: Cloudflare R2

**Why R2?**
- Cost-effective ($0.015/GB/month)
- No egress fees
- S3-compatible API
- Geographic redundancy

**Configuration:**

```env
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-backups
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

**Bucket Structure:**

```
holi-labs-backups/
├── database/
│   ├── backup-daily-2025-12-15-02-00-00.sql.gz
│   ├── backup-daily-2025-12-14-02-00-00.sql.gz
│   ├── backup-weekly-2025-12-10-03-00-00.sql.gz
│   └── backup-monthly-2025-12-01-04-00-00.sql.gz
├── wal-archive/  (if using self-managed PITR)
│   ├── 000000010000000000000001
│   └── 000000010000000000000002
└── metadata/
    └── backup-checksums.json
```

### Secondary Storage: Local Disk

**Purpose**: Fast recovery for recent backups

**Location**: `/path/to/holilabsv2/apps/web/backups/`

**Retention**: Last 7 days only

**Disk Space Planning:**

```bash
# Check current database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('holi_labs'));"

# Estimated backup size (compressed)
# Database size × 0.2 (gzip compression ratio)
# Example: 1 GB database ≈ 200 MB compressed backup

# Required disk space
# 7 daily backups × 200 MB = 1.4 GB
```

### Alternative: AWS S3

For S3 instead of R2, update environment variables:

```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=holi-labs-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

Backup script automatically detects and uses the correct storage.

---

## Recovery Objectives

### RPO (Recovery Point Objective)

**Maximum acceptable data loss**

| Service Level | RPO Target     | Implementation                    |
|---------------|----------------|-----------------------------------|
| Production    | < 1 hour       | PITR + hourly transaction logs    |
| Development   | < 24 hours     | Daily backups only                |
| Test          | < 7 days       | Weekly backups only               |

**Current Production RPO: < 1 hour**

Achieved through:
- Daily automated backups (worst case: 24 hours data loss)
- PITR enabled (actual: < 1 hour data loss)
- Continuous WAL archiving

### RTO (Recovery Time Objective)

**Maximum acceptable downtime**

| Service Level | RTO Target     | Implementation                    |
|---------------|----------------|-----------------------------------|
| Production    | < 4 hours      | Automated restore scripts + monitoring |
| Development   | < 24 hours     | Manual restore acceptable         |
| Test          | < 7 days       | Manual restore acceptable         |

**Current Production RTO: < 4 hours**

Recovery time breakdown:
1. Incident detection: < 15 minutes (automated monitoring)
2. Decision to restore: < 15 minutes (on-call team)
3. Backup retrieval: < 30 minutes (from cloud storage)
4. Database restore: < 2 hours (depends on database size)
5. Verification: < 30 minutes (automated health checks)
6. Application restart: < 30 minutes (automated deployment)

**Total: < 4 hours**

---

## Backup Verification

### Automated Verification

Daily verification script runs at 6:00 AM UTC:

```bash
tsx scripts/verify-backups.ts
```

**Checks Performed:**

1. **Existence Check**: Verify backup files exist in expected locations
2. **Timestamp Check**: Ensure backups are recent (< 48 hours old)
3. **Size Check**: Detect corruption by comparing file sizes
4. **Checksum Validation**: Verify SHA-256 checksums match
5. **Cloud Connectivity**: Test connection to R2/S3
6. **Retention Compliance**: Verify correct number of backups retained

**Sample Output:**

```
🔍 Backup Verification Report - 2025-12-15 06:00:00 UTC

✅ Local Backups (7/7 expected)
   • backup-daily-2025-12-15-02-00-00.sql.gz (245 MB, 8 hours old)
   • backup-daily-2025-12-14-02-00-00.sql.gz (243 MB, 32 hours old)
   • backup-daily-2025-12-13-02-00-00.sql.gz (241 MB, 56 hours old)
   ... (4 more)

✅ Cloud Backups (23/23 expected)
   • 7 daily backups
   • 4 weekly backups
   • 12 monthly backups

✅ Checksums Verified
   • All checksums match metadata

✅ Cloud Storage Connectivity
   • Successfully connected to R2 endpoint
   • Bucket: holi-labs-backups

⚠️  Warnings: None
❌ Errors: None

Overall Status: ✅ HEALTHY
```

### Manual Verification

**Test Backup Restore (Quarterly)**

Required for HIPAA compliance - test restore every 90 days:

```bash
# 1. Create test database
createdb holi_labs_restore_test

# 2. Restore latest backup
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs_restore_test"
gunzip -c backups/backup-daily-2025-12-15-02-00-00.sql.gz | psql $TEST_DATABASE_URL

# 3. Verify data integrity
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM patients;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM appointments;"

# 4. Check for corruption
psql $TEST_DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
psql $TEST_DATABASE_URL -c "SELECT * FROM patients LIMIT 1;"

# 5. Clean up
dropdb holi_labs_restore_test
```

**Document Results:**

Create a file `/docs/backup-tests/restore-test-2025-12-15.md`:

```markdown
# Backup Restore Test - 2025-12-15

## Test Details
- **Date**: 2025-12-15 10:00:00 UTC
- **Backup File**: backup-daily-2025-12-15-02-00-00.sql.gz
- **Database Size**: 245 MB (compressed), 1.2 GB (uncompressed)
- **Tested By**: [Your Name]

## Results
- ✅ Backup restored successfully
- ✅ All tables present (12/12)
- ✅ Data integrity verified (sample checks)
- ✅ No corruption detected

## Recovery Time
- Download: 45 seconds
- Restore: 8 minutes 23 seconds
- Verification: 2 minutes
- **Total: 11 minutes** (well within 4-hour RTO)

## Notes
- Restore completed without errors
- All foreign key constraints intact
- Indexes rebuilt successfully
```

---

## Encryption and Security

### Data Encryption

**At Rest (Storage):**
- Cloudflare R2: AES-256 server-side encryption (automatic)
- AWS S3: AES-256 server-side encryption (SSE-S3)
- Local disk: File system encryption (LUKS/FileVault)

**In Transit:**
- All uploads use TLS 1.3
- S3/R2 API connections encrypted

**Backup File Encryption:**

Backups include sensitive patient data and are encrypted:

```bash
# Backup script automatically applies server-side encryption
ServerSideEncryption: 'AES256'
```

### Access Control

**Principle of Least Privilege:**

1. **Backup Script**:
   - Read-only access to production database
   - Write access to backup storage only
   - No access to production application

2. **Cloud Storage (R2/S3)**:
   - Dedicated IAM user for backups
   - Policy: `PutObject`, `GetObject`, `ListBucket`, `DeleteObject` only
   - No public access

3. **Backup Verification Script**:
   - Read-only access to backup storage
   - No database access
   - No write permissions

**IAM Policy Example (R2/S3):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::holi-labs-backups",
        "arn:aws:s3:::holi-labs-backups/*"
      ]
    }
  ]
}
```

### Audit Logging

All backup operations are logged:

```typescript
// In backup-database.ts
console.log({
  event: 'backup_created',
  timestamp: new Date().toISOString(),
  type: options.type,
  filename: filename,
  size: stats.size,
  checksum: checksum,
  uploaded: !options.localOnly,
  location: options.localOnly ? 'local' : 'cloud',
});
```

Logs are sent to Sentry for centralized monitoring.

---

## Monitoring and Alerts

### Automated Monitoring

**1. Backup Success/Failure Alerts**

Configure in your monitoring system:

```yaml
# Example: Sentry Alert Rule
alert:
  name: "Backup Failed"
  condition: "backup_failed"
  threshold: 1
  window: 24h
  notification:
    email: ops-team@holilabs.com
    severity: critical
```

**2. Backup Verification Alerts**

```bash
# In verify-backups.ts, alerts are sent via Sentry
if (errors.length > 0) {
  Sentry.captureMessage('Backup verification failed', {
    level: 'error',
    extra: { errors },
  });
}
```

**3. Storage Space Alerts**

```bash
# Monitor backup directory disk space
df -h /path/to/backups | awk 'NR==2 {if ($5+0 > 80) print "WARNING: Disk space > 80%"}'
```

### Manual Monitoring

**Daily Checklist:**

- [ ] Check backup logs: `tail -f /var/log/backup-daily.log`
- [ ] Verify last backup timestamp: `ls -lh backups/ | head`
- [ ] Check cloud storage: `aws s3 ls s3://holi-labs-backups/database/ --endpoint-url=$R2_ENDPOINT`

**Weekly Checklist:**

- [ ] Review backup verification reports
- [ ] Check storage usage trends
- [ ] Verify retention policy compliance

**Monthly Checklist:**

- [ ] Test restore procedure (quarterly)
- [ ] Review and update disaster recovery runbook
- [ ] Audit access logs for backup storage

---

## Compliance Requirements

### HIPAA Compliance

**Required Capabilities:**

- ✅ **Data Backup**: Automated daily backups
- ✅ **Data Restoration**: Tested quarterly
- ✅ **Disaster Recovery Plan**: Documented (see runbook)
- ✅ **Encryption**: AES-256 at rest and in transit
- ✅ **Access Controls**: IAM policies and least privilege
- ✅ **Audit Logging**: All operations logged
- ✅ **Business Continuity**: < 4 hour RTO

### HIPAA Security Rule - 164.308(a)(7)(ii)(A)

> "Establish (and implement as needed) procedures to create and maintain retrievable exact copies of electronic protected health information."

**Our Implementation:**

1. **Automated Backups**: Daily, weekly, monthly schedules
2. **Exact Copies**: Full database dumps with pg_dump
3. **Retrievable**: Tested quarterly restore procedures
4. **Secure Storage**: Encrypted, access-controlled cloud storage
5. **Documented Procedures**: This document + disaster recovery runbook

### Audit Trail

Maintain records of:

- Backup creation timestamps
- Restore test results (quarterly)
- Access logs for backup storage
- Incident reports and recovery actions

**Retention**: Keep audit records for 6 years (HIPAA requirement)

---

## Quick Reference

### Common Commands

```bash
# Create immediate backup
tsx scripts/backup-database.ts --type=daily --upload

# Verify backups
tsx scripts/verify-backups.ts

# List local backups
ls -lh backups/

# List cloud backups
aws s3 ls s3://holi-labs-backups/database/ --endpoint-url=$R2_ENDPOINT

# Restore from backup (see disaster recovery runbook)
gunzip -c backups/backup-daily-2025-12-15.sql.gz | psql $DATABASE_URL
```

### Environment Variables

Required for backup operations:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-backups
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

### Related Documentation

- **Disaster Recovery Runbook**: `/docs/runbooks/DISASTER_RECOVERY.md`
- **Deployment Checklist**: `/DEPLOYMENT_CHECKLIST.md`
- **Database Deployment Guide**: `/docs/DATABASE_DEPLOYMENT.md`
- **Production Readiness**: `/docs/PRODUCTION_READINESS.md`

---

## Support and Contacts

### Emergency Contacts

- **On-Call Engineer**: [Your contact info]
- **Database Administrator**: [DBA contact info]
- **DevOps Team**: ops-team@holilabs.com
- **Security Team**: security@holilabs.com

### Escalation Path

1. **Level 1**: On-call engineer (attempt restore)
2. **Level 2**: Database administrator (PITR or manual recovery)
3. **Level 3**: CTO + Security team (major incident)

### External Support

- **DigitalOcean Support**: https://cloud.digitalocean.com/support
- **Cloudflare Support**: https://dash.cloudflare.com/support
- **PostgreSQL Community**: https://www.postgresql.org/support/

---

**Document Maintained By**: DevOps Team
**Next Review Date**: 2026-03-15
**Version History**: See git commit history

---

## Appendix A: Backup File Naming Convention

```
backup-{type}-{date}-{time}.sql.gz

Examples:
  backup-daily-2025-12-15-02-00-00.sql.gz
  backup-weekly-2025-12-10-03-00-00.sql.gz
  backup-monthly-2025-12-01-04-00-00.sql.gz

Format:
  {type}  : daily | weekly | monthly
  {date}  : YYYY-MM-DD
  {time}  : HH-MM-SS (24-hour format, UTC)
```

## Appendix B: Estimated Recovery Times

| Database Size | Download Time | Restore Time | Total RTO |
|---------------|---------------|--------------|-----------|
| 1 GB          | 1 min         | 10 min       | 30 min    |
| 10 GB         | 5 min         | 45 min       | 1.5 hours |
| 100 GB        | 30 min        | 2 hours      | 3 hours   |
| 500 GB        | 2 hours       | 6 hours      | 9 hours   |

*Times assume 100 Mbps connection and modern hardware*

## Appendix C: Storage Cost Estimates

**Cloudflare R2 (Current):**

```
Database Size: 1 GB
Backup Size (compressed): 200 MB

Monthly Storage:
  • Daily backups: 200 MB × 7 = 1.4 GB
  • Weekly backups: 200 MB × 4 = 0.8 GB
  • Monthly backups: 200 MB × 12 = 2.4 GB
  • Total: 4.6 GB × $0.015/GB = $0.07/month

Annual Cost: ~$0.84/year
```

**AWS S3 (Comparison):**

```
Same storage: 4.6 GB × $0.023/GB = $0.11/month
Annual Cost: ~$1.32/year
+ Egress fees for restores
```

**Recommendation**: Cloudflare R2 for cost savings and no egress fees.
