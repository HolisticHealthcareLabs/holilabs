# Bemi PostgreSQL Replication Setup Guide

**SOC 2 Control**: CC7.2 (System Monitoring), CC6.7 (Data Encryption)
**Purpose**: Enable Write-Ahead Log (WAL) replication for tamper-proof audit logging

---

## Overview

Bemi captures all database changes at the PostgreSQL WAL level, providing:

- ✅ **100% Coverage**: Every INSERT, UPDATE, DELETE captured automatically
- ✅ **Before/After State**: Full record history (not just deltas)
- ✅ **Tamper-Proof**: Cannot be bypassed by direct SQL queries
- ✅ **Zero Code Changes**: Works transparently with existing Prisma queries
- ✅ **Context Enrichment**: User ID, IP address, access reason attached to each change
- ✅ **6-Year Retention**: Meets HIPAA audit log requirements

**Architecture**:
```
Application (Prisma) → PostgreSQL → WAL Stream → Bemi Worker → Bemi Database → Dashboard
```

---

## Prerequisites

- PostgreSQL 12+ (with logical replication support)
- Database superuser access (for replication setup)
- Bemi account and API key
- Network connectivity between Bemi worker and PostgreSQL

---

## Step 1: Enable Logical Replication in PostgreSQL

### Local Development (Docker/Homebrew)

#### Option A: Docker PostgreSQL

**Update `docker-compose.yml`**:
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: holi
      POSTGRES_PASSWORD: holi_dev_password
      POSTGRES_DB: holi_protocol
    ports:
      - "5432:5432"
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"              # Enable logical replication
      - "-c"
      - "max_replication_slots=4"         # Allow replication slots
      - "-c"
      - "max_wal_senders=4"               # Allow WAL streaming
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Restart**:
```bash
docker-compose down
docker-compose up -d
```

#### Option B: Homebrew PostgreSQL

**Edit `postgresql.conf`**:
```bash
# Find config file
psql -U postgres -c "SHOW config_file"

# Edit config (example path)
sudo nano /opt/homebrew/var/postgresql@16/postgresql.conf
```

**Add/Update**:
```conf
wal_level = logical
max_replication_slots = 4
max_wal_senders = 4
```

**Restart PostgreSQL**:
```bash
brew services restart postgresql@16
```

#### Verify Configuration

```bash
psql -U holi -d holi_protocol -c "SHOW wal_level;"
# Expected: logical

psql -U holi -d holi_protocol -c "SHOW max_replication_slots;"
# Expected: 4
```

---

### Production (AWS RDS)

**RDS Parameter Group**:
```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name holi-postgres-params \
  --parameters \
    "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot"

# Reboot instance
aws rds reboot-db-instance --db-instance-identifier holi-prod-db
```

**Verify**:
```sql
SELECT name, setting FROM pg_settings WHERE name = 'rds.logical_replication';
-- Expected: 1
```

---

## Step 2: Create Bemi Replication User

**Create dedicated user**:
```sql
-- Connect as superuser
psql -U postgres -d holi_protocol

-- Create replication user
CREATE USER bemi_replication WITH REPLICATION PASSWORD 'secure_random_password_here';

-- Grant schema access
GRANT USAGE ON SCHEMA public TO bemi_replication;

-- Grant table access (current and future tables)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bemi_replication;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bemi_replication;

-- Create replication slot
SELECT pg_create_logical_replication_slot('bemi_slot', 'pgoutput');

-- Create publication for all tables
CREATE PUBLICATION bemi_publication FOR ALL TABLES;
```

**Verify**:
```sql
-- Check replication slot
SELECT * FROM pg_replication_slots WHERE slot_name = 'bemi_slot';

-- Check publication
SELECT * FROM pg_publication WHERE pubname = 'bemi_publication';
```

---

## Step 3: Configure Bemi Worker

### Option A: Bemi Cloud (Recommended for Production)

**Sign up**: https://bemi.io

**Add data source**:
```bash
# Bemi Dashboard → Data Sources → Add PostgreSQL

# Connection string format:
postgres://bemi_replication:secure_random_password_here@your-host:5432/holi_protocol?replication=database
```

**Settings**:
- **Replication Slot**: `bemi_slot`
- **Publication**: `bemi_publication`
- **Buffer Size**: 1000 (default)
- **Retention**: 2190 days (6 years for HIPAA)

