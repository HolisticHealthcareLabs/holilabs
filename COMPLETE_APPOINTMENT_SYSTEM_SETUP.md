# Complete Appointment Confirmation System - Setup Guide

## 🎯 What You're Building

An **automated appointment confirmation system** where:
1. **Doctors create appointments** in your dashboard (no external calendar needed!)
2. **System automatically sends reminders** every night at 8 PM for tomorrow's appointments
3. **Patients receive WhatsApp/Email/SMS** with a magic link
4. **Patients click one button** to confirm, reschedule, or cancel
5. **Doctors see updated status** in real-time (no manual follow-up needed)

---

## 📦 Services You Need (and Why)

### 1. **Resend** (Email Service) - ✅ YOU ALREADY HAVE THIS
**Cost**: FREE (3,000 emails/month)
**Why**: Sends beautiful HTML emails when WhatsApp/SMS fail
**What it does**:
- Sends appointment confirmation emails
- Provides backup when patient doesn't have WhatsApp
- Professional transactional email delivery

**Status**: ✅ You said you already set up Resend API key!

---

### 2. **Twilio** (WhatsApp + SMS) - ⚠️ YOU NEED THIS
**Cost**:
- WhatsApp Sandbox: FREE for testing
- WhatsApp Production: $0.005/message (half a cent)
- SMS: $0.02/message (2 cents)
- Total: ~$5-15/month for 1,000 patients

**Why**:
- **WhatsApp has 98% open rate** vs 20% for email
- **97% of LATAM users have WhatsApp** (vs 23% in US)
- This is your KILLER FEATURE - no competitor has this

**What it does**:
- Sends WhatsApp messages (PRIMARY channel)
- Falls back to SMS if WhatsApp unavailable
- Both use same Twilio account

**Setup Steps**:
1. Go to https://www.twilio.com/try-twilio
2. Sign up (get $15 free credits = ~500 WhatsApp messages)
3. Get WhatsApp Sandbox access (for testing)
4. Get 3 credentials:
   - `TWILIO_ACCOUNT_SID` (starts with AC...)
   - `TWILIO_AUTH_TOKEN` (keep secret!)
   - `TWILIO_WHATSAPP_NUMBER` (format: `whatsapp:+14155238886`)

---

### 3. **Vercel Cron** OR **GitHub Actions** (Automated Scheduler) - ✅ ALREADY CONFIGURED
**Cost**: FREE
**Why**: Triggers your reminder sending every night at 8 PM
**What it does**: Calls your API endpoint daily to send reminders

**Current Setup**:
- ✅ `vercel.json` already configured with cron job
- ✅ Runs daily at 8 PM: `"0 20 * * *"`
- ✅ Calls `/api/cron/send-appointment-reminders`

**Alternative** (if on DigitalOcean):
- Use GitHub Actions (see CONFIRMATION_SYSTEM_SETUP.md)
- Or use external service like cron-job.org (FREE)

---

### 4. **Calendar System** - ✅ YOU ALREADY HAVE THIS IN YOUR DATABASE!
**Cost**: FREE (built-in)
**Why**: You DON'T need Google Calendar or external integration!

**How it works**:
```
Your Prisma Database (PostgreSQL)
  ↓
appointments table (ALREADY EXISTS)
  ↓
Stores: startTime, endTime, patient, clinician, status
  ↓
Your dashboard creates appointments
  ↓
Cron job reads tomorrow's appointments
  ↓
Sends reminders automatically
```

**You DON'T need**:
- ❌ Google Calendar API
- ❌ Calendly
- ❌ Cal.com
- ❌ External calendar services

**You already have**:
- ✅ `/dashboard/appointments` page (doctors create appointments here)
- ✅ Prisma `appointment` model with all fields
- ✅ API endpoints to create/update appointments
- ✅ Everything stored in YOUR PostgreSQL database

---

## 🔧 Complete Setup Checklist

### Step 1: Environment Variables

Add these to your `.env` file:

```bash
# ✅ YOU ALREADY HAVE (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="Holi Labs <noreply@holilabs.com>"

# ⚠️ YOU NEED TO ADD (Twilio WhatsApp)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# ✅ GENERATE THIS NOW (Cron Security)
CRON_SECRET="generate-with-openssl-rand-base64-32"

# ✅ YOU ALREADY HAVE
NEXT_PUBLIC_APP_URL="https://holilabs-lwp6y.ondigitalocean.app"
DATABASE_URL="postgresql://..."
```

