# Rate Limiting Configuration
**API Protection & Abuse Prevention with Upstash Redis**

---

## Overview

Holi Labs implements rate limiting on all API endpoints to protect against:
- **Brute force attacks** (password guessing, authentication bypass)
- **Denial of Service (DoS)** attacks
- **Resource exhaustion** (database connections, CPU, memory)
- **API abuse** (automated scrapers, bots)
- **Account enumeration** (discovering valid usernames/emails)

**Technology:** [Upstash Redis](https://upstash.com/) with sliding window algorithm

**Location:** `/apps/web/src/lib/rate-limit.ts`

---

## Rate Limit Tiers

### Tier 1: Authentication & Security (STRICTEST)

**Purpose:** Prevent brute force attacks and account enumeration

#### 1. Authentication (`auth`)
- **Limit:** 5 requests per 15 minutes
- **Endpoints:**
  - `POST /api/auth/signin`
  - `POST /api/portal/auth/magic-link/verify`
  - `POST /api/portal/auth/otp/verify`
- **Rationale:** Failed login attempts are costly (bcrypt hashing) and indicate potential attack
- **429 Response:** Client must wait up to 15 minutes before retrying

**Example:**
```typescript
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limit
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse; // 429 Too Many Requests
  }

  // Continue with authentication
  // ...
}
```

---

#### 2. Registration (`registration`)
- **Limit:** 3 requests per hour
- **Endpoints:**
  - `POST /api/auth/register`
  - `POST /api/portal/auth/register`
- **Rationale:** Prevent mass account creation, spam signups, and resource abuse
- **429 Response:** Client must wait up to 1 hour before retrying

**Security Note:** Registration is rate-limited per IP address to prevent:
- Automated bot signups
- Fake account creation
- Email spam (registration confirmation emails)

---

#### 3. Password Reset (`passwordReset`)
- **Limit:** 3 requests per hour
- **Endpoints:**
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- **Rationale:** Prevent email bombing attacks and account enumeration
- **429 Response:** Client must wait up to 1 hour before retrying

**HIPAA Relevance:** Account enumeration can expose PHI (patient list discovery)

---

### Tier 2: Resource-Intensive Operations (MODERATE)

**Purpose:** Prevent resource exhaustion and protect infrastructure

#### 4. File Upload (`upload`)
- **Limit:** 10 requests per minute
- **Endpoints:**
  - `POST /api/upload`
  - `POST /api/patients/[id]/documents/upload`
  - `POST /api/lab-results/upload`
- **Rationale:** File uploads are expensive (storage, virus scanning, processing)
- **429 Response:** Client must wait up to 1 minute before retrying

**Additional Protection:**
- File size limit: 10MB per file (configured in `next.config.js`)
- Allowed MIME types: PDF, JPEG, PNG, DICOM
- Virus scanning via ClamAV (if enabled)

---

#### 5. Search (`search`)
- **Limit:** 20 requests per minute
- **Endpoints:**
  - `GET /api/patients/search`
  - `GET /api/search/patients`
  - `GET /api/search/semantic`
- **Rationale:** Search queries are expensive (database full-text search, semantic search via embeddings)
- **429 Response:** Client must wait up to 1 minute before retrying

**Performance Note:** Search endpoints query Meilisearch (fast) and PostgreSQL (slower)

---

#### 6. Messages (`messages`)
- **Limit:** 30 requests per minute
- **Endpoints:**
  - `POST /api/messages/send`
  - `POST /api/sms/send`
  - `POST /api/whatsapp/send`
- **Rationale:** Prevent SMS/email spam and control costs (Twilio, Resend charges per message)
- **429 Response:** Client must wait up to 1 minute before retrying

**Cost Protection:** Each SMS costs $0.0075-$0.04, email $0.001. Without rate limiting, abuse could cost thousands.

---

### Tier 3: General Application (STANDARD)

**Purpose:** Standard protection for normal application usage

#### 7. General API (`api`)
- **Limit:** 100 requests per minute
- **Endpoints:**
  - `GET /api/patients`
  - `GET /api/patients/[id]`
  - `POST /api/patients`
  - `PUT /api/patients/[id]`
  - `DELETE /api/patients/[id]`
  - Most other API endpoints
- **Rationale:** Balance usability with protection
- **429 Response:** Client must wait up to 1 minute before retrying

**Expected Usage:**
- Normal user: 10-20 requests/minute
- Power user: 30-50 requests/minute
- 100/min limit allows bursts without restricting legitimate use

---

#### 8. Appointments (`appointments`)
- **Limit:** 60 requests per minute
- **Endpoints:**
  - `GET /api/appointments`
  - `POST /api/appointments`
  - `PUT /api/appointments/[id]`
  - `DELETE /api/appointments/[id]`
- **Rationale:** Higher limit for frequently accessed scheduling features
- **429 Response:** Client must wait up to 1 minute before retrying

**Use Case:** Calendar views make multiple parallel requests (appointments, availability, conflicts)

---

## Rate Limit Algorithm

### Sliding Window

**How it works:**
```
Time:  0s    15s    30s    45s    60s
       |------|------|------|------|
Req:   1      2      3      4      5
       ✅     ✅     ✅     ✅     ✅   (5 requests in 60s window)

Time:  15s    30s    45s    60s    75s
       |------|------|------|------|
Req:         2      3      4      5      6
             ✅     ✅     ✅     ✅     ❌  (6th request rejected)
```

**Advantages:**
- ✅ Smooth rate limiting (no burst allowance)
- ✅ Fair distribution over time
- ✅ Prevents "burst then wait" gaming

**vs Fixed Window:**
```
Fixed Window (NOT USED):
00:00-01:00: 100 requests ✅
01:00-02:00: 100 requests ✅

Burst attack:
00:59:50 - 100 requests
01:00:10 - 100 requests
= 200 requests in 20 seconds! ❌
```

---

## Rate Limit Identifiers

### IP-Based Rate Limiting (Default)

**Used for:** Unauthenticated requests

**Identifier:** IP address extracted from headers

**Header Priority:**
1. `X-Forwarded-For` (first IP in list)
2. `X-Real-IP`
3. `"anonymous"` (if no IP headers)

**Example:**
```typescript
const forwarded = request.headers.get('x-forwarded-for');
const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
const identifier = `ip:${ip}`;
```

**Security:** Rate limits apply per IP address, not per session/cookie

---

### User-Based Rate Limiting (Authenticated)

**Used for:** Authenticated requests

**Identifier:** User ID from session

**Example:**
```typescript
const userId = session.user.id;
const identifier = `user:${userId}`;
```

**Advantage:** More accurate (users can't bypass by changing IP/VPN)

---

## 429 Response Format

### Response Body

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset": "2026-01-01T10:05:00.000Z",
    "retryAfter": 300
  }
}
```

**Fields:**
- **limit:** Maximum requests allowed in window
- **remaining:** Requests remaining in current window (always 0 when rate limited)
- **reset:** ISO timestamp when rate limit resets
- **retryAfter:** Seconds until rate limit resets (use for countdown)

---

### Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704110700000
Retry-After: 300
Content-Type: application/json
```

