# Deployment Guide - Holi Labs

**Version:** 1.0
**Last Updated:** 2025-12-15
**Owner:** DevOps Team

## Table of Contents

- [Overview](#overview)
- [Deployment Architecture](#deployment-architecture)
- [Prerequisites](#prerequisites)
- [Environments](#environments)
- [Deployment Procedures](#deployment-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Database Management](#database-management)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Emergency Procedures](#emergency-procedures)

---

## Overview

Holi Labs uses a multi-environment deployment strategy with automated CI/CD pipelines built on GitHub Actions. The application is hosted on DigitalOcean App Platform.

### Deployment Flow

```
Feature Branch → PR → CI Checks → Merge to develop → Staging
                                                        ↓
                                    Production ← Merge to main
```

### Key Principles

1. **Automated**: All deployments are automated via GitHub Actions
2. **Gated**: Production deployments require all checks to pass
3. **Monitored**: Health checks and smoke tests after each deployment
4. **Reversible**: Rollback procedures are documented and tested
5. **Auditable**: All deployments are logged and tracked

---

## Deployment Architecture

### Infrastructure Stack

| Component | Technology | Location |
|-----------|-----------|----------|
| Application Hosting | DigitalOcean App Platform | NYC Region |
| Database | PostgreSQL 15 | DigitalOcean Managed DB |
| Cache | Redis | DigitalOcean Managed Redis |
| Container Registry | DigitalOcean Container Registry | Private |
| CDN | DigitalOcean Spaces (optional) | Global |
| Error Tracking | Sentry | Cloud |
| Notifications | Slack | Cloud |

### Application Architecture

```
                    ┌─────────────────┐
                    │   GitHub Repo   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ GitHub Actions  │
                    │   CI/CD         │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                                 │
    ┌───────▼────────┐              ┌────────▼────────┐
    │    Staging     │              │   Production    │
    │  Environment   │              │   Environment   │
    └───────┬────────┘              └────────┬────────┘
            │                                 │
    ┌───────▼────────┐              ┌────────▼────────┐
    │  PostgreSQL    │              │  PostgreSQL     │
    │  (Staging DB)  │              │ (Production DB) │
    └────────────────┘              └─────────────────┘
```

---

## Prerequisites

### Required Access

- GitHub repository write access
- GitHub Actions secrets management
- DigitalOcean account access
- Production environment approval rights
- Slack workspace access

### Required Tools

```bash
# Install doctl (DigitalOcean CLI)
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init -t YOUR_TOKEN

# Verify connection
doctl account get
```

### Required Secrets

Ensure these secrets are configured in GitHub repository settings:

**Production Environment:**
- `DIGITALOCEAN_ACCESS_TOKEN`
- `PRODUCTION_APP_ID`
- `PRODUCTION_DB_ID`
- `PRODUCTION_DATABASE_URL`
- `REGISTRY_NAME`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `DEID_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASSEMBLYAI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `RESEND_API_KEY`
- `VAPID_PRIVATE_KEY`
- `SLACK_WEBHOOK_URL`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

**Staging Environment:**
- Same as production but with staging-specific values
- `STAGING_APP_ID`
- `STAGING_DB_ID`

---

## Environments

### 1. Development (Local)

**Purpose:** Local development and testing

**Access:** All developers

**Commands:**
```bash
cd apps/web
pnpm install
pnpm dev
```

**Database:**
```bash
pnpm prisma migrate dev
pnpm prisma studio
```

### 2. Staging

**URL:** https://staging.holilabs.com

**Purpose:** Pre-production testing

**Trigger:** Automatic on merge to `develop` branch

**Database:** Staging PostgreSQL database

**Monitoring:** Basic health checks

### 3. Production

**URL:** https://holilabs.com

**Purpose:** Live production environment

**Trigger:** Automatic on merge to `main` branch (with gates)

**Database:** Production PostgreSQL database

**Monitoring:** Full monitoring with Sentry, health checks, and uptime monitoring

---

## Deployment Procedures

### Standard Deployment to Staging

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test Locally**
   ```bash
   # Make changes
   pnpm dev
   pnpm test
   pnpm lint
   pnpm tsc --noEmit
   ```

3. **Create Pull Request**
   - Push branch to GitHub
   - Create PR targeting `develop`
   - Wait for CI checks to pass
   - Request code review

4. **Merge to Develop**
   - Get approval from reviewer
   - Merge PR
   - **Automatic deployment to staging triggers**

5. **Verify Staging Deployment**
   ```bash
   # Check health endpoint
   curl https://staging.holilabs.com/api/health

   # Monitor deployment in GitHub Actions
   # Check Slack for deployment notification
   ```

### Standard Deployment to Production

1. **Verify Staging**
   - Test all features on staging
   - Run manual QA tests
   - Verify database migrations work
   - Check performance metrics

2. **Create Production PR**
   ```bash
   git checkout main
   git pull origin main
   git merge develop
   git push origin main
   ```
   Or create PR from `develop` to `main`

3. **Pre-Deployment Checklist**
   - [ ] All CI checks pass
   - [ ] Code review approved
   - [ ] Staging tested thoroughly
   - [ ] Database migrations reviewed
   - [ ] Breaking changes documented
   - [ ] Team notified of deployment
   - [ ] Rollback plan confirmed

4. **Merge to Main**
   - Merge PR (requires approval)
   - **Automatic production deployment triggers**

5. **Monitor Production Deployment**
   ```bash
   # Watch GitHub Actions
   # View: https://github.com/YOUR_ORG/YOUR_REPO/actions

   # Check health
   curl https://holilabs.com/api/health

   # Check critical endpoints
   curl -I https://holilabs.com/auth/login
   curl -I https://holilabs.com/api/csrf

   # Monitor Sentry for errors
   # Check Slack notifications
   ```

6. **Post-Deployment Verification**
   - [ ] Health check passed
   - [ ] Critical endpoints responding
   - [ ] No Sentry errors
   - [ ] Database migrations applied
   - [ ] Performance metrics normal
   - [ ] User traffic normal

7. **Team Communication**
   - Announce deployment in Slack
   - Update team on any issues
   - Monitor for 30 minutes

### Hotfix Deployment

For critical production bugs that need immediate deployment:

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Make Minimal Fix**
   - Fix only the critical issue
   - Test thoroughly
   - Create PR directly to `main`

3. **Fast-Track Review**
   - Mark PR as urgent
   - Get immediate review
   - Merge with approval

4. **Deploy and Monitor**
   - Follow production deployment steps
   - Monitor closely for 1 hour

5. **Backport to Develop**
   ```bash
   git checkout develop
   git merge hotfix/critical-bug-fix
   git push origin develop
   ```

### Manual Deployment

If automated deployment fails or manual deployment is needed:

1. **Production Deployment**
   ```bash
   # Authenticate with DigitalOcean
   doctl auth init -t $DIGITALOCEAN_TOKEN

   # Trigger deployment
   doctl apps create-deployment $PRODUCTION_APP_ID --wait
   ```

2. **Database Migrations**
   ```bash
   # Connect to production app
   doctl apps exec $PRODUCTION_APP_ID \
     --command "cd apps/web && pnpm prisma migrate deploy"
   ```

3. **Verify Deployment**
   ```bash
   doctl apps get $PRODUCTION_APP_ID
   curl https://holilabs.com/api/health
   ```

---

## Rollback Procedures

### Automatic Rollback (Recommended)

1. **Identify Failed Deployment**
   - Check GitHub Actions for failures
   - Check Sentry for increased errors
   - Monitor health checks

2. **Trigger Rollback via GitHub**
   ```bash
   # Revert the merge commit
   git revert HEAD
   git push origin main

   # Or use GitHub UI to revert PR
   ```

3. **Automatic Redeployment**
   - Push to main triggers new deployment
   - Monitor rollback deployment

### Manual Rollback

1. **Get Previous Working Image**
   ```bash
   # List recent deployments
   doctl apps deployment list $PRODUCTION_APP_ID

   # Get previous deployment ID
   PREVIOUS_DEPLOYMENT_ID="previous-id-here"
   ```

2. **Rollback Application**
   ```bash
   # Rollback to previous image
   doctl apps update $PRODUCTION_APP_ID \
     --image registry.digitalocean.com/$REGISTRY_NAME/holi-labs:previous-tag
   ```

3. **Rollback Database Migrations** (if needed)
   ```bash
   # Connect to production
   doctl apps exec $PRODUCTION_APP_ID

   # Check migration status
   cd apps/web && pnpm prisma migrate status

   # Mark migration as rolled back
   pnpm prisma migrate resolve --rolled-back [migration-name]
   ```

4. **Verify Rollback**
   ```bash
   curl https://holilabs.com/api/health
   # Check Sentry for errors
   # Monitor for 30 minutes
   ```

### Database Rollback

**CRITICAL: Database rollbacks are complex and risky**

1. **Stop Application**
   ```bash
   doctl apps update $PRODUCTION_APP_ID --spec .do/app-maintenance.yaml
   ```

2. **Restore from Backup**
   ```bash
   # List backups
   doctl databases backup list $PRODUCTION_DB_ID

   # Restore from specific backup
   doctl databases backup restore $PRODUCTION_DB_ID $BACKUP_ID
   ```

3. **Verify Database**
   ```bash
   # Connect and verify data
   doctl databases connection $PRODUCTION_DB_ID
   ```

4. **Restart Application**
   ```bash
   doctl apps update $PRODUCTION_APP_ID --spec .do/app.yaml
   ```

---

## Database Management

### Running Migrations

**Staging:**
```bash
# Automatic on deployment
# Or manual:
cd apps/web
DATABASE_URL=$STAGING_DATABASE_URL pnpm prisma migrate deploy
```

**Production:**
```bash
# Automatic on deployment
# Or manual:
DATABASE_URL=$PRODUCTION_DATABASE_URL pnpm prisma migrate deploy
```

### Creating Migrations

```bash
# Create migration locally
cd apps/web
pnpm prisma migrate dev --name your_migration_name

# Test migration
pnpm prisma migrate reset
pnpm prisma migrate dev

# Commit migration files
git add prisma/migrations/
git commit -m "feat: add your_migration_name migration"
```

### Database Backups

**Automatic:** Daily backups at 2 AM UTC via GitHub Actions

**Manual Backup:**
```bash
doctl databases backup create $PRODUCTION_DB_ID
```

**Verify Backups:**
```bash
doctl databases backup list $PRODUCTION_DB_ID
```

### Database Access

**Staging:**
```bash
doctl databases connection $STAGING_DB_ID
```

**Production (Emergency Only):**
```bash
doctl databases connection $PRODUCTION_DB_ID
```

**Rules:**
- Never run queries directly in production
- Always use read-replica for analytics
- Use migrations for schema changes
- Backup before major operations

---

## Monitoring & Health Checks

### Health Endpoints

**Primary Health Check:**
```bash
curl https://holilabs.com/api/health
# Expected: 200 OK with {"status": "healthy"}
```

**Critical Endpoints:**
```bash
# Authentication
curl -I https://holilabs.com/auth/login

# API availability
curl -I https://holilabs.com/api/csrf

# Portal access
curl -I https://holilabs.com/portal/dashboard
```

### Sentry Monitoring

**Access:** https://sentry.io/organizations/YOUR_ORG/

**What to Monitor:**
- Error rate increase
- New error types
- Performance degradation
- User impact

### Slack Notifications

**Channels:**
- `#deployments` - All deployment notifications
- `#alerts` - Production alerts and errors
- `#devops` - Infrastructure updates

### Application Metrics

**Key Metrics to Monitor:**
1. **Response Time:** p95 < 2000ms
2. **Error Rate:** < 1%
3. **Uptime:** > 99.9%
4. **Database Connections:** < 80% of pool
5. **Cache Hit Rate:** > 70%

---

## Troubleshooting

### Deployment Failed

**Symptoms:** GitHub Actions workflow fails

**Diagnosis:**
1. Check GitHub Actions logs
2. Identify failed step
3. Review error messages

**Solutions:**

**Build Failure:**
```bash
# Check for TypeScript errors
cd apps/web
pnpm tsc --noEmit

# Check for linting errors
pnpm lint

# Verify environment variables
pnpm validate:env
```

**Test Failure:**
```bash
# Run tests locally
pnpm test

# Check test database
DATABASE_URL=postgresql://test:test@localhost:5432/test pnpm test
```

**Migration Failure:**
```bash
# Check migration status
pnpm prisma migrate status

# Resolve migration issues
pnpm prisma migrate resolve --applied [migration-name]
```

### Application Not Starting

**Symptoms:** Health checks fail after deployment

**Diagnosis:**
```bash
# Check application logs
doctl apps logs $PRODUCTION_APP_ID --type run

# Check deployment status
doctl apps get $PRODUCTION_APP_ID
```

**Solutions:**

**Environment Variable Issue:**
```bash
# Verify all required env vars are set
doctl apps spec get $PRODUCTION_APP_ID

# Update missing variables
doctl apps update $PRODUCTION_APP_ID --spec .do/app.yaml
```

**Database Connection Issue:**
```bash
# Test database connectivity
doctl databases connection $PRODUCTION_DB_ID

# Check database status
doctl databases get $PRODUCTION_DB_ID
```

### High Error Rate

**Symptoms:** Sentry shows increased errors

**Immediate Actions:**
1. Check Sentry for error details
2. Verify health endpoints
3. Check recent deployments
4. Consider rollback if critical

**Diagnosis:**
```bash
# Check application logs
doctl apps logs $PRODUCTION_APP_ID --type run --follow

# Check database performance
doctl databases pool get $PRODUCTION_DB_ID

# Check Redis status
doctl databases get $REDIS_ID
```

### Performance Degradation

**Symptoms:** Slow response times

**Diagnosis:**
```bash
# Run load tests
cd apps/web/tests/load
./run-load-test.sh

# Check database queries
# Use Prisma Studio or pgAdmin
```

**Solutions:**
1. Check database query performance
2. Verify cache is working
3. Check for N+1 queries
4. Review recent code changes
5. Scale up resources if needed

---

## Emergency Procedures

### Complete Outage

1. **Immediate Response**
   ```bash
   # Check application status
   doctl apps get $PRODUCTION_APP_ID

   # Check database status
   doctl databases get $PRODUCTION_DB_ID

   # Check recent deployments
   doctl apps deployment list $PRODUCTION_APP_ID
   ```

2. **Notify Team**
   - Post in `#alerts` channel
   - Escalate to on-call engineer
   - Update status page

3. **Diagnosis**
   - Check GitHub Actions for failed deployments
   - Review application logs
   - Check Sentry for errors
   - Verify database connectivity

4. **Resolution**
   - Rollback if recent deployment caused issue
   - Restore database if corrupted
   - Scale up resources if capacity issue
   - Fix and redeploy if code issue

### Database Corruption

1. **Stop Application**
   ```bash
   # Scale down to 0 instances
   doctl apps update $PRODUCTION_APP_ID --spec .do/app-maintenance.yaml
   ```

2. **Assess Damage**
   ```bash
   # Connect to database
   doctl databases connection $PRODUCTION_DB_ID

   # Check tables
   SELECT * FROM pg_stat_user_tables;

   # Identify corrupted tables
   ```

3. **Restore from Backup**
   ```bash
   # Find latest good backup
   doctl databases backup list $PRODUCTION_DB_ID

   # Restore backup
   doctl databases backup restore $PRODUCTION_DB_ID $BACKUP_ID
   ```

4. **Verify and Restart**
   ```bash
   # Verify data integrity
   # Run migrations if needed
   pnpm prisma migrate deploy

   # Restart application
   doctl apps update $PRODUCTION_APP_ID --spec .do/app.yaml
   ```

### Security Incident

1. **Immediate Actions**
   - Rotate all credentials
   - Review access logs
   - Block suspicious IPs
   - Notify security team

2. **Rotate Secrets**
   ```bash
   # Generate new secrets
   openssl rand -base64 32

   # Update in GitHub Secrets
   # Redeploy application
   ```

3. **Audit Logs**
   ```bash
   # Check audit logs in database
   # Review Sentry events
   # Check GitHub Actions logs
   ```

4. **Document Incident**
   - Write incident report
   - Document lessons learned
   - Update security procedures

---

## Appendix

### Useful Commands

```bash
# View application info
doctl apps get $APP_ID

# View logs
doctl apps logs $APP_ID --type run --follow

# List deployments
doctl apps deployment list $APP_ID

# View database info
doctl databases get $DB_ID

# Create backup
doctl databases backup create $DB_ID

# Scale application
doctl apps update $APP_ID --spec .do/app.yaml
```

### Environment Variables Reference

See `.do/app.yaml` for complete list of environment variables.

### Support Contacts

- **DevOps Lead:** [Contact Info]
- **Database Admin:** [Contact Info]
- **Security Team:** [Contact Info]
- **On-Call Engineer:** Check Slack #oncall

### External Resources

- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Next Review:** After first production deployment
