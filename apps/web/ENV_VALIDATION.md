# Environment Variable Validation

## ✅ What Was Implemented

We've added **automatic environment variable validation** using Zod that runs on app startup and fails fast with clear error messages if required configuration is missing.

---

## 🎯 Benefits

### Before:
- App crashes mysteriously in production
- Hard to debug missing env vars
- No type safety for `process.env`
- Silent failures

### After:
- ✅ **Fails fast** with clear error messages
- ✅ **Type-safe** environment variables
- ✅ **Automatic validation** on startup
- ✅ **Helpful warnings** for optional but recommended vars
- ✅ **Prevents production bugs** before they happen

---

## 📖 How It Works

### Validation Schema

All environment variables are defined in `/src/lib/env.ts` using Zod:

```typescript
const envSchema = z.object({
  // Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Optional but validated
  DATABASE_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().length(64).optional(),
  // ... etc
});
```

###When Validation Runs

**Automatically on:**
1. App startup (server start)
2. Any time you call `getEnv()` or `validateEnv()`

**NOT during:**
- Build time (DATABASE_URL can be missing during build)
- Test runs (unless explicitly called)

---

## 🚨 What Happens On Failure

### Example Output:

```
❌ Environment Variable Validation Failed:

  • DATABASE_URL: Required
    (Not set in environment)
  • ENCRYPTION_KEY: ENCRYPTION_KEY must be exactly 64 characters (hex). Generate with: openssl rand -hex 32
  • RESEND_API_KEY: RESEND_API_KEY must start with "re_"

📖 See apps/web/.env.production.example for required variables
```

### In Production:
- **Process exits with code 1** (fail fast)
- Clear error messages logged
- Prevents app from starting with bad config

