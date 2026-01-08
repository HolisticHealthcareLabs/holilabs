# Runbook: Audit Log Review

**Severity:** Medium (P2) - Compliance requirement
**Expected Resolution Time:** 30-60 minutes (per review)
**On-Call Required:** No (scheduled reviews), Yes (if anomalies detected)

⚠️ **HIPAA COMPLIANCE CRITICAL**: Regular audit log review is required by HIPAA §164.308(a)(1)(ii)(D)

---

## Review Schedule

### Frequency
- **Daily**: Automated anomaly detection
- **Weekly**: Security team reviews suspicious activities
- **Monthly**: Comprehensive compliance review
- **Quarterly**: Executive summary report
- **On-Demand**: Security incident investigation

---

## Daily Automated Review (10 Minutes)

### 1. Run Automated Anomaly Detection
```bash
# Script: scripts/audit-daily-review.sh
#!/bin/bash

echo "=== Daily Audit Log Review: $(date) ==="

# Database connection
DB_HOST="your-db-host"
DB_USER="holi"
DB_NAME="holi_protocol"

# 1. Check for failed access attempts (>10 failures by same user)
echo "Checking for excessive failed access attempts..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    COUNT(*) AS failed_attempts,
    array_agg(DISTINCT resource) AS resources_attempted
  FROM \"AuditLog\"
  WHERE action = 'READ'
  AND success = false
  AND timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY \"userId\"
  HAVING COUNT(*) > 10
  ORDER BY failed_attempts DESC;
"

# 2. Check for bulk data access (>100 records in 1 hour)
echo "Checking for bulk data access..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    resource,
    COUNT(*) AS access_count,
    COUNT(DISTINCT \"resourceId\") AS unique_records
  FROM \"AuditLog\"
  WHERE action = 'READ'
  AND resource IN ('Patient', 'Appointment', 'Prescription')
  AND timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY \"userId\", resource
  HAVING COUNT(*) > 100
  ORDER BY access_count DESC;
"

# 3. Check for access from unusual locations
echo "Checking for access from unusual IP addresses..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    \"ipAddress\",
    COUNT(*) AS access_count,
    array_agg(DISTINCT resource) AS resources
  FROM \"AuditLog\"
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND \"ipAddress\" NOT IN (
    -- Known office IPs
    '203.0.113.0',
    '198.51.100.0'
  )
  AND \"ipAddress\" !~ '^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)'
  GROUP BY \"userId\", \"ipAddress\"
  HAVING COUNT(*) > 50
  ORDER BY access_count DESC;
"

# 4. Check for after-hours access (outside 8 AM - 8 PM)
echo "Checking for after-hours access..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    resource,
    COUNT(*) AS access_count,
    MIN(timestamp) AS first_access,
    MAX(timestamp) AS last_access
  FROM \"AuditLog\"
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 8 AND 20
  AND action IN ('READ', 'UPDATE', 'DELETE')
  GROUP BY \"userId\", resource
  HAVING COUNT(*) > 20
  ORDER BY access_count DESC;
"

# 5. Check for administrative actions
echo "Checking for administrative actions..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    \"userId\",
    action,
    resource,
    COUNT(*) AS action_count
  FROM \"AuditLog\"
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND action IN ('DELETE', 'ADMIN_ACTION')
  GROUP BY \"userId\", action, resource
  ORDER BY action_count DESC;
"

echo "=== Daily review complete ==="
```

### 2. Run Daily Review Script
```bash
# Execute daily review
chmod +x scripts/audit-daily-review.sh
./scripts/audit-daily-review.sh > /tmp/audit-daily-$(date +%Y%m%d).txt

# Email results to security team
mail -s "Daily Audit Log Review: $(date +%Y-%m-%d)" \
  security@holilabs.xyz < /tmp/audit-daily-$(date +%Y%m%d).txt
```

### 3. Review Output
```markdown
**Expected Output:** No suspicious activities

**If Anomalies Found:**
- Investigate immediately (see Investigation Procedures below)
- Contact user to verify legitimate access
- Lock account if suspicious
- Escalate to security team
```

---

