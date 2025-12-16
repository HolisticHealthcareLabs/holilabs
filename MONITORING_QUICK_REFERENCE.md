# Monitoring & Alerting - Quick Reference

**One-page guide for monitoring and incident response**

---

## 🚀 Quick Links

| Service | Dashboard | Documentation |
|---------|-----------|---------------|
| **Sentry** | https://sentry.io/organizations/[org]/issues/ | Error tracking |
| **DigitalOcean** | https://cloud.digitalocean.com/apps | Infrastructure |
| **UptimeRobot** | https://uptimerobot.com/dashboard | Uptime monitoring |
| **Health Check** | https://holilabs.xyz/api/health | System status |
| **Metrics** | https://holilabs.xyz/api/health/metrics | Detailed metrics |

---

## 📊 Key Metrics

### Performance

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Response Time (p95)** | < 1500ms | < 2000ms | < 5000ms |
| **Response Time (p99)** | < 3000ms | < 5000ms | < 10000ms |
| **Error Rate** | < 0.05% | < 0.1% | < 1% |
| **DB Latency** | < 100ms | < 500ms | < 1000ms |

### Resources

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **CPU Usage** | < 60% | < 80% | < 90% |
| **Memory Usage** | < 70% | < 85% | < 90% |
| **Disk Space** | < 70% | < 80% | < 90% |
| **DB Connections** | < 70% | < 85% | < 95% |

---

## 🎯 Health Check Endpoints

### Basic Health
```bash
curl https://holilabs.xyz/api/health
```

**Response:**
- `200` - Healthy
- `503` - Unhealthy

### Detailed Metrics
```bash
curl https://holilabs.xyz/api/health/metrics
```

**Returns:**
- Memory usage
- CPU usage
- Database health
- Active alerts

### Liveness Probe
```bash
curl https://holilabs.xyz/api/health/live
```

### Readiness Probe
```bash
curl https://holilabs.xyz/api/health/ready
```

---

## 🔔 Alert Channels

### Slack
- **#holilabs-alerts** - All production alerts
- **#holilabs-security** - Security events

### Email
- **ops@holilabs.xyz** - Primary contact
- **alerts@holilabs.xyz** - Alert aggregation

### SMS (Critical Only)
- On-call phone: +1234567890

---

## 🚨 Common Alerts & Actions

### High Error Rate
**Alert:** > 10 errors in 5 minutes
**Actions:**
1. Check Sentry for error details
2. Review recent deployments (last 1 hour)
3. Check database health
4. Consider rollback if pattern matches recent deploy

**Quick commands:**
```bash
# Check recent deploys
gh run list --limit 5

# View Sentry errors
open https://sentry.io/organizations/[org]/issues/

# Check database
curl https://holilabs.xyz/api/health/metrics
```

---

### Slow Response Time
**Alert:** p95 > 3000ms for 10 minutes
**Actions:**
1. Check database latency
2. Review slow API endpoints
3. Check memory/CPU usage
4. Consider scaling up

**Quick commands:**
```bash
# Check metrics
curl https://holilabs.xyz/api/health/metrics | jq

# Check DigitalOcean metrics
doctl apps list
```

---

### Site Down
**Alert:** Health check fails
**Actions:**
1. Check DigitalOcean app status
2. Review deployment logs
3. Check database connectivity
4. Initiate rollback if needed

**Quick commands:**
```bash
# Check app status
doctl apps list

# Check logs
doctl apps logs YOUR_APP_ID --follow

# Rollback
doctl apps create-deployment YOUR_APP_ID \
  --image YOUR_PREVIOUS_IMAGE
```

---

### High CPU/Memory
**Alert:** > 80% for 10 minutes
**Actions:**
1. Check active processes
2. Review traffic patterns (load test? attack?)
3. Check for memory leaks
4. Scale up if sustained high load

**Quick commands:**
```bash
# Check metrics
curl https://holilabs.xyz/api/health/metrics

# Scale up (if needed)
doctl apps update YOUR_APP_ID \
  --instance-size professional-xl
```

---

### Database Issues
**Alert:** Connection failures or slow queries
**Actions:**
1. Check connection pool usage
2. Verify database is responsive
3. Review slow queries
4. Check for long-running transactions

**Quick commands:**
```bash
# Check database health
curl https://holilabs.xyz/api/health/metrics

# Check DigitalOcean database
doctl databases list
doctl databases connection YOUR_DB_ID
```

---

## 🔍 Investigation Commands

