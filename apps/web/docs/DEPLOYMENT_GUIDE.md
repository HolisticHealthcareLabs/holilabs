# 🚀 Production Deployment Guide

Step-by-step guide to deploy Holi Labs healthcare platform to production.

**Estimated Time:** 2-3 hours
**Difficulty:** Intermediate

---

## Prerequisites

Before starting, ensure you have:

- [ ] DigitalOcean account with billing set up
- [ ] GitHub repository access
- [ ] Supabase project already configured
- [ ] PostgreSQL database accessible
- [ ] Domain name (optional, but recommended)

---

## Phase 1: Generate Security Secrets (15 minutes)

### Step 1.1: Generate Encryption Keys

Run these commands locally to generate secure secrets:

```bash
# Navigate to your project
cd /Users/nicolacapriroloteran/vidabanq-health-ai/apps/web

# Generate NEXTAUTH_SECRET (32 bytes base64)
openssl rand -base64 32

# Generate SESSION_SECRET (32 bytes base64)
openssl rand -base64 32

# Generate ENCRYPTION_MASTER_KEY (32 bytes base64)
openssl rand -base64 32
```

**Save these securely!** You'll need them in Step 3.

### Step 1.2: Generate VAPID Keys for Push Notifications

```bash
npx web-push generate-vapid-keys
```

**Output will look like:**
```
Public Key: BDjeg3nfNw...
Private Key: xKpw7F5...
```

**Save both keys!** You'll need them for environment variables.

### Step 1.3: Document Your Secrets

Create a temporary file `secrets.txt` (DO NOT COMMIT):

```bash
# Create secure file (Mac/Linux)
touch ~/holi-secrets.txt
chmod 600 ~/holi-secrets.txt

# Edit with your favorite editor
nano ~/holi-secrets.txt
```

**Template:**
```
=== HOLI LABS PRODUCTION SECRETS ===
Generated: [DATE]

NEXTAUTH_SECRET=[paste from step 1.1]
SESSION_SECRET=[paste from step 1.1]
ENCRYPTION_MASTER_KEY=[paste from step 1.1]

NEXT_PUBLIC_VAPID_PUBLIC_KEY=[paste from step 1.2]
VAPID_PRIVATE_KEY=[paste from step 1.2]
VAPID_SUBJECT=mailto:admin@yourdomain.com

[Add other secrets as you generate them below]
```

---

## Phase 2: Set Up External Services (30-45 minutes)

### Step 2.1: Upstash Redis (Rate Limiting)

**Why:** Rate limiting to prevent API abuse

1. **Sign up:** https://upstash.com/ (Free tier available)
2. **Create Redis Database:**
   - Click "Create Database"
   - Choose region closest to your DigitalOcean datacenter
   - Select "Global" for multi-region (optional)
3. **Get Credentials:**
   - Click on your database
   - Copy "UPSTASH_REDIS_REST_URL"
   - Copy "UPSTASH_REDIS_REST_TOKEN"
4. **Save to secrets file:**
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

**Test Connection (Optional):**
```bash
curl -X GET $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Should return: {"result":"PONG"}
```

### Step 2.2: Cloudflare R2 or AWS S3 (File Storage)

**Why:** Encrypted file storage for patient documents

#### Option A: Cloudflare R2 (Recommended - Cheaper)

1. **Sign up:** https://dash.cloudflare.com/
2. **Create R2 Bucket:**
   - Go to R2 Object Storage
   - Click "Create bucket"
   - Name: `holi-labs-storage` (or your choice)
   - Region: Automatic
3. **Generate API Keys:**
   - Click "Manage R2 API Tokens"
   - Click "Create API Token"
   - Permissions: "Object Read & Write"
   - Copy "Access Key ID" and "Secret Access Key"
4. **Get Endpoint:**
   - Format: `https://<account-id>.r2.cloudflarestorage.com`
   - Find your account ID in dashboard URL
5. **Save credentials:**
   ```
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_BUCKET=holi-labs-storage
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   ```

#### Option B: AWS S3

1. **AWS Console:** https://console.aws.amazon.com/s3/
2. **Create Bucket:**
   - Click "Create bucket"
   - Name: `holi-labs-storage`
   - Region: Choose closest to your app
   - Block all public access: ✅ Enabled
3. **Create IAM User:**
   - Go to IAM → Users → Add users
   - Permissions: `AmazonS3FullAccess` (or custom policy)
   - Generate access keys
