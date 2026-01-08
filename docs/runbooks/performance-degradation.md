# Runbook: Performance Degradation

**Severity:** High (P1) - Affects user experience
**Expected Resolution Time:** 20-45 minutes
**On-Call Required:** Yes

---

## Symptoms

### What Users Report
- "The application is very slow"
- "Pages take forever to load"
- "API requests are timing out"
- "Dashboard not loading"

### What Monitoring Shows
- API response times elevated (p95 >2s, normal <500ms)
- High CPU usage (>80%)
- High memory usage (>85%)
- Database query times elevated
- Prometheus alert: `HighResponseTime`, `HighCPUUsage`, `HighMemoryUsage` firing
- Grafana showing degraded performance metrics
- APM traces showing slow queries or endpoints

---

## Immediate Actions (First 5 Minutes)

### 1. Acknowledge Incident
```bash
# Log incident start
echo "Performance degradation incident - $(whoami) - $(date)" >> /tmp/perf-incident.log

# Notify team
# Post to Slack: "🐌 P1: Performance degradation detected. Investigating."
```

### 2. Check High-Level Metrics
```bash
# Check API health and response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.holilabs.xyz/api/health

# curl-format.txt contents:
# time_total: %{time_total}s
# time_namelookup: %{time_namelookup}s
# time_connect: %{time_connect}s
# time_starttransfer: %{time_starttransfer}s

# Check DigitalOcean app metrics
doctl apps get <app-id> | grep -A 5 "Metrics"

# Check active requests
curl https://api.holilabs.xyz/api/metrics | grep http_requests_active
```

### 3. Quick Severity Assessment
```bash
# Determine impact level
# - All endpoints slow (>2s)? → CRITICAL
# - Specific endpoint slow? → HIGH
# - Minor slowdown (<1s)? → MEDIUM

# Check error rate (slow requests may be timing out)
curl https://api.holilabs.xyz/api/metrics | grep http_errors_total
```

---

## Diagnosis (5-15 Minutes)

### Check Application Server Resources

#### CPU Usage
```bash
# SSH to application server
ssh app-server

# Check overall CPU usage
top -bn1 | head -20

# Check per-process CPU usage
ps aux --sort=-%cpu | head -20

# Check Node.js processes specifically
ps aux | grep node | grep -v grep

# Check if CPU throttling is occurring (cloud providers)
doctl monitoring alert list
```

#### Memory Usage
```bash
# Check overall memory
free -h

# Check per-process memory
ps aux --sort=-%mem | head -20

# Check for memory leaks in Node.js
node --expose-gc -e "
const v8 = require('v8');
console.log(v8.getHeapStatistics());
"

# Check swap usage (high swap = memory pressure)
swapon --show
vmstat 1 5
```

#### Active Connections
```bash
# Check active HTTP connections
netstat -an | grep :3000 | wc -l

# Check connection states
netstat -an | grep :3000 | awk '{print $6}' | sort | uniq -c

# Check for connection leaks (many TIME_WAIT)
netstat -an | grep TIME_WAIT | wc -l
```

---

### Check Database Performance

#### Query Performance
```bash
# Check active queries and duration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
  FROM pg_stat_activity
  WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
  ORDER BY duration DESC
  LIMIT 20;
"

# Check for long-running queries (>5 seconds)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle';
"
```

#### Database Locks
```bash
# Check for blocking queries
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted;
"
```

#### Database Connection Pool
```bash
# Check connection pool usage
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    count(*) FILTER (WHERE state = 'active') AS active,
    count(*) FILTER (WHERE state = 'idle') AS idle,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    count(*) AS total
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol';
"

# Check max connections
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SHOW max_connections;"

# Calculate connection pool utilization
# If active + idle_in_transaction > 80% of max_connections, pool is exhausted
```

#### Database Cache Hit Rate
```bash
# Check cache hit rate (should be >95%)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
  FROM pg_statio_user_tables;
"

# If cache hit rate <95%, database may need more memory
```

---

### Check Specific Endpoints

#### Identify Slow Endpoints
```bash
# Check application logs for slow requests
tail -n 1000 /var/log/holi-api/access.log | awk '{if ($10 > 2000) print $7, $10}' | sort -k2 -nr | head -20
# Column 7: endpoint, Column 10: response time (ms)

# Or use Prometheus query
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=topk(10, http_request_duration_seconds{job="holi-api", quantile="0.95"})'

# Check for N+1 query problems (many queries for one request)
# Look for endpoints with high query count
grep -A 5 "prisma:query" /var/log/holi-api/app.log | grep "SELECT" | sort | uniq -c | sort -nr | head -10
```

#### Test Specific Endpoint
```bash
# Test slow endpoint directly
time curl -X POST https://api.holilabs.xyz/api/patients \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Patient",...}'

# Use Apache Bench for load testing
ab -n 100 -c 10 https://api.holilabs.xyz/api/health
# -n 100: 100 requests
# -c 10: 10 concurrent requests
```