**Standard Headers:**
- **X-RateLimit-Limit:** Maximum requests in window
- **X-RateLimit-Remaining:** Requests remaining
- **X-RateLimit-Reset:** Unix timestamp (milliseconds) when limit resets
- **Retry-After:** Seconds to wait before retrying (RFC 6585)

**Client Implementation:**
```typescript
async function fetchWithRetry(url: string) {
  const response = await fetch(url);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

    console.log(`Rate limited. Retrying in ${retryAfter}s...`);

    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

    return fetchWithRetry(url); // Retry after waiting
  }

  return response;
}
```

---

## Configuration

### Environment Variables

**Required:**
```env
# Upstash Redis REST API
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Optional:**
```env
# Development mode (disable rate limiting)
NODE_ENV=development  # Rate limits disabled if Redis not configured
```

---

### Upstash Setup

**Step 1: Create Upstash Account**
1. Visit https://upstash.com/
2. Sign up (free tier: 10,000 requests/day)
3. Create new Redis database:
   - **Name:** holi-labs-rate-limiting
   - **Region:** US East 1 (or closest to your servers)
   - **TLS:** Enabled

**Step 2: Get Credentials**
1. Navigate to database details
2. Copy **REST URL** and **REST Token**
3. Add to `.env.local` (development) and `.env.production` (production)

**Step 3: Verify Setup**
```bash
# Test Redis connection
curl -X POST https://your-redis.upstash.io/set/test/value \
  -H "Authorization: Bearer your-token"

