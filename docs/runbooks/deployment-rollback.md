# Runbook: Deployment Rollback

**Severity:** High (P1) - When new deployment causes issues
**Expected Resolution Time:** 5-15 minutes
**On-Call Required:** Yes

---

## When to Rollback

### Immediate Rollback Triggers
- ✅ **Critical bug in production** (data loss, security vulnerability, complete feature failure)
- ✅ **Error rate spike** (>10% increase after deployment)
- ✅ **Performance degradation** (>50% slower response times)
- ✅ **Database migration failure** (data inconsistency, corruption)
- ✅ **User-facing functionality broken** (login, payment, appointment booking)

### Do NOT Rollback For
- ❌ Minor UI issues (typos, styling glitches) - fix forward instead
- ❌ Low-traffic feature bugs - fix forward
- ❌ Issues caught in staging/dev - prevent deployment instead

---

## Pre-Rollback Checklist

### 1. Assess Impact
```bash
# Check error rate
# Grafana: Compare error rate before/after deployment
# Sentry: Check new error count

# Check user impact
# How many users affected?
# Is it all users or specific subset?

# Check database state
# Was a database migration run?
# Can migration be safely reverted?
```

### 2. Decision Matrix

| Impact | Severity | Action |
|--------|----------|--------|
| All users can't login | Critical | **Immediate rollback** |
| Payment processing broken | Critical | **Immediate rollback** |
| Error rate >50% | Critical | **Immediate rollback** |
| Performance degraded 2x | High | Rollback |
| Minor feature broken | Medium | Fix forward |
| UI styling issue | Low | Fix forward |

---

## Rollback Procedures

### Method 1: DigitalOcean App Platform Rollback (Fastest - 2 minutes)

```bash
# 1. List recent deployments
doctl apps list-deployments <app-id>
# Output shows deployment IDs with timestamps

# Example output:
# ID                      Created At           Updated At
# abc123                  2024-01-07 10:30    2024-01-07 10:35  (Current - BROKEN)
# def456                  2024-01-07 09:00    2024-01-07 09:05  (Last known good)

# 2. Identify last known good deployment
# Find deployment before the problematic one

# 3. Rollback to previous deployment
doctl apps rollback <app-id> def456

# 4. Monitor rollback progress
watch -n 5 'doctl apps get <app-id> | grep "Active Deployment"'

# 5. Verify health
curl https://api.holilabs.xyz/api/health
```

**Advantages:**
- ✅ Fastest method (2-3 minutes)
- ✅ Instant rollback of code + environment
- ✅ No Git operations needed

**Limitations:**
- ⚠️ Doesn't revert database migrations (handle separately)

---

### Method 2: Git Revert + Redeploy (5-10 minutes)

```bash
# 1. Find the bad commit
git log --oneline -10
# Example:
# abc1234 (HEAD -> main) Fix: Update patient export logic  <- BAD COMMIT
# def5678 feat: Add MFA support                            <- LAST GOOD

# 2. Create revert commit
git revert abc1234
# Git will create a new commit that undoes abc1234

# 3. Push revert
git push origin main

# 4. Deploy will auto-trigger (if CI/CD configured)
# Or manually trigger:
doctl apps create-deployment <app-id>

# 5. Monitor deployment
doctl apps logs <app-id> --type=build --follow
```

**Advantages:**
- ✅ Maintains Git history
- ✅ Clear audit trail
- ✅ Can be reverted again if needed

**Limitations:**
- ⚠️ Slower than App Platform rollback
- ⚠️ Requires Git knowledge

---

### Method 3: Hard Reset + Force Push (Emergency Only - 3 minutes)

⚠️ **USE ONLY AS LAST RESORT** - Rewrites Git history

```bash
# 1. Find last known good commit
git log --oneline -10
# Identify: def5678 (last good)

# 2. Hard reset to that commit
git reset --hard def5678

# 3. Force push (⚠️ DANGEROUS - coordinate with team)
git push origin main --force

# 4. Trigger deployment
doctl apps create-deployment <app-id>
```

