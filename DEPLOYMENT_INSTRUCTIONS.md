# 🚀 Production Deployment Instructions

## Web2 Interoperability Foundation - Phase 2: Production Deployment

**Date**: December 5, 2025
**Target Server**: 129.212.184.190
**Commits to Deploy**: `fac2d38` (schema changes) + `48811c5` (seed script)

---

## Prerequisites

✅ All code changes committed and pushed to `main` branch
✅ SSH access to production server (129.212.184.190)
✅ Production PostgreSQL database running
✅ Environment variables configured on production server

---

## Deployment Steps

### Step 1: SSH to Production Server

```bash
ssh ubuntu@129.212.184.190
```

### Step 2: Navigate to Application Directory

```bash
cd /path/to/holilabsv2  # Adjust to actual deployment path
```

### Step 3: Pull Latest Changes

```bash
# Stash any local changes (if needed)
git stash

# Pull latest commits
git pull origin main

# Verify we have the latest commits
git log --oneline -5
```

**Expected output** should show:
```
48811c5 chore(db): Add seed script for ICD-10 and LOINC reference tables
fac2d38 feat(infra): Implement foundational Web2 standards (RNDS/TISS/IPS) from SRE audit
...
```

### Step 4: Install Dependencies (if needed)

```bash
pnpm install
```

### Step 5: Generate Prisma Migration

```bash
# This will create the migration file from schema changes
cd apps/web
pnpm prisma migrate dev --name 20251205_web2_interop_foundation --schema ../../prisma/schema.prisma
```

**Expected output**:
```
✔ Prisma schema loaded from ../../prisma/schema.prisma
✔ Datasource "db": PostgreSQL database "holi_protocol"
✔ Prisma Migrate created the following migration without applying it:

migrations/
  └─ 20251205_web2_interop_foundation/
    └─ migration.sql
```

### Step 6: Apply Migration to Production Database

⚠️ **CRITICAL**: This will modify the production database schema. Ensure you have a backup!

```bash
# Deploy migration to production
pnpm prisma migrate deploy --schema ../../prisma/schema.prisma
```

**Expected output**:
```
✔ Applied 1 migration in 2.5s

The following migration have been applied:

migrations/
  └─ 20251205_web2_interop_foundation/
    └─ migration.sql
```

### Step 7: Seed Reference Data

```bash
# Go back to root directory
cd ../..

# Run seed script
pnpm db:seed
```

**Expected output**:
```
🌱 Starting database seeding...
📊 Using chunk size: 100 records per batch

📋 Seeding ICD-10 codes...
  Processing chunk 1/1 (35 records)...
✅ Seeded 35 ICD-10 codes

🔬 Seeding LOINC codes...
  Processing chunk 1/1 (25 records)...
✅ Seeded 25 LOINC codes

✅ Database seeding completed successfully!

📈 Summary:
  - ICD-10 codes: 35
  - LOINC codes: 25
```

### Step 8: Restart Application

```bash
# Restart the application (adjust command based on your deployment)
pm2 restart holilabs-web
# OR
docker-compose restart web
# OR
systemctl restart holilabs-web
```

---

## Verification Steps

### 1. Verify Database Schema

```bash
cd apps/web
pnpm prisma studio --schema ../../prisma/schema.prisma
```

**Manual checks**:
- [ ] Open Prisma Studio in browser (usually http://localhost:5555)
- [ ] Verify new tables exist: `Organization`, `ICPBrasilCertificate`, `RNDSExchangeLog`, `InsuranceAuthorization`, `LoincCode`, `SnomedConcept`, `ICD10Code`, `Diagnosis`, `Immunization`, `ProcedureRecord`, `DicomSeries`, `DicomInstance`
- [ ] Verify `ICD10Code` table has 35 records
- [ ] Verify `LoincCode` table has 25 records

### 2. Verify Health Check API

```bash
# From local machine or production server
curl https://your-production-domain.com/api/health
# OR
curl http://localhost:3000/api/health
```

**Expected output**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-05T...",
  "database": "connected",
  "version": "0.1.0"
}
```

### 3. Create Test Organization (via Prisma Studio or psql)

**Option A: Via Prisma Studio**
1. Open Prisma Studio: `pnpm prisma studio --schema ../../prisma/schema.prisma`
2. Navigate to `Organization` model
3. Click "Add record"
4. Fill in required fields:
   - `cnesCode`: `1234567` (7 digits)
   - `cnpj`: `12345678000190` (14 digits)
   - `razaoSocial`: `Test Organization`
   - `countryCode`: `BR`
5. Click "Save 1 change"
6. Verify record is created successfully

**Option B: Via psql**
```bash
psql -h localhost -U your_db_user -d holi_protocol
```

```sql
INSERT INTO "organizations" (
  id,
  "cnesCode",
  cnpj,
  "razaoSocial",
  "countryCode",
  "createdAt"
) VALUES (
  gen_random_uuid(),
  '1234567',
  '12345678000190',
  'Test Organization - Holi Labs',
  'BR',
  NOW()
);

