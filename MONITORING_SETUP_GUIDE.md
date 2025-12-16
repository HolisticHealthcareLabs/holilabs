# Monitoring & Alerting Setup Guide

**Complete guide for production monitoring and alerting**

---

## 📊 Overview

This guide covers setting up comprehensive monitoring and alerting for HoliLabs production environment.

### Monitoring Stack

1. **Sentry** - Error tracking and performance monitoring
2. **DigitalOcean** - Infrastructure monitoring
3. **UptimeRobot** - Uptime monitoring and alerts
4. **Custom Health Checks** - Application-specific monitoring

---

## 🎯 Quick Start Checklist

- [ ] Configure Sentry alerts (5 minutes)
- [ ] Set up DigitalOcean monitoring (5 minutes)
- [ ] Configure UptimeRobot (10 minutes)
- [ ] Test all alert channels (5 minutes)
- [ ] Document on-call procedures

**Total time: ~30 minutes**

---

## 1. Sentry Configuration

### Initial Setup

Sentry is already configured in the codebase:
- DSN: `apps/web/sentry.server.config.ts`
- HIPAA-compliant settings enabled
- PII scrubbing configured

### Alert Rules to Configure

#### A. Error Rate Alert

**When to alert:** Error rate > 1% for 5 minutes

1. Go to: `https://sentry.io/organizations/[your-org]/alerts/rules/`
2. Click "Create Alert Rule"
3. Configure:
   ```
   Name: High Error Rate
   Condition: errors.count() > 10 in 5 minutes
   Filter: event.type:error
   ```
4. Action: Send notification to **Slack** or **Email**

#### B. Response Time Alert

**When to alert:** p95 response time > 3000ms

```
Name: Slow API Response
Condition: percentile(transaction.duration, 0.95) > 3000ms
Filter: event.type:transaction
```

#### C. Database Query Alert

**When to alert:** Database queries > 1000ms

```
Name: Slow Database Queries
Condition: percentile(spans.duration, 0.95) > 1000ms
Filter: span.op:db.sql.query
```

#### D. Failed Transactions Alert

**When to alert:** Failed transactions > 10 in 5 minutes

```
Name: Failed Transactions
Condition: failure_count() > 10 in 5 minutes
Filter: event.type:transaction AND transaction.status:error
```

### Sentry Configuration Script

Create `.sentry/alerts.json`:

```json
{
  "alerts": [
    {
      "name": "High Error Rate",
      "condition": "errors.count() > 10 in 5 minutes",
      "actions": ["email", "slack"],
      "severity": "critical"
    },
    {
      "name": "Slow API Response",
      "condition": "p95(transaction.duration) > 3000ms",
      "actions": ["slack"],
      "severity": "warning"
    },
    {
      "name": "Database Latency",
      "condition": "p95(spans.duration) > 1000ms where span.op:db.sql.query",
      "actions": ["slack"],
      "severity": "warning"
    }
  ]
}
```

---

## 2. DigitalOcean Monitoring

### App Platform Monitoring

#### CPU Usage Alert

1. Go to: DigitalOcean → Apps → holi-labs → Insights
2. Click "Add Alert"
3. Configure:
   ```
   Metric: CPU Usage
   Threshold: > 80%
   Duration: 10 minutes
   Action: Email notification
   ```

#### Memory Usage Alert

```
Metric: Memory Usage
Threshold: > 90%
Duration: 5 minutes
Action: Email notification
```

#### Response Time Alert

```
Metric: Response Time (p95)
Threshold: > 3 seconds
Duration: 10 minutes
Action: Email notification
```

#### Error Rate Alert

```
Metric: 5xx Error Rate
Threshold: > 1%
Duration: 5 minutes
Action: Email notification
```

### Database Monitoring

#### Database CPU Alert

```
Metric: CPU Usage
Threshold: > 80%
Duration: 10 minutes
Action: Email notification
```

#### Database Memory Alert

```
Metric: Memory Usage
Threshold: > 85%
Duration: 10 minutes
Action: Email notification
```

#### Database Connections Alert

```
Metric: Connection Pool Usage
Threshold: > 90%
Duration: 5 minutes
Action: Email notification
```

#### Database Disk Space Alert

```
Metric: Disk Usage
Threshold: > 80%
Duration: 1 hour
Action: Email notification
```

### DigitalOcean CLI Configuration

```bash
# Install doctl
brew install doctl  # macOS

# Authenticate
doctl auth init

# List apps
doctl apps list

# Create alert (example)
doctl monitoring alert create \
  --app-id YOUR_APP_ID \
  --metric cpu_usage \
  --threshold 80 \
  --window 10m \
  --emails your-email@example.com
```

---

## 3. UptimeRobot Setup

### Free Tier Features
- 50 monitors
- 5-minute check interval
- Email/SMS/Slack/Webhook alerts

### Create Account