**When to use:**
- 🚨 Multiple bad commits that need to be undone
- 🚨 Sensitive data accidentally committed
- 🚨 Complete deployment failure

**Risks:**
- ❌ Rewrites Git history (breaks other developers' local branches)
- ❌ Can cause conflicts for team members
- ❌ Loses commit history

---

## Database Migration Rollback

### Check if Migration Needs Rollback

```bash
# 1. Check recent migrations
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT * FROM \"_prisma_migrations\"
  ORDER BY finished_at DESC
  LIMIT 5;
"

# 2. Identify migration from bad deployment
# Look for migration with timestamp matching deployment time
```

### Rollback Migration (Prisma)

```bash
# 1. Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# 2. Or manually rollback SQL changes
# If migration added column:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  ALTER TABLE \"Patient\" DROP COLUMN IF EXISTS new_column;
"

# If migration added table:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  DROP TABLE IF EXISTS new_table;
"

# 3. Mark migration as rolled back
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE \"_prisma_migrations\"
  SET rolled_back_at = NOW()
  WHERE migration_name = '<migration-name>';
"
```

### Migration Rollback Best Practices

```typescript
// Always make migrations reversible

// GOOD: Can be rolled back
await prisma.$executeRaw`ALTER TABLE "Patient" ADD COLUMN "email_verified" BOOLEAN DEFAULT false;`;
// Rollback: ALTER TABLE "Patient" DROP COLUMN "email_verified";

// BAD: Data loss on rollback
await prisma.$executeRaw`ALTER TABLE "Patient" DROP COLUMN "legacy_id";`;
// Rollback: Can't recover dropped data!

// BEST: Use multi-step migrations
// Step 1 (Deploy): Add new column (nullable)
// Step 2 (Deploy): Migrate data
// Step 3 (Deploy): Make column required
// Step 4 (Deploy): Drop old column
// Each step is independently rollback-safe
```

---

## Verification After Rollback

```bash
# 1. Check deployment status
doctl apps get <app-id>
# Status should be: "Active"

# 2. Test health endpoint
curl https://api.holilabs.xyz/api/health
# Expected: {"status":"ok","timestamp":"..."}

# 3. Test critical user flows

# Login
curl -X POST https://api.holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Patient list
curl https://api.holilabs.xyz/api/patients \
  -H "Authorization: Bearer <token>"

# Appointment booking
curl -X POST https://api.holilabs.xyz/api/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. Check error rate
# Grafana: Error rate should return to baseline (<1%)
# Sentry: New error count should drop to zero

# 5. Check performance
# Grafana: Response times should return to normal
# P95 latency <500ms

# 6. Monitor for 15 minutes
# Watch for any new issues
watch -n 30 'curl -s https://api.holilabs.xyz/api/health | jq .status'
```

---

## Post-Rollback Actions

### 1. Communicate with Team & Users

```markdown
## Rollback Notification

**Status:** Deployment rolled back to stable version
**Reason:** [Brief description of issue]
**User Impact:** [What users experienced]
**Resolution:** Rolled back to version def5678
**Current Status:** All systems operational

**Timeline:**
- 10:30 AM: Deployment started
- 10:35 AM: Issue detected
- 10:37 AM: Rollback initiated
- 10:40 AM: Rollback complete
- 10:45 AM: System verified healthy

**Next Steps:**
- [ ] Root cause analysis
- [ ] Fix issue in development
- [ ] Add tests to prevent recurrence
- [ ] Schedule re-deployment
```

### 2. Create Incident Report

```markdown
## Deployment Rollback Incident Report

**Date:** 2024-01-07
**Deployment ID:** abc1234
**Rollback To:** def5678
**Duration:** 15 minutes (downtime: 5 minutes)

### What Happened
[Detailed description of the issue]

### Root Cause
[Technical explanation of what went wrong]

### Why It Wasn't Caught
- [ ] Missing test coverage
- [ ] Staging environment differences
- [ ] Edge case not considered
- [ ] Database state dependency

### Preventive Measures
- [ ] Add test coverage for [specific scenario]
- [ ] Update staging environment to match production
- [ ] Add pre-deployment smoke tests
- [ ] Improve monitoring/alerts

### Action Items
- [ ] Fix the bug (Assigned to: [Name])
- [ ] Add regression test (Assigned to: [Name])
- [ ] Update deployment checklist (Assigned to: [Name])
- [ ] Schedule re-deployment (Target: [Date])
```

### 3. Fix the Issue

```bash
# 1. Create fix branch
git checkout -b fix/issue-from-rollback

# 2. Reproduce the issue locally
# Add test that fails

# 3. Fix the issue
# Implement fix

# 4. Verify fix with tests
npm test

# 5. Test in staging
git push origin fix/issue-from-rollback
# Deploy to staging
# Verify fix works

# 6. Create PR
gh pr create --title "Fix: [Issue description]" --body "Fixes issue that caused rollback"

# 7. Get approval and merge
# Wait for CI/CD
# Deploy to production

# 8. Monitor closely
# Watch for any issues in first 24 hours
```

---

## Prevention

### Pre-Deployment Checklist

```markdown
## Deployment Checklist

Before deploying to production, verify:

### Code Quality
- [ ] All tests passing (unit + integration + e2e)
- [ ] Code reviewed by at least 1 other developer
- [ ] No console.log or debug statements
- [ ] TypeScript compilation successful (0 errors)
- [ ] Linter passing (0 errors, minimal warnings)

### Testing
- [ ] Tested in development environment
- [ ] Tested in staging environment (matches production config)
- [ ] Smoke tests passed
- [ ] Load testing passed (if performance-critical changes)

### Database
- [ ] Migration tested in staging
- [ ] Migration is reversible (or multi-step)
- [ ] No data loss potential
- [ ] Backup taken before migration

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring configured (Prometheus)
- [ ] Alert thresholds updated (if needed)

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Database rollback procedure documented (if migration)
- [ ] On-call engineer identified
- [ ] Stakeholders notified of deployment window

### Communication
- [ ] Team notified in Slack
- [ ] Users notified if downtime expected
- [ ] Status page updated (if needed)
```

### Automated Rollback (Future Enhancement)

```yaml
# .github/workflows/auto-rollback.yml
name: Auto-Rollback on High Error Rate

on:
  deployment_status

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployment
        if: github.event.deployment_status.state == 'success'
        run: sleep 300  # Wait 5 minutes

      - name: Check error rate
        id: check_errors
        run: |
          # Query Prometheus/Grafana for error rate
          ERROR_RATE=$(curl -s "https://prometheus.holilabs.xyz/api/v1/query?query=rate(http_errors_total[5m])" | jq '.data.result[0].value[1]')

          if (( $(echo "$ERROR_RATE > 0.1" | bc -l) )); then
            echo "Error rate too high: $ERROR_RATE"
            echo "::set-output name=rollback::true"
          fi

      - name: Auto-rollback
        if: steps.check_errors.outputs.rollback == 'true'
        run: |
          doctl apps rollback ${{ secrets.APP_ID }} ${{ github.event.deployment.sha }}
          # Notify team
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"🚨 Auto-rollback triggered due to high error rate"}'
```

---

## Escalation

### Escalation Path
1. **0-5 min**: On-call engineer initiates rollback
2. **5-10 min**: Notify team lead if rollback fails
3. **10+ min**: Escalate to CTO if system still down

### Rollback Authority
- **On-call engineer**: Can rollback without approval (P0/P1 incidents)
- **Team lead**: Must approve hard reset --force
- **CTO**: Must approve database rollback affecting >1000 users

---

## Related Runbooks
- [API Server Down](./api-server-down.md)
- [Database Connection Failure](./database-connection-failure.md)
- [Performance Degradation](./performance-degradation.md)

---

## Changelog
- **2024-01-07**: Initial version created
