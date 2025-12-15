# Security Quick Reference Guide

A developer-friendly guide for implementing security features in Holi Labs.

## Table of Contents

1. [CORS Protection](#cors-protection)
2. [CSRF Protection](#csrf-protection)
3. [Rate Limiting](#rate-limiting)
4. [Security Headers](#security-headers)
5. [Cookie Security](#cookie-security)
6. [Testing](#testing)

---

## CORS Protection

### Configuration Location
`/apps/web/src/lib/api/cors.ts`

### Allowed Origins
```typescript
// Production domains only (no wildcards!)
const ALLOWED_ORIGINS = [
  'https://holilabs.com',
  'https://www.holilabs.com',
  'https://app.holilabs.com',
  'https://holilabs.xyz',
  'http://localhost:3000', // Dev only (filtered in production)
];
```

### Usage in API Routes

#### Method 1: Using corsHeaders utility
```typescript
import { corsHeaders, handlePreflight } from '@/lib/api/cors';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Handle preflight
  const preflightResponse = handlePreflight(request);
  if (preflightResponse) return preflightResponse;

  // Your logic here
  const data = { message: 'Hello World' };

  // Apply CORS headers to response
  const response = NextResponse.json(data);
  const headers = corsHeaders(request);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}
```

#### Method 2: Automatic via Middleware
CORS headers are automatically applied by the global middleware for all routes.

### Testing CORS
```bash
# Test allowed origin
curl -i -X OPTIONS http://localhost:3000/api/patients \
  -H "Origin: https://holilabs.com"

# Expected: HTTP 204 with Access-Control-Allow-Origin header
```

---

## CSRF Protection

### Configuration Location
`/apps/web/src/lib/security/csrf.ts`

### How It Works
1. Client requests CSRF token from `/api/csrf`
2. Token is set in cookie and returned in response
3. Client includes token in `X-CSRF-Token` header for mutations
4. Server validates token using double-submit cookie pattern

### Automatic Protection (Middleware)
CSRF protection is automatically enforced by middleware for all POST/PUT/DELETE/PATCH requests.

**Exempt endpoints:**
- `/api/auth/*` (authentication endpoints)
- `/api/health/*` (health checks)
- `/api/cron/*` (cron jobs)
- `/api/webhooks/*` (webhooks)

### Usage in Client Code

#### React/Next.js
```typescript
// 1. Get CSRF token
const response = await fetch('/api/csrf');
const { token } = await response.json();

// 2. Include in mutation requests
const result = await fetch('/api/patients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
  },
  credentials: 'include', // Important: sends cookies
  body: JSON.stringify(patientData),
});
```

#### Using withCsrf helper
```typescript
import { withCsrf } from '@/lib/security/csrf';

const result = await fetch('/api/patients', withCsrf({
  method: 'POST',
  body: JSON.stringify(patientData),
}));
```

### Usage in API Routes (Manual Protection)

```typescript
import { withCsrfProtection } from '@/lib/security/csrf';

export const POST = withCsrfProtection(async (request: NextRequest) => {
  // CSRF token already validated
  const data = await request.json();

  // Your logic here
  return NextResponse.json({ success: true });
});
```

### Token Format
```
token:signature:expiresAt

Example:
abc123...def456:signature789...:1234567890000
│              │                │
│              │                └─ Expiration (Unix ms)
│              └─ HMAC-SHA256 signature
└─ Random token (32 bytes, 64 hex chars)
```

### Token Expiration
- **Validity**: 24 hours
- **Rotation**: New token on each `/api/csrf` request
- **Storage**: HttpOnly cookie (secure in production)

### Testing CSRF
```bash
# Get token
TOKEN=$(curl -s -c cookies.txt http://localhost:3000/api/csrf | jq -r '.token')

# Use token
curl -X POST http://localhost:3000/api/patients \
  -H "X-CSRF-Token: $TOKEN" \
  -b cookies.txt \
  -d '{"name":"Test"}'
```

---

## Rate Limiting

### Configuration Location
`/apps/web/src/lib/rate-limit.ts`

### Rate Limit Rules

| Endpoint Type | Limit | Window | Limiter Key |
|---------------|-------|--------|-------------|
| Authentication | 5 | 15 min | `auth` |
| Registration | 3 | 1 hour | `registration` |
| Password Reset | 3 | 1 hour | `passwordReset` |
| File Upload | 10 | 1 min | `upload` |
| Messages | 30 | 1 min | `messages` |
| Search | 20 | 1 min | `search` |
| General API | 100 | 1 min | `api` |

### Usage in API Routes

```typescript
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse; // Returns 429 if limit exceeded
  }

  // Your logic here
  return NextResponse.json({ success: true });
}
```

### Rate Limit Response Headers
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1234567890
Retry-After: 900
```

### Rate Limit Error Response
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "details": {
    "limit": 5,
    "remaining": 0,
    "reset": "2024-01-15T10:30:00.000Z",
    "retryAfter": 900
  }
}
```

### Testing Rate Limiting
```bash
# Test auth endpoint (5 requests per 15 min)
for i in {1..6}; do
  echo "Request $i:"
  curl -w "HTTP %{http_code}\n" \
    -X POST http://localhost:3000/api/auth/patient/magic-link/send \
    -d '{"email":"test@example.com"}'
done

# Expected: Requests 1-5 succeed, request 6 returns 429
```

---

## Security Headers

### Configuration Location
`/apps/web/src/lib/security-headers.ts`

### Automatic Application
Security headers are automatically applied by middleware to all responses.

### Headers Applied

#### Content Security Policy (CSP)
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' wss://localhost:*;
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

#### Other Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection (legacy)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` - HTTPS enforcement (production)
- `Referrer-Policy: no-referrer-when-downgrade` - Referrer control
- `Permissions-Policy: camera=(), microphone=(), ...` - Feature restrictions

### Testing Security Headers
```bash
curl -I http://localhost:3000 | grep -i "content-security-policy\|x-frame-options\|x-content-type-options"
```

---

## Cookie Security

### Secure Cookie Configuration

```typescript
response.cookies.set('cookie-name', value, {
  httpOnly: true,                                     // Prevents XSS
  secure: process.env.NODE_ENV === 'production',     // HTTPS only in prod
  sameSite: 'strict',                                 // CSRF protection
  maxAge: 60 * 60 * 24,                              // 24 hours
  path: '/',                                          // Available site-wide
});
```

### Cookie Attributes Explained

| Attribute | Purpose | When to Use |
|-----------|---------|-------------|
| `httpOnly` | Prevents JavaScript access | **Always** (prevents XSS) |
| `secure` | HTTPS only | **Production** (HTTP in dev) |
| `sameSite: strict` | Blocks cross-site requests | Session cookies |
| `sameSite: lax` | Allows top-level navigation | Less critical cookies |
| `maxAge` | Expiration time | All cookies |
| `path` | Cookie scope | Default: `/` |

### Example: Setting Session Cookie
```typescript
import { NextResponse } from 'next/server';

const response = NextResponse.json({ success: true });

response.cookies.set('session-token', sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: '/',
});

return response;
```

---

## Testing

### Quick Test All Security Features
```bash
# Run all security tests
cd apps/web
./scripts/test-all-security.sh

# Or test individually
./scripts/test-cors.sh
./scripts/test-csrf.sh
./scripts/test-security-headers.sh
```

### Mozilla Observatory Scan
1. Visit https://observatory.mozilla.org/
2. Enter your production URL
3. Target score: **A+ or A**

### SecurityHeaders.com Scan
1. Visit https://securityheaders.com/
2. Enter your production URL
3. Review recommendations

### Manual Testing Checklist

#### CORS
- [ ] Whitelisted origins accepted
- [ ] Unauthorized origins blocked
- [ ] Localhost blocked in production
- [ ] Credentials only for whitelisted origins

#### CSRF
- [ ] Token generation works
- [ ] Requests without token blocked
- [ ] Invalid tokens rejected
- [ ] Valid tokens accepted
- [ ] Tokens expire after 24 hours

#### Rate Limiting
- [ ] Auth endpoints limited to 5/15min
- [ ] Registration limited to 3/hour
- [ ] Rate limit headers present
- [ ] 429 response on limit exceeded

#### Security Headers
- [ ] CSP present and restrictive
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] HSTS enabled (production)
- [ ] Permissions-Policy restrictive

#### Cookies
- [ ] HttpOnly flag set
- [ ] Secure flag set (production)
- [ ] SameSite=Strict or Lax
- [ ] Appropriate expiration

---

## Common Issues and Solutions

### Issue: CORS error in browser console
```
Access to fetch at 'http://localhost:3000/api/patients' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Solution**: Add origin to `ALLOWED_ORIGINS` in `/apps/web/src/lib/api/cors.ts`

### Issue: CSRF token missing error
```json
{
  "error": "CSRF token missing",
  "code": "CSRF_TOKEN_MISSING"
}
```

**Solution**:
1. Fetch CSRF token from `/api/csrf`
2. Include token in `X-CSRF-Token` header
3. Include credentials in fetch: `credentials: 'include'`

### Issue: Rate limit exceeded
```json
{
  "error": "Too many requests. Please try again later.",
  "details": { "retryAfter": 900 }
}
```

**Solution**: Wait for the time specified in `retryAfter` (seconds) before retrying.

### Issue: Security headers not appearing
**Solution**: Check middleware configuration in `/apps/web/middleware.ts`

---

## Environment Variables

### Required for Security Features

```bash
# Session Secret (for CSRF signing)
SESSION_SECRET="your-session-secret"
NEXTAUTH_SECRET="your-nextauth-secret"

# CORS Origins
ALLOWED_ORIGINS="http://localhost:3000,https://holilabs.com"

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

### Generate Secrets
```bash
# Session Secret
openssl rand -hex 32

# API Keys
openssl rand -base64 32
```

---

## Additional Resources

- [Full Security Testing Guide](docs/SECURITY_TESTING.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

## Quick Commands

```bash
# Test all security features
./scripts/test-all-security.sh

# Test CORS
./scripts/test-cors.sh

# Test CSRF
./scripts/test-csrf.sh

# Test security headers
./scripts/test-security-headers.sh

# Check for vulnerabilities
pnpm audit

# Scan with OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

---

**Last Updated**: December 2024
**Maintained By**: Security Team
**Questions?**: security@holilabs.com
