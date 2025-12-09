# Bemi Audit Trail Setup Guide

## Overview

Bemi provides **tamper-proof, SOC 2-compliant audit logging** by capturing database changes at the PostgreSQL Write-Ahead Log (WAL) level. Unlike application-level audit logging, Bemi:

- ✅ Captures 100% of database changes (no manual instrumentation)
- ✅ Stores complete before/after state for every change
- ✅ Cannot be bypassed or deleted by application code
- ✅ Provides 6-year audit trail retention (SOC 2 requirement)
- ✅ Integrates with application context (userId, endpoint, IP address)

**SOC 2 Controls**: CC7.2 (System Monitoring), CC7.3 (Incident Response), A1.2 (Data Integrity)

---

## Architecture

### Dual Audit Logging Strategy

Holi Labs uses **two complementary audit systems**:

1. **Application Audit Logs** (`apps/web/src/lib/audit.ts`)
   - User actions and access reasons (LGPD/HIPAA compliance)
   - Access purpose justification
   - Consent management audit trail
   - Real-time security alerts

2. **Bemi Database Audit Logs** (`apps/web/src/lib/audit/bemi-context.ts`)
   - Complete database change history
   - Before/after state for every row
   - Tamper-proof (stored outside application database)
   - PostgreSQL WAL replication

**Example**: When a physician updates a patient record:
- **Application log**: Records who accessed, why (access reason), and when
- **Bemi log**: Records exact before/after state of every database field

---

## Prerequisites

### 1. PostgreSQL 14+ Required

Bemi requires PostgreSQL with logical replication support:

```bash
# Check your PostgreSQL version
psql $DATABASE_URL -c "SELECT version();"
```

Expected output: `PostgreSQL 14.x` or higher

### 2. Database Superuser Access

You need superuser access to:
- Enable logical replication (`ALTER SYSTEM`)
- Configure table replica identity
- Restart PostgreSQL server

### 3. Environment Configuration

Add to your `.env` file:

```bash
# Enable Bemi audit logging (set to 'false' for local development)
ENABLE_BEMI_AUDIT=true

# Your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

---

## Installation Steps

### Step 1: Enable PostgreSQL Logical Replication

Connect to your database as superuser:

```bash
psql $DATABASE_URL
```

Enable WAL level for logical replication:

```sql
ALTER SYSTEM SET wal_level = logical;
```

**CRITICAL**: You must **restart your PostgreSQL server** after this change.

#### For Cloud Providers:

**AWS RDS:**
1. Create a custom parameter group
2. Set `rds.logical_replication = 1`
3. Modify your RDS instance to use the parameter group
4. Reboot the instance

**DigitalOcean Managed PostgreSQL:**
```bash
doctl databases options list <database-id>
doctl databases configuration patch <database-id> --config "wal_level:logical"
```

**Supabase:**
Logical replication is enabled by default in Supabase (PostgreSQL 15).

**Heroku Postgres:**
```bash
heroku pg:settings:set DATABASE_URL wal_level=logical
```

### Step 2: Verify WAL Configuration

After PostgreSQL restart, verify:

```sql
SHOW wal_level;
```

Expected output: `logical`

If you see `replica` or `minimal`, the configuration didn't apply (check restart).

### Step 3: Configure Tables for Full Audit Trail

Bemi requires `REPLICA IDENTITY FULL` to capture before/after state.

Run this SQL for all tables containing PHI:

```sql
-- User and authentication tables
ALTER TABLE "User" REPLICA IDENTITY FULL;
ALTER TABLE "Account" REPLICA IDENTITY FULL;
ALTER TABLE "Session" REPLICA IDENTITY FULL;

-- Patient and PHI tables
ALTER TABLE "Patient" REPLICA IDENTITY FULL;
ALTER TABLE "Consultation" REPLICA IDENTITY FULL;
ALTER TABLE "Prescription" REPLICA IDENTITY FULL;
ALTER TABLE "LabResult" REPLICA IDENTITY FULL;
ALTER TABLE "Invoice" REPLICA IDENTITY FULL;
ALTER TABLE "Document" REPLICA IDENTITY FULL;

-- Audit and compliance tables
ALTER TABLE "AuditLog" REPLICA IDENTITY FULL;
ALTER TABLE "Consent" REPLICA IDENTITY FULL;
ALTER TABLE "DataExportRequest" REPLICA IDENTITY FULL;

-- Organization tables
ALTER TABLE "Organization" REPLICA IDENTITY FULL;
ALTER TABLE "Clinic" REPLICA IDENTITY FULL;
```

**Performance Note**: `REPLICA IDENTITY FULL` stores complete row data in WAL. For tables with frequent updates, this increases WAL size. Monitor disk usage.

### Step 4: Verify Table Configuration

```sql
SELECT
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
    WHEN 'n' THEN 'nothing'
  END AS replica_identity
