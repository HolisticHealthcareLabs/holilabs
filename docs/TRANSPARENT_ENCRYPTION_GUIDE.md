# Transparent PHI Encryption Guide

**SOC 2 Control**: CC6.7 (Data Encryption)
**HIPAA Control**: §164.312(a)(2)(iv) (Encryption and Decryption)

---

## Overview

Transparent encryption automatically encrypts PHI (Protected Health Information) fields when writing to the database and decrypts them when reading. Developers never touch encryption directly - it's 100% transparent.

**Key Benefits**:
- ✅ **Zero Code Changes**: Works with existing Prisma queries
- ✅ **Automatic**: Encrypt on write, decrypt on read
- ✅ **Key Versioning**: Seamless key rotation support
- ✅ **Backward Compatible**: Handles legacy unencrypted data
- ✅ **Performance Optimized**: Async crypto operations
- ✅ **Null-Safe**: Preserves NULL values

---

## Architecture

```
Application Code (Prisma)
    ↓
Prisma Client Extension (encryption-extension.ts)
    ↓
    ├─→ [Write Operation] → Encrypt PHI fields → PostgreSQL
    └─→ [Read Operation]  → PostgreSQL → Decrypt PHI fields
```

**Encryption Format**: `v{version}:iv:authTag:encrypted`
**Example**: `v2:1a2b3c4d5e6f:9a8b7c6d5e4f:YWJjZGVmZ2hpamtsbW5vcA==`

---

## Usage Examples

### Basic CRUD Operations (Automatic Encryption)

```typescript
import { prisma } from '@/lib/prisma'; // Already extended with encryption

// CREATE - Automatic encryption
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',        // ← Encrypted automatically
    lastName: 'Doe',          // ← Encrypted automatically
    email: 'john@example.com', // ← Encrypted automatically
    phone: '+1234567890',     // ← Encrypted automatically
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE',
  },
});

console.log(patient.firstName); // ← "John" (decrypted automatically)

// READ - Automatic decryption
const foundPatient = await prisma.patient.findUnique({
  where: { id: patient.id },
});

console.log(foundPatient.firstName); // ← "John" (decrypted)
console.log(foundPatient.email);     // ← "john@example.com" (decrypted)

// UPDATE - Automatic encryption
await prisma.patient.update({
  where: { id: patient.id },
  data: {
    firstName: 'Jane', // ← Re-encrypted with current key
  },
});

// FIND MANY - Automatic decryption for all records
const patients = await prisma.patient.findMany({
  where: { assignedClinicianId: clinicianId },
});

patients.forEach(p => {
  console.log(p.firstName); // ← All decrypted automatically
});
```

### What Gets Encrypted?

**Patient Model**:
- `firstName`, `lastName`
- `email`, `phone`, `address`
- `primaryContactPhone`, `primaryContactEmail`, `primaryContactAddress`
- `secondaryContactPhone`, `secondaryContactEmail`
- `emergencyContactPhone`

**Prescription Model**:
- `patientInstructions`
- `pharmacyNotes`

**Consultation Model**:
- `chiefComplaint`
- `historyOfPresentIllness`
- `reviewOfSystems`
- `physicalExamination`
- `assessmentAndPlan`
- `notes`

**LabResult Model**:
- `interpretation`
- `notes`

**Invoice Model**:
- `billingAddress`
- `patientNotes`

To add more fields, edit `/apps/web/src/lib/db/encryption-extension.ts`:

```typescript
const PHI_FIELDS_CONFIG: Record<string, string[]> = {
  Patient: [
    'firstName',
    'lastName',
    // ... add more fields here
  ],
  YourModel: [
    'fieldName1',
    'fieldName2',
  ],
};
```

---

## Key Versioning & Rotation

### How Key Versioning Works

Each encrypted field has a corresponding `{fieldName}KeyVersion` column:

```prisma
model Patient {
  firstName          String @db.Text
  firstNameKeyVersion Int   @default(1)  // ← Key version used for encryption

  email          String? @db.Text
  emailKeyVersion Int?    @default(1)
}
```

When you rotate keys:
1. **New data**: Encrypted with current key (v2)
2. **Old data**: Decrypted with previous key (v1)
3. **No downtime**: Both keys work simultaneously

### Key Rotation Process

**Step 1: Rotate key in AWS Secrets Manager**

```bash
pnpm tsx scripts/rotate-keys.ts
```

**Step 2: Re-encrypt existing data (optional, can be done gradually)**

```bash
# Dry run first
pnpm tsx scripts/encrypt-existing-phi.ts --dry-run

# Re-encrypt with new key
pnpm tsx scripts/encrypt-existing-phi.ts
```

**Step 3: Verify**

```bash
pnpm tsx scripts/encrypt-existing-phi.ts --verify
```

---

## Database Schema Updates

### Adding Key Version Fields

When adding a new encrypted field, update the schema:

```prisma
model Patient {
  // New encrypted field
  newSensitiveField String? @db.Text
  newSensitiveFieldKeyVersion Int? @default(1)
}
```

Then run migration:

