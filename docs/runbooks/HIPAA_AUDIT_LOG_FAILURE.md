# Incident Response Runbook: HIPAA Audit Log Failure

**Alert:** `AuditLogFailure` or `AuditLogWriteError`
**Severity:** P1 (Critical) - HIPAA Compliance Risk
**Alert Trigger:** Audit log writes fail for > 2 minutes OR audit gap detected
**Impact:** HIPAA compliance violation - cannot prove PHI access controls
**MTTR Target:** < 15 minutes

---

## ⚠️ CRITICAL: HIPAA COMPLIANCE RISK

**HIPAA §164.312(b) requires:**
> "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."

**If audit logs are not being written:**
- Cannot prove compliance with minimum necessary standard
- Cannot detect unauthorized PHI access
- Cannot investigate security incidents
- Potential HIPAA violation if not resolved quickly

**Regulatory Exposure:** HHS may impose penalties for inadequate audit controls

---

## Immediate Actions (0-5 min)

### 1. Acknowledge Alert

- [ ] Acknowledge PagerDuty alert
- [ ] Post in Slack `#incidents`: "Acknowledged AUDIT_LOG_FAILURE - investigating"
- [ ] Note current time: ____________
- [ ] **Document audit gap start:** ____________ (for compliance)

### 2. Assess Scope

**Quick check:**
```bash
# Check if ANY audit logs are being written
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
SELECT
  COUNT(*) as recent_logs,
  MAX(timestamp) as last_log
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '5 minutes';
EOF
```

**Interpretation:**

| Result | Diagnosis | Severity |
|--------|-----------|----------|
| recent_logs = 0 | Complete audit failure | CRITICAL |
| recent_logs < 10 | Partial failure or low activity | HIGH |
| recent_logs > 10 | False alarm or intermittent issue | MEDIUM |
| last_log > 5 min ago | Audit writes stopped | CRITICAL |

### 3. Check Application Health

**Health check:**
```bash
curl https://holilabs.xyz/api/health | jq '.checks.audit'
# Expected: "active" or "healthy"
# If "failing": Audit system is down
```

**Recent errors:**
```bash
# Check Sentry for audit-related errors
# Look for: "Failed to create audit log", "Prisma timeout", "Database connection"
```

---

## Triage (5-15 min)

### 4. Identify Failure Point

**Test audit log creation directly:**
```bash
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
-- Try to insert test audit log
INSERT INTO "AuditLog" (
  id, "userId", "userEmail", "ipAddress",
  action, resource, "resourceId", success, timestamp
) VALUES (
  gen_random_uuid()::text,
  'test-user',
  'test@holilabs.xyz',
  '127.0.0.1',
  'READ',
  'TEST',
  'test-resource',
  true,
  NOW()
);
EOF
```

**Possible outcomes:**

| Result | Root Cause | Action |
|--------|-----------|--------|
| INSERT successful | Application-level issue | → Step 5 |
| `disk full` error | Database storage exhausted | → Step 6 |
| `connection timeout` | Database overloaded | → DATABASE_FAILURE runbook |
| `permission denied` | User permissions issue | → Step 7 |
| `table does not exist` | Schema corruption | → Step 8 (CRITICAL) |

### 5. Check Application-Level Audit Code

**Review recent deployments:**
```bash
# Check if recent deploy broke audit logging
git log --since="2 hours ago" --grep="audit" --all

# Look for changes to:
# - /apps/web/src/lib/audit.ts
# - /apps/web/src/lib/api/middleware.ts
```

**Check application logs:**
```bash
doctl apps logs $APP_ID --type run | grep -i "audit" | tail -50

# Look for:
# - "Failed to create audit log"
# - "Prisma timeout"
# - "Transaction rollback"
# - "Unique constraint violation"
```

**Common issues:**
- Transaction rollback rolling back audit logs
- Audit log creation wrapped in try-catch that swallows errors
- Prisma connection pool exhausted
- Audit log table locked by long-running query

### 6. Check Database Storage

**Disk usage:**
```bash
doctl databases get $DB_CLUSTER_ID --format DiskUsedPercent
# Alert if > 85%
```

**AuditLog table size:**
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('AuditLog')) as table_size,
  pg_size_pretty(pg_total_relation_size('AuditLog_pkey')) as index_size;
```

**If disk full:** Immediate cleanup required (see Step 9)

### 7. Check Database Permissions

**Verify user permissions:**
```sql
-- Check if audit log user has INSERT permission
SELECT has_table_privilege('holi', 'AuditLog', 'INSERT');
-- Expected: t (true)
```

**Check table constraints:**
```sql
-- Check for conflicting constraints
\d "AuditLog"
-- Look for: NOT NULL constraints, UNIQUE constraints that might cause failures
```

### 8. Check Schema Integrity

**Verify AuditLog table exists:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'AuditLog'
);
-- Expected: t (true)
```

