# CI/CD Quick Reference Guide

**Quick access to common CI/CD operations for Holi Labs**

---

## Common Commands

### Local Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm tsc --noEmit

# Build application
pnpm build

# Database migrations
pnpm prisma migrate dev
pnpm prisma studio
```

### Deployment Commands

```bash
# View production app status
doctl apps get $PRODUCTION_APP_ID

# View staging app status
doctl apps get $STAGING_APP_ID

# Trigger manual deployment
doctl apps create-deployment $PRODUCTION_APP_ID --wait

# View deployment logs
doctl apps logs $PRODUCTION_APP_ID --type run --follow

# List recent deployments
doctl apps deployment list $PRODUCTION_APP_ID
```

### Database Commands

```bash
# View database status
doctl databases get $PRODUCTION_DB_ID

# Create backup
doctl databases backup create $PRODUCTION_DB_ID

# List backups
doctl databases backup list $PRODUCTION_DB_ID

# Connect to database
doctl databases connection $PRODUCTION_DB_ID
```

---

## Deployment Workflows

### Deploy to Staging

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test
pnpm dev
pnpm test

# 3. Push and create PR to develop
git push origin feature/my-feature
# Create PR on GitHub

# 4. After PR approved and merged
# Automatic deployment to staging happens
```

### Deploy to Production

```bash
# 1. Merge develop to main
git checkout main
git pull origin main
git merge develop
git push origin main
# Or create PR from develop to main

# 2. After merge
# Automatic deployment to production happens

# 3. Monitor deployment
# Check GitHub Actions
# Check Slack notifications
```

### Hotfix

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Make minimal fix
# ... fix code ...

# 3. Create PR to main (fast-track)
git push origin hotfix/critical-fix
# Create PR, get quick approval

# 4. Backport to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop
```

---

## Monitoring URLs

### Health Checks

```bash
# Production
curl https://holilabs.com/api/health

# Staging
curl https://staging.holilabs.com/api/health
```

### Critical Endpoints

```bash
# Authentication
curl -I https://holilabs.com/auth/login

# API
curl -I https://holilabs.com/api/csrf

# Portal
curl -I https://holilabs.com/portal/dashboard
```

---

## GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main/develop | Lint and build |
| `test.yml` | Push/PR to main/develop | Run tests |
| `pr-checks.yml` | Pull requests | Quality gates |
| `deploy-production.yml` | Push to main | Deploy production |
| `deploy-staging.yml` | Push to develop | Deploy staging |
| `security-enhanced.yml` | Push/PR/Weekly | Security scans |
| `coverage-report.yml` | Push/PR | Test coverage |
| `database-backup.yml` | Daily 2AM | Database backups |
| `cdss-performance-test.yml` | PR/Weekly | Performance tests |

---

## Rollback Procedures

### Quick Rollback (Recommended)

```bash
# 1. Revert the commit on GitHub
# Go to PR and click "Revert"

# 2. Merge revert PR
# Automatic redeployment happens
```

### Manual Rollback

```bash
# 1. Get previous deployment
doctl apps deployment list $PRODUCTION_APP_ID

# 2. Rollback to previous image
doctl apps update $PRODUCTION_APP_ID \
  --image registry.digitalocean.com/$REGISTRY_NAME/holi-labs:previous-tag

# 3. Verify
curl https://holilabs.com/api/health
```

### Database Rollback

```bash
# 1. List backups
doctl databases backup list $PRODUCTION_DB_ID

# 2. Restore backup
doctl databases backup restore $PRODUCTION_DB_ID $BACKUP_ID

# 3. Verify and restart app
```

---

## Required Secrets

### GitHub Secrets (Repository Settings → Secrets)

**Production:**
- `DIGITALOCEAN_ACCESS_TOKEN`
- `PRODUCTION_APP_ID`
- `PRODUCTION_DB_ID`
- `REGISTRY_NAME`
- `SLACK_WEBHOOK_URL`
- `SENTRY_AUTH_TOKEN`

**Staging:**
- `STAGING_APP_ID`
- `STAGING_DB_ID`

---

## Status Checks

### Required for Main Branch

- ✓ `lint-and-typecheck`
- ✓ `build-test`
- ✓ `test / Run Tests`
- ✓ `security / Security Scan`
- ✓ `coverage / Generate Coverage Report`

### Required for Develop Branch

- ✓ `lint-and-typecheck`
- ✓ `test / Run Tests`
- ✓ `code-quality / Code Quality Check`

---

## Troubleshooting Quick Fixes

### Deployment Failed

```bash
# Check logs
doctl apps logs $PRODUCTION_APP_ID --type run

# Check build logs
doctl apps logs $PRODUCTION_APP_ID --type build

# Retry deployment
doctl apps create-deployment $PRODUCTION_APP_ID
```

### Tests Failing

```bash
# Run tests locally
cd apps/web
pnpm test

# Check test database
DATABASE_URL=postgresql://test:test@localhost:5432/test pnpm test

# Update snapshots
pnpm test -- -u
```

### Build Failing

```bash
# Check TypeScript
pnpm tsc --noEmit

# Check linting
pnpm lint --fix

# Validate environment
pnpm validate:env
```

### Migration Failing

```bash
# Check migration status
pnpm prisma migrate status

# Resolve migration
pnpm prisma migrate resolve --applied [migration-name]

# Reset and reapply
pnpm prisma migrate reset
pnpm prisma migrate deploy
```

---

## Performance Thresholds

| Metric | Threshold | Current |
|--------|-----------|---------|
| p95 Latency | < 2000ms | Monitor |
| Error Rate | < 1% | Monitor |
| Cache Hit Rate | > 70% | Monitor |
| Test Coverage | > 40% | Monitor |
| Build Time | < 15 min | ~10-15 min |
| Deploy Time | < 10 min | ~5-10 min |

---

## Slack Channels

- `#deployments` - Deployment notifications
- `#alerts` - Production alerts
- `#devops` - Infrastructure updates
- `#oncall` - Emergency contacts

---

## Important Links

- **GitHub Actions:** `https://github.com/YOUR_ORG/YOUR_REPO/actions`
- **Sentry:** `https://sentry.io/organizations/YOUR_ORG/`
- **DigitalOcean:** `https://cloud.digitalocean.com/`
- **Production:** `https://holilabs.com`
- **Staging:** `https://staging.holilabs.com`

---

## Emergency Contacts

- **DevOps Lead:** [Contact]
- **Database Admin:** [Contact]
- **On-Call Engineer:** Check #oncall in Slack

---

## Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Staging tested
- [ ] Database migrations reviewed
- [ ] Breaking changes documented
- [ ] Team notified
- [ ] Rollback plan confirmed

---

## Post-Deployment Checklist

- [ ] Health check passed
- [ ] Critical endpoints responding
- [ ] No Sentry errors
- [ ] Database migrations applied
- [ ] Performance metrics normal
- [ ] Team notified

---

**Last Updated:** 2025-12-15
