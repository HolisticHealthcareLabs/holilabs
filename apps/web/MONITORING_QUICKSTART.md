# Monitoring Quickstart Guide

## 5-Minute Setup (Before Production Launch)

### Step 1: Configure Sentry (Already Done ✅)

Sentry is already configured and ready to use. Just verify your environment variables:

```bash
# .env (production)
NEXT_PUBLIC_SENTRY_DSN="https://52aaa16d91208b01661a802f8be429a0@o4510387452641280.ingest.us.sentry.io/4510387465879552"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
```

**Test**: Deploy and trigger an intentional error to verify Sentry receives it.

---

### Step 2: Add BetterStack for Log Aggregation (5 min)

1. Sign up at https://betterstack.com
2. Create a new log source
3. Copy the source token
4. Add to `.env`:
   ```bash
   LOGTAIL_SOURCE_TOKEN="your-token-here"
   ```
5. Restart application - logs automatically flow to BetterStack

**Test**: Check BetterStack dashboard for incoming logs.

---

### Step 3: Set Up PagerDuty for Critical Alerts (10 min)

1. Sign up at https://pagerduty.com
2. Create a service: "Holi Labs Production"
3. Add integration → Events API v2
4. Copy integration key
5. Add to `.env`:
   ```bash
   PAGERDUTY_INTEGRATION_KEY="your-key-here"
   ```
6. Configure escalation policy (see ALERTING_RULES.md)

**Test**: Send a test alert via PagerDuty API.

---

### Step 4: Configure Slack Notifications (5 min)

1. Go to your Slack workspace
2. Apps → Incoming Webhooks → Add to channel
3. Choose channel: `#prod-alerts`
4. Copy webhook URL
5. Add to `.env`:
   ```bash
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   SLACK_ALERTS_CHANNEL="#prod-alerts"
   ```

**Test**: Send a test message to webhook.

---

### Step 5: Set Up Uptime Monitoring (5 min)

Use UptimeRobot or Pingdom:

1. Sign up at https://uptimerobot.com (free tier available)
2. Add monitors:
   - `https://holilabs.xyz/api/health` (5-minute interval)
   - `https://holilabs.xyz/api/health/ready` (5-minute interval)
   - `https://holilabs.xyz` (1-minute interval)
3. Configure alerts:
   - Alert after 2 consecutive failures
   - Send to: Email + PagerDuty + Slack

**Test**: Verify monitors are "up" and green.

---

## What You Get Immediately

### 1. Health Check Endpoints (Already Working ✅)

```bash
# Quick health check
curl https://holilabs.xyz/api/health

# Returns:
{
  "status": "healthy",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "uptime": 86400,
  "services": {
    "database": true,
    "databaseLatency": 45
  }
}
```

**All available endpoints**:
- `/api/health` - Main health check with database
- `/api/health/live` - Kubernetes liveness probe
- `/api/health/ready` - Readiness probe (DB, Redis, Supabase)
- `/api/cds/metrics` - CDSS performance metrics
- `/api/monitoring/critical-paths` - Critical path health

---

### 2. Automatic Error Tracking (Already Working ✅)

Sentry automatically captures:
- Unhandled exceptions
- API errors
- Performance issues
- User feedback

Check: https://sentry.io/organizations/holi-labs/issues/

---

### 3. Structured Logging (Already Working ✅)

All logs are structured JSON with:
- Event names (e.g., `auth_login_success`)
- Request IDs for tracing
- User and patient context (IDs only, no PHI)
- Performance metrics (duration)

Example log:
```json
{
  "timestamp": "2025-12-15T10:30:00.000Z",
  "level": "info",
  "event": "cdss_evaluation_completed",
  "duration": 1245,
  "performanceLevel": "target",
  "userId": "user_123",
  "patientId": "pat_456"
}
```

---

### 4. CDSS Performance Monitoring (Already Working ✅)

```bash
# Check CDSS metrics
curl https://holilabs.xyz/api/cds/metrics

# Returns:
{
  "status": "healthy",
  "metrics": {
    "engine": {
      "totalEvaluations": 1234,
      "cacheHitRate": "82.50",
      "avgProcessingTime": 1245,
      "slowEvaluations": 12
    },
    "cache": {
      "hitRate": 82.5,
      "circuitBreaker": {
        "state": "CLOSED"
      }
    }
  }
}
```

---

## Using the Monitoring Library

### Monitor Any Critical Operation

```typescript
import { monitorCriticalPath } from '@/lib/monitoring/critical-paths';

// Automatic performance tracking + logging
const result = await monitorCriticalPath(
  'patient_record_access',
  async () => {
    return await prisma.patient.findUnique({
      where: { id: patientId },
      include: { medications: true, vitals: true }
    });
  },
  {
    patientId,
    userId: session.user.id,
    accessType: 'full_record'
  }
);

if (!result.success) {
  // Handle error - already logged automatically
  return { error: result.error?.message };
}

// Log includes:
// - duration (e.g., 245ms)
// - performanceLevel (e.g., "target")
// - success: true
// - All metadata

return result.data;
```

