# 📋 DigitalOcean Secrets Deployment Checklist

**Purpose:** Step-by-step guide to add environment variables to DigitalOcean App Platform
**Estimated Time:** 15-20 minutes
**Status:** Ready to execute

---

## 📖 Overview

This checklist guides you through adding all production secrets to DigitalOcean App Platform. Follow each step in order to ensure proper configuration.

---

## 🔐 Prerequisites (Complete First)

- [ ] **1. Read `PRODUCTION_SECRETS_GENERATED.md`** and have it open for reference
- [ ] **2. Have access to DigitalOcean account** with admin permissions
- [ ] **3. Verify app is running:** https://holilabs-lwp6y.ondigitalocean.app/api/health
- [ ] **4. Have all external API keys ready** (Supabase, Anthropic, Resend, etc.)
- [ ] **5. Backup current environment variables** (just in case):
  - Go to: Apps → holilabs-lwp6y → Settings → Environment Variables
  - Click: Export (if available) or take screenshots

---

## 🚀 Deployment Steps

### Phase 1: Access DigitalOcean App Platform

- [ ] **Step 1.1:** Go to https://cloud.digitalocean.com/apps
- [ ] **Step 1.2:** Find and click on app: **holilabs-lwp6y**
- [ ] **Step 1.3:** Click on the **Settings** tab
- [ ] **Step 1.4:** Scroll to **App-Level Environment Variables** section
- [ ] **Step 1.5:** Click **Edit** button

---

### Phase 2: Add CRITICAL Variables (Required for App to Start)

⏱️ Time: ~5 minutes
🎯 Priority: MUST COMPLETE

#### 2.1 Database

```bash
# Variable name (exactly as shown):
DATABASE_URL

# Value: Get from DigitalOcean → Databases → Your PostgreSQL cluster
# Format: postgresql://username:password@host:port/database?sslmode=require
# Example: postgresql://doadmin:secret@db-postgresql-nyc1-12345.ondigitalocean.com:25060/defaultdb?sslmode=require

# Encryption: ✅ Mark as ENCRYPTED (click lock icon)
```

- [ ] DATABASE_URL added and encrypted

#### 2.2 Authentication Secrets

```bash
# Variable 1:
SESSION_SECRET="287dd2c3bb327618deb091442bf66b7c39fc4e5e89036253dfcac0b32f3c0458"
# Encryption: ✅ Mark as ENCRYPTED

# Variable 2:
NEXTAUTH_SECRET="d7f6464bd1b7d4380f2b74350692eace34e58ec27ce2ae77a66e2cfa6c45c032"
# Encryption: ✅ Mark as ENCRYPTED

# Variable 3:
NEXTAUTH_URL="https://holilabs-lwp6y.ondigitalocean.app"
# Encryption: ⬜ Leave as plain text (not sensitive)
```

- [ ] SESSION_SECRET added and encrypted
- [ ] NEXTAUTH_SECRET added and encrypted
- [ ] NEXTAUTH_URL added (plain text)

#### 2.3 Supabase Configuration

```bash
# Variable 1:
NEXT_PUBLIC_SUPABASE_URL="https://yyteqajwjjrubiktornb.supabase.co"
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# Encryption: ⬜ Leave as plain text (public URL)

# Variable 2:
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Get from: Supabase Dashboard → API → 'anon' 'public' key
# Encryption: ⬜ Leave as plain text (designed to be public)

# Variable 3:
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Get from: Supabase Dashboard → API → 'service_role' 'secret' key
# Encryption: ✅ Mark as ENCRYPTED (this is SECRET)
```

- [ ] NEXT_PUBLIC_SUPABASE_URL added (plain text)
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY added (plain text)
- [ ] SUPABASE_SERVICE_ROLE_KEY added and encrypted

#### 2.4 PHI Encryption

```bash
# Variable:
ENCRYPTION_KEY="oKk4xJchl5R13mpQngudsTSui5l+BA/54iIzdnwXkbI="
# Encryption: ✅ Mark as ENCRYPTED
# ⚠️  CRITICAL: Never lose this key or data cannot be decrypted
```

- [ ] ENCRYPTION_KEY added and encrypted

#### 2.5 Application Configuration

```bash
# Variable 1:
NEXT_PUBLIC_APP_URL="https://holilabs-lwp6y.ondigitalocean.app"
# Encryption: ⬜ Leave as plain text

# Variable 2:
NODE_ENV="production"
# Encryption: ⬜ Leave as plain text
```

- [ ] NEXT_PUBLIC_APP_URL added (plain text)
- [ ] NODE_ENV added (plain text)

**✅ Checkpoint:** 10 CRITICAL variables should now be added

---

### Phase 3: Add HIGH PRIORITY Variables (Core Features)

⏱️ Time: ~5 minutes
🎯 Priority: STRONGLY RECOMMENDED

