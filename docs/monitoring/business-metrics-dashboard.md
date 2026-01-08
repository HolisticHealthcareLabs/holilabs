# Business Metrics Dashboard

**Purpose:** Track key business and operational metrics for the Holi Labs EMR platform.

**Tools:** Grafana + PostgreSQL + Prometheus

---

## Overview

Business metrics provide insights into:
- **User Activity**: Active users, logins, session duration
- **Clinical Operations**: Appointments, prescriptions, patient registrations
- **System Health**: Error rates, email delivery, API performance
- **Compliance**: Audit log coverage, access patterns, HIPAA metrics

---

## Dashboard Sections

### 1. Executive Summary (Top-Level KPIs)

**Metrics:**
- Total active users (last 30 days)
- Total patients in system
- Appointments this month
- Prescriptions issued this month
- System uptime (%)
- Average API response time

```sql
-- Query: Active Users Last 30 Days
SELECT COUNT(DISTINCT "userId") AS active_users
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Query: Total Patients
SELECT COUNT(*) AS total_patients
FROM "Patient"
WHERE "deletedAt" IS NULL;

-- Query: Appointments This Month
SELECT COUNT(*) AS appointments_this_month
FROM "Appointment"
WHERE "createdAt" >= DATE_TRUNC('month', NOW());

-- Query: Prescriptions This Month
SELECT COUNT(*) AS prescriptions_this_month
FROM "Prescription"
WHERE "createdAt" >= DATE_TRUNC('month', NOW());
```

**Grafana Panel Configuration:**
```json
{
  "title": "Executive Summary",
  "panels": [
    {
      "title": "Active Users (30 days)",
      "type": "stat",
      "targets": [{
        "rawSql": "SELECT COUNT(DISTINCT \"userId\") FROM \"AuditLog\" WHERE timestamp > NOW() - INTERVAL '30 days'"
      }],
      "fieldConfig": {
        "defaults": {
          "color": {"mode": "thresholds"},
          "thresholds": {
            "steps": [
              {"value": 0, "color": "red"},
              {"value": 10, "color": "yellow"},
              {"value": 50, "color": "green"}
            ]
          }
        }
      }
    },
    {
      "title": "Total Patients",
      "type": "stat",
      "targets": [{
        "rawSql": "SELECT COUNT(*) FROM \"Patient\" WHERE \"deletedAt\" IS NULL"
      }]
    },
    {
      "title": "Appointments (This Month)",
      "type": "stat",
      "targets": [{
        "rawSql": "SELECT COUNT(*) FROM \"Appointment\" WHERE \"createdAt\" >= DATE_TRUNC('month', NOW())"
      }]
    },
    {
      "title": "System Uptime",
      "type": "gauge",
      "targets": [{
        "expr": "avg_over_time(up{job=\"holi-api\"}[30d]) * 100"
      }],
      "fieldConfig": {
        "defaults": {
          "min": 99,
          "max": 100,
          "thresholds": {
            "steps": [
              {"value": 99, "color": "red"},
              {"value": 99.5, "color": "yellow"},
              {"value": 99.9, "color": "green"}
            ]
          },
          "unit": "percent"
        }
      }
    }
  ]
}
```

---

### 2. User Activity Metrics

**Metrics:**
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- New user registrations
- Login success rate
- Average session duration

```sql
-- Query: Daily Active Users (Last 30 Days)
SELECT
  DATE(timestamp) AS date,
  COUNT(DISTINCT "userId") AS daily_active_users
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '30 days'
AND action = 'LOGIN'
AND success = true
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: New User Registrations (Last 30 Days)
SELECT
  DATE("createdAt") AS date,
  COUNT(*) AS new_users
FROM "User"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- Query: Login Success Rate (Last 7 Days)
SELECT
  DATE(timestamp) AS date,
  COUNT(*) FILTER (WHERE success = true) AS successful_logins,
  COUNT(*) FILTER (WHERE success = false) AS failed_logins,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*),
    2
  ) AS success_rate
FROM "AuditLog"
WHERE action = 'LOGIN'
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: User Activity by Role
SELECT
  u.role,
  COUNT(DISTINCT a."userId") AS active_users,
  COUNT(*) AS total_actions
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE a.timestamp > NOW() - INTERVAL '7 days'
GROUP BY u.role
ORDER BY total_actions DESC;
```

