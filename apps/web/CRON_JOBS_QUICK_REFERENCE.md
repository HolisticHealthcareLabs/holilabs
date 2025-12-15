# Cron Jobs Quick Reference

Fast reference for common cron job operations.

## Quick Start

### 1. Set CRON_SECRET

```bash
# Generate secret
openssl rand -hex 32

# Add to .env
echo 'CRON_SECRET="your-generated-secret"' >> .env.local

# Add to Vercel
vercel env add CRON_SECRET production
```

### 2. Test Locally

```bash
export CRON_SECRET="your-secret-here"

# Test endpoint
curl -X POST http://localhost:3000/api/cron/execute-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Run Security Tests

```bash
pnpm tsx scripts/test-cron-security.ts
```

---

## All Cron Jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/execute-reminders` | Every minute | Execute scheduled reminders |
| `/api/cron/send-appointment-reminders` | Daily 8 PM | Send appointment reminders |
| `/api/cron/screening-triggers` | Daily 2 AM | Generate screening reminders |
| `/api/cron/expire-consents` | Daily midnight | Expire outdated consents |
| `/api/cron/send-consent-reminders` | Daily 9 AM | Send consent expiration reminders |
| `/api/cron/process-email-queue` | Every 5 min | Process queued emails |

---

## Common Commands

### Test All Endpoints

```bash
export CRON_SECRET="your-secret-here"
BASE="http://localhost:3000"

curl -X POST $BASE/api/cron/execute-reminders -H "Authorization: Bearer $CRON_SECRET"
curl -X POST $BASE/api/cron/send-appointment-reminders -H "Authorization: Bearer $CRON_SECRET"
curl -X POST $BASE/api/cron/screening-triggers -H "Authorization: Bearer $CRON_SECRET"
curl -X POST $BASE/api/cron/expire-consents -H "Authorization: Bearer $CRON_SECRET"
curl -X POST $BASE/api/cron/send-consent-reminders -H "Authorization: Bearer $CRON_SECRET"
curl -X POST $BASE/api/cron/process-email-queue -H "Authorization: Bearer $CRON_SECRET"
```

### Check Health

```bash
# All jobs
curl http://localhost:3000/api/cron/health | jq

# Specific job
curl -X POST http://localhost:3000/api/cron/health \
  -H "Content-Type: application/json" \
  -d '{"jobName": "execute_reminders", "limit": 10}' | jq
```

### View Vercel Crons

```bash
# List all cron jobs
vercel crons ls

# View logs
vercel logs --filter="event=cron" --follow
```

---

## Monitoring

### Health Status

```typescript
import { CronMonitor } from '@/lib/cron/monitoring';

const monitor = CronMonitor.getInstance();

// Get all jobs health
const health = monitor.getAllJobsHealth();

// Get specific job
const jobHealth = monitor.getJobHealth('execute_reminders');

// Get history
const history = monitor.getJobHistory('execute_reminders', 10);
```

### Health Thresholds

- **Healthy**: Success rate ≥ 80% AND consecutive failures < 3
- **Degraded**: Success rate < 80% OR 1-2 consecutive failures
- **Critical**: 3+ consecutive failures

### Alert Events

- `cron_job_health_critical` - 3+ consecutive failures
- `cron_job_health_degraded` - Success rate < 80%
- `cron_unauthorized_access` - Invalid auth attempt
- `invalid_cron_ip` - Request from non-whitelisted IP

---

## Troubleshooting

### 401 Unauthorized

```bash
# Check CRON_SECRET is set
echo $CRON_SECRET

# Verify in Vercel
vercel env ls

# Test with correct secret
curl -X POST https://holilabs.xyz/api/cron/execute-reminders \
  -H "Authorization: Bearer correct-secret-here"
```

### 500 CRON_SECRET not configured

```bash
# Add to .env
echo 'CRON_SECRET="your-secret"' >> .env.local

# Add to Vercel
vercel env add CRON_SECRET production
```

### Job Not Running

1. Check `vercel.json` configuration
2. Verify job is listed: `vercel crons ls`
3. Check logs: `vercel logs --filter="cron"`
4. Manually trigger to test

### High Failure Rate

1. Check logs: `vercel logs --filter="jobName=execute_reminders"`
2. Check health: `curl http://localhost:3000/api/cron/health`
3. Review dependencies (database, external APIs)
4. Check rate limits

---

## Cron Schedule Reference

| Expression | Meaning |
|------------|---------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 2 * * *` | Daily at 2 AM |
| `0 9 * * *` | Daily at 9 AM |
| `0 20 * * *` | Daily at 8 PM |

Use [crontab.guru](https://crontab.guru/) for testing.

---

## Security Checklist

- [x] CRON_SECRET is set (64 hex characters)
- [x] CRON_SECRET is in Vercel environment variables
- [x] All endpoints require Bearer token
- [x] IP whitelist validation enabled
- [x] Structured logging in place
- [x] Error handling implemented
- [x] Retry logic with exponential backoff
- [x] Health monitoring configured

---

## Files

| File | Purpose |
|------|---------|
| `/docs/CRON_JOBS.md` | Complete documentation |
| `/src/lib/cron/monitoring.ts` | Monitoring system |
| `/src/app/api/cron/health/route.ts` | Health API |
| `/scripts/test-cron-security.ts` | Security tests |
| `/vercel.json` | Vercel cron configuration |

---

## Resources

- [Full Documentation](/docs/CRON_JOBS.md)
- [Vercel Cron Docs](https://vercel.com/docs/cron-jobs)
- [Crontab Guru](https://crontab.guru/)
- [Pino Logging](https://getpino.io/)
