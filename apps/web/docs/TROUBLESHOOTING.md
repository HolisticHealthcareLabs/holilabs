# Troubleshooting Guide

Common issues and their solutions for the Holi Labs platform.

## Development Issues

### 1. Pino Logger Worker Thread Errors

**Symptoms:**
```
Error: Cannot find module '/path/to/.next/server/vendor-chunks/lib/worker.js'
Error: the worker thread exited
Error: the worker has exited
```

**Root Cause:**
The `pino-pretty` transport uses worker threads which are incompatible with Next.js React Server Components (RSC) runtime in App Router.

**Status:**
Partially fixed in `src/lib/logger.ts` - main logger config now detects RSC context and disables pino-pretty automatically.

**Solution for Remaining Errors:**

If you still see these errors in specific files (like `src/lib/auth/magic-link.ts`), you have two options:

#### Option 1: Replace Logger with Console (Quick Fix)
```typescript
// Before:
import { logger } from '@/lib/logger';
logger.info({ event: 'magic_link_sent', email: user.email });

// After:
console.log('[INFO]', 'magic_link_sent', { email: user.email });
```

#### Option 2: Use Conditional Logging (Preferred)
```typescript
import { logger } from '@/lib/logger';

// Wrap logger calls in try-catch for RSC files
function safeLog(level: 'info' | 'error' | 'warn', data: any) {
  try {
    logger[level](data);
  } catch (error) {
    console[level]('[LOGGER ERROR]', data);
  }
}

// Usage:
safeLog('info', { event: 'magic_link_sent', email: user.email });
```

#### Option 3: Complete Pino-Pretty Removal
If errors persist, remove pino-pretty entirely:

```bash
pnpm remove pino-pretty
```

Then update `src/lib/logger.ts`:
```typescript
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  // Remove all transport configuration
};
```

**Files Known to Have Issues:**
- `src/lib/auth/magic-link.ts` (confirmed)
- Any file using `logger` in RSC context

**Why This Happens:**
Next.js App Router runs Server Components in a restricted Node.js environment that doesn't support worker threads. Pino-pretty spawns worker threads for formatting, which causes these errors.

---

### 2. Database Connection Errors

**Symptoms:**
```
Error: Can't reach database server
P1001: Can't reach database server at localhost:5432
```

**Solutions:**

1. **Check DATABASE_URL**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://user:password@host:5432/database
   ```

2. **Verify PostgreSQL is running**
   ```bash
   # macOS (Homebrew):
   brew services list | grep postgresql
   brew services start postgresql@15

   # Linux:
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

3. **Test connection manually**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Check firewall rules** (for remote databases)
   - Ensure port 5432 is open
   - Check cloud provider security groups

---

### 3. Build Failures

**Symptoms:**
```
Error: Build failed
Module not found
Type errors
```

**Solutions:**

1. **Clear build cache**
   ```bash
   rm -rf .next
   pnpm build
   ```

2. **Reinstall dependencies**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **Check for TypeScript errors**
   ```bash
   pnpm type-check
   ```

4. **Generate Prisma client**
   ```bash
   pnpm prisma generate
   ```

5. **Check environment variables**
   ```bash
   # Ensure all required variables are set
   cat .env.local
   ```

---

### 4. Rate Limiting Issues

**Symptoms:**
```
429 Too Many Requests
Rate limit exceeded
```

**During Development:**

If you're hitting rate limits during testing, temporarily disable or increase limits:

```typescript
// src/lib/rate-limit.ts
export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'), // Increase from 5 to 50
    prefix: '@ratelimit/auth',
  }),
};
```

Or set up bypass for localhost:
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // ... rest of middleware
}
```

**In Production:**

Rate limits are intentional. If legitimate users are hitting limits:
1. Review limits in `src/lib/rate-limit.ts`
2. Check for API abuse patterns
3. Consider implementing user-based (not IP-based) limits for authenticated endpoints

---

### 5. Sentry Warnings

**Symptoms:**
```
warn - It seems like you don't have a global error handler set up
```

**Solution:**

Already implemented in `src/app/global-error.tsx`, but Next.js may still show the warning. To suppress:

Add to `.env.local`:
```bash
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

---

### 6. Push Notification Failures

**Symptoms:**
```
Push notifications not configured
VAPID keys missing
410 Gone errors
```

**Solutions:**

1. **Generate VAPID keys**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Add to .env.local**
   ```bash
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="BDjeg3nfNw..."
   VAPID_PRIVATE_KEY="xKpw7F5..."
   VAPID_SUBJECT="mailto:admin@yourdomain.com"
   ```

3. **410 Gone errors** (subscription expired)
   - These are automatically handled - expired subscriptions are marked inactive
   - Users need to re-subscribe

4. **Check browser support**
   - Push API requires HTTPS (except localhost)
   - Not supported in private/incognito mode
   - Check browser compatibility

---

### 7. File Upload Issues

**Symptoms:**
```
Upload failed
File too large
CORS errors
```

**Solutions:**

1. **Check file size limits**
   ```typescript
   // src/lib/storage/cloud-storage.ts
   const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
   ```

2. **Verify cloud storage configuration**
   ```bash
   # Check R2/S3 credentials
   echo $R2_ENDPOINT
   echo $R2_BUCKET
   ```