**Grafana Configuration:**
```json
{
  "title": "User Activity",
  "panels": [
    {
      "title": "Daily Active Users (30 days)",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(timestamp) AS time, COUNT(DISTINCT \"userId\") AS value FROM \"AuditLog\" WHERE timestamp > NOW() - INTERVAL '30 days' AND action = 'LOGIN' AND success = true GROUP BY DATE(timestamp) ORDER BY time"
      }]
    },
    {
      "title": "New User Registrations",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(\"createdAt\") AS time, COUNT(*) AS value FROM \"User\" WHERE \"createdAt\" > NOW() - INTERVAL '30 days' GROUP BY DATE(\"createdAt\") ORDER BY time"
      }]
    },
    {
      "title": "Login Success Rate",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(timestamp) AS time, ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 2) AS value FROM \"AuditLog\" WHERE action = 'LOGIN' AND timestamp > NOW() - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY time"
      }],
      "fieldConfig": {
        "defaults": {
          "min": 90,
          "max": 100,
          "unit": "percent"
        }
      }
    },
    {
      "title": "Active Users by Role",
      "type": "piechart",
      "targets": [{
        "rawSql": "SELECT u.role AS label, COUNT(DISTINCT a.\"userId\") AS value FROM \"AuditLog\" a JOIN \"User\" u ON a.\"userId\" = u.id WHERE a.timestamp > NOW() - INTERVAL '7 days' GROUP BY u.role"
      }]
    }
  ]
}
```

---

### 3. Clinical Operations Metrics

**Metrics:**
- Appointments created per day
- Appointment cancellation rate
- Prescriptions issued per day
- Lab results uploaded per day
- Patient registrations per day

```sql
-- Query: Appointments Created (Last 30 Days)
SELECT
  DATE("createdAt") AS date,
  COUNT(*) AS appointments_created,
  COUNT(*) FILTER (WHERE status = 'SCHEDULED') AS scheduled,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
FROM "Appointment"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- Query: Appointment Cancellation Rate
SELECT
  DATE("createdAt") AS date,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / COUNT(*),
    2
  ) AS cancellation_rate
FROM "Appointment"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- Query: Prescriptions Issued (Last 30 Days)
SELECT
  DATE("createdAt") AS date,
  COUNT(*) AS prescriptions_issued,
  COUNT(DISTINCT "patientId") AS unique_patients,
  COUNT(DISTINCT "physicianId") AS unique_physicians
FROM "Prescription"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- Query: Top Prescribed Medications
SELECT
  medication,
  COUNT(*) AS prescription_count,
  COUNT(DISTINCT "patientId") AS unique_patients
FROM "Prescription"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY medication
ORDER BY prescription_count DESC
LIMIT 20;

-- Query: Patient Registrations by Source
SELECT
  details->>'registrationSource' AS source,
  COUNT(*) AS patient_count
FROM "Patient"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY details->>'registrationSource'
ORDER BY patient_count DESC;
```

**Grafana Configuration:**
```json
{
  "title": "Clinical Operations",
  "panels": [
    {
      "title": "Appointments Created (30 days)",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(\"createdAt\") AS time, COUNT(*) AS \"Total\", COUNT(*) FILTER (WHERE status = 'SCHEDULED') AS \"Scheduled\", COUNT(*) FILTER (WHERE status = 'CANCELLED') AS \"Cancelled\" FROM \"Appointment\" WHERE \"createdAt\" > NOW() - INTERVAL '30 days' GROUP BY DATE(\"createdAt\") ORDER BY time"
      }]
    },
    {
      "title": "Appointment Cancellation Rate",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(\"createdAt\") AS time, ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / COUNT(*), 2) AS value FROM \"Appointment\" WHERE \"createdAt\" > NOW() - INTERVAL '30 days' GROUP BY DATE(\"createdAt\") ORDER BY time"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 10, "color": "yellow"},
              {"value": 20, "color": "red"}
            ]
          }
        }
      }
    },
    {
      "title": "Prescriptions Issued (30 days)",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(\"createdAt\") AS time, COUNT(*) AS value FROM \"Prescription\" WHERE \"createdAt\" > NOW() - INTERVAL '30 days' GROUP BY DATE(\"createdAt\") ORDER BY time"
      }]
    },
    {
      "title": "Top 20 Prescribed Medications",
      "type": "table",
      "targets": [{
        "rawSql": "SELECT medication, COUNT(*) AS prescription_count FROM \"Prescription\" WHERE \"createdAt\" > NOW() - INTERVAL '30 days' GROUP BY medication ORDER BY prescription_count DESC LIMIT 20"
      }]
    }
  ]
}
```