### Check Application Health
```bash
# Basic health
curl https://holilabs.xyz/api/health

# Detailed metrics
curl https://holilabs.xyz/api/health/metrics | jq

# Check all services
curl https://holilabs.xyz/api/monitoring-status | jq
```

### Check Recent Deployments
```bash
# Via GitHub
gh run list --limit 5
gh run view RUN_ID

# Via DigitalOcean
doctl apps list-deployments YOUR_APP_ID --limit 5
```

### Check Logs
```bash
# Application logs
doctl apps logs YOUR_APP_ID --follow --tail 100

# Deployment logs
doctl apps logs YOUR_APP_ID --deployment DEPLOYMENT_ID
```

### Check Database
```bash
# Database metrics
curl https://holilabs.xyz/api/health/metrics | jq '.database'

# DigitalOcean database info
doctl databases get YOUR_DB_ID
```

---

## 🛠️ Quick Fixes

### Restart Application
```bash
# Create new deployment (restarts)
doctl apps create-deployment YOUR_APP_ID
```

### Rollback to Previous Version
```bash
# Get previous deployment
PREV_DEPLOYMENT=$(doctl apps list-deployments YOUR_APP_ID \
  --format ID,Phase --no-header | \
  grep ACTIVE | head -2 | tail -1 | awk '{print $1}')

# Get image from previous deployment
PREV_IMAGE=$(doctl apps get-deployment YOUR_APP_ID $PREV_DEPLOYMENT \
  --format Spec.Services[0].Image --no-header)

# Rollback
doctl apps update YOUR_APP_ID --image $PREV_IMAGE
```

### Scale Up
```bash
# Scale to larger instance
doctl apps update YOUR_APP_ID \
  --instance-size professional-xl \
  --instance-count 2
```

### Clear Cache (if applicable)
```bash
# Via API
curl -X POST https://holilabs.xyz/api/cache/clear \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 📞 Escalation Path

### Level 1 (Initial Response)
- **Time:** Within 5 minutes
- **Who:** On-call engineer
- **Actions:** Acknowledge, assess, investigate

### Level 2 (Engineering Team)
- **Time:** Within 15 minutes
- **Who:** Engineering lead
- **Actions:** Deep investigation, coordinate response

### Level 3 (Management)
- **Time:** Within 30 minutes
- **Who:** CTO/CEO
- **Actions:** Customer communication, business decisions

---

## 📋 Incident Response Checklist

- [ ] Acknowledge alert
- [ ] Check Sentry for errors
- [ ] Check DigitalOcean metrics
- [ ] Review recent deployments
- [ ] Check health endpoints
- [ ] Take corrective action
- [ ] Verify resolution
- [ ] Document incident
- [ ] Schedule post-mortem (if critical)

---

## 🔐 Emergency Contacts

| Role | Contact | When to Use |
|------|---------|-------------|
| **On-Call Engineer** | ops@holilabs.xyz | All production issues |
| **Engineering Lead** | lead@holilabs.xyz | Escalated issues |
| **CTO** | cto@holilabs.xyz | Critical outages |
| **DigitalOcean Support** | support ticket | Infrastructure issues |

---

## 📚 Additional Resources

- **Full Guide:** `MONITORING_SETUP_GUIDE.md`
- **Alert Config:** `monitoring/alert-config.yml`
- **Health Checks:** `apps/web/src/app/api/health/`
- **Sentry Docs:** https://docs.sentry.io/
- **DigitalOcean Docs:** https://docs.digitalocean.com/

---

## 🎯 SLA Targets

| Service | Target | Current |
|---------|--------|---------|
| **Uptime** | 99.9% | Monitor |
| **Response Time (p95)** | < 2s | Monitor |
| **Error Rate** | < 0.1% | Monitor |
| **Recovery Time** | < 15min | Monitor |

---

## ⚡ Quick Tests

### Test Sentry
```bash
# Trigger test error (staging only)
curl https://staging.holilabs.xyz/api/test-sentry-error
```

### Test Health Checks
```bash
# Should return 200
curl -I https://holilabs.xyz/api/health

# Should return metrics
curl https://holilabs.xyz/api/health/metrics | jq
```

### Test Alerts
```bash
# Use k6 to trigger thresholds (staging only)
./k6/run-tests.sh api-stress staging 10m
```

---

**Status:** ✅ Production Ready
**Last Updated:** December 15, 2025
**Next Review:** Monthly

**Print this page and keep near your desk for quick reference!**