---

### Check External Dependencies

#### Redis Performance
```bash
# Check Redis response time
redis-cli --latency
# Should be <1ms

# Check Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Check slow Redis commands
redis-cli SLOWLOG GET 10

# Check for large keys (can cause slowdowns)
redis-cli --bigkeys
```

#### Email Queue Performance
```bash
# Check email queue backlog
redis-cli LLEN bull:email-notifications:waiting

# Check if email worker is overloaded
redis-cli LLEN bull:email-notifications:active
# If active > 50, worker may be overloaded
```

#### External API Calls
```bash
# Check if external APIs are slow
# Resend
time curl -I https://api.resend.com/emails

# SendGrid
time curl -I https://api.sendgrid.com/v3/mail/send

# Twilio
time curl -I https://api.twilio.com/2010-04-01/Accounts

# Any call >500ms indicates external dependency slowdown
```

---

## Resolution Steps

### Scenario 1: High CPU Usage - Inefficient Code

**Symptoms:**
- CPU usage >80%
- Specific endpoint consistently slow
- High compute operations (data processing, encryption)

**Diagnosis:**
```bash
# Profile Node.js application
node --prof app.js
# Generates isolate-*.log

# Analyze profile
node --prof-process isolate-0x*.log > processed.txt
less processed.txt
# Look for functions consuming most CPU time

# Check for CPU-intensive operations in code
# Look for: large loops, complex regex, synchronous crypto operations
```

**Immediate Fix:**
```bash
# Restart application to clear any stuck processes
pm2 restart api

# Or redeploy
doctl apps create-deployment <app-id>
```

**Long-Term Fix:**
```typescript
// BAD: Synchronous encryption (blocks event loop)
function encryptData(data: string): string {
  return crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  // ❌ Blocks for ~100ms per call
}

// GOOD: Asynchronous encryption
async function encryptData(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(data, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

// BAD: N+1 query problem
for (const patient of patients) {
  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id }
  });
}

// GOOD: Use include to fetch related data in one query
const patients = await prisma.patient.findMany({
  include: { appointments: true }
});
```

---

### Scenario 2: Memory Leak

**Symptoms:**
- Memory usage steadily increasing
- Application crashes with "out of memory" errors
- Garbage collection taking longer

**Diagnosis:**
```bash
# Take heap snapshot
node --inspect app.js
# Connect Chrome DevTools to localhost:9229
# Memory > Take heap snapshot

# Or use heapdump package
npm install heapdump
# In code:
const heapdump = require('heapdump');
heapdump.writeSnapshot('/tmp/heap-' + Date.now() + '.heapsnapshot');

# Analyze with Chrome DevTools Memory Profiler
```

**Immediate Fix:**
```bash
# Restart application to free memory
pm2 restart api

# Increase memory limit temporarily
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart api
```

**Common Memory Leak Causes:**
```typescript
// BAD: Global event listeners not cleaned up
eventEmitter.on('data', (data) => {
  // This listener is never removed
});

// GOOD: Remove listeners when done
const listener = (data) => { /* ... */ };
eventEmitter.on('data', listener);
// Later:
eventEmitter.off('data', listener);

// BAD: Large objects in closures
function processData() {
  const largeArray = new Array(1000000).fill({...});
  return () => {
    // Closure keeps largeArray in memory forever
    console.log(largeArray.length);
  };
}

// GOOD: Only keep what you need
function processData() {
  const largeArray = new Array(1000000).fill({...});
  const length = largeArray.length;
  return () => {
    console.log(length); // largeArray can be garbage collected
  };
}
```

---

### Scenario 3: Database Query Performance

**Symptoms:**
- Specific queries taking >1 second
- Database CPU usage high
- Query timeout errors

**Diagnosis:**
```bash
# Enable query logging (PostgreSQL)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  ALTER DATABASE holi_protocol SET log_min_duration_statement = 1000;
  -- Log queries taking >1 second
"

# Check for missing indexes
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
  FROM pg_stats
  WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5
  ORDER BY n_distinct DESC;
"
# Tables with high n_distinct and low correlation may need indexes

# Use EXPLAIN ANALYZE to diagnose slow query
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  EXPLAIN ANALYZE
  SELECT * FROM \"Patient\"
  WHERE \"createdAt\" > '2024-01-01'
  ORDER BY \"createdAt\" DESC
  LIMIT 100;
"
# Look for: Seq Scan (bad), Index Scan (good), high cost
```

**Immediate Fix:**
```bash
# Add missing index
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  CREATE INDEX CONCURRENTLY idx_patient_createdat
  ON \"Patient\" (\"createdAt\" DESC);
"
# CONCURRENTLY prevents locking table during index creation

# Analyze table statistics
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  ANALYZE \"Patient\";
"
```