---

### 4. System Health Metrics

**Metrics:**
- API error rate
- Email delivery success rate
- Failed authentication attempts
- Database query performance
- Redis connection status

```sql
-- Query: API Error Rate (Last 24 Hours)
SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE success = false) AS errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = false) / COUNT(*),
    2
  ) AS error_rate
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour;

-- Query: Email Delivery Success Rate
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS total_emails,
  COUNT(*) FILTER (WHERE success = true) AS delivered,
  COUNT(*) FILTER (WHERE success = false) AS failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*),
    2
  ) AS delivery_rate
FROM "AuditLog"
WHERE action = 'SEND_EMAIL'
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: Failed Authentication Attempts
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS failed_attempts,
  COUNT(DISTINCT "userId") AS unique_users_affected,
  COUNT(DISTINCT "ipAddress") AS unique_ips
FROM "AuditLog"
WHERE action = 'LOGIN'
AND success = false
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: Slow Database Queries (>1 second)
-- This would come from application metrics, not audit log
-- Example with custom tracking table:
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS slow_query_count,
  AVG(duration_ms) AS avg_duration_ms,
  MAX(duration_ms) AS max_duration_ms
FROM "SlowQueryLog"  -- Hypothetical table
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;
```

**Prometheus Queries:**
```promql
# API Error Rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint)
/
sum(rate(http_requests_total[5m])) by (endpoint) * 100

# API Request Rate
sum(rate(http_requests_total[5m]))

# API Response Time (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database Connection Pool Usage
database_connection_pool_active / database_connection_pool_max * 100
```

**Grafana Configuration:**
```json
{
  "title": "System Health",
  "panels": [
    {
      "title": "API Error Rate (24h)",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 1, "color": "yellow"},
              {"value": 5, "color": "red"}
            ]
          }
        }
      },
      "alert": {
        "name": "High API Error Rate",
        "conditions": [{"value": 5, "type": "gt"}],
        "notifications": ["pagerduty"]
      }
    },
    {
      "title": "Email Delivery Success Rate",
      "type": "gauge",
      "targets": [{
        "rawSql": "SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 2) FROM \"AuditLog\" WHERE action = 'SEND_EMAIL' AND timestamp > NOW() - INTERVAL '24 hours'"
      }],
      "fieldConfig": {
        "defaults": {
          "min": 95,
          "max": 100,
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"value": 95, "color": "red"},
              {"value": 98, "color": "yellow"},
              {"value": 99, "color": "green"}
            ]
          }
        }
      }
    },
    {
      "title": "Failed Login Attempts",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(timestamp) AS time, COUNT(*) AS value FROM \"AuditLog\" WHERE action = 'LOGIN' AND success = false AND timestamp > NOW() - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY time"
      }]
    },
    {
      "title": "API Response Time (p95)",
      "type": "gauge",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "ms",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 500, "color": "yellow"},
              {"value": 1000, "color": "red"}
            ]
          }
        }
      }
    }
  ]
}
```

---

### 5. Compliance & Security Metrics

**Metrics:**
- Audit log coverage (% of actions logged)
- Access without reason (LGPD violation)
- After-hours access
- Bulk data access (>100 records/hour)
- Failed authorization attempts

