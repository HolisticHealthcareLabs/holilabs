# Runbook: Email Delivery Failure

**Severity:** High (P1) - Blocks critical user workflows
**Expected Resolution Time:** 15-30 minutes
**On-Call Required:** Yes

---

## Symptoms

### What Users Report
- "I didn't receive the password reset email"
- "Email verification code never arrived"
- "Appointment reminder emails not coming through"
- "Invoice emails missing"

### What Monitoring Shows
- Email queue metrics showing high failure rate
- BullMQ dashboard showing failed jobs
- Resend/SendGrid API errors in logs
- Sentry alerts: `EmailDeliveryError`, `ResendAPIError`, `SendGridAPIError`
- Prometheus alert: `EmailDeliveryFailureRateHigh` firing

---

## Immediate Actions (First 5 Minutes)

### 1. Check Email Queue Status
```bash
# SSH to application server
ssh app-server

# Check email queue metrics
node -e "
const { getEmailQueueMetrics } = require('./src/lib/email/email-queue');
getEmailQueueMetrics().then(metrics => {
  console.log('Email Queue Status:');
  console.log('Waiting:', metrics.waiting);
  console.log('Active:', metrics.active);
  console.log('Failed:', metrics.failed);
  console.log('Completed:', metrics.completed);
});
"

# Check Redis connection (email queue backend)
redis-cli -h $REDIS_HOST ping
# Expected: PONG
```

### 2. Check Recent Failed Email Jobs
```bash
# Check BullMQ failed jobs
redis-cli -h $REDIS_HOST LRANGE bull:email-notifications:failed 0 10

# Check application logs for email errors
tail -n 100 /var/log/holi-api/error.log | grep -i "email\|resend\|sendgrid"

# Check Sentry for email-related errors
# Dashboard > Issues > Filter: "email"
```

### 3. Test Email Providers Directly
```bash
# Test Resend (primary provider)
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@holilabs.xyz",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Test from runbook</p>"
  }'

# Test SendGrid (fallback provider)
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@holilabs.xyz"},
    "subject": "Test Email",
    "content": [{"type": "text/html", "value": "<p>Test from runbook</p>"}]
  }'
```

---

## Diagnosis (5-10 Minutes)

### Check Provider Status

#### Resend Status
```bash
# Check Resend status page
curl https://resend.com/api/status

# Check API key validity
curl https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_API_KEY"

# Check domain verification
# Dashboard: https://resend.com/domains
# Verify SPF, DKIM, DMARC records
```

#### SendGrid Status
```bash
# Check SendGrid status page
curl https://status.sendgrid.com/api/v2/status.json

# Check API key validity
curl https://api.sendgrid.com/v3/user/profile \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Check sender verification
curl https://api.sendgrid.com/v3/verified_senders \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

### Check DNS Records (Email Authentication)

```bash
# Check SPF record
dig TXT holilabs.xyz | grep "v=spf1"
# Should include: v=spf1 include:_spf.resend.com include:sendgrid.net ~all

# Check DKIM record
dig TXT resend._domainkey.holilabs.xyz
dig TXT s1._domainkey.holilabs.xyz  # SendGrid

# Check DMARC record
dig TXT _dmarc.holilabs.xyz
# Should be: v=DMARC1; p=quarantine; rua=mailto:dmarc@holilabs.xyz
```

### Check Rate Limits

```bash
# Check Resend rate limit headers from recent request
# X-RateLimit-Limit: 10000
# X-RateLimit-Remaining: 9950
# X-RateLimit-Reset: 1640000000

# Check SendGrid rate limit
curl https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -I

# Check BullMQ rate limiting configuration
# Should be: 100 emails/minute
```

### Check Email Queue Worker Status

```bash
# Check if email worker is running
ps aux | grep "email-worker"
pm2 list | grep email

# Check worker logs
pm2 logs email-worker --lines 50

