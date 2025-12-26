# Holi Labs - Production Deployment Runbook

Comprehensive runbook for safely deploying the FHIR integration to production with zero-downtime rollout.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

### 1-Week Before Deployment

- [ ] **Code Freeze**: Merge all features into `main` branch
- [ ] **Security Audit**: Run security scan (`pnpm audit`, `trivy scan`)
- [ ] **Dependency Updates**: Ensure all dependencies are up-to-date
- [ ] **Load Testing**: Run stress tests to validate performance under load
- [ ] **Disaster Recovery Plan**: Document rollback procedures
- [ ] **Stakeholder Communication**: Notify all stakeholders of deployment window

### 24 Hours Before Deployment

- [ ] **Database Backup**: Take full database backup
  ```bash
  pg_dump $DATABASE_URL | gzip > db_backup_$(date +%Y%m%d).sql.gz
  ```

- [ ] **Medplum Credentials**: Verify Medplum API credentials are valid
  ```bash
  curl -X POST ${MEDPLUM_BASE_URL}/oauth2/token \
    -d "grant_type=client_credentials" \
    -d "client_id=${MEDPLUM_CLIENT_ID}" \
    -d "client_secret=${MEDPLUM_CLIENT_SECRET}"
  ```

- [ ] **Redis Snapshot**: Create Redis snapshot
  ```bash
  redis-cli -u $REDIS_URL BGSAVE
  ```

- [ ] **Environment Variables**: Verify all production environment variables are set
  ```bash
  # Required variables
  echo $DATABASE_URL
  echo $REDIS_URL
  echo $JWT_SECRET
  echo $MEDPLUM_BASE_URL
  echo $MEDPLUM_CLIENT_ID
  # Should all return non-empty values
  ```

- [ ] **DNS Configuration**: Verify DNS records are correct
  ```bash
  nslookup api.holilabs.xyz
  nslookup app.holilabs.xyz
  ```

- [ ] **SSL Certificates**: Verify SSL certificates are valid (>30 days remaining)
  ```bash
  echo | openssl s_client -servername api.holilabs.xyz -connect api.holilabs.xyz:443 2>/dev/null | \
    openssl x509 -noout -dates
  ```

- [ ] **PagerDuty Setup**: Verify PagerDuty integration keys are configured
  ```bash
  # Test PagerDuty alert
  curl -X POST https://events.pagerduty.com/v2/enqueue \
    -H "Content-Type: application/json" \
    -d '{"routing_key": "'"$PAGERDUTY_SERVICE_KEY_CRITICAL"'", "event_action": "trigger", "payload": {"summary": "Test alert", "severity": "info", "source": "test"}}'
  ```

- [ ] **Slack Webhooks**: Verify Slack webhook URLs work
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text": "Deployment starting in 24 hours"}'
  ```

- [ ] **Team Availability**: Confirm on-call engineer is available during deployment

### 1 Hour Before Deployment

- [ ] **Final Git Pull**: Pull latest code from `main` branch
  ```bash
  git checkout main
  git pull origin main
  git log --oneline -5  # Verify latest commits
  ```

- [ ] **Build Test**: Test Docker build locally
  ```bash
  docker build -t holilabs/api:test -f apps/api/Dockerfile .
  ```

- [ ] **Integration Tests**: Run full integration test suite
  ```bash
  cd apps/api
  pnpm test:integration
  ```

- [ ] **Smoke Tests**: Run smoke tests against staging
  ```bash
  cd demos
  API_BASE_URL=https://api-staging.holilabs.xyz ./smoke-tests.sh --quick
  ```

- [ ] **Monitoring Check**: Verify Prometheus and Grafana are operational
  ```bash
  curl -f http://prometheus.holilabs.xyz/-/healthy
  curl -f http://grafana.holilabs.xyz/api/health
  ```

- [ ] **Queue Drain**: Drain BullMQ queue (optional for critical deployments)
  ```bash
  curl -X POST http://localhost:3000/admin/queue/pause
  # Wait for active jobs to complete
  watch -n 5 'curl -s http://localhost:3000/metrics | grep "holi_queue_jobs_active"'
  ```

- [ ] **Maintenance Mode**: Enable maintenance mode (optional)
  ```bash
  # Add maintenance page to nginx
  cp nginx/maintenance.html nginx/active.html
  ```

- [ ] **Announce Deployment**: Send final deployment notification
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text": ":rocket: Production deployment starting NOW", "channel": "#engineering"}'
  ```

