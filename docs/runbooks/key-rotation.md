# Runbook: Key Rotation

**Severity:** Medium (P2) - Scheduled maintenance or security response
**Expected Resolution Time:** 30-60 minutes
**On-Call Required:** No (for scheduled rotation), Yes (for compromise)

---

## When to Rotate Keys

### Scheduled Rotation (Quarterly)
- **Encryption keys** (ENCRYPTION_KEY): Every 90 days
- **API keys** (Resend, SendGrid, Twilio): Every 90 days
- **Session secrets** (SESSION_SECRET, NEXTAUTH_SECRET): Every 180 days
- **Database passwords**: Every 180 days
- **JWT signing keys**: Every 90 days

### Emergency Rotation (Immediate)
- ✅ Key exposed in git repository
- ✅ Key exposed in logs or error messages
- ✅ Suspected compromise or unauthorized access
- ✅ Employee with key access departed
- ✅ Third-party service breach
- ✅ Compliance audit requirement

---

## Pre-Rotation Checklist

### 1. Schedule Maintenance Window
```markdown
**Maintenance Window:** [Date] [Time] - [Time] (2 hours)
**Impact:** Brief API disruptions during restart (2-3 minutes)
**User Notification:** 48 hours advance notice
**Rollback Plan:** Revert to old keys if issues occur
```

### 2. Backup Current Keys
```bash
# Save current environment variables to encrypted backup
# NEVER commit this file to git!

cat > /tmp/keys-backup-$(date +%Y%m%d).env <<EOF
# Backup created: $(date)
# DO NOT COMMIT TO GIT

ENCRYPTION_KEY=$(echo $ENCRYPTION_KEY)
SESSION_SECRET=$(echo $SESSION_SECRET)
NEXTAUTH_SECRET=$(echo $NEXTAUTH_SECRET)
DATABASE_URL=$(echo $DATABASE_URL)
RESEND_API_KEY=$(echo $RESEND_API_KEY)
SENDGRID_API_KEY=$(echo $SENDGRID_API_KEY)
TWILIO_AUTH_TOKEN=$(echo $TWILIO_AUTH_TOKEN)
EOF

# Encrypt backup file
gpg --symmetric --cipher-algo AES256 /tmp/keys-backup-$(date +%Y%m%d).env
# Creates: /tmp/keys-backup-YYYYMMDD.env.gpg

# Store encrypted backup in secure location
aws s3 cp /tmp/keys-backup-$(date +%Y%m%d).env.gpg \
  s3://holi-security-backups/key-backups/

# Delete unencrypted file
rm /tmp/keys-backup-$(date +%Y%m%d).env
```

### 3. Verify Deployment Access
```bash
# Verify you have access to production environment
doctl auth list
doctl apps list

# Or AWS
aws sts get-caller-identity

# Verify database access
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

---

## Key Rotation Procedures

### 1. Encryption Key Rotation (ENCRYPTION_KEY)

⚠️ **CRITICAL:** Rotating encryption key requires re-encrypting all PHI data.

#### Step 1: Generate New Key
```bash
# Generate new 256-bit encryption key
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "New key: $NEW_ENCRYPTION_KEY"

# IMPORTANT: Store this key securely before proceeding
# Add to password manager or secrets vault
```

#### Step 2: Test Key Generation
```bash
# Verify key is valid format (64 hex characters)
echo $NEW_ENCRYPTION_KEY | grep -E '^[0-9a-f]{64}$'
# Should return the key if valid

# Test encryption with new key
node -e "
const crypto = require('crypto');
const key = Buffer.from('$NEW_ENCRYPTION_KEY', 'hex');
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
cipher.update('test', 'utf8');
const encrypted = cipher.final();
console.log('✓ New key is valid');
"
```

#### Step 3: Re-encrypt PHI Data
```typescript
// File: scripts/rotate-encryption-key.ts
import { PrismaClient } from '@prisma/client';
import { decryptPHI, encryptPHI, setEncryptionKey } from '@/lib/security/encryption';

