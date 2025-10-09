# 📊 Monitoring & Observability Setup Guide

**Purpose**: Complete guide to set up production monitoring for Holi Labs

---

## 🎯 Monitoring Stack

| Tool | Purpose | Cost | Status |
|------|---------|------|--------|
| **Sentry** | Error tracking + performance | $26/mo (Team) | ⚠️ Not configured |
| **BetterStack (Logtail)** | Centralized logging | $10/mo (Startup) | ⚠️ Token missing |
| **PostHog** | Product analytics | Free (50k events/mo) | ⚠️ Not configured |
| **DigitalOcean Monitoring** | Infrastructure metrics | Free (included) | ✅ Available |
| **Supabase Dashboard** | Database/auth metrics | Free (included) | ✅ Available |

**Total Cost**: ~$36/month for comprehensive monitoring

---

## 1️⃣ Sentry Setup (Error Tracking)

### Step 1: Create Sentry Account

1. Go to: https://sentry.io/signup/
2. Sign up with email (free for 5k errors/month)
3. Create organization: `holi-labs`
4. Create project: `holi-labs-web` (Platform: Next.js)

### Step 2: Install Sentry SDK

```bash
cd apps/web
pnpm add @sentry/nextjs
```

### Step 3: Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.js`
- Add `.sentryclirc` file

### Step 4: Add Environment Variables

```bash
# In DigitalOcean App Platform:
SENTRY_DSN=https://[YOUR_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
NEXT_PUBLIC_SENTRY_DSN=same-as-above
SENTRY_AUTH_TOKEN=[get-from-sentry-settings]
SENTRY_ORG=holi-labs
SENTRY_PROJECT=holi-labs-web
```

**Where to find DSN**:
- Sentry Dashboard → Settings → Projects → holi-labs-web → Client Keys (DSN)

**Where to get Auth Token** (for source map uploads):
- Sentry Dashboard → Settings → Account → API → Auth Tokens
- Click "Create New Token"
- Scopes: `project:read`, `project:releases`, `org:read`
- Copy token

### Step 5: Test Sentry

```bash
# Start dev server
pnpm dev

# Trigger test error
curl http://localhost:3000/api/test-error

# Check Sentry Dashboard for error
```

### Step 6: Configure Alerts

1. Sentry Dashboard → Alerts → Create Alert Rule
2. Set conditions:
   - **Error Spike**: Alert if errors > 50 in 5 minutes
   - **New Issue**: Alert on first occurrence of new error
   - **Performance Degradation**: Alert if P95 > 2 seconds
3. Add notification channels:
   - Email: your-email@holilabs.com
   - Slack: #alerts channel (optional)

---

## 2️⃣ BetterStack (Logtail) Setup

### Step 1: Create BetterStack Account

1. Go to: https://betterstack.com/logtail
2. Sign up (free for 1GB/month)
3. Create source: `holi-labs-production`

### Step 2: Get Source Token

1. Dashboard → Sources → holi-labs-production
2. Copy source token: `[32-character-token]`

### Step 3: Add Environment Variable

```bash
# In DigitalOcean App Platform:
LOGTAIL_SOURCE_TOKEN=[your-32-char-token]
```

### Step 4: Test Logging

```bash
# Restart app with new env var
# Logs will now appear in BetterStack dashboard
```

### Step 5: Create Log Views

1. **Error Logs**:
   - Filter: `level >= 40` (error + critical)
   - Alert: Email if > 10 errors in 5 min

2. **PHI Access Logs**:
   - Filter: `event = "patient_accessed"`
   - Save for HIPAA compliance audit

3. **API Performance**:
   - Filter: `event = "api_request"`
   - Graph: `avg(duration)` by endpoint

---

## 3️⃣ PostHog Setup (Product Analytics)

### Step 1: Create PostHog Account

1. Go to: https://posthog.com/signup
2. Sign up (Cloud or Self-hosted)
3. Create project: `holi-labs`

### Step 2: Get API Key

1. Dashboard → Project Settings → Project API Key
2. Copy key: `phc_[long-key]`

### Step 3: Install PostHog SDK

```bash
cd apps/web
pnpm add posthog-js
```

### Step 4: Add to App

```typescript
// src/lib/analytics/posthog.ts
import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      },
    });
  }
}

// Call in app/layout.tsx
```

### Step 5: Add Environment Variables

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_[your-key]
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 6: Track Key Events

```typescript
// Track scribe session started
posthog.capture('scribe_session_started', {
  specialty: 'cardiology',
  duration: 180,
});

// Track note signed
posthog.capture('note_signed', {
  note_type: 'SOAP',
  template: 'follow_up',
});

// Track prescription created
posthog.capture('prescription_created', {
  medication: '[redacted]', // Don't send PHI!
});
```

---

## 4️⃣ DigitalOcean Monitoring

### Step 1: Enable Alerts

1. Go to: https://cloud.digitalocean.com/apps
2. Select app: `holi-labs`
3. Go to: Insights tab

### Step 2: Configure Alerts

