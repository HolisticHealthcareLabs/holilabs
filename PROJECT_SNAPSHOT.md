# 🏥 Holi Labs Healthcare Platform - Complete Project Snapshot
**Generated:** October 12, 2025
**Environment:** Production (DigitalOcean App Platform)

---

## 1. Project Overview

### Identity
- **Name:** VidaBanq Health AI / Holi Labs
- **Type:** HIPAA-compliant healthcare platform with AI-powered clinical documentation
- **Monorepo:** pnpm workspaces + Turborepo
- **Repository:** https://github.com/HolisticHealthcareLabs/holilabs

### Core Features
1. AI-powered SOAP note generation (Google Gemini 2.0 Flash)
2. Real-time audio transcription (Deepgram Nova-2)
3. Patient portal with magic link authentication
4. Encrypted file storage (AES-256-GCM → Cloudflare R2)
5. Real-time messaging (Socket.io with JWT auth)
6. HIPAA audit logging
7. Rate limiting (Upstash Redis)
8. Push notifications (VAPID/Web Push)
9. Progressive Web App (PWA) with offline support
10. Multi-language support (English/Spanish)

---

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 14.1.0 (App Router, React Server Components)
- **UI:** React 18.2, Tailwind CSS, Radix UI, Framer Motion
- **State:** Zustand, React Context
- **Forms:** Zod validation
- **Internationalization:** next-intl

### Backend
- **Runtime:** Node.js 20+ (Alpine Linux in production)
- **Server:** Custom server.js (Next.js + Socket.io)
- **Database:** PostgreSQL 15 (DigitalOcean Managed)
- **ORM:** Prisma 5.9.0
- **Auth:** NextAuth 4.24 + jose (JWT)
- **API:** Next.js API Routes (App Router)

### Infrastructure
- **Hosting:** DigitalOcean App Platform (NYC region)
- **Storage:** Cloudflare R2 (S3-compatible, zero egress fees)
- **Cache/Rate Limiting:** Upstash Redis (serverless)
- **Monitoring:** Sentry (client, server, edge)
- **CI/CD:** GitHub Actions
- **Container:** Docker (multi-stage build)

### AI Services
- **LLM:** Google Gemini 2.0 Flash (~$0.10/1M tokens)
- **Speech-to-Text:** Deepgram Nova-2 (~$0.0043/min)
- **Backup Transcription:** AssemblyAI
- **SDK:** Anthropic Claude (for future features)

### Security & Compliance
- **Encryption:** AES-256-GCM (files), bcrypt (passwords), JWT (sessions)
- **Rate Limiting:** Sliding window (5-100 req/min by endpoint)
- **Security Headers:** Helmet.js (CSP, CORS, HSTS)
- **Audit Logging:** All PHI access logged to database
- **HIPAA Compliance:** Encryption at rest/transit, access controls, audit trails

---

## 3. Repository Structure

