# Secrets Management Guide
**HoliLabs Security Protocol**
**Last Updated:** December 15, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Types](#secret-types)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Adding New Secrets](#adding-new-secrets)
6. [Rotation Procedures](#rotation-procedures)
7. [Incident Response](#incident-response)
8. [Team Onboarding/Offboarding](#team-onboardingoffboarding)
9. [Compliance Requirements](#compliance-requirements)
10. [Tools & Automation](#tools--automation)

---

## Overview

This guide documents how HoliLabs manages secrets (API keys, passwords, tokens, encryption keys) throughout the development lifecycle.

### Core Principles

1. **Never commit secrets to git** - Use environment variables
2. **Fail-fast validation** - App won't start without required secrets
3. **Least privilege access** - Grant minimum necessary permissions
4. **Regular rotation** - Change secrets on a schedule
5. **Audit everything** - Log all secret access and changes

### Security Standards

- **HIPAA** - Encryption key management (164.312(e))
- **SOC 2** - Access controls and key management (CC6.1, CC6.8)
- **TCPA/CAN-SPAM** - Secure opt-out token generation

---

## Secret Types

### 1. Authentication & Authorization

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `NEXTAUTH_SECRET` | Session encryption | 30 days | CRITICAL |
| `SESSION_SECRET` | Session signing | 30 days | CRITICAL |
| `JWT_SECRET` | JWT token signing | 30 days | CRITICAL |
| `ADMIN_API_KEY` | Admin endpoint auth | 90 days | CRITICAL |
| `CRON_SECRET` | Cron job authorization | 90 days | HIGH |

**Generation:**
```bash
# 64-byte hex for session secrets
openssl rand -hex 64

# 32-byte hex for API keys
openssl rand -hex 32
```

### 2. Encryption Keys

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `ENCRYPTION_KEY` | PHI data encryption | 180 days | CRITICAL |
| `ENCRYPTION_MASTER_KEY` | Key encryption key | 180 days | CRITICAL |
| `OPT_OUT_SECRET_KEY` | Opt-out token encryption | 90 days | HIGH |
| `DEID_SECRET` | De-identification | 180 days | HIGH |

**Generation:**
```bash
# 32-byte base64 for encryption keys
openssl rand -base64 32

# 32-byte hex for token encryption
openssl rand -hex 32
```

### 3. External Service API Keys

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | AI clinical support | 90 days | HIGH |
| `GOOGLE_AI_API_KEY` | AI transcription | 90 days | HIGH |
| `DEEPGRAM_API_KEY` | Speech-to-text | 90 days | MEDIUM |
| `TWILIO_ACCOUNT_SID` | SMS/WhatsApp | 90 days | HIGH |
| `TWILIO_AUTH_TOKEN` | SMS/WhatsApp auth | 90 days | HIGH |
| `RESEND_API_KEY` | Email delivery | 90 days | MEDIUM |

**Management:**
- Rotate through service provider dashboards
- Use separate keys for dev/staging/production
- Monitor usage for anomalies

### 4. Database & Storage

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection | 90 days | CRITICAL |
| `REDIS_URL` | Cache/rate limiting | 90 days | HIGH |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication | 90 days | HIGH |
| `S3_SECRET_ACCESS_KEY` | File storage | 90 days | HIGH |

**Security Notes:**
- Always use SSL/TLS connections
- Use connection pooling limits
- Rotate credentials in maintenance windows

### 5. Monitoring & Logging

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `SENTRY_AUTH_TOKEN` | Error tracking | 180 days | LOW |
| `LOGTAIL_SOURCE_TOKEN` | Structured logging | 180 days | LOW |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | 180 days | LOW |

**Compliance:**
- Ensure PHI scrubbing before logging
- Sanitize sensitive data in error reports

### 6. Payment & Compliance

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `STRIPE_SECRET_KEY` | Payment processing | 180 days | HIGH |
| `STRIPE_WEBHOOK_SECRET` | Payment webhooks | 180 days | HIGH |
| `PAC_PRIVATE_KEY` | Mexican tax compliance | Annual | HIGH |
| `PAC_PRIVATE_KEY_PASSWORD` | Key decryption | Annual | HIGH |

### 7. Search & Performance

| Secret | Purpose | Rotation | Criticality |
|--------|---------|----------|-------------|
| `MEILI_MASTER_KEY` | Patient search auth | 90 days | CRITICAL |

**Security Notes:**
- Meilisearch contains PHI (patient names, emails, MRNs)
- Must require authentication in all environments

---

## Local Development Setup

### Initial Setup

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd apps/web
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

3. **Generate required secrets**
   ```bash
   # Session secrets
   echo "NEXTAUTH_SECRET=$(openssl rand -hex 64)" >> .env.local
   echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env.local

   # Encryption keys
   echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local
   echo "ENCRYPTION_MASTER_KEY=$(openssl rand -base64 32)" >> .env.local

   # API authentication
   echo "ADMIN_API_KEY=$(openssl rand -hex 32)" >> .env.local
   echo "OPT_OUT_SECRET_KEY=$(openssl rand -hex 32)" >> .env.local
   echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local

   # Meilisearch
   echo "MEILI_MASTER_KEY=$(openssl rand -base64 32)" >> .env.local
   ```

4. **Add external service keys**
   ```bash
   # Get from service provider dashboards:
   # - Anthropic: https://console.anthropic.com
   # - Twilio: https://console.twilio.com
   # - Resend: https://resend.com/api-keys
   # - Deepgram: https://console.deepgram.com

   # Add to .env.local manually
   ```

5. **Verify configuration**
   ```bash
   pnpm dev
   # Should start without errors
   # If secrets missing, you'll see clear error messages
   ```

### Development Best Practices

1. **Never commit .env.local**
   - Already in .gitignore
   - Double-check: `git status` should NOT show .env files

2. **Use separate dev keys**
   - Never use production keys locally
   - Use test/sandbox modes for external services

3. **Keep .env.local secure**
   - File permissions: `chmod 600 .env.local`
   - Don't share via Slack/email
   - Use 1Password/LastPass for team sharing

4. **Document custom secrets**
   - If adding new secrets, update `.env.example`
   - Add to this guide's Secret Types section

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All secrets generated with production-grade entropy
- [ ] No dev/test keys used in production
- [ ] All secrets stored in secure secret manager
- [ ] Database connections use SSL/TLS
- [ ] Secrets rotation schedule documented
- [ ] Monitoring alerts configured
- [ ] Backup encryption keys securely stored offline

### Deployment Methods

#### Option 1: Platform Environment Variables (Recommended)

**Vercel:**
```bash
# Add secrets via dashboard or CLI
vercel env add NEXTAUTH_SECRET production
# Paste secret when prompted

# Or via CLI in bulk
vercel env pull .env.production.local
# Edit file, then push back
vercel env push .env.production.local production
```

**DigitalOcean App Platform:**
```bash
# Via dashboard: App Settings → Environment Variables
# Or via App Spec YAML:
envs:
  - key: NEXTAUTH_SECRET
    scope: RUN_TIME
    type: SECRET
    value: <paste-secret>
```

**Railway:**
```bash
# Via dashboard: Variables tab
# Or via CLI:
railway variables set NEXTAUTH_SECRET=<value>
```

#### Option 2: AWS Secrets Manager (Enterprise)

```bash
# Store secret
aws secretsmanager create-secret \
  --name prod/holi/nextauth-secret \
  --secret-string "$(openssl rand -hex 64)"

# Retrieve in app
aws secretsmanager get-secret-value \
  --secret-id prod/holi/nextauth-secret \
  --query SecretString --output text
```

**Integration:**
```typescript
// src/lib/secrets/aws-secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString || '';
}

// Usage
const secret = await getSecret('prod/holi/nextauth-secret');
```

#### Option 3: HashiCorp Vault (Self-Hosted)

```bash
# Store secret
vault kv put secret/holi/prod/nextauth nextauth_secret="<value>"

# Retrieve in app
vault kv get -field=nextauth_secret secret/holi/prod/nextauth
```

### Production Security Requirements

1. **Secret Complexity**
   - Minimum 32 bytes of entropy
   - Use cryptographically secure random generation
   - Never use dictionary words or predictable patterns

2. **Access Control**
   - Limit who can view/modify secrets
   - Use role-based access control (RBAC)
   - Audit all secret access attempts

3. **Encryption**
   - Secrets encrypted at rest
   - TLS for all network transmission
   - No secrets in logs or error messages

4. **Monitoring**
   - Alert on unauthorized access attempts
   - Monitor for secret leakage (GitHub Secret Scanning)
   - Track secret rotation compliance

---

## Adding New Secrets

### Step-by-Step Process

1. **Identify Need**
   - What service/feature requires the secret?
   - What's the security impact if compromised?
   - What's the rotation frequency?

2. **Choose Secret Name**
   - Use SCREAMING_SNAKE_CASE
   - Prefix with service name (e.g., `STRIPE_SECRET_KEY`)
   - Suffix with type (e.g., `_API_KEY`, `_TOKEN`, `_SECRET`)

3. **Generate Secret**
   ```bash
   # API Keys/Tokens
   openssl rand -hex 32

   # Encryption Keys
   openssl rand -base64 32

   # Session Secrets
   openssl rand -hex 64

   # Service-specific (follow provider docs)
   npx web-push generate-vapid-keys  # For web push
   ```

4. **Update Code**
   ```typescript
   // Add to src/lib/env.ts
   export const env = {
     // ... existing vars
     NEW_SECRET: z.string().min(32),
   }

   // Use in code
   const newSecret = process.env.NEW_SECRET;
   if (!newSecret) {
     throw new Error('NEW_SECRET environment variable is required');
   }
   ```

5. **Update Documentation**
   ```bash
   # Add to .env.example
   echo "NEW_SECRET=\"your-secret-here\"  # Description and generation command" >> .env.example

   # Add to this guide under Secret Types
   # Document purpose, rotation schedule, criticality
   ```

6. **Update Deployment**
   - Add to production secret manager
   - Add to staging/dev environments
   - Update CI/CD pipelines if needed

7. **Test**
   ```bash
   # Verify app fails without secret
   unset NEW_SECRET
   pnpm dev  # Should error

   # Verify app works with secret
   export NEW_SECRET="test-value"
   pnpm dev  # Should start
   ```

---

## Rotation Procedures

### When to Rotate

**Scheduled Rotation:**
- Critical secrets: Every 30 days
- High-value secrets: Every 90 days
- Medium-value secrets: Every 180 days

**Incident-Triggered Rotation:**
- Employee offboarding
- Suspected compromise
- After security incident
- Failed compliance audit

### Rotation Process

#### 1. Session Secrets (Zero-Downtime)

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 64)

# 2. Add as secondary secret (supports both old & new)
# In deployment platform, add NEW_SECRET_2
vercel env add NEXTAUTH_SECRET_2 production
# Paste new secret

# 3. Deploy with dual-secret support
# App validates sessions with both secrets for 7 days

# 4. After 7 days, make new secret primary
vercel env remove NEXTAUTH_SECRET production
vercel env rename NEXTAUTH_SECRET_2 NEXTAUTH_SECRET production

# 5. Deploy final version
```

#### 2. API Keys (Service-Dependent)

**Anthropic/OpenAI:**
```bash
# 1. Create new key in provider dashboard
# 2. Update production environment variable
# 3. Test thoroughly in staging
# 4. Deploy to production
# 5. Revoke old key after 24 hours
```

**Twilio:**
```bash
# 1. Generate new Auth Token in Twilio Console
# 2. Update TWILIO_AUTH_TOKEN in production
# 3. Deploy immediately
# 4. Revoke old token
# 5. Monitor for failed SMS/WhatsApp deliveries
```

#### 3. Database Credentials

**PostgreSQL:**
```bash
# 1. Create new database user
CREATE USER holi_app_v2 WITH PASSWORD 'new_secure_password';
GRANT ALL PRIVILEGES ON DATABASE holi_labs TO holi_app_v2;

# 2. Update DATABASE_URL with new credentials
# 3. Deploy application
# 4. Monitor for connection errors
# 5. After 24 hours, revoke old user
DROP USER holi_app_v1;
```

#### 4. Encryption Keys (CRITICAL)

```bash
# ⚠️ WARNING: Rotating encryption keys requires data re-encryption
# Plan maintenance window

# 1. Generate new key
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)

# 2. Add as ENCRYPTION_KEY_V2
# 3. Run migration script to re-encrypt all data
pnpm tsx scripts/rotate-encryption-key.ts

# 4. Verify all data decrypts correctly
# 5. Update ENCRYPTION_KEY to new value
# 6. Remove ENCRYPTION_KEY_V2
```

### Rotation Checklist

For each secret rotation:

- [ ] Schedule maintenance window (if downtime required)
- [ ] Generate new secret with proper entropy
- [ ] Test in staging environment
- [ ] Update production secret manager
- [ ] Deploy application changes
- [ ] Verify functionality
- [ ] Revoke old secret after grace period
- [ ] Update team documentation
- [ ] Log rotation in audit trail

---

## Incident Response

### If Secret Exposed in Git

1. **Immediately revoke the secret**
   - API Key: Revoke in provider dashboard
   - Database: Change password, kill active sessions
   - Session Secret: Rotate and invalidate all sessions

2. **Remove from git history**
   ```bash
   # Using BFG Repo-Cleaner (fast)
   brew install bfg
   bfg --replace-text passwords.txt .git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push (coordinate with team)
   git push origin --force --all
   git push origin --force --tags
   ```

3. **Scan for unauthorized usage**
   - Check service provider logs
   - Look for API calls from unknown IPs
   - Review database access logs

4. **Document incident**
   - When secret was exposed
   - How long it was accessible
   - Actions taken to remediate
   - Impact assessment

### If Secret Compromised

1. **Rotate immediately** (see Rotation Procedures above)

2. **Investigate impact**
   - What data was accessed?
   - Were modifications made?
   - Compliance notification required? (HIPAA breach < 500 patients?)

3. **Strengthen security**
   - Add additional monitoring
   - Implement IP allowlisting if possible
   - Review access controls

4. **Team communication**
   - Notify security team
   - Update incident response documentation
   - Conduct post-mortem

### Emergency Contacts

- **Security Team Lead:** [contact-info]
- **DevOps On-Call:** [contact-info]
- **Compliance Officer:** [contact-info]

---

## Team Onboarding/Offboarding

### Onboarding New Developer

1. **Provide development setup guide**
   - Link to this document
   - Share `.env.example`
   - DO NOT share production secrets

2. **Set up local environment**
   - Developer generates own local secrets
   - Provide test/sandbox API keys if needed
   - Grant database access (dev database only)

3. **Grant necessary access**
   - GitHub repository access
   - Development secret manager access (if used)
   - Service provider dashboards (dev accounts only)

4. **Security training**
   - Review this guide
   - Explain why we never commit secrets
   - Show how to use git-secrets

### Offboarding Developer

1. **Immediately revoke access**
   - [ ] GitHub repository access
   - [ ] Secret manager access
   - [ ] Service provider dashboards
   - [ ] Database access
   - [ ] VPN/server access

2. **Rotate critical secrets**
   - [ ] Database passwords
   - [ ] Admin API keys
   - [ ] Any secrets they had access to

3. **Review audit logs**
   - Check for suspicious activity
   - Verify no secrets exported

4. **Update documentation**
   - Remove from access lists
   - Update on-call rotation

---

## Compliance Requirements

### HIPAA (Health Insurance Portability and Accountability Act)

**Relevant Regulations:**
- 164.312(a)(2)(i) - Unique user identification
- 164.312(d) - Person or entity authentication
- 164.312(e)(1) - Transmission security

**Requirements:**
- Encryption keys for PHI must be stored securely
- Access to encryption keys must be logged
- Keys must be rotated regularly (every 180 days)
- Key access requires unique user authentication

**Implementation:**
```typescript
// All PHI encryption must use validated keys
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY required for HIPAA compliance');
}

// Log key access
logger.info({
  event: 'encryption_key_access',
  userId: currentUser.id,
  purpose: 'patient_data_encryption',
  timestamp: new Date().toISOString(),
});
```

### SOC 2 (System and Organization Controls)

**Relevant Controls:**
- CC6.1 - Logical and physical access controls
- CC6.6 - Logical access based on needs
- CC6.7 - Encryption of sensitive data
- CC6.8 - Encryption key management

**Evidence Required:**
- Secret rotation logs
- Access control policies
- Key management procedures
- Incident response documentation

### TCPA/CAN-SPAM (SMS/Email Compliance)

**Requirements:**
- Opt-out tokens must be cryptographically secure
- Tokens must be tamper-proof
- Opt-out must be processed within 10 business days

**Implementation:**
```typescript
// Secure opt-out token generation
const optOutSecret = process.env.OPT_OUT_SECRET_KEY;
if (!optOutSecret) {
  throw new Error('OPT_OUT_SECRET_KEY required for TCPA compliance');
}
```

---

## Tools & Automation

### git-secrets (Prevent Commits)

```bash
# Install
brew install git-secrets

# Setup for repository
cd /path/to/repo
git secrets --install

# Add patterns
git secrets --register-aws
git secrets --add 'sk-[a-zA-Z0-9]{40,}'  # OpenAI/Anthropic
git secrets --add 'AC[a-z0-9]{32}'        # Twilio
git secrets --add 're_[A-Za-z0-9]+'       # Resend

# Scan repository
git secrets --scan-history

# Scan staged files before commit (automatic with hooks)
git commit -m "test"  # Will fail if secrets detected
```

### GitHub Secret Scanning

Enable in repository settings:
1. Settings → Security & Analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

Will block pushes containing:
- AWS keys
- GitHub tokens
- Stripe keys
- Many other common secrets

### TruffleHog (CI/CD Integration)

```yaml
# .github/workflows/security.yml
name: Secret Scanning
on: [push, pull_request]

jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Secret Rotation Automation

```typescript
// scripts/rotate-secrets.ts
import { SecretsManagerClient, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function rotateSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  // Generate new secret
  const newSecret = crypto.randomBytes(32).toString('hex');

  // Store in AWS Secrets Manager
  await client.send(new PutSecretValueCommand({
    SecretId: secretName,
    SecretString: newSecret,
  }));

  console.log(`Rotated: ${secretName}`);
}

// Rotate all secrets on schedule
const secretsToRotate = [
  'prod/holi/nextauth-secret',
  'prod/holi/session-secret',
  'prod/holi/admin-api-key',
];

for (const secret of secretsToRotate) {
  await rotateSecret(secret);
}
```

### Monitoring & Alerts

```typescript
// src/lib/monitoring/secret-usage.ts
export function trackSecretUsage(secretName: string) {
  // Log to monitoring system
  logger.info({
    event: 'secret_usage',
    secret: secretName,
    timestamp: new Date(),
    user: getCurrentUser(),
  });

  // Alert if unusual pattern
  if (isAnomalousUsage(secretName)) {
    sendAlert({
      severity: 'high',
      message: `Anomalous usage of ${secretName}`,
    });
  }
}
```

---

## Appendix: Secret Generation Reference

### Quick Commands

```bash
# Session secrets (64 bytes hex)
openssl rand -hex 64

# API keys (32 bytes hex)
openssl rand -hex 32

# Encryption keys (32 bytes base64)
openssl rand -base64 32

# VAPID keys (web push)
npx web-push generate-vapid-keys

# UUID (for IDs)
uuidgen

# Strong password
openssl rand -base64 24 | tr -d "=+/" | cut -c1-24
```

### Entropy Requirements

| Secret Type | Minimum Entropy | Recommended |
|-------------|----------------|-------------|
| Session Secrets | 256 bits | 512 bits |
| API Keys | 128 bits | 256 bits |
| Encryption Keys | 256 bits | 256 bits |
| Passwords | 80 bits | 128 bits |

### Testing Secret Strength

```bash
# Calculate entropy
echo -n "your-secret" | wc -c
# Multiply by 8 for bits

# Verify randomness
echo "your-secret" | ent
# Should show high entropy, low chi-square
```

---

## Questions & Support

**For questions about secrets management:**
- Review this guide first
- Check `.env.example` for examples
- Ask in #security Slack channel
- Contact Security Team Lead

**For production secret access:**
- Submit ticket with justification
- Requires approval from Security Team Lead
- Access logged and time-limited

**For suspected secret compromise:**
- Report immediately to Security Team Lead
- Follow Incident Response procedures above
- DO NOT attempt to investigate on your own

---

**Last Updated:** December 15, 2025
**Next Review:** January 15, 2026
**Maintained By:** Security Team
**Version:** 1.0
