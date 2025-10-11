# Upstash Redis Setup Guide

Quick setup guide for Upstash Redis rate limiting.

**Estimated Time:** 10 minutes

---

## What is Upstash Redis?

**Purpose:** Serverless Redis for rate limiting API requests

**Why we need it:** Protects your healthcare platform from:
- Brute force attacks
- API abuse
- DDoS attacks
- Excessive requests

**Rate limits implemented:**
- Authentication: 5 requests/minute
- File uploads: 10 requests/minute
- Messages: 30 requests/minute
- Search: 20 requests/minute
- General API: 100 requests/minute

---

## Step 1: Sign Up for Upstash

1. **Go to:** https://upstash.com/
2. **Click:** "Get Started" or "Sign Up"
3. **Sign up with:**
   - GitHub (recommended - fastest)
   - Google
   - Email

**Free Tier Includes:**
- 10,000 commands/day
- 256 MB storage
- Plenty for small to medium healthcare apps

---

## Step 2: Create Redis Database

### 2.1: Click "Create Database"

After logging in, you'll see the dashboard.

Click the big **"Create Database"** button.

### 2.2: Configure Database

**Database Settings:**
```
Name: holi-labs-ratelimit
Type: Regional (cheaper) or Global (faster, multi-region)
Region: Choose closest to your DigitalOcean app
  - Suggested: US East (Virginia) - us-east-1
  - Or: US West (Oregon) - us-west-1
Primary Region: (same as above)
TLS: Enabled (default - keep it)
```

**Recommendation:** Use **Regional** for now (free tier). Upgrade to Global later if needed.

### 2.3: Click "Create"

Wait ~30 seconds for database to provision.

---

## Step 3: Get REST API Credentials

### 3.1: View Database Details

After creation, click on your database name (`holi-labs-ratelimit`).

You'll see the database dashboard.

### 3.2: Find REST API Section

Look for **"REST API"** tab or section.

You'll see:
- **UPSTASH_REDIS_REST_URL**
- **UPSTASH_REDIS_REST_TOKEN**

### 3.3: Copy Credentials

**Click the copy buttons** for both:

1. **REST URL** - Something like:
   ```
   https://us1-promoted-hawk-12345.upstash.io
   ```

2. **REST Token** - Long base64 string:
   ```
   AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
   ```

### 3.4: Save Credentials

Add to your `~/holi-secrets.txt`:

```bash
# === UPSTASH REDIS (RATE LIMITING) ===
UPSTASH_REDIS_REST_URL=https://us1-promoted-hawk-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
```

---

## Step 4: Test Connection (Optional)

### 4.1: Test with curl

```bash
# Set your credentials
export UPSTASH_REDIS_REST_URL="your-rest-url"
export UPSTASH_REDIS_REST_TOKEN="your-rest-token"

# Test PING command
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected response:
# {"result":"PONG"}
```

### 4.2: Test SET command

```bash
# Set a test key
curl $UPSTASH_REDIS_REST_URL/set/testkey/hello \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected response:
# {"result":"OK"}
```

### 4.3: Test GET command

```bash
# Get the test key
curl $UPSTASH_REDIS_REST_URL/get/testkey \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected response:
# {"result":"hello"}
```

### 4.4: Clean up test key

```bash
# Delete test key
curl $UPSTASH_REDIS_REST_URL/del/testkey \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected response:
# {"result":1}
```

---

## Step 5: Add to DigitalOcean

### 5.1: Go to App Settings

1. **Navigate to:** https://cloud.digitalocean.com/apps
2. **Click:** Your app (holilabs-lwp6y)
3. **Go to:** Settings → App-Level Environment Variables
4. **Click:** Edit

### 5.2: Add Variables

Add these 2 environment variables:

```
UPSTASH_REDIS_REST_URL = [paste your REST URL]
UPSTASH_REDIS_REST_TOKEN = [paste your REST Token]
```

### 5.3: Save

Click **"Save"**

This will trigger a rebuild (~5-10 minutes).

---