```sql
-- Query: Audit Log Coverage by Resource
SELECT
  resource,
  COUNT(*) AS total_access,
  COUNT(*) FILTER (WHERE details->>'accessReason' IS NOT NULL) AS with_reason,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE details->>'accessReason' IS NOT NULL) / COUNT(*),
    2
  ) AS coverage_rate
FROM "AuditLog"
WHERE resource IN ('Patient', 'Appointment', 'Prescription', 'LabResult')
AND action = 'READ'
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY resource;

-- Query: Access Without Documented Reason (LGPD Violation)
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS violations,
  COUNT(DISTINCT "userId") AS users_affected,
  array_agg(DISTINCT resource) AS resources_affected
FROM "AuditLog"
WHERE resource IN ('Patient', 'Appointment', 'Prescription')
AND action = 'READ'
AND (details->>'accessReason' IS NULL OR details->>'accessReason' = '')
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: After-Hours Access
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS after_hours_access,
  COUNT(DISTINCT "userId") AS unique_users,
  array_agg(DISTINCT "userId") AS user_ids
FROM "AuditLog"
WHERE EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
AND EXTRACT(DOW FROM timestamp) NOT IN (0, 6)
AND resource IN ('Patient', 'Appointment', 'Prescription')
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Query: Bulk Data Access (Security Risk)
SELECT
  "userId",
  u.email,
  u.role,
  COUNT(*) AS access_count,
  COUNT(DISTINCT "resourceId") AS unique_records,
  MIN(timestamp) AS first_access,
  MAX(timestamp) AS last_access
FROM "AuditLog" a
JOIN "User" u ON a."userId" = u.id
WHERE resource = 'Patient'
AND action = 'READ'
AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY "userId", u.email, u.role
HAVING COUNT(*) > 100
ORDER BY access_count DESC;

-- Query: Failed Authorization Attempts
SELECT
  DATE(timestamp) AS date,
  resource,
  COUNT(*) AS failed_attempts,
  COUNT(DISTINCT "userId") AS unique_users
FROM "AuditLog"
WHERE success = false
AND action IN ('READ', 'UPDATE', 'DELETE')
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), resource
ORDER BY date, failed_attempts DESC;
```

**Grafana Configuration:**
```json
{
  "title": "Compliance & Security",
  "panels": [
    {
      "title": "Audit Log Coverage (Access Reason)",
      "type": "gauge",
      "targets": [{
        "rawSql": "SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE details->>'accessReason' IS NOT NULL) / COUNT(*), 2) FROM \"AuditLog\" WHERE resource IN ('Patient', 'Appointment', 'Prescription') AND action = 'READ' AND timestamp > NOW() - INTERVAL '7 days'"
      }],
      "fieldConfig": {
        "defaults": {
          "min": 90,
          "max": 100,
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"value": 90, "color": "red"},
              {"value": 95, "color": "yellow"},
              {"value": 99, "color": "green"}
            ]
          }
        }
      }
    },
    {
      "title": "Access Without Reason (LGPD Violations)",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(timestamp) AS time, COUNT(*) AS value FROM \"AuditLog\" WHERE resource IN ('Patient', 'Appointment', 'Prescription') AND action = 'READ' AND (details->>'accessReason' IS NULL OR details->>'accessReason' = '') AND timestamp > NOW() - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY time"
      }],
      "alert": {
        "name": "LGPD Compliance Violations",
        "conditions": [{"value": 10, "type": "gt"}],
        "notifications": ["slack-compliance"]
      }
    },
    {
      "title": "After-Hours Access",
      "type": "timeseries",
      "targets": [{
        "rawSql": "SELECT DATE(timestamp) AS time, COUNT(*) AS value FROM \"AuditLog\" WHERE EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22 AND resource IN ('Patient', 'Appointment') AND timestamp > NOW() - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY time"
      }]
    },
    {
      "title": "Users with Bulk Access (>100 records/hour)",
      "type": "table",
      "targets": [{
        "rawSql": "SELECT u.email, u.role, COUNT(*) AS access_count FROM \"AuditLog\" a JOIN \"User\" u ON a.\"userId\" = u.id WHERE resource = 'Patient' AND timestamp > NOW() - INTERVAL '1 hour' GROUP BY u.email, u.role HAVING COUNT(*) > 100 ORDER BY access_count DESC"
      }]
    }
  ]
}
```

---

## Complete Grafana Dashboard JSON

```bash
# Export dashboard for import
# File: infra/monitoring/grafana-business-metrics.json
```

**Access the dashboard:**
```
URL: https://grafana.holilabs.xyz/d/business-metrics
```

---

## Automated Reports

### Daily Report Email

