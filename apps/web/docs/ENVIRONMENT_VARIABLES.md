# Production Environment Variables Guide

Complete reference for all environment variables required for HoliLabs production deployment.

---

## 📋 Environment Variables Checklist

### ✅ Required (Critical - App won't work without these)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@host:5432/db?sslmode=require` | DigitalOcean Database or your DB provider |
| `NEXTAUTH_SECRET` | NextAuth.js session encryption key | `openssl rand -hex 32` output | Generate with OpenSSL |
| `SESSION_SECRET` | Patient portal session encryption | `openssl rand -hex 32` output | Generate with OpenSSL |
| `ENCRYPTION_KEY` | PHI data encryption key (AES-256) | `openssl rand -hex 32` output | Generate with OpenSSL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGci...` | Supabase Dashboard → Settings → API |

### ⚠️ Highly Recommended (Core features won't work)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) | `eyJhbGci...` | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY` | Email service for notifications | `re_xxxxx` | resend.com/api-keys |
| `GOOGLE_AI_API_KEY` | Gemini 2.0 for SOAP note generation | `AIzaSyC...` | Google AI Studio |
| `ASSEMBLYAI_API_KEY` | Speech-to-text transcription | `7c91616a...` | AssemblyAI Dashboard |
| `VAPID_PUBLIC_KEY` | Web Push Notifications (public) | `BPgdD0E...` | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push Notifications (private) | `JIiusRQ...` | Same command as above |
| `VAPID_EMAIL` | Contact email for push notifications | `mailto:notifications@yourapp.com` | Your support email |

### 🔧 Optional (Enhanced features)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `TWILIO_ACCOUNT_SID` | WhatsApp/SMS notifications | `ACxxxxx` | twilio.com/console |
| `TWILIO_AUTH_TOKEN` | Twilio authentication | `xxxxx` | Twilio Console |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp Business number | `whatsapp:+14155238886` | Twilio Console → WhatsApp |
| `UPSTASH_REDIS_REST_URL` | Redis for rate limiting | `https://xxxxx.upstash.io` | upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | `AXx0ASQ...` | Upstash Console |
| `LOGTAIL_SOURCE_TOKEN` | BetterStack logging | `xxxxx` | logs.betterstack.com |
| `SENTRY_DSN` | Error tracking | `https://xxx@sentry.io/123` | sentry.io |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 document storage | `xxxxx` | Cloudflare Dashboard → R2 |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `xxxxx` | Cloudflare R2 |
| `R2_ENDPOINT` | R2 endpoint URL | `https://xxxxx.r2.cloudflarestorage.com` | Cloudflare R2 |
| `R2_BUCKET` | R2 bucket name | `holilabs-documents` | Cloudflare R2 |
| `CRON_SECRET` | Webhook secret for cron jobs | `openssl rand -hex 32` output | Generate yourself |

### 🔒 System Configuration

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `NODE_ENV` | Environment mode | `production` | Set automatically by DigitalOcean |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` | Recommended for production |
| `NEXT_PUBLIC_APP_URL` | Full app URL | `https://holilabs-lwp6y.ondigitalocean.app` | Your deployed URL |

---

## 🔐 How to Generate Secrets

### Generate Random Secrets

```bash
# Generate NEXTAUTH_SECRET, SESSION_SECRET, ENCRYPTION_KEY
openssl rand -hex 32

# Example output:
# af29a0e80290be12cf8618d6b22d1e6b637dd6a8e0de4cb2b623f1df9c8c3a14
```

### Generate VAPID Keys for Push Notifications

```bash
# Install web-push globally
npm install -g web-push

# Generate keys
npx web-push generate-vapid-keys

# Output:
# Public Key: BPgdD0ETGgvkFq0yV3jyRcIoq725bXPbytjUQxmO5LQt5OOG4GH5bx9hyLf5Vr3m9bnzKIwAnyEciPqaK87qalw
# Private Key: JIiusRQIKGIduu_7_j0GEjESSRw2VJLQASKTB6a_2yk
```

---

## 📝 Setting Environment Variables in DigitalOcean

### Via Web Console

1. Go to: **App Platform → Your App → Settings → App-Level Environment Variables**
2. Click **Edit** or **Add Variable**
3. Add each variable:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://...`
   - **Scope:** All components (or specific to web)
   - **Type:** Secret (for sensitive values)
4. Click **Save**
5. Redeploy app to apply changes

### Via DigitalOcean CLI (`doctl`)

```bash
# Set a single variable
doctl apps update <app-id> --spec - <<EOF
envs:
  - key: DATABASE_URL
    value: postgresql://...
    scope: RUN_AND_BUILD_TIME
    type: SECRET
EOF

# Or use app.yaml (recommended)
# Edit .do/app.yaml and push to git
```

### Via `.do/app.yaml` (Recommended)

```yaml
# .do/app.yaml
name: holilabs
services:
  - name: web
    envs:
      # Required
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        type: SECRET
        # Value set in DO console

      - key: NEXTAUTH_SECRET
        scope: RUN_TIME
        type: SECRET

      - key: NEXT_PUBLIC_SUPABASE_URL
        value: https://your-project.supabase.co
        scope: RUN_AND_BUILD_TIME
```

**Note:** Don't commit secrets to git! Set them via console or use DO's secret management.

---

## 🔍 Verify Environment Variables

### Check if Variables are Set (DigitalOcean Console)

```bash
# Via app console
printenv | grep -E "DATABASE_URL|NEXTAUTH_SECRET|ENCRYPTION_KEY"
```

### Check in Application Logs

Look for warnings during app startup:

```
⚠️ Missing required: ENCRYPTION_KEY
⚠️ Optional not set: TWILIO_ACCOUNT_SID
✅ DATABASE_URL is set
```

### Via Health Endpoint

```bash
curl https://your-app.ondigitalocean.app/api/health

# Should return database connection status
```

---

## 🗂️ Environment Variable Templates

### Minimal Production Setup (Core Features Only)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Authentication & Security
NEXTAUTH_SECRET=<generate with openssl rand -hex 32>
SESSION_SECRET=<generate with openssl rand -hex 32>
ENCRYPTION_KEY=<generate with openssl rand -hex 32>

# Supabase (Auth & Storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>

# Email
RESEND_API_KEY=<from resend.com>

# AI Services
GOOGLE_AI_API_KEY=<from Google AI Studio>
ASSEMBLYAI_API_KEY=<from AssemblyAI>

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generate with web-push>
VAPID_PRIVATE_KEY=<generate with web-push>
VAPID_EMAIL=mailto:notifications@yourapp.com

# System
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=https://your-app.ondigitalocean.app
```

### Full Production Setup (All Features)

Add to minimal setup above:

```bash
# WhatsApp/SMS Notifications
TWILIO_ACCOUNT_SID=<from Twilio>
TWILIO_AUTH_TOKEN=<from Twilio>
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Rate Limiting & Caching
UPSTASH_REDIS_REST_URL=<from Upstash>
UPSTASH_REDIS_REST_TOKEN=<from Upstash>

# Monitoring & Logging
LOGTAIL_SOURCE_TOKEN=<from BetterStack>
SENTRY_DSN=<from Sentry>

# Document Storage
R2_ACCESS_KEY_ID=<from Cloudflare>
R2_SECRET_ACCESS_KEY=<from Cloudflare>
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_BUCKET=holilabs-documents

# Cron Jobs
CRON_SECRET=<generate with openssl rand -hex 32>
```

---

## 🔐 Security Best Practices

### DO ✅

- **Generate strong secrets** - Use `openssl rand -hex 32` for all secrets
- **Use DigitalOcean's secret management** - Mark sensitive variables as "SECRET" type
- **Rotate secrets quarterly** - Update NEXTAUTH_SECRET, ENCRYPTION_KEY, etc.
- **Use SSL for database** - Always include `?sslmode=require` in DATABASE_URL
- **Separate dev/staging/prod secrets** - Never reuse production secrets in other environments
- **Store secrets in password manager** - Keep backup of all production secrets

### DON'T ❌

- **Never commit secrets to git** - Use `.gitignore` for `.env` files
- **Don't log secrets** - Remove `console.log` statements with sensitive data
- **Don't share secrets via chat/email** - Use secure sharing tools
- **Don't use weak secrets** - No "password123" or simple strings
- **Don't reuse secrets across services** - Each service should have unique keys
- **Don't store secrets in frontend** - Only NEXT_PUBLIC_* variables go to client

---

## 🐛 Troubleshooting

### Error: "Missing required environment variable"

**Solution:**
1. Check variable is set in DigitalOcean console
2. Verify variable name spelling (case-sensitive!)
3. Redeploy app after adding variables

### Error: "Invalid NEXTAUTH_SECRET"

**Solution:**
```bash
# Generate new secret
openssl rand -hex 32

# Update in DigitalOcean console
# Redeploy app
```

### Database connection fails

**Solution:**
- Check DATABASE_URL includes `?sslmode=require`
- Verify firewall allows app to access database
- Test connection from DigitalOcean console:
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```

### Supabase authentication not working

**Solution:**
- Verify both ANON_KEY and SERVICE_ROLE_KEY are set
- Check Supabase project URL is correct (includes `https://`)
- Ensure keys match your Supabase project (Settings → API)

---

## 📞 Getting API Keys

### Resend (Email)
1. Sign up: https://resend.com
2. Create API key: Dashboard → API Keys → Create
3. Copy key (starts with `re_`)

### Google AI Studio (Gemini)
1. Go to: https://aistudio.google.com/apikey
2. Click "Get API Key"
3. Copy key (starts with `AIzaSy`)

### AssemblyAI (Transcription)
1. Sign up: https://www.assemblyai.com
2. Dashboard → API Keys
3. Copy key

### Twilio (WhatsApp/SMS)
1. Sign up: https://www.twilio.com
2. Console → Account → Account SID & Auth Token
3. WhatsApp: Console → Messaging → Try it out → WhatsApp Sandbox

### Upstash Redis
1. Sign up: https://upstash.com
2. Create Redis database
3. Copy REST URL and Token from dashboard

### BetterStack (Logging)
1. Sign up: https://logs.betterstack.com
2. Create source
3. Copy source token

### Cloudflare R2 (Storage)
1. Cloudflare Dashboard → R2
2. Create bucket
3. Manage R2 API Tokens → Create API Token
4. Copy Access Key ID and Secret Access Key

---

## 📊 Environment Variable Audit

Before deploying to production, verify:

- [ ] All required variables are set
- [ ] All secrets are strong (32+ characters, random)
- [ ] DATABASE_URL includes SSL (`?sslmode=require`)
- [ ] NEXTAUTH_SECRET is production-specific (not from .env.local)
- [ ] ENCRYPTION_KEY is production-specific and backed up securely
- [ ] NEXT_PUBLIC_APP_URL matches deployed domain
- [ ] Email service (Resend) is configured and verified
- [ ] AI services (Google AI, AssemblyAI) have sufficient quotas
- [ ] Web Push VAPID keys are generated and saved
- [ ] All API keys are from production accounts (not sandbox/test)

---

**Last Updated:** October 14, 2025
**Version:** 1.0.0
