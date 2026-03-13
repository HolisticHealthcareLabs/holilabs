# DigitalOcean Droplet - HoliLabs Deployment Master Prompt

## 🎯 MISSION
You are assisting with debugging and deploying the HoliLabs healthcare platform on a DigitalOcean droplet. The codebase is complete and pushed to GitHub, but changes are not reflecting on holilabs.xyz. Your task is to identify why and fix the deployment.

## 🚀 Begin iOS App Iteration

We are starting the iteration process for the iOS app version of our HoliLabs website.

### 1. Access the Expo Project

- Navigate to the directory containing the Expo-managed React Native app for HoliLabs.
- Ensure your project includes `expo` as a dependency and has a valid `app.json` or `app.config.js` configuration.

### 2. Start the Expo Development Server

Open your terminal and run:
```sh
expo start
```
_Alternatively, use_ `npx expo start` _if expo is not installed globally._

### 3. Render the ExpoGo QR Code

- When the development server launches, it will display a QR code in your terminal or browser window (at http://localhost:19002).
- Open the **Expo Go** app on your iOS device.
- Use Expo Go’s “Scan QR Code” feature to scan the QR code.

### 4. Visualize the App

- Your iOS device will now load the latest version of your code for live preview and debugging.

> **Tip:** If you’re using a remote server or CI/CD to build your app, ensure your local machine and mobile device are on the same network for QR code scanning.

---

**Next Steps:**
- Make code changes as needed and save—the iOS app in Expo Go will auto-refresh.
- Iteratively test and refine the mobile experience for HoliLabs.

Let me know if you encounter any issues with Expo, QR code generation, or device pairing!

## 📋 PROJECT OVERVIEW

**Application:** HoliLabs - HIPAA-compliant healthcare platform
**Tech Stack:** Next.js 14, Prisma, PostgreSQL, Supabase Auth, Tailwind CSS
**GitHub Repo:** https://github.com/HolisticHealthcareLabs/holilabs
**Production URL:** https://holilabs.xyz (currently not reflecting latest changes)
**Current Branch:** main
**Latest Commit:** c7aa154 (fix: resolve deployment issues and ensure correct GitHub repository integration)

---

## ✅ WHAT'S BEEN COMPLETED LOCALLY

### All 13 Enterprise Readiness Features:
1. ✅ CI/CD database backup automation
2. ✅ CI/CD rollback mechanism
3. ✅ Real test suite (E2E, unit, integration)
4. ✅ Git-secrets pre-commit hook (code ready)
5. ✅ GitHub branch protection rules (documented)
6. ✅ E2E test coverage (patient portal, appointments, prescriptions, SOAP notes)
7. ✅ k6 load testing scenarios (5 comprehensive tests)
8. ✅ Monitoring and alerting baselines (Sentry integration, health endpoints)
9. ✅ DAST security scanning with OWASP ZAP (workflow ready)
10. ✅ Container image signing with Cosign (workflow ready)

### Recently Generated Secrets (Need to be added to DigitalOcean):
- ✅ Cosign keys for image signing
- ✅ Application secrets (NextAuth, Session, Encryption, CRON, DEID)
- ✅ VAPID keys for push notifications

### Security Features Implemented:
- Multi-factor authentication (MFA) with Twilio
- Policy-based RBAC with Casbin
- PHI encryption (AES-256-GCM)
- Audit logging with Bemi
- Session revocation with Redis
- Rate limiting
- CSRF protection
- Content Security Policy (CSP)

### Clinical Decision Support (CDSS):
- Differential diagnosis generation
- Treatment recommendations
- Drug interaction checking
- Clinical protocol automation
- AI-powered SOAP note generation

---

## 🔴 KNOWN ISSUES

### 1. Deployment Not Reflecting Changes
**Problem:** Code is pushed to GitHub main branch, but holilabs.xyz shows old version
**Possible Causes:**
- DigitalOcean App Platform not auto-deploying
- Build failures due to missing environment variables
- App Platform using wrong branch
- Manual deployment needed
- DNS/CDN caching issue

### 2. Missing Environment Variables
**Critical secrets that may be missing in DigitalOcean App Settings:**
```
NEXTAUTH_SECRET
SESSION_SECRET
ENCRYPTION_KEY
ENCRYPTION_MASTER_KEY
CRON_SECRET
DEID_SECRET
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY (needs rotation - old key exposed)
RESEND_API_KEY (needs rotation - old key exposed)
DEEPGRAM_API_KEY (needs rotation - old key exposed)
```

### 3. Exposed API Keys (URGENT)
These keys were found in git history and MUST be rotated:
- Resend: `<REDACTED-REVOKE-AND-REGENERATE>`
- Anthropic: `sk-ant-api03-EWTQVhNAL...`
- Deepgram: `70b3a1428255db754512e34eafad42a18c02311c`
- Twilio Auth Token (potentially exposed)

---

## 🔍 DEBUGGING STEPS

### Step 1: Check Deployment Status
```bash
# If doctl is installed:
doctl apps list
doctl apps get <APP_ID>
doctl apps list-deployments <APP_ID>

# Check most recent deployment:
doctl apps get-deployment <APP_ID> <DEPLOYMENT_ID>

# View deployment logs:
doctl apps logs <APP_ID> --type build
doctl apps logs <APP_ID> --type run
```

### Step 2: Verify App Configuration
Check if the app is configured correctly:
- **Branch:** Should be `main`
- **Auto-deploy:** Should be enabled
- **Build command:** `cd apps/web && pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build`
- **Run command:** `cd apps/web && pnpm start`
- **Health check:** `/api/health` endpoint

### Step 3: Check Environment Variables
Verify these critical variables are set in DigitalOcean App Platform → Settings → App-Level Environment Variables:
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://holilabs.xyz
DATABASE_URL=[connection string]
NEXTAUTH_SECRET=[secret]
ENCRYPTION_KEY=[secret]
```

### Step 4: Inspect Build Logs
Look for common errors:
- Missing dependencies
- Prisma generation failures
- TypeScript compilation errors
- Missing environment variables at build time
- Out of memory errors

### Step 5: Check DNS/CDN
```bash
# Verify DNS resolution
dig holilabs.xyz
nslookup holilabs.xyz

# Check if behind Cloudflare/CDN (may need cache purge)
curl -I https://holilabs.xyz

# Force bypass cache
curl -H "Cache-Control: no-cache" https://holilabs.xyz
```

---

## 🛠️ COMMON FIXES

### Fix 1: Trigger Manual Deployment
If auto-deploy is failing:
```bash
# Via doctl:
doctl apps create-deployment <APP_ID>

# Or via GitHub Actions:
# Go to: https://github.com/HolisticHealthcareLabs/holilabs/actions/workflows/deploy-production.yml
# Click "Run workflow" → Select main branch → Type "deploy" to confirm
```

### Fix 2: Update Environment Variables
**Location:** DigitalOcean → Apps → holi-labs → Settings → App-Level Environment Variables

**Add these NEW secrets** (generated on local machine):
```
NEXTAUTH_SECRET=e0294559ca120fbe5d11a50ee0d3570e2e4e7504df89e81436f784e91a6744a6
SESSION_SECRET=9cac13b2390b4d802354919faf01e0f9e7eed3b83bb0dda7fcbde21a077a0e33
ENCRYPTION_KEY=d20jPBKhOoyjtrpjz4OKvlJWx+gA6KFdbdW7T+SHnAI=
ENCRYPTION_MASTER_KEY=XLqQeXbPsnCA6ZBxEFUxt5Yx/xmCLTz/vxAvyrkB6Z0=
CRON_SECRET=95ea7e674a2a1322b40192188484322b1d605b8ae7946ee181899fad6f3c7c1c
DEID_SECRET=f123bd0c6d1b4d9918cd3e89e4988bb181543572f40f6429421738ab21398d30
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOxjJujL-bGHtZShv134tngJZ_UjHNAPMyTzpCzSYnEsGRKSaoxFqH0YmypUmrJJRAKnpMAW1JiiaxINVWboeGc
VAPID_PRIVATE_KEY=6pscczDWFBDV0a5seqw_VPjLgaBbHY-TPTdRkCS-ju0
```

**After adding variables:** Redeploy the app

### Fix 3: Purge CDN Cache
If using Cloudflare or DigitalOcean CDN:
```bash
# Cloudflare purge (if applicable):
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# DigitalOcean CDN endpoint (if configured):
doctl compute cdn flush <CDN_ID>
```

### Fix 4: Restart App
Sometimes a simple restart helps:
```bash
doctl apps restart <APP_ID>
```

---

## 🏗️ DEPLOYMENT ARCHITECTURE

### Current Setup:
- **Hosting:** DigitalOcean App Platform
- **Database:** DigitalOcean Managed PostgreSQL (or Supabase)
- **Container Registry:** DigitalOcean Container Registry
- **Domain:** holilabs.xyz → DigitalOcean App Platform
- **Auto-deploy:** Enabled on push to `main` branch

### Deployment Flow:
```
1. Developer pushes to main branch (GitHub)
2. GitHub triggers webhook to DigitalOcean
3. DigitalOcean App Platform pulls latest code
4. Build runs: pnpm install → prisma generate → pnpm build
5. Container image created
6. Health check performed (/api/health)
7. New version deployed (rolling update)
8. DNS updated to point to new containers
```

### Files Involved:
- `.do/app.yaml` - DigitalOcean app configuration
- `.github/workflows/deploy-production.yml` - GitHub Actions deployment
- `apps/web/Dockerfile` - Container build configuration
- `apps/web/package.json` - Build scripts

---

## 📁 KEY FILE LOCATIONS

```
/apps/web/                     # Main Next.js application
├── src/
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── lib/                   # Utilities and helpers
│   ├── middleware.ts          # Next.js middleware (auth, RBAC)
│   └── types/                 # TypeScript definitions
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── .env.example               # Environment variable template
├── next.config.mjs            # Next.js configuration
└── package.json               # Dependencies and scripts

/.github/workflows/            # CI/CD pipelines
/.do/app.yaml                  # DigitalOcean configuration
/scripts/                      # Utility scripts
/k6/                           # Load testing scenarios
```

---

## 🔐 SECURITY CHECKLIST

Before deployment is complete, verify:
- [ ] All exposed API keys have been rotated
- [ ] New secrets added to DigitalOcean environment variables
- [ ] Database backups are configured
- [ ] Health check endpoint is responding
- [ ] HTTPS is enforced
- [ ] CSP headers are set
- [ ] Rate limiting is active
- [ ] Audit logging is enabled
- [ ] MFA is configured for admin users

---

## 🎯 IMMEDIATE ACTION ITEMS

### Priority 1 (DO NOW):
1. Check DigitalOcean App Platform deployment status
2. Review build/runtime logs for errors
3. Verify all environment variables are set
4. Trigger manual deployment if needed

### Priority 2 (NEXT):
1. Rotate exposed API keys:
   - Resend → https://resend.com/api-keys
   - Anthropic → https://console.anthropic.com/settings/keys
   - Deepgram → https://console.deepgram.com/
   - Twilio → https://console.twilio.com/
2. Update rotated keys in DigitalOcean environment variables

### Priority 3 (VALIDATION):
1. Test holilabs.xyz loads correctly
2. Verify health endpoint: https://holilabs.xyz/api/health
3. Test user authentication
4. Verify database connectivity
5. Check monitoring endpoints

---

## 🆘 TROUBLESHOOTING COMMANDS

### Check if app is running:
```bash
curl -I https://holilabs.xyz
curl https://holilabs.xyz/api/health | jq
```

### Check database connectivity:
```bash
# From droplet (if database URL is available):
psql "$DATABASE_URL" -c "SELECT version();"
```

### Check logs in real-time:
```bash
doctl apps logs <APP_ID> --follow
```

### Get app info:
```bash
doctl apps get <APP_ID> --format ID,Spec.Name,ActiveDeployment.ID,ActiveDeployment.CreatedAt,ActiveDeployment.Phase
```

### List all environment variables:
```bash
doctl apps spec get <APP_ID>
```

---

## 📞 USEFUL RESOURCES

- **DigitalOcean Docs:** https://docs.digitalocean.com/products/app-platform/
- **GitHub Repo:** https://github.com/HolisticHealthcareLabs/holilabs
- **Local Secrets Backup:** `~/.holilabs-secrets-backup/ALL_GITHUB_SECRETS.txt` (on developer's machine)
- **Deployment Guide:** `/DEPLOYMENT_GUIDE.md` (in repo)
- **Monitoring Setup:** `/MONITORING_SETUP_GUIDE.md` (in repo)

---

## 🎬 START HERE

Run these commands first to understand the current state:

```bash
# 1. Check if doctl is installed and authenticated
doctl auth list

# 2. List apps
doctl apps list

# 3. Get specific app details (replace <APP_ID> with actual ID)
doctl apps get <APP_ID>

# 4. Check recent deployments
doctl apps list-deployments <APP_ID> --format ID,Phase,CreatedAt | head -10

# 5. View latest logs
doctl apps logs <APP_ID> --type build --tail 100
doctl apps logs <APP_ID> --type run --tail 100

# 6. Test production URL
curl -v https://holilabs.xyz/api/health
```

Then report back what you find, and I'll guide you through the fix!

---

## 💡 EXPECTED OUTCOMES

After fixing the deployment, you should see:
1. ✅ holilabs.xyz loads the latest version
2. ✅ Health endpoint returns 200 status
3. ✅ User authentication works
4. ✅ Database queries succeed
5. ✅ No errors in application logs
6. ✅ All features functional (appointments, SOAP notes, prescriptions)

---

## ⚠️ CRITICAL NOTES

1. **DO NOT** commit secrets to git
2. **DO** verify database backups are working before major changes
3. **DO** test in staging before production (if available)
4. **DO** have rollback plan ready
5. **DO** monitor logs during/after deployment
6. **DO NOT** skip health checks

---

**Good luck! Start by checking the deployment status and logs, then work through the debugging steps systematically.**
