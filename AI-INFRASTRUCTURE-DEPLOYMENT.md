# 🚀 AI Infrastructure Deployment Guide

## Overview

Your AI cost optimization infrastructure is ready for deployment to DigitalOcean with:
- **Gemini Flash 1.5** (primary, 97.9% cheaper than Claude)
- **Redis Caching** (Upstash integration)
- **Smart Routing** (auto-complexity detection)
- **Usage Tracking** (real-time cost monitoring)
- **Freemium Tiers** (FREE/STARTER/PRO/ENTERPRISE)

## 📋 Prerequisites

### ✅ What You Need:

1. **Google AI API Key** (Tier 1 - Paid)
   - Get from: https://aistudio.google.com/app/apikey
   - Tier 1 has higher rate limits than free tier
   - Cost: ~$0.001 per query with Gemini Flash

2. **Upstash Redis** (Already enabled)
   - Get credentials from: https://console.upstash.com/
   - Need: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

3. **Optional: Anthropic API Key** (Claude fallback)
   - Get from: https://console.anthropic.com/
   - Used for critical/complex queries only

4. **Optional: OpenAI API Key** (Secondary fallback)
   - Get from: https://platform.openai.com/api-keys
   - Last resort fallback

---

## 🔐 Environment Variables for DigitalOcean

Add these to your DigitalOcean App Platform environment variables:

```bash
# === AI PROVIDERS ===
GOOGLE_AI_API_KEY="your-tier-1-gemini-key"           # REQUIRED - Primary provider
ANTHROPIC_API_KEY="your-claude-key"                  # Optional - Fallback
OPENAI_API_KEY="your-openai-key"                     # Optional - Secondary fallback

# === REDIS CACHING (Upstash) ===
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"  # REQUIRED for caching
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"            # REQUIRED for caching

# === AI CONFIGURATION ===
AI_PRIMARY_PROVIDER="gemini"                          # Default: gemini (cheapest)
AI_FALLBACK_ENABLED="true"                            # Enable automatic fallback
AI_CACHE_ENABLED="true"                               # Enable Redis caching
AI_CACHE_TTL="86400"                                  # 24 hours cache
AI_RATE_LIMIT_PER_USER="50"                           # 50 queries/hour per user
MAX_CONCURRENT_AI_REQUESTS="10"                       # Prevent API saturation

# === FREEMIUM QUOTAS ===
AI_FREE_TIER_LIMIT="10"                               # FREE: 10 queries/day
AI_STARTER_TIER_LIMIT="50"                            # STARTER: 50 queries/day
AI_PRO_TIER_LIMIT="999999"                            # PRO: Unlimited
AI_ENTERPRISE_TIER_LIMIT="999999"                     # ENTERPRISE: Unlimited

# === COST MONITORING ===
AI_MONTHLY_BUDGET_USD="100"                           # Monthly budget alert
AI_ALERT_THRESHOLD_PERCENT="80"                       # Alert at 80% budget
```

---

## 🗄️ Database Migration

Run this on DigitalOcean after deployment:

```bash
# SSH into your DigitalOcean droplet or use the App Platform console
pnpm --filter web prisma migrate deploy
```

This will create 2 new tables:
1. **ai_usage_logs** - Tracks every AI query (cost, tokens, performance, cache hit/miss)
2. **subscription_tiers** - Manages user subscription tiers and quotas

---

## 🧪 Testing the AI Infrastructure

### Option 1: Use the Built-in Test Script

```bash
# After deployment, SSH into your app and run:
npx tsx test-ai-setup.ts
```

Expected output:
```
🧪 Testing Holi Labs AI Infrastructure
============================================================

📊 Test 1: Cost Comparison Between Providers
💰 AI Provider Cost Comparison (per 10k tokens):
  gemini     | $0.0019 | 97.9% cheaper
  claude     | $0.0900 | baseline
  openai     | $0.1000 | -11.1% cheaper

📦 Test 2: Redis Cache Health Check
✅ Redis cache is healthy
   - Total cached responses: 0
   - Estimated cache size: 0 MB

🔑 Test 3: Environment Variables
   GOOGLE_AI_API_KEY: ✅ Set
   ANTHROPIC_API_KEY: ✅ Set
   UPSTASH_REDIS_REST_URL: ✅ Set

✨ Summary
✅ Primary provider (Gemini) ready
✅ Redis caching enabled
💰 Estimated Monthly Cost: $18/month (90% savings)
```

### Option 2: Test via API Endpoint

You can test the AI infrastructure using the existing `/api/clinical-notes` or `/api/scribe` endpoints, or create a simple test endpoint.

#### Create Test Endpoint (Optional)