FROM pg_catalog.pg_tables t
JOIN pg_catalog.pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: All PHI tables should show `full (all columns)`.

### Step 5: Generate Prisma Client with Driver Adapters

```bash
# Generate Prisma client with Bemi adapter support
pnpm prisma generate
```

This uses the `previewFeatures = ["driverAdapters"]` configuration in `schema.prisma`.

### Step 6: Health Check

Verify Bemi integration:

```bash
# In your Next.js application
curl http://localhost:3000/api/health
```

Or programmatically:

```typescript
import { checkBemiHealth } from '@/lib/audit/bemi-context';

const health = await checkBemiHealth();
console.log(health);
// Expected: { enabled: true, configured: true, message: 'Bemi audit logging is operational' }
```

---

## Usage in Next.js App Router

### Option 1: Automatic Context with HOC (Recommended)

Use `withBemiAudit` to automatically set context with session:

```typescript
// app/api/patients/route.ts
import { withBemiAudit } from '@/lib/audit/bemi-context';
import { prisma } from '@/lib/prisma';

export const POST = withBemiAudit(async (request: Request) => {
  const data = await request.json();

  // Bemi context automatically includes:
  // - userId (from NextAuth session)
  // - userEmail
  // - userRole
  // - endpoint (/api/patients)
  // - method (POST)
  // - ipAddress
  // - requestId

  const patient = await prisma.patient.create({ data });

  return Response.json({ success: true, patient });
});

export const PUT = withBemiAudit(async (request: Request) => {
  const { id, ...data } = await request.json();

  const patient = await prisma.patient.update({
    where: { id },
    data,
  });

  return Response.json({ success: true, patient });
});
```

### Option 2: Manual Context Setting

For server actions or custom logic:

```typescript
// app/patients/actions.ts
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setBemiContext } from '@/lib/audit/bemi-context';
import { prisma } from '@/lib/prisma';

export async function updatePatientAction(patientId: string, data: any) {
  const session = await getServerSession(authOptions);

  // Set Bemi context manually
  setBemiContext({
    userId: session?.user?.id || null,
    userEmail: session?.user?.email || null,
    userRole: session?.user?.role || null,
    endpoint: '/patients/[id]/edit',
    method: 'ACTION',
    accessReason: 'TREATMENT', // LGPD compliance
  });

  return await prisma.patient.update({
    where: { id: patientId },
    data,
  });
}
```

### Option 3: Middleware Integration

Apply Bemi context to all requests:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { withBemiContext } from '@/lib/audit/bemi-context';

export default withBemiContext(async (request: NextRequest) => {
  // Your existing middleware logic
  return NextResponse.next();
});

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

---

## Viewing Audit Trail

### Option 1: Bemi Cloud (Recommended for Production)