---

## Deployment Steps

### Step 1: Database Migrations

**Duration**: 2-5 minutes
**Risk**: Medium

```bash
# Connect to production database
export DATABASE_URL="postgresql://user:pass@prod-db:5432/holi_protocol"

# Run migrations (dry-run first)
cd apps/api
pnpm prisma migrate deploy --preview-feature

# If preview looks good, run actual migration
pnpm prisma migrate deploy
```

**Rollback**: Database migrations are irreversible. Ensure you have a backup before proceeding.

**Validation**:
```bash
# Check migration status
pnpm prisma migrate status

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### Step 2: Build & Tag Docker Images

**Duration**: 5-10 minutes
**Risk**: Low

```bash
# Set version tag
export DEPLOY_VERSION=$(git rev-parse --short HEAD)
export DEPLOY_TAG="${DEPLOY_VERSION}_$(date +%Y%m%d_%H%M%S)"

# Build API image
docker build -t holilabs/api:${DEPLOY_TAG} -f apps/api/Dockerfile .
docker tag holilabs/api:${DEPLOY_TAG} holilabs/api:latest

# Push to registry (if using one)
docker push holilabs/api:${DEPLOY_TAG}
docker push holilabs/api:latest
```

**Validation**:
```bash
# Verify image built correctly
docker run --rm holilabs/api:${DEPLOY_TAG} node --version

# Check image size (should be < 500MB)
docker images holilabs/api:${DEPLOY_TAG} --format "{{.Size}}"
```

### Step 3: Deploy New Version

**Duration**: 2-3 minutes
**Risk**: High

#### Option A: Docker Compose

```bash
# Pull latest images
cd $PROJECT_ROOT
docker-compose -f docker-compose.prod.yml pull

# Stop old containers (brief downtime)
docker-compose -f docker-compose.prod.yml down

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Or for zero-downtime rolling restart:
docker-compose -f docker-compose.prod.yml up -d --no-deps --build holi-api
```

#### Option B: Kubernetes

```bash
# Apply new deployment
kubectl set image deployment/holi-api \
  holi-api=holilabs/api:${DEPLOY_TAG}

# Wait for rollout
kubectl rollout status deployment/holi-api --timeout=5m
```

#### Option C: DigitalOcean App Platform

```bash
# Trigger deployment
doctl apps create-deployment $DIGITALOCEAN_APP_ID --wait
```

**Validation**:
```bash
# Check containers are running
docker ps | grep holi-api

# Check logs for errors
docker logs holi-api-prod --tail 50
```

### Step 4: Health Checks

**Duration**: 1-2 minutes
**Risk**: Critical

```bash
# Wait for API to be healthy
for i in {1..30}; do
  if curl -sf https://api.holilabs.xyz/health > /dev/null; then
    echo "API is healthy"
    break
  fi
  echo "Waiting for API... (attempt $i/30)"
  sleep 5
done

# Check all health endpoints
curl -s https://api.holilabs.xyz/health | jq '.'
curl -s https://api.holilabs.xyz/health/ready | jq '.'
curl -s https://api.holilabs.xyz/health/live | jq '.'
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "medplum": "healthy",
    "fhir_sync": "healthy"
  }
}
```

**If Health Check Fails**: Immediately proceed to [Rollback Procedures](#rollback-procedures)

### Step 5: Smoke Tests

**Duration**: 2-3 minutes
**Risk**: Medium

```bash
# Run automated smoke tests
cd demos
API_BASE_URL=https://api.holilabs.xyz ./smoke-tests.sh --quick --env production
```

**Expected Output**:
```
Total Tests: 25
Passed: 25
Failed: 0
Pass Rate: 100%
```

**If Smoke Tests Fail**: Proceed to [Rollback Procedures](#rollback-procedures)

### Step 6: Resume Queue Processing

**Duration**: < 1 minute
**Risk**: Low

```bash
# Resume BullMQ queue (if paused)
curl -X POST https://api.holilabs.xyz/admin/queue/resume

# Verify queue is processing
curl -s https://api.holilabs.xyz/metrics | grep "holi_queue_jobs_active"
```

### Step 7: Monitoring Validation

**Duration**: 5 minutes (observation period)
**Risk**: Low

```bash
# Check Prometheus is scraping
curl -s https://prometheus.holilabs.xyz/api/v1/targets | \
  jq '.data.activeTargets[] | select(.labels.job=="holi-api") | .health'

