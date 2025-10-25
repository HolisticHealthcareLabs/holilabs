# 🔐 Production Secrets - Generated Values

**Generated:** October 25, 2025
**Status:** ⚠️  CONFIDENTIAL - DELETE AFTER COPYING TO DIGITALOCEAN
**Purpose:** Single source of truth for all generated production secrets

---

## 🚨 SECURITY WARNING

**⚠️  CRITICAL: This file contains production secrets**

1. **DO NOT commit this file to git**
2. **DELETE this file after copying secrets to DigitalOcean**
3. **Store a backup copy in your password manager (1Password, LastPass, etc.)**
4. **Never share via email, Slack, or any unencrypted channel**

---

## ✅ Generated Secrets (Ready to Use)

### 1. SESSION MANAGEMENT

```bash
# Session encryption secret (64-character hex)
# Generated with: openssl rand -hex 32
SESSION_SECRET="287dd2c3bb327618deb091442bf66b7c39fc4e5e89036253dfcac0b32f3c0458"
```

### 2. NEXTAUTH AUTHENTICATION

```bash
# NextAuth session encryption (64-character hex)
# Generated with: openssl rand -hex 32
NEXTAUTH_SECRET="d7f6464bd1b7d4380f2b74350692eace34e58ec27ce2ae77a66e2cfa6c45c032"
```

### 3. PHI ENCRYPTION

```bash
# PHI data encryption key (32-byte base64)
# Generated with: openssl rand -base64 32
# ⚠️  CRITICAL: Never lose this key or data cannot be decrypted
ENCRYPTION_KEY="oKk4xJchl5R13mpQngudsTSui5l+BA/54iIzdnwXkbI="
```

### 4. CRON JOB AUTHENTICATION

```bash
# Cron job secret (64-character hex)
# Generated with: openssl rand -hex 32
CRON_SECRET="89f4c7c877d3db8f1634f9470e2264e4a94d92da2428dfd36f0931bd86b9950e"
```

### 5. DE-IDENTIFICATION

```bash
# De-identification secret (64-character hex)
# Generated with: openssl rand -hex 32
DEID_SECRET="55453c0752116955eb29dc1e399879ce719f59da7ce22aa684a25d1132809ef0"
```

### 6. PUSH NOTIFICATIONS (VAPID KEYS)

```bash
# VAPID public key (safe to expose in frontend)
# Generated with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BN7YfrjWiRVfONAmWHH35FMTpUnQW2YqlibSLnUvKC3gv2tUYxT5rGO3pcSqasbmL3y80LgE7PNixYnYLJSRLIc"

# VAPID private key (SECRET, backend only)
VAPID_PRIVATE_KEY="mpuWSbwQh10l8hU2iywZSFnKFnEggCqb-i7kAKzy2n0"

# VAPID subject (contact email)
VAPID_SUBJECT="mailto:admin@holilabs.com"
```

---

## ⏳ Secrets To Be Obtained (Not Generated)

These secrets must be obtained from external service providers:

### 🔴 CRITICAL - GET IMMEDIATELY

#### Supabase (https://supabase.com/dashboard)
```bash
# Go to: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL="<GET FROM DASHBOARD>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<GET FROM DASHBOARD - 'anon' key>"
SUPABASE_SERVICE_ROLE_KEY="<GET FROM DASHBOARD - 'service_role' key>"

# ⚠️  Action Required: Sign BAA ($599/month Enterprise plan)
# Email: enterprise@supabase.com
```

#### DigitalOcean Database (https://cloud.digitalocean.com/databases)
```bash
# Go to: Databases → Select cluster → Connection Details
DATABASE_URL="<GET FROM DASHBOARD - Connection string with SSL>"

# ⚠️  Action Required: Sign BAA ($40/month Business Plus plan)
# Email: compliance@digitalocean.com
```

### 🟡 HIGH PRIORITY - GET WITHIN 24 HOURS

#### Anthropic (https://console.anthropic.com/settings/keys)
```bash
# Go to: Settings → API Keys → Create Key
ANTHROPIC_API_KEY="<GET FROM CONSOLE>"

# ⚠️  Action Required: Request BAA (free for API usage)
# Contact: https://www.anthropic.com/contact-sales
```

#### Resend (https://resend.com/api-keys)
```bash
# Go to: API Keys → Create Key
# ⚠️  First REVOKE old key if exposed: re_SEBRpWwx_PVp8TJ5NY6GSbaXrhi8dXwhJ
RESEND_API_KEY="<GET FROM DASHBOARD>"
```

#### Sentry (https://sentry.io)
```bash
# Go to: Project Settings → Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN="<GET FROM PROJECT>"

# Optional: For release tracking
# Go to: Settings → Auth Tokens → Create New Token
# Scopes: project:read, project:releases
SENTRY_AUTH_TOKEN="<OPTIONAL - FOR RELEASE TRACKING>"
SENTRY_ORG="holi-labs"
SENTRY_PROJECT="holi-labs-web"
```