**Generate CRON_SECRET now**:
```bash
openssl rand -base64 32
```
Copy the output and add it to `.env`

---

### Step 2: Set Up Twilio WhatsApp (10 minutes)

1. **Create Twilio Account**:
   - Go to https://www.twilio.com/try-twilio
   - Sign up with email
   - Verify phone number
   - Get $15 free credits

2. **Get WhatsApp Sandbox**:
   - Go to Twilio Console → Messaging → Try it Out → Send a WhatsApp message
   - You'll see: "Send `join <code>` to `+1 415 523 8886`"
   - On YOUR phone, open WhatsApp and send that message
   - Wait for confirmation: "You are all set!"

3. **Get Credentials**:
   - Dashboard shows `Account SID` (starts with AC)
   - Click "Show" to reveal `Auth Token`
   - WhatsApp number: `whatsapp:+14155238886` (from sandbox page)

4. **Add to Environment Variables**:
   ```bash
   TWILIO_ACCOUNT_SID="AC123..." # From dashboard
   TWILIO_AUTH_TOKEN="abc123..." # Click "Show" to reveal
   TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886" # From sandbox
   ```

---

### Step 3: How Doctors Use the System

#### Option A: Automatic Confirmations (Recommended)
**What happens**:
1. Doctor creates appointment in `/dashboard/appointments`
2. System automatically sends reminder at 8 PM the night before
3. Patient gets WhatsApp message with confirmation link
4. Patient clicks → Confirms/Reschedules/Cancels
5. Doctor sees status update in dashboard

**No doctor action needed after creating appointment!**

#### Option B: Manual Confirmations (Optional)
**What you'd need to add**:
- Toggle in appointment creation form: "Send confirmation reminder" (ON/OFF)
- Store preference in database: `appointment.sendReminder = true/false`
- Cron job checks this flag before sending

**I can add this UI toggle if you want!**

---

### Step 4: Test the System

#### Test 1: Create Test Appointment
```bash
# Start dev server
pnpm dev

# Go to http://localhost:3000/dashboard/appointments
# Click "New Appointment"
# Fill in:
#   - Patient: Select patient with phone number
#   - Date: Tomorrow
#   - Time: Any time
#   - Type: IN_PERSON or VIRTUAL
# Click "Create"
```

#### Test 2: Manually Trigger Reminder
```bash
# Generate a CRON_SECRET first
export CRON_SECRET="your-generated-secret"

# Trigger the cron job manually
curl -X POST http://localhost:3000/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# You should see:
{
  "success": true,
  "data": {
    "total": 1,
    "sent": 1,
    "failed": 0
  },
  "message": "Sent 1 reminders, 0 failed"
}
```

#### Test 3: Check Your WhatsApp
- Open WhatsApp on your phone
- You should receive:
```
🏥 *Confirma tu Cita Médica*

¡Hola Maria!

Tienes una cita mañana:
👨‍⚕️ Dr. Juan Pérez
📅 15 de Octubre, 2025 - 10:00 AM

*Por favor, confirma tu asistencia:*
https://holilabs.com/confirm/abc123

✅ Confirmar
📅 Reagendar
❌ Cancelar

_Enlace válido por 24 horas_

*Holi Labs - Salud Digital*
```

#### Test 4: Click Confirmation Link
- Click the link in WhatsApp
- Should open beautiful gradient confirmation page
- Click "Confirmar"
- Check dashboard - status should update to "CONFIRMED"

---

## 🎨 Reschedule Feature - How It Works

**Current Setup**:
- Confirmation page has 3 buttons: Confirm, Reschedule, Cancel
- "Reschedule" currently just marks appointment as "RESCHEDULE_REQUESTED"
- Doctor sees this status and contacts patient manually

**Option 1: Build Custom Calendar Picker** (Recommended)
**What you'd get**:
- Patient clicks "Reschedule"
- Opens calendar showing doctor's available slots
- Patient picks new time
- Doctor approves/rejects reschedule request

**I can build this! Would take:**
- Calendar UI component (react-big-calendar or FullCalendar)
- API to fetch doctor's availability
- Reschedule request approval flow
- ~2-3 hours of work

