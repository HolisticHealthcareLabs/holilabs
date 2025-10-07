# Production Logging with Pino

## ✅ What Was Implemented

We've replaced all `console.log` statements with **Pino**, a production-grade structured logger that's 5x faster than alternatives and outputs JSON logs that are easy to search and analyze.

---

## 🎯 Benefits

### Before (console.log):
```typescript
console.log('User logged in');
console.error('Error:', error);
```
- **Problems:**
  - Hard to search ("which user?")
  - No context or metadata
  - Can't filter by severity
  - Not machine-readable

### After (Pino):
```typescript
logger.info({ userId: '123', email: 'user@example.com' }, 'User logged in');
logger.error(logError(error), 'Authentication failed');
```
- **Benefits:**
  - ✅ Structured data (searchable)
  - ✅ Request ID tracking
  - ✅ Performance metrics
  - ✅ JSON format (ready for log aggregators)
  - ✅ 5x faster than Winston

---

## 📖 How to Use

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Different log levels (in order of severity)
logger.trace('Very detailed debugging');     // Rarely used
logger.debug('Debugging information');       // Development
logger.info('General information');          // Production default
logger.warn('Warning message');              // Potential issues
logger.error('Error occurred');              // Errors
logger.fatal('Critical failure');            // Crashes
```

### Structured Data (Recommended)

```typescript
logger.info({
  userId: '123',
  action: 'create_patient',
  patientId: 'abc',
  duration: 45,
}, 'Patient created successfully');

// Output (JSON):
// {
//   "level": "info",
//   "time": "2025-10-06T22:03:11.000Z",
//   "userId": "123",
//   "action": "create_patient",
//   "patientId": "abc",
//   "duration": 45,
//   "msg": "Patient created successfully"
// }
```

### Error Logging

```typescript
import { logger, logError } from '@/lib/logger';

try {
  await createPatient(data);
} catch (error) {
  logger.error(logError(error), 'Failed to create patient');
}
```

### API Route Logging

```typescript
import { createApiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = createApiLogger(request);

  log.info('Fetching patients');

  // ... do work ...

  log.info({ count: patients.length }, 'Patients fetched');
  return Response.json(patients);
}
```

### Child Loggers (Request Context)

```typescript
import { createLogger } from '@/lib/logger';

const requestLogger = createLogger({
  requestId: 'abc-123',
  userId: '456',
  method: 'POST',
});

requestLogger.info('Processing request');
// All subsequent logs will include requestId, userId, method
```

### Performance Tracking

```typescript
import { logger, logPerformance } from '@/lib/logger';

const start = Date.now();

// ... do expensive operation ...

logger.info(
  logPerformance('database-query', start),
  'Query completed'
);

// Output includes: { operation: 'database-query', duration: 45 }
```

---

## 🔍 Where Logging Is Now Active

### ✅ Updated Files:
- `/src/lib/api/middleware.ts` - All API middleware (auth, rate limiting, errors)
- `/src/lib/supabase/middleware.ts` - Supabase session handling
- `/src/lib/prisma.ts` - Database connection and shutdown
- `/src/app/api/health/route.ts` - Health checks

### 📊 What Gets Logged:
- **API Requests:** Start, completion, duration, status code
- **Authentication:** Login attempts, failures
- **Rate Limiting:** When limits are exceeded
- **Errors:** Full stack traces with context
- **Database:** Connection issues, slow queries
- **Audit Logs:** All HIPAA-required events
- **Health Checks:** Status and latency

---

## 🎨 Log Formats

### Development (Pretty):
```
[22:03:11 UTC] INFO: User logged in successfully
    userId: "123"
    email: "test@example.com"
    action: "login"
