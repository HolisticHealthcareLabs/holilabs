# Infrastructure & Automation Deployment Guide

**Phase 2: Core Infrastructure & Automation**
**Date**: December 3, 2025
**Status**: ✅ Ready for Deployment

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features Implemented](#features-implemented)
3. [Database Schema Changes](#database-schema-changes)
4. [Environment Variables](#environment-variables)
5. [Deployment Steps](#deployment-steps)
6. [Cron Job Configuration](#cron-job-configuration)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This deployment adds critical infrastructure and automation features:

- **Unified Email Service**: Multi-provider email system with queue and retry logic
- **Patient Data Deletion**: GDPR/LGPD-compliant deletion workflow
- **Appointment Reminders**: Automated multi-channel reminder system
- **Consent Expiration Reminders**: Proactive consent renewal notifications

**Compliance**: HIPAA §164.508, GDPR Article 17, LGPD Article 18

---

## Features Implemented

### 1. Unified Email Service

**Location**: `/apps/web/src/lib/email/email-service.ts`

Multi-provider email service supporting:
- **Resend** (default, recommended)
- **SendGrid**
- **AWS SES**
- **SMTP/Nodemailer**

Features:
- Direct email sending
- Background queue processing
- Retry logic (3 attempts)
- Multiple recipients (to, cc, bcc)
- Attachment support

**API**:
```typescript
// Direct send
await sendEmail({
  to: 'patient@example.com',
  subject: 'Test Email',
  html: '<p>HTML content</p>',
  text: 'Plain text content',
});

// Queue for background processing
const emailId = await queueEmail({
  to: 'patient@example.com',
  subject: 'Test Email',
  html: '<p>HTML content</p>',
});

// Bulk send
await sendBulkEmail(
  ['email1@example.com', 'email2@example.com'],
  { subject: 'Bulk Email', html: '<p>Content</p>' }
);
```

### 2. Email Templates

**Location**: `/apps/web/src/lib/email/templates.ts`

Six pre-built templates:
1. **Consent Expiration Reminder** - Notify before consent expires
2. **Appointment Reminder** - Upcoming appointment notification
3. **Lab Results Available** - Patient portal notification
4. **Data Deletion Confirmation** - GDPR deletion request
5. **Consent Version Update** - Terms changed notification
6. **Medication Refill Reminder** - Prescription running low

**Usage**:
```typescript
import { consentExpirationTemplate } from '@/lib/email/templates';

const { subject, html, text } = consentExpirationTemplate({
  patientName: 'John Doe',
  consentType: 'General Consultation',
  expiresAt: new Date('2025-12-31'),
  renewUrl: 'https://app.holilabs.com/portal/consent/renew/abc123',
});

await queueEmail({ to: 'patient@example.com', subject, html, text });
```

### 3. Patient Data Deletion (GDPR)

**Location**: `/apps/web/src/lib/email/deletion-emails.ts`

Complete GDPR Article 17 implementation:
- Confirmation email with 24-hour token
- Anonymization (not hard delete) for audit compliance
- Completion notification email
- Audit trail logging

**Flow**:
1. Patient requests deletion: `POST /api/patients/{id}/request-deletion`
2. System sends confirmation email with token
3. Patient confirms: `POST /api/patients/deletion/confirm/{token}`
4. System anonymizes data and sends completion email

**What Gets Deleted**:
- Personal identifiers (name, email, phone, CPF, CNS)
- Medical notes content (redacted)
- Messages and communications
- Photos and personal preferences

**What's Preserved** (Legal Requirements):
- Anonymized audit logs
- Financial records
- Referential integrity (anonymized MRN)

### 4. Appointment Reminder System

**Location**:
- `/apps/web/src/lib/appointments/reminder-service.ts` (new email-based)
- `/apps/web/src/lib/notifications/appointment-reminders.ts` (existing multi-channel)

**Features**:
- Multi-channel delivery: WhatsApp → Push → Email → SMS
- Quiet hours respect
- Patient preference handling
- 24-hour advance reminders (configurable)

**Integration**:
The existing multi-channel system now uses the unified email service for email reminders, ensuring reliability and retry logic.

### 5. Consent Expiration Reminders

**Location**: `/apps/web/src/lib/consent/reminder-service.ts`

Proactive consent management:
- Sends reminders 7 days before expiration (configurable)
- Prevents service disruption
- Includes renewal link
- Tracks reminder status

**API**:
```typescript
// Process all pending reminders
const result = await processConsentReminders(7); // 7 days before
// Returns: { processed: 5, failed: 0, skipped: 1 }

// Send immediate reminder (manual)
const result = await sendImmediateConsentReminder(consentId);
// Returns: { success: true, message: 'Reminder sent' }
```

---

## Database Schema Changes

### New Model: EmailQueue

```prisma
model EmailQueue {
  id           String           @id @default(cuid())
  to           String           @db.Text
  cc           String?          @db.Text
  bcc          String?          @db.Text
  subject      String           @db.Text
  html         String           @db.Text
  text         String?          @db.Text
  from         String?
  replyTo      String?

  status       EmailQueueStatus @default(PENDING)
  attempts     Int              @default(0)
  lastError    String?          @db.Text
  messageId    String?

  scheduledFor DateTime         @default(now())
  sentAt       DateTime?

  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([status])
  @@index([scheduledFor])
  @@map("email_queue")
}

enum EmailQueueStatus {
  PENDING
  SENT
  FAILED
}
```

### Updated Model: Consent

Added fields:
```prisma
model Consent {
  // ... existing fields ...

  // Expiration
  expiresAt DateTime? // Optional expiration date

  // Reminder tracking
  reminderSent   Boolean   @default(false)
  reminderSentAt DateTime?

  @@index([expiresAt])
  @@index([reminderSent])
}
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# ========================================
# EMAIL SERVICE CONFIGURATION
# ========================================

# Email Provider (resend | sendgrid | ses | smtp)
EMAIL_PROVIDER=resend

# Sender Information
FROM_EMAIL=noreply@holilabs.com
FROM_NAME="Holi Labs"

# Resend (Recommended - https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SendGrid (Alternative)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS SES (Alternative)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...

# SMTP (Alternative)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# ========================================
# CRON JOB SECURITY
# ========================================

# Secret token for cron job authentication
CRON_SECRET=your-secure-random-token-here

# ========================================
# AUTOMATION SETTINGS
# ========================================

# Hours before appointment to send reminder (default: 24)
APPOINTMENT_REMINDER_HOURS=24

# Days before consent expiration to send reminder (default: 7)
CONSENT_REMINDER_DAYS=7

# ========================================
# APPLICATION URL
# ========================================

# Your application's public URL (for email links)
NEXT_PUBLIC_APP_URL=https://app.holilabs.com
```

**Generate CRON_SECRET**:
```bash
# Generate a secure random token
openssl rand -hex 32
```

---

## Deployment Steps

### Step 1: Update Dependencies (If Needed)

```bash
cd apps/web

# Install Resend (if not already installed)
pnpm add resend

# Optional: Install other email providers
# pnpm add @sendgrid/mail @aws-sdk/client-ses nodemailer
```

### Step 2: Update Database Schema

```bash
cd apps/web

# Push schema changes to database
npx prisma db push

# Or create migration for production
npx prisma migrate dev --name add_email_queue_and_consent_reminders

# Generate Prisma Client
npx prisma generate
```

**Verify Schema**:
```bash
# Check that new tables exist
npx prisma studio
# Look for: EmailQueue table, Consent.expiresAt/reminderSent fields
```

### Step 3: Configure Environment Variables

1. Add all variables from the [Environment Variables](#environment-variables) section
2. Set up your email provider API key (Resend recommended)
3. Generate and set CRON_SECRET
4. Update NEXT_PUBLIC_APP_URL to your production domain

### Step 4: Deploy Application

```bash
# Build the application
pnpm build

# Run production server
pnpm start

# Or deploy to Vercel/Railway/etc.
```

### Step 5: Configure Cron Jobs

See [Cron Job Configuration](#cron-job-configuration) section below.

### Step 6: Test Email System

```bash
# Test email sending in development
curl -X POST http://localhost:3000/api/cron/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return:
# {"success":true,"processed":0,"failed":0,"timestamp":"2025-12-03T..."}
```

---

## Cron Job Configuration

### Option A: Vercel Cron (Recommended)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-email-queue",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/send-appointment-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/send-consent-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/expire-consents",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedules**:
- **Email Queue Processing**: Every 5 minutes
- **Appointment Reminders**: Every hour
- **Consent Reminders**: Daily at 8 AM
- **Consent Expiration**: Daily at midnight

**Vercel Setup**:
1. Push `vercel.json` to your repository
2. Deploy to Vercel
3. Crons are automatically configured
4. Add `CRON_SECRET` to Vercel environment variables

### Option B: Railway Cron

Add to `Procfile`:

```
web: pnpm start
cron_email: curl -X POST $APP_URL/api/cron/process-email-queue -H "Authorization: Bearer $CRON_SECRET"
cron_appointments: curl -X POST $APP_URL/api/cron/send-appointment-reminders -H "Authorization: Bearer $CRON_SECRET"
cron_consents: curl -X POST $APP_URL/api/cron/send-consent-reminders -H "Authorization: Bearer $CRON_SECRET"
cron_expire: curl -X POST $APP_URL/api/cron/expire-consents -H "Authorization: Bearer $CRON_SECRET"
```

Configure cron schedules in Railway dashboard.

### Option C: External Cron Service

Use services like:
- **cron-job.org** (free)
- **EasyCron** (free tier available)
- **GitHub Actions** (see below)

**Setup**:
1. Create account on cron service
2. Add your endpoints:
   - `https://app.holilabs.com/api/cron/process-email-queue`
   - `https://app.holilabs.com/api/cron/send-appointment-reminders`
   - `https://app.holilabs.com/api/cron/send-consent-reminders`
   - `https://app.holilabs.com/api/cron/expire-consents`
3. Set Authorization header: `Bearer YOUR_CRON_SECRET`
4. Configure schedules (see above)

### Option D: GitHub Actions

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Cron Jobs

on:
  schedule:
    # Email queue: Every 5 minutes
    - cron: '*/5 * * * *'
    # Appointment reminders: Every hour
    - cron: '0 * * * *'
    # Consent reminders: Daily at 8 AM UTC
    - cron: '0 8 * * *'
    # Expire consents: Daily at midnight UTC
    - cron: '0 0 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  email-queue:
    if: github.event.schedule == '*/5 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Process Email Queue
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/process-email-queue \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  appointment-reminders:
    if: github.event.schedule == '0 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Send Appointment Reminders
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/send-appointment-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  consent-reminders:
    if: github.event.schedule == '0 8 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Send Consent Reminders
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/send-consent-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  expire-consents:
    if: github.event.schedule == '0 0 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Expire Consents
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/expire-consents \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add secrets to GitHub repository:
- `APP_URL`: Your production URL
- `CRON_SECRET`: Your cron secret token

---

## Testing Guide

### Test 1: Email Service

```bash
# Start development server
cd apps/web
pnpm dev

# In another terminal, test email queueing
curl -X POST http://localhost:3000/api/cron/process-email-queue \
  -H "Authorization: Bearer test-secret"
```

**Expected**:
- Console log: "🔄 Starting email queue processing..."
- Returns: `{"success":true,"processed":0,"failed":0}`

### Test 2: Patient Deletion Workflow

```typescript
// In Prisma Studio or via API
// 1. Create test patient
// 2. Request deletion
const response = await fetch('/api/patients/test-patient-id/request-deletion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Testing GDPR workflow',
    legalBasis: 'GDPR_ARTICLE_17'
  })
});

// 3. Check EmailQueue table - should have confirmation email
// 4. Manually process email queue
// 5. Check your inbox for deletion confirmation email
```

### Test 3: Appointment Reminders

```typescript
// Create test appointment 24 hours in the future
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

await prisma.appointment.create({
  data: {
    patientId: 'test-patient-id',
    clinicianId: 'test-clinician-id',
    title: 'Test Appointment',
    startTime: tomorrow,
    endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
    status: 'SCHEDULED',
    reminderSent: false,
  }
});

// Trigger reminder cron
curl -X POST http://localhost:3000/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer test-secret"

// Check EmailQueue - should have reminder email queued
```

### Test 4: Consent Expiration Reminders

```typescript
// Create test consent expiring in 7 days
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

await prisma.consent.create({
  data: {
    patientId: 'test-patient-id',
    type: 'GENERAL_CONSULTATION',
    title: 'General Consultation Consent',
    content: 'Test consent content',
    signatureData: 'test-signature',
    signedAt: new Date(),
    consentHash: 'test-hash-' + Date.now(),
    expiresAt: sevenDaysFromNow,
    reminderSent: false,
  }
});

// Trigger consent reminder cron
curl -X POST http://localhost:3000/api/cron/send-consent-reminders \
  -H "Authorization: Bearer test-secret"

// Check EmailQueue - should have consent reminder
```

### Test 5: Email Queue Processing

```bash
# Manually process queued emails
curl -X POST http://localhost:3000/api/cron/process-email-queue \
  -H "Authorization: Bearer test-secret"
```

**Check Logs**:
- "✅ Processed X emails, Y failed"
- Check EmailQueue table: status should be "SENT"

### Verify in Production

After deployment:

1. **Check Cron Logs**:
   - Vercel: Dashboard → Deployments → Functions → View logs
   - Railway: Dashboard → Deployments → View logs

2. **Monitor EmailQueue**:
```sql
-- Count pending emails
SELECT status, COUNT(*) FROM email_queue GROUP BY status;

-- View recent emails
SELECT id, to, subject, status, attempts, sentAt
FROM email_queue
ORDER BY createdAt DESC
LIMIT 10;
```

3. **Check Audit Logs**:
```sql
-- Recent consent reminders
SELECT * FROM audit_logs
WHERE action = 'SEND_CONSENT_REMINDER'
ORDER BY timestamp DESC
LIMIT 10;

-- Recent deletions
SELECT * FROM audit_logs
WHERE resource = 'Patient' AND action = 'DELETE'
ORDER BY timestamp DESC;
```

---

## Troubleshooting

### Issue: Emails Not Sending

**Symptoms**: EmailQueue has PENDING status for long time

**Solutions**:
1. Check email provider API key is correct
2. Verify `EMAIL_PROVIDER` env variable
3. Check provider rate limits
4. Review logs for error messages

**Debug**:
```bash
# Check failed emails
SELECT * FROM email_queue WHERE status = 'FAILED';

# Check last error
SELECT id, to, subject, lastError FROM email_queue WHERE status = 'FAILED';
```

### Issue: Cron Jobs Not Running

**Symptoms**: No activity in logs, no emails queued

**Solutions**:
1. Verify cron configuration (vercel.json or external service)
2. Check `CRON_SECRET` matches in env and requests
3. Ensure endpoints are deployed and accessible
4. Check cron service logs (Vercel dashboard, etc.)

**Debug**:
```bash
# Manually trigger each cron
curl -X POST https://app.holilabs.com/api/cron/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return success: true
```

### Issue: Appointment Reminders Not Sent

**Symptoms**: Appointments tomorrow but no reminders

**Solutions**:
1. Check appointment has `reminderSent: false`
2. Verify patient has email address
3. Check appointment status is SCHEDULED or CONFIRMED
4. Verify `APPOINTMENT_REMINDER_HOURS` env variable

**Debug**:
```sql
-- Find appointments needing reminders
SELECT id, patientId, startTime, reminderSent
FROM appointments
WHERE startTime > NOW()
  AND startTime < NOW() + INTERVAL '25 hours'
  AND reminderSent = false
  AND status IN ('SCHEDULED', 'CONFIRMED');
```

### Issue: Consent Reminders Not Sent

**Symptoms**: Consents expiring soon but no reminders

**Solutions**:
1. Check consent has `expiresAt` date
2. Verify consent is still active
3. Check `reminderSent: false`
4. Verify `CONSENT_REMINDER_DAYS` env variable

**Debug**:
```sql
-- Find consents needing reminders
SELECT id, patientId, type, expiresAt, reminderSent
FROM consents
WHERE isActive = true
  AND expiresAt IS NOT NULL
  AND expiresAt > NOW()
  AND expiresAt < NOW() + INTERVAL '8 days'
  AND reminderSent = false;
```

### Issue: Patient Deletion Not Working

**Symptoms**: Deletion request created but not completed

**Solutions**:
1. Check confirmation email was sent
2. Verify token hasn't expired (24 hours)
3. Check patient clicked confirmation link
4. Review audit logs for errors

**Debug**:
```sql
-- Check deletion requests
SELECT id, patientId, status, confirmedAt, executedAt
FROM deletion_requests
ORDER BY requestedAt DESC;

-- Check if patient was anonymized
SELECT id, firstName, lastName, email, deletedAt
FROM patients
WHERE deletedAt IS NOT NULL;
```

### Common Errors

**Error**: `Resend API key not configured`
- **Fix**: Add `RESEND_API_KEY` to environment variables

**Error**: `Unauthorized` (401)
- **Fix**: Ensure `CRON_SECRET` matches in request and env

**Error**: `Patient has no email`
- **Expected**: System skips and marks as sent to avoid retries

**Error**: `Failed to send email: rate limit exceeded`
- **Fix**: Reduce cron frequency or upgrade email provider plan

---

## Success Criteria

✅ All environment variables configured
✅ Database schema updated (EmailQueue + Consent fields)
✅ Cron jobs configured and running
✅ Test email successfully sent and received
✅ Appointment reminder queued for tomorrow's appointment
✅ Consent reminder queued for expiring consent
✅ Email queue processing every 5 minutes
✅ Audit logs show cron activity

---

## Next Steps

After successful deployment:

1. **Monitor Email Delivery**: Check EmailQueue daily for failed emails
2. **Review Logs**: Verify cron jobs run successfully
3. **Patient Testing**: Have real patient test deletion workflow
4. **Performance**: Monitor email queue size and processing time
5. **Compliance**: Review audit logs for regulatory reporting

---

## Support

For issues or questions:
- Review troubleshooting section above
- Check application logs
- Review Prisma Studio for database state
- Contact: support@holilabs.com

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Verified By**: _________________

