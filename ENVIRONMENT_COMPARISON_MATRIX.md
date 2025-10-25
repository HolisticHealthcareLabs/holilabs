# 📊 Environment Variables Comparison Matrix

**Generated:** October 25, 2025
**Purpose:** Quick reference for environment variable status across development and production

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Configured with real value |
| ⚠️  | Has placeholder value |
| ❌ | Not configured |
| 🔴 | CRITICAL priority |
| 🟡 | HIGH priority |
| 🔵 | MEDIUM priority |
| ⚪ | LOW priority |

---

## Quick Status Overview

```
CRITICAL (10):  ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 0/10 configured (0%)
HIGH (11):      ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 0/11 configured (0%)
MEDIUM (12):    ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 0/12 configured (0%)
LOW (7):        ⬜⬜⬜⬜⬜⬛⬛ 5/7 configured (71%)

OVERALL:        ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬜⬜⬜⬜⬜⬜⬜ 7/40 (18%)
```

---

## Detailed Comparison Matrix

### 🔴 CRITICAL VARIABLES (10)

| # | Variable | Category | Required | Dev Status | Prod Status | Next Action |
|---|----------|----------|----------|------------|-------------|-------------|
| 1 | `DATABASE_URL` | Database | Yes | ⚠️  Placeholder | ❌ Not set | Get from DigitalOcean DB |
| 2 | `NEXTAUTH_SECRET` | Authentication | Yes | ⚠️  Placeholder | ❌ Not set | Copy from template L93 |
| 3 | `NEXTAUTH_URL` | Authentication | Yes | ❌ Not set | ❌ Not set | Set to production URL |
| 4 | `SESSION_SECRET` | Authentication | Yes | ⚠️  Placeholder | ❌ Not set | Copy from template L92 |
| 5 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Yes | ⚠️  Placeholder | ❌ Not set | Get from Supabase dashboard |
| 6 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Yes | ⚠️  Placeholder | ❌ Not set | Get from Supabase dashboard |
| 7 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Yes | ⚠️  Placeholder | ❌ Not set | Get from Supabase dashboard |
| 8 | `ENCRYPTION_KEY` | Security | Yes | ⚠️  Placeholder | ❌ Not set | Copy from template L94 |
| 9 | `NEXT_PUBLIC_APP_URL` | Application | Yes | ⚠️  Placeholder | ❌ Not set | Set to production URL |
| 10 | `NODE_ENV` | Application | Yes | ✅ `development` | ❌ Not set | Set to `production` |

**Completion:** 0/10 CRITICAL variables ready for production

---

### 🟡 HIGH PRIORITY VARIABLES (11)

| # | Variable | Category | Required | Dev Status | Prod Status | Next Action |
|---|----------|----------|----------|------------|-------------|-------------|
| 11 | `CRON_SECRET` | Security | Yes | ⚠️  Placeholder | ❌ Not set | Copy from template L95 |
| 12 | `DEID_SECRET` | Security | Yes | ❌ Not set | ❌ Not set | Copy from template L96 |
| 13 | `ANTHROPIC_API_KEY` | AI Services | Yes | ⚠️  Placeholder | ❌ Not set | Get from Anthropic console |
| 14 | `RESEND_API_KEY` | Communication | Yes | ⚠️  Placeholder | ❌ Not set | Get new key from Resend |
| 15 | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push Notifications | Yes | ⚠️  Placeholder | ❌ Not set | Generate with web-push |
| 16 | `VAPID_PRIVATE_KEY` | Push Notifications | Yes | ⚠️  Placeholder | ❌ Not set | Generate with web-push |
| 17 | `VAPID_SUBJECT` | Push Notifications | Yes | ✅ Set | ❌ Not set | Update to real email |
| 18 | `NEXT_PUBLIC_SENTRY_DSN` | Monitoring | Yes | ⚠️  Placeholder | ❌ Not set | Get from Sentry project |
| 19 | `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | Yes | ⚠️  Placeholder | ❌ Not set | Get from PostHog project |
| 20 | `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | Yes | ✅ Set | ❌ Not set | Use US host for HIPAA |

**Completion:** 0/11 HIGH priority variables ready for production

---

### 🔵 MEDIUM PRIORITY VARIABLES (12)