const prisma = new PrismaClient();

async function rotateEncryptionKey(oldKey: string, newKey: string) {
  console.log('Starting encryption key rotation...');

  // Set old key for decryption
  setEncryptionKey(oldKey);

  const PHI_FIELDS = {
    Patient: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'cpf', 'cns'],
    PatientUser: ['email', 'phone'],
  };

  // Rotate Patient PHI
  const patients = await prisma.patient.findMany();
  console.log(`Re-encrypting ${patients.length} patients...`);

  for (const patient of patients) {
    const decrypted: any = {};
    const encrypted: any = {};

    // Decrypt with old key
    for (const field of PHI_FIELDS.Patient) {
      if (patient[field]) {
        decrypted[field] = await decryptPHI(patient[field], oldKey);
      }
    }

    // Encrypt with new key
    setEncryptionKey(newKey);
    for (const field of PHI_FIELDS.Patient) {
      if (decrypted[field]) {
        encrypted[field] = await encryptPHI(decrypted[field], newKey);
      }
    }

    // Update database
    await prisma.patient.update({
      where: { id: patient.id },
      data: encrypted,
    });

    console.log(`✓ Re-encrypted patient ${patient.id}`);
  }

  // Rotate PatientUser PHI
  const patientUsers = await prisma.patientUser.findMany();
  console.log(`Re-encrypting ${patientUsers.length} patient users...`);

  for (const user of patientUsers) {
    // Similar process as above
    // ... (decrypt with old key, encrypt with new key, update)
  }

  console.log('✓ Encryption key rotation complete');
}

// Run rotation
const OLD_KEY = process.env.ENCRYPTION_KEY!;
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY!;

rotateEncryptionKey(OLD_KEY, NEW_KEY)
  .then(() => {
    console.log('✓ SUCCESS: All PHI re-encrypted');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ FAILED:', error);
    process.exit(1);
  });
```

#### Step 4: Execute Rotation
```bash
# Set new key temporarily
export NEW_ENCRYPTION_KEY="<new-key-here>"

# Run rotation script (test in staging first!)
DATABASE_URL=$STAGING_DATABASE_URL npx tsx scripts/rotate-encryption-key.ts

# Verify in staging
# Check that patient data can be decrypted with new key

# Run in production
DATABASE_URL=$PRODUCTION_DATABASE_URL npx tsx scripts/rotate-encryption-key.ts
```

#### Step 5: Update Application Environment
```bash
# DigitalOcean App Platform
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: ENCRYPTION_KEY
        value: "$NEW_ENCRYPTION_KEY"
EOF

# Restart application
doctl apps create-deployment <app-id>

# Monitor logs
doctl apps logs <app-id> --type=run --follow
```

#### Step 6: Verify Data Access
```bash
# Test that PHI can be decrypted
curl https://api.holilabs.xyz/api/patients/123 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Should return decrypted patient data (firstName, lastName, etc.)
# If returns encrypted strings, rollback immediately
```

---

### 2. Session Secret Rotation (SESSION_SECRET, NEXTAUTH_SECRET)

⚠️ **Impact:** All users will be logged out after rotation.

#### Step 1: Generate New Secrets
```bash
# Generate new session secret
NEW_SESSION_SECRET=$(openssl rand -base64 32)
echo "New SESSION_SECRET: $NEW_SESSION_SECRET"

# Generate new NextAuth secret
NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "New NEXTAUTH_SECRET: $NEW_NEXTAUTH_SECRET"
```

#### Step 2: Notify Users
```markdown
**Maintenance Notice**

We will be performing scheduled security maintenance on [Date] at [Time].

**Impact:** All users will be logged out and need to sign in again.

**Duration:** 5 minutes

