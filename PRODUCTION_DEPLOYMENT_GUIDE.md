# 🚀 Holi Labs - Production Deployment Guide

**Last Updated:** January 2025
**Target Environment:** DigitalOcean App Platform
**Compliance:** HIPAA, LGPD, GDPR

---

## 📋 Pre-Deployment Checklist

### 1. Security Keys Generation

Run these commands to generate production secrets:

```bash
# Session secret for authentication
openssl rand -hex 32

# NextAuth secret (use a different value)
openssl rand -hex 32

# Encryption key for PHI
openssl rand -base64 32

# Cron job secret
openssl rand -hex 32

# De-identification secret
openssl rand -hex 32
```

**⚠️ CRITICAL:** Never reuse development secrets in production!

---

## 🔐 Production Environment Variables

### Required - Core Services

```bash
# ============================================================================
# Database (DigitalOcean Managed PostgreSQL)
# ============================================================================
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# ============================================================================
# Security (MUST CHANGE FROM DEV!)
# ============================================================================
SESSION_SECRET="your-64-char-hex-from-openssl-rand-hex-32"
NEXTAUTH_SECRET="your-64-char-hex-from-openssl-rand-hex-32"
NEXTAUTH_URL="https://holilabs-lwp6y.ondigitalocean.app"

# Encryption for PHI (32+ bytes base64)
ENCRYPTION_KEY="your-base64-key-from-openssl-rand-base64-32"
ENCRYPTION_MASTER_KEY="your-master-key-base64"

# De-identification for analytics
DEID_SECRET="your-deid-secret-hex"

# ============================================================================
# Supabase (File Storage + Auth)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL="https://yyteqajwjjrubiktornb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ============================================================================
# AI Services (Anthropic Claude for clinical notes)
# ============================================================================
ANTHROPIC_API_KEY="sk-ant-your-production-key"

# ============================================================================
# Email (Resend for transactional emails)
# ============================================================================
RESEND_API_KEY="re_your_production_key"
```

### Required - Analytics & Monitoring

```bash
# ============================================================================
# PostHog Analytics (HIPAA-compliant A/B testing)
# ============================================================================
# Sign up at https://posthog.com/signup
# Create a US-hosted project (HIPAA compliance)
# Copy API key from Project Settings → API Keys
NEXT_PUBLIC_POSTHOG_KEY="phc_your_production_project_key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# ============================================================================
# Sentry Error Monitoring (REQUIRED for production)
# ============================================================================
# Sign up at https://sentry.io
# Create project → Copy DSN
NEXT_PUBLIC_SENTRY_DSN="https://your-public-key@o123456.ingest.sentry.io/7654321"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
SENTRY_ORG="your-org-name"
SENTRY_PROJECT="holi-labs-production"
```

### Optional - Advanced Features

```bash
# ============================================================================
# Twilio (WhatsApp notifications)
# ============================================================================
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# ============================================================================
# Stripe (Payments)
# ============================================================================
STRIPE_SECRET_KEY="sk_live_your-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your-publishable-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# ============================================================================
# Rate Limiting (Upstash Redis)
# ============================================================================
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# ============================================================================
# Blockchain (Optional - disabled by default)
# ============================================================================
ENABLE_BLOCKCHAIN="false"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
HEALTH_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
BLOCKCHAIN_PRIVATE_KEY="your-private-key"

# ============================================================================
# Cron Jobs
# ============================================================================
CRON_SECRET="your-64-char-hex-for-cron-endpoints"
```

---

## 🏗️ DigitalOcean Deployment Steps

### Step 1: Set Environment Variables

1. Go to DigitalOcean App Platform dashboard
2. Navigate to your app → **Settings** → **App-Level Environment Variables**
3. Add all required variables from above
4. **Encrypt** sensitive variables (click lock icon)

### Step 2: Configure Database

```bash
# Connect to DigitalOcean Managed PostgreSQL
# Get connection string from Database → Connection Details

# Run migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed
```

### Step 3: Deploy

```bash
# Push to main branch (triggers auto-deploy)
git push origin main

# Or use DigitalOcean CLI
doctl apps create-deployment <app-id>
```

### Step 4: Verify Deployment

```bash
# Check build logs
doctl apps logs <app-id>

# Test health endpoint
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# Expected response:
# {"status": "ok", "database": "connected", "timestamp": "..."}
```

---

## 🔍 Post-Deployment Verification

### Critical Tests (Run Immediately)

- [ ] Login works with production credentials
- [ ] Database connection successful
- [ ] Patient creation saves to database
- [ ] Clinical notes AI generation works
- [ ] File upload to Supabase succeeds
- [ ] Email notifications send via Resend
- [ ] PWA installation works on iPhone
- [ ] PostHog events tracking properly
- [ ] Sentry capturing errors

### Security Verification

```bash
# 1. Check SSL certificate
curl -I https://holilabs-lwp6y.ondigitalocean.app

# 2. Verify security headers
curl -I https://holilabs-lwp6y.ondigitalocean.app | grep -E "(X-Frame-Options|X-Content-Type|Strict-Transport)"

# 3. Test rate limiting
for i in {1..20}; do curl https://holilabs-lwp6y.ondigitalocean.app/api/patients; done
```

---

## 📊 PostHog Setup for A/B Testing

### Step 1: Create Production Project

1. Sign up at https://posthog.com/signup
2. Choose **US Cloud** (HIPAA compliance)
3. Create project: "Holi Labs - Production"
4. Copy project API key

### Step 2: Enable Feature Flags