#### 3.1 Security Tokens

```bash
# Variable 1:
CRON_SECRET="89f4c7c877d3db8f1634f9470e2264e4a94d92da2428dfd36f0931bd86b9950e"
# Encryption: ✅ Mark as ENCRYPTED

# Variable 2:
DEID_SECRET="55453c0752116955eb29dc1e399879ce719f59da7ce22aa684a25d1132809ef0"
# Encryption: ✅ Mark as ENCRYPTED
```

- [ ] CRON_SECRET added and encrypted
- [ ] DEID_SECRET added and encrypted

#### 3.2 AI Services

```bash
# Variable:
ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
# Get from: https://console.anthropic.com/settings/keys
# Encryption: ✅ Mark as ENCRYPTED

# Configuration variables (plain text):
AI_PRIMARY_PROVIDER="claude"
AI_FALLBACK_ENABLED="true"
AI_CACHE_ENABLED="true"
AI_CACHE_TTL="86400"
AI_RATE_LIMIT_PER_USER="50"
AI_FREE_TIER_LIMIT="10"
AI_STARTER_TIER_LIMIT="50"
AI_PRO_TIER_LIMIT="999999"
AI_MONTHLY_BUDGET_USD="500"
AI_ALERT_THRESHOLD_PERCENT="80"
```

- [ ] ANTHROPIC_API_KEY added and encrypted
- [ ] AI configuration variables added (9 variables, plain text)

#### 3.3 Email Service

```bash
# Variable:
RESEND_API_KEY="re_your_resend_api_key"
# Get from: https://resend.com/api-keys
# ⚠️  If old key was exposed, REVOKE IT FIRST
# Encryption: ✅ Mark as ENCRYPTED
```

- [ ] RESEND_API_KEY added and encrypted

#### 3.4 Push Notifications

```bash
# Variable 1:
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BN7YfrjWiRVfONAmWHH35FMTpUnQW2YqlibSLnUvKC3gv2tUYxT5rGO3pcSqasbmL3y80LgE7PNixYnYLJSRLIc"
# Encryption: ⬜ Leave as plain text (public key)

# Variable 2:
VAPID_PRIVATE_KEY="mpuWSbwQh10l8hU2iywZSFnKFnEggCqb-i7kAKzy2n0"
# Encryption: ✅ Mark as ENCRYPTED

# Variable 3:
VAPID_SUBJECT="mailto:admin@holilabs.com"
# Encryption: ⬜ Leave as plain text
```

- [ ] NEXT_PUBLIC_VAPID_PUBLIC_KEY added (plain text)
- [ ] VAPID_PRIVATE_KEY added and encrypted
- [ ] VAPID_SUBJECT added (plain text)

#### 3.5 Error Monitoring (Sentry)

```bash
# Variable 1:
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/your-project"
# Get from: Sentry → Project Settings → Client Keys (DSN)
# Encryption: ⬜ Leave as plain text (public DSN)

# Variable 2 (optional):
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
# Get from: Sentry → Settings → Auth Tokens
# Encryption: ✅ Mark as ENCRYPTED

# Configuration:
SENTRY_ORG="holi-labs"
SENTRY_PROJECT="holi-labs-web"
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING="1"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

- [ ] NEXT_PUBLIC_SENTRY_DSN added (plain text)
- [ ] SENTRY_AUTH_TOKEN added and encrypted (if available)
- [ ] SENTRY_ORG added (plain text)
- [ ] SENTRY_PROJECT added (plain text)
- [ ] SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING added (plain text)
- [ ] NEXT_PUBLIC_APP_VERSION added (plain text)

#### 3.6 Analytics (PostHog)

```bash
# Variable 1:
NEXT_PUBLIC_POSTHOG_KEY="phc_your_project_key"
# Get from: PostHog → Project Settings → Project API Key
# Encryption: ⬜ Leave as plain text (public key)

# Variable 2:
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
# ⚠️  MUST use US host for HIPAA compliance
# Encryption: ⬜ Leave as plain text
```

- [ ] NEXT_PUBLIC_POSTHOG_KEY added (plain text)
- [ ] NEXT_PUBLIC_POSTHOG_HOST added (plain text)

#### 3.7 Additional Configuration

```bash
# Security:
ALLOWED_ORIGINS="https://holilabs-lwp6y.ondigitalocean.app,https://holilabs.com,https://www.holilabs.com"