#### PostHog (https://app.posthog.com)
```bash
# Go to: Project Settings → Project API Key
NEXT_PUBLIC_POSTHOG_KEY="<GET FROM PROJECT>"

# Use US region for HIPAA compliance
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# ⚠️  Action Required: Sign BAA (FREE)
# Email: hey@posthog.com with subject "HIPAA BAA Request"
```

### 🔵 MEDIUM PRIORITY - OPTIONAL

#### Google AI (https://console.cloud.google.com/apis/credentials)
```bash
# Optional: Fallback AI provider
# GOOGLE_AI_API_KEY="<OPTIONAL>"
```

#### Deepgram (https://console.deepgram.com/)
```bash
# Optional: Medical transcription
# DEEPGRAM_API_KEY="<OPTIONAL>"
```

#### Twilio (https://console.twilio.com)
```bash
# Optional: SMS/WhatsApp notifications
# TWILIO_ACCOUNT_SID="<OPTIONAL>"
# TWILIO_AUTH_TOKEN="<OPTIONAL>"
# TWILIO_WHATSAPP_NUMBER="<OPTIONAL>"
```

#### Stripe (https://dashboard.stripe.com/apikeys)
```bash
# Optional: Payment processing
# ⚠️  Use PRODUCTION keys (sk_live_*), not test keys (sk_test_*)
# STRIPE_SECRET_KEY="<OPTIONAL - sk_live_...>"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="<OPTIONAL - pk_live_...>"
# STRIPE_WEBHOOK_SECRET="<OPTIONAL - whsec_...>"
```

#### Upstash Redis (https://console.upstash.com)
```bash
# Optional: Rate limiting (recommended for production)
# UPSTASH_REDIS_REST_URL="<OPTIONAL>"
# UPSTASH_REDIS_REST_TOKEN="<OPTIONAL>"
```

---

## 📋 Complete Environment Variables List

### Copy-Paste Ready for DigitalOcean

```bash
# ============================================================================
# PRODUCTION SECRETS - COPY TO DIGITALOCEAN
# ============================================================================

# ─── CRITICAL (9 variables) ─────────────────────────────────────────────

# Database
DATABASE_URL="<GET_FROM_DIGITALOCEAN_DB>"

# Authentication
SESSION_SECRET="287dd2c3bb327618deb091442bf66b7c39fc4e5e89036253dfcac0b32f3c0458"
NEXTAUTH_SECRET="d7f6464bd1b7d4380f2b74350692eace34e58ec27ce2ae77a66e2cfa6c45c032"
NEXTAUTH_URL="https://holilabs-lwp6y.ondigitalocean.app"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="<GET_FROM_SUPABASE>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<GET_FROM_SUPABASE>"
SUPABASE_SERVICE_ROLE_KEY="<GET_FROM_SUPABASE>"

# Encryption
ENCRYPTION_KEY="oKk4xJchl5R13mpQngudsTSui5l+BA/54iIzdnwXkbI="

# Application
NEXT_PUBLIC_APP_URL="https://holilabs-lwp6y.ondigitalocean.app"
NODE_ENV="production"

# ─── HIGH PRIORITY (11 variables) ───────────────────────────────────────

# Security
CRON_SECRET="89f4c7c877d3db8f1634f9470e2264e4a94d92da2428dfd36f0931bd86b9950e"
DEID_SECRET="55453c0752116955eb29dc1e399879ce719f59da7ce22aa684a25d1132809ef0"

# AI
ANTHROPIC_API_KEY="<GET_FROM_ANTHROPIC>"
AI_PRIMARY_PROVIDER="claude"
AI_FALLBACK_ENABLED="true"
AI_CACHE_ENABLED="true"

# Email
RESEND_API_KEY="<GET_FROM_RESEND>"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BN7YfrjWiRVfONAmWHH35FMTpUnQW2YqlibSLnUvKC3gv2tUYxT5rGO3pcSqasbmL3y80LgE7PNixYnYLJSRLIc"
VAPID_PRIVATE_KEY="mpuWSbwQh10l8hU2iywZSFnKFnEggCqb-i7kAKzy2n0"
VAPID_SUBJECT="mailto:admin@holilabs.com"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="<GET_FROM_SENTRY>"
SENTRY_ORG="holi-labs"
SENTRY_PROJECT="holi-labs-web"
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING="1"

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="<GET_FROM_POSTHOG>"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# Application
NEXT_PUBLIC_APP_VERSION="1.0.0"
LOG_LEVEL="info"
ALLOWED_ORIGINS="https://holilabs-lwp6y.ondigitalocean.app,https://holilabs.com"

# ============================================================================
```

---

## 📝 Deployment Checklist

### Phase 1: Pre-Deployment (Today)