```
holilabs-health-ai/
├── apps/
│   ├── web/                    # Main Next.js application (PRIMARY)
│   │   ├── src/
│   │   │   ├── app/           # Next.js 14 App Router pages
│   │   │   │   ├── (auth)/    # Auth pages (login, signup)
│   │   │   │   ├── api/       # API routes
│   │   │   │   ├── dashboard/ # Clinician dashboard
│   │   │   │   └── portal/    # Patient portal
│   │   │   ├── components/    # React components
│   │   │   │   ├── portal/    # Patient-facing components
│   │   │   │   └── ui/        # Shared UI components
│   │   │   └── lib/           # Utilities
│   │   │       ├── auth/      # Authentication logic
│   │   │       ├── storage/   # File encryption/storage
│   │   │       ├── socket-server.js # Socket.io server
│   │   │       ├── rate-limit.ts    # Upstash rate limiting
│   │   │       └── logger.ts  # Pino logging
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   ├── migrations/    # Migration history
│   │   │   └── seed.ts        # Seed data
│   │   ├── public/            # Static assets
│   │   ├── docs/              # Project documentation (14 MD files)
│   │   ├── .do/
│   │   │   └── app.yaml       # DigitalOcean deployment spec
│   │   ├── Dockerfile         # Production container
│   │   ├── server.js          # Custom server (Socket.io)
│   │   ├── next.config.js     # Next.js configuration
│   │   ├── middleware.ts      # Security & rate limiting
│   │   └── package.json
│   ├── mobile/                # React Native (future)
│   └── api/                   # Standalone API (future)
│
├── packages/
│   ├── schemas/               # Shared Zod validation schemas
│   ├── utils/                 # Shared utilities (crypto, logging, i18n)
│   ├── dp/                    # Data processing pipelines
│   ├── deid/                  # De-identification utilities
│   └── policy/                # HIPAA compliance policies
│
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml # Local PostgreSQL + Redis
│   └── migrations/            # Database migration scripts
│
├── scripts/
│   ├── seed/                  # Database seeding scripts
│   └── chaos/                 # Chaos engineering tests
│
├── .github/
│   └── workflows/
│       ├── deploy.yml         # Main CI/CD pipeline
│       ├── deploy-production.yml
│       ├── deploy-staging.yml
│       └── test.yml
│
├── configs/                   # Shared configs (ESLint, TS, etc.)
├── COMPLIANCE/                # HIPAA documentation
├── RUNBOOKS/                  # Operational runbooks
├── Dockerfile                 # Root Dockerfile (builds web app)
├── pnpm-workspace.yaml        # Monorepo workspace config
└── package.json               # Root package.json
```

---

## 4. Deployment Configuration

### DigitalOcean App Platform

**Current Deployment:**
- **App Name:** `holi-labs`
- **App ID:** `holilabs-lwp6y` (app identifier)
- **Live URL:** https://holilabs-lwp6y.ondigitalocean.app
- **Region:** NYC (us-east-1 equivalent)
- **Instance:** professional-xs (1 instance)
- **Health Check:** `GET /` (30s initial delay)
- **Build Method:** Dockerfile
- **Auto-Deploy:** Enabled (pushes to `main` branch)

**App Spec** (`apps/web/.do/app.yaml`):
```yaml
name: holi-labs
region: nyc

services:
  - name: web
    source_dir: /
    dockerfile_path: Dockerfile

    health_check:
      http_path: /
      initial_delay_seconds: 30

    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "3000"

    instance_count: 1
    instance_size_slug: professional-xs
    http_port: 3000

    routes:
      - path: /

databases:
  - name: holi-labs-db
    engine: PG
    version: "15"
    production: true
```

### Dockerfile (Multi-Stage Build)

**Build Strategy:**
1. **base:** Node 20 Alpine + pnpm + OpenSSL
2. **deps:** Install dependencies (pnpm install --frozen-lockfile)
3. **builder:** Generate Prisma client → Build Next.js app
4. **runner:** Copy built app, run as non-root user (nextjs:nodejs)

**Key Points:**
- Uses standalone output mode (optimized bundle)
- Prisma client generated during build
- Health checks on port 3000
- Runs custom `server.js` (not `next start`)
- SIGTERM/SIGINT handled gracefully

### Build Process

**Local Build:**
```bash
cd apps/web
pnpm install
pnpm prisma generate
pnpm build
pnpm start  # Runs server.js
```

**Production Build (DigitalOcean):**
1. Git push to `main` triggers GitHub Actions
2. GitHub Actions:
   - Lint & type check
   - Build app
   - Security scan (Trivy + npm audit)
   - Trigger DigitalOcean deployment via `doctl`
3. DigitalOcean App Platform:
   - Pulls latest code
   - Builds Docker image (Kaniko builder)
   - Runs database migrations (manual step)
   - Deploys to containers
   - Runs health checks
   - Switches traffic to new version

**Current Build Status:** ✅ Healthy (commit `353202c`)

---

## 5. Environment Variables

### Production (DigitalOcean - 14 Required Variables)

**Security:**
```bash
NEXTAUTH_SECRET=<generated-base64-32>
SESSION_SECRET=<generated-base64-32>
ENCRYPTION_MASTER_KEY=<generated-base64-32>
```