4. **Save credentials:**
   ```
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_BUCKET=holi-labs-storage
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

**Test Upload (Optional):**
```bash
# Install AWS CLI first: brew install awscli

# For R2:
aws s3 ls s3://your-bucket --endpoint-url=$R2_ENDPOINT

# For S3:
aws s3 ls s3://your-bucket
```

### Step 2.3: Sentry Error Monitoring

**Why:** Track errors and performance in production

1. **Sign up:** https://sentry.io/ (Free tier available)
2. **Create Project:**
   - Choose "Next.js"
   - Project name: "holi-labs-web"
3. **Get DSN:**
   - Project Settings → Client Keys (DSN)
   - Copy the DSN URL
4. **Create Auth Token:**
   - User Settings → Auth Tokens
   - Click "Create New Token"
   - Scopes: `project:read`, `project:releases`, `org:read`
   - Copy token
5. **Save credentials:**
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=holi-labs-web
   ```

---

## Phase 3: Configure DigitalOcean (30 minutes)

### Step 3.1: Verify App Platform Exists

```bash
# List your apps
doctl apps list

# If you see "holilabs-lwp6y", you're good!
```

**If app doesn't exist, create it:**
```bash
doctl apps create --spec .do/app.yaml
```

### Step 3.2: Set Environment Variables

Go to: https://cloud.digitalocean.com/apps

1. Click on your app
2. Go to "Settings" → "App-Level Environment Variables"
3. Add these variables:

#### Database
```
DATABASE_URL = postgresql://user:password@host:5432/database?sslmode=require
```
*Get this from your DigitalOcean Managed Database or existing provider*

#### Authentication & Security
```
NEXTAUTH_SECRET = [from secrets.txt]
SESSION_SECRET = [from secrets.txt]
ENCRYPTION_MASTER_KEY = [from secrets.txt]
ALLOWED_ORIGINS = https://yourdomain.com,https://holilabs-lwp6y.ondigitalocean.app
```

#### Supabase (Already configured)
```
NEXT_PUBLIC_SUPABASE_URL = [your existing value]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your existing value]
SUPABASE_SERVICE_ROLE_KEY = [your existing value]
```

#### AI Services (Already configured)
```
GOOGLE_AI_API_KEY = [your existing value]
DEEPGRAM_API_KEY = [your existing value]
ASSEMBLYAI_API_KEY = [your existing value]
```

#### Rate Limiting
```
UPSTASH_REDIS_REST_URL = [from Step 2.1]
UPSTASH_REDIS_REST_TOKEN = [from Step 2.1]
```

#### Cloud Storage (Choose R2 or S3)
```
# For Cloudflare R2:
R2_ENDPOINT = [from Step 2.2]
R2_BUCKET = [from Step 2.2]
R2_ACCESS_KEY_ID = [from Step 2.2]
R2_SECRET_ACCESS_KEY = [from Step 2.2]

# OR for AWS S3:
S3_ENDPOINT = https://s3.amazonaws.com
S3_BUCKET = [from Step 2.2]
AWS_ACCESS_KEY_ID = [from Step 2.2]
AWS_SECRET_ACCESS_KEY = [from Step 2.2]
```

#### Push Notifications
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = [from Step 1.2]
VAPID_PRIVATE_KEY = [from Step 1.2]
VAPID_SUBJECT = mailto:admin@yourdomain.com
```

#### Sentry
```
NEXT_PUBLIC_SENTRY_DSN = [from Step 2.3]
SENTRY_AUTH_TOKEN = [from Step 2.3]
SENTRY_ORG = [from Step 2.3]
SENTRY_PROJECT = [from Step 2.3]
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING = 1
```

#### Optional (if you have them)
```
RESEND_API_KEY = your-resend-key
TWILIO_ACCOUNT_SID = your-twilio-sid
TWILIO_AUTH_TOKEN = your-twilio-token
TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
```

#### App Configuration
```
NEXT_PUBLIC_APP_URL = https://yourdomain.com
NODE_ENV = production
LOG_LEVEL = info
```

4. **Save** - This will trigger a rebuild

---

## Phase 4: Database Setup (15 minutes)

### Step 4.1: Run Migrations

**Option A: Using DigitalOcean Console**

1. Go to your app → Console tab
2. Run:
   ```bash
   cd /workspace
   pnpm prisma migrate deploy
   ```

**Option B: From Local Machine**

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:password@production-host:5432/database?sslmode=require"

# Run migrations
pnpm prisma migrate deploy

# Verify
pnpm prisma migrate status
```

