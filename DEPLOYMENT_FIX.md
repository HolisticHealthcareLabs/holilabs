# 🔧 Deployment Fix Guide

**Issue**: Build failing on DigitalOcean with error:
```
Error: SESSION_SECRET or NEXTAUTH_SECRET must be set in environment
Error occurred prerendering page "/api/csrf"
```

---

## 🎯 Root Cause

The `/api/csrf` route was trying to be statically generated during build time, which required accessing `SESSION_SECRET` or `NEXTAUTH_SECRET` environment variables. Even though these were configured in DigitalOcean, Next.js was attempting to execute the CSRF token generation code during the build phase.

---

## ✅ Fixes Applied

### 1. Force Dynamic Rendering on CSRF Route ✅

**File**: `apps/web/src/app/api/csrf/route.ts`

**Change**: Added `export const dynamic = 'force-dynamic'`

```typescript
// Force dynamic rendering - don't try to generate at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = generateCsrfToken();
  // ...
}
```

**Why**: This tells Next.js to skip static generation for this route and only render it at runtime when a request comes in.

### 2. Updated Dockerfile with Secret Build Args ✅

**File**: `Dockerfile` (root)

**Change**: Added `NEXTAUTH_SECRET` and `SESSION_SECRET` as build arguments

```dockerfile
# Declare build arguments
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG DATABASE_URL
ARG RESEND_API_KEY
ARG NODE_ENV
ARG NEXTAUTH_SECRET          # ← NEW
ARG SESSION_SECRET           # ← NEW

# Make them available during build
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV SESSION_SECRET=$SESSION_SECRET
```

**Why**: Even though the route is now dynamic, Next.js still checks if the env vars exist during build. This ensures they're available.

---

## 🚀 Deployment Steps

### Step 1: Verify Environment Variables in DigitalOcean

Go to: https://cloud.digitalocean.com/apps → Select `holi-labs` → Settings → Environment Variables

**Verify these are set**:
```bash
# Critical secrets (MUST be set)
✅ NEXTAUTH_SECRET=<your-generated-secret>
✅ SESSION_SECRET=<your-generated-secret>
✅ DATABASE_URL=<your-database-connection-string>
✅ NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
✅ SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# API Keys
✅ ASSEMBLYAI_API_KEY=<your-assemblyai-key>
✅ GOOGLE_AI_API_KEY=<your-google-ai-key>
✅ RESEND_API_KEY=<your-resend-key>

# Optional but recommended
⚠️ LOGTAIL_SOURCE_TOKEN=<your-logtail-token>
⚠️ UPSTASH_REDIS_REST_URL=<your-upstash-url>
⚠️ UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

**Generate secrets if not set**:
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32
# Example: USgMzLhnghPGvVU0A91X1V+OFQu/6F/T7Vo4efabdxY=

# SESSION_SECRET
openssl rand -hex 32
# Example: 77696601664cfffc19b28ce3d0ebf03a05b655020d08772d81f627ebf5337460
```

### Step 2: Push Fixes to Git

```bash
cd /Users/nicolacapriroloteran/vidabanq-health-ai

# Add and commit fixes
git add -A
git commit -m "Fix deployment: Add dynamic rendering to CSRF route and update Dockerfile"

# Push to main branch (triggers deployment)
git push origin main
```

### Step 3: Monitor Deployment

1. Go to: https://cloud.digitalocean.com/apps
2. Select your app: `holi-labs`
3. Go to: **Activity** tab
4. Watch the build logs in real-time

**Expected success messages**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (22/22)
✓ Build completed successfully
```

### Step 4: Test the Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app.ondigitalocean.app/api/health

# CSRF endpoint (should work now)
curl https://your-app.ondigitalocean.app/api/csrf

# Expected response:
{
  "success": true,
  "token": "abc123..."
}
```

---

## 🐛 Troubleshooting

### Issue: Build still fails with same error

