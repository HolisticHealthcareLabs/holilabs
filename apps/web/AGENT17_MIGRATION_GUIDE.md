# Agent 17: Database Migration Guide

## Quick Start

Execute these commands in order to apply the missing models to your database:

### 1. Format and Validate Schema
```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web
pnpm prisma format
```

### 2. Generate TypeScript Types
```bash
pnpm prisma generate
```

### 3. Create Migration
```bash
pnpm prisma migrate dev --name add_device_pairing_models
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your development database
- Regenerate Prisma Client with new types

### 4. Verify Migration
```bash
pnpm prisma migrate status
```

## Migration SQL Preview

The migration will create:

### Table: device_pairings
```sql
CREATE TABLE "device_pairings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL UNIQUE,
  "deviceType" TEXT NOT NULL,
  "deviceName" TEXT,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  CONSTRAINT "device_pairings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "device_pairings_userId_idx" ON "device_pairings"("userId");
CREATE INDEX "device_pairings_deviceId_idx" ON "device_pairings"("deviceId");
CREATE INDEX "device_pairings_expiresAt_idx" ON "device_pairings"("expiresAt");
CREATE INDEX "device_pairings_isActive_idx" ON "device_pairings"("isActive");
```

### Table: device_permissions
```sql
CREATE TABLE "device_permissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "devicePairingId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "grantedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  CONSTRAINT "device_permissions_devicePairingId_fkey"
    FOREIGN KEY ("devicePairingId") REFERENCES "device_pairings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "device_permissions_devicePairingId_permission_key"
  ON "device_permissions"("devicePairingId", "permission");
CREATE INDEX "device_permissions_devicePairingId_idx" ON "device_permissions"("devicePairingId");
CREATE INDEX "device_permissions_permission_idx" ON "device_permissions"("permission");
```

### Enums
```sql
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE_IOS', 'MOBILE_ANDROID', 'TABLET');

CREATE TYPE "PermissionScope" AS ENUM (
  'READ_PATIENT_DATA',
  'WRITE_NOTES',
  'VIEW_TRANSCRIPT',
  'CONTROL_RECORDING',
  'ACCESS_DIAGNOSIS',
  'VIEW_MEDICATIONS',
  'EDIT_SOAP_NOTES',
  'FULL_ACCESS'
);
```

## Production Deployment

### For Production Database

1. **Test in staging first:**
```bash
# Set to staging database
DATABASE_URL="postgresql://staging..." pnpm prisma migrate deploy
```

2. **Apply to production:**
```bash
# Set to production database
DATABASE_URL="postgresql://production..." pnpm prisma migrate deploy
```

### Rollback (If Needed)

If you need to rollback:
```bash
# Mark migration as rolled back
pnpm prisma migrate resolve --rolled-back add_device_pairing_models

# Drop the tables manually if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS device_permissions CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS device_pairings CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS DeviceType CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS PermissionScope CASCADE;"
```

## Verification Steps

### 1. Check Tables Created
```bash
psql $DATABASE_URL -c "\dt device*"
```

Expected output:
```
              List of relations
 Schema |        Name         | Type  |  Owner
--------+---------------------+-------+---------
 public | device_pairings     | table | postgres
 public | device_permissions  | table | postgres
```

### 2. Check Enums Created
```bash
psql $DATABASE_URL -c "\dT+ DeviceType"
psql $DATABASE_URL -c "\dT+ PermissionScope"
```

### 3. Verify Indexes
```bash
psql $DATABASE_URL -c "\d device_pairings"
```

Should show all indexes listed above.

### 4. Test API Endpoints

```bash
# Test device pairing (requires authentication)
curl -X POST http://localhost:3000/api/qr/pair \
  -H "Content-Type: application/json" \
  -d '{
    "qrPayload": {
      "sessionId": "test-session",
      "userId": "user-id",
      "deviceId": "device-123",
      "deviceType": "MOBILE_IOS",
      "pairingCode": "123456",
      "expiresAt": 1735689600000
    }
  }'

# List paired devices
curl -X GET http://localhost:3000/api/qr/pair

# Test permissions
curl -X POST http://localhost:3000/api/qr/permissions \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-123",
    "permissions": ["READ_PATIENT_DATA", "VIEW_TRANSCRIPT"]
  }'
```

## Common Issues

### Issue 1: "Column already exists"
**Solution:** Migration already applied. Run `pnpm prisma migrate status` to verify.

### Issue 2: "Relation does not exist"
**Solution:** Ensure User model exists. This migration depends on the users table.

### Issue 3: "Enum type already exists"
**Solution:** Drop and recreate if needed:
```sql
DROP TYPE IF EXISTS "DeviceType" CASCADE;
DROP TYPE IF EXISTS "PermissionScope" CASCADE;
```
Then re-run migration.

## Database Size Impact

- **device_pairings:** ~200-300 bytes per row
- **device_permissions:** ~100-150 bytes per row
- **Indexes:** ~50-100KB for every 1000 records

**Estimated total:** Minimal impact, <1MB for typical usage

## Performance Considerations

- ✅ All foreign keys indexed
- ✅ Query patterns optimized with composite indexes
- ✅ Soft delete via `isActive` flag prevents data loss
- ✅ Cascade deletes handle cleanup automatically

## Monitoring

After deployment, monitor:
1. Query performance on device lookups
2. Growth rate of device_pairings table
3. Expired pairings cleanup effectiveness

Consider adding a cron job to clean expired pairings:
```sql
DELETE FROM device_pairings
WHERE expiresAt < NOW() AND isActive = false;
```

## Support

For issues, reference:
- Main documentation: `AGENT17_MISSING_MODELS_IMPLEMENTATION.md`
- Schema file: `prisma/schema.prisma` (lines 5499-5574)
- API implementations: `src/app/api/qr/pair/route.ts` and `src/app/api/qr/permissions/route.ts`

---

**Status:** Ready for deployment
**Estimated Migration Time:** 2-3 minutes
**Downtime Required:** None (additive changes only)
**Risk Level:** Low
