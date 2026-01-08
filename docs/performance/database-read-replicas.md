# Database Read Replicas Configuration

**Purpose:** Improve database performance by routing read-heavy queries to dedicated read replicas, reducing load on the primary database and improving response times.

**Target Improvement:** 30-50% reduction in primary database load, 20-30% improvement in read query latency

---

## Table of Contents

1. [Overview](#overview)
2. [Benefits](#benefits)
3. [Architecture](#architecture)
4. [Infrastructure Setup](#infrastructure-setup)
5. [Application Configuration](#application-configuration)
6. [Query Routing Strategy](#query-routing-strategy)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)

---

## Overview

Read replicas are read-only copies of your primary (master) database that asynchronously replicate data from the primary. They allow you to distribute read traffic across multiple database instances while maintaining a single source of truth for writes.

### Key Concepts

**Primary Database:**
- Handles ALL write operations (INSERT, UPDATE, DELETE)
- Handles critical read operations requiring real-time data
- Single source of truth

**Read Replica:**
- Handles read-only operations (SELECT)
- Asynchronously replicates from primary (slight lag: 100ms-2s typical)
- Can scale horizontally (multiple replicas)
- Geographically distributed for reduced latency

**Replication Lag:**
- Time delay between write on primary and availability on replica
- Typical: 100ms-500ms for same-region replicas
- Can increase under heavy load or network issues
- Application must handle eventual consistency

---

## Benefits

### Performance Improvements

1. **Reduced Primary Database Load**
   - Offload 60-80% of queries to replicas (most applications are read-heavy)
   - Primary handles only writes + critical reads
   - Better resource utilization

2. **Improved Query Latency**
   - Distribute read load across multiple instances
   - Geo-distributed replicas reduce network latency
   - Dedicated resources for analytics/reporting

3. **Scalability**
   - Horizontal scaling for read operations
   - Add replicas as traffic grows
   - No code changes required to add replicas

### Operational Benefits

1. **High Availability**
   - Replicas can be promoted to primary during failover
   - Reduced downtime during maintenance

2. **Reporting & Analytics**
   - Run heavy analytics queries on dedicated replica
   - No impact on production traffic

---

## Architecture

```
┌──────────────┐
│  Next.js App │
└──────┬───────┘
       │
       ├─── Writes ──────────────► ┌────────────────┐
       │                           │ Primary DB     │
       │                           │ (Write + Read) │
       │                           └────────┬───────┘
       │                                    │
       │                           Async Replication
       │                                    │
       │                                    ▼
       └─── Reads ───────────────► ┌────────────────┐
           (Non-Critical)          │ Read Replica 1 │
                                   │ (Read Only)    │
                                   └────────────────┘

                                   ┌────────────────┐
                                   │ Read Replica 2 │
                                   │ (Analytics)    │
                                   └────────────────┘
```

### Query Routing Rules

| Operation | Database | Reason |
|-----------|----------|--------|
| `INSERT`, `UPDATE`, `DELETE` | Primary | Writes must go to primary |
| `SELECT` after `UPDATE` (same request) | Primary | Read-your-writes consistency |
| User authentication | Primary | Critical data requiring consistency |
| Patient list (search) | Replica | High volume, eventual consistency OK |
| Appointment history | Replica | Historical data, lag acceptable |
| Reporting queries | Replica | Long-running, offload from primary |
| Audit logs (write) | Primary | Critical compliance data |
| Audit logs (read/export) | Replica | Heavy reads, lag acceptable |

---

## Infrastructure Setup

### DigitalOcean Managed Database

**Step 1: Create Read Replica**

```bash
# Create a read replica in the same region (lowest lag)
doctl databases replica create <primary-database-id> \
  --name holi-replica-nyc3-1 \
  --region nyc3 \
  --size db-s-2vcpu-4gb

# Get replica connection details
doctl databases replica get <primary-database-id> <replica-id>
```

**Output Example:**
```
ID:         12345678-abcd-1234-5678-abcdef123456
Name:       holi-replica-nyc3-1
Status:     online
Region:     nyc3
Connection: holi-replica-nyc3-1.db.ondigitalocean.com
Port:       25060
```

**Step 2: Verify Replication**

```bash
# Connect to replica and check lag
PGPASSWORD=<password> psql -h holi-replica-nyc3-1.db.ondigitalocean.com \
  -U holi -d holi_protocol -c "
  SELECT
    pg_last_wal_receive_lsn() AS receive_lsn,
    pg_last_wal_replay_lsn() AS replay_lsn,
    (extract(epoch from now()) - extract(epoch from pg_last_xact_replay_timestamp()))::int AS lag_seconds;
"
```

**Expected Output:**
```
 receive_lsn | replay_lsn  | lag_seconds
-------------+-------------+-------------
 0/3A123456  | 0/3A123450  |           0
```

**Replication Lag Guidelines:**
- **0-1 seconds:** Excellent (normal for same-region)
- **1-5 seconds:** Acceptable (may occur during high load)
- **5+ seconds:** Investigate (network issue, overload, or insufficient replica resources)

---

### AWS RDS

**Step 1: Create Read Replica**

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier holi-replica-us-east-1a \
  --source-db-instance-identifier holi-primary \
  --db-instance-class db.t3.medium \
  --availability-zone us-east-1a

# Describe replica
aws rds describe-db-instances \
  --db-instance-identifier holi-replica-us-east-1a
```

**Step 2: Enable Multi-AZ for High Availability**

```bash
aws rds modify-db-instance \
  --db-instance-identifier holi-replica-us-east-1a \
  --multi-az \
  --apply-immediately
```

---

### Self-Hosted PostgreSQL

**Step 1: Configure Primary for Replication**

```bash
# Edit postgresql.conf on primary
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on

# Edit pg_hba.conf on primary (allow replica connections)
host    replication    replicator    <replica-ip>/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Step 2: Create Replication User**

```sql
-- On primary database
CREATE USER replicator WITH REPLICATION PASSWORD 'strong_password';
```

**Step 3: Create Base Backup on Replica**

```bash
# On replica server
pg_basebackup -h <primary-ip> -D /var/lib/postgresql/data \
  -U replicator -P -v -R -X stream -C -S replica_1
```

**Step 4: Start Replica**

```bash
# On replica server
sudo systemctl start postgresql

# Verify replication status
psql -h localhost -U holi -d holi_protocol -c "
  SELECT * FROM pg_stat_replication;
"
```

---

## Application Configuration

### Step 1: Install Prisma Read Replica Extension

```bash
pnpm add @prisma/extension-read-replicas
```

### Step 2: Environment Variables

Add replica connection URLs to `.env`:

```bash
# Primary database (all writes + critical reads)
DATABASE_URL="postgresql://holi:password@primary.db.ondigitalocean.com:25060/holi_protocol?schema=public&sslmode=require"

# Read replica(s)
DATABASE_REPLICA_URL="postgresql://holi:password@replica-1.db.ondigitalocean.com:25060/holi_protocol?schema=public&sslmode=require"

# Optional: Additional replicas (comma-separated)
DATABASE_REPLICA_URLS="postgresql://holi:password@replica-1.db.ondigitalocean.com:25060/holi_protocol?schema=public&sslmode=require,postgresql://holi:password@replica-2.db.ondigitalocean.com:25060/holi_protocol?schema=public&sslmode=require"

# Optional: Analytics-dedicated replica
DATABASE_ANALYTICS_REPLICA_URL="postgresql://holi:password@replica-analytics.db.ondigitalocean.com:25060/holi_protocol?schema=public&sslmode=require"
```

### Step 3: Update Prisma Client

The application already has `src/lib/prisma-replica.ts` (to be created) that configures read replicas:

```typescript
// File: apps/web/src/lib/prisma-replica.ts
import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';
import { logger } from '@/lib/logger';

/**
 * Prisma Client with Read Replica Support
 *
 * Usage:
 * - prismaWithReplica.user.findMany() -> Routes to replica
 * - prismaWithReplica.$primary().user.create() -> Routes to primary
 */

// Parse replica URLs from environment
function getReplicaUrls(): string[] {
  const urls: string[] = [];

  // Single replica URL
  if (process.env.DATABASE_REPLICA_URL) {
    urls.push(process.env.DATABASE_REPLICA_URL);
  }

  // Multiple replica URLs (comma-separated)
  if (process.env.DATABASE_REPLICA_URLS) {
    const multipleUrls = process.env.DATABASE_REPLICA_URLS.split(',').map(url => url.trim());
    urls.push(...multipleUrls);
  }

  return urls;
}

export function createPrismaWithReplicas(basePrisma: PrismaClient): PrismaClient {
  const replicaUrls = getReplicaUrls();

  // If no replicas configured, return base client
  if (replicaUrls.length === 0) {
    logger.info({
      event: 'read_replicas_disabled',
    }, 'Read replicas not configured, using primary for all queries');
    return basePrisma;
  }

  logger.info({
    event: 'read_replicas_enabled',
    replicaCount: replicaUrls.length,
  }, `Read replicas enabled with ${replicaUrls.length} replica(s)`);

  // Apply read replica extension
  const prismaWithReplica = basePrisma.$extends(
    readReplicas({
      url: replicaUrls,
    })
  ) as unknown as PrismaClient;

  return prismaWithReplica;
}

/**
 * Helper: Get analytics-dedicated replica client
 * Use for heavy reporting queries
 */
export function createAnalyticsPrisma(basePrisma: PrismaClient): PrismaClient | null {
  const analyticsUrl = process.env.DATABASE_ANALYTICS_REPLICA_URL;

  if (!analyticsUrl) {
    logger.warn({
      event: 'analytics_replica_not_configured',
    }, 'Analytics replica not configured');
    return null;
  }

  logger.info({
    event: 'analytics_replica_enabled',
  }, 'Analytics replica configured for reporting queries');

  return basePrisma.$extends(
    readReplicas({
      url: [analyticsUrl],
    })
  ) as unknown as PrismaClient;
}
```

### Step 4: Update Main Prisma Export

Update `/apps/web/src/lib/prisma.ts` to export replica-aware client:

```typescript
// At the end of the file, after line 296:

import { createPrismaWithReplicas } from './prisma-replica';

// Export replica-aware client for read-heavy operations
export const prismaReplica = _prisma ? createPrismaWithReplicas(_prisma) : null;

// Export primary-only client for write operations
export const prismaPrimary = _prisma;
```

---

## Query Routing Strategy

### Automatic Routing (Recommended)

Use `prismaReplica` by default - it automatically routes:
- **All reads** → Replica
- **All writes** → Primary

```typescript
import { prismaReplica, prismaPrimary } from '@/lib/prisma';

// ✅ This automatically uses replica for read
const patients = await prismaReplica.patient.findMany({
  where: { deletedAt: null },
});

// ✅ This automatically uses primary for write
const newPatient = await prismaReplica.patient.create({
  data: { ... },
});
```

### Explicit Primary Routing

Force primary for critical reads requiring absolute consistency:

```typescript
import { prismaReplica } from '@/lib/prisma';

// Force primary for authentication (critical)
const user = await prismaReplica.$primary().user.findUnique({
  where: { email: 'user@example.com' },
  include: { sessions: true },
});

// Force primary after write (read-your-writes)
const updatedPatient = await prismaReplica.patient.update({
  where: { id: patientId },
  data: { status: 'ACTIVE' },
});

// Read back immediately (use primary to ensure consistency)
const verifyPatient = await prismaReplica.$primary().patient.findUnique({
  where: { id: patientId },
});
```

### Query Classification

| Query Type | Routing | Example |
|------------|---------|---------|
| Authentication | Primary | `user.findUnique({ email })` |
| Session validation | Primary | `session.findUnique({ token })` |
| Patient search/list | Replica | `patient.findMany({ take: 50 })` |
| Appointment history | Replica | `appointment.findMany({ patientId })` |
| Prescription history | Replica | `prescription.findMany({ patientId })` |
| Audit log export | Replica | `auditLog.findMany({ timestamp: { gte } })` |
| CREATE operations | Primary (auto) | `patient.create({ data })` |
| UPDATE operations | Primary (auto) | `patient.update({ where, data })` |
| DELETE operations | Primary (auto) | `patient.delete({ where })` |
| Read after write (same request) | Primary (explicit) | `.$primary().patient.findUnique()` |

### Migration Guide

**Phase 1: Audit Current Usage (Week 1)**

```bash
# Find all Prisma query usage
grep -r "prisma\\..*\\.find" apps/web/src/app/api --include="*.ts"
grep -r "prisma\\..*\\.create" apps/web/src/app/api --include="*.ts"
grep -r "prisma\\..*\\.update" apps/web/src/app/api --include="*.ts"
```

**Phase 2: Gradual Migration (Week 2-3)**

1. Start with read-heavy endpoints (patient list, appointments, audit logs)
2. Replace `prisma` with `prismaReplica`
3. Monitor replication lag and query performance
4. Add `.$primary()` for critical reads after testing

**Phase 3: Full Rollout (Week 4)**

1. Migrate all remaining endpoints
2. Update all documentation
3. Remove `prisma` direct usage (enforce `prismaReplica` everywhere)

---

## Monitoring

### Key Metrics to Track

**1. Replication Lag**

```sql
-- Run on replica
SELECT
  CASE
    WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
    ELSE EXTRACT(epoch FROM now() - pg_last_xact_replay_timestamp())
  END AS lag_seconds;
```

**Alert Thresholds:**
- **Warning:** Lag > 5 seconds for 5 minutes
- **Critical:** Lag > 30 seconds for 5 minutes

**2. Query Distribution (Primary vs Replica)**

```typescript
// Add to Prometheus metrics
import { register, Counter } from 'prom-client';

const dbQueryCounter = new Counter({
  name: 'db_queries_total',
  help: 'Total database queries by type and target',
  labelNames: ['operation', 'model', 'target'], // target: 'primary' | 'replica'
});

// Increment in Prisma middleware
prisma.$use(async (params, next) => {
  const target = params.runInTransaction ? 'primary' : 'replica'; // Simplified
  dbQueryCounter.inc({ operation: params.action, model: params.model, target });
  return next(params);
});
```

**Target Distribution:**
- **Primary:** 20-40% (writes + critical reads)
- **Replica:** 60-80% (most reads)

**3. Query Performance (Latency)**

```typescript
// Add to APM traces
import tracer from '@/lib/monitoring/datadog';

const span = tracer.startSpan('database.query', {
  resource: `${params.model}.${params.action}`,
  tags: {
    'db.target': target, // 'primary' or 'replica'
    'db.model': params.model,
    'db.operation': params.action,
  },
});

const result = await next(params);
span.finish();
```

**Expected Latency Improvements:**
- **Replica queries:** 20-40% faster (reduced contention)
- **Primary writes:** 10-20% faster (offloaded reads)

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Database Read Replicas",
    "panels": [
      {
        "title": "Replication Lag",
        "targets": [{
          "expr": "pg_replication_lag_seconds"
        }],
        "alert": {
          "conditions": [
            { "query": "avg() > 5", "for": "5m", "severity": "warning" },
            { "query": "avg() > 30", "for": "5m", "severity": "critical" }
          ]
        }
      },
      {
        "title": "Query Distribution (Primary vs Replica)",
        "targets": [{
          "expr": "rate(db_queries_total[5m])"
        }]
      },
      {
        "title": "Query Latency (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

---

## Troubleshooting

### Problem 1: High Replication Lag

**Symptoms:**
- Replication lag > 5 seconds consistently
- Users see stale data

**Diagnosis:**

```bash
# Check replica load
PGPASSWORD=<password> psql -h <replica-host> -U holi -d holi_protocol -c "
  SELECT
    count(*) AS active_queries,
    max(now() - query_start) AS longest_query_duration
  FROM pg_stat_activity
  WHERE state = 'active';
"

# Check primary WAL generation rate
psql -h <primary-host> -U holi -d holi_protocol -c "
  SELECT pg_current_wal_lsn();
"
```

**Solutions:**

1. **Upgrade replica instance size** (if CPU/memory maxed)
   ```bash
   doctl databases replica resize <primary-id> <replica-id> --size db-s-4vcpu-8gb
   ```

2. **Add additional replicas** (distribute load)
   ```bash
   doctl databases replica create <primary-id> --name holi-replica-2 --region nyc3
   ```

3. **Move long-running queries to dedicated analytics replica**
   ```typescript
   import { createAnalyticsPrisma } from '@/lib/prisma-replica';
   const analyticsPrisma = createAnalyticsPrisma(basePrisma);
   // Use for heavy reports
   ```

---

### Problem 2: Stale Data After Write

**Symptoms:**
- User updates data but doesn't see changes immediately
- Race condition: write → read returns old data

**Diagnosis:**

```typescript
// Check if read happens immediately after write in same request
const patient = await prismaReplica.patient.update({
  where: { id },
  data: { status: 'ACTIVE' },
});

// ❌ This read may return stale data from replica
const verify = await prismaReplica.patient.findUnique({
  where: { id },
});
```

**Solution:**

Force primary for reads immediately after writes:

```typescript
const patient = await prismaReplica.patient.update({
  where: { id },
  data: { status: 'ACTIVE' },
});

// ✅ Force primary to ensure consistency
const verify = await prismaReplica.$primary().patient.findUnique({
  where: { id },
});
```

---

### Problem 3: Replica Connection Failures

**Symptoms:**
- Queries failing with "connection refused"
- Health checks failing

**Diagnosis:**

```bash
# Test replica connectivity
nc -zv <replica-host> 25060

# Check replica status
doctl databases replica get <primary-id> <replica-id>
```

**Solutions:**

1. **Fallback to primary if replica unavailable:**
   ```typescript
   // Prisma extension handles this automatically
   // Falls back to primary if replica connection fails
   ```

2. **Update firewall rules:**
   ```bash
   # Add application IP to replica firewall
   doctl databases firewalls add <replica-id> --rule "type:ip_addr,value:<app-ip>"
   ```

3. **Check replica status:**
   ```bash
   # If replica is unhealthy, recreate it
   doctl databases replica delete <primary-id> <replica-id>
   doctl databases replica create <primary-id> --name holi-replica-new --region nyc3
   ```

---

## Testing

### Unit Tests

```typescript
// File: apps/web/src/lib/__tests__/prisma-replica.test.ts
import { createPrismaWithReplicas } from '../prisma-replica';
import { PrismaClient } from '@prisma/client';

describe('Read Replica Configuration', () => {
  it('should use replica for read queries', async () => {
    const mockPrisma = new PrismaClient();
    const replicaPrisma = createPrismaWithReplicas(mockPrisma);

    // Mock environment
    process.env.DATABASE_REPLICA_URL = 'postgresql://replica:5432/test';

    // Verify replica is used
    const result = await replicaPrisma.patient.findMany({ take: 10 });

    // Check query was routed to replica (would need connection spy)
    expect(result).toBeDefined();
  });

  it('should fallback to primary when no replicas configured', () => {
    delete process.env.DATABASE_REPLICA_URL;
    delete process.env.DATABASE_REPLICA_URLS;

    const mockPrisma = new PrismaClient();
    const replicaPrisma = createPrismaWithReplicas(mockPrisma);

    // Should return base client
    expect(replicaPrisma).toBe(mockPrisma);
  });
});
```

### Integration Tests

```typescript
// File: apps/web/src/lib/__tests__/read-replica-integration.test.ts
import { prismaReplica, prismaPrimary } from '../prisma';

describe('Read Replica Integration', () => {
  it('should read-your-writes with primary routing', async () => {
    // Create patient
    const patient = await prismaReplica.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        email: 'test@example.com',
        dateOfBirth: new Date('1990-01-01'),
      },
    });

    // Read back from PRIMARY to ensure consistency
    const verify = await prismaReplica.$primary().patient.findUnique({
      where: { id: patient.id },
    });

    expect(verify).toBeDefined();
    expect(verify!.firstName).toBe('Test');
  });

  it('should handle replica lag gracefully', async () => {
    // Write to primary
    const patient = await prismaPrimary!.patient.create({
      data: { firstName: 'Lag', lastName: 'Test', email: 'lag@test.com', dateOfBirth: new Date() },
    });

    // Read from replica (may lag)
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate lag
    const fromReplica = await prismaReplica.patient.findUnique({
      where: { id: patient.id },
    });

    // Should eventually be consistent (may be null on first read if lag)
    if (!fromReplica) {
      console.warn('Replica lag detected - record not yet replicated');
    }
  });
});
```

### Load Testing

```bash
# File: tests/load/read-replica-load.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  // Read-heavy workload (simulates patient list)
  const response = http.get('https://api.holilabs.xyz/api/patients?limit=50', {
    headers: { 'Authorization': `Bearer ${__ENV.API_TOKEN}` },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run Load Test:**

```bash
# Before read replicas
k6 run tests/load/read-replica-load.js

# After read replicas
k6 run tests/load/read-replica-load.js

# Compare results
k6 run tests/load/read-replica-load.js --out json=results-before.json
k6 run tests/load/read-replica-load.js --out json=results-after.json
```

**Expected Improvements:**
- **Throughput:** +30-50% (more requests/second)
- **Latency (p95):** -20-30% (faster response times)
- **Error Rate:** Similar or improved (reduced primary contention)

---

## Production Rollout Checklist

### Pre-Deployment

- [ ] Infrastructure
  - [ ] Create read replica in production (DigitalOcean/AWS)
  - [ ] Verify replication lag < 1 second
  - [ ] Add replica to firewall rules
  - [ ] Test replica connectivity from application servers

- [ ] Configuration
  - [ ] Set `DATABASE_REPLICA_URL` in production environment
  - [ ] Install `@prisma/extension-read-replicas` package
  - [ ] Deploy `prisma-replica.ts` configuration
  - [ ] Update Prisma exports in `prisma.ts`

- [ ] Testing
  - [ ] Run unit tests
  - [ ] Run integration tests against staging replica
  - [ ] Load test with simulated traffic
  - [ ] Verify query routing (primary vs replica)

### Deployment

- [ ] **Phase 1: Deploy Infrastructure (Day 1)**
  - [ ] Create read replica
  - [ ] Verify replication working
  - [ ] Set up monitoring alerts

- [ ] **Phase 2: Deploy Code (Day 2)**
  - [ ] Deploy replica-aware Prisma client
  - [ ] Migrate 10% of traffic to use `prismaReplica`
  - [ ] Monitor for 24 hours

- [ ] **Phase 3: Gradual Rollout (Week 1)**
  - [ ] Migrate 50% of endpoints to `prismaReplica`
  - [ ] Monitor replication lag, query performance
  - [ ] Address any issues

- [ ] **Phase 4: Full Rollout (Week 2)**
  - [ ] Migrate 100% of endpoints
  - [ ] Remove direct `prisma` usage (enforce replica routing)
  - [ ] Final performance validation

### Post-Deployment

- [ ] Monitoring
  - [ ] Replication lag alerts configured
  - [ ] Query distribution dashboard created
  - [ ] Performance metrics tracked
  - [ ] Weekly review of replica performance

- [ ] Documentation
  - [ ] Update API documentation with replica usage
  - [ ] Document troubleshooting procedures
  - [ ] Train team on replica routing strategy

---

## Related Documents

- [Database Connection Failure Runbook](../runbooks/database-connection-failure.md)
- [Performance Degradation Runbook](../runbooks/performance-degradation.md)
- [APM Setup](../monitoring/apm-setup.md)
- [Load Testing Guide](./load-testing.md)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-08 | DevOps | Initial version |