# Expected: "up"

# Open Grafana dashboard
open https://grafana.holilabs.xyz/d/fhir-monitoring
```

**Watch for 5 minutes**:
- [ ] API request rate is normal
- [ ] Error rate < 1%
- [ ] P95 latency < 300ms
- [ ] Queue jobs processing successfully
- [ ] No P1/P2 alerts firing

### Step 8: Production Validation

**Duration**: 10-15 minutes
**Risk**: Low

#### Manual Testing

1. **Patient Creation**:
   ```bash
   curl -X POST https://api.holilabs.xyz/patients/tokens \
     -H "Content-Type: application/json" \
     -H "X-Org-Id: org_prod_test" \
     -d '{"orgId": "org_prod_test", "encryptedData": {...}}'
   ```

2. **FHIR Sync Verification**:
   - Wait 60 seconds
   - Check patient synced to Medplum
   - Verify `last_synced_at` timestamp is recent

3. **FHIR Export**:
   ```bash
   curl -X GET "https://api.holilabs.xyz/fhir/export/patient/{patientTokenId}/\$everything" \
     -H "X-User-Id: user_admin" \
     -H "X-User-Role: ADMIN"
   ```

4. **Audit Trail**:
   ```bash
   curl https://api.holilabs.xyz/admin/audit/events | jq '.data | length'
   # Should show recent events
   ```

#### Metrics Validation

```bash
# Check key metrics
curl -s https://api.holilabs.xyz/metrics | grep "holi_fhir_sync_operations_total"
curl -s https://api.holilabs.xyz/metrics | grep "holi_queue_jobs_failed"
curl -s https://api.holilabs.xyz/metrics | grep "holi_hipaa_audit_events_total"
```

**Success Criteria**:
- [ ] FHIR sync operations > 0 (if tested)
- [ ] Queue failed jobs = 0
- [ ] Audit events logged
- [ ] No errors in logs

### Step 9: Remove Maintenance Mode

**Duration**: < 1 minute
**Risk**: Low

```bash
# Remove maintenance page
rm nginx/active.html

# Reload nginx
docker exec holi-nginx-prod nginx -s reload
```

### Step 10: Announce Completion

**Duration**: < 1 minute
**Risk**: None

```bash
# Send success notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "text": ":white_check_mark: Production deployment completed successfully!",
    "channel": "#engineering",
    "attachments": [{
      "color": "good",
      "fields": [
        {"title": "Version", "value": "'"$DEPLOY_TAG"'", "short": true},
        {"title": "Duration", "value": "X minutes", "short": true},
        {"title": "Tests", "value": "25/25 passed", "short": true},
        {"title": "Status", "value": "All systems operational", "short": true}
      ]
    }]
  }'
```

---

## Post-Deployment Validation

### First 15 Minutes

Monitor actively for issues:

```bash
# Watch logs in real-time
docker logs -f holi-api-prod

# Watch metrics
watch -n 5 'curl -s https://api.holilabs.xyz/metrics | grep "holi_http_requests_total"'

