# Incident Response Runbook: Redis Failure

**Alert:** `RedisDown` or `RedisConnectionFailed`
**Severity:** P2 (High) - Degraded service, not complete outage
**Alert Trigger:** Redis unreachable for > 2 minutes
**Impact:** Rate limiting disabled, session management degraded, cache miss
**MTTR Target:** < 30 minutes

---

## Service Impact

**Redis is used for:**

| Feature | Impact if Redis Down | Severity |
|---------|----------------------|----------|
| **Rate limiting** | No rate limiting - DDoS risk | HIGH |
| **Session storage** | Sessions fall back to database | MEDIUM |
| **Cache** | Cache miss - slower responses | MEDIUM |
| **Job queue** | Background jobs delayed | LOW |

**Platform remains operational but with degraded performance and security posture.**

---

## Immediate Actions (0-5 min)

### 1. Acknowledge Alert

- [ ] Acknowledge PagerDuty alert
- [ ] Post in Slack `#incidents`: "Acknowledged REDIS_FAILURE - investigating"
- [ ] Note current time: ____________

### 2. Verify Redis Status

**Quick connectivity test:**
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

**Possible outcomes:**

| Result | Diagnosis | Action |
|--------|-----------|--------|
| `PONG` | Redis accessible - false alarm | → Verify application connection |
| `Connection refused` | Redis down or network issue | → Step 3 |
| `Authentication failed` | Credentials issue | → Step 4 |
| Timeout | Redis overloaded or network partition | → Step 5 |
| `Could not connect` | DNS or connectivity issue | → Step 6 |

### 3. Assess Impact

**Check application health:**
```bash
curl https://holilabs.xyz/api/health | jq '.checks.redis'
# Expected: "connected"
# If "disconnected": Application detected Redis failure
```

**Verify fallback behavior:**
```bash
# Application should continue functioning
curl https://holilabs.xyz/api/health
# Expected: { "status": "degraded" } (not "unhealthy")
```

**Current traffic level:**
```bash
# Check Grafana for request rate
# High traffic + no rate limiting = DDoS risk
```

---

## Triage (5-15 min)

### 4. Check Upstash Redis Status

**Provider status page:**
- Visit: https://status.upstash.com/
- Look for: Service disruptions, maintenance windows, regional outages

**Dashboard health:**
```bash
# If using Upstash, check dashboard
# https://console.upstash.com/redis/<redis-id>

# Look for:
# - Database status: Active / Maintenance / Error
# - Connection count
# - Memory usage
# - Network connectivity
```

### 5. Check Redis Metrics

**Connection to Redis:**
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT --no-auth-warning info
```

**Key metrics to check:**

```bash
# Memory usage
redis-cli info memory | grep used_memory_human

# Connected clients
redis-cli info clients | grep connected_clients

# Operations per second
redis-cli info stats | grep instantaneous_ops_per_sec

# Rejected connections (out of memory)
redis-cli info stats | grep rejected_connections

# Evicted keys
redis-cli info stats | grep evicted_keys
```

**Alert thresholds:**
- Memory > 90%: Risk of OOM
- Connected clients > 10,000: Connection leak
- Rejected connections > 0: Memory pressure
- Evicted keys increasing rapidly: Cache thrashing

### 6. Check Application Connection Pool

**From application logs:**
```bash
doctl apps logs $APP_ID --type run | grep -i "redis" | tail -50

# Look for:
# - "Redis connection timeout"
# - "Redis connection refused"
# - "Too many clients"
# - "OOM command not allowed"
```

**Connection pool status:**
```bash
# Check application metrics endpoint
curl https://holilabs.xyz/api/health/metrics | jq '.redis'

# Expected:
# {
#   "connected": true,
#   "connections": 5,
#   "connectionErrors": 0,
#   "cacheHitRate": 0.85
# }
```

### 7. Check Network Connectivity

**DNS resolution:**
```bash
# Verify Redis hostname resolves
nslookup $REDIS_HOST