**Verify columns:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'AuditLog'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (text, NO)
- userId (text, YES)
- userEmail (text, NO)
- ipAddress (text, NO)
- action (enum, NO)
- resource (text, NO)
- resourceId (text, NO)
- details (jsonb, YES)
- success (boolean, NO)
- timestamp (timestamp, NO)

**If table missing or corrupted:** → Step 10 (CRITICAL)

---

## Resolution Steps

### 9. Clear Disk Space (if disk full)

**Archive old audit logs:**
```bash
# Export old logs (> 90 days) to S3
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
\copy (
  SELECT * FROM "AuditLog"
  WHERE timestamp < NOW() - INTERVAL '90 days'
) TO '/tmp/old-audit-logs-$(date +%Y%m%d).csv' CSV HEADER;
EOF

# Encrypt and upload
gpg --encrypt --recipient compliance@holilabs.xyz /tmp/old-audit-logs-*.csv
aws s3 cp /tmp/old-audit-logs-*.csv.gpg s3://holilabs-archives/audit-logs/

# Delete old records (ONLY after successful upload)
psql -c "DELETE FROM \"AuditLog\" WHERE timestamp < NOW() - INTERVAL '90 days';"

# Vacuum table to reclaim space
psql -c "VACUUM FULL VERBOSE \"AuditLog\";"
```

**Verify space freed:**
```bash
doctl databases get $DB_CLUSTER_ID --format DiskUsedPercent
# Should be < 75% after cleanup
```

### 10. Recreate AuditLog Table (⚠️ LAST RESORT)

**⚠️ WARNING:** Only if table is corrupted or missing

**Backup existing data first:**
```sql
-- Create backup table
CREATE TABLE "AuditLog_backup" AS SELECT * FROM "AuditLog";

-- Verify backup
SELECT COUNT(*) FROM "AuditLog_backup";
```

**Recreate table:**
```bash
# Apply Prisma migration
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
DATABASE_URL="$PRODUCTION_DB_URL" npx prisma db push --accept-data-loss

# Verify table recreated
psql -c "\d \"AuditLog\""
```

**Restore data if needed:**
```sql
INSERT INTO "AuditLog" SELECT * FROM "AuditLog_backup";
```

### 11. Fix Application Code (if code issue)

**Rollback to last known good deployment:**
```bash
# Find last deployment before audit logs stopped
doctl apps list-deployments $APP_ID

# Rollback
doctl apps rollback $APP_ID --deployment-id <last-good-deployment>
```

**Or deploy hotfix:**
```bash
# Fix audit logging code
git checkout -b hotfix/audit-logging
# ... make fixes ...
git commit -m "Hotfix: Restore audit logging"
git push origin hotfix/audit-logging

# Emergency deploy
gh workflow run deploy-production.yml --ref hotfix/audit-logging
```

### 12. Restart Application (if connection issue)

```bash
# Restart all application instances
doctl apps create-deployment $APP_ID

# Monitor logs for audit log writes
doctl apps logs $APP_ID --type run --follow | grep -i "audit"
```

---

## Verification (15-20 min)

### 13. Verify Audit Logs Resuming

**Test audit log creation:**
```bash
# Make authenticated request to trigger audit log
curl -X POST https://holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \

# Wait 10 seconds for async audit log write

# Check if audit log was created
psql -c "SELECT * FROM \"AuditLog\" ORDER BY timestamp DESC LIMIT 5;"
# Should see recent LOGIN_FAILED entry
```

**Monitor audit log rate:**
```bash
watch -n 5 'psql -t -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE timestamp > NOW() - INTERVAL '\''1 minute'\'';"'
# Should see increasing count
```

**Expected rate:**
- Development: 1-10 logs/minute
- Staging: 10-50 logs/minute
- Production: 50-500 logs/minute (depending on traffic)

### 14. Verify No Audit Gap

**Check for gaps in audit trail:**
```sql
-- Find gaps > 5 minutes
SELECT
  timestamp as gap_start,
  LEAD(timestamp) OVER (ORDER BY timestamp) as gap_end,
  LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp as gap_duration
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC
LIMIT 20;
```

**Document any gaps:**
- Gap start: ____________
- Gap end: ____________
- Duration: ____________ minutes
- Explanation: ____________

**File gap report:** `/docs/incidents/YYYY-MM-DD-audit-gap.md`