```

### Production (JSON):
```json
{
  "level": "info",
  "time": "2025-10-06T22:03:11.000Z",
  "env": "production",
  "app": "holi-labs",
  "requestId": "abc-123-def",
  "userId": "123",
  "email": "test@example.com",
  "action": "login",
  "msg": "User logged in successfully"
}
```

---

## 🚀 Next Steps: Log Aggregation

Your logs are now **structured** and **production-ready**. To take full advantage:

### Option 1: BetterStack (Logtail) - $5/month
```bash
# 1. Sign up at betterstack.com/logtail
# 2. Get your source token
# 3. Add to .env:
LOGTAIL_SOURCE_TOKEN=your_token_here

# 4. Install Logtail transport:
pnpm add pino-logtail

# 5. Update src/lib/logger.ts to add transport
```

### Option 2: DigitalOcean Logs (Free)
DigitalOcean automatically collects stdout logs. View them in:
- **App Platform** → Your App → **Logs** tab
- Use search/filter to find specific events

### Option 3: Datadog/New Relic (Enterprise)
- Datadog: $15/host/month
- New Relic: $99/month
- Setup requires agent installation

---

## 🔍 How to Search Logs

### DigitalOcean UI:
1. Go to App Platform → Your App → **Logs**
2. Search for JSON fields:
   - `requestId:"abc-123"` - Find all logs for a request
   - `level:"error"` - Show only errors
   - `event:"rate_limit_exceeded"` - Find rate limit violations

### Command Line (if you have log access):
```bash
# Find all errors
cat logs.json | grep '"level":"error"'

# Find slow database queries
cat logs.json | grep '"event":"health_check"' | grep -E '"dbLatency":[0-9]{4}'

# Find requests from specific user
cat logs.json | grep '"userId":"123"'
```

---

## 📊 Log Levels - When to Use What

| Level | When to Use | Example |
|-------|-------------|---------|
| **trace** | Very detailed debugging | `logger.trace({ query }, 'Executing SQL query')` |
| **debug** | Development debugging | `logger.debug({ user }, 'User object constructed')` |
| **info** | Normal operations | `logger.info('Server started on port 3000')` |
| **warn** | Recoverable issues | `logger.warn('Database latency high')` |
| **error** | Errors that need attention | `logger.error('Failed to send email')` |
| **fatal** | Application crashes | `logger.fatal('Out of memory')` |

---

## 🎯 Best Practices

### ✅ DO:
```typescript
// Include context
logger.info({ userId, action, duration }, 'Action completed');

// Use consistent event names
logger.info({ event: 'user_login' }, 'User logged in');

// Log at start and end of operations
log.info('Starting operation');
// ... work ...
log.info({ duration }, 'Operation completed');
```

### ❌ DON'T:
```typescript
// Don't log sensitive data
logger.info({ password: 'secret123' }); // ❌ NEVER

// Don't log in tight loops (hurts performance)
for (let i = 0; i < 1000000; i++) {
  logger.debug(`Processing item ${i}`); // ❌ Too much
}

// Don't use console.log anymore
console.log('User logged in'); // ❌ Use logger.info instead
```

---

## 🧪 Testing

Run the test script to see logging in action:
```bash
pnpm tsx src/lib/__tests__/logger.test.ts
```

---

## 🔐 Security Considerations

### PII/PHI Data:
- **NEVER** log patient names, SSNs, or medical data directly
- Use patient IDs or tokenIds instead
- Redact sensitive fields before logging

```typescript
// ❌ BAD
logger.info({ patientName: 'John Doe', ssn: '123-45-6789' });

// ✅ GOOD
logger.info({ patientId: 'abc-123', tokenId: 'PT-abc' });
```

---

## 📞 Support

If you see unexpected behavior:
1. Check log level: `LOG_LEVEL=debug` in `.env`
2. Verify logs in DigitalOcean console
3. Run test script: `pnpm tsx src/lib/__tests__/logger.test.ts`

---

## 📈 Metrics to Monitor

Once logs are aggregated (BetterStack/Datadog), set up alerts for:
- **Error rate** > 1% of requests
- **API latency** p95 > 500ms
- **Database latency** > 100ms
- **Rate limit hits** > 10/hour
- **Failed logins** > 5 in 5 minutes

---

**🎉 You now have industry-grade structured logging!**