# Expected response: {"result":"OK"}
```

---

## Monitoring

### Upstash Dashboard

**Metrics Available:**
- Requests per second
- Cache hit rate
- Storage used
- Bandwidth used

**Access:** https://console.upstash.com/

---

### Prometheus Metrics

**Custom Metrics (Future):**
```typescript
// Increment rate limit counter
rateLimit429Counter.inc({
  limiter_type: 'auth',
  identifier: 'ip:203.0.113.1',
});

// Track rate limit duration
rateLimitDuration.observe({
  limiter_type: 'api',
}, duration);
```

**Alert Rules:**
```yaml
# High rate limit hits (potential attack)
- alert: HighRateLimitHits
  expr: rate(rate_limit_429_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate of 429 responses"
    description: "{{ $value }} 429s/sec. Possible DoS attack."
```

---

### CloudWatch Logs

**Rate Limit Events:**
```json
{
  "timestamp": "2026-01-01T10:00:00.000Z",
  "level": "warn",
  "event": "rate_limit_exceeded",
  "limiterType": "auth",
  "identifier": "ip:203.0.113.1",
  "limit": 5,
  "remaining": 0,
  "reset": 1704110700000
}
```

**Query (Athena):**
```sql
SELECT
  timestamp,
  identifier,
  limiterType,
  count(*) AS hit_count
FROM holilabs_logs.application_logs
WHERE event = 'rate_limit_exceeded'
  AND timestamp >= '2026-01-01'
GROUP BY timestamp, identifier, limiterType
ORDER BY hit_count DESC
LIMIT 100;
```

---

## Usage Examples

### Example 1: Protect Authentication Endpoint

```typescript
// apps/web/src/app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ route: '/api/auth/signin' });

export async function POST(request: NextRequest) {
  // Apply rate limit (5 per 15 minutes)
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    logger.warn({
      event: 'signin_rate_limited',
      ip: request.headers.get('x-forwarded-for'),
    });
    return rateLimitResponse;
  }

  // Continue with authentication
  try {
    const { email, password } = await request.json();

    // Verify credentials
    const user = await verifyCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Signin failed');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Example 2: Protect File Upload Endpoint

```typescript
// apps/web/src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  // Get user session
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Apply rate limit (10 per minute, user-based)
  const rateLimitResponse = await checkRateLimit(
    request,
    'upload',
    session.user.id  // Rate limit per user
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Continue with file upload
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Process upload
  // ...

  return NextResponse.json({
    success: true,
    fileId: uploadedFile.id,
  });
}
```

---

### Example 3: Protect Search Endpoint

```typescript
// apps/web/src/app/api/patients/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { searchPatients } from '@/lib/search';

export async function GET(request: NextRequest) {
  // Apply rate limit (20 per minute)
  const rateLimitResponse = await checkRateLimit(request, 'search');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get search query
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  // Perform search
  const results = await searchPatients(query);

  return NextResponse.json({
    success: true,
    results,
  });
}
```

---

## Bypassing Rate Limits (Admin/Internal)

### Internal API Calls

**Problem:** Internal server-to-server API calls shouldn't be rate limited.

**Solution:** Use service account or internal auth token

```typescript
// Internal API call (no rate limit)
export async function internalGetPatient(patientId: string) {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/patients/${patientId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`,
      'X-Internal-Request': 'true',
    },
  });

  return response.json();
}