# Check for worker crashes
pm2 info email-worker | grep "restart time"
```

---

## Resolution Steps

### Scenario 1: Resend API Down (Primary Provider Failure)

```bash
# Check if SendGrid fallback is working
# Email queue should automatically switch to SendGrid on 3rd attempt

# Verify fallback logic in code
# File: src/lib/email/email-queue.ts
# Should fallback to SendGrid on attemptsMade === 2

# Monitor queue - jobs should succeed with SendGrid
redis-cli -h $REDIS_HOST LRANGE bull:email-notifications:completed 0 10 | grep sendgrid

# Temporary: Force all emails to SendGrid
# Edit environment variable (if needed)
export EMAIL_PROVIDER=sendgrid
pm2 restart email-worker
```

**Check Resend Status:**
- Status page: https://resend.com/status
- If down, wait for recovery
- Update status page: "Email system degraded (using backup provider)"

---

### Scenario 2: Both Providers Down (Rare)

```bash
# Check both status pages
curl https://resend.com/api/status
curl https://status.sendgrid.com/api/v2/status.json

# Emails will queue until providers recover
# Verify queue is accepting jobs (not rejecting)
redis-cli -h $REDIS_HOST LLEN bull:email-notifications:waiting
# Should be increasing (emails queuing)

# DO NOT restart worker (will lose queued emails)

# Monitor for provider recovery
watch -n 60 'curl -s https://resend.com/api/status | jq .status'

# Once recovered, emails will auto-retry
```

**Communication:**
- Update status page: "Email system degraded - queuing emails for delivery"
- Estimate: "Emails will be sent once providers recover (usually <1 hour)"

---

### Scenario 3: Rate Limit Exceeded

```bash
# Check if rate limit exceeded
tail -n 100 /var/log/holi-api/error.log | grep -i "rate limit\|429"

# Resend rate limit: 10,000 emails/day (free tier) or custom
# SendGrid rate limit: Based on plan

# Solution 1: Wait for rate limit reset (usually 1 hour or 24 hours)

# Solution 2: Upgrade provider plan
# Resend: Upgrade to Pro plan
# SendGrid: Upgrade to higher tier

# Solution 3: Distribute load across both providers
# Modify queue logic to alternate providers
```

**Prevention:**
```typescript
// Add rate limit monitoring
const metrics = await getEmailQueueMetrics();
if (metrics.failed > 100) {
  alert('Email queue failure rate high - possible rate limit');
}
```

---

### Scenario 4: Invalid API Key

```bash
# Test API key validity
curl https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_API_KEY"
# Error 401: Invalid API key

# Rotate API key
# 1. Go to Resend dashboard > API Keys
# 2. Create new API key
# 3. Update environment variable
export RESEND_API_KEY="re_new_key_here"

# Restart application
pm2 restart api
doctl apps create-deployment <app-id>

# Verify new key works
curl https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

---

### Scenario 5: Domain Not Verified

```bash
# Check domain verification status
curl https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_API_KEY"

# If domain not verified, add DNS records:
# SPF: TXT @ "v=spf1 include:_spf.resend.com ~all"
# DKIM: TXT resend._domainkey "<provided-value>"

# Verify DNS propagation
dig TXT holilabs.xyz
dig TXT resend._domainkey.holilabs.xyz

# Wait for DNS propagation (5-30 minutes)
# Verify in Resend dashboard
```

---

### Scenario 6: Email Queue Worker Crashed

```bash
# Check worker status
pm2 list | grep email-worker

# If stopped, restart
pm2 restart email-worker

# If crashing repeatedly, check logs
pm2 logs email-worker --lines 100

# Common crash causes:
# - Redis connection lost
# - Out of memory
# - Unhandled exception in email processing

# Fix and restart
pm2 restart email-worker --watch
```

---

### Scenario 7: Redis Connection Lost

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# If down, check Redis server
ssh redis-server
systemctl status redis

# Restart Redis if needed
sudo systemctl restart redis

# Verify connection from application server
redis-cli -h $REDIS_HOST ping