# Expected: Should return IP address
```

**Network path:**
```bash
# Test connectivity from application server
doctl compute ssh $DROPLET_ID -- "telnet $REDIS_HOST $REDIS_PORT"

# If fails: Network issue or firewall blocking
```

**Firewall rules:**
```bash
# Check if Redis is behind firewall
doctl compute firewall list

# Verify Redis port (6379 or 6380) is allowed
```

---

## Resolution Steps

### 8. Restart Redis Connection (Application Side)

**Restart application to reset connection pool:**
```bash
# Graceful restart
doctl apps create-deployment $APP_ID

# Monitor startup
doctl apps logs $APP_ID --type run --follow

# Look for: "Redis connected" or "Redis ready"
```

**Verify connection restored:**
```bash
curl https://holilabs.xyz/api/health | jq '.checks.redis'
# Expected: "connected"
```

### 9. Clear Redis Memory (if OOM)

**Check memory usage:**
```bash
redis-cli info memory | grep used_memory_human
redis-cli info memory | grep maxmemory_human
```

**If memory > 90%, flush least critical data:**

```bash
# Option 1: Flush cache keys only (safe)
redis-cli --scan --pattern "cache:*" | xargs redis-cli del

# Option 2: Flush all volatile keys (safe if using TTL)
redis-cli eval "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "session:*"

# Option 3: Flush all keys (⚠️ LAST RESORT - sessions will be lost)
redis-cli FLUSHALL
```

**After flushing:**
```bash
# Verify memory freed
redis-cli info memory | grep used_memory_percent

# Should be < 70% after flush
```

### 10. Scale Redis Instance (if underpowered)

**Upgrade plan (Upstash example):**
```bash
# Via Upstash console:
# 1. Go to https://console.upstash.com/redis/<redis-id>
# 2. Click "Scale" or "Upgrade Plan"
# 3. Select larger plan (more memory, more bandwidth)
# 4. Confirm upgrade (usually zero downtime)
```

**Verify upgrade:**
```bash
redis-cli info memory | grep maxmemory_human
# Should show new higher limit
```

### 11. Fix Credentials (if auth failed)

**Rotate Redis credentials:**
```bash
# Generate new password (Upstash)
# 1. Go to Upstash console
# 2. Security → Reset Password
# 3. Copy new password

# Update application environment variables
doctl apps update $APP_ID \
  --env UPSTASH_REDIS_REST_TOKEN=new-token-here

# Restart application
doctl apps create-deployment $APP_ID
```

**Verify new credentials:**
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $NEW_PASSWORD ping
# Expected: PONG
```

### 12. Enable Redis Fallback Mode

**If Redis cannot be restored quickly:**

**Update application to bypass Redis:**
```typescript
// Temporary code patch (emergency only)
// /apps/web/src/lib/api/middleware.ts

const redis: Redis | null = null; // Force fallback mode

// This disables:
// - Redis-based rate limiting (falls back to in-memory)
// - Redis caching (direct DB queries)
// - Redis session storage (database sessions)
```

**Deploy hotfix:**
```bash
git commit -am "Emergency: Bypass Redis for rate limiting"
gh workflow run deploy-production.yml
```

**⚠️ WARNING:** Fallback mode reduces performance and DDoS protection. Restore Redis ASAP.

---

## Verification (15-30 min)

### 13. Verify Redis Connectivity

**Connection test:**
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
# Expected: PONG
```

**Application health check:**
```bash
curl https://holilabs.xyz/api/health | jq '.checks.redis'
# Expected: "connected"
```

**Connection pool status:**
```bash
curl https://holilabs.xyz/api/health/metrics | jq '.redis'
# Expected: { "connected": true, "connectionErrors": 0 }
```

### 14. Test Rate Limiting

**Trigger rate limit:**
```bash
# Send 100 requests rapidly to rate-limited endpoint
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://holilabs.xyz/api/patients
done