**Action Required:** Please save any work in progress before [Time].
```

#### Step 3: Update Secrets
```bash
# Update environment variables
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: SESSION_SECRET
        value: "$NEW_SESSION_SECRET"
      - key: NEXTAUTH_SECRET
        value: "$NEW_NEXTAUTH_SECRET"
EOF

# Restart application
doctl apps create-deployment <app-id>
```

#### Step 4: Clear Old Sessions
```bash
# Clear all Redis sessions
redis-cli KEYS "session:*" | xargs redis-cli DEL

# Verify sessions cleared
redis-cli KEYS "session:*" | wc -l
# Should return 0
```

#### Step 5: Verify Login
```bash
# Test login flow
curl -X POST https://api.holilabs.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should return new session token
```

---

### 3. Database Password Rotation

#### Step 1: Create New Database User (Zero Downtime Method)
```bash
# Connect to database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d postgres

# Create new user with same privileges
CREATE USER holi_new WITH PASSWORD 'new_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE holi_protocol TO holi_new;

# Grant schema privileges
\c holi_protocol
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO holi_new;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO holi_new;
GRANT ALL PRIVILEGES ON SCHEMA public TO holi_new;

# Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO holi_new;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO holi_new;
```

#### Step 2: Test New User
```bash
# Test connection with new user
PGPASSWORD='new_secure_password_here' psql \
  -h $DB_HOST \
  -U holi_new \
  -d holi_protocol \
  -c "SELECT COUNT(*) FROM \"Patient\";"

# Should successfully return patient count
```

#### Step 3: Update Application Connection String
```bash
# Update DATABASE_URL
NEW_DATABASE_URL="postgresql://holi_new:new_secure_password_here@$DB_HOST:5432/holi_protocol?schema=public&sslmode=require"

doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: DATABASE_URL
        value: "$NEW_DATABASE_URL"
EOF

# Restart application
doctl apps create-deployment <app-id>
```

#### Step 4: Monitor for Errors
```bash
# Check for database connection errors
doctl apps logs <app-id> --type=run --follow | grep -i "database\|prisma"

# Check application health
curl https://api.holilabs.xyz/api/health/database

# Should return: {"status":"connected"}
```

#### Step 5: Revoke Old User (After 24 Hours)
```bash
# After confirming new user works, revoke old user
PGPASSWORD='new_secure_password_here' psql \
  -h $DB_HOST \
  -U holi_new \
  -d postgres \
  -c "DROP USER IF EXISTS holi;"
```

---

### 4. API Key Rotation (Resend, SendGrid, Twilio)

#### Resend API Key
```bash
# Step 1: Generate new key in Resend dashboard
# https://resend.com/api-keys
# Click "Create API Key" > Full Access

# Step 2: Test new key
curl https://api.resend.com/domains \
  -H "Authorization: Bearer re_new_key_here"

# Should return list of domains

# Step 3: Update environment variable
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: RESEND_API_KEY
        value: "re_new_key_here"
EOF

# Step 4: Restart application
doctl apps create-deployment <app-id>

# Step 5: Test email sending
curl -X POST https://api.holilabs.xyz/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test"}'

# Step 6: Revoke old key in Resend dashboard (after 24 hours)
```

#### SendGrid API Key
```bash
# Step 1: Generate new key in SendGrid dashboard
# https://app.sendgrid.com/settings/api_keys
# Create API Key > Full Access

# Step 2: Test new key
curl https://api.sendgrid.com/v3/user/profile \
  -H "Authorization: Bearer SG.new_key_here"

# Should return user profile

# Step 3: Update environment variable
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: SENDGRID_API_KEY
        value: "SG.new_key_here"
EOF

# Step 4: Restart and verify (similar to Resend)
```

#### Twilio API Key
```bash
# Step 1: Generate new API key in Twilio console
# https://console.twilio.com/us1/develop/api-keys/create

# Step 2: Test new key
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:new_auth_token_here"

# Step 3: Update environment variable
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: TWILIO_AUTH_TOKEN
        value: "new_auth_token_here"
EOF

