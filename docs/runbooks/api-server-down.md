# Runbook: API Server Down

**Severity:** Critical (P1)
**Expected Resolution Time:** 15-30 minutes
**On-Call Required:** Yes

---

## Symptoms

### What Users See
- 502 Bad Gateway errors
- 503 Service Unavailable errors
- Timeout errors when accessing the application
- Mobile app showing "Cannot connect to server"

### What Monitoring Shows
- Health check endpoint `/api/health` returning non-200 status or timing out
- Prometheus alert: `APIServerDown` firing
- Grafana dashboard showing 0 requests/second
- PagerDuty/Alertmanager notification received
- Sentry showing massive increase in network errors

---

## Immediate Actions (First 5 Minutes)

### 1. Acknowledge the Incident
```bash
# Update incident status
echo "Incident acknowledged by: $(whoami) at $(date)" >> /tmp/incident.log

# Post to Slack/Teams
# "🚨 P1: API server down. Investigating. ETA 15 minutes."
```

### 2. Verify the Issue
```bash
# Check if API is responding
curl -I https://api.holilabs.xyz/api/health
# Expected: Should timeout or return 502/503

# Check if it's a network issue or server issue
ping api.holilabs.xyz

# Check DNS resolution
nslookup api.holilabs.xyz
```

### 3. Check Server Status
```bash
# If using DigitalOcean App Platform
doctl apps list
doctl apps get <app-id>

# If using traditional VPS
ssh user@api.holilabs.xyz
systemctl status node-api
# or
pm2 status
```

---

## Diagnosis (5-10 Minutes)

### Check Application Logs

#### DigitalOcean App Platform
```bash
# Get recent logs
doctl apps logs <app-id> --type=run --follow

# Check build logs
doctl apps logs <app-id> --type=build
```

#### Traditional Deployment
```bash
# Check application logs
tail -n 100 /var/log/holi-api/error.log
journalctl -u node-api -n 100 --no-pager

# Check PM2 logs
pm2 logs api --lines 100
```

### Check System Resources

```bash
# Check CPU and memory
ssh user@server
top -bn1 | head -20

# Check disk space (common cause of crashes)
df -h
# If disk is >90% full, clear logs:
# sudo journalctl --vacuum-time=7d

# Check memory
free -h

# Check if process is running
ps aux | grep node
```

### Check Database Connection

```bash
# Test PostgreSQL connection
PGPASSWORD=<password> psql -h <db-host> -U <db-user> -d holi_protocol -c "SELECT 1;"

# Check active connections
PGPASSWORD=<password> psql -h <db-host> -U <db-user> -d holi_protocol -c "SELECT count(*) FROM pg_stat_activity;"

# If connections maxed out (>100), check for connection leaks
PGPASSWORD=<password> psql -h <db-host> -U <db-user> -d holi_protocol -c "
  SELECT datname, usename, state, count(*)
  FROM pg_stat_activity
  GROUP BY datname, usename, state
  ORDER BY count DESC;
"
```

### Check Redis Connection

```bash
# Test Redis connection
redis-cli -h <redis-host> -p 6379 ping
# Expected: PONG

# Check Redis memory
redis-cli -h <redis-host> info memory | grep used_memory_human

# Check if Redis is out of memory (eviction happening)
redis-cli -h <redis-host> info stats | grep evicted_keys
```

---

## Resolution Steps

### Scenario 1: Application Crashed (Process Not Running)

```bash
# Restart the application
# DigitalOcean:
doctl apps create-deployment <app-id>

# PM2:
pm2 restart api

# Systemd:
sudo systemctl restart node-api

# Verify it's running
curl https://api.holilabs.xyz/api/health
```

### Scenario 2: Out of Memory (OOM Killed)

```bash
# Check dmesg for OOM killer
dmesg | grep -i "out of memory"

# Increase memory limit (DigitalOcean)
# Edit app spec, increase instance size, redeploy

# Temporary fix: Restart with increased heap
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Long-term: Investigate memory leaks
# Check heap snapshots in production monitoring
```

### Scenario 3: Database Connection Pool Exhausted

```bash
# Kill idle connections
PGPASSWORD=<password> psql -h <db-host> -U <db-user> -d holi_protocol -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"

# Restart application to reset connection pool
doctl apps create-deployment <app-id>

# Check for connection leaks in code:
# - Ensure all Prisma queries use connection pooling
# - Check for forgotten transactions
# - Review long-running queries
```

### Scenario 4: Deployment Failed (Bad Build)

```bash
# Rollback to previous deployment
doctl apps list-deployments <app-id>
doctl apps rollback <app-id> <previous-deployment-id>

# Check build logs for errors
doctl apps logs <app-id> --type=build

# Common issues:
# - TypeScript compilation errors
# - Missing environment variables
# - Dependency installation failures
```

