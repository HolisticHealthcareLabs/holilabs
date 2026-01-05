# Incident Runbook: API Server Down

**Severity**: P1 (Critical)
**Alert Name**: `APIServerDown`
**Alert Trigger**: API health check fails for >2 minutes
**PagerDuty**: Auto-pages on-call engineer
**Expected Response Time**: <5 minutes

---

## Overview

The API server is not responding to health checks at `/api/health`. This means patients cannot access the portal, clinicians cannot view patient records, and critical healthcare workflows are blocked.

**Patient Impact**: HIGH - All API-dependent features unavailable

---

## Immediate Actions (0-5 minutes)

### 1. Acknowledge Alert
- [ ] Acknowledge PagerDuty alert immediately
- [ ] Post in Slack `#incidents`: "Investigating API server down"
- [ ] Check status page: https://status.holilabs.xyz

### 2. Verify Scope
```bash
# Check if API is actually down (not just monitoring issue)
curl -v https://api.holilabs.xyz/api/health

# Check from different location (use phone hotspot if needed)
curl -v https://api.holilabs.xyz/api/health
```

**Decision Point**:
- ✅ API responds → False alarm, check monitoring config
- ❌ API down → Continue triage

### 3. Check Dashboard Metrics
Navigate to: Grafana dashboard

**Key Metrics** (last 15 minutes):
- [ ] CPU usage
- [ ] Memory usage
- [ ] Request rate
- [ ] Error rate
- [ ] Database connections

---

## Triage (5-15 minutes)

### Scenario A: Container/Process Crashed

**Symptoms**:
- No response from API
- Deployment platform shows app not running
- Logs show crash/OOM

**Resolution**:
```bash
# Check Docker containers
docker ps -a | grep holilabs

# View crash logs
docker logs holi-web --tail 100

# Restart containers
docker-compose up -d

# Check for OOM kills
dmesg | grep -i "out of memory"
```

**Timeline**: 5-10 minutes for restart

---

### Scenario B: Database Connection Failure

**Symptoms**:
- API returns 500 errors
- Logs show: "Prisma connection error", "ETIMEDOUT"
- Database metrics show 0 connections from API

**Steps**:
```bash
# Check database status
docker ps | grep postgres

# Test database connectivity
psql -h localhost -U holi -d holi_protocol -c "SELECT 1;"

# Check connection pool
# View in logs: "Prisma connection pool"
```

**Resolution**:
```bash
# If connection pool issue: Restart API (releases connections)
docker-compose restart web

# If database down: Restart database
docker-compose restart postgres
```

**Timeline**: 5-10 minutes

---

### Scenario C: Deployment Failure (Bad Code)

**Symptoms**:
- API went down immediately after deployment
- Logs show: "SyntaxError", "Cannot find module", "TypeError"
- Error rate spiked to 100%

**Resolution**:
```bash
# IMMEDIATE: Rollback to previous git commit
git log --oneline -5
git revert HEAD --no-commit
pnpm build
docker-compose up -d

# Or restore from backup
git checkout <last-good-commit>
pnpm build
docker-compose up -d
```

**Timeline**: 2-5 minutes

---

### Scenario D: High Traffic / Rate Limiting

**Symptoms**:
- API responding but very slow (>10s response times)
- Request rate 10x-100x normal
- Rate limiting logs showing many 429 responses

**Resolution**:
```bash
# Check request rate
docker logs holi-web | grep "429\|rate limit"

# Enable emergency rate limits if not active
# Restart with lower RATE_LIMIT_REQUESTS env var

# Scale horizontally if legitimate traffic
docker-compose up -d --scale web=3
```

**Timeline**: 10-20 minutes

---

### Scenario E: Redis Connection Failure

**Symptoms**:
- API errors: "Redis connection failed"
- Rate limiting not working
- Session management broken

**Resolution**:
```bash
# Check Redis status
docker ps | grep redis
redis-cli ping
# Expected: PONG

# Restart Redis if down
docker-compose restart redis

# API can run without Redis (degrades gracefully)
# Rate limiting falls back to memory
```

**Timeline**: 5 minutes

---

## Resolution Checklist

After fixing the issue:

- [ ] Verify API health check returns 200 OK
- [ ] Check error rate back to <1%
- [ ] Verify p95 latency back to <300ms
- [ ] Test critical user flows:
  - [ ] Patient can log in to portal
  - [ ] Clinician can view patient list
  - [ ] Can create/view SOAP note
- [ ] Post in Slack: "API server recovered"
- [ ] Close PagerDuty incident

---

## Communication Templates

### Initial Response (0-5 min)
```
🔴 INCIDENT: API Server Down
Severity: P1
Impact: All API-dependent features unavailable
ETA: Investigating, update in 10 minutes
```

### Resolution
```
✅ RESOLVED: API Server Down
Duration: XX minutes
Root Cause: [Brief explanation]
Fix: [What was done]
All services operational.
```

---

## Post-Incident (Within 24 Hours)

### 1. Create Post-Mortem
- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] Create action items to prevent recurrence

### 2. Update Runbook
- [ ] Add new scenario if encountered new failure mode
- [ ] Update resolution times
- [ ] Add new diagnostic commands

---

## Prevention Measures

### Monitoring
- API health check every 30 seconds
- Alert if 2 consecutive failures
- Test critical endpoints from multiple locations

### Deployment Safety
- Always deploy during low-traffic hours
- Automated rollback on high error rate (>5%)
- Pre-deployment smoke tests

### Auto-Recovery
- Container auto-restart on crash
- Connection retry logic with exponential backoff
- Circuit breakers for external dependencies

---

**Last Updated**: 2026-01-02
**Average Resolution Time**: Target <15 minutes
