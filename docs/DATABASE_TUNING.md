# Database Connection Pooling & Tuning Guide
**Production-Grade PostgreSQL Configuration with PgBouncer**

---

## Table of Contents

1. [Why Connection Pooling?](#why-connection-pooling)
2. [PgBouncer Architecture](#pgbouncer-architecture)
3. [Configuration Guide](#configuration-guide)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Performance Tuning](#performance-tuning)
6. [Troubleshooting](#troubleshooting)
7. [Disaster Recovery](#disaster-recovery)

---

## Why Connection Pooling?

### The Problem: Connection Exhaustion

**PostgreSQL Default Configuration:**
- **max_connections:** 100 (default)
- Each connection uses ~10MB RAM
- Creating connections is expensive (100-200ms)
- Closing connections triggers garbage collection

**Without Connection Pooling:**
```
100 concurrent Next.js requests
→ 100 PostgreSQL connections created
→ 1GB RAM used
→ Connection limit hit
→ New requests fail with "FATAL: sorry, too many clients already"
```

**With PgBouncer:**
```
200 concurrent Next.js requests
→ 200 pgBouncer client connections (lightweight)
→ 20 PostgreSQL server connections (reused)
→ 200MB RAM used
→ No connection failures
```

**Benefits:**
- ✅ Handle 10x more concurrent users with same database resources
- ✅ Faster query execution (no connection overhead)
- ✅ Lower memory usage
- ✅ Graceful degradation under load (queue requests instead of failing)

---

## PgBouncer Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Application (Multiple Processes/Containers)       │
│                                                             │
│  [Request 1]  [Request 2]  [Request 3] ... [Request 200]   │
│       │            │            │              │            │
└───────┼────────────┼────────────┼──────────────┼────────────┘
        │            │            │              │
        └────────────┴────────────┴──────────────┘
                     │
              ┌──────▼──────┐
              │  PgBouncer  │  (Connection Pooling Proxy)
              │             │
              │  200 Client │  MAX_CLIENT_CONN = 200
              │  Connections│
              │      ⬇      │
              │  20 Server  │  DEFAULT_POOL_SIZE = 20
              │  Connections│
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │  max_connections = 100
              │             │
              │  20 Active  │  (Only 20 used by pgBouncer)
              │  Connections│  (80 available for admin, backups)
              └─────────────┘
```

### Pool Modes

PgBouncer supports three pool modes:

#### 1. Transaction Mode (RECOMMENDED)

**Behavior:**
- Connection returned to pool **after each transaction**
- `BEGIN` ... `COMMIT` or `ROLLBACK` defines transaction boundary
- Connection available for next request immediately

**Pros:**
- ✅ Best connection reuse (highest efficiency)
- ✅ Lowest latency
- ✅ Handles high concurrency well

**Cons:**
- ❌ Cannot use session-level features:
  - Temporary tables (dropped after transaction)
  - Prepared statements (not persisted)
  - Advisory locks (released after transaction)
  - `SET` commands (not persisted)

**Use Case:** Web applications with short-lived transactions (Holi Labs = perfect fit)

**Current Configuration:**
```yaml
POOL_MODE: transaction
```

---

#### 2. Session Mode

**Behavior:**
- Connection returned to pool **when client disconnects**
- Full session state preserved
- Connection cannot be reused until client closes

**Pros:**
- ✅ Full PostgreSQL feature support (temp tables, prepared statements, etc.)

**Cons:**
- ❌ Poor connection reuse (1 connection per client session)
- ❌ Higher memory usage
- ❌ Not suitable for web apps (connections held for minutes)

**Use Case:** Long-running applications, admin scripts, ETL jobs

---

#### 3. Statement Mode

**Behavior:**
- Connection returned to pool **after each SQL statement**
- Multi-statement transactions NOT allowed

**Pros:**
- ✅ Maximum connection reuse

**Cons:**
- ❌ Cannot use transactions (breaks most ORMs)
- ❌ Cannot use prepared statements
- ❌ Not practical for real applications

**Use Case:** Read-only queries, simple SELECT statements

---

## Configuration Guide

### Current Configuration

Located in `/docker-compose.prod.yml`:

```yaml
pgbouncer:
  image: edoburu/pgbouncer:1.21.0
  environment:
    POOL_MODE: transaction

    # Connection Limits
    MAX_CLIENT_CONN: 200          # Total client connections pgBouncer accepts
    DEFAULT_POOL_SIZE: 20         # PostgreSQL connections per database
    MIN_POOL_SIZE: 5              # Minimum warm connections
    RESERVE_POOL_SIZE: 5          # Emergency pool
    MAX_DB_CONNECTIONS: 25        # Total PostgreSQL connections (hard limit)

    # Timeouts (seconds)
    SERVER_IDLE_TIMEOUT: 600      # Close idle server connections after 10 min
    SERVER_LIFETIME: 3600         # Close server connections after 1 hour
    SERVER_CONNECT_TIMEOUT: 15    # Timeout connecting to PostgreSQL
    QUERY_TIMEOUT: 30             # Max query execution time
    QUERY_WAIT_TIMEOUT: 120       # Max time to wait for connection from pool
    CLIENT_IDLE_TIMEOUT: 0        # Keep client connections open indefinitely
```

---

### Configuration Parameters Explained

#### MAX_CLIENT_CONN (200)

**Definition:** Maximum number of client connections pgBouncer will accept.

**Calculation:**
```
MAX_CLIENT_CONN = Expected Concurrent Users × Safety Factor

For Holi Labs:
- Expected concurrent users: 100
- Safety factor: 2x (handle traffic spikes)
- MAX_CLIENT_CONN = 100 × 2 = 200
```

**Tuning Guidelines:**
- **Too Low:** Clients get "connection refused" during traffic spikes
- **Too High:** Wastes memory (each connection uses ~50KB in pgBouncer)
- **Recommended:** 2-3x expected concurrent users

**When to Increase:**
- High traffic events (promotions, announcements)
- Multiple applications sharing same pgBouncer
- Connection refused errors in logs

---

#### DEFAULT_POOL_SIZE (20)

**Definition:** Number of server connections per database in the pool.

**Calculation:**
```
DEFAULT_POOL_SIZE = PostgreSQL max_connections × 0.2

For Holi Labs:
- PostgreSQL max_connections: 100
- Reserved for admin/backups: 20
- Available for application: 80
- DEFAULT_POOL_SIZE = 80 × 0.25 = 20
```

**Tuning Guidelines:**
- **Too Low:** Clients wait for connections (high QUERY_WAIT_TIMEOUT hits)
- **Too High:** PostgreSQL overload (high CPU, memory pressure)
- **Recommended:** 10-30 for web applications

**Formula:**
```
Optimal Pool Size = ((Core Count × 2) + Effective Spindle Count)

For 2-core CPU with SSD:
- Core Count: 2
- Effective Spindle Count: 1 (SSD = 1, HDD = spindles)
- Optimal = (2 × 2) + 1 = 5-10

Add buffer for async operations:
- Final: 5-10 × 2 = 10-20
```

---

#### MIN_POOL_SIZE (5)

**Definition:** Minimum number of server connections to keep warm.

**Purpose:**
- Avoid connection setup latency for first requests after idle
- Ensure fast response times even after low-traffic periods

**Tuning:**
- **Low Traffic:** MIN_POOL_SIZE = 2-5
- **High Traffic:** MIN_POOL_SIZE = DEFAULT_POOL_SIZE (always full)

---

#### RESERVE_POOL_SIZE (5)

**Definition:** Emergency connections when default pool is exhausted.

**Behavior:**
- Used only when DEFAULT_POOL_SIZE connections are in use
- Allows a few extra queries to complete during traffic spikes
- Prevents total connection starvation

**Tuning:**
- **Recommended:** 20-30% of DEFAULT_POOL_SIZE
- MIN_POOL_SIZE + RESERVE_POOL_SIZE should equal DEFAULT_POOL_SIZE

---

#### MAX_DB_CONNECTIONS (25)

**Definition:** Hard limit on total server connections to PostgreSQL.

**Calculation:**
```
MAX_DB_CONNECTIONS = DEFAULT_POOL_SIZE + RESERVE_POOL_SIZE

For Holi Labs:
- DEFAULT_POOL_SIZE: 20
- RESERVE_POOL_SIZE: 5
- MAX_DB_CONNECTIONS: 25
```

**Important:** Must be **less than** PostgreSQL `max_connections` to leave room for:
- Direct admin connections
- pg_dump backups
- Manual queries
- Monitoring tools

---

#### SERVER_IDLE_TIMEOUT (600 seconds = 10 minutes)

**Definition:** Close server connections idle for this duration.

**Purpose:**
- Free up PostgreSQL connections during low-traffic periods
- Reduce memory usage

**Tuning:**
- **Low Traffic Sites:** 300s (5 min) - aggressive cleanup
- **High Traffic Sites:** 3600s (1 hour) - keep connections warm
- **Current:** 600s (10 min) - balanced

---

#### SERVER_LIFETIME (3600 seconds = 1 hour)

**Definition:** Close server connections after this duration (even if active).

**Purpose:**
- Prevent memory leaks from long-lived connections
- Force connection reset (clears prepared statements, temp tables)

**Tuning:**
- **Recommended:** 3600-7200s (1-2 hours)
- **Do NOT set too low:** Causes connection churn, performance impact

---

#### QUERY_TIMEOUT (30 seconds)

**Definition:** Cancel queries running longer than this duration.

**Purpose:**
- Prevent long-running queries from hogging connections
- Detect slow queries, N+1 problems, missing indexes

**Tuning:**
- **Web Applications:** 10-30s (user-facing queries should be fast)
- **Background Jobs:** 300-600s (reports, exports allowed to be slow)
- **Current:** 30s (strict for HIPAA audit compliance)

**When Query Timeout Hits:**
```
[pgbouncer] closing because: query timeout (user=holi database=holi_protocol query_time=30)
```

**Action:**
1. Find slow query in logs
2. Add indexes, optimize query
3. Consider moving to background job if legitimate

---

#### QUERY_WAIT_TIMEOUT (120 seconds)

**Definition:** Max time client waits for connection from pool.

**Purpose:**
- Prevent indefinite waits when pool is exhausted
- Fail fast instead of hanging

**Scenario:**
```
- DEFAULT_POOL_SIZE: 20
- All 20 connections in use
- Request 21 arrives
- Waits up to 120 seconds for connection to free up
- If no connection available after 120s → Error: "pgbouncer cannot connect"
```

**Tuning:**
- **Too Low (< 30s):** False positives during traffic spikes
- **Too High (> 300s):** User waits forever, poor UX
- **Recommended:** 60-120s (current: 120s)

**When This Hits:**
- **Root Cause:** Pool size too small or long-running queries
- **Fix:** Increase DEFAULT_POOL_SIZE or optimize slow queries

---

#### CLIENT_IDLE_TIMEOUT (0 = disabled)

**Definition:** Close client connections idle for this duration.

**Current:** Disabled (0) - keep client connections open indefinitely

**Why Disabled:**
- Prisma ORM maintains persistent connection pool
- Closing client connections forces reconnection overhead
- Better to let application manage connection lifecycle

**When to Enable:**
- Misbehaving clients that leak connections
- Security requirement to close idle connections
- **Recommended:** 3600s (1 hour) if enabled

---

### PgBouncer vs Prisma Connection Pooling

#### Prisma Connection Pool (Default)

**Configuration (in Prisma schema):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection pool size (default: 20 per Prisma instance)
```

**Behavior:**
- Each Prisma instance (Next.js process) creates 20 connections
- 5 Next.js processes × 20 connections = 100 PostgreSQL connections
- Hits `max_connections` limit quickly

**Problem:**
```
[Serverless Function 1] → 20 PostgreSQL connections
[Serverless Function 2] → 20 PostgreSQL connections
[Serverless Function 3] → 20 PostgreSQL connections
[Serverless Function 4] → 20 PostgreSQL connections
[Serverless Function 5] → 20 PostgreSQL connections
────────────────────────────────────────────────────
Total: 100 connections (max_connections limit hit!)
```

---

#### PgBouncer + Prisma (Production Setup)

**Configuration:**
```env
# Development (direct connection)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Production (via pgBouncer)
DATABASE_URL=postgresql://user:pass@pgbouncer:5432/db?pgbouncer=true
```

**Behavior:**
- Each Prisma instance connects to pgBouncer (not PostgreSQL)
- pgBouncer aggregates all connections into 20 server connections
- No `max_connections` limit hit

**With PgBouncer:**
```
[Serverless Function 1] → pgBouncer (20 client connections)
[Serverless Function 2] → pgBouncer (20 client connections)
[Serverless Function 3] → pgBouncer (20 client connections)
[Serverless Function 4] → pgBouncer (20 client connections)
[Serverless Function 5] → pgBouncer (20 client connections)
                              ↓
                         100 client connections
                              ↓
                         20 server connections → PostgreSQL
────────────────────────────────────────────────────
Total PostgreSQL connections: 20 (under limit!)
```

---

## Monitoring & Alerts

### 1. PgBouncer Admin Console

**Access:**
```bash
# Connect to pgBouncer admin console
PGPASSWORD=your_password psql -h localhost -p 6432 -U holi -d pgbouncer

# Or via Docker
docker exec -it holi-pgbouncer-prod \
  psql -h localhost -U holi -d pgbouncer
```

**Useful Commands:**

#### SHOW POOLS

```sql
SHOW POOLS;
```

**Output:**
```
 database       | user | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait | pool_mode
----------------+------+-----------+------------+-----------+---------+---------+-----------+----------+---------+-----------
 holi_protocol  | holi |        45 |          0 |        18 |       2 |       0 |         0 |        0 |       0 | transaction
```

**Columns:**
- **cl_active:** Active client connections (queries in progress)
- **cl_waiting:** Clients waiting for connection from pool
- **sv_active:** Active server connections (queries running in PostgreSQL)
- **sv_idle:** Idle server connections (available in pool)
- **sv_used:** Server connections used recently (warmed up)
- **maxwait:** Longest time a client waited for connection (seconds)

**Alerts:**
- ⚠️ **cl_waiting > 0:** Pool exhausted, clients queued
- ⚠️ **maxwait > 30:** Clients waiting too long, increase pool size
- ⚠️ **sv_active + sv_idle near DEFAULT_POOL_SIZE:** Pool saturation

---

#### SHOW STATS

```sql
SHOW STATS;
```

**Output:**
```
 database       | total_xact_count | total_query_count | total_received | total_sent | total_xact_time | total_query_time | total_wait_time | avg_xact_time | avg_query_time | avg_wait_time
----------------+------------------+-------------------+----------------+------------+-----------------+------------------+-----------------+---------------+----------------+---------------
 holi_protocol  |          1245678 |           2345678 |    12345678901 | 9876543210 |       123456789 |        234567890 |          123456 |           99  |            100 |             0
```

**Metrics:**
- **total_xact_count:** Total transactions processed
- **total_query_count:** Total queries executed
- **avg_xact_time:** Average transaction duration (microseconds)
- **avg_query_time:** Average query duration (microseconds)
- **avg_wait_time:** Average time client waited for connection (microseconds)

**Alerts:**
- ⚠️ **avg_wait_time > 100ms:** Clients waiting too long, increase pool
- ⚠️ **avg_query_time > 500ms:** Slow queries, investigate

---

#### SHOW DATABASES

```sql
SHOW DATABASES;
```

**Output:**
```
 name           | host      | port | database       | force_user | pool_size | min_pool_size | reserve_pool | pool_mode   | max_connections | current_connections
----------------+-----------+------+----------------+------------+-----------+---------------+--------------+-------------+-----------------+---------------------
 holi_protocol  | postgres  | 5432 | holi_protocol  |            |        20 |             5 |            5 | transaction |              25 |                  18
```

**Metrics:**
- **current_connections:** Active PostgreSQL connections
- **pool_size:** DEFAULT_POOL_SIZE setting
- **max_connections:** MAX_DB_CONNECTIONS limit

---

#### SHOW CLIENTS

```sql
SHOW CLIENTS;
```

**Output:**
```
 type | user | database      | state  | addr           | port  | local_addr | local_port | connect_time        | request_time        | ptr         | link    | remote_pid
------+------+---------------+--------+----------------+-------+------------+------------+---------------------+---------------------+-------------+---------+------------
 C    | holi | holi_protocol | active | 172.18.0.5     | 45678 | 172.18.0.3 | 5432       | 2026-01-01 10:00:00 | 2026-01-01 10:00:05 | 0x55c8e8... | 0x55c.. |          0
 C    | holi | holi_protocol | idle   | 172.18.0.5     | 45679 | 172.18.0.3 | 5432       | 2026-01-01 09:55:00 | 2026-01-01 09:55:10 | 0x55c8e9... |         |          0
```

**States:**
- **active:** Client has query in progress
- **idle:** Client connected but no active query
- **waiting:** Client waiting for connection from pool

---

### 2. Prometheus Metrics

**PgBouncer Exporter:**
```yaml
# docker-compose.monitoring.yml
pgbouncer-exporter:
  image: prometheuscommunity/pgbouncer-exporter:latest
  environment:
    PGBOUNCER_HOST: pgbouncer
    PGBOUNCER_PORT: 5432
    PGBOUNCER_USER: holi
    PGBOUNCER_PASS: ${POSTGRES_PASSWORD}
  ports:
    - "9127:9127"
```

**Key Metrics:**
- `pgbouncer_pools_client_active` - Active client connections
- `pgbouncer_pools_client_waiting` - Clients waiting for connection
- `pgbouncer_pools_server_active` - Active server connections
- `pgbouncer_pools_server_idle` - Idle server connections
- `pgbouncer_stats_queries_pooled` - Queries served from pool
- `pgbouncer_stats_queries_duration_microseconds` - Query latency

---

### 3. Grafana Dashboard

**Create Dashboard:**
```json
{
  "title": "PgBouncer Connection Pool",
  "panels": [
    {
      "title": "Client Connections",
      "targets": [
        {
          "expr": "pgbouncer_pools_client_active",
          "legendFormat": "Active Clients"
        },
        {
          "expr": "pgbouncer_pools_client_waiting",
          "legendFormat": "Waiting Clients (ALERT IF > 0)"
        }
      ]
    },
    {
      "title": "Server Connections (PostgreSQL)",
      "targets": [
        {
          "expr": "pgbouncer_pools_server_active",
          "legendFormat": "Active"
        },
        {
          "expr": "pgbouncer_pools_server_idle",
          "legendFormat": "Idle"
        }
      ]
    },
    {
      "title": "Connection Wait Time",
      "targets": [
        {
          "expr": "rate(pgbouncer_stats_total_wait_time_microseconds[5m])",
          "legendFormat": "Wait Time (us)"
        }
      ]
    }
  ]
}
```

---

### 4. Alerts

**Prometheus Alert Rules:**
```yaml
# /infra/monitoring/prometheus-alerts.yaml
groups:
  - name: pgbouncer
    interval: 30s
    rules:
      # Pool Saturation
      - alert: PgBouncerPoolSaturated
        expr: pgbouncer_pools_client_waiting > 0
        for: 2m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "PgBouncer pool saturated"
          description: "{{ $value }} clients waiting for connection. Increase DEFAULT_POOL_SIZE."

      # High Connection Wait Time
      - alert: PgBouncerHighWaitTime
        expr: rate(pgbouncer_stats_total_wait_time_microseconds[5m]) > 100000
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Clients waiting too long for connections"
          description: "Average wait time: {{ $value }}us. Pool too small or slow queries."

      # Server Connection Limit
      - alert: PgBouncerServerConnectionsHigh
        expr: pgbouncer_pools_server_active + pgbouncer_pools_server_idle > 20
        for: 10m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Server connection count high"
          description: "{{ $value }} server connections in use. Approaching limit (25)."

      # Connection Pool Errors
      - alert: PgBouncerErrors
        expr: rate(pgbouncer_errors_total[5m]) > 1
        for: 2m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "PgBouncer errors detected"
          description: "{{ $value }} errors/sec. Check pgBouncer logs."
```

---

## Performance Tuning

### PostgreSQL Configuration

**File:** `/var/lib/postgresql/data/postgresql.conf`

```conf
# Connection Settings
max_connections = 100                  # Total connections allowed
shared_buffers = 256MB                 # RAM for caching (25% of total RAM)
effective_cache_size = 1GB             # RAM available for caching (75% of total RAM)
work_mem = 4MB                         # RAM per query operation
maintenance_work_mem = 64MB            # RAM for VACUUM, CREATE INDEX

# Query Performance
random_page_cost = 1.1                 # SSD (4.0 for HDD)
effective_io_concurrency = 200         # SSD (2 for HDD)

# Write-Ahead Log (WAL)
wal_level = replica                    # Enable replication
max_wal_size = 1GB                     # Max WAL size before checkpoint
min_wal_size = 80MB                    # Min WAL size
checkpoint_completion_target = 0.9     # Spread checkpoints over 90% of interval

# Logging (HIPAA Audit Requirement)
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'                  # Log all DML (INSERT, UPDATE, DELETE)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_duration = on                      # Log query duration
log_min_duration_statement = 1000      # Log slow queries (> 1 second)
```

**Apply Changes:**
```bash
# Restart PostgreSQL
docker restart holi-postgres-prod

# Or reload configuration without restart
docker exec holi-postgres-prod pg_ctl reload
```

---

### Index Optimization

**Find Missing Indexes:**
```sql
-- Find tables with high sequential scans (missing indexes)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;
```

**Find Unused Indexes:**
```sql
-- Find indexes never used (safe to drop)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
```

---

### Query Optimization

**Slow Query Log:**
```bash
# View slow queries (> 1 second)
docker exec holi-postgres-prod \
  psql -U holi -d holi_protocol -c "
    SELECT
      query,
      calls,
      total_time,
      mean_time,
      max_time
    FROM pg_stat_statements
    WHERE mean_time > 1000
    ORDER BY total_time DESC
    LIMIT 10;
  "
```

**Common Optimizations:**
1. **Add indexes** on frequently filtered/joined columns
2. **Use EXPLAIN ANALYZE** to understand query plans
3. **Avoid SELECT \***, select only needed columns
4. **Use prepared statements** (Prisma does this automatically)
5. **Batch operations** (INSERT multiple rows in one query)

---

## Troubleshooting

### Issue 1: Clients Waiting for Connections

**Symptom:**
```
pgbouncer_pools_client_waiting > 0
```

**Diagnosis:**
```sql
SHOW POOLS;
-- Check cl_waiting column
```

**Root Causes:**
1. **Pool too small:** DEFAULT_POOL_SIZE < concurrent queries
2. **Long-running queries:** Queries holding connections for too long
3. **Connection leaks:** Clients not releasing connections

**Fixes:**
```yaml
# Increase pool size
DEFAULT_POOL_SIZE: 30  # Was 20

# Decrease query timeout (fail fast)
QUERY_TIMEOUT: 15  # Was 30

# Find slow queries
docker exec holi-postgres-prod \
  psql -U holi -d holi_protocol -c "
    SELECT pid, query, state, state_change
    FROM pg_stat_activity
    WHERE state = 'active'
      AND state_change < now() - interval '10 seconds'
    ORDER BY state_change;
  "
```

---

### Issue 2: Connection Refused

**Symptom:**
```
Error: Connection refused
ECONNREFUSED 127.0.0.1:6432
```

**Diagnosis:**
```bash
# Check if pgBouncer is running
docker ps | grep pgbouncer

# Check pgBouncer logs
docker logs holi-pgbouncer-prod

# Test connection
psql -h localhost -p 6432 -U holi -d holi_protocol
```

**Root Causes:**
1. **MAX_CLIENT_CONN hit:** Too many simultaneous clients
2. **pgBouncer crashed:** Out of memory, misconfiguration
3. **Network issue:** Firewall blocking port 6432

**Fixes:**
```yaml
# Increase client connection limit
MAX_CLIENT_CONN: 300  # Was 200

# Check resource limits
docker stats holi-pgbouncer-prod

# Restart pgBouncer
docker restart holi-pgbouncer-prod
```

---

### Issue 3: Query Timeout

**Symptom:**
```
Error: Query timeout
pgbouncer: closing because: query timeout
```

**Diagnosis:**
```sql
-- Find long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '10 seconds'
ORDER BY duration DESC;
```

**Root Causes:**
1. **Missing index:** Sequential scan on large table
2. **N+1 query problem:** Fetching related records in loop
3. **Inefficient JOIN:** Joining large tables without indexes

**Fixes:**
```sql
-- Add index
CREATE INDEX CONCURRENTLY idx_patients_assigned_clinician
  ON patients(assigned_clinician_id)
  WHERE is_active = true;

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM patients WHERE assigned_clinician_id = 'clinician-123';

-- Kill long-running query
SELECT pg_terminate_backend(12345);  -- PID from pg_stat_activity
```

---

### Issue 4: Server Connection Limit

**Symptom:**
```
FATAL: sorry, too many clients already
```

**Diagnosis:**
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check max_connections
SHOW max_connections;

-- Find connection sources
SELECT client_addr, count(*)
FROM pg_stat_activity
GROUP BY client_addr
ORDER BY count(*) DESC;
```

**Root Cause:**
- Direct connections to PostgreSQL bypassing pgBouncer

**Fix:**
```yaml
# Ensure all applications use pgBouncer
DATABASE_URL: postgresql://user:pass@pgbouncer:5432/db

# Block direct PostgreSQL access (except localhost)
# In postgresql.conf:
listen_addresses = 'localhost,pgbouncer'
```

---

## Disaster Recovery

### Backup Strategy

**Automated Daily Backups:**
```bash
# Cron job (runs at 2 AM daily)
0 2 * * * /usr/local/bin/backup-database.sh
```

**Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh

set -e

BACKUP_DIR=/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/holi_protocol_$TIMESTAMP.sql.gz"

echo "[$(date)] Starting backup..."

# Dump database (via PostgreSQL, not pgBouncer)
docker exec holi-postgres-prod \
  pg_dump -U holi -d holi_protocol --clean --if-exists \
  | gzip > "$BACKUP_FILE"

# Verify backup
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date)] ERROR: Backup file is empty!"
  exit 1
fi

echo "[$(date)] Backup complete: $BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" s3://holilabs-backups/database/ \
  --server-side-encryption AES256

# Delete local backups older than 7 days
find "$BACKUP_DIR" -name "holi_protocol_*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup uploaded to S3 and old backups cleaned up"
```

---

### Restore Procedure

**Restore from Backup:**
```bash
#!/bin/bash
# /usr/local/bin/restore-database.sh

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

echo "[$(date)] Starting restore from: $BACKUP_FILE"

# Stop application (prevent writes during restore)
docker stop holi-web-prod

# Restore database
gunzip -c "$BACKUP_FILE" | \
  docker exec -i holi-postgres-prod \
  psql -U holi -d holi_protocol

# Verify restore
docker exec holi-postgres-prod \
  psql -U holi -d holi_protocol -c "SELECT count(*) FROM patients;"

# Restart application
docker start holi-web-prod

echo "[$(date)] Restore complete"
```

**Test Restore (Weekly):**
```bash
# Create test database
docker exec holi-postgres-prod \
  psql -U holi -c "CREATE DATABASE holi_protocol_test;"

# Restore to test database
gunzip -c /backups/holi_protocol_latest.sql.gz | \
  docker exec -i holi-postgres-prod \
  psql -U holi -d holi_protocol_test

# Verify data
docker exec holi-postgres-prod \
  psql -U holi -d holi_protocol_test -c "SELECT count(*) FROM patients;"

# Drop test database
docker exec holi-postgres-prod \
  psql -U holi -c "DROP DATABASE holi_protocol_test;"
```

---

## Checklist

### Initial Setup

- [ ] PgBouncer added to `docker-compose.prod.yml`
- [ ] Application `DATABASE_URL` updated to use pgBouncer
- [ ] PostgreSQL `max_connections` set to 100+
- [ ] PgBouncer pool sizes configured (DEFAULT_POOL_SIZE, MAX_CLIENT_CONN)
- [ ] Health check verified (`docker-compose up -d`)

### Monitoring

- [ ] Prometheus pgBouncer exporter deployed
- [ ] Grafana dashboard created
- [ ] Alerts configured (pool saturation, wait time, errors)
- [ ] PagerDuty integration tested

### Performance

- [ ] PostgreSQL `shared_buffers` tuned (25% of RAM)
- [ ] Slow query logging enabled (log_min_duration_statement = 1000)
- [ ] Indexes created on frequently queried columns
- [ ] Connection pool metrics monitored

### Disaster Recovery

- [ ] Daily backups automated (cron job)
- [ ] Backups uploaded to S3 with encryption
- [ ] Restore procedure tested (weekly dry run)
- [ ] Restore time < 1 hour (RTO)
- [ ] Backup retention: 30 days local, 6 years S3

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Next Review:** 2026-04-03
**Owner:** Platform Engineering & Database Team