**Check**:
1. Environment variables are actually set in DigitalOcean (not just listed)
2. Variables don't have trailing spaces or quotes
3. Git push was successful (`git status` shows clean)
4. Correct branch is being deployed (check in DigitalOcean settings)

**Solution**:
```bash
# Verify env vars in DigitalOcean
doctl apps list
doctl apps spec get <app-id>

# Force rebuild without cache
# Go to DigitalOcean UI → Settings → Delete Cache → Redeploy
```

### Issue: Build succeeds but app crashes on startup

**Symptoms**:
- Build completes successfully
- App starts but immediately crashes
- Logs show "DATABASE_URL not set" or similar

**Solution**:
1. Check runtime environment variables (different from build-time)
2. Verify database is accessible from app
3. Check Prisma migrations are applied

```bash
# In DigitalOcean UI:
# Settings → Environment Variables → Runtime Variables
# Make sure all secrets are available at runtime too
```

### Issue: Database connection errors

**Symptoms**:
```
Error opening a TLS connection: server does not support TLS
PrismaClientInitializationError: P1011
```

**Solution**:
Update `DATABASE_URL` to disable SSL (for local PostgreSQL) or enable it (for managed databases):

```bash
# For DigitalOcean Managed Database (SSL required):
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# For local PostgreSQL (no SSL):
DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=disable"
```

### Issue: 500 errors on /api/patients

**Symptoms** (from console logs):
```
api/patients:1 Failed to load resource: the server responded with a status of 500 ()
```

**Solution**:
This is a different issue - likely Supabase Service Role Key is missing or invalid.

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Project Settings → API
3. Copy `service_role` key (starts with `eyJhbGc...`)
4. Add to DigitalOcean: `SUPABASE_SERVICE_ROLE_KEY=<your-key>`

---

## 📋 Pre-Deployment Checklist

Before pushing to main:

- [ ] All environment variables set in DigitalOcean
- [ ] Secrets generated with `openssl rand`
- [ ] Database accessible from DigitalOcean
- [ ] Supabase project configured correctly
- [ ] Git branch is up to date
- [ ] Local build succeeds (`pnpm build`)
- [ ] Dockerfile tested locally (optional but recommended)

---

## 🔍 Debug Commands

### Check build logs:
```bash
# In DigitalOcean UI → Activity tab → View Logs

# Or via CLI:
doctl apps logs <app-id> --type build --follow
```

### Check runtime logs:
```bash
doctl apps logs <app-id> --type run --follow
```

### Test Docker build locally:
```bash
# Build the Docker image
docker build -t holi-labs \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg DATABASE_URL=$DATABASE_URL \
  --build-arg NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  --build-arg SESSION_SECRET=$SESSION_SECRET \
  --build-arg NODE_ENV=production \
  -f Dockerfile .

# Run the container
docker run -p 3000:3000 holi-labs

# Test
curl http://localhost:3000/api/health
```

---

## 📞 Support

If issues persist:

1. Check DigitalOcean Status: https://status.digitalocean.com/
2. Review build logs carefully (copy full error message)
3. Search DigitalOcean Community: https://www.digitalocean.com/community
4. Contact support: https://cloud.digitalocean.com/support/tickets/new

---

## ✅ Success Indicators

Deployment is successful when you see:

1. **Build logs**:
   ```
   ✓ Compiled successfully
   ✓ Generating static pages (22/22)
   ```

2. **Runtime logs**:
   ```
   {"level":30,"msg":"✅ Service Worker ready for push notifications"}
   {"level":30,"msg":"Successfully connected to database"}
   ```

3. **Health check passes**:
   ```bash
   curl https://your-app.ondigitalocean.app/api/health
   # Returns: {"status":"ok"}
   ```

4. **Landing page loads**:
   Open: https://your-app.ondigitalocean.app
   Should see: Marketing landing page with logo

---

**Document Version**: 1.0
**Last Updated**: October 9, 2025
**Issue**: CSRF route static generation failure
**Status**: ✅ Fixed