## Weekly Security Review (30 Minutes)

### 1. Check Access Reason Compliance
```sql
-- Verify all PHI access has documented reasons (LGPD compliance)
SELECT
  "userId",
  resource,
  COUNT(*) AS total_access,
  COUNT(*) FILTER (WHERE details->>'accessReason' IS NULL) AS missing_reason,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE details->>'accessReason' IS NULL) / COUNT(*),
    2
  ) AS missing_reason_percentage
FROM "AuditLog"
WHERE resource IN ('Patient', 'Appointment', 'Prescription', 'LabResult')
AND action = 'READ'
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY "userId", resource
HAVING COUNT(*) FILTER (WHERE details->>'accessReason' IS NULL) > 0
ORDER BY missing_reason_percentage DESC;
```

**Expected Result:** 0% missing reasons

**If Missing Reasons Found:**
- Identify users with missing access reasons
- Send reminder email about compliance requirement
- Investigate if systematic issue in application code

### 2. Check Access Grant Activity
```sql
-- Review data access grants created/revoked
SELECT
  "userId",
  action,
  resource,
  details->>'grantedTo' AS granted_to_user,
  details->>'accessType' AS access_type,
  COUNT(*) AS grant_actions
FROM "AuditLog"
WHERE resource = 'DataAccessGrant'
AND action IN ('CREATE', 'DELETE')
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY "userId", action, resource, details->>'grantedTo', details->>'accessType'
ORDER BY grant_actions DESC;
```

**Review for:**
- Unusual number of grants (>50 per week)
- Grants to external users
- Revocations (may indicate security concern)

### 3. Check Password Reset Activity
```sql
-- Monitor password reset patterns
SELECT
  "userId",
  "ipAddress",
  COUNT(*) AS reset_attempts,
  array_agg(timestamp ORDER BY timestamp DESC) AS attempt_times
FROM "AuditLog"
WHERE action = 'PASSWORD_RESET'
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY "userId", "ipAddress"
HAVING COUNT(*) > 3
ORDER BY reset_attempts DESC;
```

**Review for:**
- Multiple reset attempts from same IP (brute force?)
- Multiple reset attempts for admin accounts
- Unusual timing (e.g., all within 5 minutes)

### 4. Check Failed Authentication Attempts
```sql
-- Identify potential brute force attacks
SELECT
  "ipAddress",
  details->>'email' AS attempted_email,
  COUNT(*) AS failed_attempts,
  MIN(timestamp) AS first_attempt,
  MAX(timestamp) AS last_attempt
FROM "AuditLog"
WHERE action = 'LOGIN'
AND success = false
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY "ipAddress", details->>'email'
HAVING COUNT(*) > 20
ORDER BY failed_attempts DESC;
```

**Action Required:**
- Block IPs with >100 failed attempts
- Notify users if their accounts were targeted
- Enable MFA for targeted accounts

---

## Monthly Compliance Review (60 Minutes)

### 1. Executive Summary Report
```sql
-- Generate monthly audit statistics
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE action = 'READ') AS read_events,
  COUNT(*) FILTER (WHERE action = 'CREATE') AS create_events,
  COUNT(*) FILTER (WHERE action = 'UPDATE') AS update_events,
  COUNT(*) FILTER (WHERE action = 'DELETE') AS delete_events,
  COUNT(*) FILTER (WHERE success = false) AS failed_events,
  COUNT(DISTINCT "userId") AS unique_users,
  COUNT(DISTINCT "ipAddress") AS unique_ips
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;
```

### 2. User Access Patterns
```sql
-- Top users by access volume
SELECT
  u.id,
  u.email,
  u.role,
  COUNT(*) AS total_access,
  COUNT(*) FILTER (WHERE a.resource = 'Patient') AS patient_access,
  COUNT(*) FILTER (WHERE a.action = 'READ') AS read_access,
  COUNT(*) FILTER (WHERE a.action IN ('UPDATE', 'DELETE')) AS write_access,
  COUNT(DISTINCT a."resourceId") AS unique_records_accessed
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE a.timestamp > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.role
ORDER BY total_access DESC
LIMIT 50;
```