### Step 4.2: Seed Initial Data (Optional)

```bash
# If you want to create test users/data
pnpm db:seed
```

### Step 4.3: Verify Database Schema

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Should see all 12 tables:
# - users
# - patients
# - appointments
# - clinical_notes
# - medications
# - prescriptions
# - documents
# - consents
# - audit_logs
# - token_maps
# - blockchain_transactions
# - push_subscriptions
```

---

## Phase 5: GitHub CI/CD Setup (20 minutes)

### Step 5.1: Move Workflow Files

```bash
# From your project root
cd /Users/nicolacapriroloteran/vidabanq-health-ai

# Create workflows directory at monorepo root
mkdir -p .github/workflows

# Copy workflow files
cp apps/web/.github/workflows/deploy.yml .github/workflows/
cp apps/web/.github/workflows/test.yml .github/workflows/

# Optional: Remove from apps/web (to avoid confusion)
rm -rf apps/web/.github/workflows
```

### Step 5.2: Add GitHub Secrets

Go to: https://github.com/your-org/your-repo/settings/secrets/actions

Add these secrets:

#### Required for Deployment
```
DIGITALOCEAN_ACCESS_TOKEN = [from DigitalOcean → API → Generate Token]
DIGITALOCEAN_APP_ID = [your app ID, get with: doctl apps list]
```

#### Required for Sentry
```
NEXT_PUBLIC_SENTRY_DSN = [same as Step 2.3]
SENTRY_AUTH_TOKEN = [same as Step 2.3]
SENTRY_ORG = [same as Step 2.3]
SENTRY_PROJECT = [same as Step 2.3]
```

#### Required for Tests
```
DATABASE_URL = [test database URL, can be same as production for now]
NEXT_PUBLIC_SUPABASE_URL = [same as production]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [same as production]
NEXT_PUBLIC_APP_URL = http://localhost:3000
```

#### Optional
```
CODECOV_TOKEN = [if you want code coverage reports]
```

### Step 5.3: Enable GitHub Actions

1. Go to repository → Actions tab
2. If disabled, click "I understand my workflows, go ahead and enable them"

---

## Phase 6: Deploy! (10 minutes)

### Option A: Deploy via Git Push (Recommended)

```bash
# Commit any pending changes
git add .
git commit -m "Configure production environment"

# Push to main branch (triggers deployment)
git push origin main
```

**Monitor deployment:**
- GitHub Actions: https://github.com/your-org/your-repo/actions
- DigitalOcean: https://cloud.digitalocean.com/apps

### Option B: Manual Deploy

```bash
# Get your app ID
doctl apps list

# Deploy
doctl apps create-deployment YOUR_APP_ID --wait

# Follow logs
doctl apps logs YOUR_APP_ID --type=run --follow
```

---

## Phase 7: Verify Deployment (10 minutes)

### Step 7.1: Health Checks

```bash
# Basic health
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# Expected: {"status":"ok","timestamp":"..."}

# Liveness probe
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/live

# Readiness probe
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready

# Expected: {"status":"healthy", "checks": {...}}
```

### Step 7.2: Test Authentication

1. Go to: https://holilabs-lwp6y.ondigitalocean.app/auth/login
2. Try logging in with your test account
3. Verify dashboard loads

### Step 7.3: Test File Upload

1. Go to dashboard → Upload document
2. Upload a test file
3. Verify it appears in Supabase Storage and R2/S3

### Step 7.4: Test Push Notifications

1. Go to dashboard → Enable notifications
2. Allow browser notifications
3. Send a test notification
4. Verify it appears

### Step 7.5: Check Sentry

1. Go to: https://sentry.io/organizations/your-org/projects/holi-labs-web/
2. Verify "0 events" (no errors on initial deployment)
3. Check performance metrics

---

## Phase 8: Post-Deployment (Ongoing)

### Step 8.1: Set Up Monitoring Alerts

**Sentry Alerts:**
1. Go to Sentry → Alerts → Create Alert
2. Set up:
   - Error rate > 10 errors/hour
   - Performance degradation > 500ms p95
   - Send to: your email

**DigitalOcean Alerts:**
1. Go to app → Alerts
2. Set up:
   - CPU > 80%
   - Memory > 80%
   - Restart count > 3

**UptimeRobot (Free):**
1. Sign up: https://uptimerobot.com/
2. Add monitor:
   - Type: HTTPS
   - URL: https://holilabs-lwp6y.ondigitalocean.app/api/health/ready
   - Interval: 5 minutes
   - Alert: Email when down

### Step 8.2: Schedule Database Backups

```bash
# Add to crontab on a server with database access
# Daily backup at 2 AM
0 2 * * * cd /path/to/app && pnpm backup:daily