**Option 2: Use External Service** (Quick but costs money)
- Calendly ($10-15/month)
- Cal.com (FREE, self-hosted)
- Integrate their iframe into reschedule page

**Option 3: Simple Time Picker** (Fastest)
- Patient picks any date/time they want
- Doctor approves later
- No availability checking

**Which do you prefer?** I recommend Option 1 (custom) since you already have the database.

---

## 💰 Cost Breakdown

### Monthly Costs for 1,000 Patients

| Service | Cost | Notes |
|---------|------|-------|
| **Resend (Email)** | $0 | FREE tier: 3,000/month |
| **Twilio WhatsApp** | $5 | 1,000 messages × $0.005 |
| **Twilio SMS** | $0 | Only if WhatsApp fails (rare) |
| **Vercel Cron** | $0 | FREE on Hobby plan |
| **Database** | $0 | Already have PostgreSQL |
| **Calendar** | $0 | Built-in (no external service) |
| **TOTAL** | **$5/month** | 🎉 |

**ROI**:
- Manual calls: 30 min/day × $15/hr = $225/month
- Automated: $5/month
- **Savings: $220/month** 🚀

---

## 🚀 Production Deployment

### Add to DigitalOcean App Platform

1. Go to your app → Settings → Environment Variables
2. Click "Edit"
3. Add:
```
TWILIO_ACCOUNT_SID = ACxxxxx (Encrypt: Yes)
TWILIO_AUTH_TOKEN = xxxxx (Encrypt: Yes)
TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
RESEND_API_KEY = re_xxxxx (Encrypt: Yes)
EMAIL_FROM = Holi Labs <noreply@holilabs.com>
CRON_SECRET = your-generated-secret (Encrypt: Yes)
```
4. Click "Save" → Triggers new deployment

### Set Up Cron Job (DigitalOcean doesn't support Vercel cron)

**Option A: GitHub Actions** (Recommended)
Create `.github/workflows/send-reminders.yml`:
```yaml
name: Send Appointment Reminders
on:
  schedule:
    - cron: '0 20 * * *'  # 8 PM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder API
        run: |
          curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repo → Settings → Secrets.

**Option B: External Cron Service** (Easiest)
1. Go to https://cron-job.org (FREE)
2. Create account
3. Add job:
   - URL: `https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders`
   - Schedule: `0 20 * * *` (8 PM daily)
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

---

## ✅ Final Checklist

Before going live, verify:

- [ ] Twilio account created and WhatsApp sandbox joined
- [ ] All environment variables added to production
- [ ] CRON_SECRET generated and added
- [ ] Test appointment created for tomorrow
- [ ] Cron job triggered manually (verified reminders send)
- [ ] WhatsApp message received on your phone
- [ ] Confirmation link opens correctly
- [ ] Clicking "Confirmar" updates database
- [ ] Dashboard shows updated status
- [ ] Cron job scheduled (GitHub Actions or cron-job.org)
- [ ] Production WhatsApp number requested (optional, after testing)

---

## 🎯 Next Steps

1. **Right now**:
   - Add Twilio credentials to `.env`
   - Test WhatsApp sending locally
   - Verify confirmation flow works

2. **Today**:
   - Add environment variables to production
   - Set up cron job (GitHub Actions or cron-job.org)
   - Test end-to-end in production

3. **This week**:
   - Let me build the reschedule calendar picker (Option 1)
   - Add doctor toggle for auto-confirmation ON/OFF
   - Request production WhatsApp number from Twilio

4. **Next week**:
   - Go live with real patients!
   - Monitor logs and confirmation rates
   - Optimize based on usage

---

## 📞 Questions?

**Q: Do I need Google Calendar?**
A: NO! You have appointments in your database already. That's your "calendar."

**Q: Do I need Calendly or Cal.com?**
A: NO! Unless you want external scheduling. Your dashboard already creates appointments.

**Q: What if patient wants to reschedule?**
A: Currently marks as "RESCHEDULE_REQUESTED" → doctor calls them. I can build automatic reschedule picker if you want!

**Q: Can doctors turn off auto-confirmations?**
A: Not yet, but I can add a toggle in 15 minutes. Want me to?

**Q: What about SMS?**
A: Same Twilio account! But WhatsApp is cheaper ($0.005 vs $0.02) and has higher open rates.

---

Built with ❤️ by Claude Code