**Review for:**
- Users with disproportionate access (outliers)
- Non-clinical staff accessing patient data
- Inactive users with recent access

### 3. Resource Access Breakdown
```sql
-- Most accessed resources
SELECT
  resource,
  action,
  COUNT(*) AS access_count,
  COUNT(DISTINCT "userId") AS unique_users,
  COUNT(DISTINCT "resourceId") AS unique_records
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days'
AND resource IN ('Patient', 'Appointment', 'Prescription', 'LabResult', 'Invoice')
GROUP BY resource, action
ORDER BY resource, access_count DESC;
```

### 4. PHI Access Summary (HIPAA Required)
```sql
-- PHI access summary for compliance reporting
SELECT
  u.role,
  COUNT(DISTINCT a."userId") AS unique_users,
  COUNT(*) AS total_phi_access,
  COUNT(DISTINCT a."resourceId") AS unique_patients_accessed,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (a.timestamp - LAG(a.timestamp) OVER (PARTITION BY a."userId" ORDER BY a.timestamp)))
  ) / 60, 2) AS avg_minutes_between_access
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE a.timestamp > NOW() - INTERVAL '30 days'
AND a.resource IN ('Patient', 'Appointment', 'Prescription', 'LabResult')
AND a.action = 'READ'
GROUP BY u.role
ORDER BY total_phi_access DESC;
```

### 5. Compliance Violations
```sql
-- Identify potential compliance violations
-- 1. Access without documented reason (LGPD violation)
SELECT
  'Missing Access Reason' AS violation_type,
  COUNT(*) AS violation_count,
  array_agg(DISTINCT "userId") AS violating_users
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days'
AND resource IN ('Patient', 'Appointment', 'Prescription')
AND action = 'READ'
AND (details->>'accessReason' IS NULL OR details->>'accessReason' = '');

-- 2. Access without valid data access grant
SELECT
  'No Valid Access Grant' AS violation_type,
  COUNT(*) AS violation_count
FROM "AuditLog" a
WHERE a.timestamp > NOW() - INTERVAL '30 days'
AND a.resource = 'Patient'
AND a.action IN ('READ', 'UPDATE')
AND NOT EXISTS (
  SELECT 1 FROM "DataAccessGrant" dag
  WHERE dag."userId" = a."userId"
  AND dag."patientId" = a."resourceId"
  AND dag."grantedAt" <= a.timestamp
  AND (dag."expiresAt" IS NULL OR dag."expiresAt" > a.timestamp)
);

-- 3. Access outside normal business hours without justification
SELECT
  'After-Hours Access' AS violation_type,
  COUNT(*) AS violation_count
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days'
AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
AND EXTRACT(DOW FROM timestamp) NOT IN (0, 6) -- Not weekend
AND (details->>'accessReason' NOT ILIKE '%emergency%' OR details->>'accessReason' IS NULL);
```

---

## Investigation Procedures

### Scenario 1: Suspicious Bulk Access

**Symptoms:**
- User accessed >100 patient records in 1 hour
- No documented reason for bulk access

**Investigation Steps:**
```sql
-- 1. Get detailed access log for user
SELECT
  timestamp,
  resource,
  "resourceId",
  action,
  details->>'accessReason' AS reason,
  "ipAddress",
  "userAgent"
FROM "AuditLog"
WHERE "userId" = '<suspicious-user-id>'
AND timestamp BETWEEN '<start-time>' AND '<end-time>'
ORDER BY timestamp ASC;

-- 2. Check if user has bulk export permission
SELECT
  u.email,
  u.role,
  u."permissions"
FROM "User" u
WHERE u.id = '<suspicious-user-id>';

-- 3. Check if patients accessed have relationship to user
SELECT
  a."resourceId" AS patient_id,
  p."firstName",
  p."lastName",
  dag."accessType",
  dag."grantedBy"
FROM "AuditLog" a
JOIN "Patient" p ON a."resourceId" = p.id
LEFT JOIN "DataAccessGrant" dag
  ON dag."patientId" = p.id
  AND dag."userId" = a."userId"
WHERE a."userId" = '<suspicious-user-id>'
AND a.timestamp BETWEEN '<start-time>' AND '<end-time>'
LIMIT 20;
```