// In API route:
export async function GET(request: NextRequest) {
  const isInternalRequest = request.headers.get('X-Internal-Request') === 'true';

  if (!isInternalRequest) {
    // Apply rate limit for external requests only
    const rateLimitResponse = await checkRateLimit(request, 'api');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // Continue...
}
```

---

### Admin Bypass (NOT RECOMMENDED)

**Discouraged:** Even admins should be rate limited to prevent abuse from compromised accounts.

**If necessary:**
```typescript
const session = await getServerSession();

if (session?.user?.role !== 'ADMIN') {
  const rateLimitResponse = await checkRateLimit(request, 'api');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
}
```

---

## Fail-Open Strategy

**Philosophy:** Availability > Security (in limited cases)

**Behavior:**
```typescript
// If Redis is down or unreachable, allow requests instead of blocking
if (!limiter) {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Rate limiting disabled (Redis not configured)');
    return { success: true };
  } else {
    logger.warn('Rate limiting not configured in production!');
    return { success: true };  // Fail-open
  }
}
```

**Rationale:**
- Redis outage shouldn't take down entire application
- Monitoring alerts when rate limiting is bypassed
- Alternative DDoS protection (Cloudflare, AWS Shield)

**Risk:**
- Vulnerable to attacks during Redis downtime
- Must have backup protection (WAF, IP blocking)

---

## Tuning Rate Limits

### How to Adjust Limits

**File:** `/apps/web/src/lib/rate-limit.ts`

**Example: Increase API limit to 200/min:**
```typescript
api: redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, '1 m'),  // Was 100
      analytics: true,
      prefix: '@ratelimit/api',
    })
  : null,
```

**Testing:**
```bash
# Load test endpoint
ab -n 250 -c 10 https://holilabs.xyz/api/patients

# Expected: 200 successful, 50 rate limited (429)
```

---

### When to Increase Limits

**Indicators:**
1. **High 429 rate for legitimate users** (> 5% of requests)
2. **User complaints** ("I can't load the page")
3. **Load testing shows bottleneck** (not database/CPU)

**Analysis:**
```sql
-- Count 429 responses vs total requests
SELECT
  COUNT(*) FILTER (WHERE status = 429) AS rate_limited,
  COUNT(*) AS total_requests,
  (COUNT(*) FILTER (WHERE status = 429)::float / COUNT(*)) * 100 AS rate_limit_percentage
FROM access_logs
WHERE timestamp >= now() - interval '1 hour';
```

**If > 10% requests are 429:** Increase limit or optimize frontend (reduce API calls)

---

### When to Decrease Limits

**Indicators:**
1. **DoS/DDoS attacks detected**
2. **Database connection pool saturation** (all requests slow)
3. **High server costs** (abuse driving up bills)

**Emergency Response:**
```typescript
// Temporarily decrease limit during attack
api: redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 m'),  // Was 100
      analytics: true,
      prefix: '@ratelimit/api',
    })
  : null,
```

**Block specific IPs:**
```typescript
// Add IP blocklist check before rate limit
const blockedIps = ['203.0.113.45', '198.51.100.67'];
const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0];

if (blockedIps.includes(clientIp)) {
  return NextResponse.json(
    { success: false, error: 'Access denied' },
    { status: 403 }
  );
}
```

---

## Troubleshooting

### Issue 1: Rate Limit Not Working

**Symptom:** Requests not rate limited, no 429 responses

**Diagnosis:**
```typescript
// Check if Redis is configured
console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL);
console.log('Limiter exists:', rateLimiters.api !== null);
```

**Possible Causes:**
1. **Redis not configured:** Missing environment variables
2. **Redis unreachable:** Network issue, wrong credentials
3. **Rate limit not applied:** Missing `checkRateLimit()` call in route

**Fix:**
```bash
# Verify environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test Redis connection
curl -X GET https://your-redis.upstash.io/ping \
  -H "Authorization: Bearer your-token"
```

---

### Issue 2: 429 Errors for Legitimate Users

**Symptom:** Users reporting "too many requests" during normal usage

**Diagnosis:**
```sql
-- Find users with high 429 rate
SELECT
  userId,
  COUNT(*) AS request_count,
  COUNT(*) FILTER (WHERE status = 429) AS rate_limited_count
FROM audit_logs
WHERE timestamp >= now() - interval '1 hour'
GROUP BY userId
HAVING COUNT(*) FILTER (WHERE status = 429) > 10
ORDER BY rate_limited_count DESC;
```

**Possible Causes:**
1. **Limit too low** for normal usage patterns
2. **Frontend making unnecessary requests** (polling, duplicate calls)
3. **Shared IP address** (office, VPN) hitting IP-based limit

**Fix:**
```typescript
// Option 1: Increase limit
api: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(150, '1 m'),  // Increased
  // ...
}),