1. Navigate to **Feature Flags** → **New feature flag**
2. Create flags for A/B tests:
   - `new-dashboard-layout` (Boolean)
   - `ai-scribe-beta` (Boolean)
   - `voice-recording-v2` (Multivariate)

### Step 3: Set Up Funnels

**Key Funnel:** User Activation
1. **Signup** → PostHog event: `user_signup`
2. **First Patient** → Event: `patient_created`
3. **First Note** → Event: `clinical_note_created`
4. **5+ Notes** → Event: `clinical_note_created` (count ≥5)

### Step 4: Create Dashboards

**Recommended Dashboards:**
- **Onboarding Funnel:** Signup → First patient → First note
- **Feature Adoption:** AI scribe usage, voice recording sessions
- **User Engagement:** Daily active users, session duration
- **Performance:** Page load times, API response times

---

## 🏥 HIPAA Compliance Requirements

### Business Associate Agreements (BAA) Required

You **MUST** sign BAAs with these vendors before handling real PHI:

#### Critical (Must Have BAA)

- [x] **Supabase** - File storage (PHI documents)
  - Request BAA: https://supabase.com/contact/enterprise
- [x] **DigitalOcean** - Database hosting (PHI in PostgreSQL)
  - Request BAA: https://www.digitalocean.com/trust/compliance
- [x] **PostHog** - Analytics (de-identified data only, but request anyway)
  - Request BAA: https://posthog.com/docs/privacy/hipaa-compliance

#### Recommended (If Handling PHI)

- [ ] **Anthropic** - AI clinical notes (PHI processing)
  - Request BAA: https://www.anthropic.com/contact-sales
- [ ] **Twilio** - SMS/WhatsApp (patient communication)
  - Request BAA: https://www.twilio.com/legal/hipaa
- [ ] **Resend** - Email (patient notifications)
  - Request BAA: https://resend.com/legal/hipaa

### HIPAA Technical Safeguards Checklist

- [x] **Encryption at Rest:** PostgreSQL encrypted (DigitalOcean default)
- [x] **Encryption in Transit:** HTTPS enforced (SSL certificate)
- [x] **Access Controls:** Role-based auth (Supabase RLS)
- [x] **Audit Logging:** All PHI access logged to `audit_logs` table
- [x] **Data De-identification:** PostHog sanitizes PHI from analytics
- [x] **Session Management:** 30-minute idle timeout
- [ ] **Backup Encryption:** Database backups encrypted (verify with DigitalOcean)
- [ ] **Vulnerability Scanning:** Set up Snyk or Dependabot

---

## 🚨 Incident Response Plan

### If PHI Data Breach Detected

1. **Immediate Actions** (within 1 hour):
   - [ ] Revoke all API keys and secrets
   - [ ] Disable affected user accounts
   - [ ] Take database snapshot for forensics
   - [ ] Notify engineering team

2. **Investigation** (within 24 hours):
   - [ ] Query `audit_logs` table for unauthorized access
   - [ ] Check Sentry for security errors
   - [ ] Review DigitalOcean access logs

3. **Notification** (within 60 days):
   - [ ] Notify affected patients if >500 individuals impacted
   - [ ] File breach report with HHS OCR
   - [ ] Document incident in compliance folder

### Rollback Procedure

```bash
# 1. Identify last working deployment
doctl apps list-deployments <app-id>

# 2. Rollback to previous version
doctl apps create-deployment <app-id> --deployment-id <previous-id>

# 3. Verify rollback worked
curl https://holilabs-lwp6y.ondigitalocean.app/api/health
```

---

## 📈 Monitoring & Alerts

### Sentry Alert Rules

Set up alerts for:
- **Critical Errors:** >10 errors/hour
- **Database Connection Failures:** Any occurrence
- **Authentication Failures:** >50/hour (potential attack)
- **AI API Failures:** >5/hour

### PostHog Monitoring

Track these metrics weekly:
- **User Activation Rate:** % completing onboarding funnel
- **Feature Adoption:** % using AI scribe after 7 days
- **Retention:** Day 7, Day 30, Day 90 retention rates
- **Performance:** P95 page load time <3 seconds

---

## 🔄 Maintenance Windows

### Weekly Tasks

- [ ] Review Sentry errors (Monday 9 AM)
- [ ] Check PostHog dashboards (Wednesday 10 AM)
- [ ] Database backup verification (Friday 2 PM)

### Monthly Tasks

- [ ] Dependency updates (`npm audit fix`)
- [ ] Security review (OWASP checklist)
- [ ] HIPAA compliance audit
- [ ] Cost analysis (AI usage, database size)

---

## 📞 Support Contacts

**Production Issues:**
- **On-call Engineer:** [Your phone/Slack]
- **Database Issues:** DigitalOcean Support (Premium plan)
- **AI API Downtime:** Anthropic Status Page

**Compliance Questions:**
- **HIPAA:** [Compliance officer contact]
- **Data Privacy:** [DPO contact]

---

## 🎯 Success Metrics

**Week 1 Goals:**
- ✅ 0 critical errors in Sentry
- ✅ <2s average page load time
- ✅ >90% uptime (check DigitalOcean dashboard)

**Month 1 Goals:**
- 🎯 10+ active clinicians
- 🎯 100+ clinical notes created
- 🎯 >50% user activation rate (complete onboarding)

---

## 📚 Additional Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [PostHog A/B Testing Guide](https://posthog.com/docs/experiments)
- [HIPAA Compliance Checklist](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [Next.js Production Best Practices](https://nextjs.org/docs/going-to-production)

---

**Document Version:** 1.0
**Last Review:** January 2025
**Next Review:** February 2025