**Code-Level Optimization:**
```typescript
// BAD: Fetching unnecessary fields
const patients = await prisma.patient.findMany({
  // Fetches ALL fields including large JSONB fields
});

// GOOD: Select only needed fields
const patients = await prisma.patient.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    // Only fields you need
  },
});

// BAD: No pagination
const allPatients = await prisma.patient.findMany();
// Could return 100,000+ records

// GOOD: Always paginate
const patients = await prisma.patient.findMany({
  take: 50,
  skip: (page - 1) * 50,
});
```

---

### Scenario 4: Connection Pool Exhaustion

**Symptoms:**
- Errors: "Connection pool timeout"
- Database connections at max
- Requests queuing

**Immediate Fix:**
```bash
# Kill idle connections
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"

# Restart application
pm2 restart api
```

**Configuration Fix:**
```typescript
// Adjust Prisma connection pool
// DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"

// Or use PgBouncer for connection pooling
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true"
```

---

### Scenario 5: Redis Slowdown

**Symptoms:**
- Redis latency >10ms
- Session operations slow
- Queue operations delayed

**Diagnosis:**
```bash
# Check Redis slowlog
redis-cli SLOWLOG GET 20

# Common slow operations:
# - KEYS * (scans all keys)
# - Large HGETALL operations
# - SMEMBERS on large sets
```

**Immediate Fix:**
```bash
# Restart Redis (if not in production)
sudo systemctl restart redis

# Or flush problematic keys
redis-cli DEL large-key-name
```

**Code Fix:**
```typescript
// BAD: Scanning all keys (O(N) operation)
const keys = await redis.keys('session:*');
// ❌ Blocks Redis for large datasets

// GOOD: Use SCAN for iteration
const keys: string[] = [];
let cursor = '0';
do {
  const result = await redis.scan(cursor, 'MATCH', 'session:*', 'COUNT', 100);
  cursor = result[0];
  keys.push(...result[1]);
} while (cursor !== '0');

// BAD: Large hash retrieval
const session = await redis.hgetall('session:large-key');

// GOOD: Only get specific fields
const sessionData = await redis.hmget('session:large-key', 'userId', 'role');
```

---

### Scenario 6: External API Slowdown

**Symptoms:**
- Specific endpoints slow (those calling external APIs)
- Timeout errors
- External dependency response time >1s

**Immediate Fix:**
```bash
# Check if external API is down
curl -I https://api.external-service.com

# If down, enable circuit breaker or fallback
```

**Code-Level Solution:**
```typescript
// Implement circuit breaker pattern
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000, // 3 second timeout
  errorThresholdPercentage: 50, // Open circuit if >50% errors
  resetTimeout: 30000, // Try again after 30 seconds
};

const breaker = new CircuitBreaker(callExternalAPI, options);

breaker.fallback(() => {
  // Return cached data or default response
  return { status: 'degraded', data: cachedData };
});

// Use circuit breaker
const result = await breaker.fire({ userId: '123' });
```

---

### Scenario 7: Sudden Traffic Spike

**Symptoms:**
- All endpoints slow
- High request rate
- Server at capacity

**Immediate Actions:**
```bash
# Check request rate
curl https://api.holilabs.xyz/api/metrics | grep http_requests_total

# Check if legitimate traffic or DDoS
tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -20
# If single IP has >1000 requests, likely DDoS

# Enable rate limiting via Cloudflare
# Dashboard > Security > WAF > Rate Limiting Rules

# Scale up application (if legitimate traffic)
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    instance_count: 3  # Increase from 1 to 3
EOF
```

---

## Verification Steps

```bash
# 1. Check API response times (should return to <500ms)
for i in {1..10}; do
  curl -w "%{time_total}s\n" -o /dev/null -s https://api.holilabs.xyz/api/health
  sleep 1
done

# 2. Check CPU usage (should be <60%)
ssh app-server
top -bn1 | grep "Cpu(s)"

# 3. Check memory usage (should be <80%)
free -h

# 4. Check database query times
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    count(*) FILTER (WHERE (now() - query_start) > interval '1 second') AS slow_queries,
    count(*) AS total_queries
  FROM pg_stat_activity
  WHERE state = 'active';
"
# slow_queries should be 0

# 5. Check Grafana dashboards
# - API p95 latency <500ms
# - Database query time <100ms
# - Error rate <1%

# 6. Check user reports
# Verify users are no longer reporting slowness

# 7. Monitor for 30 minutes
watch -n 30 'curl -w "%{time_total}s\n" -o /dev/null -s https://api.holilabs.xyz/api/health'
```

---

## Post-Incident Actions