-- Verify insertion
SELECT id, "cnesCode", cnpj, "razaoSocial", "rndsStatus"
FROM "organizations"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Expected output**:
```
                  id                  | cnesCode |      cnpj      |      razaoSocial       | rndsStatus
--------------------------------------+----------+----------------+------------------------+------------
 a1b2c3d4-e5f6-7890-abcd-ef1234567890 | 1234567  | 12345678000190 | Test Organization...   | NOT_SYNCED
```

### 4. Verify IPS Export Capability

Create a test TypeScript file to verify IPS export:

```typescript
// test-ips-export.ts
import { PrismaClient } from '@prisma/client';
import { exportPatientIPS } from './apps/web/src/lib/brazil-interop/ips-exporter';

const prisma = new PrismaClient();

async function testIPSExport() {
  // Get first patient from database
  const patient = await prisma.patient.findFirst();

  if (!patient) {
    console.log('No patients found in database');
    return;
  }

  console.log(`Testing IPS export for patient: ${patient.id}`);

  const ips = await exportPatientIPS(prisma, patient.id);

  console.log('✅ IPS Bundle generated successfully!');
  console.log(`- Resource Type: ${ips.resourceType}`);
  console.log(`- Bundle Type: ${ips.type}`);
  console.log(`- Total Entries: ${ips.entry.length}`);
  console.log('\nBundle structure:');
  ips.entry.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.resource.resourceType}`);
  });
}

testIPSExport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
tsx test-ips-export.ts
```

---

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Rollback database migration
cd apps/web
pnpm prisma migrate resolve --rolled-back 20251205_web2_interop_foundation --schema ../../prisma/schema.prisma

# Revert code changes
git revert 48811c5 fac2d38
git push origin main

# Restart application
pm2 restart holilabs-web
```

---

## Post-Deployment Monitoring

Monitor these metrics for the first 24 hours:

- [ ] Application logs for errors related to new models
- [ ] Database query performance (especially for new foreign keys)
- [ ] API response times (should remain stable)
- [ ] Memory usage (seed data should not significantly increase)

---

## Next Steps

After successful deployment:

1. **Expand Reference Tables**:
   - Import full ICD-10 dataset (~70,000 codes)
   - Import full LOINC dataset (~100,000 codes)
   - Import SNOMED CT core subset

2. **Implement RNDS Integration**:
   - Set up RNDS API credentials
   - Implement FHIR R4 client for data exchange
   - Test patient data submission to RNDS

3. **Implement TISS Integration**:
   - Set up insurance company web service endpoints
   - Test TISS XML generation and submission
   - Implement response parsing and status tracking

4. **Create API Endpoints**:
   - `/api/fhir/patient/[id]/$summary` - IPS export
   - `/api/brazil/tiss/guias` - TISS guide generation
   - `/api/brazil/rnds/sync` - RNDS data synchronization

---

## Deployment Checklist

- [ ] SSH to production server
- [ ] Navigate to application directory
- [ ] Pull latest changes (commits `fac2d38` and `48811c5`)
- [ ] Install dependencies (`pnpm install`)
- [ ] Generate migration (`pnpm prisma migrate dev`)
- [ ] Apply migration (`pnpm prisma migrate deploy`)
- [ ] Run seed script (`pnpm db:seed`)
- [ ] Restart application
- [ ] Verify health check API (green status)
- [ ] Verify Organization creation (via Prisma Studio or psql)
- [ ] Verify ICD-10 codes seeded (35 records)
- [ ] Verify LOINC codes seeded (25 records)
- [ ] Monitor logs for errors
- [ ] Update deployment documentation

---

## Support

If you encounter issues during deployment:

1. Check application logs
2. Check database connection
3. Verify environment variables
4. Check Prisma schema validation: `pnpm prisma validate`
5. Review migration SQL: `cat apps/web/prisma/migrations/20251205_web2_interop_foundation/migration.sql`

---

**Deployment Status**: ⏳ Ready for Execution
**Last Updated**: 2025-12-05
**Prepared By**: Claude Code (Senior DevOps Engineer)