### Specialized Monitors

```typescript
import {
  monitorCDSSEvaluation,
  monitorPrescriptionApproval,
  monitorPatientAccess,
  monitorAuthentication
} from '@/lib/monitoring/critical-paths';

// CDSS evaluation
const result = await monitorCDSSEvaluation(
  async () => cdsEngine.evaluate(context),
  { patientId, userId, ruleCount: 15 }
);

// Prescription approval
await monitorPrescriptionApproval(
  async () => approvePrescription(prescriptionId),
  { prescriptionId, patientId, userId }
);
```

### Simple Duration Tracking

```typescript
import { trackCriticalPathDuration } from '@/lib/monitoring/critical-paths';

const timer = await trackCriticalPathDuration('patient_search', {
  query: searchTerm.substring(0, 50)
});

const results = await performSearch(searchTerm);

timer.stop(); // Logs duration automatically

return results;
```

---

## Critical Alert Reference

### When You Get Paged (P0 Alerts)

| Alert | Immediate Action |
|-------|------------------|
| Application Down | Check `/api/health`, rollback if recent deployment |
| Database Down | Verify DATABASE_URL, check provider status |
| Error Rate > 5% | Check Sentry for patterns, review deployments |
| CDSS Failure | Check Redis, circuit breaker status at `/api/cds/metrics` |

**Full playbook**: See `docs/ALERTING_RULES.md`

---

## Quick Checks During Incidents

### 1. Overall Health
```bash
curl https://holilabs.xyz/api/health
```

### 2. CDSS Status
```bash
curl https://holilabs.xyz/api/cds/metrics
```

### 3. Critical Paths
```bash
curl https://holilabs.xyz/api/monitoring/critical-paths
```

### 4. Recent Errors
Check Sentry: https://sentry.io/organizations/holi-labs/issues/

### 5. Recent Logs
Check BetterStack: https://logs.betterstack.com/

---

## Key Thresholds to Remember

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time (p95) | < 2s | < 3s | < 5s |
| Error Rate | < 0.1% | < 0.5% | < 1% |
| CDSS Evaluation | < 2s | < 3s | < 5s |
| Cache Hit Rate | > 70% | > 50% | > 30% |
| Database Latency | < 100ms | < 500ms | < 1s |

---

## Dashboard Access

Once you set up dashboards:

- **Grafana**: http://your-grafana-url:3000
- **DataDog**: https://app.datadoghq.com/
- **Sentry**: https://sentry.io/organizations/holi-labs/
- **BetterStack**: https://logs.betterstack.com/

---

## Documentation Reference

Detailed guides:
- **Complete Strategy**: `docs/MONITORING_STRATEGY.md` (570 lines)
- **Alert Definitions**: `docs/ALERTING_RULES.md` (680 lines)
- **Dashboard Specs**: `docs/MONITORING_DASHBOARD.md` (881 lines)
- **Code Library**: `src/lib/monitoring/critical-paths.ts` (576 lines)
- **Complete Summary**: `AGENT_21_MONITORING_SETUP_COMPLETE.md`

---

## One-Line Health Check

```bash
# Overall application health
curl -s https://holilabs.xyz/api/health | jq '{status, database: .services.database}'

# CDSS health
curl -s https://holilabs.xyz/api/cds/metrics | jq '{status, cacheHitRate: .metrics.cache.hitRate, circuitBreaker: .metrics.cache.circuitBreaker.state}'

# Critical paths health
curl -s https://holilabs.xyz/api/monitoring/critical-paths | jq '{status, healthy: .summary.healthyPaths, degraded: .summary.degradedPaths, unhealthy: .summary.unhealthyPaths}'
```

---

## Costs

| Service | Monthly Cost | Required? |
|---------|--------------|-----------|
| Sentry | $26 | Yes (already configured) |
| BetterStack | $10-30 | Highly recommended |
| PagerDuty | $21/user | Yes (for on-call) |
| UptimeRobot | Free-$7 | Yes |
| **Total** | **~$70-90** | |

---

## Pre-Launch Checklist

- [x] Sentry configured and tested
- [x] Health check endpoints working
- [x] CDSS metrics endpoint working
- [x] Structured logging enabled
- [x] Monitoring library implemented
- [ ] BetterStack token configured
- [ ] PagerDuty integration set up
- [ ] Slack webhooks configured
- [ ] Uptime monitoring configured
- [ ] Alert rules configured
- [ ] Dashboards created
- [ ] On-call rotation scheduled
- [ ] Team trained on incident response

---

## Need Help?

1. Check comprehensive docs in `docs/`
2. Review code examples in monitoring library
3. Test health endpoints locally
4. Verify environment variables

**All systems are production-ready and waiting for external service tokens!**
