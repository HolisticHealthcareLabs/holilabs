# Appointment Confirmation System - Setup Guide

## 🎉 What's Been Built

A complete automated appointment confirmation system with:
- ✅ Beautiful gradient-based confirmation page
- ✅ Multi-channel notifications (Push, SMS, Email)
- ✅ Automated daily reminders (8 PM every night)
- ✅ Self-service rescheduling
- ✅ Patient cancellation with reason
- ✅ Real-time clinician notifications
- ✅ Confirmation statistics dashboard

---

## 🔧 Environment Variables Required

Add these to your `.env` file and DigitalOcean/Vercel environment variables:

### Required for WhatsApp + SMS (Twilio)
```bash
TWILIO_ACCOUNT_SID=AC...  # From Twilio Console
TWILIO_AUTH_TOKEN=...     # From Twilio Console
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # WhatsApp Sandbox number
TWILIO_PHONE_NUMBER=+1234567890  # SMS fallback (optional)
```

**Cost**:
- WhatsApp: $0.005 per message (~$5/month for 1,000 patients)
- SMS: $0.02 per message (only used as last resort)
- **98% open rate on WhatsApp** vs 20% email vs 95% SMS

**Setup Steps**:
1. Go to https://twilio.com/try-twilio
2. Sign up (get $15 free credits)
3. Get WhatsApp Sandbox: Messaging → Try it Out → Send a WhatsApp message
4. Send `join <code>` to `+1 415 523 8886` from your phone
5. Get Account SID and Auth Token from dashboard
6. Add to environment variables

### Required for Email (Resend)
```bash
RESEND_API_KEY=re_...     # From Resend Dashboard
EMAIL_FROM=Holi Labs <noreply@holilabs.com>  # Your sender email
```

**Cost**: FREE (3,000 emails/month free tier)

**Setup Steps**:
1. Go to https://resend.com
2. Sign up for free account
3. Verify your domain (or use resend.dev for testing)
4. Generate API key
5. Add to environment variables

### Required for Cron Job Security
```bash
CRON_SECRET=your-random-secret-here  # Generate with: openssl rand -base64 32
```

**Setup**:
```bash
# Generate a secure secret
openssl rand -base64 32

# Add to environment variables
CRON_SECRET=the-generated-secret
```

### Required for Confirmation Links
```bash
NEXT_PUBLIC_APP_URL=https://holilabs-lwp6y.ondigitalocean.app  # Your production URL
```

---

## 🚀 Deployment Steps

### 1. Add Environment Variables to Production

**DigitalOcean App Platform**:
```bash
# Go to your app → Settings → Environment Variables
# Add all the variables above
```

**Vercel** (if using):
```bash
# Go to Project → Settings → Environment Variables
# Add all the variables above
```

### 2. Enable Vercel Cron (Automatic)

The cron job is already configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-appointment-reminders",
      "schedule": "0 20 * * *"  // Every day at 8 PM
    }
  ]
}
```

**On DigitalOcean**: Use GitHub Actions or external cron service (see below)

### 3. Alternative: GitHub Actions Cron (DigitalOcean)

Create `.github/workflows/send-reminders.yml`:
```yaml
name: Send Appointment Reminders

on:
  schedule:
    - cron: '0 20 * * *'  # Every day at 8 PM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder API
        run: |
          curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub Secrets.

### 4. Alternative: External Cron Service

Use **cron-job.org** (free):
1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - **URL**: `https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders`
   - **Schedule**: Every day at 20:00 (8 PM)
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 🧪 Testing the System

### 1. Test Confirmation Page Locally

```bash
# Create a test appointment with confirmation link
pnpm dev

# In another terminal, create test appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "your-patient-id",
    "clinicianId": "your-clinician-id",
    "startTime": "2025-01-16T10:00:00Z",
    "endTime": "2025-01-16T10:30:00Z",
    "type": "IN_PERSON",
    "title": "Test Appointment"
  }'

# Then manually create confirmation link in code
```

### 2. Test Notification Sending

```bash
# Test SMS (requires Twilio configured)
curl http://localhost:3000/api/test/send-sms

# Test Email (requires Resend configured)
curl http://localhost:3000/api/test/send-email
```

### 3. Test Cron Job Manually

```bash
# Trigger reminder sending
curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Response should show how many reminders were sent
{
  "success": true,
  "data": {
    "total": 5,
    "sent": 5,
    "failed": 0
  },
  "message": "Sent 5 reminders, 0 failed"
}
```

### 4. Test Confirmation Flow

1. **Create appointment** for tomorrow
2. **Wait for cron job** (8 PM) or trigger manually
3. **Check patient's email/SMS** - should receive confirmation link
4. **Click link** → Should open beautiful gradient page
5. **Click "Confirmar"** → Should see success message
6. **Check dashboard** → Appointment should show as "CONFIRMED"