// Option 2: Use user-based limiting instead of IP
const rateLimitResponse = await checkRateLimit(
  request,
  'api',
  session.user.id  // User-based, not IP-based
);
```

---

### Issue 3: Redis Connection Errors

**Symptom:** Logs show "Redis connection failed" errors

**Diagnosis:**
```bash
# Check Upstash status
curl https://status.upstash.com/

# Test connection
curl -X PING https://your-redis.upstash.io \
  -H "Authorization: Bearer your-token"
```

**Possible Causes:**
1. **Upstash outage** (rare)
2. **Invalid credentials** (rotated token)
3. **Network firewall** (blocking Upstash IPs)
4. **Rate limit exceeded** (Upstash free tier limit)

**Fix:**
```bash
# Regenerate Upstash token
# 1. Go to Upstash console
# 2. Database → REST API → Regenerate Token
# 3. Update .env.production

# Upgrade Upstash plan if hitting rate limits
# Free tier: 10,000 commands/day
# Pro tier: 1,000,000 commands/day
```

---

## Security Best Practices

### 1. Always Use HTTPS

**Problem:** Rate limit identifiers sent over HTTP can be intercepted

**Solution:** Enforce HTTPS (configured in `next.config.js`)

---

### 2. Don't Trust X-Forwarded-For Alone

**Problem:** X-Forwarded-For can be spoofed by clients

**Solution:** Use Cloudflare or AWS ALB (adds trusted CF-Connecting-IP header)

```typescript
// Trust Cloudflare's IP header
const ip =
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0] ||
  'anonymous';
```

---

### 3. Log Rate Limit Events

**Purpose:** Detect attacks, abuse patterns

**Implementation:**
```typescript
logger.warn({
  event: 'rate_limit_exceeded',
  limiterType: 'auth',
  identifier: 'ip:203.0.113.1',
  userAgent: request.headers.get('user-agent'),
  url: request.url,
});
```

**Alert Rule:**
```yaml
# Alert if single IP hits rate limit > 10 times in 5 minutes
- alert: RepeatRateLimitViolations
  expr: count_over_time({event="rate_limit_exceeded"} [5m]) > 10
  annotations:
    summary: "IP {{ $labels.identifier }} repeatedly hitting rate limits"
```

---

### 4. Combine with Other Security Measures

**Rate limiting is NOT enough alone. Use defense in depth:**
- ✅ WAF (Cloudflare, AWS WAF)
- ✅ IP blocklists (GeoIP, reputation services)
- ✅ CAPTCHA (Cloudflare Turnstile, hCaptcha)
- ✅ Email verification
- ✅ Multi-factor authentication

---

## Compliance

### HIPAA

**Rate limiting helps meet HIPAA requirements:**
- **§164.312(a)(1) - Access Control:** Rate limiting prevents unauthorized access attempts
- **§164.312(b) - Audit Controls:** Rate limit events are logged for auditing
- **§164.308(a)(1)(ii)(B) - Risk Management:** Rate limiting mitigates DoS risk

### LGPD/GDPR

**Data minimization:**
- Rate limits are stored in Redis with TTL (auto-delete after window)
- No personally identifiable information (PII) stored long-term
- IP addresses are hashed before storage (future enhancement)

---

## Checklist

### Initial Setup
- [ ] Upstash Redis account created
- [ ] Environment variables configured (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- [ ] Rate limiters configured in `/apps/web/src/lib/rate-limit.ts`
- [ ] All authentication endpoints protected
- [ ] All file upload endpoints protected
- [ ] Search endpoints protected

### Testing
- [ ] Load tested each rate limiter type
- [ ] Verified 429 responses include Retry-After header
- [ ] Tested fail-open behavior (Redis down)
- [ ] Verified user-based and IP-based limiting work correctly

### Monitoring
- [ ] CloudWatch logs capturing rate limit events
- [ ] Prometheus alerts configured for high 429 rate
- [ ] Upstash dashboard monitored for usage/costs

### Documentation
- [ ] All endpoint rate limits documented (this file)
- [ ] Frontend developers notified of rate limits
- [ ] Error handling guide created for clients

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Next Review:** 2026-04-03
**Owner:** Security Team & API Platform