| # | Variable | Category | Required | Dev Status | Prod Status | Notes |
|---|----------|----------|----------|------------|-------------|-------|
| 21 | `GOOGLE_AI_API_KEY` | AI Services | No | ⚠️  Placeholder | ❌ Not set | Optional: Gemini fallback |
| 22 | `DEEPGRAM_API_KEY` | AI Services | No | ⚠️  Placeholder | ❌ Not set | Optional: Transcription |
| 23 | `TWILIO_ACCOUNT_SID` | Communication | No | ⚠️  Placeholder | ❌ Not set | Optional: WhatsApp |
| 24 | `TWILIO_AUTH_TOKEN` | Communication | No | ⚠️  Placeholder | ❌ Not set | Optional: WhatsApp |
| 25 | `STRIPE_SECRET_KEY` | Payments | No | ⚠️  Placeholder | ❌ Not set | Use prod key, not test |
| 26 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | No | ⚠️  Placeholder | ❌ Not set | Use prod key, not test |
| 27 | `STRIPE_WEBHOOK_SECRET` | Payments | No | ⚠️  Placeholder | ❌ Not set | Get from Stripe webhooks |
| 28 | `UPSTASH_REDIS_REST_URL` | Rate Limiting | No | ⚠️  Placeholder | ❌ Not set | Recommended for production |
| 29 | `UPSTASH_REDIS_REST_TOKEN` | Rate Limiting | No | ⚠️  Placeholder | ❌ Not set | Recommended for production |
| 30 | `SENTRY_AUTH_TOKEN` | Monitoring | No | ⚠️  Placeholder | ❌ Not set | For release tracking |
| 31 | `R2_ENDPOINT` | Storage | No | ⚠️  Placeholder | ❌ Not set | Optional: R2 storage |
| 32 | `R2_BUCKET` | Storage | No | ⚠️  Placeholder | ❌ Not set | Optional: R2 storage |

**Note:** Additional storage variables (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) also need configuration

---

### ⚪ LOW PRIORITY VARIABLES (7)

| # | Variable | Category | Required | Dev Status | Prod Status | Notes |
|---|----------|----------|----------|------------|-------------|-------|
| 33 | `OPENAI_API_KEY` | AI Services | No | ⚠️  Placeholder | ❌ Not set | Optional: GPT-4 fallback |
| 34 | `ASSEMBLYAI_API_KEY` | AI Services | No | ⚠️  Placeholder | ❌ Not set | Optional: Transcription |
| 35 | `TWILIO_WHATSAPP_NUMBER` | Communication | No | ✅ Sandbox | ❌ Not set | Sandbox number ok for testing |
| 36 | `HOLI_LABS_RFC` | CFDI | No | ✅ Set | ❌ Not set | Verify if real tax ID |
| 37 | `PAC_PROVIDER` | CFDI | No | ✅ `finkok` | ❌ Not set | Mexican tax compliance |
| 38 | `PAC_API_URL` | CFDI | No | ✅ Set | ❌ Not set | Mexican tax compliance |
| 39 | `NODE_ENV` | Application | Yes | ✅ `development` | ❌ Not set | Change to `production` |

---

## Priority-Based Action Plan

### Tier 1: Launch Blockers (CRITICAL - Must Have) 🔴

**Estimated Time: 20 minutes**

1. **Generate Secrets (5 min)**
   - SESSION_SECRET
   - NEXTAUTH_SECRET
   - ENCRYPTION_KEY
   - CRON_SECRET
   - DEID_SECRET

2. **Get Supabase Keys (5 min)**
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

3. **Get Database URL (5 min)**
   - DATABASE_URL from DigitalOcean

4. **Set Production URLs (2 min)**
   - NEXTAUTH_URL
   - NEXT_PUBLIC_APP_URL
   - NODE_ENV

5. **Configure DigitalOcean (3 min)**
   - Add all above to environment variables

### Tier 2: Core Features (HIGH - Should Have) 🟡

**Estimated Time: 30 minutes**

1. **AI Services (10 min)**
   - ANTHROPIC_API_KEY

2. **Communication (5 min)**
   - RESEND_API_KEY

3. **Push Notifications (5 min)**
   - NEXT_PUBLIC_VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
   - VAPID_SUBJECT

4. **Monitoring (5 min)**
   - NEXT_PUBLIC_SENTRY_DSN

5. **Analytics (5 min)**
   - NEXT_PUBLIC_POSTHOG_KEY
   - NEXT_PUBLIC_POSTHOG_HOST

