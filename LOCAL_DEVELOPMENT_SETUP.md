# 🚀 HoliLabs Local Development Setup Guide

This guide will help you run the HoliLabs website on your local machine for development before deploying to DigitalOcean.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 20+** installed (check with `node --version`)
- ✅ **pnpm 8+** installed (check with `pnpm --version`)
- ✅ **PostgreSQL database** (local or remote)
- ✅ **Git** (to pull latest changes)

---

## 🔧 Step 1: Navigate to Project Directory

```bash
cd /root/holilabs
```

---

## 🔐 Step 2: Set Up Environment Variables

### Option A: Minimal Setup (Fastest - Get Running Immediately)

Create `.env.local` in the web app directory:

```bash
cd /root/holilabs/apps/web
touch .env.local
```

Copy this **minimal configuration** to `.env.local`:

```bash
# ============================================================================
# MINIMAL LOCAL DEVELOPMENT SETUP
# This is enough to run the site locally for testing Phase 1 & 2 improvements
# ============================================================================

# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs?schema=public"

# PHASE 1 & 2 SECURITY KEYS (Generated for you!)
SALT_ROTATION_KEY="19fb7a6c0e238aa55aee9803ec85772d4d6a2493e0b603a50bdbb0a37f235686"
DEID_SECRET="0cf812898a2ed9a946fc4b1eb4747d428cb14ed9517dec6b43dee29869f495c4"

# NextAuth (REQUIRED)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local-dev-secret-change-in-production"
SESSION_SECRET="local-session-secret-change-in-production"

# Encryption (REQUIRED)
ENCRYPTION_KEY="cGxlYXNlLWdlbmVyYXRlLXlvdXItb3duLWtleQ=="
ENCRYPTION_MASTER_KEY="cGxlYXNlLWdlbmVyYXRlLXlvdXItb3duLWtleQ=="

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Supabase (Mock for local dev - not required for Phase 1 & 2 testing)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="mock-key-for-local-dev"
SUPABASE_SERVICE_ROLE_KEY="mock-key-for-local-dev"

# ============================================================================
# OPTIONAL: Add these when you need specific features
# ============================================================================

# AI Services (Uncomment when testing AI features)
# GOOGLE_AI_API_KEY="your-gemini-key"
# AI_PRIMARY_PROVIDER="gemini"
# AI_CACHE_ENABLED="false"

# Twilio (Uncomment when testing SMS/WhatsApp)
# TWILIO_ACCOUNT_SID="your-sid"
# TWILIO_AUTH_TOKEN="your-token"
# TWILIO_PHONE_NUMBER="+15551234567"

# Email (Uncomment when testing emails)
# RESEND_API_KEY="your-resend-key"
# RESEND_FROM_EMAIL="dev@holilabs.com"

# Redis (Uncomment when testing rate limiting)
# UPSTASH_REDIS_REST_URL="your-redis-url"
# UPSTASH_REDIS_REST_TOKEN="your-token"
```

### Option B: Full Setup (All Features)

If you want ALL features working locally, copy the full `.env.example` file:

```bash
cd /root/holilabs/apps/web
cp .env.example .env.local
```

Then edit `.env.local` with your actual API keys for the services you need.

---

## 💾 Step 3: Set Up Database

### Option A: Use Existing Database (If you have PostgreSQL)

1. **Create a database**:
```bash
createdb holi_labs
```

2. **Update DATABASE_URL in .env.local**:
```bash
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/holi_labs?schema=public"
```

3. **Run migrations**:
```bash
cd /root/holilabs/apps/web
pnpm prisma migrate dev
```

4. **Generate Prisma Client**:
```bash
pnpm prisma generate
```

### Option B: Use Docker PostgreSQL (Easiest)

```bash
# Start PostgreSQL in Docker
cd /root/holilabs
pnpm docker:up

# Wait 10 seconds for database to start, then:
cd apps/web
pnpm prisma migrate dev
pnpm prisma generate
```

---

## 📦 Step 4: Install Dependencies

From the **root directory** (`/root/holilabs`):

```bash
cd /root/holilabs
pnpm install
```

This will install all dependencies for:
- The web app (`apps/web`)
- The API (`apps/api`)
- All packages (`packages/deid`, `packages/utils`, etc.)

---

## 🏗️ Step 5: Build Packages

Before running the web app, build the `deid` package (which contains our Phase 1 & 2 security improvements):

```bash
cd /root/holilabs/packages/deid
pnpm build
```

---

## 🚀 Step 6: Start Development Server

### Start the Web App

From the **root directory**:

```bash
cd /root/holilabs
pnpm dev
```

This will start **all apps** in parallel:
- 🌐 **Web app**: http://localhost:3000
- 🔌 **API**: http://localhost:4000

Or, to start only the web app:

```bash
cd /root/holilabs/apps/web
pnpm dev
```

---

## 🌍 Step 7: Access the Website

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the HoliLabs homepage!

---

## 🧪 Testing Phase 1 & 2 Security Features

### Test 1: Secure Token Generation

1. Navigate to http://localhost:3000/api/patients (or wherever you create patients)
2. Create a new patient
3. Check the token format - should be:
   ```
   PT-[32 hex characters]
   ```
   Example: `PT-a3f9b2c1-d4e5f6a7-b8c9d0e1-f2a3b4c5`

### Test 2: Secure Export (Phase 2)

```bash
# Test the new secure export API
curl -X POST http://localhost:3000/api/patients/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "JSON",
    "options": {
      "enforceKAnonymity": true,
      "k": 5,
      "applyDifferentialPrivacy": false
    }
  }'
```