- [x] Generate all secrets ✅
- [ ] Get Supabase keys (5 min)
- [ ] Get DigitalOcean database URL (5 min)
- [ ] Get Anthropic API key (5 min)
- [ ] Get Resend API key (5 min)
- [ ] Get Sentry DSN (5 min)
- [ ] Get PostHog key (5 min)

**Estimated Time:** ~30 minutes

### Phase 2: BAA Signing (This Week)

- [ ] Request Supabase BAA ($599/month - CRITICAL)
- [ ] Request DigitalOcean BAA ($40/month - CRITICAL)
- [ ] Request PostHog BAA (FREE)
- [ ] Request Anthropic BAA (FREE)

**Estimated Time:** Varies (3-7 business days per vendor)

### Phase 3: Deployment (After Phase 1)

- [ ] Copy secrets to DigitalOcean environment variables
- [ ] Mark sensitive variables as "Encrypted" 🔒
- [ ] Save and wait for redeployment (5-10 min)
- [ ] Test health endpoint: `curl https://holilabs-lwp6y.ondigitalocean.app/api/health`
- [ ] Test login functionality
- [ ] Verify Sentry error tracking
- [ ] Verify PostHog analytics
- [ ] Test push notifications

**Estimated Time:** ~30 minutes

### Phase 4: Post-Deployment

- [ ] Monitor Sentry for errors (first 24 hours)
- [ ] Monitor PostHog for usage (first 24 hours)
- [ ] Test all critical user flows
- [ ] Verify BAAs are signed before processing PHI
- [ ] Schedule secret rotation (30 days for sessions, 90 days for API keys)
- [ ] **DELETE THIS FILE** (after copying to password manager)

---

## 🔄 Secret Rotation Schedule

| Secret | Frequency | Next Rotation Date |
|--------|-----------|-------------------|
| `SESSION_SECRET` | 30 days | <TODAY + 30 DAYS> |
| `NEXTAUTH_SECRET` | 30 days | <TODAY + 30 DAYS> |
| `CRON_SECRET` | 30 days | <TODAY + 30 DAYS> |
| `DEID_SECRET` | 90 days | <TODAY + 90 DAYS> |
| `ENCRYPTION_KEY` | 180 days* | <TODAY + 180 DAYS> |
| `ANTHROPIC_API_KEY` | 90 days | <TODAY + 90 DAYS> |
| `RESEND_API_KEY` | 90 days | <TODAY + 90 DAYS> |
| VAPID keys | 365 days | <TODAY + 365 DAYS> |

*Note: Rotating `ENCRYPTION_KEY` requires re-encrypting all PHI data. Plan carefully!

---

## 🛡️ Security Best Practices

### ✅ DO:
- Store this file in password manager (1Password, LastPass, etc.)
- Use DigitalOcean encrypted environment variables
- Generate unique secrets for production
- Rotate secrets on schedule
- Enable 2FA on all service provider accounts
- Use different secrets for staging and production

### ❌ DON'T:
- Commit this file to git
- Share via email/Slack/SMS
- Reuse development secrets in production
- Use weak or predictable secrets
- Store secrets in plain text files
- Skip BAA signing before processing PHI

---

## 📞 Support Contacts

### If You Need Help

| Issue | Contact |
|-------|---------|
| DigitalOcean support | https://www.digitalocean.com/support |
| Supabase support | https://supabase.com/support |
| Anthropic support | https://www.anthropic.com/contact-sales |
| Resend support | support@resend.com |
| Sentry support | https://sentry.io/support |
| PostHog support | hey@posthog.com |

---

## 🎯 Quick Actions

### Copy Secrets to Clipboard (macOS)

```bash
# Copy all secrets to clipboard
pbcopy < PRODUCTION_SECRETS_GENERATED.md
```

### Add to DigitalOcean (CLI)

```bash
# Install doctl
brew install doctl  # macOS
# OR
snap install doctl  # Linux

# Authenticate
doctl auth init

# Update app environment variables
doctl apps update <app-id> --env "SESSION_SECRET=287dd2c3bb327618deb091442bf66b7c39fc4e5e89036253dfcac0b32f3c0458"
# ... repeat for each variable
```

### Or Use Web UI (Recommended)

1. Go to: https://cloud.digitalocean.com/apps
2. Select: holilabs-lwp6y
3. Go to: Settings → App-Level Environment Variables
4. Click: Edit → Bulk Editor
5. Paste all variables (format: `KEY=value`)
6. Click: Save

---

## ⚠️  IMPORTANT REMINDER

**After copying these secrets to DigitalOcean and your password manager:**

1. **DELETE this file immediately**
2. Or at minimum, remove all secret values from this file
3. Never commit this file to git

---

**Document Status:** 🔐 CONFIDENTIAL - PRODUCTION SECRETS
**Generated:** October 25, 2025
**Valid Until:** Secrets are rotated (see schedule above)
**Owner:** DevOps Team

---

**🚨 DELETE THIS FILE AFTER USE 🚨**