```bash
cd apps/web
npx prisma migrate dev --name add_new_sensitive_field_encryption
```

---

## Manual Encryption (Advanced)

For edge cases where you need manual control:

```typescript
import {
  encryptField,
  decryptField,
  isEncrypted,
  getEncryptionVersion
} from '@/lib/db/encryption-extension';

// Manual encryption
const encrypted = await encryptField('sensitive data');
console.log(encrypted); // v2:iv:authTag:encrypted

// Manual decryption
const plaintext = await decryptField(encrypted);
console.log(plaintext); // "sensitive data"

// Check if encrypted
if (isEncrypted(value)) {
  const version = getEncryptionVersion(value);
  console.log(`Encrypted with key version: ${version}`);
}
```

---

## Migration Guide

### Migrating Existing Unencrypted Data

**Prerequisites**:
1. Database backup
2. Downtime window (or use read replicas)
3. Test on staging first

**Step-by-Step**:

```bash
# 1. Backup database
pg_dump -U holi -d holi_protocol > backup_pre_encryption_$(date +%Y%m%d).sql

# 2. Dry run (preview changes)
pnpm tsx scripts/encrypt-existing-phi.ts --dry-run --verbose

# 3. Check what will be encrypted
pnpm tsx scripts/encrypt-existing-phi.ts --verify

# 4. Run migration (Patient model only for testing)
pnpm tsx scripts/encrypt-existing-phi.ts --model=Patient

# 5. Verify Patient model
pnpm tsx scripts/encrypt-existing-phi.ts --model=Patient --verify

# 6. Run full migration
pnpm tsx scripts/encrypt-existing-phi.ts

# 7. Final verification
pnpm tsx scripts/encrypt-existing-phi.ts --verify
```

**Expected Output**:

```
🔐 PHI Data Migration Tool
═══════════════════════════════════════════════════════════════════════════════
Mode:       ✅ LIVE
Verbose:    OFF
Batch Size: 100
Key Version: 2
═══════════════════════════════════════════════════════════════════════════════

📦 Processing model: Patient
─────────────────────────────────────────────────────────────────────────────
📊 Total records: 1,247
  Progress: 100% (1247/1247)

📊 Model Summary:
  Records processed:     1,247
  Fields encrypted:      8,729
  Already encrypted:     0
  Errors:                0

✅ Migration complete!
   All PHI data has been encrypted with key version 2
```

---

## Performance Considerations

### Encryption Performance

- **Encryption**: ~0.5ms per field (AES-256-GCM)
- **Decryption**: ~0.5ms per field
- **Batch operations**: Parallelized for optimal throughput

**Example**: Encrypting 1,000 patient records with 7 PHI fields each:
- Sequential: ~3.5 seconds
- Parallel (100 batch): ~1.2 seconds

### Optimization Tips

1. **Batch Size**: Tune `--batch-size` for your hardware
   ```bash
   # Large server: 500 records/batch
   pnpm tsx scripts/encrypt-existing-phi.ts --batch-size=500

   # Small server: 50 records/batch
   pnpm tsx scripts/encrypt-existing-phi.ts --batch-size=50
   ```

2. **Selective Encryption**: Migrate one model at a time
   ```bash
   pnpm tsx scripts/encrypt-existing-phi.ts --model=Patient
   pnpm tsx scripts/encrypt-existing-phi.ts --model=Prescription
   ```

3. **Read Replicas**: Use read replicas during migration to avoid downtime

---

## Troubleshooting

### Issue 1: "Key version mismatch" error

**Symptom**: Cannot decrypt data after key rotation

**Solution**:
```typescript
// Check encryption key versions
import { getCurrentKeyVersion } from '@/lib/security/encryption';
console.log('Current key version:', getCurrentKeyVersion());

// Verify AWS Secrets Manager has AWSCURRENT and AWSPREVIOUS
import { getEncryptionKey } from '@/lib/secrets/aws-secrets';
const current = await getEncryptionKey('current');
const previous = await getEncryptionKey('previous');
console.log('Current:', current.version);
console.log('Previous:', previous.version);
```

### Issue 2: "Field not encrypted" in production

**Symptom**: Some fields remain unencrypted

**Solution**:
```bash
# Verify encryption coverage
pnpm tsx scripts/encrypt-existing-phi.ts --verify

# Check specific model
pnpm tsx scripts/encrypt-existing-phi.ts --model=Patient --verify
```

### Issue 3: Performance degradation

**Symptom**: Slow queries after enabling encryption

**Causes**:
- Large batch operations without pagination
- Decrypting hundreds of records at once

**Solution**:
```typescript
// Use pagination for large queries
const patients = await prisma.patient.findMany({
  take: 50,  // Limit to 50 records
  skip: page * 50,
});

// Or use cursor-based pagination
const patients = await prisma.patient.findMany({
  take: 50,
  cursor: { id: lastId },
});
```

### Issue 4: Migration script hangs

**Symptom**: Migration script stops responding

