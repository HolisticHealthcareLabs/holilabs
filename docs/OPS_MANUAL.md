# Operations Manual
**Version:** 1.0
**Last Updated:** 2026-01-01
**Owner:** DevOps/SRE Team
**Review Cycle:** Monthly

---

## Executive Summary

This Operations Manual provides comprehensive guidance for operating, monitoring, and maintaining the Holi Labs healthcare platform in production. The manual covers daily operations, incident response, maintenance procedures, and compliance requirements.

**Target Audience:**
- DevOps/SRE Engineers
- On-call Engineers
- Technical Leads
- New team members

**Related Documents:**
- [Incident Response Plan](/docs/INCIDENT_RESPONSE_PLAN.md)
- [Disaster Recovery Plan](/docs/runbooks/DISASTER_RECOVERY_PLAN.md)
- [On-Call Guide](/docs/ON_CALL_GUIDE.md)
- [Deployment Checklist](/docs/DEPLOYMENT_CHECKLIST.md)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Daily Operations](#2-daily-operations)
3. [Monitoring and Alerting](#3-monitoring-and-alerting)
4. [Backup and Recovery](#4-backup-and-recovery)
5. [Security Operations](#5-security-operations)
6. [Performance Management](#6-performance-management)
7. [Maintenance Procedures](#7-maintenance-procedures)
8. [Troubleshooting](#8-troubleshooting)
9. [Vendor Management](#9-vendor-management)
10. [Compliance Operations](#10-compliance-operations)

---

## 1. System Architecture

### 1.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                    │
│                   DigitalOcean (Primary)                     │
└─────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │ CloudFlare   │
                              │   (CDN/WAF)  │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │ Load Balancer│
                              │  (DO LB)     │
                              └──────┬───────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐              ┌────────▼────────┐
            │  Web Server 1  │              │  Web Server 2   │
            │  (Next.js App) │              │  (Next.js App)  │
            │  Docker        │              │  Docker         │
            └───────┬────────┘              └────────┬────────┘
                    │                                │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │                         │
            ┌───────▼────────┐      ┌────────▼────────┐
            │   PgBouncer    │      │  Redis (Upstash)│
            │ (Conn Pooling) │      │  (Rate Limiting)│
            └───────┬────────┘      └─────────────────┘
                    │
            ┌───────▼────────┐
            │  PostgreSQL 14 │
            │  (Primary)     │
            │  + pgAudit     │
            │  + Encryption  │
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │  PostgreSQL 14 │
            │  (Read Replica)│
            └────────────────┘
```

### 1.2 Core Components

| Component | Technology | Purpose | Location |
|-----------|-----------|---------|----------|
| **Web Application** | Next.js 14 (App Router) | Frontend + API Routes | DigitalOcean Droplets |
| **Database** | PostgreSQL 14 | Primary data store (PHI) | DigitalOcean Managed Database |
| **Connection Pool** | PgBouncer | Database connection pooling | Docker container |
| **Cache/Rate Limiting** | Redis (Upstash) | Rate limiting, session cache | Upstash (serverless) |
| **File Storage** | AWS S3 | Documents, logs, backups | AWS us-east-1 |
| **CDN/WAF** | CloudFlare | DDoS protection, caching | Global edge network |
| **Monitoring** | Prometheus + Grafana | Metrics, alerting | DigitalOcean |
| **Error Tracking** | Sentry | Error monitoring, debugging | Sentry.io |
| **Logging** | Pino → S3 | Structured logs, 6-year retention | AWS S3 |
| **Secrets** | Doppler | Environment variables, API keys | Doppler.com |
| **CI/CD** | GitHub Actions | Automated testing, deployment | GitHub |
| **Alerting** | PagerDuty | On-call notifications | PagerDuty.com |

### 1.3 Data Flow

**Patient Record Access (Typical Request):**
```
1. User → CloudFlare (SSL termination, DDoS protection)
2. CloudFlare → DigitalOcean Load Balancer
3. Load Balancer → Web Server (Next.js API route)
4. Web Server → Auth middleware (validate JWT)
5. Web Server → Rate limiter (Upstash Redis)
6. Web Server → RBAC check (Prisma query)
7. Web Server → PgBouncer (connection pooling)
8. PgBouncer → PostgreSQL (read encrypted PHI)
9. PostgreSQL → Decrypt PHI (transparent encryption)
10. Web Server → Audit log write (HIPAA compliance)
11. Web Server → Return response to user
12. Audit log → S3 (async batch write)

Timeline: ~200-400ms (p95)
```

---

## 2. Daily Operations

### 2.1 Morning Checklist (9:00 AM Daily)

**Duration:** 15 minutes
**Owner:** On-call engineer or designated operations engineer

#### Step 1: System Health Check (5 minutes)

```bash
# 1. Check overall health endpoint
curl https://api.holilabs.xyz/api/health
# Expected: {"status": "healthy", "database": "connected", "redis": "connected"}

# 2. Check detailed metrics
curl https://api.holilabs.xyz/api/health/metrics | jq .
# Review:
# - system.uptime (should be high)
# - business.patients.active (trending up?)
# - security.failedAuth.lastHour (should be low, <10)
# - database.connected (should be true)
# - database.latency (should be <50ms)

# 3. Check status page (user-reported issues)
open https://status.holilabs.xyz
```

#### Step 2: Review Overnight Alerts (3 minutes)

```bash
# 1. Check Slack #alerts channel for overnight alerts
# - Any P1/P2 incidents?
# - Any resolved incidents needing follow-up?

# 2. Check PagerDuty for overnight pages
# https://holilabs.pagerduty.com/incidents

# 3. Check Sentry for error spikes
# https://sentry.io/holi-labs/errors/
# - Any new errors?
# - Any recurring errors?
```

#### Step 3: Review Key Metrics (5 minutes)

**Grafana Dashboard:** https://metrics.holilabs.xyz/d/daily-ops

```bash
# Key metrics to review:
# - API request rate (trending as expected?)
# - API error rate (should be <1%)
# - API latency p95 (should be <500ms)
# - Database connections (should be <80% of pool)
# - Active patients (growing?)
# - Daily appointments (reasonable for day of week?)
# - Failed auth attempts (should be low)
# - Audit log writes (should match API activity)
```

#### Step 4: Database Health (2 minutes)

```bash
# Connect to database (read-only check)
psql $DATABASE_URL -c "
  SELECT
    'Active Connections' as metric,
    count(*) as value
  FROM pg_stat_activity
  WHERE state = 'active';
"
# Should be: <20 (out of 25 max)

# Check replication lag (read replica)
psql $READ_REPLICA_URL -c "
  SELECT
    CASE
      WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 'Up to date'
      ELSE 'Lag: ' || (pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) / 1024)::text || ' KB'
    END AS replication_status;
"
# Should be: "Up to date" or lag <1MB
```

#### Step 5: Security Check (1 minute)

```bash
# Check for unusual security events
psql $DATABASE_URL -c "
  SELECT
    action,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
  FROM audit_logs
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED')
  GROUP BY action
  ORDER BY count DESC;
"

# Thresholds for escalation:
# - LOGIN_FAILED > 100 in 24h → Potential brute force
# - UNAUTHORIZED_ACCESS > 10 in 24h → Investigate
```

**Report Template (post in #ops-daily):**
```
📊 Daily Operations Report - 2026-01-01

✅ System Health: All systems operational
✅ Overnight Alerts: 0 P1, 1 P2 (resolved)
✅ Key Metrics:
  - API latency p95: 287ms ✓
  - Error rate: 0.3% ✓
  - Database connections: 12/25 ✓
  - Replication lag: Up to date ✓
✅ Security: No unusual activity

🔔 Action Items: None
```

---

### 2.2 Weekly Checklist (Monday 10:00 AM)

**Duration:** 30 minutes
**Owner:** DevOps Lead

#### Step 1: Backup Verification (10 minutes)

```bash
# 1. Verify daily backups completed successfully
aws s3 ls s3://holi-database-backups/$(date +%Y-%m-%d)/ | grep "backup-completed"
# Expected: Files for last 7 days

# 2. Test restore (weekly validation)
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
./scripts/test-restore.sh --backup-date $(date -d "yesterday" +%Y-%m-%d) --target staging

# 3. Verify backup retention policy
aws s3api list-objects-v2 --bucket holi-database-backups --query 'Contents | length(@)'
# Expected: ~90 backups (90-day retention in Standard, then Glacier)
```

#### Step 2: Security Updates (10 minutes)

```bash
# 1. Check for dependency vulnerabilities
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
pnpm audit --production
# Expected: 0 high/critical vulnerabilities

# 2. Check for Docker image updates
docker pull postgres:14
docker pull edoburu/pgbouncer:1.21.0
# If updates available, schedule update window

# 3. Review security scan results (if using Snyk/GitHub Security)
# https://github.com/holilabs/holilabsv2/security/dependabot
```

#### Step 3: Certificate Expiry Check (5 minutes)

```bash
# Check SSL certificate expiry
echo | openssl s_client -servername holilabs.xyz -connect holilabs.xyz:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected: notAfter > 30 days from now
# If <30 days, schedule renewal (usually automated via Let's Encrypt)
```

#### Step 4: Review Incident Reports (5 minutes)

```bash
# 1. Review past week's incidents
ls -lt /Users/nicolacapriroloteran/prototypes/holilabsv2/incident-reports/ | head -5

# 2. Check action item completion
# - Open Jira/Linear to verify incident follow-ups completed

# 3. Update runbooks if lessons learned
```

---

### 2.3 Monthly Checklist (First Monday 2:00 PM)

**Duration:** 2 hours
**Owner:** CTO + DevOps Lead

#### Step 1: Disaster Recovery Test (45 minutes)

```bash
# FULL restore test to staging environment
./scripts/restore-database.sh \
  --backup-date $(date -d "yesterday" +%Y-%m-%d) \
  --target staging \
  --verify-integrity

# Verify:
# - Row counts match production
# - Data integrity checks pass
# - Application connects successfully
# - Audit logs intact
```

#### Step 2: Compliance Review (30 minutes)

- [ ] Review audit log coverage (100% of PHI access?)
- [ ] Review BAA status (all vendors signed?)
- [ ] Review access control lists (RBAC correct?)
- [ ] Review encryption status (all PHI encrypted?)
- [ ] Review workforce training completion (all trained?)

#### Step 3: Capacity Planning (30 minutes)

```bash
# Review resource utilization trends (past 30 days)
# Grafana dashboard: Resource Utilization

# Key metrics:
# - CPU utilization (target: <70% average)
# - Memory utilization (target: <80% average)
# - Database storage (target: <70% full)
# - Database connections (target: <80% of pool)
# - API request rate (growing as expected?)

# If any metric exceeds target, schedule capacity expansion
```

#### Step 4: Cost Review (15 minutes)

```bash
# Review cloud costs (past 30 days)
# DigitalOcean: https://cloud.digitalocean.com/billing
# AWS: https://console.aws.amazon.com/billing/
# Upstash: https://console.upstash.com/billing

# Expected monthly costs:
# - DigitalOcean: ~$500 (2 droplets, managed DB, load balancer)
# - AWS: ~$50 (S3 storage, data transfer)
# - Upstash: ~$10 (Redis)
# - Total: ~$560/month

# Flag if costs exceed budget by >20%
```

---

## 3. Monitoring and Alerting

### 3.1 Monitoring Stack

**Architecture:**
```
Application (Next.js)
  ↓ (metrics)
Prometheus (scrapes /api/health/metrics every 30s)
  ↓ (stores time-series)
Grafana (visualizes dashboards)
  ↓ (triggers)
Alertmanager (routes alerts)
  ↓ (pages)
PagerDuty (notifies on-call)
```

### 3.2 Key Dashboards

#### 3.2.1 API Health Dashboard

**URL:** https://metrics.holilabs.xyz/d/api-health

**Panels:**
1. **Request Rate:** Requests per second (should be stable during business hours)
2. **Error Rate:** Percentage of 5xx responses (target: <1%)
3. **Latency p95:** 95th percentile response time (target: <500ms)
4. **Latency p99:** 99th percentile response time (target: <1000ms)
5. **Status Code Distribution:** 2xx vs 4xx vs 5xx breakdown

**Alert Thresholds:**
- Error rate >5% for 5 minutes → P1 alert
- p95 latency >1000ms for 5 minutes → P2 alert

---

#### 3.2.2 Database Health Dashboard

**URL:** https://metrics.holilabs.xyz/d/database-health

**Panels:**
1. **Connection Count:** Active connections (target: <80% of pool size)
2. **Query Latency:** Average query execution time (target: <50ms)
3. **Database Size:** Total storage used (monitor growth rate)
4. **Replication Lag:** Read replica lag (target: <1MB)
5. **Cache Hit Ratio:** PostgreSQL buffer cache hits (target: >95%)
6. **Slow Queries:** Queries >1000ms (should be rare)

**Alert Thresholds:**
- Connections >90% for 5 minutes → P2 alert
- Replication lag >10MB for 10 minutes → P2 alert
- Database unavailable → P1 alert (immediate)

---

#### 3.2.3 Business Metrics Dashboard

**URL:** https://metrics.holilabs.xyz/d/business-metrics

**Panels:**
1. **Active Patients:** Count trending over time
2. **Daily Appointments:** Count by day
3. **New Patient Registrations:** Daily signup rate
4. **Failed Auth Attempts:** Security monitoring
5. **Audit Log Write Rate:** Compliance monitoring
6. **Prescription Volume:** Daily prescriptions created

**Alert Thresholds:**
- Failed auth >10/hour → Security investigation
- Audit log writes = 0 for 10 minutes → P1 alert (compliance risk)

---

#### 3.2.4 Infrastructure Dashboard

**URL:** https://metrics.holilabs.xyz/d/infrastructure

**Panels:**
1. **CPU Utilization:** Per-server CPU usage (target: <70%)
2. **Memory Utilization:** Per-server memory usage (target: <80%)
3. **Disk Usage:** Storage consumption (target: <70%)
4. **Network I/O:** Data transfer rate
5. **Docker Container Status:** Running/stopped containers
6. **Redis Connection Count:** Upstash connections

**Alert Thresholds:**
- CPU >90% for 10 minutes → P2 alert
- Memory >95% for 5 minutes → P2 alert
- Disk >85% → P2 alert
- Container stopped unexpectedly → P1 alert

---

### 3.3 Alert Configuration

**PagerDuty Integration:**
```yaml
# /infra/monitoring/alertmanager.yml

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'pagerduty'

  routes:
    # P1 alerts - immediate page
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      group_wait: 0s

    # P2 alerts - page during business hours, email off-hours
    - match:
        severity: warning
      receiver: 'pagerduty-warning'

    # P3/P4 alerts - Slack only
    - match:
        severity: info
      receiver: 'slack'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: $PAGERDUTY_SERVICE_KEY
        severity: critical

  - name: 'slack'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#alerts'
```

---

### 3.4 Prometheus Alert Rules

**File:** `/infra/monitoring/prometheus-alerts.yaml`

```yaml
groups:
  - name: api_health
    interval: 30s
    rules:
      - alert: APIServerDown
        expr: up{job="api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API server is down"
          description: "API server has been down for more than 2 minutes"
          runbook: "/docs/runbooks/API_SERVER_DOWN.md"

      - alert: HighErrorRate
        expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

  - name: database_health
    interval: 30s
    rules:
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"
          runbook: "/docs/runbooks/DATABASE_FAILURE.md"

      - alert: HighDatabaseConnections
        expr: (pg_stat_activity_count / pg_settings_max_connections) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Using {{ $value | humanizePercentage }} of available connections"

      - alert: ReplicationLag
        expr: pg_replication_lag_bytes > 10485760  # 10MB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag"
          description: "Replication lag is {{ $value | humanize1024 }}"

  - name: security
    interval: 60s
    rules:
      - alert: HighFailedAuthRate
        expr: sum(rate(audit_logs_total{action="LOGIN_FAILED"}[1h])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed authentication attempts"
          description: "{{ $value }} failed auth attempts in last hour"

      - alert: AuditLogNotWriting
        expr: rate(audit_logs_total[10m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Audit logs not writing (HIPAA compliance risk)"
          runbook: "/docs/runbooks/HIPAA_AUDIT_LOG_FAILURE.md"
```

---

## 4. Backup and Recovery

### 4.1 Backup Strategy

**Backup Types:**

| Type | Frequency | Retention | Storage | Purpose |
|------|-----------|-----------|---------|---------|
| **Full Database Backup** | Daily (2:00 AM UTC) | 90 days | S3 Standard → Glacier | Disaster recovery |
| **Transaction Logs (WAL)** | Continuous | 30 days | S3 Intelligent-Tiering | Point-in-time recovery |
| **Application Logs** | Continuous | 6 years | S3 Standard → Glacier → Deep Archive | HIPAA compliance |
| **Configuration Backup** | Weekly | 1 year | Git repository | Infrastructure as Code |
| **Docker Images** | Per release | 1 year | Docker registry | Rollback capability |

**RTO/RPO:**
- **RTO (Recovery Time Objective):** < 1 hour (time to restore service)
- **RPO (Recovery Point Objective):** < 15 minutes (maximum data loss)

---

### 4.2 Daily Database Backup

**Automated via GitHub Actions:** `.github/workflows/backup-database.yml`

```yaml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 2:00 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create database dump
        run: |
          pg_dump $DATABASE_URL \
            --format=custom \
            --compress=9 \
            --file=backup-$(date +%Y%m%d-%H%M%S).dump

      - name: Encrypt backup
        run: |
          openssl enc -aes-256-cbc \
            -in backup-*.dump \
            -out backup-*.dump.enc \
            -pass env:BACKUP_ENCRYPTION_KEY

      - name: Upload to S3
        run: |
          aws s3 cp backup-*.dump.enc \
            s3://holi-database-backups/$(date +%Y/%m/%d)/ \
            --storage-class STANDARD \
            --server-side-encryption AES256

      - name: Verify backup integrity
        run: |
          aws s3api head-object \
            --bucket holi-database-backups \
            --key $(date +%Y/%m/%d)/backup-*.dump.enc
```

---

### 4.3 Database Restore Procedure

**Script:** `/scripts/restore-database.sh`

**Usage:**
```bash
# Restore from specific date
./scripts/restore-database.sh \
  --backup-date 2026-01-01 \
  --target production

# Point-in-time recovery (uses WAL)
./scripts/restore-database.sh \
  --backup-date 2026-01-01 \
  --recovery-target-time "2026-01-01 14:30:00 UTC" \
  --target production
```

**Manual Restore Steps:**

```bash
# Step 1: Stop application (prevent writes during restore)
docker-compose -f docker-compose.prod.yml stop web

# Step 2: Create backup of current database (safety)
pg_dump $DATABASE_URL --format=custom --file=pre-restore-backup-$(date +%Y%m%d).dump

# Step 3: Download backup from S3
aws s3 cp s3://holi-database-backups/2026/01/01/backup-20260101-020000.dump.enc ./

# Step 4: Decrypt backup
openssl enc -aes-256-cbc -d \
  -in backup-20260101-020000.dump.enc \
  -out backup-20260101-020000.dump \
  -pass env:BACKUP_ENCRYPTION_KEY

# Step 5: Drop and recreate database (DESTRUCTIVE!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Step 6: Restore backup
pg_restore --verbose --clean --no-owner --no-acl \
  --dbname=$DATABASE_URL \
  backup-20260101-020000.dump

# Step 7: Verify data integrity
psql $DATABASE_URL -c "
  SELECT
    'Patients' as table_name, COUNT(*) as row_count FROM \"Patient\"
  UNION ALL
  SELECT 'Appointments', COUNT(*) FROM \"Appointment\"
  UNION ALL
  SELECT 'AuditLogs', COUNT(*) FROM \"AuditLog\";
"

# Step 8: Restart application
docker-compose -f docker-compose.prod.yml up -d web

# Step 9: Verify health
curl https://api.holilabs.xyz/api/health
```

**Recovery Time:** Typically 30-45 minutes for full restore

---

## 5. Security Operations

### 5.1 Access Control Management

**Principle:** Least privilege + separation of duties

#### 5.1.1 Production Access Levels

| Role | Access | Granted To | Duration |
|------|--------|-----------|----------|
| **Read-Only** | View logs, metrics, dashboards | All engineers | Permanent |
| **Database Read-Only** | SELECT queries on production DB | Senior engineers | Permanent |
| **Database Write** | INSERT/UPDATE/DELETE queries | DevOps Lead only | Per-incident (revoked after) |
| **Infrastructure Admin** | Server access, deployment | DevOps team | Permanent |
| **Secrets Admin** | Doppler, environment variables | CTO, DevOps Lead | Permanent |

#### 5.1.2 Access Request Process

```bash
# Request production database write access (emergencies only)
# 1. Create ticket: "Production DB Write Access - [REASON]"
# 2. CTO approval required
# 3. Time-limited (1 hour)
# 4. All queries logged

# Example access grant (DevOps Lead):
# Create temporary PostgreSQL role
psql $DATABASE_URL -c "
  CREATE ROLE temp_admin_$(date +%Y%m%d)
  LOGIN PASSWORD '[RANDOM_PASSWORD]'
  VALID UNTIL '$(date -d "+1 hour" --iso-8601=seconds)';

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO temp_admin_$(date +%Y%m%d);
"

# Access automatically expires after 1 hour
```

---

### 5.2 Secrets Management

**Tool:** Doppler (https://doppler.com)

**Secrets Categories:**

| Category | Examples | Access Level | Rotation Frequency |
|----------|----------|--------------|-------------------|
| **Database** | `DATABASE_URL`, `POSTGRES_PASSWORD` | Infrastructure Admin | Quarterly |
| **API Keys** | `ANTHROPIC_API_KEY`, `TWILIO_API_KEY` | Infrastructure Admin | Annually |
| **Encryption Keys** | `ENCRYPTION_KEY`, `JWT_SECRET` | CTO only | Annually |
| **OAuth Secrets** | `GOOGLE_CLIENT_SECRET` | Infrastructure Admin | When compromised |

**Secret Rotation Procedure:**

```bash
# Example: Rotate database password

# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update password in PostgreSQL
psql $DATABASE_URL -c "ALTER USER holi_user WITH PASSWORD '$NEW_PASSWORD';"

# 3. Update Doppler secret
doppler secrets set DATABASE_URL="postgresql://holi_user:$NEW_PASSWORD@localhost:5432/holi_db"

# 4. Rolling restart (zero-downtime)
# Web server 1: Restart (picks up new secret)
docker-compose -f docker-compose.prod.yml restart web-1

# Wait 30 seconds (verify health)
sleep 30 && curl https://api.holilabs.xyz/api/health

# Web server 2: Restart
docker-compose -f docker-compose.prod.yml restart web-2

# 5. Verify old password no longer works
psql postgresql://holi_user:OLD_PASSWORD@localhost:5432/holi_db -c "SELECT 1;"
# Expected: authentication failed
```

---

### 5.3 Audit Log Review

**Frequency:** Daily (automated) + Weekly (manual review)

#### 5.3.1 Automated Anomaly Detection

**Script:** `/scripts/audit-anomaly-detection.sh` (runs daily via cron)

```bash
#!/bin/bash
# Detect unusual patterns in audit logs

# Check 1: High-volume access by single user (potential data exfiltration)
psql $DATABASE_URL -c "
  SELECT
    user_email,
    COUNT(*) as access_count,
    COUNT(DISTINCT resource_id) as unique_records
  FROM audit_logs
  WHERE
    timestamp >= NOW() - INTERVAL '24 hours'
    AND action IN ('READ', 'EXPORT')
    AND resource = 'Patient'
  GROUP BY user_email
  HAVING COUNT(*) > 100
  ORDER BY access_count DESC;
" | tee /tmp/audit-high-volume.txt

# If any results, send alert
if [ -s /tmp/audit-high-volume.txt ]; then
  echo "🚨 High-volume access detected" | mail -s "Security Alert" security@holilabs.xyz
fi

# Check 2: Access to records outside assigned patients
psql $DATABASE_URL -c "
  SELECT
    al.user_email,
    al.resource_id as patient_id,
    al.timestamp
  FROM audit_logs al
  LEFT JOIN data_access_grants dag
    ON al.user_id = dag.user_id
    AND al.resource_id = dag.patient_id
  WHERE
    al.timestamp >= NOW() - INTERVAL '24 hours'
    AND al.resource = 'Patient'
    AND dag.id IS NULL  -- No grant found
  ORDER BY al.timestamp DESC;
"

# Check 3: Failed auth attempts from same IP
psql $DATABASE_URL -c "
  SELECT
    ip_address,
    COUNT(*) as failed_attempts,
    MIN(timestamp) as first_attempt,
    MAX(timestamp) as last_attempt
  FROM audit_logs
  WHERE
    timestamp >= NOW() - INTERVAL '1 hour'
    AND action = 'LOGIN_FAILED'
  GROUP BY ip_address
  HAVING COUNT(*) > 5
  ORDER BY failed_attempts DESC;
"
```

#### 5.3.2 Weekly Manual Review

**Owner:** Security Lead
**Duration:** 30 minutes
**Checklist:**

- [ ] Review high-volume access users (>100 records/day)
- [ ] Review after-hours access (10pm-6am)
- [ ] Review EXPORT actions (patient data exports)
- [ ] Review PERMISSION_DENIED events (access control working?)
- [ ] Review admin privilege usage (CREATE_USER, DELETE_USER)

**Reporting Template:**
```markdown
# Weekly Audit Log Review - 2026-01-01

## Summary
- Total audit logs: 45,230
- Unique users: 87
- PHI access events: 12,450
- Export events: 23
- Failed auth: 12
- Permission denied: 5

## Findings
✅ No anomalies detected

## Action Items
None
```

---

### 5.4 Vulnerability Management

**Process:**

```
1. Vulnerability Discovery
   ↓
2. Severity Assessment (CVSS score)
   ↓
3. Patch/Mitigation Planning
   ↓
4. Testing (staging environment)
   ↓
5. Production Deployment
   ↓
6. Verification
```

**SLA by Severity:**

| Severity | CVSS Score | Patch Timeline | Approval Required |
|----------|------------|----------------|-------------------|
| **Critical** | 9.0-10.0 | Within 24 hours | CTO |
| **High** | 7.0-8.9 | Within 7 days | Technical Lead |
| **Medium** | 4.0-6.9 | Within 30 days | Sprint planning |
| **Low** | 0.1-3.9 | Within 90 days | Backlog |

**Vulnerability Scanning:**
- **Dependencies:** `pnpm audit` (daily via CI/CD)
- **Docker Images:** Snyk container scan (daily)
- **Infrastructure:** Quarterly penetration test
- **Application:** Annual security audit

---

## 6. Performance Management

### 6.1 Performance Targets

**Service Level Objectives (SLOs):**

| Metric | Target | Measurement Window | Consequence if Missed |
|--------|--------|-------------------|----------------------|
| **Uptime** | 99.9% | Monthly | Postmortem + RCA |
| **API Latency (p95)** | <500ms | Weekly | Performance investigation |
| **API Latency (p99)** | <1000ms | Weekly | Escalate to CTO |
| **Error Rate** | <1% | Daily | Incident investigation |
| **Database Query Time** | <50ms average | Weekly | Query optimization |

---

### 6.2 Performance Monitoring

**Daily Performance Review:**

```bash
# Generate daily performance report
psql $DATABASE_URL -c "
  SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    total_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100  -- Queries averaging >100ms
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Review slow query log
tail -100 /var/log/postgresql/postgresql-slow.log
```

---

### 6.3 Performance Optimization

**Common Optimizations:**

#### 6.3.1 Database Query Optimization

```sql
-- Example: Slow patient search query
-- BEFORE (sequential scan, 1200ms):
SELECT * FROM "Patient"
WHERE email LIKE '%john%';

-- AFTER (add index, 45ms):
CREATE INDEX idx_patient_email_trgm
ON "Patient" USING gin (email gin_trgm_ops);

SELECT * FROM "Patient"
WHERE email ILIKE '%john%';
```

#### 6.3.2 Connection Pooling Tuning

```yaml
# docker-compose.prod.yml
pgbouncer:
  environment:
    DEFAULT_POOL_SIZE: 20  # Increase if connection saturation
    MAX_CLIENT_CONN: 200   # Increase if client connection rejections
```

#### 6.3.3 Redis Caching

```typescript
// Cache expensive queries
import { redis } from '@/lib/redis';

export async function getPatientStats(patientId: string) {
  const cacheKey = `patient-stats:${patientId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Compute if not cached
  const stats = await prisma.$queryRaw`
    SELECT COUNT(*) as appointment_count
    FROM "Appointment"
    WHERE patient_id = ${patientId};
  `;

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(stats));

  return stats;
}
```

---

## 7. Maintenance Procedures

### 7.1 Deployment Process

**See:** [Deployment Checklist](/docs/DEPLOYMENT_CHECKLIST.md) for detailed steps

**Standard Deployment Flow:**

```bash
# 1. Merge PR to main branch (GitHub)
# 2. CI/CD automatically runs tests
# 3. If tests pass, build Docker image
# 4. Push to registry
# 5. Deploy to staging (automatic)
# 6. Run smoke tests on staging
# 7. Manual approval for production
# 8. Rolling deployment to production (zero-downtime)
# 9. Health check verification
# 10. Rollback if issues detected
```

**Emergency Hotfix Process:**

```bash
# For critical bugs requiring immediate fix

# 1. Create hotfix branch
git checkout -b hotfix/critical-bug-fix main

# 2. Make minimal fix (single issue only)
# ... edit files ...

# 3. Fast-tracked review (1 approver, CTO/Tech Lead)
git commit -m "hotfix: Fix critical bug"
git push origin hotfix/critical-bug-fix

# 4. Deploy directly to production (skip staging)
git checkout main
git merge --no-ff hotfix/critical-bug-fix
git push origin main

# 5. Monitor closely (30 minutes)
watch -n 10 curl https://api.holilabs.xyz/api/health

# 6. Post-deployment verification
# - Check Sentry for new errors
# - Check Grafana for metric anomalies
# - Run smoke tests manually
```

---

### 7.2 Database Maintenance

#### 7.2.1 Vacuum and Analyze (Weekly)

```bash
# Reclaim storage and update query planner statistics
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# For high-churn tables, more frequent vacuuming
psql $DATABASE_URL -c "VACUUM ANALYZE \"AuditLog\";"
```

#### 7.2.2 Index Maintenance (Monthly)

```bash
# Find unused indexes (candidates for removal)
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan as index_scans
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND indexrelname NOT LIKE 'pg_toast%'
  ORDER BY pg_relation_size(indexrelid) DESC;
"

# Rebuild fragmented indexes
psql $DATABASE_URL -c "REINDEX INDEX CONCURRENTLY idx_patient_email;"
```

#### 7.2.3 Table Bloat Monitoring (Monthly)

```bash
# Check for table bloat (dead tuples)
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
  ORDER BY n_dead_tup DESC;
"

# If dead_pct > 20%, run VACUUM FULL (requires downtime)
```

---

### 7.3 Log Rotation

**Configured via:** `/etc/logrotate.d/holi-app`

```bash
/var/log/holi/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f /opt/holi/docker-compose.prod.yml restart web
    endscript
}
```

---

## 8. Troubleshooting

### 8.1 Common Issues and Solutions

#### 8.1.1 High API Latency

**Symptoms:**
- Grafana shows p95 latency >1000ms
- Users report slow page loads
- Sentry shows timeout errors

**Diagnosis:**
```bash
# 1. Check database connections
psql $DATABASE_URL -c "
  SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
"
# If >20 (out of 25), connection pool saturated

# 2. Check slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 5;
"

# 3. Check application logs
docker logs holi-web-1 --tail 100 | grep "duration.*ms" | sort -t: -k2 -nr | head -20
```

**Solutions:**
- **Connection pool saturated:** Increase `DEFAULT_POOL_SIZE` in pgBouncer
- **Slow queries:** Add indexes, optimize queries
- **External API timeout:** Increase timeout, add circuit breaker
- **Memory leak:** Restart application, investigate with heap dump

---

#### 8.1.2 Database Connection Errors

**Symptoms:**
- `FATAL: too many connections for role "holi_user"`
- `FATAL: remaining connection slots are reserved`
- API returns 500 errors

**Diagnosis:**
```bash
# Check current connections by application
psql $DATABASE_URL -c "
  SELECT
    application_name,
    count(*),
    state
  FROM pg_stat_activity
  GROUP BY application_name, state
  ORDER BY count DESC;
"
```

**Solutions:**
```bash
# Option 1: Kill idle connections (immediate)
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes';
"

# Option 2: Increase max_connections (requires restart)
psql $DATABASE_URL -c "ALTER SYSTEM SET max_connections = 50;"
# Then restart database

# Option 3: Fix connection leak in application
# Review code for unclosed Prisma clients
```

---

#### 8.1.3 Out of Disk Space

**Symptoms:**
- Database writes fail
- Application logs: `ERROR: could not write to file`
- Monitoring alert: Disk usage >90%

**Diagnosis:**
```bash
# Check disk usage
df -h

# Find large files
du -h /var/lib/postgresql/data | sort -rh | head -20
```

**Solutions:**
```bash
# Option 1: Clear old logs (immediate relief)
find /var/lib/postgresql/data/pg_log -name "*.log" -mtime +7 -delete
docker logs holi-web-1 --tail 1000 > /dev/null  # Truncate Docker logs

# Option 2: Archive old data
psql $DATABASE_URL -c "
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
"

# Option 3: Expand disk (long-term)
# DigitalOcean: Resize volume in console
# Verify: df -h (should show new size)
```

---

#### 8.1.4 Redis Connection Failures

**Symptoms:**
- Rate limiting not working (fail-open mode)
- Session cache misses
- Application logs: `Redis connection refused`

**Diagnosis:**
```bash
# Test Redis connectivity
redis-cli -h [UPSTASH_HOST] -p [PORT] -a [PASSWORD] ping
# Expected: PONG

# Check Redis metrics (Upstash dashboard)
# - Connection count
# - Memory usage
# - Command rate
```

**Solutions:**
- **Upstash outage:** Application continues with fail-open (no action needed)
- **Authentication failure:** Verify `UPSTASH_REDIS_REST_TOKEN` in Doppler
- **Rate limit exceeded:** Upgrade Upstash plan
- **Network issue:** Check firewall rules, DNS resolution

---

### 8.2 Emergency Procedures

#### 8.2.1 Emergency Application Restart

```bash
# If application is unresponsive, restart containers
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
docker-compose -f docker-compose.prod.yml restart web

# Verify health after restart
sleep 30
curl https://api.holilabs.xyz/api/health
```

#### 8.2.2 Emergency Rollback

```bash
# Rollback to previous Docker image
docker-compose -f docker-compose.prod.yml down
git checkout HEAD~1  # Previous commit
docker-compose -f docker-compose.prod.yml up -d --build

# Verify rollback successful
curl https://api.holilabs.xyz/api/health
```

#### 8.2.3 Emergency Database Restore

See Section 4.3: Database Restore Procedure

---

## 9. Vendor Management

### 9.1 Vendor Inventory

| Vendor | Service | Criticality | BAA Status | Annual Cost | Contact |
|--------|---------|-------------|------------|-------------|---------|
| **DigitalOcean** | Infrastructure | CRITICAL | ⚠️ REQUIRED | $6,000 | support@digitalocean.com |
| **AWS** | S3 storage, backups | HIGH | ⚠️ REQUIRED | $600 | aws-support@amazon.com |
| **Upstash** | Redis (rate limiting) | MEDIUM | ⚠️ REQUIRED | $120 | support@upstash.com |
| **Anthropic** | Claude AI (clinical notes) | HIGH | ⚠️ REQUIRED | $12,000 | support@anthropic.com |
| **Twilio** | SMS/Voice | MEDIUM | ⚠️ REQUIRED | $2,400 | support@twilio.com |
| **Resend** | Email delivery | LOW | ⚠️ REQUIRED | $240 | support@resend.com |
| **Sentry** | Error tracking | LOW | ⚠️ REQUIRED | $360 | support@sentry.io |
| **PagerDuty** | On-call alerting | HIGH | Not required | $1,200 | support@pagerduty.com |
| **Doppler** | Secrets management | HIGH | Not required | $600 | support@doppler.com |

**Total Annual Cost:** ~$23,520

---

### 9.2 Vendor Relationship Management

**Quarterly Vendor Review:**
- [ ] Verify BAA signed and current
- [ ] Review service availability/uptime
- [ ] Review costs vs. budget
- [ ] Check for security incidents
- [ ] Evaluate alternatives (cost optimization)

**Vendor Escalation Contacts:**
```markdown
# DigitalOcean Critical Issue
1. Open ticket: https://cloud.digitalocean.com/support/tickets
2. Priority: "Critical - Production Down"
3. Escalation: Call Premium Support (if subscribed)

# AWS Critical Issue
1. Open case: https://console.aws.amazon.com/support/
2. Severity: "Critical - Production system down"
3. Escalation: Account manager (if Enterprise Support)

# Anthropic API Outage
1. Check status: https://status.anthropic.com
2. Email: support@anthropic.com
3. Fallback: Graceful degradation (disable AI features)
```

---

## 10. Compliance Operations

### 10.1 HIPAA Compliance Monitoring

**Daily:**
- [ ] Verify audit logs writing (automated alert)
- [ ] Review failed auth attempts

**Weekly:**
- [ ] Review audit log anomalies
- [ ] Verify backup completion
- [ ] Check encryption status

**Monthly:**
- [ ] Disaster recovery test
- [ ] Access control review
- [ ] Workforce training status

**Quarterly:**
- [ ] Risk assessment update
- [ ] Policy review
- [ ] Incident response drill

**Annually:**
- [ ] HIPAA Security Risk Assessment
- [ ] External security audit
- [ ] Workforce HIPAA training renewal
- [ ] BAA renewal with vendors

---

### 10.2 Audit Preparation

**If OCR Audit Requested:**

1. **Preserve all evidence** (do not delete anything)
2. **Engage legal counsel** immediately
3. **Assemble documentation:**
   - [ ] HIPAA Risk Assessment
   - [ ] Policies and Procedures
   - [ ] Workforce training records
   - [ ] Audit logs (6 years)
   - [ ] Incident response records
   - [ ] Signed BAAs
   - [ ] Access control lists
   - [ ] Backup/DR test records

4. **Designate OCR point of contact** (Compliance Officer)
5. **Cooperate fully** (refusal = penalties)

---

## 11. Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-01 | DevOps Team | Initial release |

**Review Schedule:** Monthly (first Monday)

**Next Review Date:** 2026-02-01

---

## 12. Quick Reference

### 12.1 Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| **On-Call Engineer** | PagerDuty | [Auto-pages] |
| **CTO** | [Name] | [Phone] |
| **DevOps Lead** | [Name] | [Phone] |

### 12.2 Critical Links

| Resource | URL |
|----------|-----|
| **Production Dashboard** | https://metrics.holilabs.xyz/d/overview |
| **Health Endpoint** | https://api.holilabs.xyz/api/health |
| **Status Page** | https://status.holilabs.xyz |
| **PagerDuty** | https://holilabs.pagerduty.com |
| **Sentry** | https://sentry.io/holi-labs |
| **Runbooks** | /docs/runbooks/ |

### 12.3 Common Commands

```bash
# Check application health
curl https://api.holilabs.xyz/api/health | jq .

# View application logs
docker logs -f holi-web-1

# Connect to database (read-only)
psql $DATABASE_URL -c "SELECT version();"

# Check disk space
df -h

# Restart application
docker-compose -f docker-compose.prod.yml restart web
```

---

**END OF OPERATIONS MANUAL**

For questions or updates, contact: devops@holilabs.xyz