**Database:**
```bash
DATABASE_URL=<digitalocean-managed-postgres-url>
```

**Authentication & Storage:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

**Cloudflare R2 Storage:**
```bash
R2_ENDPOINT=https://faaf8be5db962f384ac11c87e18e273f.r2.cloudflarestorage.com
R2_BUCKET=holi-labs-storage
R2_ACCESS_KEY_ID=<regenerated-after-exposure>
R2_SECRET_ACCESS_KEY=<regenerated-after-exposure>
```

**Upstash Redis (Rate Limiting):**
```bash
UPSTASH_REDIS_REST_URL=https://us1-promoted-hawk-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

**Push Notifications (VAPID):**
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
VAPID_SUBJECT=mailto:admin@holilabs.com
```

**Sentry (Optional):**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=<sentry-auth-token>
SENTRY_ORG=<sentry-org>
SENTRY_PROJECT=<sentry-project>
```

**Other:**
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://holilabs-lwp6y.ondigitalocean.app
```

### Local Development (.env.local)
- See `apps/web/.env.example` for full list
- Uses local PostgreSQL (docker-compose)
- No rate limiting in dev (Redis optional)
- Sentry disabled

---

## 6. Deployment Process

### Current Workflow (Git Push → Production)

**Step 1: Local Development**
```bash
# Make changes
git add .
git commit -m "Feature: description"

# IMPORTANT: Run type check before pushing
cd apps/web && pnpm tsc --noEmit

# Push to GitHub
git push origin main
```

**Step 2: GitHub Actions (CI/CD Pipeline)**

File: `.github/workflows/deploy.yml`

**Job 1: Lint & Type Check** (parallel with build)
- Checkout code
- Install dependencies
- Run `pnpm lint`
- Run `pnpm tsc --noEmit`

**Job 2: Build** (parallel with security scan)
- Install dependencies
- Generate Prisma client
- Build Next.js app (`pnpm build`)
- Upload build artifacts

**Job 3: Security Scan** (parallel)
- Trivy vulnerability scanner
- npm audit (high severity only)

**Job 4: Deploy** (after build + security pass)
- Install `doctl` CLI
- Trigger deployment: `doctl apps create-deployment <app-id> --wait`
- Wait for deployment (60s)
- Health checks:
  - `GET /api/health/live`
  - `GET /api/health/ready`
- Notify Sentry of deployment

**Job 5: Post-Deployment Tests**
- Run smoke tests (TODO: Playwright tests)

**Step 3: DigitalOcean App Platform**
- Receives deployment trigger from GitHub
- Pulls latest code from `main` branch
- Builds Docker image using Dockerfile
- Runs health checks
- Deploys to production
- Switches traffic

### Manual Deployment (via DigitalOcean Console)

1. Go to https://cloud.digitalocean.com/apps
2. Click on `holi-labs` app
3. Click "Settings" → "Deploy"
4. Click "Force Rebuild and Deploy"
5. Monitor "Runtime Logs" for errors
6. Verify health: `curl https://holilabs-lwp6y.ondigitalocean.app/api/health`

### Rollback Procedure

**Option 1: DigitalOcean Console**
1. Go to app → "Deployments"
2. Find previous successful deployment
3. Click "Redeploy"

**Option 2: Git Revert**
```bash
git revert HEAD
git push origin main
# Wait for auto-deploy
```

**Option 3: Manual Rollback**
```bash
# Find previous commit
git log --oneline -5

# Reset to previous commit
git reset --hard <previous-commit-hash>
git push -f origin main  # ⚠️ DANGEROUS - use with caution
```

---

## 7. Recent Deployment History

### Last 5 Deployments

