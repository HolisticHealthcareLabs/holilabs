# ⚡ Quick Reference - Common Operations

**Last Updated:** October 12, 2025

---

## 🚀 Deployment Commands

### Check Current Production Status
```bash
curl https://holilabs-lwp6y.ondigitalocean.app/api/health | jq
```

### Deploy to Production
```bash
# 1. Run type check FIRST
cd apps/web && pnpm tsc --noEmit

# 2. Commit and push
git add .
git commit -m "Your commit message"
git push origin main

# GitHub Actions will automatically deploy to DigitalOcean
```

### View Deployment Logs
```bash
# Option 1: DigitalOcean Console
# https://cloud.digitalocean.com/apps → holi-labs → Runtime Logs

# Option 2: doctl CLI (if installed)
doctl apps list
doctl apps logs <APP_ID> --type=run --follow
```

### Manual Deployment Trigger
```bash
# Via doctl
doctl apps create-deployment <APP_ID> --wait

# Via Console: Apps → Settings → Force Rebuild and Deploy
```

---

## 💻 Local Development

### Start Development Server
```bash
# From root
pnpm dev

# Or from web app
cd apps/web
pnpm dev

# With Socket.io enabled
ENABLE_SOCKET_SERVER=true pnpm dev
```

### Database Operations
```bash
cd apps/web

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm db:seed

# Open Prisma Studio (GUI)
pnpm db:studio

# Generate Prisma client (after schema changes)
pnpm prisma generate
```

### Build & Test Locally
```bash
cd apps/web

# Build for production
pnpm build

# Start production server locally
pnpm start

# Run linter
pnpm lint

# Type check
pnpm tsc --noEmit
```

---

## 🔍 Debugging & Logs

### Check Production Logs
```bash
# Health check
curl https://holilabs-lwp6y.ondigitalocean.app/api/health

# Liveness probe
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/live

# Readiness probe
curl https://holilabs-lwp6y.ondigitalocean.app/api/health/ready
```

### Test Rate Limiting
```bash
# Should rate limit after 5 requests
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/auth/patient/magic-link/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

### View Local Logs
```bash
# Tail logs in development
cd apps/web
pnpm dev | pnpm pino-pretty
```

---

## 🗄️ Database Management

### Connect to Local Database
```bash
# Start local PostgreSQL
cd infra/docker
docker-compose up -d

# Connect via psql
psql postgresql://user:password@localhost:5432/holi_labs

# Or use Prisma Studio
cd apps/web
pnpm db:studio
```

### Backup Database (Local)
```bash
cd apps/web
pnpm backup:local
```

### Backup Database (Production)
```bash
# Daily backup with upload to cloud
pnpm backup:daily

# Weekly backup
pnpm backup:weekly

# Monthly backup
pnpm backup:monthly
```

### Create New Migration
```bash
cd apps/web

# 1. Edit schema.prisma
# 2. Generate migration
pnpm prisma migrate dev --name add_new_field

# 3. Commit migration files
git add prisma/migrations
git commit -m "Add migration: add_new_field"
```

---

## 🔐 Security & Secrets

### Generate New Secrets
```bash
# Session secrets (32 bytes)
openssl rand -base64 32

# Hex secrets
openssl rand -hex 32

# VAPID keys for push notifications
npx web-push generate-vapid-keys
```

### Update Production Environment Variables
```bash
# Via DigitalOcean Console:
# 1. Go to https://cloud.digitalocean.com/apps
# 2. Click holi-labs → Settings → Environment Variables
# 3. Edit → Add/Update → Save
# 4. Wait for automatic rebuild (~10 min)
```

---

## 🧪 Testing

### Run All Tests
```bash
# From root
pnpm test

# From web app
cd apps/web
pnpm test
```

### Run E2E Tests
```bash
cd apps/web
pnpm test:e2e
```

### Run Specific Test
```bash
cd apps/web
pnpm jest src/lib/__tests__/api-auth.test.ts
```

---

## 🐛 Troubleshooting

### Build Failing in Production?
```bash
# 1. Run type check locally
cd apps/web && pnpm tsc --noEmit

# 2. Check for errors
# 3. Fix errors before pushing

# 4. Build locally to verify
pnpm build
```

### TypeScript Errors?
```bash
# Check for all errors
cd apps/web
pnpm tsc --noEmit

# Generate Prisma client (if schema changed)
pnpm prisma generate

# Clear Next.js cache
rm -rf .next
pnpm build
```

### Database Connection Issues?
```bash
# Check connection
cd apps/web
pnpm prisma db push --skip-generate

# Or test with psql
psql $DATABASE_URL -c "SELECT 1"
```

### Rate Limiting Not Working?
```bash
# Check Upstash Redis
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected: {"result":"PONG"}
```

---

## 🔄 Rollback

### Rollback to Previous Deployment (Console)
1. Go to https://cloud.digitalocean.com/apps
2. Click holi-labs → Deployments
3. Find previous successful deployment
4. Click "Redeploy"

### Rollback to Previous Commit (Git)
```bash
# Find commit to rollback to
git log --oneline -10

# Revert latest commit
git revert HEAD
git push origin main

# Or reset to specific commit (⚠️ DANGEROUS)
git reset --hard <commit-hash>
git push -f origin main
```

---

## 📊 Monitoring

### Check Uptime
```bash
# Production uptime
curl -s https://holilabs-lwp6y.ondigitalocean.app/api/health | jq '.uptime'
```

### Check Database Latency
```bash
curl -s https://holilabs-lwp6y.ondigitalocean.app/api/health | jq '.services.databaseLatency'
```

### View Sentry Dashboard
```bash
# If configured
# https://sentry.io/organizations/your-org/issues/
```

---

## 🧹 Cleanup

### Stop Background Processes
```bash
# Check running processes
ps aux | grep "pnpm\|node"

# Kill specific process
kill <PID>

# Kill all Node processes (⚠️ use carefully)
pkill -f node
```

### Clear Node Modules
```bash
# From root
pnpm clean

# From web app
cd apps/web
rm -rf node_modules .next
pnpm install
```

### Clean Docker
```bash
cd infra/docker
docker-compose down -v
docker-compose up -d
```

---

## 📚 Documentation

### View Project Docs
```bash
ls apps/web/docs/

# Key files:
cat apps/web/docs/DEPLOYMENT_SUMMARY.md
cat apps/web/docs/TROUBLESHOOTING.md
cat PROJECT_SNAPSHOT.md
```

### Generate New Documentation
```bash
# Update as needed, commit
git add apps/web/docs/
git commit -m "Update documentation"
```

---

## 🔗 Important URLs

- **Production:** https://holilabs-lwp6y.ondigitalocean.app
- **DigitalOcean Console:** https://cloud.digitalocean.com/apps
- **GitHub Repo:** https://github.com/HolisticHealthcareLabs/holilabs
- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Upstash Console:** https://console.upstash.com/
- **Sentry Dashboard:** https://sentry.io/

---

## 🆘 Emergency Contacts

**If production is down:**
1. Check health endpoint (may be transient)
2. Check DigitalOcean status page
3. Review runtime logs in DigitalOcean console
4. Rollback to previous deployment if needed
5. Contact DigitalOcean support if infrastructure issue

---

**End of Quick Reference**