### 15. Test All Audit-Triggering Operations

**Critical operations to test:**
```bash
# 1. Patient access
curl -H "Cookie: $SESSION" https://holilabs.xyz/api/patients/123

# 2. Patient creation
curl -X POST -H "Cookie: $SESSION" https://holilabs.xyz/api/patients \
  -d '{"firstName":"Test","lastName":"Patient",...}'

# 3. Prescription creation
curl -X POST -H "Cookie: $SESSION" https://holilabs.xyz/api/prescriptions \
  -d '{...}'

# 4. Data export
curl -X POST -H "Cookie: $SESSION" https://holilabs.xyz/api/patients/export \
  -d '{"format":"csv"}'

# 5. User login
curl -X POST https://holilabs.xyz/api/auth/login -d '{...}'
```

**Verify each creates audit log entry:**
```sql
SELECT action, resource, success, timestamp
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC;
```

**Expected results:**
- READ Patient
- CREATE Patient
- CREATE Prescription
- EXPORT Patient
- LOGIN

---

## Communication

### Internal

**Slack `#incidents` updates:**

**Initial post (0-2 min):**
```
🚨 CRITICAL: HIPAA Audit Log Failure
Status: Investigating
Impact: Audit logs not being written (HIPAA compliance risk)
Audit gap started: [timestamp]
Updates: Every 5 minutes
```

**Progress updates:**
```
⏳ UPDATE: Audit Log Failure - 10 min elapsed
Status: [Root cause identified / Still investigating]
Audit gap duration: [X minutes]
Action: [Current step]
ETA: [Updated estimate]
```

**Resolution post:**
```
✅ RESOLVED: Audit Log Failure
Duration: 12 minutes
Audit gap: [start] to [end] ([X] minutes total)
Root cause: [Brief explanation]
Compliance impact: [Assessment]
Gap documentation: [Link to report]
Post-mortem: Scheduled for [time]
```

---

### Compliance Team

**Notify Privacy Officer immediately:**

**Email template:**
```
Subject: URGENT: Audit Log Failure - HIPAA Compliance Impact

Privacy Officer,

We experienced a failure in our audit logging system:

- Gap start: [timestamp]
- Gap end: [timestamp]
- Duration: [X minutes]
- Root cause: [Brief explanation]
- Resolution: [What was done]

During this gap, we cannot definitively prove:
- Who accessed PHI
- What PHI was accessed
- Access reasons provided
- Compliance with minimum necessary standard

Compensating controls in place:
- [List any other logging mechanisms]
- [Session logs, load balancer logs, etc.]

Actions taken:
- [Resolution steps]
- [Prevention measures]

Gap report: /docs/incidents/YYYY-MM-DD-audit-gap.md

Please assess compliance impact and determine if HHS notification required.

[Your name]
[Title]
```

---

## Post-Incident (24-48 hours)

### 16. Compliance Impact Assessment

**Determine regulatory exposure:**

| Factor | Assessment | Impact |
|--------|------------|--------|
| Gap duration | [X minutes] | Low < 5 min / Medium 5-30 min / High > 30 min |
| PHI access during gap | [Estimated count] | Low < 10 / Medium 10-100 / High > 100 |
| Compensating controls | [Yes/No - describe] | Reduces risk if yes |
| Previous gaps | [Count in last 12 months] | Pattern indicates systemic issue |

**Recommended actions:**
- [ ] Document in HIPAA compliance log
- [ ] Update risk assessment
- [ ] Implement additional monitoring
- [ ] Consider HHS notification if gap > 24 hours or recurring

### 17. Gap Reconstruction

**Attempt to reconstruct audit trail from other sources:**

**Application logs:**
```bash
# Extract API access from application logs
doctl apps logs $APP_ID --type run > /tmp/app-logs-gap-period.log

# Parse for PHI access patterns
grep -E "GET /api/patients|POST /api/patients|GET /api/prescriptions" /tmp/app-logs-gap-period.log
```

**Load balancer logs:**
```bash
# If using load balancer, extract access logs
# (DigitalOcean Load Balancer doesn't provide this - need CloudFlare or similar)
```

**Database query logs:**
```bash
# If pg_stat_statements enabled
psql -c "SELECT * FROM pg_stat_statements WHERE query LIKE '%Patient%';"
```

**Document reconstructed activity:**
```markdown
# Audit Gap Reconstruction

**Gap Period:** [start] to [end]

## Reconstructed Activity

Based on application logs, during the gap period:
- Estimated API requests: [count]
- Patient access attempts: [count]
- User sessions active: [count]

## Limitations

Unable to definitively determine:
- Access reasons provided
- Exact PHI records accessed
- User actions within sessions

## Compensating Controls

- Application logs preserved
- Database query patterns analyzed
- Session management logs available
```