# Watch Grafana dashboard
open https://grafana.holilabs.xyz/d/fhir-monitoring
```

**Red Flags** (immediate rollback if any occur):
- Error rate > 5%
- P95 latency > 1s
- P1/P2 alerts firing
- Database connection errors
- Medplum sync failures (>10% error rate)

### First Hour

- [ ] **Error Logs**: Review logs for any errors
  ```bash
  docker logs holi-api-prod --since 1h | grep ERROR
  ```

- [ ] **Sync Drift**: Check for sync drift
  ```bash
  curl -s https://api.holilabs.xyz/metrics | grep "holi_fhir_sync_stale"
  # Should be 0 for all resource types
  ```

- [ ] **Queue Health**: Verify queue is processing
  ```bash
  curl -s https://api.holilabs.xyz/admin/queue/stats | jq '.'
  ```

- [ ] **Audit Trail**: Verify audit events are logging
  ```bash
  curl -s https://api.holilabs.xyz/admin/audit/events?since=1h | jq '.data | length'
  # Should be > 0
  ```

### First 24 Hours

- [ ] **Reconciliation Job**: Verify nightly reconciliation ran successfully
  ```bash
  curl -s https://api.holilabs.xyz/metrics | grep "holi_fhir_reconciliation_last_run"
  ```

- [ ] **Audit Mirror**: Verify bidirectional audit mirroring is working
  ```bash
  curl -s https://api.holilabs.xyz/fhir/admin/audit-mirror/stats | jq '.'
  ```

- [ ] **Performance**: Check P95/P99 latencies are within SLA
  - P95 < 300ms
  - P99 < 500ms

- [ ] **Uptime**: Verify >99.9% uptime
  ```bash
  # Check Prometheus uptime metric
  curl -s 'https://prometheus.holilabs.xyz/api/v1/query?query=up{job="holi-api"}' | jq '.'
  ```

### First Week

- [ ] **Post-Mortem**: Conduct post-deployment review meeting
- [ ] **Documentation**: Update runbook with lessons learned
- [ ] **Alerts**: Review alert thresholds and adjust if needed
- [ ] **Capacity Planning**: Review resource utilization, plan scaling if needed

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Health checks fail after 5 minutes
- Smoke tests fail
- Error rate > 5% for more than 2 minutes
- P1 alert fires (API down, database failure, HIPAA breach)
- Critical functionality is broken

### Rollback Steps

#### Option A: Automated Rollback Script

```bash
# Run automated rollback
cd infra/deploy
./deploy-production.sh --rollback
```

#### Option B: Manual Rollback (Docker Compose)

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Pull previous image version
docker pull holilabs/api:${PREVIOUS_TAG}
docker tag holilabs/api:${PREVIOUS_TAG} holilabs/api:latest

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Wait for health
for i in {1..30}; do
  if curl -sf https://api.holilabs.xyz/health > /dev/null; then
    echo "Rollback successful"
    break
  fi
  sleep 5
done
```

#### Option C: Manual Rollback (Kubernetes)

```bash
# Rollback to previous revision
kubectl rollout undo deployment/holi-api

# Wait for rollout
kubectl rollout status deployment/holi-api --timeout=5m

# Verify health
kubectl get pods -l app=holi-api
```

### Database Rollback

**WARNING**: Database rollbacks are complex and risky. Only perform if absolutely necessary.

```bash
# Restore database from backup
gunzip -c /backups/database_YYYYMMDD.sql.gz | psql $DATABASE_URL

# Run reverse migrations (if available)
cd apps/api
pnpm prisma migrate resolve --rolled-back <migration-name>
```

### Post-Rollback

1. **Verify Service**: Run smoke tests to confirm rollback success
2. **Investigate Issue**: Review logs, metrics to identify root cause
3. **Fix Forward**: Prepare hotfix for re-deployment
4. **Communicate**: Notify stakeholders of rollback and plan

---

## Troubleshooting

### Issue: API Not Responding

**Symptoms**: `curl https://api.holilabs.xyz/health` times out

**Diagnosis**:
```bash
# Check if container is running
docker ps | grep holi-api

# Check container logs
docker logs holi-api-prod --tail 100

# Check resource usage
docker stats holi-api-prod
```

**Common Causes**:
1. **OOM Kill**: Container killed due to memory limit
   - Solution: Increase memory limit in docker-compose.yml
2. **Port Conflict**: Port 3000 already in use
   - Solution: Kill process using port or change API port
3. **Database Connection**: Cannot connect to database
   - Solution: Verify DATABASE_URL, check database is running

**Resolution**:
```bash
# Restart container
docker restart holi-api-prod

# If that doesn't work, full restart
docker-compose -f docker-compose.prod.yml restart holi-api
```

### Issue: Medplum Sync Failing

**Symptoms**: `holi_fhir_sync_operations_total{status="failure"}` increasing

**Diagnosis**:
```bash
# Check sync errors
curl -s https://api.holilabs.xyz/admin/queue/failed | jq '.jobs[0]'

# Check Medplum connectivity
curl -f ${MEDPLUM_BASE_URL}/healthcheck
```

**Common Causes**:
1. **Invalid Credentials**: Medplum auth token expired
   - Solution: Refresh credentials, update environment variables
2. **Network Issue**: Cannot reach Medplum server
   - Solution: Check firewall rules, DNS resolution
3. **Rate Limiting**: Too many requests to Medplum
   - Solution: Reduce queue concurrency, implement backoff

**Resolution**:
```bash
# Retry failed jobs
curl -X POST https://api.holilabs.xyz/admin/queue/retry-failed

# Check queue stats
curl https://api.holilabs.xyz/admin/queue/stats | jq '.'
```

### Issue: High Error Rate

