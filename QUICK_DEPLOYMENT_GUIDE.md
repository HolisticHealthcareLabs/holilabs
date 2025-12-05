# Quick Deployment Guide - Phase 2

**Ready to deploy in 15 minutes** ⚡

---

## 1. Environment Setup (2 min)

Add to `.env`:
```bash
# Email (Choose Resend - easiest)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx  # Get from https://resend.com
FROM_EMAIL=noreply@holilabs.com

# Security
CRON_SECRET=$(openssl rand -hex 32)

# Already have
NEXT_PUBLIC_APP_URL=your-production-url
```

---

## 2. Database Update (3 min)

```bash
cd apps/web

# Push new tables and fields
npx prisma db push

# Generate client
npx prisma generate
```

**What's added**:
- `EmailQueue` table (for background email processing)
- `Consent.expiresAt` field
- `Consent.reminderSent` field

---

## 3. Build & Deploy (5 min)

```bash
# Build
pnpm build

# Test locally first
pnpm start

# Then deploy to Vercel/Railway
git add .
git commit -m "feat: Add email infrastructure and automation"
git push
```

---

## 4. Configure Cron Jobs (5 min)

**Option A - Vercel** (Recommended):

Create `vercel.json`:
```json
{
  "crons": [
    {"path": "/api/cron/process-email-queue", "schedule": "*/5 * * * *"},
    {"path": "/api/cron/send-appointment-reminders", "schedule": "0 * * * *"},
    {"path": "/api/cron/send-consent-reminders", "schedule": "0 8 * * *"},
    {"path": "/api/cron/expire-consents", "schedule": "0 0 * * *"}
  ]
}
```

Push and deploy. Done!

**Option B - External Cron Service**:

1. Go to [cron-job.org](https://cron-job.org)
2. Add these endpoints:
   - `https://your-app.com/api/cron/process-email-queue` (every 5 min)
   - `https://your-app.com/api/cron/send-appointment-reminders` (hourly)
   - `https://your-app.com/api/cron/send-consent-reminders` (daily 8am)
   - `https://your-app.com/api/cron/expire-consents` (daily midnight)
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 5. Test (5 min total)

### Test Email Service
```bash
curl -X POST https://your-app.com/api/cron/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return: {"success":true,"processed":0,"failed":0}
```

### Test in Database
```sql
-- Check EmailQueue table exists
SELECT COUNT(*) FROM email_queue;

-- Check Consent has new fields
SELECT id, expiresAt, reminderSent FROM consents LIMIT 1;
```

### Monitor Logs
- Vercel: Dashboard → Functions → Logs
- Railway: Dashboard → Deployments → Logs

Look for:
- "🔄 Starting email queue processing..."
- "🔔 Starting appointment reminder processing..."
- "📋 Starting consent reminder processing..."

---

## ✅ You're Done!

The system will now:
- ✉️ Process emails every 5 minutes
- 📅 Send appointment reminders 24 hours before
- 📋 Send consent reminders 7 days before expiration
- ⏰ Auto-expire outdated consents daily

---

## 🆘 Quick Troubleshooting

**Emails not sending?**
- Check `RESEND_API_KEY` is correct
- Verify `EMAIL_PROVIDER=resend`

**Cron jobs not running?**
- Check `CRON_SECRET` matches
- Verify endpoints are accessible
- Check logs for errors

**Database error?**
- Run `npx prisma db push` again
- Check Prisma Studio for tables

---

## 📚 Full Documentation

- **Phase 1**: `PRIVACY_CONSENT_IMPLEMENTATION_COMPLETE.md` (67KB)
- **Phase 2**: `INFRASTRUCTURE_AUTOMATION_DEPLOYMENT.md`
- **Summary**: `COMPLETE_IMPLEMENTATION_SUMMARY.md`

---

**Need help?** Check the full deployment docs above or logs for detailed error messages.