```typescript
// File: scripts/daily-metrics-report.ts

import { PrismaClient } from '@prisma/client';
import { sendEmail } from '@/lib/email';

const prisma = new PrismaClient();

async function generateDailyReport() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch metrics
  const activeUsers = await prisma.auditLog.findMany({
    where: {
      timestamp: { gte: yesterday },
      action: 'LOGIN',
      success: true,
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const newPatients = await prisma.patient.count({
    where: { createdAt: { gte: yesterday } },
  });

  const appointments = await prisma.appointment.count({
    where: { createdAt: { gte: yesterday } },
  });

  const prescriptions = await prisma.prescription.count({
    where: { createdAt: { gte: yesterday } },
  });

  const emailFailures = await prisma.auditLog.count({
    where: {
      action: 'SEND_EMAIL',
      success: false,
      timestamp: { gte: yesterday },
    },
  });

  // Generate HTML email
  const html = `
    <h2>Daily Metrics Report - ${yesterday.toDateString()}</h2>

    <h3>User Activity</h3>
    <ul>
      <li>Active Users: ${activeUsers.length}</li>
    </ul>

    <h3>Clinical Operations</h3>
    <ul>
      <li>New Patients: ${newPatients}</li>
      <li>Appointments Created: ${appointments}</li>
      <li>Prescriptions Issued: ${prescriptions}</li>
    </ul>

    <h3>System Health</h3>
    <ul>
      <li>Email Failures: ${emailFailures}</li>
    </ul>

    <p><a href="https://grafana.holilabs.xyz/d/business-metrics">View Full Dashboard</a></p>
  `;

  // Send email
  await sendEmail({
    to: 'team@holilabs.xyz',
    subject: `Daily Metrics Report - ${yesterday.toDateString()}`,
    html,
  });

  console.log('✓ Daily report sent');
}

generateDailyReport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to generate report:', error);
    process.exit(1);
  });
```

**Schedule with cron:**
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/holilabsv2 && npx tsx scripts/daily-metrics-report.ts
```

---

## Alert Configuration

### Critical Business Alerts

```yaml
# Alert: Daily Active Users Drop >50%
- alert: DailyActiveUsersDrop
  expr: |
    (
      count(count by (userId) (audit_log_total{action="LOGIN"} offset 24h))
      -
      count(count by (userId) (audit_log_total{action="LOGIN"}))
    )
    /
    count(count by (userId) (audit_log_total{action="LOGIN"} offset 24h))
    > 0.5
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Daily active users dropped significantly"
    description: "DAU dropped by {{ $value | humanizePercentage }} compared to yesterday"

# Alert: Zero Appointments Created
- alert: NoAppointmentsCreated
  expr: |
    sum(increase(appointments_created_total[4h])) == 0
  for: 4h
  labels:
    severity: warning
  annotations:
    summary: "No appointments created in last 4 hours"
    description: "This is unusual during business hours (check system health)"

# Alert: High Email Failure Rate
- alert: EmailDeliveryFailureRateHigh
  expr: |
    sum(rate(email_sent_total{success="false"}[15m]))
    /
    sum(rate(email_sent_total[15m]))
    > 0.1
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Email delivery failure rate >10%"
    description: "{{ $value | humanizePercentage }} of emails failing"
```

---

## Mobile App Integration (Future)

```typescript
// Expose business metrics API endpoint
// File: apps/web/src/app/api/metrics/business/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  // Only admins can access
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metrics = {
    activeUsers: await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: today },
        action: 'LOGIN',
        success: true,
      },
      select: { userId: true },
      distinct: ['userId'],
    }).then(users => users.length),

    appointmentsToday: await prisma.appointment.count({
      where: { createdAt: { gte: today } },
    }),

    prescriptionsToday: await prisma.prescription.count({
      where: { createdAt: { gte: today } },
    }),

    newPatientsToday: await prisma.patient.count({
      where: { createdAt: { gte: today } },
    }),
  };

  return NextResponse.json(metrics);
}
```

---

## Best Practices

### 1. Dashboard Organization

```markdown
**Top Section**: Most important KPIs (executive summary)
**Middle Section**: Detailed operational metrics
**Bottom Section**: Compliance and technical metrics
```

### 2. Color Coding

```markdown
**Green**: Good performance (within target)
**Yellow**: Warning (needs attention)
**Red**: Critical (requires immediate action)
```

### 3. Time Ranges

```markdown
**Real-time**: Last 5 minutes (for ops team)
**Daily**: Last 24 hours (for daily standup)
**Weekly**: Last 7 days (for sprint review)
**Monthly**: Last 30 days (for executive review)
```

### 4. Avoid Metric Overload

```markdown
**Do**: Focus on actionable metrics
**Don't**: Track vanity metrics
**Do**: Show trends over time
**Don't**: Show absolute numbers without context
```

---

## Related Documentation
- [APM Setup](./apm-setup.md)
- [Synthetic Monitoring](./synthetic-monitoring.md)
- [Audit Log Review Runbook](../runbooks/audit-log-review.md)

---

## Changelog
- **2024-01-07**: Initial version created