### 1. Identify Root Cause
```markdown
**Root Cause:** [e.g., Missing database index on Patient.createdAt column causing sequential scans]

**Why it happened:** [e.g., New query introduced in recent deployment that filters by createdAt without index]

**Fix applied:** [e.g., Added index: CREATE INDEX idx_patient_createdat ON "Patient" ("createdAt" DESC)]

**Preventive measures:** [e.g., Add query performance tests, enable slow query logging]
```

### 2. Update Monitoring
```yaml
# Add alert for specific issue
- alert: SlowQueryDetected
  expr: pg_stat_statements_mean_time_seconds{query=~".*Patient.*"} > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Slow database query detected: {{ $value }}s"

# Add dashboard panel for specific metric
# Grafana: Add panel for slow query count
```

### 3. Code Optimization
```typescript
// Document optimizations made
// Before: Sequential scan, 2.5s query time
// After: Index scan, 0.05s query time (50x improvement)
```

---

## Prevention

### Application-Level Prevention

```typescript
// 1. Always use select to limit fields
const patients = await prisma.patient.findMany({
  select: { id: true, firstName: true, lastName: true },
});

// 2. Always paginate
const patients = await prisma.patient.findMany({
  take: 50,
  skip: (page - 1) * 50,
});

// 3. Use dataloader to batch requests
import DataLoader from 'dataloader';

const appointmentLoader = new DataLoader(async (patientIds: string[]) => {
  const appointments = await prisma.appointment.findMany({
    where: { patientId: { in: patientIds } },
  });
  return patientIds.map(id => appointments.filter(a => a.patientId === id));
});

// 4. Implement caching
import { redis } from '@/lib/redis';

async function getPatient(id: string) {
  const cached = await redis.get(`patient:${id}`);
  if (cached) return JSON.parse(cached);

  const patient = await prisma.patient.findUnique({ where: { id } });
  await redis.setex(`patient:${id}`, 3600, JSON.stringify(patient));
  return patient;
}

// 5. Add request timeout
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second timeout

// 6. Use async operations
// Avoid blocking the event loop with synchronous operations
```

### Database-Level Prevention

```sql
-- Set query timeout
ALTER DATABASE holi_protocol SET statement_timeout = '30s';

-- Enable slow query logging
ALTER DATABASE holi_protocol SET log_min_duration_statement = 1000;

-- Enable auto-explain for slow queries
ALTER DATABASE holi_protocol SET auto_explain.log_min_duration = 1000;

-- Add common indexes
CREATE INDEX CONCURRENTLY idx_patient_createdat ON "Patient" ("createdAt" DESC);
CREATE INDEX CONCURRENTLY idx_appointment_date ON "Appointment" ("scheduledFor");
CREATE INDEX CONCURRENTLY idx_auditlog_timestamp ON "AuditLog" ("timestamp" DESC);

-- Analyze tables regularly (automated)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('analyze-tables', '0 2 * * *', 'ANALYZE;');
```

### Monitoring & Alerting

```yaml
# Prometheus alerts
groups:
  - name: performance
    interval: 30s
    rules:
      - alert: HighAPIResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API p95 response time high: {{ $value }}s"

      - alert: HighDatabaseQueryTime
        expr: pg_stat_statements_mean_time_seconds > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database query time high: {{ $value }}s"

      - alert: HighCPUUsage
        expr: process_cpu_percent > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU usage high: {{ $value }}%"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / process_max_memory_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage high: {{ $value | humanizePercentage }}"
```

### Load Testing

```bash
# Regular load testing (weekly)
# File: scripts/load-test.sh

#!/bin/bash
# Load test critical endpoints

# Test patient list endpoint
k6 run - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users for 3 minutes
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be <500ms
    http_req_failed: ['rate<0.01'],   // <1% error rate
  },
};

export default function () {
  const res = http.get('https://api.holilabs.xyz/api/patients', {
    headers: { 'Authorization': 'Bearer ${TEST_TOKEN}' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time <500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
EOF
```

---

## Escalation

### Escalation Path
1. **0-20 min**: On-call engineer investigates and applies immediate fixes
2. **20-40 min**: Escalate to Database Administrator if database-related
3. **40-60 min**: Escalate to Senior SRE + consider scaling infrastructure
4. **60+ min**: Escalate to CTO + engage cloud provider support

### When to Scale Infrastructure
- All optimizations applied but still slow
- Traffic legitimately increased beyond current capacity
- CPU/memory consistently >80% during normal operations

```bash
# Horizontal scaling (add more instances)
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    instance_count: 3  # Increase from 1
EOF

# Vertical scaling (bigger instances)
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    instance_size: professional-m  # Upgrade from basic
EOF
```

---

## Related Runbooks
- [API Server Down](./api-server-down.md)
- [Database Connection Failure](./database-connection-failure.md)

---

## Changelog
- **2024-01-07**: Initial version created