**Action Required:**
```bash
# If suspicious:
# 1. Lock user account immediately
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE \"User\"
  SET \"accountLocked\" = true,
      \"lockReason\" = 'Suspicious bulk access detected - under investigation'
  WHERE id = '<user-id>';
"

# 2. Invalidate all sessions
redis-cli DEL "session:user:<user-id>:*"

# 3. Contact user directly (phone call, not email)
# Verify if access was legitimate

# 4. If confirmed unauthorized, follow Security Incident Response runbook
```

---

### Scenario 2: Access from Unusual Location

**Symptoms:**
- User accessed system from IP not in known ranges
- User accessed from foreign country

**Investigation Steps:**
```sql
-- 1. Get all recent access from user
SELECT
  timestamp,
  "ipAddress",
  resource,
  action,
  "userAgent"
FROM "AuditLog"
WHERE "userId" = '<user-id>'
AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- 2. Compare with user's historical IP addresses
SELECT
  "ipAddress",
  COUNT(*) AS access_count,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM "AuditLog"
WHERE "userId" = '<user-id>'
AND timestamp > NOW() - INTERVAL '90 days'
GROUP BY "ipAddress"
ORDER BY access_count DESC;
```

**GeoIP Lookup:**
```bash
# Install geoip tool
sudo apt-get install geoip-bin

# Lookup IP address
geoiplookup <ip-address>

# Expected: Same country/city as user's office location
# If different country: HIGH RISK
```

**Action Required:**
```bash
# 1. If IP from foreign country or VPN:
# Lock account and require MFA verification

# 2. Contact user to verify
# "We detected access from [Location]. Was this you?"

# 3. If confirmed unauthorized:
# - Force password reset
# - Review all actions taken during session
# - Follow Security Incident Response runbook
```

---

### Scenario 3: Data Export Activity

**Symptoms:**
- User exported patient data
- Large FHIR export or CSV download

**Investigation Steps:**
```sql
-- 1. Get export details
SELECT
  timestamp,
  "userId",
  resource,
  action,
  details->>'format' AS export_format,
  details->>'recordCount' AS record_count,
  details->>'deidentified' AS was_deidentified,
  details->>'supervisorApproval' AS supervisor_id
FROM "AuditLog"
WHERE action = 'EXPORT'
AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- 2. Verify supervisor approval (required for >100 records)
SELECT
  e.timestamp AS export_time,
  e."userId" AS exporter_id,
  u1.email AS exporter_email,
  e.details->>'supervisorApproval' AS supervisor_id,
  u2.email AS supervisor_email,
  e.details->>'recordCount' AS records_exported
FROM "AuditLog" e
JOIN "User" u1 ON e."userId" = u1.id
LEFT JOIN "User" u2 ON (e.details->>'supervisorApproval')::uuid = u2.id
WHERE e.action = 'EXPORT'
AND (e.details->>'recordCount')::int > 100
AND e.timestamp > NOW() - INTERVAL '7 days';

-- 3. Check if exported data was de-identified
SELECT
  "userId",
  details->>'deidentified' AS was_deidentified,
  details->>'recordCount' AS record_count,
  COUNT(*) AS export_count
FROM "AuditLog"
WHERE action = 'EXPORT'
AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY "userId", details->>'deidentified', details->>'recordCount'
ORDER BY (details->>'recordCount')::int DESC;
```

**Review Checklist:**
- [ ] Export had supervisor approval (if >100 records)
- [ ] Data was de-identified (if for research/analysis)
- [ ] User has export permission in their role
- [ ] Export purpose documented in accessReason

---

### Scenario 4: Administrative Actions

**Symptoms:**
- User performed DELETE operations
- User modified access grants
- User changed user roles