1. Go to: https://uptimerobot.com/signup
2. Sign up with your email
3. Verify email

### Configure Monitors

#### A. Main Site Monitor

```
Monitor Type: HTTP(s)
Friendly Name: HoliLabs Main Site
URL: https://holilabs.xyz
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
Alert Contacts: your-email@example.com
```

#### B. API Health Check

```
Monitor Type: HTTP(s)
Friendly Name: HoliLabs API Health
URL: https://holilabs.xyz/api/health
Monitoring Interval: 5 minutes
Keyword: "healthy"
```

#### C. Database Health

```
Monitor Type: HTTP(s)
Friendly Name: Database Health
URL: https://holilabs.xyz/api/health/metrics
Monitoring Interval: 5 minutes
Keyword: "connected"
```

#### D. Patient Portal

```
Monitor Type: HTTP(s)
Friendly Name: Patient Portal
URL: https://holilabs.xyz/portal/dashboard
Monitoring Interval: 5 minutes
Alert if status code != 200 or 401
```

### Alert Contacts

Configure multiple alert channels:

1. **Email Alerts**
   - Primary: your-email@example.com
   - Secondary: team@holilabs.xyz

2. **SMS Alerts** (for critical monitors only)
   - Add phone number
   - Verify SMS

3. **Slack Integration**
   - Generate webhook URL in Slack
   - Add to UptimeRobot alert contacts

### UptimeRobot API Configuration

Store in `.env`:

```env
UPTIMEROBOT_API_KEY=your_api_key_here
```

---

## 4. Custom Health Checks

### Health Check Endpoints

HoliLabs provides several health check endpoints:

#### `/api/health` - Basic Health
Returns 200 if healthy, 503 if unhealthy

```bash
curl https://holilabs.xyz/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T10:00:00Z",
  "uptime": 3600,
  "services": {
    "database": true,
    "databaseLatency": 42
  }
}
```

#### `/api/health/metrics` - Detailed Metrics
Comprehensive system metrics

```bash
curl https://holilabs.xyz/api/health/metrics
```

Response includes:
- Memory usage
- CPU usage
- Database latency
- Connection pool stats
- Alert thresholds
- Active alerts

#### `/api/health/live` - Liveness Probe
Quick check for Kubernetes/container orchestration

#### `/api/health/ready` - Readiness Probe
Checks if app is ready to serve traffic

### Monitoring Script

Create `scripts/monitor-health.sh`:

```bash
#!/bin/bash

# Health monitoring script
# Run this via cron every 5 minutes

URL="https://holilabs.xyz/api/health/metrics"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

response=$(curl -s -w "\n%{http_code}" "$URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  # Alert via Slack
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"🚨 Health check failed!\",
      \"attachments\": [{
        \"color\": \"danger\",
        \"fields\": [
          {\"title\": \"Status Code\", \"value\": \"$http_code\"},
          {\"title\": \"URL\", \"value\": \"$URL\"},
          {\"title\": \"Time\", \"value\": \"$(date)\"}
        ]
      }]
    }"
fi
```

Make executable and add to cron:

```bash
chmod +x scripts/monitor-health.sh

# Add to crontab (every 5 minutes)
*/5 * * * * /path/to/scripts/monitor-health.sh
```

---

## 5. Alert Thresholds

### Performance Baselines

Based on k6 load testing results:

| Metric | Warning | Critical | Baseline |
|--------|---------|----------|----------|
| **Response Time (p95)** | > 2000ms | > 5000ms | ~1500ms |
| **Response Time (p99)** | > 5000ms | > 10000ms | ~3000ms |
| **Error Rate** | > 0.1% | > 1% | < 0.05% |
| **Database Latency** | > 500ms | > 1000ms | ~100ms |
| **Memory Usage** | > 80% | > 90% | 60-70% |
| **CPU Usage** | > 80% | > 90% | 40-60% |
| **Disk Space** | > 80% | > 90% | 60-70% |

### Adjustment Recommendations

**After 1 week of production:**
- Review actual performance metrics
- Adjust thresholds based on real usage
- Reduce false positive alerts
- Tighten thresholds for better SLA

**After 1 month:**
- Establish performance SLIs/SLOs
- Set up automated capacity planning
- Configure predictive alerts

---

## 6. Alert Channels

### Email Alerts

Configure in each monitoring service:

**Primary:**
- your-email@example.com

**Secondary:**
- ops@holilabs.xyz
- alerts@holilabs.xyz

### Slack Integration

Create dedicated channel: `#holilabs-alerts`

**Sentry → Slack:**
1. Sentry → Settings → Integrations → Slack
2. Authorize workspace
3. Select #holilabs-alerts channel

**UptimeRobot → Slack:**
1. Slack → Apps → Incoming Webhooks
2. Add to #holilabs-alerts
3. Copy webhook URL
4. UptimeRobot → Add Alert Contact → Webhook