Create `/apps/web/src/app/api/ai/test/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { routeAIRequest } from '@/lib/ai/router';
import { cacheHealthCheck } from '@/lib/ai/cache';

export async function GET() {
  try {
    // 1. Check cache health
    const cacheHealth = await cacheHealthCheck();

    // 2. Test a simple AI query
    const testQuery = await routeAIRequest({
      messages: [
        {
          role: 'user',
          content: 'What is the recommended dosage of metformin for type 2 diabetes?'
        }
      ]
    });

    return NextResponse.json({
      success: true,
      cache: cacheHealth,
      testQuery: {
        success: testQuery.success,
        provider: testQuery.provider,
        message: testQuery.message?.substring(0, 200) + '...',
        usage: testQuery.usage,
        fromCache: testQuery.message?.includes('cached') || false,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

Then test with:
```bash
curl https://your-app.ondigitalocean.app/api/ai/test
```

---

## 📊 Cost Estimates

### With Gemini Flash + Redis Caching:

| Users | Queries/Month | Without Cache | With Cache (60% hit) | Savings |
|-------|---------------|---------------|----------------------|---------|
| 10    | 600           | $0.60         | $0.24                | 60%     |
| 50    | 3,000         | $3.00         | $1.20                | 60%     |
| 100   | 6,000         | $6.00         | $2.40                | 60%     |
| 500   | 30,000        | $30.00        | $12.00               | 60%     |
| 1000  | 60,000        | $60.00        | $24.00               | 60%     |

### Comparison to Claude-Only (Without Optimization):

| Scenario | Claude-Only | Gemini+Cache | Total Savings |
|----------|-------------|--------------|---------------|
| 100 users (6K queries/mo) | $180/mo | $2.40/mo | **98.7%** |
| 500 users (30K queries/mo) | $900/mo | $12/mo | **98.7%** |

---

## 🔍 Monitoring & Debugging

### Check Logs on DigitalOcean

Your AI infrastructure logs detailed information:

```
[AI Router] Routing simple query to gemini
[AI Cache] HIT - Key: ai:response:8baf...
[AI Usage] gemini | Tokens: 1234 | Cost: $0.0015 | Cache: HIT | Time: 234ms
```

### Key Metrics to Monitor:

1. **Cache Hit Rate** - Should be ~60% after a few days
2. **Average Cost per Query** - Should be $0.001-0.003
3. **Response Time** - Gemini: ~500ms, Cache: <50ms
4. **Provider Distribution** - Should be 80% Gemini, 20% Claude

### Common Issues:

**Issue: "Gemini not yet implemented"**
- ✅ FIXED - Full Gemini implementation is now live

**Issue: High costs**
- Check if Redis caching is working (`cacheHealthCheck()`)
- Verify `AI_PRIMARY_PROVIDER="gemini"` is set
- Check logs for fallback to Claude/OpenAI

**Issue: Rate limiting**
- Tier 1 Gemini has much higher limits than free tier
- Default: 50 queries/hour per user
- Adjust `AI_RATE_LIMIT_PER_USER` if needed

---

## 🚀 Deployment Checklist

### Pre-Deployment:
- [x] Prisma schema updated with AIUsageLog and SubscriptionTier models
- [x] Gemini Flash integration complete
- [x] Smart AI router implemented
- [x] Redis caching layer ready
- [x] Usage tracking system built
- [x] Environment variables documented

### During Deployment:
- [ ] Add all environment variables to DigitalOcean App Platform
- [ ] Deploy application
- [ ] Run database migration: `prisma migrate deploy`
- [ ] Test AI endpoint: `curl /api/ai/test`
- [ ] Verify cache health: Check logs for `[AI Cache] HIT`

### Post-Deployment:
- [ ] Monitor first 100 queries
- [ ] Verify cache hit rate increases over time
- [ ] Check actual costs in Google AI Studio
- [ ] Set up cost alerts in DigitalOcean

---

## 💡 Usage Examples

### Example 1: Using the Smart Router

```typescript
import { routeAIRequest } from '@/lib/ai/router';

// Automatically routes based on complexity
const response = await routeAIRequest({
  messages: [
    { role: 'user', content: 'Patient has chest pain and shortness of breath' }
  ]
});

// This will use Claude for critical medical decisions
// Output: { provider: 'claude', message: '...', usage: {...} }
```

### Example 2: Force a Specific Provider

```typescript
import { routeAIRequest } from '@/lib/ai/router';

// Use Gemini for cost-effective queries
const response = await routeAIRequest({
  messages: [
    { role: 'user', content: 'What is the normal range for blood glucose?' }
  ],
  provider: 'gemini'  // Force Gemini
});
```

### Example 3: Using the Cache Wrapper

```typescript
import { chatWithCache } from '@/lib/ai/cache';
import { chat } from '@/lib/ai/chat';

// Automatically caches responses for 24 hours
const response = await chatWithCache(
  { messages: [...], provider: 'gemini' },
  chat
);

// Second call with same query = instant cache hit!
```

---

## 📈 Expected Performance

### First Week:
- Cache hit rate: 10-20% (building cache)
- Average cost: $0.002/query
- 85% queries → Gemini, 15% → Claude

### After 2 Weeks:
- Cache hit rate: 40-50%
- Average cost: $0.0015/query
- 80% queries → Gemini, 20% → Claude

### After 1 Month:
- Cache hit rate: 60%+ (steady state)
- Average cost: $0.0012/query
- ~40% of responses served from cache (free!)

---

## 🎯 Success Criteria

✅ **Infrastructure Ready** when:
1. Test script passes all checks
2. Cache hit rate > 0%
3. Gemini queries working
4. Costs < $0.005/query

✅ **Production Ready** when:
1. Cache hit rate > 40%
2. Average response time < 1 second
3. Monthly costs match estimates
4. No API rate limit errors

---

## 🆘 Support

If you encounter issues:

1. Check test script output: `npx tsx test-ai-setup.ts`
2. Review logs for `[AI Router]`, `[AI Cache]`, `[AI Usage]` entries
3. Verify environment variables are set correctly
4. Check Google AI Studio dashboard for API usage
5. Verify Upstash Redis is connected (free tier works fine)

---

## 🎉 What's Next?

After successful deployment and testing:

1. **Monitor for 48 hours** - Watch cache hit rate increase
2. **Implement diagnosis assistant** - Use the new AI infrastructure
3. **Build cost dashboard** - Real-time cost monitoring UI
4. **Add pricing page** - Freemium tier enforcement
5. **Optimize further** - Fine-tune routing based on actual usage

---

**Estimated Time to Deploy:** 15-30 minutes
**Estimated Cost Savings:** 90-98% compared to Claude-only
**ROI:** Immediate (saves $160+/month with 100 users)