**Solution**:
```bash
# Reduce batch size
pnpm tsx scripts/encrypt-existing-phi.ts --batch-size=10

# Check database connections
psql -U holi -d holi_protocol -c "SELECT count(*) FROM pg_stat_activity;"

# Kill hung connections
psql -U holi -d holi_protocol -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'holi_protocol' AND state = 'idle in transaction';
"
```

---

## Security Best Practices

### 1. Key Storage

✅ **DO**:
- Store keys in AWS Secrets Manager
- Enable automatic key rotation (90 days)
- Use IAM roles (not access keys)

❌ **DON'T**:
- Hardcode keys in code
- Store keys in `.env` files in production
- Share keys via email/Slack

### 2. Key Rotation

✅ **DO**:
- Rotate encryption keys every 90 days
- Test key rotation in staging first
- Keep previous key for 30 days after rotation

❌ **DON'T**:
- Delete old keys immediately after rotation
- Skip verification after rotation
- Rotate keys during peak traffic

### 3. Data Access

✅ **DO**:
- Use Casbin RBAC for access control
- Log all PHI access with Bemi audit trail
- Implement data access reason tracking (LGPD compliance)

❌ **DON'T**:
- Bypass encryption for "performance"
- Store decrypted PHI in logs
- Cache decrypted PHI in Redis/memory

---

## Testing

### Unit Tests

```typescript
// __tests__/encryption-extension.test.ts
import { PrismaClient } from '@prisma/client';
import { encryptionExtension } from '@/lib/db/encryption-extension';

describe('Transparent Encryption', () => {
  const prisma = new PrismaClient().$extends(encryptionExtension);

  it('should encrypt PHI fields on create', async () => {
    const patient = await prisma.patient.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        mrn: 'MRN123',
        tokenId: 'TOK123',
      },
    });

    // Read directly from database to verify encryption
    const rawPatient = await prisma.$queryRaw`
      SELECT "firstName", "email" FROM "patients" WHERE id = ${patient.id}
    `;

    expect(rawPatient[0].firstName).toMatch(/^v\d+:/); // Encrypted format
    expect(rawPatient[0].email).toMatch(/^v\d+:/);
  });

  it('should decrypt PHI fields on read', async () => {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    expect(patient.firstName).toBe('John'); // Decrypted
    expect(patient.email).toBe('john@example.com');
  });

  it('should handle NULL values', async () => {
    const patient = await prisma.patient.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: null, // NULL value
        dateOfBirth: new Date('1985-05-15'),
        mrn: 'MRN456',
        tokenId: 'TOK456',
      },
    });

    expect(patient.email).toBeNull(); // Preserved NULL
  });
});
```

### Integration Tests

```bash
# Test migration script
cd apps/web
DATABASE_URL="postgresql://test_user:test_pass@localhost:5433/test_db" \
  pnpm tsx scripts/encrypt-existing-phi.ts --dry-run

# Test key rotation
pnpm tsx scripts/rotate-keys.ts --dry-run
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Encryption Performance**:
   ```typescript
   // Add to /apps/web/src/lib/observability/metrics.ts
   const encryptionLatency = new Histogram({
     name: 'phi_encryption_latency_ms',
     help: 'PHI field encryption latency',
   });
   ```

2. **Decryption Errors**:
   ```typescript
   const decryptionErrors = new Counter({
     name: 'phi_decryption_errors_total',
     help: 'Total PHI decryption errors',
   });
   ```

3. **Key Version Distribution**:
   ```sql
   SELECT
     "firstNameKeyVersion" AS key_version,
     COUNT(*) AS record_count
   FROM patients
   GROUP BY "firstNameKeyVersion";
   ```

### CloudWatch Alarms (Production)

```yaml
# cloudwatch-alarms.yml
Alarms:
  - AlarmName: HighDecryptionErrorRate
    MetricName: phi_decryption_errors_total
    Threshold: 10
    Period: 300 # 5 minutes
    EvaluationPeriods: 2
    Statistic: Sum

  - AlarmName: EncryptionLatencyHigh
    MetricName: phi_encryption_latency_ms
    Threshold: 100 # 100ms
    Period: 60
    EvaluationPeriods: 3
    Statistic: Average
```

---

## Compliance Checklist

### SOC 2 CC6.7 Requirements

- [x] All PHI encrypted at rest (AES-256-GCM)
- [x] Encryption keys rotated every 90 days
- [x] Keys stored in AWS Secrets Manager (not in code)
- [x] Key version tracking for audit trail
- [x] Automated encryption/decryption (no manual errors)
- [x] Failed decryption attempts logged
- [x] Encryption coverage verification script

### HIPAA §164.312(a)(2)(iv) Requirements

- [x] Technical safeguards for ePHI
- [x] Encryption of ePHI at rest
- [x] Decryption mechanism documented
- [x] Encryption key management policy
- [x] Regular key rotation (90 days)
- [x] Audit trail of all PHI access (Bemi)

---

## References

- [NIST Special Publication 800-57](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf) - Key Management
- [HIPAA Encryption Requirements](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)

---

**Questions?** Contact the Holi Labs engineering team.