### Tier 3: Enhanced Features (MEDIUM - Nice to Have) 🔵

**Estimated Time: 45 minutes (optional)**

Can be configured post-launch:
- Additional AI providers (Google AI, Deepgram)
- Twilio WhatsApp
- Stripe payments
- Upstash rate limiting
- Cloudflare R2 storage

### Tier 4: Optional Features (LOW - Can Wait) ⚪

**Estimated Time: Variable**

Can be configured as needed:
- Additional transcription services
- CFDI tax compliance (Mexico-specific)
- Additional monitoring tokens

---

## Service Provider Quick Links

### Account Setup Required

| Service | Purpose | Priority | Setup URL | Docs |
|---------|---------|----------|-----------|------|
| **Supabase** | Auth & Storage | 🔴 CRITICAL | https://supabase.com/dashboard | https://supabase.com/docs |
| **DigitalOcean** | Database | 🔴 CRITICAL | https://cloud.digitalocean.com | https://docs.digitalocean.com |
| **Anthropic** | AI Features | 🟡 HIGH | https://console.anthropic.com | https://docs.anthropic.com |
| **Resend** | Email | 🟡 HIGH | https://resend.com/api-keys | https://resend.com/docs |
| **Sentry** | Error Tracking | 🟡 HIGH | https://sentry.io | https://docs.sentry.io |
| **PostHog** | Analytics | 🟡 HIGH | https://app.posthog.com | https://posthog.com/docs |
| **Stripe** | Payments | 🔵 MEDIUM | https://dashboard.stripe.com | https://stripe.com/docs |
| **Twilio** | SMS/WhatsApp | 🔵 MEDIUM | https://console.twilio.com | https://www.twilio.com/docs |
| **Upstash** | Rate Limiting | 🔵 MEDIUM | https://console.upstash.com | https://docs.upstash.com |
| **Cloudflare** | R2 Storage | 🔵 MEDIUM | https://dash.cloudflare.com | https://developers.cloudflare.com/r2 |

---

## Configuration Checklist by Service

### ✅ Supabase Setup

- [ ] Create project (if not exists)
- [ ] Copy project URL
- [ ] Copy `anon` key (public)
- [ ] Copy `service_role` key (secret)
- [ ] Configure storage buckets
- [ ] Set up authentication providers
- [ ] **Sign BAA** (Enterprise plan required - $599/month)

### ✅ DigitalOcean Setup

- [ ] Create managed PostgreSQL database
- [ ] Get connection string
- [ ] Enable SSL mode
- [ ] Create database backup schedule
- [ ] **Sign BAA** (Business Plus plan - $40/month)

### ✅ Anthropic Setup

- [ ] Create account
- [ ] Generate API key
- [ ] Set usage limits
- [ ] **Sign BAA** (Available on request - Free for API usage)

### ✅ Resend Setup

- [ ] Create account
- [ ] Revoke old API key (if exposed)
- [ ] Generate new API key
- [ ] Configure sending domain
- [ ] Verify domain DNS

### ✅ Sentry Setup

- [ ] Create project
- [ ] Copy DSN
- [ ] Configure release tracking (optional)
- [ ] Set up source maps
- [ ] Configure alert rules

### ✅ PostHog Setup

- [ ] Create project (US region for HIPAA)
- [ ] Copy project API key
- [ ] Disable auto-capture (HIPAA compliance)
- [ ] Configure PHI sanitization
- [ ] Set up feature flags
- [ ] **Sign BAA** (Available for free - Contact hey@posthog.com)

### ✅ VAPID Keys Setup

- [ ] Install web-push: `npm install -g web-push`
- [ ] Generate keys: `npx web-push generate-vapid-keys`
- [ ] Save public key
- [ ] Save private key
- [ ] Set subject email

---

## Timeline Estimate

### Minimum Viable Production (MVP) Configuration

| Phase | Tasks | Time | Can Start Immediately? |
|-------|-------|------|----------------------|
| **Phase 1** | Generate all secrets | 10 min | ✅ Yes |
| **Phase 2** | Get Supabase keys | 5 min | ✅ Yes |
| **Phase 3** | Get DigitalOcean database URL | 5 min | ✅ Yes |
| **Phase 4** | Get Anthropic API key | 5 min | ✅ Yes |
| **Phase 5** | Get Resend API key | 5 min | ✅ Yes |
| **Phase 6** | Get Sentry DSN | 5 min | ✅ Yes |
| **Phase 7** | Get PostHog key | 5 min | ✅ Yes |
| **Phase 8** | Configure DigitalOcean env vars | 15 min | After Phases 1-7 |
| **Phase 9** | Test deployment | 30 min | After Phase 8 |
| **TOTAL** | | **~90 min** | |