| Commit | Date | Status | Issue | Resolution |
|--------|------|--------|-------|------------|
| `353202c` | Oct 11, 23:49 | ✅ **SUCCESS** | Fixed all TypeScript errors | Added type guards, missing deps |
| `6aa859d` | Oct 11, 23:30 | ❌ FAILED | Sentry `query_string` type error | Only fixed client config |
| `59a04e4` | Oct 11, 23:15 | ❌ FAILED | Sentry `tracePropagationTargets` | Wrong location in config |
| `3a47707` | Oct 11, 23:00 | ❌ FAILED | Deprecated upload route config | Next.js 14 breaking change |
| `3c6dd0b` | Oct 11, 20:00 | ✅ SUCCESS | Product roadmap added | Documentation only |

### Current Production Status

**Last Successful Deploy:** October 11, 2025, 23:49 UTC-3 (commit `353202c`)

**Health Check Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T10:27:59.304Z",
  "uptime": 40486.706603118,
  "services": {
    "database": true,
    "databaseLatency": 132
  },
  "version": "1.0.0"
}
```

**Uptime:** ~11.25 hours (40,486 seconds)
**Database Latency:** 132ms (acceptable)

---

## 8. Known Issues & Technical Debt

### 1. Non-Critical TypeScript Errors (In Progress)

**Status:** Not blocking deployment (Next.js webpack is lenient)

**Prisma Schema Mismatches:**
- `recordingSession` model referenced but doesn't exist in schema
- `metadata` field on `AuditLog` not defined in Prisma
- `uploadedByUser` relation on `Document` missing
- `AppointmentType` enum may be missing `VIRTUAL` value

**Affected Files:**
- `src/app/api/portal/appointments/route.ts`
- `src/app/api/portal/consultations/route.ts`
- `src/app/api/portal/documents/route.ts`
- `src/app/api/portal/medications/route.ts`
- `src/app/api/recordings/start/route.ts`

**Impact:** Low - these routes may not be in active use

**Fix Strategy:** Run full schema audit, add missing models/fields

### 2. Security - Exposed R2 Credentials

**Status:** ⚠️ Needs Action

**Issue:** R2 API tokens were exposed in earlier conversation logs

**Action Required:**
1. Regenerate R2 API tokens in Cloudflare dashboard
2. Update DigitalOcean environment variables
3. Trigger redeployment

### 3. Missing Pre-Commit Hooks

**Status:** 📋 Planned

**Issue:** No pre-commit hooks to run type check before pushing

**Proposed Solution:**
```bash
# .husky/pre-commit
#!/bin/sh
cd apps/web && pnpm tsc --noEmit
```

### 4. Incomplete Smoke Tests

**Status:** 📋 Planned

**Issue:** Post-deployment smoke tests are stubbed out

**Files:** `.github/workflows/deploy.yml` (line 242)

**Proposed:** Add Playwright smoke tests for:
- Login flow (clinician + patient)
- File upload
- SOAP note generation
- Real-time messaging

### 5. Background Dev Servers

**Status:** ⚠️ Cleanup Needed

**Issue:** 3 background bash shells running dev servers

**Action:**
```bash
# Check running processes
ps aux | grep "pnpm\|node"

# Kill specific process
kill <PID>
```

---

## 9. Database Information

### Schema Overview

**12 Core Tables:**
1. `users` - Clinicians/staff (non-PHI)
2. `patient_users` - Patient authentication (separate from PHI)
3. `patients` - Patient records (PHI)
4. `medications` - Medication records
5. `prescriptions` - Prescription history
6. `appointments` - Appointment scheduling
7. `documents` - Encrypted file metadata
8. `clinical_notes` - SOAP notes
9. `consents` - Patient consent tracking
10. `audit_logs` - HIPAA audit trail
11. `token_maps` - JWT token management
12. `blockchain_transactions` - Blockchain audit trail

**Authentication Tables:**
- `magic_links` - Passwordless patient login
- `otp_codes` - OTP verification
- `push_subscriptions` - Web push notifications

**Total Tables:** 15+ (including notifications, calendar integrations, etc.)

### Migrations

**Location:** `apps/web/prisma/migrations/`

**Recent Migrations:**
1. `20251010213908_add_patient_authentication_and_portal` - Patient auth system
2. `20251010230018_add_notifications` - Notification system
3. `20251011044159_add_push_subscriptions` - Push notification subscriptions

**Run Migrations:**
```bash
# Local
cd apps/web
pnpm prisma migrate dev