# Expected: First 20 return 200, then 429 (rate limited)
# If all return 200: Rate limiting not working
```

**Verify rate limit key in Redis:**
```bash
redis-cli --scan --pattern "ratelimit:*"
# Should return rate limit keys
```

### 15. Test Session Management

**Create session:**
```bash
# Login to create session
curl -X POST https://holilabs.xyz/api/auth/login \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# Check if session stored in Redis
redis-cli --scan --pattern "session:*"
# Should return session keys
```

**Verify session persists:**
```bash
# Make authenticated request
curl -b cookies.txt https://holilabs.xyz/api/patients
# Expected: 200 OK (session valid)
```

### 16. Test Cache

**Check cache hit rate:**
```bash
# Make repeated requests to cached endpoint
for i in {1..10}; do
  curl -s https://holilabs.xyz/api/patients/123/context?accessReason=DIRECT_PATIENT_CARE \
    -H "Cookie: $SESSION_TOKEN" \
    -w "Time: %{time_total}s\n" \
    -o /dev/null
done

# Expected:
# First request: Slow (cache miss) ~200ms
# Subsequent requests: Fast (cache hit) ~15ms
```

**Check cache keys:**
```bash
redis-cli --scan --pattern "cache:*"
# Should return cache keys
```

---

## Communication

### Internal

**Slack `#incidents` updates:**

**Initial post (0-2 min):**
```
⚠️ INCIDENT: Redis Failure
Status: Investigating
Impact: Degraded service (no rate limiting, cache miss, slower responses)
Platform: Still operational
Updates: Every 10 minutes
```

**Progress updates:**
```
⏳ UPDATE: Redis Failure - 15 min elapsed
Status: [Root cause identified / Still investigating]
Impact: Rate limiting disabled - monitoring for DDoS
Action: [Current step]
ETA: [Updated estimate]
```

**Resolution post:**
```
✅ RESOLVED: Redis Failure
Duration: 22 minutes
Root cause: [Brief explanation]
Impact: No data loss, temporary performance degradation
Fix: [What was done]
Rate limiting: Restored
Cache: Rebuilding (will improve over next hour)
```

---

### External Communication

**< 30 min downtime:**
- No external communication (internal degradation only)

**> 30 min downtime OR user-visible impact:**
- [ ] Update status page: https://status.holilabs.xyz
  - "Investigating: Slower response times"
- [ ] Twitter/LinkedIn post (if significant impact)

---

## Post-Incident (24-48 hours)

### 17. Incident Report

**File:** `/docs/incidents/YYYY-MM-DD-redis-failure.md`

**Include:**
- Timeline of events
- Root cause analysis
- Performance impact metrics
- DDoS exposure window
- Actions taken
- Prevention measures

### 18. Performance Analysis

**Measure impact:**
```sql
-- Query response times during Redis outage
SELECT
  DATE_TRUNC('minute', timestamp) as minute,
  AVG((metadata->>'loadTimeMs')::int) as avg_response_ms,
  COUNT(*) as requests
FROM "UserBehaviorEvent"
WHERE eventType = 'CONTEXT_LOADED'
  AND timestamp BETWEEN '[outage_start]' AND '[outage_end]'
GROUP BY minute
ORDER BY minute;
```

**Expected:**
- Normal with Redis: 15-50ms (cache hit)
- During outage: 200-500ms (cache miss)

**Cache rebuild progress:**
```bash
# Monitor cache hit rate over time
watch -n 60 'curl -s https://holilabs.xyz/api/health/metrics | jq ".redis.cacheHitRate"'

# Expected recovery:
# 0 min: 0% (cache empty)
# 30 min: 30% (rebuilding)
# 2 hours: 70% (mostly rebuilt)
# 24 hours: 85% (normal)
```

### 19. Security Review

**DDoS exposure window:**
- No rate limiting from: ____________ to ____________
- Duration: ____________ minutes