### Full Production Configuration (All Features)

| Additional Phase | Tasks | Time | Dependency |
|-----------------|-------|------|------------|
| **Phase 10** | Set up Stripe | 15 min | Create account |
| **Phase 11** | Set up Twilio | 15 min | Create account |
| **Phase 12** | Set up Upstash | 10 min | Create account |
| **Phase 13** | Set up Cloudflare R2 | 15 min | Create account |
| **Phase 14** | Additional AI providers | 15 min | Create accounts |
| **TOTAL** | | **+70 min** | |

**Grand Total:** ~160 minutes (~2.5 hours) for full configuration

---

## Risk Assessment

### High Risk (Will Break Production) 🔴

| Variable | Missing Will Cause | Severity | User Impact |
|----------|-------------------|----------|-------------|
| `DATABASE_URL` | Application won't start | CRITICAL | Complete outage |
| `NEXTAUTH_SECRET` | Sessions won't work | CRITICAL | Can't log in |
| `SESSION_SECRET` | Sessions won't work | CRITICAL | Can't log in |
| `ENCRYPTION_KEY` | PHI encryption fails | CRITICAL | Data security breach |
| All Supabase vars | Auth and storage broken | CRITICAL | Can't use app |

### Medium Risk (Features Broken) 🟡

| Variable | Missing Will Cause | Severity | User Impact |
|----------|-------------------|----------|-------------|
| `ANTHROPIC_API_KEY` | AI features broken | HIGH | No AI transcription |
| `RESEND_API_KEY` | Email sending fails | HIGH | No email notifications |
| VAPID keys | Push notifications fail | HIGH | No push notifications |
| `NEXT_PUBLIC_SENTRY_DSN` | No error tracking | HIGH | Can't monitor errors |
| `NEXT_PUBLIC_POSTHOG_KEY` | No analytics | HIGH | No usage tracking |

### Low Risk (Optional Features) 🔵

| Variable | Missing Will Cause | Severity | User Impact |
|----------|-------------------|----------|-------------|
| Stripe vars | Payments disabled | MEDIUM | Can't accept payments |
| Twilio vars | SMS/WhatsApp disabled | MEDIUM | No SMS notifications |
| Upstash vars | No rate limiting | MEDIUM | Potential abuse |
| R2 vars | Local storage only | LOW | Slower file access |

---

## Validation Commands

### After configuration, verify with these commands:

```bash
# 1. Health check
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# 2. Check environment (from DigitalOcean console)
# Apps → holilabs-lwp6y → Runtime Logs
# Look for startup messages about loaded environment variables

# 3. Test database connection
# Should see "database":true in health check response

# 4. Test authentication
# Try logging in at the production URL

# 5. Test AI features (if configured)
# Use the AI scribe feature in the app

# 6. Check Sentry for errors
# Visit https://sentry.io and check for events

# 7. Check PostHog for analytics
# Visit https://app.posthog.com and check for events
```

---

## Summary Statistics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Variables** | 40 | - |
| **Configured** | 7 (18%) | 🔴 NOT READY |
| **Placeholder** | 31 (77%) | 🔴 NEEDS ACTION |
| **Missing** | 2 (5%) | 🔴 NEEDS ACTION |
| **CRITICAL Missing** | 10 (100%) | 🚨 BLOCKING |
| **HIGH Missing** | 11 (100%) | ⚠️  BLOCKING |
| **MEDIUM Missing** | 12 (100%) | ⚠️  FEATURE LOSS |
| **LOW Missing** | 2 (29%) | ✅ ACCEPTABLE |

---

**Conclusion:** System is **NOT PRODUCTION READY**. Minimum ~90 minutes of configuration required before launch.

**Recommended Next Step:** Start with Tier 1 (Launch Blockers) and complete all CRITICAL variables first.

---

**Generated by:** Environment Audit System
**Source Script:** `apps/web/scripts/audit-environment.ts`
**Last Updated:** October 25, 2025
**Next Review:** After configuration changes