**Investigation Steps:**
```sql
-- 1. Get all administrative actions
SELECT
  a.timestamp,
  a."userId",
  u.email,
  u.role AS user_role,
  a.action,
  a.resource,
  a."resourceId",
  a.details
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE a.action IN ('DELETE', 'ADMIN_ACTION', 'ROLE_CHANGE')
AND a.timestamp > NOW() - INTERVAL '7 days'
ORDER BY a.timestamp DESC;

-- 2. Verify user has admin permissions
SELECT
  id,
  email,
  role,
  "permissions"
FROM "User"
WHERE id = '<user-id>';

-- 3. Check what was deleted
SELECT
  timestamp,
  resource,
  "resourceId",
  details->>'reason' AS deletion_reason,
  details->>'deletedData' AS deleted_data
FROM "AuditLog"
WHERE action = 'DELETE'
AND "userId" = '<user-id>'
ORDER BY timestamp DESC;
```

**Review for:**
- Was deletion justified?
- Was proper approval obtained?
- Can deletion be reversed if needed?

---

## Compliance Reports

### HIPAA Audit Log Report (Required)
```sql
-- Generate HIPAA-compliant audit report
SELECT
  DATE_TRUNC('month', timestamp) AS month,
  COUNT(*) FILTER (WHERE resource IN ('Patient', 'Appointment', 'Prescription', 'LabResult')) AS phi_access_events,
  COUNT(DISTINCT "userId") AS unique_users_accessing_phi,
  COUNT(DISTINCT "resourceId") AS unique_patients_accessed,
  COUNT(*) FILTER (WHERE action = 'READ') AS read_operations,
  COUNT(*) FILTER (WHERE action IN ('CREATE', 'UPDATE')) AS write_operations,
  COUNT(*) FILTER (WHERE action = 'DELETE') AS delete_operations,
  COUNT(*) FILTER (WHERE success = false) AS failed_access_attempts,
  COUNT(*) FILTER (WHERE details->>'accessReason' IS NULL) AS missing_access_reason
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC;
```

Export to PDF for compliance documentation:
```bash
# Export report
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "COPY (<query>) TO STDOUT CSV HEADER" > /tmp/hipaa-audit-report.csv

# Convert to PDF (requires wkhtmltopdf)
python3 scripts/generate-hipaa-report.py /tmp/hipaa-audit-report.csv /tmp/hipaa-audit-report.pdf

# Archive report
aws s3 cp /tmp/hipaa-audit-report.pdf \
  s3://holi-compliance-reports/hipaa-audit/$(date +%Y-%m)/
```

---

## Automated Monitoring Alerts

### Set Up Prometheus Alerts
```yaml
# File: infra/monitoring/audit-alerts.yml
groups:
  - name: audit_log_alerts
    interval: 5m
    rules:
      - alert: ExcessiveFailedAccessAttempts
        expr: sum(rate(audit_log_failed_access_total[5m])) by (user_id) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "User {{ $labels.user_id }} has high failed access rate"
          description: "{{ $value }} failed access attempts per second"

      - alert: BulkDataAccess
        expr: sum(rate(audit_log_read_total{resource="Patient"}[1h])) by (user_id) > 100
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "User {{ $labels.user_id }} accessing large volume of patient data"

      - alert: UnusualIPAccess
        expr: count(audit_log_access_by_ip{ip!~"(203\\.0\\.113\\..*|198\\.51\\.100\\..*)"}) by (user_id, ip) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Access from unusual IP: {{ $labels.ip }} by user {{ $labels.user_id }}"

      - alert: AfterHoursAccess
        expr: sum(audit_log_access_after_hours_total) by (user_id) > 50
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "Significant after-hours access by user {{ $labels.user_id }}"
```

---

## Retention & Archival

### Archive Old Audit Logs
```bash
# Daily archival (automated via cron)
# See: /apps/web/src/lib/jobs/audit-archival.ts

# Verify archival is running
redis-cli LLEN bull:audit-archival:completed

# Check last archival
ls -lh /var/audits/archives/ | tail -5

# Verify HIPAA compliance (6-year retention)
find /var/audits/archives/ -name "*.gz" -mtime +2190 | wc -l
# Should be 0 (no files older than 6 years)
```

---

## Related Runbooks
- [Security Incident Response](./security-incident-response.md)
- [HIPAA Breach Notification](./hipaa-breach-notification.md)

---

## Changelog
- **2024-01-07**: Initial version created