### 18. Prevention Measures

**Immediate actions:**
- [ ] Add monitoring alert for audit log write failures
- [ ] Implement health check for audit logging
- [ ] Add alert for audit log count drops
- [ ] Document in incident playbook

**Long-term improvements:**
- [ ] Implement redundant audit logging (dual-write to S3)
- [ ] Add circuit breaker for audit failures
- [ ] Implement audit log buffering
- [ ] Automated disk space management

**Code improvements:**
```typescript
// Example: Redundant audit logging
async function createAuditLog(data: AuditLogData) {
  try {
    // Primary: Database
    await prisma.auditLog.create({ data });
  } catch (dbError) {
    logger.error('Database audit log failed', dbError);

    // Fallback: S3
    await s3.putObject({
      Bucket: 'holilabs-audit-logs',
      Key: `fallback/${Date.now()}-${randomUUID()}.json`,
      Body: JSON.stringify(data),
    });

    // Alert on fallback usage
    await alerting.send('Audit log using fallback storage');
  }
}
```

### 19. Update Monitoring

**Add new Prometheus alerts:**

```yaml
# /infra/monitoring/prometheus-alerts.yaml

- alert: AuditLogWriteFailure
  expr: rate(audit_log_errors_total[5m]) > 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Audit log writes are failing"

- alert: AuditLogCountDrop
  expr: rate(audit_log_count[5m]) < 0.5 * rate(audit_log_count[30m] offset 24h)
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Audit log rate has dropped significantly"

- alert: AuditLogDiskFull
  expr: database_disk_usage_percent > 85
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "Database disk is > 85% full - audit logs at risk"
```

**Add health check:**
```typescript
// /apps/web/src/app/api/health/route.ts

export async function GET() {
  // ... existing health checks ...

  // Audit log health check
  const recentAuditLogs = await prisma.auditLog.count({
    where: { timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) } }
  });

  const auditHealthy = recentAuditLogs > 0;

  return NextResponse.json({
    status: auditHealthy ? 'healthy' : 'degraded',
    checks: {
      // ... other checks ...
      audit: auditHealthy ? 'active' : 'failing',
      auditLogCount: recentAuditLogs,
    },
  });
}
```

---

## Escalation

**If not resolved in 15 minutes:**
- [ ] Escalate to Senior Engineer
- [ ] Notify Privacy Officer
- [ ] Consider disabling PHI access until audit restored

**If gap > 30 minutes:**
- [ ] Notify CISO / Security Officer
- [ ] Activate incident response team
- [ ] Prepare compliance report for HHS (if required)

**If gap > 24 hours:**
- [ ] Mandatory HHS notification likely required
- [ ] Engage external compliance counsel
- [ ] Prepare breach assessment

---

## Related Runbooks

- [DATABASE_FAILURE.md](./DATABASE_FAILURE.md) - If database is root cause
- [API_SERVER_DOWN.md](./API_SERVER_DOWN.md) - If application is down
- [SECURITY_INCIDENT.md](./SECURITY_INCIDENT.md) - If audit tampering suspected

---

## Quick Reference

**Critical Commands:**
```bash
# Check recent audit logs
psql -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE timestamp > NOW() - INTERVAL '5 minutes';"

# Test audit log creation
psql -c "INSERT INTO \"AuditLog\" (id, \"userId\", \"userEmail\", \"ipAddress\", action, resource, \"resourceId\", success, timestamp) VALUES (gen_random_uuid()::text, 'test', 'test@test.com', '127.0.0.1', 'READ', 'TEST', 'test', true, NOW());"

# Check disk space
doctl databases get $DB_CLUSTER_ID --format DiskUsedPercent

# Archive old logs
psql -c "\copy (SELECT * FROM \"AuditLog\" WHERE timestamp < NOW() - INTERVAL '90 days') TO '/tmp/old-audit-logs.csv' CSV HEADER"

# Restart application
doctl apps create-deployment $APP_ID
```

**Key Metrics:**
- Audit log rate: 50-500/min (production)
- Disk usage: < 85%
- Gap tolerance: < 5 minutes
- Resolution target: < 15 minutes

**Emergency Contacts:**
- Privacy Officer: [contact]
- Security Officer: [contact]
- Compliance Counsel: [contact]

---

**Last Updated:** 2026-01-01
**Next Review:** 2026-04-01
**Owner:** Compliance & Platform Engineering Teams