**Symptoms**: Error rate > 5% in Grafana dashboard

**Diagnosis**:
```bash
# Check recent errors
docker logs holi-api-prod --since 10m | grep ERROR | tail -20

# Check error distribution
curl -s https://api.holilabs.xyz/metrics | grep "holi_http_request_errors_total"
```

**Common Causes**:
1. **Database Deadlock**: Concurrent transactions causing deadlocks
   - Solution: Review slow queries, add indexes
2. **Redis Connection Pool**: Exhausted connection pool
   - Solution: Increase pool size, check for connection leaks
3. **External API Timeout**: Medplum or other external APIs timing out
   - Solution: Increase timeout, add circuit breaker

**Resolution**:
- Review specific error types and address root cause
- Scale horizontally if CPU/memory constrained

### Issue: Queue Backlog

**Symptoms**: `holi_queue_jobs_waiting` increasing, not decreasing

**Diagnosis**:
```bash
# Check queue stats
curl -s https://api.holilabs.xyz/admin/queue/stats | jq '{waiting: .waiting, active: .active, workers: .workers}'

# Check worker CPU usage
docker stats holi-api-prod
```

**Common Causes**:
1. **Slow Job Processing**: Jobs taking too long
   - Solution: Optimize sync logic, increase timeout
2. **Too Few Workers**: Not enough concurrency
   - Solution: Increase QUEUE_CONCURRENCY env var
3. **Stuck Jobs**: Jobs stuck in active state
   - Solution: Manually fail stuck jobs, restart workers

**Resolution**:
```bash
# Increase worker concurrency (requires restart)
export QUEUE_CONCURRENCY=10
docker-compose -f docker-compose.prod.yml restart holi-api

# Or manually process backlog
curl -X POST https://api.holilabs.xyz/admin/queue/resume
```

---

## Emergency Contacts

### On-Call Rotation

| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| Platform Lead | [Name] | [Name] | +1-XXX-XXX-XXXX |
| Backend Lead | [Name] | [Name] | +1-XXX-XXX-XXXX |
| DevOps Engineer | [Name] | [Name] | +1-XXX-XXX-XXXX |
| CISO (HIPAA) | [Name] | [Name] | +1-XXX-XXX-XXXX |

### Escalation Policy

1. **P1 Alert** (API down, data breach): Page Primary + Secondary immediately
2. **P2 Alert** (degraded performance): Page Primary, escalate to Secondary after 15 min
3. **P3 Alert** (warnings): Slack notification, no page
4. **P4 Alert** (info): Slack notification only

### Communication Channels

- **Slack**: `#incidents` (all incidents), `#engineering` (general)
- **PagerDuty**: https://holilabs.pagerduty.com
- **Status Page**: https://status.holilabs.xyz
- **Email**: engineering@holilabs.xyz

### External Vendors

| Vendor | Support Contact | SLA |
|--------|----------------|-----|
| Medplum | support@medplum.com | 24/7, 1-hour response |
| DigitalOcean | Support ticket | 24/7, 1-hour response |
| PagerDuty | support@pagerduty.com | 24/7, 4-hour response |

---

## Appendix: Deployment Checklist (Print Copy)

```
HOLI LABS - PRODUCTION DEPLOYMENT CHECKLIST
Date: ___________  Deployer: ___________  Version: ___________

PRE-DEPLOYMENT:
[ ] Database backup taken
[ ] Redis snapshot created
[ ] Medplum credentials verified
[ ] Environment variables set
[ ] SSL certificates valid
[ ] Team notified

DEPLOYMENT:
[ ] Migrations applied
[ ] Docker images built
[ ] New version deployed
[ ] Health checks passed (5 min)
[ ] Smoke tests passed
[ ] Queue resumed
[ ] Monitoring validated

POST-DEPLOYMENT (15 min):
[ ] Error rate < 1%
[ ] P95 latency < 300ms
[ ] No P1/P2 alerts
[ ] Logs reviewed

POST-DEPLOYMENT (1 hour):
[ ] Sync drift = 0
[ ] Queue processing normally
[ ] Audit trail working

ROLLBACK (IF NEEDED):
[ ] Rollback executed
[ ] Service restored
[ ] Issue documented
[ ] Hotfix planned

COMPLETION:
[ ] Success notification sent
[ ] Documentation updated
[ ] Post-mortem scheduled (if issues)

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## License

Copyright © 2024 Holi Labs. All rights reserved.