### In Development:
- Warnings only (doesn't crash)
- Lets you develop without all vars set

---

## 📋 Required Variables

These MUST be set or app won't start in production:

### Client Variables (NEXT_PUBLIC_*)
| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `NEXT_PUBLIC_APP_URL` | Application URL | Your domain (e.g., https://holilabs.xyz) |
| `NEXT_PUBLIC_SUPABASE_URL` | Authentication | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth (public key) | Supabase Dashboard → Settings → API |

### Server Variables (CRITICAL for Security)
| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `NEXTAUTH_SECRET` | Session security | `openssl rand -base64 32` |
| `SESSION_SECRET` | Session encryption | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | OAuth token encryption | `openssl rand -hex 32` (64 hex chars) |
| `ENCRYPTION_MASTER_KEY` | File encryption | `openssl rand -base64 32` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase | Supabase Dashboard → Settings → API |

---

## ⚠️ Recommended Variables

App will start without these, but with warnings:

| Variable | Purpose | Impact if Missing |
|----------|---------|-------------------|
| `DATABASE_URL` | PostgreSQL connection | No database access |
| `ENCRYPTION_KEY` | Encrypt OAuth tokens | **Security risk!** Tokens stored in plaintext |
| `NEXTAUTH_SECRET` | Session security | Sessions may be insecure |
| `RESEND_API_KEY` | Send emails | Email features won't work |

---

## 🔧 Optional Variables (50+ Total)

The system validates **all environment variables** from `.env.example`. Here's a breakdown by category:

### AI Services (20+ variables)
**Primary Providers:**
- `GOOGLE_AI_API_KEY` - Gemini 1.5 Flash (primary, cost-effective)
- `ANTHROPIC_API_KEY` - Claude Sonnet (fallback, highest quality)
- `OPENAI_API_KEY` - GPT-4 Turbo (secondary fallback)

**Transcription:**
- `ASSEMBLYAI_API_KEY` - Medical transcription
- `DEEPGRAM_API_KEY` - Voice transcription

**Configuration:**
- `AI_PRIMARY_PROVIDER` - gemini/claude/openai (default: gemini)
- `AI_FALLBACK_ENABLED` - true/false (default: true)
- `AI_CACHE_ENABLED` - Enable 24h Redis caching (default: true)
- `AI_CACHE_TTL` - Cache TTL in seconds (default: 86400)
- `AI_RATE_LIMIT_PER_USER` - Max queries/hour (default: 50)
- `MAX_CONCURRENT_AI_REQUESTS` - Max concurrent requests (default: 10)

**Freemium Quotas:**
- `AI_FREE_TIER_LIMIT` - 10 queries/day
- `AI_STARTER_TIER_LIMIT` - 50 queries/day
- `AI_PRO_TIER_LIMIT` - Unlimited
- `AI_ENTERPRISE_TIER_LIMIT` - Unlimited

**Cost Monitoring:**
- `AI_MONTHLY_BUDGET_USD` - Monthly budget (default: $100)
- `AI_ALERT_THRESHOLD_PERCENT` - Alert at % of budget (default: 80)

### Notifications (10+ variables)
**Twilio SMS/WhatsApp:**
- `TWILIO_ACCOUNT_SID` - Account identifier
- `TWILIO_AUTH_TOKEN` - Authentication token
- `TWILIO_PHONE_NUMBER` - SMS phone number (format: +15551234567)
- `TWILIO_WHATSAPP_NUMBER` - WhatsApp number (format: whatsapp:+14155238886)
- `TWILIO_STATUS_CALLBACK_URL` - Delivery status webhook

**Email Providers:**
- `EMAIL_PROVIDER` - resend/sendgrid/ses/smtp (default: resend)
- `FROM_EMAIL` - Sender email (default: noreply@holilabs.com)
- `FROM_NAME` - Sender name (default: Holi Labs)
- `RESEND_API_KEY` - Resend API key (recommended)
- `SENDGRID_API_KEY` - SendGrid API key
- `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS SES
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` - Custom SMTP

**Web Push:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Client-side VAPID key
- `VAPID_PRIVATE_KEY` - Server-side VAPID key
- `VAPID_EMAIL` - Support email for push issues

### Payments & Compliance
**Stripe:**
- `STRIPE_SECRET_KEY` - Server-side Stripe key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

**CFDI (Mexican Tax Compliance):**
- `HOLI_LABS_RFC` - Company RFC
- `PAC_PROVIDER` - finkok/sw-sapien/diverza/ecodex
- `PAC_API_URL` - PAC provider API endpoint
- `PAC_USERNAME` / `PAC_PASSWORD` - PAC credentials
- `PAC_CERTIFICATE` - Base64 CSD certificate
- `PAC_PRIVATE_KEY` - Base64 CSD private key
- `PAC_PRIVATE_KEY_PASSWORD` - Private key password

### Infrastructure
**Redis (Upstash):**
- `UPSTASH_REDIS_REST_URL` - Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Authentication token

**Cloud Storage:**
- `R2_ENDPOINT` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` - Cloudflare R2
- `S3_ENDPOINT` / `S3_BUCKET` - AWS S3 (alternative)

**Error Monitoring (Sentry):**
- `NEXT_PUBLIC_SENTRY_DSN` - Client-side error tracking
- `SENTRY_AUTH_TOKEN` - Build-time uploads
- `SENTRY_ORG` / `SENTRY_PROJECT` - Organization/project
- `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING` - Suppress warnings

**Analytics (PostHog - HIPAA compliant):**
- `NEXT_PUBLIC_POSTHOG_KEY` - Project key (format: phc_*)
- `NEXT_PUBLIC_POSTHOG_HOST` - US-based host (default: https://us.i.posthog.com)
- `NEXT_PUBLIC_APP_VERSION` - Version for release tracking (default: 1.0.0)

### Medical License Verification
**Brazil:**
- `CFM_API_KEY` - Official CFM API
- `INFOSIMPLES_API_TOKEN` - Third-party verification
- `CRM_API_KEY` - State-level verification

**Argentina:**
- `SISA_USERNAME` / `SISA_PASSWORD` - REFEPS/SISA API

**USA:**
- NPPES (National Provider Identifier Registry) - No API key required

### Security & Configuration
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `CRON_SECRET` - Secure cron job endpoints (`openssl rand -hex 32`)
- `LOG_LEVEL` - trace/debug/info/warn/error/fatal (default: info)

### Calendar OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google Calendar
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` - Outlook Calendar

### Blockchain (Optional)
- `PRIVATE_KEY` - Wallet private key
- `RPC_URL` - Polygon/Ethereum RPC endpoint

---

## 🎨 Usage in Code

### Get Type-Safe Environment Variables

```typescript
import { env } from '@/lib/env';

// Type-safe! TypeScript knows all available properties with IntelliSense
console.log(env.DATABASE_URL);
console.log(env.NEXT_PUBLIC_SUPABASE_URL);
console.log(env.ANTHROPIC_API_KEY);

// Access AI configuration
if (env.AI_PRIMARY_PROVIDER === 'gemini') {
  // Use Gemini
}
```

### Check if Feature is Enabled

```typescript
import { isFeatureEnabled } from '@/lib/env';

// Returns false if var is undefined, null, empty, "false", or "0"
if (isFeatureEnabled('RESEND_API_KEY')) {
  // Email features available
}

if (isFeatureEnabled('NEXT_PUBLIC_SENTRY_DSN')) {
  // Initialize Sentry
}

if (isFeatureEnabled('ANTHROPIC_API_KEY')) {
  // Claude AI available
}
```

### Get Required Variable (with runtime check)

```typescript
import { getRequiredEnv } from '@/lib/env';

// Throws if not set - use for critical runtime checks
const databaseUrl = getRequiredEnv('DATABASE_URL');
const apiKey = getRequiredEnv('ANTHROPIC_API_KEY');
```

### Parse Numeric/Boolean Values

```typescript
import { getNumericEnv, getBooleanEnv } from '@/lib/env';

// Parse numeric values with defaults
const maxRequests = getNumericEnv('MAX_CONCURRENT_AI_REQUESTS', 10);
const cacheTimeSeconds = getNumericEnv('AI_CACHE_TTL', 86400);

// Parse boolean values
const cacheEnabled = getBooleanEnv('AI_CACHE_ENABLED', true);
const fallbackEnabled = getBooleanEnv('AI_FALLBACK_ENABLED', true);
```

---

## 🧪 Testing

### Run Environment Validation

```bash
pnpm run validate:env
```

This script validates all environment variables and shows if validation passes or fails.

### Test Validation Behavior

```bash
tsx scripts/test-env-validation.ts
```

This comprehensive test will:
1. ✅ Test validation passes with current environment
2. ✅ Test validation fails without `NEXT_PUBLIC_SUPABASE_URL`
3. ✅ Test validation fails without `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. ✅ Test validation fails without `NEXT_PUBLIC_APP_URL`
5. ✅ Verify fail-fast behavior works correctly

### Run Before Build

The validation automatically runs before every build:

```bash
pnpm run build
# Runs: pnpm run validate:env && next build
```

### Run with Type Check

```bash
pnpm run typecheck
# Runs: tsc --noEmit && pnpm run validate:env
```

---

## 🔐 Security Best Practices

### ✅ DO:
- Set `ENCRYPTION_KEY` in production (64 hex chars)
- Use strong `NEXTAUTH_SECRET` (32+ characters)
- Rotate secrets regularly
- Keep `.env.local` in `.gitignore`

### ❌ DON'T:
- Commit secrets to git
- Share `.env` files in Slack/email
- Use development secrets in production
- Log environment variable values

---

## 📊 Validation Output

### Success (Development):
```
[22:12:19 UTC] INFO: Validating environment variables...
    event: "env_validation_start"

[22:12:19 UTC] INFO: Environment validation passed
    event: "env_validation_success"
    duration: 5
    nodeEnv: "development"
    hasDatabaseUrl: true
    hasSupabase: true
    hasEncryption: true
    hasRedis: false
```

### Success with Warnings (Production):
```
⚠️  Production Environment Warnings:

  • ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted (security risk!)
  • Redis not configured - rate limiting will not scale across instances
  • Sentry not configured - errors will not be tracked
```

---

## 🚀 How to Add New Environment Variables

1. **Add to schema** in `src/lib/env.ts`:
   ```typescript
   const envSchema = z.object({
     // ... existing vars
     MY_NEW_VAR: z.string().optional(),
   });
   ```

2. **Add to `.env.production.example`**:
   ```bash
   # My Feature
   MY_NEW_VAR=some-value-here
   ```

3. **TypeScript will autocomplete** - no manual types needed!

---

## 🔍 Debugging

### Check Current Environment:
```bash
pnpm tsx src/lib/__tests__/env.test.ts
```

### View Validation Logs:
Look for these events in your logs:
- `env_validation_start`
- `env_validation_success`
- `env_validation_failed`
- `env_validation_warnings`

### Common Issues:

**"Required" error but var is set:**
- Check for typos in variable name
- Ensure no spaces around `=` in `.env`
- Restart development server

**"Must be a valid URL" error:**
- Ensure URL includes `https://`
- No trailing spaces
- No quotes around URL

**"Must be X characters" error:**
- Check actual length: `echo -n $VAR | wc -c`
- Regenerate if needed

---

## 📞 Generating Secrets

### NEXTAUTH_SECRET (32+ chars):
```bash
openssl rand -base64 32
```

### ENCRYPTION_KEY (64 hex chars):
```bash
openssl rand -hex 32
```

### CSRF_SECRET:
```bash
openssl rand -base64 24
```

---

## 🎯 Next Steps

1. **In DigitalOcean:**
   - Go to your app → Settings → App-Level Environment Variables
   - Add all required variables
   - Redeploy

2. **After Deployment:**
   - Check logs for validation messages
   - Fix any warnings
   - Test that features work

3. **Optional:**
   - Add Sentry DSN for error tracking
   - Add Resend API key for emails
   - Add Redis for rate limiting

---

## ✅ Checklist for Production

Before deploying, ensure these are set in DigitalOcean:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `DATABASE_URL`
- [ ] `ENCRYPTION_KEY` (64 hex characters)
- [ ] `NEXTAUTH_SECRET` (32+ characters)
- [ ] `NODE_ENV=production`

Optional but recommended:
- [ ] `RESEND_API_KEY` (for emails)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (for error tracking)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (for Redis)

---

**🎉 You now have bulletproof environment variable validation!**

No more mysterious production crashes due to missing config.