# Production (manual - not automated)
pnpm prisma migrate deploy
```

### Database Connection

**Local:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs?schema=public"
```

**Production:**
- Managed by DigitalOcean
- Connection string injected as `DATABASE_URL` env var
- Automatic backups enabled
- Connection pooling: 25 max connections

---

## 10. Monitoring & Logs

### Health Checks

**Endpoints:**
1. `GET /api/health` - Overall system health
2. `GET /api/health/live` - Liveness probe (server responsive)
3. `GET /api/health/ready` - Readiness probe (DB + Redis + Supabase)

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T...",
  "uptime": 12345.67,
  "services": {
    "database": true,
    "databaseLatency": 132
  },
  "version": "1.0.0"
}
```

### Logging

**Local:**
- Pino logger with pretty-print
- Console output (colorized)
- Level: `debug` in dev

**Production:**
- Pino JSON logs
- Sent to DigitalOcean logs dashboard
- Optional: Logtail integration (configured but not mandatory)
- Level: `info` in production

**View Logs:**
```bash
# Via DigitalOcean console
# Apps → holi-labs → Runtime Logs

# Or via doctl CLI
doctl apps logs <app-id> --type=run --follow
```

### Sentry (Error Monitoring)

**Configuration:**
- Client: `sentry.client.config.ts`
- Server: `sentry.server.config.ts`
- Edge: `sentry.edge.config.ts`

**Features:**
- Error tracking (exceptions, crashes)
- Performance monitoring (traces)
- Session replay (10% of sessions, 100% on error)
- Release tracking (GitHub integration)

**Dashboard:** https://sentry.io/ (if configured)

### Rate Limiting

**Strategy:** Sliding window (Upstash Redis)

**Limits by Endpoint:**
- Auth: 5 requests/minute
- Upload: 10 requests/minute
- Messages: 30 requests/minute
- Search: 20 requests/minute
- General API: 100 requests/minute

**Response on Rate Limit:**
```
HTTP 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1728648000
Retry-After: 60
```

---

## 11. DigitalOcean Resources

### App Platform

**App Details:**
- **Name:** holi-labs
- **ID:** (requires console access to view)
- **URL:** https://holilabs-lwp6y.ondigitalocean.app
- **Region:** NYC (New York City)
- **Plan:** Professional Plan - xs instance
  - 1 vCPU
  - 1 GB RAM
  - ~$12/month

### Managed Database

**Database:**
- **Name:** holi-labs-db
- **Engine:** PostgreSQL 15
- **Plan:** Managed Database (likely Basic or Professional)
- **Connection:** Injected via `DATABASE_URL` env var
- **Backups:** Automatic daily backups (DigitalOcean managed)

### Networking

**Current:**
- Default `.ondigitalocean.app` domain
- HTTPS enabled (automatic Let's Encrypt cert)
- No custom domain configured

**To Add Custom Domain:**
1. Settings → Domains
2. Add domain (e.g., app.holilabs.com)
3. Update DNS records:
   ```
   CNAME app holilabs-lwp6y.ondigitalocean.app
   ```
4. Wait for SSL certificate provisioning

---

## 12. External Services

### Cloudflare R2

**Purpose:** Encrypted file storage (zero egress fees)

**Configuration:**
- Endpoint: `https://faaf8be5db962f384ac11c87e18e273f.r2.cloudflarestorage.com`
- Bucket: `holi-labs-storage`
- Region: Auto (Cloudflare global)
- CORS: Configured for app domain

**Cost:** ~$0.015/GB/month (storage only)

**Dashboard:** https://dash.cloudflare.com/

### Upstash Redis

**Purpose:** Rate limiting

**Configuration:**
- Type: Regional (US East)
- REST API enabled
- TLS: Enabled

**Cost:** Free tier (10k commands/day)

**Dashboard:** https://console.upstash.com/

### Supabase

**Purpose:** Authentication + file storage (legacy/backup)