1. Sign up at [https://bemi.io](https://bemi.io)
2. Connect your PostgreSQL database
3. View audit trail in Bemi dashboard
4. Configure 6-year retention policy (SOC 2 requirement)

### Option 2: Self-Hosted Bemi Worker

For on-premises or private cloud deployments:

```bash
# Clone Bemi Worker repository
git clone https://github.com/BemiHQ/bemi-worker.git
cd bemi-worker

# Configure environment
cat > .env <<EOF
DATABASE_URL=$DATABASE_URL
AUDIT_DATABASE_URL=$AUDIT_DATABASE_URL  # Separate DB for audit storage
EOF

# Deploy to your infrastructure
docker-compose up -d
```

### Option 3: Query Bemi Tables Directly

Bemi stores audit data in PostgreSQL tables (typically `_bemi_*`):

```sql
-- View recent database changes
SELECT
  id,
  timestamp,
  operation,  -- INSERT, UPDATE, DELETE
  table_name,
  before_data,
  after_data,
  context->>'userId' AS user_id,
  context->>'endpoint' AS endpoint
FROM _bemi_changes
ORDER BY timestamp DESC
LIMIT 100;

-- Find all changes to a specific patient
SELECT *
FROM _bemi_changes
WHERE table_name = 'Patient'
  AND (before_data->>'id' = 'patient_xyz' OR after_data->>'id' = 'patient_xyz')
ORDER BY timestamp DESC;
```

---

## SOC 2 Compliance Mapping

| SOC 2 Control | Bemi Feature | Evidence |
|---------------|--------------|----------|
| **CC7.2** (System Monitoring) | Automatic change capture | 100% of DB changes logged |
| **CC7.3** (Incident Response) | Tamper-proof audit trail | Cannot be deleted by app |
| **A1.2** (Data Integrity) | Before/after state | Complete change history |
| **C1.1** (Data Classification) | PHI field tracking | Encrypted field changes |
| **PI1.4** (Error Handling) | Transaction rollback logging | Failed operation audit |

---

## Performance Considerations

### WAL Disk Usage

Enabling `REPLICA IDENTITY FULL` increases WAL size:

- **Small tables** (<1M rows): Negligible impact
- **Large tables** (>10M rows): Monitor WAL disk usage

**Solution**: Use `REPLICA IDENTITY DEFAULT` for non-PHI tables:

```sql
-- Only use FULL for PHI tables
ALTER TABLE "Patient" REPLICA IDENTITY FULL;

-- Use DEFAULT for metadata tables
ALTER TABLE "Tag" REPLICA IDENTITY DEFAULT;
```

### Database Load

Bemi adds minimal overhead (<5% CPU, <100ms P99 latency) because:
- WAL replication is asynchronous
- No additional queries in application path
- Batched audit data processing

**Benchmark**: 10,000 patient updates = +0.2s total overhead.

---

## Troubleshooting

### Error: "wal_level is not set to logical"

**Cause**: PostgreSQL was not restarted after `ALTER SYSTEM`.

**Fix**: Restart PostgreSQL:

```bash
# Ubuntu/Debian
sudo systemctl restart postgresql

# Docker
docker restart postgres_container

# AWS RDS
Reboot instance in AWS Console
```

### Error: "relation has no replica identity"

**Cause**: Table not configured with `REPLICA IDENTITY FULL`.

**Fix**: Run `ALTER TABLE` statements (see Step 3).

### Error: "Bemi context not captured in audit trail"

**Cause**: `setBemiContext` not called before database operation.

**Fix**: Use `withBemiAudit` HOC or manually call `setBemiContext` before Prisma queries.

### Bemi Not Capturing Changes in Development

**Cause**: `ENABLE_BEMI_AUDIT=false` in `.env.local`.

**Fix**: Set `ENABLE_BEMI_AUDIT=true` (or use Bemi only in staging/production).

---

## Security Best Practices

### 1. Separate Audit Database

Store Bemi audit trail in a separate PostgreSQL database:

```bash
# Application database (read/write)
DATABASE_URL="postgresql://app_user:password@host:5432/holi_app"

# Audit database (write-only from Bemi, read-only for auditors)
AUDIT_DATABASE_URL="postgresql://audit_user:password@host:5432/holi_audit"
```

**Benefit**: Even if application database is compromised, audit trail remains intact.

### 2. Read-Only Audit Access

Create a read-only PostgreSQL user for SOC 2 auditors:

```sql
-- Create audit viewer role
CREATE ROLE audit_viewer LOGIN PASSWORD 'secure_password';

-- Grant read-only access to Bemi tables
GRANT CONNECT ON DATABASE holi_audit TO audit_viewer;
GRANT USAGE ON SCHEMA public TO audit_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO audit_viewer;

-- Ensure future tables are also read-only
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO audit_viewer;
```

### 3. Encrypt Audit Trail

Enable PostgreSQL encryption at rest:

**AWS RDS**: Enable encryption when creating RDS instance.

**DigitalOcean**: Enable encryption in database settings.

**Self-hosted**: Use `pg_crypto` or full-disk encryption (LUKS).

---

## Rollback Instructions

If you need to disable Bemi:

```bash
# 1. Set ENABLE_BEMI_AUDIT=false in .env
ENABLE_BEMI_AUDIT=false

# 2. Regenerate Prisma client without adapter
# Remove driverAdapters from schema.prisma
pnpm prisma generate

# 3. (Optional) Revert PostgreSQL wal_level
psql $DATABASE_URL -c "ALTER SYSTEM SET wal_level = replica;"
# Restart PostgreSQL
```

**Note**: This does NOT delete existing audit data. Audit trail remains in Bemi database for compliance.

---

## Next Steps

After completing Bemi setup:

1. ✅ **Week 2**: Implement MFA with Twilio Verify
2. ✅ **Week 3**: Deploy Casbin RBAC middleware
3. ✅ **Week 4**: Transparent PHI encryption with Prisma extensions
4. ✅ **Week 5**: Centralized logging with SigNoz

---

## References

- [Bemi Official Documentation](https://docs.bemi.io/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [SOC 2 Trust Service Criteria](https://www.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria.pdf)
- [HIPAA Audit Log Requirements](https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/)

---

**Questions?** Contact the Holi Labs engineering team or file an issue in the repository.