# Weekly backup on Sunday at 3 AM
0 3 * * 0 cd /path/to/app && pnpm backup:weekly

# Monthly backup on 1st at 4 AM
0 4 1 * * cd /path/to/app && pnpm backup:monthly
```

Or use DigitalOcean Managed Database automated backups.

### Step 8.3: Configure Custom Domain (Optional)

1. Go to DigitalOcean App Platform
2. Settings → Domains
3. Add your domain
4. Add DNS records as instructed
5. Wait for SSL certificate (automatic)

### Step 8.4: Review Security

- [ ] All secrets are environment variables (no hardcoded values)
- [ ] HTTPS is enforced
- [ ] Rate limiting is active
- [ ] Audit logging is working
- [ ] File encryption is enabled
- [ ] Security headers are set

### Step 8.5: Documentation

- [ ] Share docs with team
- [ ] Train team on new features
- [ ] Create runbooks for common operations
- [ ] Document incident response procedures

---

## Troubleshooting

### Build Fails

**Error:** `Module not found` or `Type error`

```bash
# Clear cache and rebuild
doctl apps create-deployment YOUR_APP_ID --force-rebuild
```

### Database Connection Error

**Error:** `Can't reach database server`

1. Verify DATABASE_URL is correct
2. Check database is running
3. Verify SSL mode: add `?sslmode=require` to DATABASE_URL
4. Check firewall rules allow DigitalOcean IPs

### 503 Service Unavailable

**Check readiness probe:**
```bash
curl https://your-app-url/api/health/ready
```

If database is unhealthy, check:
1. DATABASE_URL is set correctly
2. Database is accepting connections
3. Migrations have been run

### Rate Limiting Not Working

1. Verify UPSTASH_REDIS_REST_URL and TOKEN are set
2. Test Redis connection:
   ```bash
   curl -X GET $UPSTASH_REDIS_REST_URL/ping \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```
3. Check logs for rate limiting errors

### Push Notifications Fail

**Error:** `Push notifications not configured`

1. Verify VAPID keys are set
2. Check VAPID_SUBJECT format: `mailto:your-email@domain.com`
3. Ensure HTTPS is enabled (required for push)

---

## Quick Reference Commands

```bash
# Deploy
git push origin main

# View logs
doctl apps logs YOUR_APP_ID --type=run --follow

# Restart app
doctl apps create-deployment YOUR_APP_ID

# Check health
curl https://your-app-url/api/health/ready

# Run migrations
export DATABASE_URL="your-prod-db-url"
pnpm prisma migrate deploy

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# View Sentry errors
open https://sentry.io/organizations/your-org/issues/

# Monitor uptime
open https://uptimerobot.com/dashboard
```

---

## Cost Estimate

| Service | Plan | Cost/Month |
|---------|------|------------|
| DigitalOcean App Platform | Basic | $12 |
| DigitalOcean Database | Dev DB | $15 |
| Upstash Redis | Free | $0 |
| Cloudflare R2 | Free (10GB) | $0-5 |
| Sentry | Developer | $26 |
| Supabase | Pro | $25 |
| UptimeRobot | Free | $0 |
| **Total** | | **~$78/month** |

*Scale up as needed for production traffic*

---

## Next Steps After Deployment

1. **Testing:** Run smoke tests with `pnpm test:e2e tests/smoke.spec.ts`
2. **Monitoring:** Check Sentry and UptimeRobot daily
3. **Optimization:** Review performance metrics after 1 week
4. **Security:** Schedule penetration testing
5. **Compliance:** Begin HIPAA compliance review and BAA signing
6. **Features:** Calendar OAuth, email notifications, SMS integration

---

## Support

- **Documentation:** Check `/docs` folder
- **API Reference:** `docs/API_DOCUMENTATION.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`
- **Sentry:** https://sentry.io
- **DigitalOcean:** https://cloud.digitalocean.com/support

---

**🎉 Congratulations!** Your healthcare platform is now live in production.

**Last Updated:** October 11, 2025
**Version:** 1.0.0