### Option B: Self-Hosted Bemi Worker (Docker)

**Create `bemi-worker-compose.yml`**:
```yaml
version: '3.8'

services:
  bemi-worker:
    image: bemihq/bemi-worker:latest
    environment:
      BEMI_DATABASE_URL: postgres://bemi_replication:secure_random_password_here@postgres:5432/holi_protocol?replication=database
      BEMI_DESTINATION_URL: postgres://bemi_audit:audit_password@bemi-db:5432/bemi_audit
      BEMI_REPLICATION_SLOT: bemi_slot
      BEMI_PUBLICATION: bemi_publication
      BEMI_LOG_LEVEL: info
    depends_on:
      - bemi-db
    restart: unless-stopped

  bemi-db:
    image: postgres:16
    environment:
      POSTGRES_USER: bemi_audit
      POSTGRES_PASSWORD: audit_password
      POSTGRES_DB: bemi_audit
    volumes:
      - bemi_audit_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

volumes:
  bemi_audit_data:
```

**Start**:
```bash
docker-compose -f bemi-worker-compose.yml up -d
```

---

## Step 4: Enable REPLICA IDENTITY FULL

**Requirement**: Bemi needs before/after state for all columns.

**Enable for all tables**:
```sql
-- Connect to database
psql -U holi -d holi_protocol

-- Enable REPLICA IDENTITY FULL for all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', table_name);
    RAISE NOTICE 'Set REPLICA IDENTITY FULL for %', table_name;
  END LOOP;
END $$;
```

**Verify**:
```sql
SELECT schemaname, tablename, relreplident
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public';

-- relreplident should be 'f' (FULL)
```

**Alternative: Per-table**:
```sql
ALTER TABLE "User" REPLICA IDENTITY FULL;
ALTER TABLE "Patient" REPLICA IDENTITY FULL;
ALTER TABLE "Prescription" REPLICA IDENTITY FULL;
-- ... repeat for all tables
```

---

## Step 5: Configure Prisma for Bemi

### Update Prisma Client

**File**: `apps/web/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@bemi-db/prisma';

const databaseUrl = process.env.DATABASE_URL || '';

// Create Bemi-enhanced Prisma adapter for SOC 2 audit trail
const adapter = process.env.ENABLE_BEMI_AUDIT === 'true'
  ? PrismaPg({ connectionString: databaseUrl })
  : undefined;

const client = new PrismaClient({
  // Use Bemi adapter if enabled
  ...(adapter ? { adapter } : {}),
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

export const prisma = client;
```

### Update Environment Variables

**File**: `apps/web/.env`

```bash
# Enable Bemi audit logging
ENABLE_BEMI_AUDIT=true

# Database URL (must include sslmode for production)
DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public"

# Bemi API key (for context enrichment)
BEMI_API_KEY="bemi_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## Step 6: Test Replication

### Test 1: Insert Record

```typescript
// apps/web/test-bemi.ts
import { prisma } from './src/lib/prisma';
import { setBemiContext } from './src/lib/audit/bemi-context';

async function testBemi() {
  // Set context
  setBemiContext({
    userId: 'test_user_123',
    role: 'PHYSICIAN',
    ipAddress: '192.168.1.100',
    userAgent: 'Test Script',
    endpoint: '/test',
    accessReason: 'Testing Bemi replication',
  });

  // Create test patient
  const patient = await prisma.patient.create({
    data: {
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      email: 'test@example.com',
      phone: '+1234567890',
    },
  });

  console.log('Created patient:', patient.id);

  // Update patient
  await prisma.patient.update({
    where: { id: patient.id },
    data: { firstName: 'Updated' },
  });

  console.log('Updated patient');

  // Delete patient
  await prisma.patient.delete({
    where: { id: patient.id },
  });

  console.log('Deleted patient');
  console.log('✅ Bemi test complete - check Bemi dashboard for audit logs');
}