### Scenario 5: Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Kill the process
sudo kill -9 <PID>

# Restart application
pm2 restart api
```

### Scenario 6: SSL Certificate Expired

```bash
# Check certificate expiry
echo | openssl s_client -servername api.holilabs.xyz -connect api.holilabs.xyz:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew
sudo systemctl reload nginx

# If using Cloudflare, check SSL settings in dashboard
```

---

## Verification Steps

After applying the fix, verify the system is healthy:

```bash
# 1. Check health endpoint
curl https://api.holilabs.xyz/api/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. Test critical endpoints
curl https://api.holilabs.xyz/api/patients
curl https://api.holilabs.xyz/api/appointments

# 3. Check response times
time curl https://api.holilabs.xyz/api/health
# Expected: <500ms

# 4. Check error rates in monitoring
# Grafana: API Error Rate should be <1%
# Sentry: No new error spikes

# 5. Verify database queries work
# Check Prisma query logs for errors

# 6. Test user login flow
curl -X POST https://api.holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Post-Incident Actions

### 1. Update Incident Log (Within 1 Hour)
```markdown
## Incident Report: API Server Down

**Date:** YYYY-MM-DD HH:MM UTC
**Duration:** XX minutes
**Impact:** All users unable to access the application

**Root Cause:** [e.g., Out of memory due to memory leak in patient search endpoint]

**Resolution:** [e.g., Restarted application, increased memory limit from 2GB to 4GB]

**Affected Services:**
- Web application
- Mobile app
- API integrations

**Users Affected:** ~XXX concurrent users

**Detection:** Automated monitoring alert

**Response Time:**
- Time to acknowledge: 2 minutes
- Time to diagnose: 8 minutes
- Time to resolve: 15 minutes
```

### 2. Create Follow-Up Tasks (Within 24 Hours)
- [ ] Investigate root cause of memory leak (if applicable)
- [ ] Increase monitoring for memory usage
- [ ] Add auto-scaling if needed
- [ ] Review logs for any related issues
- [ ] Update documentation based on learnings

### 3. Conduct Post-Mortem (Within 1 Week)
Schedule a blameless post-mortem meeting with:
- Engineering team
- On-call engineer
- SRE/DevOps lead

**Discussion Points:**
- What happened?
- Why did it happen?
- How did we respond?
- What can we improve?
- What action items do we have?

### 4. Update Monitoring/Alerting
- Add alerts that would have caught this earlier
- Improve alert descriptions
- Adjust thresholds if needed

---

## Prevention

### Monitoring Alerts to Configure
```yaml
# Prometheus AlertManager Rules
groups:
  - name: api_health
    rules:
      - alert: APIServerDown
        expr: up{job="api-server"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API Server is down"
          description: "API server has been down for more than 1 minute"

      - alert: APIHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API error rate"
          description: "Error rate is {{ $value }} (>5%)"

      - alert: APISlowResponse
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time degraded"
          description: "95th percentile response time is {{ $value }}s"
```

### Auto-Healing Configuration
```yaml
# DigitalOcean App Spec (app.yaml)
services:
  - name: api
    health_check:
      http_path: /api/health
      initial_delay_seconds: 30
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3

    # Auto-restart on failure
    instance_count: 2
    instance_size_slug: professional-m

    # Auto-scaling (optional)
    autoscaling:
      min_instance_count: 2
      max_instance_count: 10
      metrics:
        cpu:
          percent: 80
```

### Code-Level Prevention
```typescript
// Add graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');

  // Stop accepting new requests
  server.close(async () => {
    // Close database connections
    await prisma.$disconnect();

    // Close Redis connections
    await redis.quit();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

// Add connection pool limits
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Limit connection pool size
  pool: {
    max: 20,
    idleTimeout: 30000,
  },
});
```

---

## Escalation

### Escalation Path
1. **Initial Response** (0-5 min): On-call engineer
2. **If not resolved in 15 min**: Escalate to Senior SRE
3. **If not resolved in 30 min**: Escalate to Engineering Manager
4. **If not resolved in 1 hour**: Escalate to CTO + External support

### Contact Information
- **On-Call Engineer**: Check PagerDuty schedule
- **Senior SRE**: [Contact info in internal docs]
- **Engineering Manager**: [Contact info in internal docs]
- **DigitalOcean Support**: support.digitalocean.com (Premium Support)
- **Database Support**: [Provider support contact]

---

## Related Runbooks
- [Database Connection Failure](./database-connection-failure.md)
- [Deployment Rollback](./deployment-rollback.md)
- [Performance Degradation](./performance-degradation.md)

---

## Changelog
- **2024-01-07**: Initial version created
- **[Date]**: Add updates based on actual incidents
