# Security Testing Guide

This guide provides comprehensive instructions for testing CORS, CSRF, security headers, and other security configurations in the Holi Labs application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [CORS Configuration Testing](#cors-configuration-testing)
3. [CSRF Protection Testing](#csrf-protection-testing)
4. [Security Headers Testing](#security-headers-testing)
5. [Rate Limiting Testing](#rate-limiting-testing)
6. [Mozilla Observatory Scan](#mozilla-observatory-scan)
7. [Automated Security Testing](#automated-security-testing)
8. [Continuous Security Monitoring](#continuous-security-monitoring)

---

## Prerequisites

### Required Tools

```bash
# Install required tools
brew install curl jq    # macOS
apt-get install curl jq # Ubuntu/Debian

# Optional: Install security testing tools
npm install -g @lhci/cli           # Lighthouse CI
npm install -g snyk                # Vulnerability scanning
```

### Environment Setup

```bash
# Set your application URL
export APP_URL="http://localhost:3000"  # Development
# export APP_URL="https://holilabs.com"  # Production

# Generate test credentials
export TEST_EMAIL="test@holilabs.com"
export TEST_PASSWORD="SecurePassword123!"
```

---

## CORS Configuration Testing

### Test 1: Verify Allowed Origins

```bash
# Test allowed origin (should succeed)
curl -i -X OPTIONS $APP_URL/api/patients \
  -H "Origin: https://holilabs.com" \
  -H "Access-Control-Request-Method: POST"

# Expected: 204 No Content with CORS headers
# ✅ Access-Control-Allow-Origin: https://holilabs.com
# ✅ Access-Control-Allow-Credentials: true
```

### Test 2: Verify Blocked Origins

```bash
# Test unauthorized origin (should be blocked)
curl -i -X OPTIONS $APP_URL/api/patients \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST"

# Expected: 204 No Content but WITHOUT Access-Control-Allow-Origin header
# ❌ No Access-Control-Allow-Origin header (blocked)
```

### Test 3: Verify Localhost is Blocked in Production

```bash
# Only test in production
curl -i -X OPTIONS https://holilabs.com/api/patients \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Expected: Localhost should be blocked in production
# ❌ No Access-Control-Allow-Origin header for localhost
```

### Test 4: Verify CORS Methods

```bash
# Test allowed methods
curl -i -X OPTIONS $APP_URL/api/patients \
  -H "Origin: https://holilabs.com" \
  -H "Access-Control-Request-Method: POST"

# Expected CORS headers:
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Request-ID, X-Access-Reason
# Access-Control-Max-Age: 86400
```

### Automated CORS Test Script

```bash
#!/bin/bash
# save as: scripts/test-cors.sh

echo "🔍 Testing CORS Configuration..."

# Test 1: Allowed origin
echo -e "\n1. Testing allowed origin (holilabs.com)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS $APP_URL/api/patients \
  -H "Origin: https://holilabs.com")

if [ "$RESPONSE" = "204" ]; then
  echo "✅ PASS: Allowed origin accepted"
else
  echo "❌ FAIL: Allowed origin rejected (HTTP $RESPONSE)"
fi

# Test 2: Unauthorized origin
echo -e "\n2. Testing unauthorized origin..."
HEADERS=$(curl -s -I -X OPTIONS $APP_URL/api/patients \
  -H "Origin: https://malicious-site.com")

if echo "$HEADERS" | grep -q "Access-Control-Allow-Origin"; then
  echo "❌ FAIL: Unauthorized origin was allowed"
else
  echo "✅ PASS: Unauthorized origin blocked"
fi

echo -e "\n✅ CORS tests completed"
```

---

## CSRF Protection Testing

### Test 1: Get CSRF Token

```bash
# Request CSRF token
curl -i -X GET $APP_URL/api/csrf

# Expected response:
# {
#   "success": true,
#   "token": "abc123...def456...1234567890"
# }
#
# Cookie: csrf-token=abc123...def456...1234567890; HttpOnly; Secure; SameSite=Strict
```

### Test 2: POST Request Without CSRF Token (Should Fail)

```bash
# Attempt POST without CSRF token (should be rejected)
curl -i -X POST $APP_URL/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Patient"}'

# Expected: 403 Forbidden
# {
#   "error": "CSRF token missing",
#   "message": "Missing CSRF token. Please refresh the page and try again.",
#   "code": "CSRF_TOKEN_MISSING"
# }
```

### Test 3: POST Request With Valid CSRF Token (Should Succeed)

```bash
# First, get CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt $APP_URL/api/csrf | jq -r '.token')

# Now make request with CSRF token
curl -i -X POST $APP_URL/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{"name":"Test Patient"}'

# Expected: 200 OK or 201 Created
```

### Test 4: POST Request With Invalid CSRF Token (Should Fail)

```bash
# Request with invalid token
curl -i -X POST $APP_URL/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: invalid-token-12345" \
  -d '{"name":"Test Patient"}'

# Expected: 403 Forbidden
# {
#   "error": "CSRF token invalid",
#   "code": "CSRF_TOKEN_INVALID"
# }
```

### Test 5: Verify CSRF Token Expiration

```bash
# Wait 25 hours (tokens expire after 24 hours)
# Or manually test with an expired token

curl -i -X POST $APP_URL/api/patients \
  -H "X-CSRF-Token: expired-token:signature:1234567890" \
  -d '{}'

# Expected: 403 Forbidden - Token expired
```

### Automated CSRF Test Script

```bash
#!/bin/bash
# save as: scripts/test-csrf.sh

echo "🛡️ Testing CSRF Protection..."

# Test 1: Get CSRF token
echo -e "\n1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c csrf-cookies.txt $APP_URL/api/csrf)
CSRF_TOKEN=$(echo $CSRF_RESPONSE | jq -r '.token')

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
  echo "✅ PASS: CSRF token generated successfully"
else
  echo "❌ FAIL: Failed to get CSRF token"
  exit 1
fi

# Test 2: Request without CSRF token (should fail)
echo -e "\n2. Testing request without CSRF token..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST $APP_URL/api/test \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$RESPONSE" = "403" ]; then
  echo "✅ PASS: Request blocked without CSRF token"
else
  echo "❌ FAIL: Request succeeded without CSRF token (HTTP $RESPONSE)"
fi

# Test 3: Request with valid CSRF token (may fail if route doesn't exist)
echo -e "\n3. Testing request with valid CSRF token..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST $APP_URL/api/csrf \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b csrf-cookies.txt \
  -d '{}')

# This may return 405 (Method Not Allowed) which is fine - it means CSRF passed
if [ "$RESPONSE" != "403" ]; then
  echo "✅ PASS: CSRF token validated (HTTP $RESPONSE)"
else
  echo "❌ FAIL: Valid CSRF token was rejected"
fi

# Cleanup
rm -f csrf-cookies.txt

echo -e "\n✅ CSRF tests completed"
```

---

## Security Headers Testing

### Manual Header Inspection

```bash
# Check all security headers
curl -I $APP_URL | grep -i "content-security-policy\|x-frame-options\|x-content-type-options\|strict-transport-security\|permissions-policy"

# Expected headers (production):
# ✅ Content-Security-Policy: default-src 'self'; ...
# ✅ X-Frame-Options: DENY
# ✅ X-Content-Type-Options: nosniff
# ✅ X-XSS-Protection: 1; mode=block
# ✅ Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# ✅ Referrer-Policy: no-referrer-when-downgrade
# ✅ Permissions-Policy: camera=(), microphone=(), ...
```

### Test Individual Headers

#### Content Security Policy (CSP)

```bash
curl -I $APP_URL | grep -i "content-security-policy"

# Expected:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

#### X-Frame-Options (Clickjacking Protection)

```bash
curl -I $APP_URL | grep -i "x-frame-options"

# Expected:
# X-Frame-Options: DENY
```

#### HSTS (HTTP Strict Transport Security)

```bash
# Only in production with HTTPS
curl -I https://holilabs.com | grep -i "strict-transport-security"

# Expected:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Permissions Policy

```bash
curl -I $APP_URL | grep -i "permissions-policy"

# Expected:
# Permissions-Policy: camera=(), microphone=(), geolocation=(self), ...
```

### Automated Security Headers Test Script

```bash
#!/bin/bash
# save as: scripts/test-security-headers.sh

echo "🔐 Testing Security Headers..."

HEADERS=$(curl -s -I $APP_URL)

# Test CSP
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  echo "✅ Content-Security-Policy: Present"
else
  echo "❌ Content-Security-Policy: Missing"
fi

# Test X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  echo "✅ X-Frame-Options: Present"
else
  echo "❌ X-Frame-Options: Missing"
fi

# Test X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  echo "✅ X-Content-Type-Options: Present"
else
  echo "❌ X-Content-Type-Options: Missing"
fi

# Test Referrer-Policy
if echo "$HEADERS" | grep -qi "referrer-policy"; then
  echo "✅ Referrer-Policy: Present"
else
  echo "❌ Referrer-Policy: Missing"
fi

# Test Permissions-Policy
if echo "$HEADERS" | grep -qi "permissions-policy"; then
  echo "✅ Permissions-Policy: Present"
else
  echo "❌ Permissions-Policy: Missing"
fi

# Test HSTS (production only)
if [[ $APP_URL == https://* ]]; then
  if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    echo "✅ Strict-Transport-Security: Present"
  else
    echo "⚠️  Strict-Transport-Security: Missing (required for production)"
  fi
fi

echo -e "\n✅ Security headers test completed"
```

---

## Rate Limiting Testing

### Test Auth Endpoint Rate Limiting

```bash
# Auth endpoints: 5 requests per 15 minutes
for i in {1..6}; do
  echo "Request $i:"
  curl -s -w "HTTP %{http_code}\n" -o /dev/null -X POST $APP_URL/api/auth/patient/magic-link/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  sleep 1
done

# Expected:
# Requests 1-5: HTTP 200
# Request 6: HTTP 429 (Too Many Requests)
```

### Test Registration Endpoint Rate Limiting

```bash
# Registration: 3 requests per hour
for i in {1..4}; do
  echo "Request $i:"
  curl -s -w "HTTP %{http_code}\n" -o /dev/null -X POST $APP_URL/api/auth/patient/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  sleep 1
done

# Expected:
# Requests 1-3: HTTP 200
# Request 4: HTTP 429
```

### Verify Rate Limit Headers

```bash
curl -i -X POST $APP_URL/api/auth/patient/magic-link/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected headers:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: 1234567890
```

---

## Mozilla Observatory Scan

### Online Scan

1. Visit https://observatory.mozilla.org/
2. Enter your production URL: `https://holilabs.com`
3. Click "Scan Me"

**Target Score: A+ or A**

### Expected Results

- **Content Security Policy**: A+
- **Cookies**: A+ (Secure, HttpOnly, SameSite)
- **Cross-origin Resource Sharing (CORS)**: A
- **HTTP Strict Transport Security (HSTS)**: A+
- **Redirection**: A+
- **Referrer Policy**: A+
- **Subresource Integrity**: A (if using CDNs)
- **X-Content-Type-Options**: A+
- **X-Frame-Options**: A+
- **X-XSS-Protection**: A+

### Common Issues and Fixes

| Issue | Fix |
|-------|-----|
| CSP too permissive | Remove `unsafe-inline`, `unsafe-eval` in production |
| Missing SameSite cookies | Set `sameSite: 'strict'` in production |
| HSTS not preloaded | Add `preload` directive and submit to hstspreload.org |
| Missing Subresource Integrity | Add SRI hashes to CDN scripts |

---

## Automated Security Testing

### Using OWASP ZAP

```bash
# Install OWASP ZAP
brew install --cask owasp-zap  # macOS

# Run baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t $APP_URL \
  -r zap-report.html

# Run full scan (more thorough)
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t $APP_URL \
  -r zap-full-report.html
```

### Using Lighthouse Security Audit

```bash
# Install Lighthouse
npm install -g lighthouse

# Run security audit
lighthouse $APP_URL \
  --only-categories=performance,accessibility,best-practices \
  --output=html \
  --output-path=./lighthouse-report.html

# Open report
open ./lighthouse-report.html
```

### Using npm audit

```bash
# Check for vulnerable dependencies
pnpm audit

# Fix vulnerabilities automatically
pnpm audit fix

# Generate detailed report
pnpm audit --json > audit-report.json
```

### Using Snyk

```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project
snyk monitor
```

---

## Continuous Security Monitoring

### GitHub Actions Workflow

Create `.github/workflows/security.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run npm audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'holilabs'
          path: '.'
          format: 'HTML'

      - name: Upload security reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: |
            dependency-check-report.html
            snyk-report.json
```

### Sentry Security Monitoring

Already configured in the application. Monitor:

- Failed authentication attempts
- CSRF token violations
- Rate limit exceeded events
- Suspicious API access patterns

View in Sentry dashboard: https://sentry.io

### Upstash Redis Monitoring

Monitor rate limiting metrics:

```bash
# View rate limit analytics
redis-cli -h your-redis.upstash.io -p 6379 -a your-token
> KEYS @ratelimit/*
> GET @ratelimit/auth:ip:1.2.3.4
```

---

## Security Checklist

Before deploying to production, verify:

### CORS
- [ ] No wildcard (`*`) origins in production
- [ ] All production domains in whitelist
- [ ] Localhost blocked in production
- [ ] Credentials only for whitelisted origins
- [ ] Proper preflight handling

### CSRF
- [ ] CSRF tokens generated and validated
- [ ] Double-submit cookie pattern implemented
- [ ] Tokens expire after 24 hours
- [ ] All POST/PUT/DELETE/PATCH routes protected
- [ ] Safe methods (GET/HEAD/OPTIONS) exempted

### Security Headers
- [ ] CSP configured (no `unsafe-inline`/`unsafe-eval` in prod)
- [ ] HSTS enabled with preload
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Permissions-Policy restrictive
- [ ] Cookies: Secure, HttpOnly, SameSite=Strict

### Rate Limiting
- [ ] Auth endpoints: 5/15min
- [ ] Registration: 3/hour
- [ ] Redis configured for production
- [ ] Rate limit headers included

### Monitoring
- [ ] Sentry error tracking enabled
- [ ] Security event logging configured
- [ ] Upstash Redis monitoring active
- [ ] Mozilla Observatory score A+

---

## Quick Test All Security Features

```bash
#!/bin/bash
# save as: scripts/test-all-security.sh

set -e

echo "🔒 Running Complete Security Test Suite..."

# Test CORS
echo -e "\n📋 Testing CORS..."
bash scripts/test-cors.sh

# Test CSRF
echo -e "\n📋 Testing CSRF..."
bash scripts/test-csrf.sh

# Test Security Headers
echo -e "\n📋 Testing Security Headers..."
bash scripts/test-security-headers.sh

# Test Rate Limiting
echo -e "\n📋 Testing Rate Limiting..."
# Add rate limit tests here

echo -e "\n✅ All security tests completed!"
echo "📊 Review results above for any failures"
echo "🌐 Run Mozilla Observatory scan: https://observatory.mozilla.org/"
```

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

## Support

For security concerns or questions:
- Email: security@holilabs.com
- Slack: #security channel
- Emergency: PagerDuty on-call rotation