testBemi();
```

**Run**:
```bash
cd apps/web
pnpm tsx test-bemi.ts
```

### Test 2: Check Bemi Dashboard

**Navigate to**: https://app.bemi.io/logs

**Expected logs**:
```json
[
  {
    "operation": "INSERT",
    "table": "Patient",
    "before": null,
    "after": {
      "id": "clx...",
      "firstName": "Test",
      "lastName": "Patient",
      "email": "test@example.com"
    },
    "context": {
      "userId": "test_user_123",
      "role": "PHYSICIAN",
      "accessReason": "Testing Bemi replication"
    },
    "timestamp": "2025-12-09T10:30:00Z"
  },
  {
    "operation": "UPDATE",
    "table": "Patient",
    "before": {
      "firstName": "Test"
    },
    "after": {
      "firstName": "Updated"
    },
    "context": {...}
  },
  {
    "operation": "DELETE",
    "table": "Patient",
    "before": {
      "id": "clx...",
      "firstName": "Updated"
    },
    "after": null,
    "context": {...}
  }
]
```

---

## Step 7: Monitor Replication Health

### Check Replication Lag

```sql
SELECT
  slot_name,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS replication_lag
FROM pg_replication_slots
WHERE slot_name = 'bemi_slot';
```

**Expected**:
- `active`: true
- `replication_lag`: <100KB (healthy)

### Check WAL Growth

```sql
SELECT
  slot_name,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots
WHERE slot_name = 'bemi_slot';
```

**Warning**: If `retained_wal` > 10GB, Bemi worker may be down.

---

## Troubleshooting

### Issue 1: "replication slot does not exist"

**Solution**:
```sql
SELECT pg_create_logical_replication_slot('bemi_slot', 'pgoutput');
```

### Issue 2: "permission denied for replication"

**Solution**:
```sql
ALTER USER bemi_replication WITH REPLICATION;
```

### Issue 3: "publication does not exist"

**Solution**:
```sql
CREATE PUBLICATION bemi_publication FOR ALL TABLES;
```

### Issue 4: High replication lag

**Causes**:
- Bemi worker down
- Network issues
- High write volume

**Solution**:
```bash
# Check worker logs
docker-compose -f bemi-worker-compose.yml logs -f bemi-worker

# Restart worker
docker-compose -f bemi-worker-compose.yml restart bemi-worker
```

### Issue 5: WAL disk space full

**Solution**:
```sql
-- Drop inactive replication slot (CAUTION: loses audit trail)
SELECT pg_drop_replication_slot('bemi_slot');

-- Recreate slot
SELECT pg_create_logical_replication_slot('bemi_slot', 'pgoutput');

-- Restart Bemi worker
```

---

## Production Checklist

- [ ] PostgreSQL `wal_level=logical` enabled
- [ ] `max_replication_slots` ≥ 4
- [ ] `max_wal_senders` ≥ 4
- [ ] Replication user created with REPLICATION privilege
- [ ] Replication slot created (`bemi_slot`)
- [ ] Publication created (`bemi_publication`)
- [ ] REPLICA IDENTITY FULL on all tables
- [ ] Bemi worker deployed and running
- [ ] Replication lag < 100KB
- [ ] Test INSERT/UPDATE/DELETE captured
- [ ] Context enrichment working (userId, accessReason)
- [ ] 6-year retention configured
- [ ] Monitoring alerts set up (replication lag, worker health)
- [ ] Disaster recovery plan documented
- [ ] Audit log backup strategy in place

---

## Security Considerations

### 1. Replication User Permissions

**Principle of Least Privilege**:
```sql
-- Replication user should ONLY have SELECT + REPLICATION
-- NO INSERT/UPDATE/DELETE permissions
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM bemi_replication;
```

### 2. Network Isolation

**Production**:
- Bemi worker in private subnet
- PostgreSQL not publicly accessible
- VPN or VPC peering for Bemi Cloud

### 3. Credential Rotation

**Rotate replication password**:
```sql
ALTER USER bemi_replication WITH PASSWORD 'new_secure_password_here';
```

**Update Bemi worker config** immediately after.

### 4. Audit Log Encryption

**At-rest**: Bemi database should use encrypted storage (AWS RDS encryption)

**In-transit**: SSL/TLS required for PostgreSQL connection

---

## Performance Impact

**Typical Overhead**:
- CPU: +2-5% (WAL generation)
- Disk I/O: +10-15% (WAL writes)
- Network: ~1KB per change (compressed)

**Optimization**:
- Use statement-level triggers (not row-level) where possible
- Batch operations to reduce WAL entries
- Monitor `pg_stat_replication` for bottlenecks

---

## References

- [Bemi Official Documentation](https://docs.bemi.io/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [AWS RDS Logical Replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication)
- [HIPAA Audit Log Requirements](https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/)

---

**Questions?** Contact the Holi Labs engineering team.