# Restart email worker
pm2 restart email-worker
```

---

## Verification Steps

```bash
# 1. Send test email
curl -X POST https://api.holilabs.xyz/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email After Fix",
    "html": "<p>Test successful</p>"
  }'

# 2. Check email queue metrics
node -e "
const { getEmailQueueMetrics } = require('./src/lib/email/email-queue');
getEmailQueueMetrics().then(console.log);
"

# 3. Monitor failed job count (should stop increasing)
watch -n 10 'redis-cli -h $REDIS_HOST LLEN bull:email-notifications:failed'

# 4. Check recent successful deliveries
redis-cli -h $REDIS_HOST LRANGE bull:email-notifications:completed 0 5

# 5. Retry failed emails
node -e "
const { retryFailedEmail } = require('./src/lib/email/email-queue');
// Get failed job IDs and retry
redis-cli LRANGE bull:email-notifications:failed 0 -1
  .forEach(jobId => retryFailedEmail(jobId));
"

# 6. Check user reports
# Verify users are receiving emails again
```

---

## Post-Incident Actions

### 1. Analyze Failed Emails
```bash
# Export failed email jobs for analysis
redis-cli -h $REDIS_HOST LRANGE bull:email-notifications:failed 0 -1 > /tmp/failed-emails.json

# Count by failure reason
cat /tmp/failed-emails.json | jq '.error' | sort | uniq -c

# Identify affected users
cat /tmp/failed-emails.json | jq '.data.to' | sort | uniq > /tmp/affected-users.txt
```

### 2. Retry Failed Emails
```typescript
// Script: scripts/retry-failed-emails.ts
import { retryFailedEmail } from '@/lib/email/email-queue';

const failedJobIds = await getFailedJobIds();
for (const jobId of failedJobIds) {
  await retryFailedEmail(jobId);
  console.log(`Retried job ${jobId}`);
}
```

### 3. Update Monitoring
```yaml
# Add alerts for email queue depth
- alert: EmailQueueBacklog
  expr: bull_queue_waiting{queue="email-notifications"} > 100
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Email queue has {{ $value }} waiting jobs"

# Add alerts for failed job rate
- alert: EmailDeliveryFailureRateHigh
  expr: rate(bull_queue_failed_total{queue="email-notifications"}[5m]) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Email delivery failure rate high: {{ $value }}"
```

---

## Prevention

### Email Queue Health Monitoring

```typescript
// Add to monitoring dashboard
export async function getEmailQueueHealth() {
  const metrics = await getEmailQueueMetrics();

  return {
    healthy: metrics.failed < 10 && metrics.waiting < 100,
    backlog: metrics.waiting,
    failedLast5Min: metrics.failed,
    successRate: (metrics.completed / (metrics.completed + metrics.failed)) * 100,
  };
}
```

### Provider Health Checks

```typescript
// Periodic health check (every 5 minutes)
import { verifySendGridConfig } from '@/lib/email/sendgrid';

setInterval(async () => {
  const sendGridHealthy = await verifySendGridConfig();
  if (!sendGridHealthy) {
    logger.error('SendGrid health check failed');
    // Alert ops team
  }
}, 5 * 60 * 1000);
```

### Redundancy Configuration

```typescript
// Ensure both providers configured
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY not configured');
}
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY not configured');
}

// Test both providers on startup
await testEmailProvider('resend');
await testEmailProvider('sendgrid');
```

---

## Escalation

### Escalation Path
1. **0-15 min**: On-call engineer investigates
2. **15-30 min**: Escalate to DevOps lead if not resolved
3. **30+ min**: Escalate to CTO + Contact provider support

### Provider Support Contacts
- **Resend Support**: support@resend.com (Email) or Dashboard chat
- **SendGrid Support**: Premium support ticket (if applicable)
- **Redis Support**: Check managed Redis provider (Upstash, AWS ElastiCache)

---

## Related Runbooks
- [API Server Down](./api-server-down.md)
- [Performance Degradation](./performance-degradation.md)

---

## Changelog
- **2024-01-07**: Initial version created