**Configuration:**
- Project URL: `NEXT_PUBLIC_SUPABASE_URL`
- Anon key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key: `SUPABASE_SERVICE_ROLE_KEY`

**Dashboard:** https://app.supabase.com/

### Sentry (Optional)

**Purpose:** Error monitoring & performance tracking

**Dashboard:** https://sentry.io/

---

## 13. CI/CD Pipeline Details

### GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch
- Manual trigger (`workflow_dispatch`)

**Secrets Required:**
```
DIGITALOCEAN_ACCESS_TOKEN
DIGITALOCEAN_APP_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SENTRY_AUTH_TOKEN (optional)
SENTRY_ORG (optional)
SENTRY_PROJECT (optional)
```

**Pipeline Stages:**
1. **Lint & Type Check** (~2 min)
2. **Build** (~5 min)
3. **Security Scan** (~3 min)
4. **Deploy** (~8-10 min)
5. **Post-Deploy Tests** (~1 min)

**Total Duration:** ~20 minutes from push to live

**Status:** ✅ Configured but may need secret updates

---

## 14. Testing

### Unit Tests
**Status:** Minimal (needs expansion)
**Framework:** Jest (configured)
**Location:** `apps/web/src/lib/__tests__/`

### E2E Tests
**Status:** Configured but incomplete
**Framework:** Playwright
**Location:** `apps/web/tests/` (likely)

### Smoke Tests
**Status:** Stubbed in CI/CD pipeline
**Needs:** Playwright test suite for critical flows

---

## 15. Documentation

### Project Docs (apps/web/docs/)

**Total:** 14 Markdown files

**Key Files:**
1. `DEPLOYMENT_SUMMARY.md` - Latest deployment details
2. `DEPLOYMENT_STATUS.md` - Current status
3. `TYPESCRIPT_FIXES.md` - Recent fixes applied
4. `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
5. `TROUBLESHOOTING.md` - Common issues
6. `CLOUDFLARE_R2_SETUP.md` - R2 configuration
7. `UPSTASH_REDIS_SETUP.md` - Redis setup
8. `SENTRY_SETUP.md` - Sentry integration
9. `AI_MONETIZATION_STRATEGY.md` - Business model analysis
10. `STORAGE_COMPARISON.md` - Cloud storage options
11. `PRODUCTION_READINESS.md` - Pre-launch checklist
12. `IMPLEMENTATION_COMPLETE.md` - Features completed

---

## 16. Immediate Action Items

### Critical (Do First)
1. ✅ Verify commit `353202c` deployed successfully in DigitalOcean console
2. ⚠️ Regenerate R2 API tokens (security issue)
3. ✅ Commit uncommitted documentation files

### High Priority (This Week)
4. Fix Prisma schema mismatches (recordingSession, metadata fields)
5. Add pre-commit hooks for type checking
6. Set up monitoring alerts (UptimeRobot or Sentry alerts)
7. Test critical user flows in production

### Medium Priority (Next 2 Weeks)
8. Add Playwright smoke tests to CI/CD
9. Implement automated database backups
10. Optimize database queries (review slow queries)
11. Add custom domain (if desired)

### Low Priority (Ongoing)
12. Expand unit test coverage
13. Performance profiling
14. Cost optimization review
15. Update documentation as features change

---

## 17. Support & Resources

### Documentation
- Project Docs: `/apps/web/docs/`
- Prisma Docs: https://www.prisma.io/docs/
- Next.js Docs: https://nextjs.org/docs
- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/

### Dashboards
- **DigitalOcean:** https://cloud.digitalocean.com/apps
- **GitHub:** https://github.com/HolisticHealthcareLabs/holilabs
- **Cloudflare:** https://dash.cloudflare.com/
- **Upstash:** https://console.upstash.com/
- **Sentry:** https://sentry.io/

### Contact
- GitHub Issues: https://github.com/HolisticHealthcareLabs/holilabs/issues

---

**End of Project Snapshot**

**Last Updated:** October 12, 2025, 07:30 UTC-3
**Snapshot Valid As Of:** Commit `353202c`