# Logging:
LOG_LEVEL="info"
```

- [ ] ALLOWED_ORIGINS added (plain text)
- [ ] LOG_LEVEL added (plain text)

**✅ Checkpoint:** ~30 variables should now be added total

---

### Phase 4: OPTIONAL - Add Medium Priority Variables

⏱️ Time: ~5 minutes (optional)
🎯 Priority: OPTIONAL (can be added later)

#### 4.1 Payments (Stripe) - Optional

```bash
# Only add if you're ready to process payments:
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# ⚠️  Use PRODUCTION keys (sk_live_*), not test keys (sk_test_*)
# Encryption: ✅ Mark as ENCRYPTED for STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
# ⬜ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY can be plain text
```

- [ ] Stripe variables added (or skipped for now)

#### 4.2 Rate Limiting (Upstash) - Recommended

```bash
# Recommended for production to prevent API abuse:
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Get from: https://console.upstash.com → Select database → REST API
# Encryption: ✅ Mark UPSTASH_REDIS_REST_TOKEN as ENCRYPTED
```

- [ ] Upstash variables added (or skipped for now)

#### 4.3 Additional AI Providers - Optional

```bash
# Optional fallback AI providers:
GOOGLE_AI_API_KEY="your-google-ai-key"
DEEPGRAM_API_KEY="your-deepgram-key"
OPENAI_API_KEY="sk-your-openai-key"

# Encryption: ✅ Mark as ENCRYPTED
```

- [ ] Additional AI providers added (or skipped for now)

---

### Phase 5: Review and Save

- [ ] **Step 5.1:** Scroll through all variables and verify:
  - No typos in variable names
  - No extra spaces in values
  - All secret values are marked as ENCRYPTED (🔒)
  - All public values are plain text

- [ ] **Step 5.2:** Count total variables:
  - CRITICAL: 10 variables
  - HIGH: ~20 variables
  - Total minimum: ~30 variables

- [ ] **Step 5.3:** Click **Save** button

- [ ] **Step 5.4:** Confirm the save when prompted

---

### Phase 6: Wait for Redeployment

- [ ] **Step 6.1:** DigitalOcean will automatically trigger a redeployment
- [ ] **Step 6.2:** Monitor the deployment:
  - Go to: Apps → holilabs-lwp6y → **Activity** tab
  - Watch for "Deploying" status
  - Wait for "Deployed" status (typically 5-10 minutes)

- [ ] **Step 6.3:** Check deployment logs if deployment fails:
  - Go to: Apps → holilabs-lwp6y → **Runtime Logs** tab
  - Look for error messages related to environment variables

**⏱️ Estimated wait time:** 5-10 minutes

---

## ✅ Post-Deployment Verification

### Test 1: Health Check (CRITICAL)

```bash
# Run this command:
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# Expected response:
{
  "status": "healthy",
  "database": true,
  "timestamp": "2025-10-25T00:00:00.000Z"
}
```

- [ ] **Test 1 passed:** Health check returns `"database": true`
- [ ] **Test 1 failed:** If `"database": false`, check DATABASE_URL value

### Test 2: Authentication (CRITICAL)

- [ ] **Step 2.1:** Open https://holilabs-lwp6y.ondigitalocean.app in browser
- [ ] **Step 2.2:** Try to log in with test account
- [ ] **Step 2.3:** Verify login works (no session errors)
- [ ] **Test 2 passed:** Successfully logged in
- [ ] **Test 2 failed:** Check SESSION_SECRET and NEXTAUTH_SECRET

### Test 3: Supabase Connection (CRITICAL)

- [ ] **Step 3.1:** After logging in, try to upload a document (if available)
- [ ] **Step 3.2:** Verify file uploads work
- [ ] **Test 3 passed:** File upload successful
- [ ] **Test 3 failed:** Check Supabase keys

### Test 4: AI Features (HIGH)

- [ ] **Step 4.1:** Try to use AI scribe feature
- [ ] **Step 4.2:** Verify AI responses work
- [ ] **Test 4 passed:** AI features working
- [ ] **Test 4 failed:** Check ANTHROPIC_API_KEY

### Test 5: Email Sending (HIGH)

- [ ] **Step 5.1:** Trigger a test email (password reset, appointment reminder)
- [ ] **Step 5.2:** Check if email was received
- [ ] **Test 5 passed:** Email received
- [ ] **Test 5 failed:** Check RESEND_API_KEY

### Test 6: Push Notifications (HIGH)

- [ ] **Step 6.1:** Subscribe to push notifications in browser
- [ ] **Step 6.2:** Trigger a test notification
- [ ] **Step 6.3:** Verify notification appears
- [ ] **Test 6 passed:** Push notification received
- [ ] **Test 6 failed:** Check VAPID keys

### Test 7: Error Monitoring (HIGH)

- [ ] **Step 7.1:** Go to https://sentry.io
- [ ] **Step 7.2:** Check if events are being received
- [ ] **Test 7 passed:** Sentry receiving events
- [ ] **Test 7 failed:** Check NEXT_PUBLIC_SENTRY_DSN

### Test 8: Analytics (HIGH)

- [ ] **Step 8.1:** Go to https://app.posthog.com
- [ ] **Step 8.2:** Check if events are being tracked
- [ ] **Test 8 passed:** PostHog receiving events
- [ ] **Test 8 failed:** Check NEXT_PUBLIC_POSTHOG_KEY

---

## 🚨 Troubleshooting

### Issue 1: Deployment Fails

**Symptoms:**
- App shows "Deployment Failed" status
- Red X in Activity tab

**Solution:**
1. Go to: Apps → holilabs-lwp6y → Runtime Logs
2. Look for error messages mentioning environment variables
3. Common issues:
   - Typo in variable name
   - Missing required variable
   - Invalid value format (e.g., DATABASE_URL format incorrect)
4. Fix the issue and save again (will trigger redeployment)

### Issue 2: Database Connection Fails

**Symptoms:**
- Health check returns `"database": false`
- Errors in logs: "connection refused" or "authentication failed"

**Solution:**
1. Verify DATABASE_URL format:
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```
2. Check that `?sslmode=require` is included
3. Verify database credentials are correct
4. Check database is running in DigitalOcean

