# Deployment Checklist
**Version:** 1.0
**Last Updated:** 2026-01-01
**Owner:** DevOps Team
**Review Cycle:** Quarterly

---

## Overview

This checklist ensures safe, reliable deployments to production. Following this checklist minimizes the risk of outages, data loss, and security incidents.

**Use this checklist for:**
- Standard production deployments
- Hotfix deployments
- Database migrations
- Infrastructure changes

**Deployment Philosophy:**
- **Zero-downtime:** Rolling deployments, no service interruption
- **Reversible:** Always have a rollback plan
- **Tested:** Never deploy untested code
- **Monitored:** Watch metrics during and after deployment
- **Communicated:** Stakeholders know what's happening

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Deployment Process](#2-deployment-process)
3. [Post-Deployment Verification](#3-post-deployment-verification)
4. [Rollback Procedures](#4-rollback-procedures)
5. [Emergency Hotfix Process](#5-emergency-hotfix-process)
6. [Database Migration Checklist](#6-database-migration-checklist)
7. [Deployment Schedule](#7-deployment-schedule)

---

## 1. Pre-Deployment Checklist

### 1.1 Code Review and Testing (Before Merge)

- [ ] **Pull Request Created**
  - Clear description of changes
  - Linked to Jira/Linear ticket
  - Screenshots/videos for UI changes

- [ ] **Code Review Completed**
  - At least 1 approval (2 for high-risk changes)
  - All comments addressed
  - No unresolved conversations

- [ ] **Automated Tests Pass**
  - Unit tests: ✅ Passing
  - Integration tests: ✅ Passing
  - E2E tests: ✅ Passing (if applicable)
  - Test coverage: ≥70% (≥90% for security-critical code)

- [ ] **Security Checks Pass**
  - `pnpm audit`: No high/critical vulnerabilities
  - Snyk scan: No high/critical vulnerabilities
  - Gitleaks: No secrets in code
  - Code review: No hardcoded credentials, SQL injection, XSS vulnerabilities

- [ ] **Build Succeeds**
  - `pnpm build`: Successful
  - No TypeScript errors
  - No ESLint errors (or explicitly acknowledged)
  - Docker image builds successfully

---

### 1.2 Pre-Merge Checks (Before Merging PR)

- [ ] **Branch Up-to-Date**
  ```bash
  git checkout main
  git pull origin main
  git checkout [feature-branch]
  git merge main
  # Resolve conflicts if any
  ```

- [ ] **Clean Git History**
  - Squash commits if messy (optional but recommended)
  - Descriptive commit message

- [ ] **Breaking Changes Identified**
  - If API changes, are clients compatible?
  - If database schema changes, is migration safe?
  - If dependencies updated, are there breaking changes?

- [ ] **Feature Flags Configured (if applicable)**
  - New feature behind feature flag?
  - Flag configured in Doppler for production?

---

### 1.3 Pre-Deployment Preparation (Day Before or Day Of)

#### Step 1: Verify Staging Deployment (30 minutes)

- [ ] **Deploy to Staging**
  ```bash
  # Merge to staging branch (auto-deploys)
  git checkout staging
  git merge main
  git push origin staging
  ```

- [ ] **Smoke Test on Staging**
  - [ ] Health endpoint: `curl https://staging-api.holilabs.xyz/api/health`
  - [ ] User login: Manually log in to staging
  - [ ] Key features: Test critical user flows
  - [ ] Database migrations: Verify applied successfully
  - [ ] No errors in Sentry

- [ ] **Performance Test on Staging**
  - [ ] Load test (optional, for high-risk changes):
    ```bash
    # Run load test (e.g., k6, artillery)
    k6 run load-test.js
    ```
  - [ ] Verify p95 latency <500ms
  - [ ] Verify no memory leaks (observe over 30 minutes)

---

#### Step 2: Review Change Set (10 minutes)

- [ ] **Review Commits Going to Production**
  ```bash
  # View commits since last production deployment
  git log production..main --oneline
  ```

- [ ] **Risk Assessment**
  - **Low Risk:** Bug fixes, copy changes, config updates
  - **Medium Risk:** New features, dependency updates, performance optimizations
  - **High Risk:** Database migrations, authentication changes, payment logic

- [ ] **Deployment Window Selected**
  - **Low Risk:** Anytime during business hours (9am-5pm)
  - **Medium Risk:** Off-peak hours (before 9am or after 6pm)
  - **High Risk:** Off-peak hours with CTO approval and on-call standby

---

#### Step 3: Communication and Coordination (15 minutes)

- [ ] **Notify Team in Slack #deployments**
  ```
  📦 Production Deployment Planned

  **What:** [Brief description, e.g., "Patient search performance improvements"]
  **When:** Today, 10:00 AM PST
  **Duration:** ~15 minutes
  **Risk:** Low / Medium / High
  **Rollback Plan:** Revert to previous Docker image

  **Changes:**
  - [List key changes from git log]

  **Deployed By:** @[your-name]
  **On-Call Engineer:** @[on-call-name] (on standby)
  ```

- [ ] **Notify On-Call Engineer**
  - DM on-call engineer: "I'm deploying to production at [TIME]. Low risk, but heads up."
  - Confirm they're available and can respond if issues arise

- [ ] **Update Status Page (High Risk Only)**
  - https://manage.statuspage.io/
  - Create maintenance window: "Scheduled maintenance - minor service disruption possible"

- [ ] **Check for Conflicting Deployments**
  - No other deployments in progress
  - No infrastructure maintenance windows
  - No major vendor outages (AWS, DigitalOcean)

---

### 1.4 Final Pre-Deployment Checks (5 minutes before deployment)

- [ ] **Production Health Check**
  ```bash
  # Verify production is healthy before deploying
  curl https://api.holilabs.xyz/api/health | jq .
  # Expected: {"status": "healthy"}
  ```

- [ ] **Monitor Dashboards Green**
  - Grafana: https://metrics.holilabs.xyz/d/overview
  - No active alerts in PagerDuty
  - Error rate <1% in Sentry

- [ ] **Database Backup Recent**
  ```bash
  # Verify last backup completed (within 24 hours)
  aws s3 ls s3://holi-database-backups/$(date +%Y/%m/%d)/ | tail -1
  ```

- [ ] **Emergency Contacts Ready**
  - CTO phone number saved
  - DevOps Lead contact info ready
  - Incident response team on standby (high-risk deployments)

- [ ] **Rollback Plan Understood**
  - Know how to rollback (Section 4)
  - Previous Docker image tag noted
  - Previous git commit hash noted

---

## 2. Deployment Process

### 2.1 Standard Production Deployment (Rolling, Zero-Downtime)

**Deployment Method:** GitHub Actions CI/CD (automated)

**Triggered By:** Merge to `main` branch (auto-deploys to production)

#### Step 1: Merge to Main (Initiates Deployment)

```bash
# 1. Ensure branch is up-to-date
git checkout main
git pull origin main

# 2. Merge feature branch (fast-forward if possible)
git merge --no-ff feature/your-feature-name

# 3. Push to main (triggers CI/CD)
git push origin main
```

**CI/CD Pipeline Steps (Automated):**
1. ✅ Run tests (unit, integration, E2E)
2. ✅ Build Docker image
3. ✅ Push image to registry
4. ✅ Deploy to production (rolling deployment):
   - Update web-server-1 (50% traffic)
   - Health check web-server-1
   - Update web-server-2 (50% traffic)
   - Health check web-server-2
5. ✅ Run post-deployment smoke tests
6. ✅ Notify Slack #deployments

---

#### Step 2: Monitor Deployment Progress (10-15 minutes)

- [ ] **Watch GitHub Actions Workflow**
  - URL: https://github.com/holilabs/holilabsv2/actions
  - Verify each step passes

- [ ] **Watch Deployment Logs**
  ```bash
  # SSH to server (if needed)
  ssh user@production-server
  docker logs -f holi-web-1
  ```

- [ ] **Monitor Grafana Dashboard (Real-Time)**
  - https://metrics.holilabs.xyz/d/deployment-monitoring
  - Watch for:
    - Error rate spike
    - Latency increase
    - Drop in traffic (indicates issues)

- [ ] **Monitor Sentry (Real-Time)**
  - https://sentry.io/holi-labs/
  - Watch for new error types

**Red Flags (Rollback Immediately):**
- ❌ Error rate >5%
- ❌ p95 latency >2000ms (doubled)
- ❌ Health checks failing
- ❌ New errors in Sentry (high volume)
- ❌ User reports of issues

---

#### Step 3: Deployment Approval Gate (Manual Approval Required)

**CI/CD pauses for manual approval before deploying to second server.**

**Before Approving:**
- [ ] Web-server-1 health checks passing
- [ ] No new errors in Sentry
- [ ] Grafana metrics look normal
- [ ] Smoke test on web-server-1 successful:
  ```bash
  # Test specific server directly
  curl -H "Host: api.holilabs.xyz" http://[server-1-ip]/api/health
  ```

**If Issues Detected:**
- ❌ **DO NOT APPROVE** - Rollback immediately (Section 4)

**If All Clear:**
- ✅ **Approve in GitHub Actions** - Continues to web-server-2

---

### 2.2 Database Migration Deployment

**Special Considerations:** Database migrations require extra care to avoid data loss or downtime.

**See Section 6: Database Migration Checklist for detailed steps.**

---

### 2.3 Manual Deployment (Backup Method)

**Use When:** CI/CD is broken, or for infrastructure changes

```bash
# 1. SSH to production server
ssh user@production-server

# 2. Navigate to repository
cd /opt/holi/holilabsv2

# 3. Pull latest code
git pull origin main

# 4. Build Docker image
docker-compose -f docker-compose.prod.yml build

# 5. Rolling restart (zero-downtime)
# Update server 1
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web-1

# Wait 30 seconds, verify health
sleep 30
curl http://localhost:3000/api/health

# Update server 2
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web-2

# Wait 30 seconds, verify health
sleep 30
curl http://localhost:3000/api/health
```

---

## 3. Post-Deployment Verification

### 3.1 Immediate Verification (0-15 minutes after deployment)

- [ ] **Health Checks Passing**
  ```bash
  curl https://api.holilabs.xyz/api/health | jq .
  # Expected: {"status": "healthy", "database": "connected"}
  ```

- [ ] **Deployment Confirmation**
  ```bash
  # Verify correct version deployed
  curl https://api.holilabs.xyz/api/health | jq .version
  # Expected: [new version / commit hash]
  ```

- [ ] **Key Features Functioning**
  - [ ] User login (test with demo account)
  - [ ] Patient record access
  - [ ] Appointment creation
  - [ ] Prescription creation
  - [ ] Any feature modified in this deployment

- [ ] **No New Errors**
  - Sentry: https://sentry.io/holi-labs/
  - Filter: "Last 15 minutes"
  - Expected: No new error types, error rate <1%

- [ ] **Metrics Normal**
  - Grafana: https://metrics.holilabs.xyz/d/overview
  - Error rate: <1% ✅
  - Latency p95: <500ms ✅
  - Traffic: Normal for time of day ✅

---

### 3.2 Extended Monitoring (15-60 minutes after deployment)

- [ ] **Watch Metrics Dashboard**
  - Refresh Grafana every 5 minutes
  - Look for gradual degradation (memory leaks, connection leaks)

- [ ] **Database Performance**
  ```bash
  # Check for slow queries introduced by deployment
  psql $DATABASE_URL -c "
    SELECT query, calls, mean_exec_time
    FROM pg_stat_statements
    WHERE mean_exec_time > 100
    ORDER BY mean_exec_time DESC
    LIMIT 10;
  "
  ```

- [ ] **Audit Log Writes**
  ```bash
  # Verify audit logs still writing (HIPAA compliance)
  psql $DATABASE_URL -c "
    SELECT COUNT(*)
    FROM audit_logs
    WHERE timestamp >= NOW() - INTERVAL '15 minutes';
  "
  # Should be > 0
  ```

- [ ] **Resource Utilization**
  - CPU: <70% ✅
  - Memory: <80% ✅
  - Disk: <80% ✅
  - Database connections: <80% of pool ✅

---

### 3.3 Post-Deployment Communication (After verification complete)

- [ ] **Update Slack #deployments**
  ```
  ✅ Production Deployment Complete

  **Version:** [commit hash or version]
  **Duration:** 12 minutes
  **Status:** Successful - all checks passing
  **Issues:** None

  Monitoring for next 30 minutes.
  ```

- [ ] **Update Status Page (if maintenance window created)**
  - https://manage.statuspage.io/
  - Resolve maintenance window: "Maintenance complete, all systems operational"

- [ ] **Notify Stakeholders (High-Risk Deployments)**
  - Email CTO/CEO: "Production deployment successful, monitoring closely"

---

### 3.4 Deployment Sign-Off (1 hour after deployment)

- [ ] **Final Health Check**
  ```bash
  curl https://api.holilabs.xyz/api/health/metrics | jq .
  # Review all metrics - should be normal
  ```

- [ ] **No Incidents**
  - PagerDuty: No alerts triggered
  - Slack #alerts: No alerts
  - Customer support: No unusual ticket volume

- [ ] **Deployment Documentation**
  - [ ] Update deployment log (Notion/Confluence)
  - [ ] Document any issues encountered (for future reference)
  - [ ] Close related Jira/Linear tickets

- [ ] **Tag Release (Optional but Recommended)**
  ```bash
  git tag -a v1.2.3 -m "Release 1.2.3 - Patient search improvements"
  git push origin v1.2.3
  ```

**Deployment Complete!** 🎉

---

## 4. Rollback Procedures

### 4.1 When to Rollback

**Rollback Immediately If:**
- ❌ Error rate >5% for >5 minutes
- ❌ Critical feature broken (auth, patient records)
- ❌ Performance degraded significantly (p95 >2000ms)
- ❌ Database data corruption detected
- ❌ Security vulnerability introduced

**Consider Rollback If:**
- ⚠️ Error rate >2% for >15 minutes
- ⚠️ New error types in Sentry (high volume)
- ⚠️ User reports of issues
- ⚠️ Metrics trending in wrong direction

**Don't Rollback If:**
- ✅ Minor cosmetic issues
- ✅ Error rate <2% (within normal range)
- ✅ Issue can be hotfixed quickly (<30 minutes)

---

### 4.2 Rollback Process (Fast Rollback)

**Goal:** Restore service to previous stable state within 10 minutes

#### Option 1: Rollback via CI/CD (Recommended)

```bash
# 1. Revert the merge commit
git revert [merge-commit-hash] -m 1
git push origin main

# 2. This triggers CI/CD to deploy previous version
# Monitor GitHub Actions workflow

# 3. Verify rollback successful
curl https://api.holilabs.xyz/api/health | jq .version
```

#### Option 2: Manual Rollback (Faster)

```bash
# 1. SSH to production servers
ssh user@production-server

# 2. Identify previous Docker image
docker images | grep holi-web | head -5
# Example: holi-web:abc123def (current) <- rollback from this
#          holi-web:xyz789abc (previous) <- rollback to this

# 3. Update docker-compose to use previous image
# Edit docker-compose.prod.yml:
# image: registry.holilabs.xyz/holi-web:xyz789abc

# 4. Rolling restart with previous image
docker-compose -f docker-compose.prod.yml up -d --no-deps web-1
sleep 30
curl http://localhost:3000/api/health

docker-compose -f docker-compose.prod.yml up -d --no-deps web-2
sleep 30
curl http://localhost:3000/api/health

# 5. Verify rollback
curl https://api.holilabs.xyz/api/health | jq .
```

---

#### Step 2: Verify Rollback Successful

- [ ] **Health checks passing**
- [ ] **Error rate back to normal (<1%)**
- [ ] **Latency back to normal (<500ms p95)**
- [ ] **Key features working**
- [ ] **No new errors in Sentry**

---

#### Step 3: Communicate Rollback

- [ ] **Update Slack #deployments**
  ```
  ⚠️ Deployment Rolled Back

  **Reason:** [e.g., "High error rate (8%) detected 10 minutes after deployment"]
  **Rollback Time:** [Time - e.g., 10:45 AM]
  **Current Status:** Service restored to previous version
  **Impact:** [e.g., "Users experienced errors for ~15 minutes"]

  **Next Steps:**
  - [ ] Root cause investigation
  - [ ] Fix issue
  - [ ] Re-deploy (after fix verified in staging)
  ```

- [ ] **Create Incident Report**
  - Document timeline
  - Document root cause (once identified)
  - Create action items to prevent recurrence

---

### 4.3 Database Rollback (High Risk)

**WARNING:** Database rollbacks are complex and risky. Only perform with CTO/DevOps Lead approval.

**Cannot Rollback If:**
- Destructive migration (DROP column, DROP table)
- Data already modified by new code
- Migration applied >1 hour ago (data may be inconsistent)

**Can Rollback If:**
- Additive migration (ADD column, CREATE index)
- Migration just applied (<15 minutes ago)
- No data written yet

**Rollback Process:**
```bash
# 1. Stop application (prevent writes)
docker-compose -f docker-compose.prod.yml stop web

# 2. Revert migration
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
npx prisma migrate resolve --rolled-back [migration-name]

# 3. Run down migration (if exists)
# Manual SQL execution may be required

# 4. Verify database state
psql $DATABASE_URL -c "\d patients"  # Verify schema

# 5. Restart application with previous code version
# (Use rollback process from Section 4.2)

# 6. Verify application health
curl https://api.holilabs.xyz/api/health
```

---

## 5. Emergency Hotfix Process

### 5.1 When to Use Emergency Hotfix

**Use Emergency Hotfix Process For:**
- Critical production bugs affecting users
- Security vulnerabilities
- Data integrity issues

**Characteristics:**
- Bypasses normal review process (but not testing!)
- Can deploy off-hours
- Requires CTO or Tech Lead approval
- Limited scope (single bug fix, not multiple changes)

---

### 5.2 Emergency Hotfix Checklist

#### Step 1: Assess Urgency (5 minutes)

- [ ] **Is this truly an emergency?**
  - Users actively affected? (Yes = emergency)
  - Security vulnerability being exploited? (Yes = emergency)
  - Can wait until morning/business hours? (No = not emergency)

- [ ] **Get approval** (CTO or Tech Lead via phone/Slack)

---

#### Step 2: Create Hotfix Branch (10 minutes)

```bash
# 1. Create hotfix branch from production
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make MINIMAL fix (only fix the bug, nothing else)
# ... edit files ...

# 3. Write test for the bug (to prevent regression)
# ... create test file ...

# 4. Verify tests pass locally
pnpm test
pnpm build

# 5. Commit with descriptive message
git commit -m "hotfix: Fix critical authentication bypass bug

- Issue: Users could access other users' data via API
- Fix: Add proper authorization check in middleware
- Test: Added integration test to verify fix

Ref: SECURITY-123"

git push origin hotfix/critical-bug-fix
```

---

#### Step 3: Fast-Track Review (15 minutes)

- [ ] **Create Pull Request**
  - Title: `[HOTFIX] Critical authentication bypass bug`
  - Label: `hotfix`, `security`
  - Assign: CTO or Tech Lead

- [ ] **Code Review** (Single approver, expedited)
  - Focus on: Does this fix the bug without introducing new issues?
  - Not required: Nitpicks, style improvements

- [ ] **Automated Tests Pass**
  - CI/CD tests pass ✅

---

#### Step 4: Deploy Hotfix (15 minutes)

**Option A: Via CI/CD (Recommended)**
```bash
# Merge to main (triggers deployment)
git checkout main
git merge --no-ff hotfix/critical-bug-fix
git push origin main

# Monitor deployment (Section 2)
```

**Option B: Direct Deployment (Faster, Higher Risk)**
```bash
# Deploy directly from hotfix branch
# (Requires manual deployment process, Section 2.3)
```

---

#### Step 5: Verify Hotfix (10 minutes)

- [ ] **Bug Fixed**
  - Manually test the specific issue
  - Verify fix in production

- [ ] **No New Issues**
  - Sentry: No new errors
  - Health checks passing
  - Key features working

- [ ] **Monitor Closely**
  - Watch Grafana for 30-60 minutes
  - On-call engineer on standby

---

#### Step 6: Post-Hotfix Actions (Next Day)

- [ ] **Post-Mortem** (Required for security hotfixes)
  - What was the bug?
  - How did it get to production?
  - How do we prevent this class of bug?

- [ ] **Backport to Main** (if deployed from hotfix branch)
  ```bash
  git checkout main
  git merge hotfix/critical-bug-fix
  git push origin main
  ```

- [ ] **Communicate to Team**
  - Slack #engineering: Summary of hotfix
  - What to watch for (potential side effects)

---

## 6. Database Migration Checklist

### 6.1 Pre-Migration Preparation

- [ ] **Test Migration in Staging**
  ```bash
  # Deploy migration to staging first
  npx prisma migrate deploy --preview-feature
  ```

- [ ] **Verify Migration Reversibility**
  - Can this migration be rolled back?
  - Do we have a down migration?
  - Are there data changes that can't be undone?

- [ ] **Estimate Migration Duration**
  ```bash
  # Test migration on staging (similar data volume)
  time npx prisma migrate deploy
  ```
  - If <5 minutes: Safe to run during business hours
  - If >5 minutes: Run off-hours (risk of connection timeouts)

- [ ] **Backup Database**
  ```bash
  # Create manual backup before migration
  pg_dump $DATABASE_URL --format=custom > pre-migration-backup-$(date +%Y%m%d).dump

  # Upload to S3 for safety
  aws s3 cp pre-migration-backup-*.dump s3://holi-database-backups/manual-backups/
  ```

---

### 6.2 Safe Migration Patterns

**✅ SAFE Migrations (Low Risk):**
- Add new column (with default value)
- Add new table
- Add new index (CREATE INDEX CONCURRENTLY)
- Rename column (with old column alias for compatibility)

**⚠️ RISKY Migrations (Medium Risk):**
- Add NOT NULL constraint to existing column
- Change column type
- Rename column (without alias)
- Add UNIQUE constraint

**❌ DANGEROUS Migrations (High Risk - Require CTO Approval):**
- Drop column
- Drop table
- Remove NOT NULL constraint (if data depends on it)
- Change foreign key constraints

---

### 6.3 Migration Deployment Process

#### Step 1: Deploy Code BEFORE Migration (If Possible)

**Pattern:** Make code backward-compatible with old schema

```bash
# Example: Adding new column "phone_number"

# Step 1: Deploy code that can handle both old and new schema
# - Code writes to both old field ("phone") and new field ("phone_number")
# - Code reads from new field, falls back to old field

# Step 2: Deploy migration (adds column)
npx prisma migrate deploy

# Step 3: Backfill data (populate new column from old column)
npx prisma db seed -- --backfill-phone-numbers

# Step 4: Deploy code that only uses new field
# - Code writes only to new field
# - Code reads only from new field

# Step 5: Drop old column (in future migration, after verification)
```

---

#### Step 2: Run Migration

```bash
# 1. Put application in maintenance mode (ONLY if migration >5 minutes)
# https://manage.statuspage.io/ - Create maintenance window

# 2. Run migration
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy

# 3. Verify migration applied
psql $DATABASE_URL -c "
  SELECT * FROM _prisma_migrations
  ORDER BY applied_steps_count DESC
  LIMIT 1;
"

# 4. Verify data integrity
# Run custom verification queries (e.g., check row counts, field types)
```

---

#### Step 3: Post-Migration Verification

- [ ] **Application Connects Successfully**
  ```bash
  curl https://api.holilabs.xyz/api/health | jq .database
  # Expected: "connected": true
  ```

- [ ] **Key Queries Work**
  ```bash
  # Test patient record retrieval
  psql $DATABASE_URL -c "SELECT * FROM \"Patient\" LIMIT 1;"
  ```

- [ ] **No Missing Data**
  ```bash
  # Verify row counts match pre-migration
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Patient\";"
  # Compare to pre-migration count
  ```

---

## 7. Deployment Schedule

### 7.1 Recommended Deployment Windows

| Risk Level | Recommended Time | On-Call Required | Approval Required |
|------------|------------------|------------------|-------------------|
| **Low Risk** | Mon-Thu, 9am-5pm | No | Tech Lead |
| **Medium Risk** | Mon-Thu, Before 9am or After 6pm | Yes (standby) | Tech Lead |
| **High Risk** | Tue-Thu, 6am-8am | Yes (active) | CTO |
| **Emergency** | Anytime | Yes (active) | CTO or Tech Lead |

**Avoid:**
- ❌ Friday afternoons (no time to fix if issues arise)
- ❌ Friday evenings / Weekends (team unavailable)
- ❌ Before holidays (team unavailable)
- ❌ During known high-traffic periods (e.g., Monday mornings)

---

### 7.2 Deployment Frequency

**Current Cadence:** Deploy when ready (continuous deployment)

**Target Cadence:**
- Small changes: Daily (if low risk)
- Feature releases: Weekly
- Major changes: Bi-weekly

**Batching Consideration:**
- Don't batch too many changes (harder to identify issue if rollback needed)
- Don't deploy too frequently (alert fatigue, monitoring overhead)

---

## 8. Deployment Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Developer** | Code review, testing, merge PR, monitor deployment |
| **Tech Lead** | Approve PR, approve deployment, available for escalation |
| **DevOps Lead** | Infrastructure changes, CI/CD maintenance, deployment process |
| **On-Call Engineer** | Standby during deployment, respond if issues arise |
| **CTO** | Approve high-risk deployments, incident escalation point |
| **Security Lead** | Review security-critical changes, approve security patches |

---

## 9. Deployment Metrics (Track and Improve)

**Key Metrics:**
- **Deployment Frequency:** Target >1 per week
- **Lead Time:** Time from commit to production (target <1 hour for CI/CD)
- **Deployment Success Rate:** Target >95%
- **Rollback Rate:** Target <5%
- **Mean Time to Recovery (MTTR):** Time to rollback if issues (target <10 minutes)

**Review Quarterly:** Identify bottlenecks, improve process

---

## 10. Deployment Troubleshooting

### Common Issues and Solutions

**Issue: CI/CD pipeline fails at build step**
```bash
# Solution: Check build logs, usually TypeScript or ESLint errors
# Fix errors locally, push fix
```

**Issue: Docker image fails to start**
```bash
# Solution: Check Docker logs
docker logs holi-web-1 --tail 100
# Usually missing environment variable or dependency issue
```

**Issue: Health checks fail after deployment**
```bash
# Solution: Check health endpoint logs, likely database connection issue
# Rollback immediately
```

**Issue: Database migration fails**
```bash
# Solution: Check migration logs
# If migration partially applied, may need manual intervention
# Escalate to DevOps Lead immediately
```

---

## Document Control

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-01 | Initial release |

**Review Schedule:** Quarterly

**Next Review:** 2026-04-01

---

**END OF DEPLOYMENT CHECKLIST**

For questions or suggestions, contact: devops@holilabs.xyz