**DigitalOcean → Slack:**
1. Use email-to-Slack integration
2. Or set up webhook via Zapier/Make

### PagerDuty (Optional)

For 24/7 on-call:

1. Sign up: https://www.pagerduty.com/
2. Create service: HoliLabs Production
3. Configure integrations:
   - Sentry
   - UptimeRobot
   - Custom webhooks
4. Set up escalation policies
5. Configure on-call schedules

---

## 7. Dashboard Setup

### Sentry Performance Dashboard

1. Go to: Sentry → Dashboards → Create Dashboard
2. Add widgets:
   - Transaction volume
   - p95 response time
   - Error rate
   - Slow database queries
   - Apdex score

### DigitalOcean Insights

Built-in dashboards for:
- App Platform metrics
- Database metrics
- Bandwidth usage
- Request/response metrics

### Custom Grafana (Optional)

For advanced visualization:

```bash
# Install Grafana
docker run -d -p 3000:3000 grafana/grafana

# Add data sources
- Prometheus (if using)
- PostgreSQL (for custom metrics)
- JSON API (for health endpoint)
```

---

## 8. Testing Alerts

### Test Sentry Alerts

```javascript
// Trigger test error
fetch('https://holilabs.xyz/api/test-sentry-alert')
```

### Test UptimeRobot

Temporarily disable your app or return 503 from health endpoint.

### Test DigitalOcean

Use load testing to trigger thresholds:

```bash
# Run k6 stress test
./k6/run-tests.sh api-stress production 10m
```

---

## 9. On-Call Procedures

### Incident Response Checklist

**When alert fires:**

1. **Acknowledge** - Confirm you've seen the alert
2. **Assess** - Check severity and impact
3. **Investigate** - Review logs, metrics, recent deploys
4. **Mitigate** - Take action to restore service
5. **Document** - Record incident details
6. **Follow-up** - Post-mortem if critical

### Common Scenarios

#### High Error Rate

1. Check Sentry for error details
2. Review recent deployments
3. Check database health
4. Consider rollback if needed

#### Slow Response Times

1. Check database latency
2. Review API endpoint performance
3. Check memory/CPU usage
4. Consider scaling up

#### Database Connection Issues

1. Check connection pool usage
2. Verify database is responsive
3. Check network connectivity
4. Restart app if needed

#### Service Down

1. Check health endpoints
2. Review DigitalOcean app status
3. Check deployment logs
4. Initiate rollback if needed

---

## 10. Monitoring Checklist

### Daily

- [ ] Review Sentry error trends
- [ ] Check DigitalOcean metrics
- [ ] Verify all health checks passing

### Weekly

- [ ] Review performance trends
- [ ] Check alert noise (false positives)
- [ ] Update thresholds if needed
- [ ] Review capacity planning

### Monthly

- [ ] Performance SLA report
- [ ] Capacity planning review
- [ ] Alert effectiveness analysis
- [ ] Update on-call procedures

---

## 11. Cost Optimization

### Free Tiers

**Sentry:** 5,000 events/month free
**UptimeRobot:** 50 monitors free
**DigitalOcean:** Included with App Platform

### Paid Options

**Sentry Team:** $26/month
- 50,000 events
- Advanced features
- Team collaboration

**UptimeRobot Pro:** $7/month
- 1-minute intervals
- More monitors
- More alert channels

**PagerDuty:** $19/user/month
- 24/7 on-call
- Escalation policies
- Incident management

---

## 12. Compliance Considerations

### HIPAA Requirements

- ✅ No PII in error messages (Sentry beforeSend configured)
- ✅ Encrypted data in transit (HTTPS)
- ✅ Access controls on monitoring dashboards
- ✅ Audit logs enabled
- ⚠️ Business Associate Agreements (BAAs) required for monitoring vendors

### BAA Requirements

Services that need BAAs:
- ☐ Sentry (if PHI in errors - currently scrubbed)
- ☐ Log aggregation services
- ☐ APM tools with data sampling

---

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [DigitalOcean Monitoring Guide](https://docs.digitalocean.com/products/monitoring/)
- [UptimeRobot API Docs](https://uptimerobot.com/api/)
- [SRE Best Practices](https://sre.google/books/)

---

## 🆘 Troubleshooting

### Alerts Not Firing

1. Check alert configuration
2. Verify contact methods
3. Test manually
4. Check monitoring service status

### False Positives

1. Review threshold values
2. Adjust alert duration
3. Add conditions/filters
4. Consider time-of-day patterns

### Missing Metrics

1. Verify health endpoints accessible
2. Check monitoring service configuration
3. Review firewall rules
4. Test API calls manually

---

**Status:** ✅ Ready to implement
**Time to complete:** 30-60 minutes
**Maintenance:** Review monthly

---

**Last Updated:** December 15, 2025
**Version:** 1.0.0