**Check for abuse:**
```sql
-- Look for unusual request patterns during outage
SELECT
  "ipAddress",
  COUNT(*) as requests,
  COUNT(DISTINCT "resourceId") as unique_resources
FROM "AuditLog"
WHERE timestamp BETWEEN '[outage_start]' AND '[outage_end]'
  AND action = 'READ'
GROUP BY "ipAddress"
HAVING COUNT(*) > 1000
ORDER BY requests DESC;
```

**If abuse detected:**
- [ ] Block offending IPs
- [ ] Review for data exfiltration
- [ ] Document for security incident report

### 20. Prevention Measures

**Immediate actions:**
- [ ] Add Redis memory alerts (> 80%)
- [ ] Add connection pool alerts
- [ ] Add cache hit rate alerts (< 50%)
- [ ] Implement automatic Redis restart

**Long-term improvements:**
- [ ] Implement Redis cluster (high availability)
- [ ] Add read replicas
- [ ] Implement circuit breaker for Redis failures
- [ ] Cache warming scripts

**Monitoring improvements:**
```yaml
# /infra/monitoring/prometheus-alerts.yaml

- alert: RedisMemoryHigh
  expr: redis_memory_used_percent > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis memory usage > 80%"

- alert: RedisConnectionFailed
  expr: redis_up == 0
  for: 2m
  labels:
    severity: high
  annotations:
    summary: "Redis is unreachable"

- alert: RedisCacheHitRateLow
  expr: rate(redis_cache_hits[5m]) / rate(redis_cache_requests[5m]) < 0.5
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Cache hit rate dropped below 50%"
```

### 21. Rate Limiting Enhancements

**Implement multi-layer rate limiting:**

```typescript
// Primary: Redis (fast, distributed)
// Fallback: In-memory (per-instance, less accurate)
// Last resort: Database (slow but reliable)

async function checkRateLimit(key: string): Promise<boolean> {
  // Try Redis first
  try {
    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60); // 60-second window
      return count <= MAX_REQUESTS;
    }
  } catch (redisError) {
    logger.warn('Redis rate limit failed, using fallback', redisError);
  }

  // Fallback: In-memory
  try {
    return checkInMemoryRateLimit(key);
  } catch (memoryError) {
    logger.warn('In-memory rate limit failed, using database', memoryError);
  }

  // Last resort: Database
  return checkDatabaseRateLimit(key);
}
```

---

## Escalation

**If not resolved in 30 minutes:**
- [ ] Escalate to Senior Engineer
- [ ] Contact Upstash support (if using Upstash)
  - Email: hello@upstash.com
  - Twitter: @upstash

**If DDoS attack detected:**
- [ ] Activate DDoS protection (Cloudflare)
- [ ] Implement emergency rate limiting via WAF
- [ ] Consider temporary API lockdown

**If data loss suspected:**
- [ ] Notify users of session expiration
- [ ] Document impact for compliance

---

## Related Runbooks

- [API_SERVER_DOWN.md](./API_SERVER_DOWN.md) - If application also affected
- [DATABASE_FAILURE.md](./DATABASE_FAILURE.md) - If falling back to DB sessions

---

## Quick Reference

**Critical Commands:**
```bash
# Test Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Check memory
redis-cli info memory | grep used_memory_percent

# Check connections
redis-cli info clients | grep connected_clients

# Flush cache (safe)
redis-cli --scan --pattern "cache:*" | xargs redis-cli del

# Flush all (⚠️ sessions lost)
redis-cli FLUSHALL

# Restart application
doctl apps create-deployment $APP_ID

# Check application connection
curl https://holilabs.xyz/api/health | jq '.checks.redis'
```

**Key Metrics:**
- Memory usage: < 80%
- Cache hit rate: > 70%
- Connection errors: 0
- Response time: < 100ms

**Emergency Contacts:**
- Upstash Support: hello@upstash.com
- On-call: PagerDuty

---

**Last Updated:** 2026-01-01
**Next Review:** 2026-04-01
**Owner:** Platform Engineering Team