3. **Test cloud storage connection**
   ```bash
   # Use AWS CLI to test S3/R2
   aws s3 ls s3://your-bucket --endpoint-url=$R2_ENDPOINT
   ```

4. **Check CORS configuration**
   - Ensure your domain is allowed in cloud storage CORS settings

---

### 8. Session/Authentication Issues

**Symptoms:**
```
Unauthorized
Session expired
Invalid token
```

**Solutions:**

1. **Check session secrets**
   ```bash
   # Ensure these are set and match across restarts
   echo $NEXTAUTH_SECRET
   echo $SESSION_SECRET
   ```

2. **Clear browser cookies**
   - Delete `next-auth.session-token` and `patient-session` cookies

3. **Verify database user exists**
   ```bash
   psql $DATABASE_URL -c "SELECT id, email FROM users WHERE email = 'user@example.com';"
   ```

4. **Check token expiration**
   - Patient sessions: 30 minutes inactivity timeout
   - "Remember Me": 30 days
   - Clinician sessions: 30 days (NextAuth default)

---

### 9. Health Check Failures

**Symptoms:**
```
503 Service Unavailable
Health check failed
Readiness probe failed
```

**Check Dependencies:**

1. **Database**
   ```bash
   curl http://localhost:3000/api/health/ready
   # Check "checks.database.status"
   ```

2. **Redis (if configured)**
   ```bash
   # Test Upstash connection
   curl -X GET $UPSTASH_REDIS_REST_URL/ping \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```

3. **Supabase**
   ```bash
   # Check Supabase status
   curl https://your-project.supabase.co/rest/v1/
   ```

---

### 10. Migration Errors

**Symptoms:**
```
Migration failed
Schema drift detected
```

**Solutions:**

1. **Check migration status**
   ```bash
   pnpm prisma migrate status
   ```

2. **Reset database** (development only)
   ```bash
   pnpm prisma migrate reset
   ```

3. **Deploy pending migrations**
   ```bash
   pnpm prisma migrate deploy
   ```

4. **Resolve conflicts**
   ```bash
   # If schema is out of sync
   pnpm prisma migrate resolve --applied "migration-name"
   ```

---

## Production Issues

### 1. High Error Rate

**Actions:**

1. **Check Sentry dashboard**
   - https://sentry.io/organizations/your-org/issues/

2. **Review recent deployments**
   ```bash
   doctl apps list-deployments YOUR_APP_ID
   ```

3. **Check logs**
   ```bash
   doctl apps logs YOUR_APP_ID --type=run --follow
   ```

4. **Rollback if needed**
   ```bash
   doctl apps create-deployment YOUR_APP_ID --deployment-id=PREVIOUS_ID
   ```

---

### 2. Performance Degradation

**Diagnosis:**

1. **Check Sentry Performance**
   - https://sentry.io/organizations/your-org/performance/

2. **Database slow queries**
   ```sql
   -- PostgreSQL slow query log
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **Add indexes if needed**
   ```bash
   pnpm prisma studio
   # Review query patterns and add indexes
   ```

---

### 3. High Memory Usage

**Actions:**

1. **Check metrics**
   ```bash
   curl http://localhost:3000/api/health/live
   ```

2. **Analyze memory usage**
   - Check `memory.heapUsed` and `memory.rss`

3. **Increase resources** (DigitalOcean)
   - Upgrade app plan if consistently high

---

### 4. Backup Failures

**Check backup logs:**
```bash
# Run manual backup to test
pnpm backup:daily

# Check S3/R2 for backups
aws s3 ls s3://your-bucket/database/ --endpoint-url=$R2_ENDPOINT
```

**Common issues:**
- Insufficient disk space
- Invalid cloud storage credentials
- Network connectivity

---

## Getting Help

### Logs to Collect

When reporting issues, provide:

1. **Application logs**
   ```bash
   doctl apps logs YOUR_APP_ID --type=run > logs.txt
   ```

2. **Build logs**
   ```bash
   doctl apps logs YOUR_APP_ID --type=build > build-logs.txt
   ```

3. **Health check status**
   ```bash
   curl https://your-app-url/api/health/ready > health.json
   ```

4. **Environment info**
   ```bash
   node --version
   pnpm --version
   cat package.json | grep '"version"'
   ```

### Support Resources

- **Documentation:** `/docs` folder
- **API Docs:** `docs/API_DOCUMENTATION.md`
- **Sentry:** https://sentry.io
- **DigitalOcean:** https://cloud.digitalocean.com/support

---

## Quick Reference Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm type-check             # Check TypeScript errors
pnpm lint                   # Run linter

# Database
pnpm prisma studio          # Open Prisma Studio GUI
pnpm prisma migrate dev     # Create and apply migration
pnpm prisma migrate deploy  # Apply pending migrations
pnpm db:seed                # Seed database

# Testing
pnpm test                   # Run tests
pnpm test:e2e               # Run E2E tests
pnpm test:e2e tests/smoke.spec.ts  # Run smoke tests

# Backup
pnpm backup                 # Run full backup
pnpm backup:daily           # Daily backup
pnpm backup:weekly          # Weekly backup
pnpm backup:monthly         # Monthly backup

# Health Checks
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health/ready
```