## Step 6: Verify Rate Limiting Works

### 6.1: Wait for Deployment

Wait for DigitalOcean to finish rebuilding your app.

Check: https://cloud.digitalocean.com/apps → Your app → "Building" status

### 6.2: Test Rate Limiting

After deployment, test that rate limiting is working:

```bash
# Test auth endpoint (5 requests/minute limit)
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/auth/patient/magic-link/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done

# Expected: First 5 succeed (200/400), then 429 (rate limited)
```

### 6.3: Check Response Headers

Rate-limited responses include headers:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1728648000
Retry-After: 60
```

---

## Dashboard Overview

### Monitor Usage

1. Go to Upstash dashboard
2. Click on your database
3. View **"Metrics"** tab

You'll see:
- Commands per second
- Storage usage
- Bandwidth usage

### Set Up Alerts (Optional)

1. Go to **"Alerts"** tab
2. Create alert:
   ```
   Alert Name: High command rate
   Metric: Commands/second
   Threshold: 100
   Notification: Email
   ```

---

## Pricing & Limits

### Free Tier:
```
Commands: 10,000/day
Storage: 256 MB
Price: $0
```

### Pay-as-you-go (if you exceed free tier):
```
Commands: $0.20 per 100k commands
Storage: $0.25/GB/month
Global replication: +$0.20 per region
```

### Estimated Cost for Healthcare Platform:
```
Scenario: 1,000 patients, 100k API requests/day
- Commands: 100k/day × 30 days = 3M/month
- Cost: 3M commands × $0.20/100k = $6/month
```

**Very affordable!** 💰

---

## Rate Limit Configuration

Your rate limits are defined in `src/lib/rate-limit.ts`:

```typescript
export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    prefix: '@ratelimit/auth',
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
    prefix: '@ratelimit/upload',
  }),
  messages: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
    prefix: '@ratelimit/messages',
  }),
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
    prefix: '@ratelimit/search',
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    prefix: '@ratelimit/api',
  }),
};
```

**To adjust limits:** Edit the numbers in `src/lib/rate-limit.ts` and redeploy.

---

## Troubleshooting

### Error: "Connection refused"

**Solution:**
- Check UPSTASH_REDIS_REST_URL is correct
- Verify token is correct (no extra spaces)
- Try regenerating token in Upstash dashboard

### Error: "Unauthorized"

**Solution:**
- Regenerate REST token
- Copy it carefully (entire string)
- Update in DigitalOcean environment variables

### Rate limiting not working

**Solution:**
1. Check environment variables are set in DigitalOcean
2. Verify app has been rebuilt after adding variables
3. Check logs: `doctl apps logs YOUR_APP_ID --type=run`
4. Look for rate limit errors in logs

### "Too many requests" in development

**Solution:**

Temporarily disable rate limiting in development:

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

---

## Security Best Practices

### ✅ DO:
- Use TLS (enabled by default)
- Rotate tokens periodically (every 90 days)
- Monitor usage in dashboard
- Set up billing alerts
- Use different databases for dev/prod

### ❌ DON'T:
- Don't commit tokens to git
- Don't share tokens publicly
- Don't disable rate limiting in production
- Don't use same database for multiple apps

---

## Summary

**Your Upstash Redis credentials:**
```bash
UPSTASH_REDIS_REST_URL=[your-url]
UPSTASH_REDIS_REST_TOKEN=[your-token]
```

**Added to:**
- ✅ DigitalOcean environment variables

**Rate limits active:**
- ✅ Auth: 5/min
- ✅ Upload: 10/min
- ✅ Messages: 30/min
- ✅ Search: 20/min
- ✅ API: 100/min

**Next steps:**
- ✅ Test rate limiting after deployment
- ✅ Monitor usage in Upstash dashboard
- ✅ Adjust limits if needed

---

**Need Help?**
- Upstash Docs: https://docs.upstash.com/redis
- Your code: `src/lib/rate-limit.ts`
- Support: Upstash Discord

**Last Updated:** October 11, 2025