### Test 3: k-Anonymity

```bash
# Test k-anonymity checker
curl -X POST http://localhost:3000/api/patients/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "AGGREGATE",
    "options": {
      "enforceKAnonymity": true,
      "k": 5,
      "applyDifferentialPrivacy": true,
      "epsilon": 0.1
    }
  }'
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@holilabs/deid'"

**Solution**: Build the deid package first
```bash
cd /root/holilabs/packages/deid
pnpm build
```

### Issue: "PrismaClient is not a constructor"

**Solution**: Generate Prisma Client
```bash
cd /root/holilabs/apps/web
pnpm prisma generate
```

### Issue: "Cannot connect to database"

**Solution**: Check your DATABASE_URL in `.env.local`

For Docker PostgreSQL:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/holi_labs?schema=public"
```

For local PostgreSQL:
```bash
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/holi_labs?schema=public"
```

### Issue: Port 3000 already in use

**Solution**: Kill the existing process
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

### Issue: "NEXTAUTH_URL is not defined"

**Solution**: Make sure `.env.local` has:
```bash
NEXTAUTH_URL="http://localhost:3000"
```

---

## 🔄 Development Workflow

### Making Changes

1. **Edit code** in your preferred editor
2. **Save changes** - the dev server will auto-reload
3. **Test locally** at http://localhost:3000
4. **Commit changes**:
   ```bash
   git add .
   git commit -m "Your message"
   ```
5. **Push to trigger DigitalOcean deployment**:
   ```bash
   git push origin main
   ```

### Testing Before Deploy

Always test locally first:

```bash
# 1. Start dev server
pnpm dev

# 2. Test in browser at http://localhost:3000

# 3. Check for errors in terminal

# 4. Run type checking
pnpm tsc --noEmit

# 5. If all good, commit and push
git add .
git commit -m "Tested locally - ready for deploy"
git push origin main
```

---

## 📁 Project Structure

```
/root/holilabs/
├── apps/
│   ├── web/              ← Next.js web application (PORT 3000)
│   │   ├── src/
│   │   │   ├── app/      ← App Router (Next.js 14)
│   │   │   ├── lib/      ← Utilities & helpers
│   │   │   │   ├── security/   ← Phase 1 token generation
│   │   │   │   └── audit/      ← Phase 1 audit logging
│   │   │   └── components/
│   │   ├── prisma/       ← Database schema
│   │   ├── .env.local    ← YOUR LOCAL ENVIRONMENT VARIABLES
│   │   └── package.json
│   └── api/              ← Fastify API (PORT 4000)
├── packages/
│   ├── deid/             ← Phase 1 & 2 de-identification package
│   │   ├── src/
│   │   │   ├── pseudonymize.ts      ← Phase 1: PBKDF2 + HMAC
│   │   │   ├── k-anonymity.ts       ← Phase 2: k-anonymity
│   │   │   ├── nlp-redaction.ts     ← Phase 2: NLP redaction
│   │   │   └── differential-privacy.ts ← Phase 2: DP
│   │   └── package.json
│   ├── utils/
│   └── schemas/
├── package.json          ← Root package.json (workspace config)
└── turbo.json           ← Turbo build config
```

---

## 🔍 Viewing Logs

### Development Logs (Terminal)

When you run `pnpm dev`, logs appear in your terminal:

```bash
✓ Ready in 2.3s
○ Compiling / ...
✓ Compiled / in 487ms
```

### Application Logs

Check the terminal for:
- ✅ Success messages
- ⚠️ Warnings (like "DEID_SECRET not set")
- ❌ Errors

### Database Logs

```bash
# View database queries (Prisma)
cd /root/holilabs/apps/web
pnpm prisma studio
```

Opens database GUI at http://localhost:5555

---

## 🚀 Next Steps After Local Testing

Once you've tested locally and everything works:

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Phase 1 & 2 security tested locally"
   ```

2. **Push to trigger DigitalOcean deployment**:
   ```bash
   git push origin main
   ```

3. **Set environment variables on DigitalOcean**:
   - See: `/root/holilabs/DIGITALOCEAN_ENV_SETUP.md`
   - Add `SALT_ROTATION_KEY` and `DEID_SECRET`

4. **Monitor deployment**:
   - Go to https://cloud.digitalocean.com/apps
   - Click your app → "Runtime Logs"
   - Check for successful deployment

5. **Test production**:
   - Visit https://holilabs-lwp6y.ondigitalocean.app
   - Verify Phase 1 & 2 features work

---

## 📞 Quick Commands Reference

```bash
# Install dependencies
pnpm install

# Build deid package
cd packages/deid && pnpm build

# Start dev server
pnpm dev

# Run database migrations
cd apps/web && pnpm prisma migrate dev

# Generate Prisma Client
cd apps/web && pnpm prisma generate

# Open database GUI
cd apps/web && pnpm prisma studio

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Build for production
pnpm build

# Start PostgreSQL via Docker
pnpm docker:up

# Stop PostgreSQL via Docker
pnpm docker:down
```

---

## 🎯 Ready to Go!

You should now have HoliLabs running locally at **http://localhost:3000**

All Phase 1 & 2 security improvements are active:
- ✅ Cryptographically secure tokens
- ✅ Hardened pseudonymization (PBKDF2 + HMAC)
- ✅ k-anonymity checks
- ✅ Differential privacy
- ✅ NLP redaction
- ✅ Audit logging

**Happy coding! 🚀**
