# Email Queue - Quick Start Guide

## 5-Minute Setup

### 1. Set Environment Variables

```bash
# Required
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"  # Fallback
FROM_EMAIL="noreply@holilabs.com"
```

### 2. Start Worker (Once at App Startup)

```typescript
// In your server initialization file
import { startEmailWorker } from '@/lib/email/email-queue';

const worker = startEmailWorker();
console.log('Email worker running');
```

### 3. Queue Emails (Anywhere in Your App)

```typescript
import { queueEmail } from '@/lib/email/email-queue';

// Simple email
const jobId = await queueEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello World</p>',
});

// High priority
await queueEmail({
  to: 'user@example.com',
  subject: 'Urgent',
  html: '<p>Important message</p>',
  priority: 'high', // processed first
});
```

That's it! Emails will be:
- Queued in Redis
- Retried automatically (3 attempts)
- Sent via Resend → SendGrid fallback
- Logged for monitoring

## Common Tasks

### Check Email Status

```typescript
import { getEmailJobStatus } from '@/lib/email/email-queue';

const status = await getEmailJobStatus(jobId);
console.log(status.state); // 'completed', 'failed', 'active', etc.
```

### Monitor Queue

```typescript
import { getEmailQueueMetrics } from '@/lib/email/email-queue';

const metrics = await getEmailQueueMetrics();
console.log(`Waiting: ${metrics.waiting}, Failed: ${metrics.failed}`);
```

### Retry Failed Email

```typescript
import { retryFailedEmail } from '@/lib/email/email-queue';

await retryFailedEmail('job-id-here');
```

## Priority Levels

```typescript
priority: 'high'    // Urgent (e.g., OTP, critical alerts)
priority: 'normal'  // Default (e.g., confirmations)
priority: 'low'     // Bulk (e.g., newsletters)
```

## Retry Logic

| Attempt | Provider | Delay |
|---------|----------|-------|
| 1 | Resend | 0s |
| 2 | Resend | 2s |
| 3 | SendGrid | 4s (fallback) |

Total: 3 attempts over ~6 seconds

## API Routes Example

```typescript
// app/api/send-email/route.ts
import { queueEmail } from '@/lib/email/email-queue';

export async function POST(request: Request) {
  const { to, subject, html } = await request.json();

  const jobId = await queueEmail({ to, subject, html });

  return Response.json({ success: true, jobId });
}
```

## Monitoring Endpoint

```typescript
// app/api/email-metrics/route.ts
import { getEmailQueueMetrics } from '@/lib/email/email-queue';

export async function GET() {
  const metrics = await getEmailQueueMetrics();
  return Response.json(metrics);
}
```

## Troubleshooting

**Problem:** Worker not processing jobs
```bash
# Check Redis
redis-cli ping  # Should return: PONG
```

**Problem:** Emails failing
```bash
# Verify API keys
echo $RESEND_API_KEY
echo $SENDGRID_API_KEY
```

**Problem:** Queue backing up
```typescript
// Increase concurrency in email-queue.ts
concurrency: 10  // from 5
```

## Files Reference

- `email-queue.ts` - Main queue implementation
- `sendgrid.ts` - SendGrid fallback provider
- `README.md` - Full documentation (498 lines)
- `example-usage.ts` - 10 code examples
- `IMPLEMENTATION_SUMMARY.md` - Technical details

## Full Documentation

See `README.md` for:
- Complete API reference
- Integration examples
- Testing guide
- Production checklist
- Performance tuning

## Migration from Direct Sending

Old code (direct):
```typescript
import { sendEmail } from '@/lib/email';
await sendEmail({ to, subject, html });
```

New code (queued):
```typescript
import { queueEmail } from '@/lib/email/email-queue';
await queueEmail({ to, subject, html });
```

**Note:** Both work! Migrate gradually.

## Key Benefits

- **Reliability:** 3 retries with fallback provider
- **Performance:** Non-blocking, async processing
- **Monitoring:** Built-in metrics and logging
- **Scalability:** Handle email spikes gracefully
- **Resilience:** Jobs survive server restarts (Redis)

---

**Need Help?** Check `README.md` or `example-usage.ts`