---

## 📊 Monitoring & Analytics

### Check Confirmation Stats

```bash
# Get stats for your appointments
curl https://holilabs-lwp6y.ondigitalocean.app/api/appointments/confirmation-stats \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "stats": {
      "total": 20,
      "confirmed": 15,
      "pending": 3,
      "rescheduleRequested": 1,
      "cancelled": 1,
      "noResponse": 0
    },
    "confirmationRate": 75,
    "todayCount": 5,
    "todayConfirmed": 4
  }
}
```

### View Logs

**Check cron job execution**:
```bash
# Vercel
vercel logs --follow

# DigitalOcean
doctl apps logs YOUR_APP_ID --follow
```

**Look for these log events**:
- `cron_job_started` - Cron job triggered
- `appointment_reminder_sent` - Reminder sent successfully
- `appointment_confirmation_action` - Patient confirmed/cancelled/rescheduled

---

## 🎨 Customization

### Change Reminder Time

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-appointment-reminders",
      "schedule": "0 19 * * *"  // 7 PM instead of 8 PM
    }
  ]
}
```

Cron format: `minute hour day month weekday`
- `0 20 * * *` = 8 PM every day
- `0 9 * * 1-5` = 9 AM Monday-Friday only
- `0 */6 * * *` = Every 6 hours

### Customize Email Template

Edit `apps/web/src/lib/notifications/email.ts` → `generateConfirmationEmailHTML()`

### Customize SMS Message

Edit `apps/web/src/lib/notifications/sms.ts` → `sendAppointmentConfirmationSMS()`

### Change Confirmation Page Design

Edit `apps/web/src/app/confirm/[token]/page.tsx`

---

## 💰 Cost Breakdown

For **1,000 patients per month**:

| Channel | Cost | When Used |
|---------|------|-----------|
| **Push Notifications** | $0 | First choice (if patient has app) |
| **Email** | $0 | Second choice (Resend free tier) |
| **SMS** | $20-30 | Fallback (if no push/email) |

**Best case** (90% have push): $0-6/month
**Worst case** (all SMS): $20-30/month
**Typical** (50/50): $10-15/month

**Compare to manual**:
- Staff time: 30 min/day × 30 days = 15 hours/month
- At $15/hour = **$225/month in labor costs**
- **Savings**: $195-215/month

---

## 🆘 Troubleshooting

### Reminders Not Sending

**Check**:
1. Cron job configured? (vercel.json or GitHub Actions)
2. Environment variables set? (TWILIO_*, RESEND_API_KEY)
3. CRON_SECRET matches?
4. Database has appointments for tomorrow?

**Debug**:
```bash
# Check logs
vercel logs --follow

# Manually trigger
curl -X POST YOUR_URL/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### SMS Not Sending

**Check**:
1. Twilio account active?
2. Phone number verified?
3. Credits available?
4. Environment variables correct?

**Debug**:
```bash
# Check Twilio logs
# Go to Twilio Console → Monitor → Logs → Messaging
```

### Email Not Sending

**Check**:
1. Resend API key valid?
2. Domain verified? (or using resend.dev)
3. Within free tier limits? (3,000/month)

**Debug**:
```bash
# Check Resend logs
# Go to Resend Dashboard → Logs
```

### Confirmation Link Doesn't Work

**Check**:
1. NEXT_PUBLIC_APP_URL set correctly?
2. Token still valid? (check confirmationToken field)
3. Appointment not cancelled/completed?

---

## ✅ Checklist Before Launch

- [ ] Added all environment variables to production
- [ ] Tested SMS sending (send to your phone)
- [ ] Tested email sending (send to your email)
- [ ] Tested confirmation page (click link, confirm appointment)
- [ ] Configured cron job (Vercel/GitHub Actions/cron-job.org)
- [ ] Tested cron job manually
- [ ] Monitored logs for errors
- [ ] Set up Twilio billing alerts ($50/month limit)
- [ ] Verified Resend domain
- [ ] Tested reschedule flow
- [ ] Tested cancellation flow
- [ ] Checked dashboard shows correct stats

---

## 🎯 What Happens Now?

**Every day at 8 PM**:
1. Cron job triggers
2. System finds tomorrow's appointments
3. For each appointment:
   - Generates magic link
   - Tries push notification (FREE)
   - Falls back to SMS ($0.02)
   - Falls back to email (FREE)
4. Patient receives link
5. Patient clicks → Confirms/Reschedules/Cancels
6. Doctor sees updated status in dashboard

**Zero manual work required!**

---

## 📞 Support

Questions? Issues?
- Check logs first
- Review troubleshooting section
- Test each component individually
- Check environment variables

Built with ❤️ by Claude Code