# Step 4: Restart and test OTP flow
```

---

### 5. JWT Signing Key Rotation

#### Step 1: Generate New Key Pair
```bash
# Generate new RSA key pair
openssl genrsa -out jwt-private-new.pem 4096
openssl rsa -in jwt-private-new.pem -pubout -out jwt-public-new.pem

# Convert to base64 for environment variable
JWT_PRIVATE_KEY_NEW=$(cat jwt-private-new.pem | base64 -w 0)
JWT_PUBLIC_KEY_NEW=$(cat jwt-public-new.pem | base64 -w 0)

echo "JWT_PRIVATE_KEY: $JWT_PRIVATE_KEY_NEW"
echo "JWT_PUBLIC_KEY: $JWT_PUBLIC_KEY_NEW"
```

#### Step 2: Update Application with Both Keys (Dual-Key Period)
```typescript
// Support both old and new keys during transition
// File: src/lib/auth/jwt.ts

const OLD_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY_OLD;
const NEW_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY_NEW;
const NEW_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY_NEW;

// Sign with new key
export function signJWT(payload: any): string {
  return jwt.sign(payload, NEW_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

// Verify with both keys (fallback to old key)
export function verifyJWT(token: string): any {
  try {
    // Try new key first
    return jwt.verify(token, NEW_PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch (error) {
    // Fallback to old key
    try {
      return jwt.verify(token, OLD_PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch (fallbackError) {
      throw new Error('Invalid token');
    }
  }
}
```

#### Step 3: Deploy Dual-Key Configuration
```bash
# Update environment with both keys
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: JWT_PRIVATE_KEY_NEW
        value: "$JWT_PRIVATE_KEY_NEW"
      - key: JWT_PUBLIC_KEY_NEW
        value: "$JWT_PUBLIC_KEY_NEW"
      - key: JWT_PUBLIC_KEY_OLD
        value: "$JWT_PUBLIC_KEY_OLD"
EOF

# Restart application
doctl apps create-deployment <app-id>
```

#### Step 4: Wait for Old Tokens to Expire
```bash
# Wait for JWT expiration period (e.g., 1 hour)
# All old tokens will naturally expire

# Monitor token verification
doctl apps logs <app-id> | grep "JWT"
```

#### Step 5: Remove Old Key
```bash
# After all old tokens expired, remove old key
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: JWT_PRIVATE_KEY
        value: "$JWT_PRIVATE_KEY_NEW"
      - key: JWT_PUBLIC_KEY
        value: "$JWT_PUBLIC_KEY_NEW"
      # Remove JWT_PUBLIC_KEY_OLD
EOF

# Update code to remove old key fallback
# Deploy updated code
```

---

## Verification Checklist

After rotating keys, verify:

### Application Health
- [ ] Health endpoint responds: `curl https://api.holilabs.xyz/api/health`
- [ ] No errors in application logs: `doctl apps logs <app-id> --type=run`
- [ ] No Sentry errors related to encryption/auth

### Authentication & Sessions
- [ ] Users can log in successfully
- [ ] Session tokens are valid
- [ ] JWT tokens work correctly
- [ ] MFA still works

### Data Access
- [ ] Patient data can be read (decrypted correctly)
- [ ] Patient data can be written (encrypted correctly)
- [ ] No "decryption failed" errors

### External Services
- [ ] Emails are being sent (check queue metrics)
- [ ] SMS/WhatsApp OTP working (Twilio)
- [ ] No API key errors in logs

### Database
- [ ] Database connection stable
- [ ] No authentication errors
- [ ] Queries executing normally

---

## Rollback Procedure

If issues occur after key rotation:

### 1. Immediate Rollback
```bash
# Decrypt backup file
gpg --decrypt /tmp/keys-backup-YYYYMMDD.env.gpg > /tmp/keys-backup.env

# Source old keys
source /tmp/keys-backup.env

# Update application with old keys
doctl apps update <app-id> --spec - <<EOF
services:
  - name: api
    envs:
      - key: ENCRYPTION_KEY
        value: "$ENCRYPTION_KEY"
      - key: SESSION_SECRET
        value: "$SESSION_SECRET"
      - key: NEXTAUTH_SECRET
        value: "$NEXTAUTH_SECRET"
      # ... other keys
EOF

# Restart application
doctl apps create-deployment <app-id>

# Delete unencrypted backup
rm /tmp/keys-backup.env
```

### 2. Verify Rollback
```bash
# Test application functionality
curl https://api.holilabs.xyz/api/health

# Test patient data access
curl https://api.holilabs.xyz/api/patients/123 \
  -H "Authorization: Bearer $TOKEN"

# Monitor logs for errors
doctl apps logs <app-id> --follow
```

---

## Post-Rotation Actions

### 1. Document Rotation
```markdown
## Key Rotation Log

**Date:** 2024-01-07
**Performed By:** [Your Name]
**Keys Rotated:**
- [x] ENCRYPTION_KEY
- [x] SESSION_SECRET
- [x] NEXTAUTH_SECRET
- [x] RESEND_API_KEY
- [x] DATABASE_PASSWORD

**Issues Encountered:** None

**Rollback Required:** No

**Next Rotation Due:** 2024-04-07 (90 days)
```

### 2. Update Key Rotation Schedule
```markdown
# Key Rotation Schedule

| Key | Last Rotated | Next Rotation | Frequency |
|-----|--------------|---------------|-----------|
| ENCRYPTION_KEY | 2024-01-07 | 2024-04-07 | 90 days |
| SESSION_SECRET | 2024-01-07 | 2024-07-07 | 180 days |
| RESEND_API_KEY | 2024-01-07 | 2024-04-07 | 90 days |
| DATABASE_PASSWORD | 2024-01-07 | 2024-07-07 | 180 days |
```

### 3. Destroy Old Keys
```bash
# Delete old key backups after 30 days
aws s3 rm s3://holi-security-backups/key-backups/keys-backup-$(date -d '30 days ago' +%Y%m%d).env.gpg

# Revoke old API keys in provider dashboards
# - Resend: Delete old API key
# - SendGrid: Delete old API key
# - Twilio: Delete old auth token
```

---

## Prevention & Best Practices

### Key Management
```typescript
// Use environment-specific keys
const ENCRYPTION_KEY = process.env.NODE_ENV === 'production'
  ? process.env.ENCRYPTION_KEY_PROD
  : process.env.ENCRYPTION_KEY_DEV;

// Never log keys
logger.info('Encryption initialized', {
  keyLength: ENCRYPTION_KEY.length,
  // ❌ NEVER: key: ENCRYPTION_KEY
});

// Validate key format on startup
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('Invalid ENCRYPTION_KEY format');
}
```

### Automated Rotation Reminders
```yaml
# .github/workflows/key-rotation-reminder.yml
name: Key Rotation Reminder

on:
  schedule:
    - cron: '0 9 1 * *' # First day of each month at 9 AM

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: Check key rotation schedule
        run: |
          # Check if keys are due for rotation (>90 days old)
          # Send notification to Slack/email
          echo "⚠️ Key rotation due: ENCRYPTION_KEY (last rotated 92 days ago)"
```

### Secrets Management Tools
```bash
# Use AWS Secrets Manager for production
aws secretsmanager create-secret \
  --name holi/production/encryption-key \
  --secret-string "$ENCRYPTION_KEY"

# Enable automatic rotation (AWS)
aws secretsmanager rotate-secret \
  --secret-id holi/production/encryption-key \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123:function:RotateSecret \
  --rotation-rules AutomaticallyAfterDays=90
```

---

## Related Runbooks
- [Security Incident Response](./security-incident-response.md)
- [Deployment Rollback](./deployment-rollback.md)

---

## Changelog
- **2024-01-07**: Initial version created
