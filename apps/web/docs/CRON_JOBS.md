# Cron Jobs Documentation

This document provides comprehensive information about all scheduled cron jobs in the Holi Labs system.

## Table of Contents

1. [Overview](#overview)
2. [Security](#security)
3. [Cron Jobs List](#cron-jobs-list)
4. [Monitoring](#monitoring)
5. [Manual Testing](#manual-testing)
6. [Troubleshooting](#troubleshooting)
7. [Deployment](#deployment)

---

## Overview

Holi Labs uses cron jobs for scheduled background tasks such as sending reminders, expiring consents, and processing queues. The system supports two execution modes:

1. **Vercel Cron** (Production): Managed by Vercel's infrastructure
2. **Local Scheduler** (Development): Using node-cron for local testing

All cron jobs are secured with:
- Bearer token authentication (`CRON_SECRET`)
- IP whitelist validation (Vercel Cron IPs)
- Structured logging with Pino
- Automatic retry logic with exponential backoff
- Health monitoring and alerting

---

## Security

### Authentication

All cron endpoints require Bearer token authentication:

```bash
Authorization: Bearer <CRON_SECRET>
```

**Setup:**

1. Generate a secure secret:
   ```bash
   openssl rand -hex 32
   ```

2. Add to `.env`:
   ```bash
   CRON_SECRET="your-generated-secret-here"
   ```

3. Configure in Vercel (Production):
   - Go to: Project Settings → Environment Variables
   - Add: `CRON_SECRET` with your secret value
   - Scope: Production, Preview

### IP Whitelist

All cron endpoints validate requests come from Vercel's cron service:

**Allowed IPs:**
- `76.76.21.0/24` (IP range)
- `76.76.21.21` (specific IP)
- `76.76.21.98` (specific IP)

Source: [Vercel Cron Documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)

**Note:** IP validation logs warnings but doesn't block requests (to allow for Vercel IP changes). Authentication via `CRON_SECRET` is the primary security mechanism.

### Retry Logic

All cron jobs implement exponential backoff retry logic:

- **Max Retries:** 3 attempts
- **Backoff Strategy:** 1s → 2s → 4s
- **Logging:** All retry attempts are logged with structured metadata

---

## Cron Jobs List

### 1. Execute Reminders

**Endpoint:** `/api/cron/execute-reminders`

**Schedule:** Every minute (`* * * * *`)

**Purpose:** Executes all due scheduled reminders (appointments, medications, follow-ups, etc.)

**What it does:**
- Queries all reminders with `scheduledFor <= NOW()` and `status = 'PENDING'`
- Sends notifications via appropriate channels (email, SMS, WhatsApp, push)
- Updates reminder status to `SENT` or `FAILED`
- Tracks delivery metrics

**HTTP Methods:**
- `GET`: Primary method for Vercel Cron
- `POST`: Alternative method for manual testing

**Max Duration:** 5 minutes

**Dependencies:**
- Database: Prisma ORM
- Notifications: Email/SMS/WhatsApp services
- Function: `executeScheduledReminders()` from `@/lib/jobs/reminder-executor`

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "processed": 25,
    "sent": 24,
    "failed": 1,
    "skipped": 0
  },
  "duration": 3245,
  "retries": 0,
  "timestamp": "2025-01-15T08:30:00.000Z"
}
```

---

### 2. Send Appointment Reminders

**Endpoint:** `/api/cron/send-appointment-reminders`

**Schedule:** Daily at 8:00 PM (`0 20 * * *`)

**Purpose:** Sends reminders for tomorrow's appointments

**What it does:**
- Finds all appointments scheduled for tomorrow
- Filters out cancelled/completed appointments
- Sends reminder 24 hours before appointment
- Creates reminder records for tracking

**HTTP Methods:**
- `GET`: Primary method for Vercel Cron
- `POST`: Alternative method for manual testing

**Max Duration:** 5 minutes

**Dependencies:**
- Database: Appointment table
- Notifications: Multi-channel notification system
- Function: `sendRemindersForTomorrow()` from `@/lib/notifications/appointment-reminders`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "sent": 15,
    "failed": 0
  },
  "message": "Sent 15 reminders, 0 failed",
  "duration": 2100,
  "retries": 0
}
```

---

### 3. Screening Triggers

**Endpoint:** `/api/cron/screening-triggers`

**Schedule:** Daily at 2:00 AM (`0 2 * * *`)

**Purpose:** Auto-generates preventive care screening reminders for eligible patients

**What it does:**
- Analyzes all active patients for preventive care eligibility
- Checks age, gender, and medical history against screening guidelines
- Creates reminders for overdue screenings (mammograms, colonoscopy, etc.)
- Updates prevention plans with new recommendations

**HTTP Methods:**
- `GET`: Primary method for Vercel Cron
- `POST`: Alternative method for manual testing

**Max Duration:** 5 minutes

**Dependencies:**
- Database: Patient, Prevention Plan tables
- Function: `autoGenerateScreeningReminders()` from `@/lib/prevention/screening-triggers`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "patientsProcessed": 342,
    "remindersCreated": 28
  },
  "duration": 8543,
  "retries": 0,
  "timestamp": "2025-01-15T02:00:00.000Z",
  "message": "Processed 342 patients, created 28 screening reminders"
}
```

---

### 4. Expire Consents

**Endpoint:** `/api/cron/expire-consents`

**Schedule:** Daily at midnight (`0 0 * * *`)

**Purpose:** Expires patient consents that have passed their expiration date

**What it does:**
- Finds all consents with `expiresAt < NOW()` and `status = 'ACTIVE'`
- Updates status to `EXPIRED`
- Logs consent expiration events for audit trail
- Triggers notifications to patients/staff (if configured)

**HTTP Methods:**
- `POST`: Primary method for Vercel Cron
- `GET`: Only allowed in development

**Max Duration:** 5 minutes

**Dependencies:**
- Database: Consent table
- Function: `expireAllExpiredConsents()` from `@/lib/consent/expiration-checker`

**Example Response:**
```json
{
  "success": true,
  "expiredCount": 12,
  "duration": 1245,
  "retries": 0,
  "timestamp": "2025-01-15T00:00:00.000Z"
}
```

---

### 5. Send Consent Reminders

**Endpoint:** `/api/cron/send-consent-reminders`

**Schedule:** Daily at 9:00 AM (`0 9 * * *`)

**Purpose:** Sends reminders for consents expiring soon

**What it does:**
- Finds consents expiring in N days (default: 7 days)
- Filters already-sent reminders (24-hour cooldown)
- Sends notification to patients about upcoming expiration
- Creates reminder records for tracking

**HTTP Methods:**
- `POST`: Primary method for Vercel Cron
- `GET`: Only allowed in development

**Max Duration:** 5 minutes

**Environment Variables:**
- `CONSENT_REMINDER_DAYS`: Days before expiration (default: 7)

**Dependencies:**
- Database: Consent table
- Function: `processConsentReminders()` from `@/lib/consent/reminder-service`

**Example Response:**
```json
{
  "success": true,
  "processed": 8,
  "skipped": 3,
  "failed": 0,
  "reminderDays": 7,
  "duration": 1832,
  "retries": 0,
  "timestamp": "2025-01-15T09:00:00.000Z"
}
```

---

### 6. Process Email Queue

**Endpoint:** `/api/cron/process-email-queue`

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**Purpose:** Processes queued emails in background

**What it does:**
- Fetches up to 50 pending emails from queue
- Attempts to send each email via configured provider
- Updates status to `SENT` or `FAILED`
- Implements per-email retry logic (max 3 attempts)

**HTTP Methods:**
- `POST`: Primary method for Vercel Cron
- `GET`: Only allowed in development

**Max Duration:** 5 minutes

**Dependencies:**
- Database: EmailQueue table
- Email Service: Resend/SendGrid/SES/SMTP
- Function: `processEmailQueue()` from `@/lib/email/email-service`

**Example Response:**
```json
{
  "success": true,
  "processed": 42,
  "failed": 2,
  "duration": 4235,
  "retries": 0,
  "timestamp": "2025-01-15T10:15:00.000Z"
}
```

---

## Monitoring

### Monitoring System

All cron jobs are monitored via the `CronMonitor` singleton class located at:
```
/apps/web/src/lib/cron/monitoring.ts
```

**Features:**
- Execution time tracking
- Success/failure rate calculation
- Consecutive failure detection
- Automatic alerting on critical failures
- Historical metrics (last 100 runs per job)

### Health Metrics

Each job tracks:
- **Total Runs**: Number of executions
- **Successful Runs**: Completed without errors
- **Failed Runs**: Completed with errors
- **Success Rate**: `(successful / total) * 100`
- **Consecutive Failures**: Current failure streak
- **Average Duration**: Mean execution time in ms
- **Last Run/Success/Failure**: Timestamps

### Health Status

A job is considered **healthy** if:
1. Consecutive failures < 3
2. Success rate >= 80%

### Alerting

Alerts are triggered when:
1. **Critical**: 3+ consecutive failures
2. **Warning**: Success rate < 80% (after 10+ runs)

Alerts are logged and can be integrated with:
- Email notifications
- Slack webhooks
- PagerDuty incidents
- SMS alerts

### Accessing Monitoring Data

```typescript
import { CronMonitor } from '@/lib/cron/monitoring';

const monitor = CronMonitor.getInstance();

// Get health for specific job
const health = monitor.getJobHealth('send_appointment_reminders');

// Get all jobs health
const allHealth = monitor.getAllJobsHealth();

// Get recent history
const history = monitor.getJobHistory('send_appointment_reminders', 10);

// Export metrics for external systems
const metrics = monitor.exportMetrics();
```

### Structured Logging

All cron jobs use structured logging with Pino:

**Events Logged:**
- `cron_job_started`: Job execution begins
- `cron_job_completed`: Job succeeds
- `cron_job_failed`: Job fails
- `cron_job_retry`: Retry attempt
- `cron_unauthorized_access`: Invalid auth attempt
- `invalid_cron_ip`: Request from non-whitelisted IP
- `cron_job_health_critical`: 3+ consecutive failures
- `cron_job_health_degraded`: Low success rate

**Log Structure:**
```json
{
  "level": "info",
  "time": "2025-01-15T10:30:00.000Z",
  "event": "cron_job_completed",
  "jobName": "send_appointment_reminders",
  "executionId": "send_appointment_reminders-1705315800000-xyz123",
  "duration": 2100,
  "retries": 0,
  "metadata": { "sent": 15, "failed": 0 }
}
```

---

## Manual Testing

### Testing Locally

All cron jobs support manual triggering for testing:

**Method 1: curl**
```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret-here"

# Test execute reminders
curl -X POST http://localhost:3000/api/cron/execute-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test appointment reminders
curl -X POST http://localhost:3000/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test screening triggers
curl -X POST http://localhost:3000/api/cron/screening-triggers \
  -H "Authorization: Bearer $CRON_SECRET"

# Test expire consents
curl -X POST http://localhost:3000/api/cron/expire-consents \
  -H "Authorization: Bearer $CRON_SECRET"

# Test consent reminders
curl -X POST http://localhost:3000/api/cron/send-consent-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test email queue
curl -X POST http://localhost:3000/api/cron/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Method 2: VS Code REST Client**

Create a file `cron-test.http`:

```http
### Setup
@baseUrl = http://localhost:3000
@cronSecret = your-secret-here

### Execute Reminders
POST {{baseUrl}}/api/cron/execute-reminders
Authorization: Bearer {{cronSecret}}

### Appointment Reminders
POST {{baseUrl}}/api/cron/send-appointment-reminders
Authorization: Bearer {{cronSecret}}

### Screening Triggers
POST {{baseUrl}}/api/cron/screening-triggers
Authorization: Bearer {{cronSecret}}
```

### Testing in Production

**CAUTION:** Only test in production during maintenance windows or with approval.

```bash
# Get CRON_SECRET from Vercel
export CRON_SECRET="production-secret"

# Test endpoint (replace with production URL)
curl -X POST https://holilabs.xyz/api/cron/execute-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Development-Only Features

Some endpoints allow GET requests in development:

```bash
# Development only - GET request (no auth required)
curl http://localhost:3000/api/cron/expire-consents

# Production - returns 405 Method Not Allowed
curl https://holilabs.xyz/api/cron/expire-consents
```

---

## Troubleshooting

### Common Issues

#### 1. 401 Unauthorized

**Symptoms:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Causes:**
- Missing `CRON_SECRET` environment variable
- Incorrect Bearer token
- Missing `Authorization` header

**Solution:**
```bash
# Verify CRON_SECRET is set
echo $CRON_SECRET

# Check environment variable in Vercel
vercel env ls

# Test with correct header
curl -X POST https://holilabs.xyz/api/cron/execute-reminders \
  -H "Authorization: Bearer your-correct-secret"
```

#### 2. 500 CRON_SECRET not configured

**Symptoms:**
```json
{
  "success": false,
  "error": "CRON_SECRET not configured"
}
```

**Cause:** `CRON_SECRET` not set in environment variables

**Solution:**
```bash
# Add to .env.local (development)
echo 'CRON_SECRET="your-secret-here"' >> .env.local

# Add to Vercel (production)
vercel env add CRON_SECRET
```

#### 3. Cron job not executing

**Symptoms:**
- No logs in Vercel
- Job doesn't run at scheduled time

**Debugging:**

1. **Check Vercel Cron Configuration:**
   ```bash
   # View vercel.json
   cat vercel.json
   ```

   Should contain:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/execute-reminders",
         "schedule": "* * * * *"
       }
     ]
   }
   ```

2. **Check Vercel Dashboard:**
   - Go to: Project → Settings → Cron Jobs
   - Verify jobs are listed and enabled
   - Check execution logs

3. **Check Function Logs:**
   - Go to: Project → Logs
   - Filter by: `event: cron_job_started`
   - Look for errors

#### 4. High failure rate

**Symptoms:**
```json
{
  "event": "cron_job_health_degraded",
  "jobName": "send_appointment_reminders",
  "successRate": 65.4
}
```

**Debugging:**

1. **Check Logs:**
   ```bash
   # Filter logs by job name
   vercel logs --filter="jobName=send_appointment_reminders"
   ```

2. **Check Dependencies:**
   - Database connectivity
   - External API availability (email, SMS)
   - Rate limits on third-party services

3. **Check Job Health:**
   ```typescript
   const health = monitor.getJobHealth('send_appointment_reminders');
   console.log(health);
   ```

#### 5. Timeouts (maxDuration exceeded)

**Symptoms:**
```
Error: Function execution timeout exceeded (300s)
```

**Causes:**
- Processing too many records
- Slow database queries
- External API latency

**Solutions:**

1. **Increase maxDuration:**
   ```typescript
   export const maxDuration = 300; // Increase to 600
   ```

2. **Optimize Queries:**
   - Add database indexes
   - Batch processing
   - Pagination

3. **Process in Chunks:**
   ```typescript
   // Instead of processing all at once
   const reminders = await getAllReminders();

   // Process in batches of 50
   for (let i = 0; i < reminders.length; i += 50) {
     const batch = reminders.slice(i, i + 50);
     await processBatch(batch);
   }
   ```

#### 6. IP Whitelist Warnings

**Symptoms:**
```json
{
  "event": "invalid_cron_ip",
  "jobName": "execute_reminders",
  "ip": "192.168.1.1"
}
```

**Cause:** Request from non-whitelisted IP (usually during manual testing)

**Solution:**
- This is informational only
- IP validation doesn't block requests
- Ensure `CRON_SECRET` is correct for security

---

## Deployment

### Vercel Cron Setup

#### 1. Create `vercel.json`

In project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/execute-reminders",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/send-appointment-reminders",
      "schedule": "0 20 * * *"
    },
    {
      "path": "/api/cron/screening-triggers",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/expire-consents",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/send-consent-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/process-email-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### 2. Deploy to Vercel

```bash
# Deploy
vercel --prod

# Verify cron jobs are created
vercel crons ls
```

#### 3. Set Environment Variables

```bash
# Add CRON_SECRET
vercel env add CRON_SECRET production

# Verify all env vars
vercel env ls
```

#### 4. Monitor Execution

```bash
# View logs
vercel logs --follow

# Filter by cron events
vercel logs --filter="event=cron_job_started"
```

### Cron Schedule Reference

Common cron expressions:

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * *` | Daily at midnight |
| `0 2 * * *` | Daily at 2:00 AM |
| `0 9 * * *` | Daily at 9:00 AM |
| `0 20 * * *` | Daily at 8:00 PM |
| `0 0 * * 0` | Weekly on Sunday |
| `0 0 1 * *` | Monthly on 1st |

Use [crontab.guru](https://crontab.guru/) for testing expressions.

### Vercel Cron Limits

**Hobby Plan:**
- Max 1 cron job
- Max 1 minute frequency

**Pro Plan:**
- Max 20 cron jobs
- Max 1 minute frequency
- 1000 executions/day

**Enterprise Plan:**
- Unlimited cron jobs
- Custom frequency
- Unlimited executions

### Alternative: GitHub Actions

For complex scheduling or if Vercel limits are reached:

`.github/workflows/cron-reminders.yml`:

```yaml
name: Execute Reminders Cron

on:
  schedule:
    - cron: '* * * * *'  # Every minute

jobs:
  execute-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Execute Reminders
        run: |
          curl -X POST https://holilabs.xyz/api/cron/execute-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## Best Practices

### 1. Idempotency

All cron jobs should be idempotent (safe to run multiple times):

```typescript
// Good: Check if reminder already sent
const existingReminder = await prisma.reminder.findFirst({
  where: {
    appointmentId: appointment.id,
    type: 'APPOINTMENT',
    sentAt: { not: null }
  }
});

if (existingReminder) {
  return; // Skip, already sent
}
```

### 2. Graceful Degradation

Jobs should continue on individual failures:

```typescript
// Process all reminders, don't fail entire job
for (const reminder of reminders) {
  try {
    await sendReminder(reminder);
  } catch (error) {
    logger.error({ error, reminderId: reminder.id }, 'Failed to send reminder');
    // Continue to next reminder
  }
}
```

### 3. Rate Limiting

Respect external API rate limits:

```typescript
// Batch emails to avoid rate limits
const BATCH_SIZE = 10;
for (let i = 0; i < emails.length; i += BATCH_SIZE) {
  const batch = emails.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(sendEmail));
  await sleep(1000); // 1s delay between batches
}
```

### 4. Monitoring

Always use structured logging:

```typescript
logger.info({
  event: 'cron_job_started',
  jobName: 'send_appointment_reminders',
  timestamp: new Date().toISOString(),
  metadata: { appointmentCount: appointments.length }
});
```

### 5. Testing

Test cron jobs in development:

```typescript
// Allow GET in development for easy testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET not allowed in production' },
      { status: 405 }
    );
  }
  return POST(request);
}
```

---

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Crontab Guru - Cron Expression Editor](https://crontab.guru/)
- [Pino Logging Documentation](https://getpino.io/)
- [Node Cron Documentation](https://github.com/node-cron/node-cron)

---

## Support

For issues or questions:
1. Check logs: `vercel logs --filter="event=cron"`
2. Review health metrics: `monitor.getAllJobsHealth()`
3. Contact DevOps team: devops@holilabs.com
4. Create incident: [PagerDuty](https://holilabs.pagerduty.com)