### Issue 3: Authentication Doesn't Work

**Symptoms:**
- Can't log in
- Sessions immediately expire
- "Invalid session" errors

**Solution:**
1. Verify SESSION_SECRET is set and marked as ENCRYPTED
2. Verify NEXTAUTH_SECRET is set and marked as ENCRYPTED
3. Verify NEXTAUTH_URL matches your actual app URL
4. Clear browser cookies and try again

### Issue 4: Supabase Features Don't Work

**Symptoms:**
- File uploads fail
- Auth features broken
- "Unauthorized" errors

**Solution:**
1. Verify all 3 Supabase variables are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
2. Check that SUPABASE_SERVICE_ROLE_KEY is marked as ENCRYPTED
3. Verify keys are correct in Supabase dashboard

### Issue 5: AI Features Don't Work

**Symptoms:**
- AI scribe doesn't respond
- "API key invalid" errors

**Solution:**
1. Verify ANTHROPIC_API_KEY is set and marked as ENCRYPTED
2. Check that key is valid in Anthropic console
3. Check API usage limits haven't been exceeded

---

## 📊 Variables Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 10 | Required |
| 🟡 HIGH | ~20 | Recommended |
| 🔵 MEDIUM | ~10 | Optional |
| **TOTAL MINIMUM** | **~30** | **To be production-ready** |

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] All sensitive values (keys, tokens, secrets) are marked as ENCRYPTED 🔒
- [ ] No secrets are visible in Runtime Logs
- [ ] No secrets are exposed in client-side code (check browser DevTools → Network)
- [ ] DATABASE_URL includes `?sslmode=require`
- [ ] Using US PostHog host for HIPAA compliance
- [ ] PHI scrubbing configured in Sentry
- [ ] Auto-capture disabled in PostHog

---

## 📝 Next Steps After Deployment

- [ ] **1. Monitor for 24 hours**
  - Check Sentry for errors
  - Check PostHog for usage
  - Monitor application logs

- [ ] **2. Sign BAAs** (CRITICAL for HIPAA)
  - [ ] DigitalOcean BAA ($40/month Business Plus)
  - [ ] Supabase BAA ($599/month Enterprise)
  - [ ] PostHog BAA (FREE)
  - [ ] Anthropic BAA (FREE)

- [ ] **3. Schedule secret rotation**
  - Add calendar reminder for 30 days (session secrets)
  - Add calendar reminder for 90 days (API keys)
  - Add calendar reminder for 180 days (encryption key)

- [ ] **4. Document in password manager**
  - Save all secrets in 1Password/LastPass
  - Add secret rotation dates
  - Add recovery instructions

- [ ] **5. Delete sensitive files**
  - [ ] Delete `PRODUCTION_SECRETS_GENERATED.md`
  - [ ] Or remove all actual secret values from file

- [ ] **6. Update documentation**
  - Mark ENVIRONMENT_STATUS.md as completed
  - Update CURRENT_STATUS.md with deployment date

---

## ✅ Completion Checklist

- [ ] All CRITICAL variables added (10 variables)
- [ ] All HIGH priority variables added (~20 variables)
- [ ] Secrets marked as ENCRYPTED 🔒
- [ ] Deployment successful
- [ ] All verification tests passed
- [ ] Application is functional
- [ ] Monitoring is working (Sentry, PostHog)
- [ ] Documentation updated
- [ ] Sensitive files deleted/cleaned

**When all above are checked:** 🎉 **PRODUCTION DEPLOYMENT COMPLETE!**

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Estimated Total Time:** 15-20 minutes
**Next Review:** After first deployment

---

**💡 Tips:**
- Take your time - rushing leads to typos
- Double-check variable names - they must match exactly
- Test after deployment - don't assume everything works
- Monitor logs for 24 hours after deployment
- Have backup plan ready in case rollback is needed