1. **CPU Alert**:
   - Trigger: CPU > 80% for 5 minutes
   - Notification: Email

2. **Memory Alert**:
   - Trigger: Memory > 90% for 5 minutes
   - Notification: Email

3. **Disk Alert**:
   - Trigger: Disk > 85%
   - Notification: Email

### Step 3: Database Monitoring

1. Go to: Databases → holi-labs-db
2. View metrics:
   - Connections
   - Query performance
   - Disk usage
   - Replication lag (if HA enabled)

---

## 5️⃣ Health Check Endpoints

We already have `/api/health` implemented. Enhance it:

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    assemblyai: await checkAssemblyAI(),
    redis: await checkRedis(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: healthy ? 200 : 503,
  });
}
```

### Monitor with UptimeRobot

1. Go to: https://uptimerobot.com/
2. Add monitor:
   - Type: HTTP(S)
   - URL: https://holilabs.com/api/health
   - Interval: 5 minutes
   - Alert: Email if down

---

## 6️⃣ Alert Rules Summary

| Alert | Condition | Notification | Action |
|-------|-----------|--------------|--------|
| **Error Spike** | >50 errors in 5 min | Email + Slack | Investigate logs |
| **API Latency** | P95 > 2 seconds | Email | Check database queries |
| **Database Connection** | Connection failed | Email + SMS | Check DB status |
| **Disk Space** | >85% full | Email | Increase storage |
| **CPU High** | >80% for 5 min | Email | Scale up instance |
| **New Error Type** | First occurrence | Slack | Review stack trace |
| **Health Check Failed** | 3 consecutive failures | Email + SMS | Check all services |

---

## 7️⃣ Dashboard Setup

### Sentry Dashboard (Errors)

Widgets to add:
1. **Error Rate** (24h graph)
2. **Top 5 Errors** (table)
3. **Error by Endpoint** (bar chart)
4. **Release Health** (version comparison)

### BetterStack Dashboard (Logs)

Widgets to add:
1. **Error Count** (24h)
2. **API Response Times** (P50, P95, P99)
3. **Database Query Times** (slow queries)
4. **Top Error Messages** (table)

### PostHog Dashboard (Analytics)

Widgets to add:
1. **Daily Active Users** (line chart)
2. **Scribe Sessions Created** (bar chart)
3. **Notes Signed per Day** (line chart)
4. **Feature Adoption** (funnel)

---

## 8️⃣ On-Call Rotation

### Setup PagerDuty (Optional)

If you need 24/7 on-call:

1. Go to: https://www.pagerduty.com/
2. Create escalation policy:
   - **Level 1**: Primary on-call engineer (5 min)
   - **Level 2**: Backup engineer (15 min)
   - **Level 3**: Engineering manager (30 min)
3. Integrate with Sentry + BetterStack
4. Set schedule (weekly rotations)

**Cost**: $21/user/month

---

## 9️⃣ Testing Monitoring

### Trigger Test Errors

```bash
# Test Sentry error capture
curl https://holilabs.com/api/test-error

# Test slow API response
curl https://holilabs.com/api/test-slow

# Test database connection failure
curl https://holilabs.com/api/test-db-error
```

### Verify Alerts

1. Check email inbox for alert
2. Check Slack #alerts channel
3. Check Sentry Issues page
4. Check BetterStack Logs

---

## 🔟 Monitoring Checklist

Before production launch:

- [ ] Sentry installed and DSN configured
- [ ] Source maps uploading to Sentry
- [ ] BetterStack token added
- [ ] Logs flowing to BetterStack dashboard
- [ ] PostHog tracking key events
- [ ] DigitalOcean alerts configured (CPU, memory, disk)
- [ ] Database monitoring enabled
- [ ] Health check endpoint working
- [ ] UptimeRobot monitoring health check
- [ ] Alert rules tested (all channels)
- [ ] On-call rotation defined
- [ ] Team trained on incident response
- [ ] Runbook created for common issues

---

## 📞 Quick Access Links

**Production**:
- Sentry: https://sentry.io/organizations/holi-labs/
- BetterStack: https://logs.betterstack.com/
- PostHog: https://app.posthog.com/project/[id]
- DigitalOcean: https://cloud.digitalocean.com/apps
- UptimeRobot: https://uptimerobot.com/dashboard

**Documentation**:
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- BetterStack Docs: https://betterstack.com/docs/logs/
- PostHog Docs: https://posthog.com/docs/

---

## 💰 Cost Breakdown (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Sentry | Team (50k errors) | $26 |
| BetterStack | Startup (5GB logs) | $10 |
| PostHog | Free (50k events) | $0 |
| UptimeRobot | Free (50 monitors) | $0 |
| PagerDuty | Professional (optional) | $21/user |
| **Total (without PagerDuty)** | | **$36** |

**Recommendation**: Start with Sentry + BetterStack ($36/mo), add PagerDuty later if needed.

---

**Document Version**: 1.0
**Last Updated**: October 9, 2025
**Owner**: DevOps Team
**Next Review**: After first production deployment
