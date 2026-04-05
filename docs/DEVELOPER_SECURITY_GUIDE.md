# Developer Security Guide — Holi Labs

**Version:** 1.0
**Date:** 2026-04-03
**Audience:** All engineers contributing to holilabsv2
**Regulatory Context:** HIPAA (US), LGPD (Brazil), ANVISA RDC 657/2022

---

## 1. Handling PHI in Code

### What Is PHI?

Protected Health Information (PHI) is any data that can identify a patient AND relates
to their health status, treatment, or payment. Under LGPD, this extends to any
"dados pessoais sensíveis" including biometric and genetic data.

### Do / Don't

```typescript
// --- NEVER DO THIS ---

// Logging PHI
console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
console.log({ mrn: patient.mrn, diagnosis: encounter.diagnosis });
logger.info(`CPF: ${patient.cpf}`);

// PHI in error messages
throw new Error(`Patient ${patient.firstName} not found`);

// PHI in URLs or query params
redirect(`/patients?name=${patient.firstName}`);

// SELECT * on patient tables
const patient = await prisma.$queryRaw`SELECT * FROM patients WHERE id = ${id}`;

// Storing PHI in browser storage
localStorage.setItem('currentPatient', JSON.stringify(patient));

// Returning PHI in API error responses
return NextResponse.json({ error: `No record for CPF ${cpf}` }, { status: 404 });


// --- ALWAYS DO THIS ---

// Use tokenized identifiers in logs
logger.info({ tokenId: patient.tokenId, action: 'record_viewed', userId: session.user.id });

// Generic error messages
throw new AppError('PATIENT_NOT_FOUND', 'The requested patient record was not found');

// Explicit column selection
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
  select: { id: true, tokenId: true, firstName: true, lastName: true },
});

// Encrypted field storage
const encryptedFirstName = await encryptField(rawFirstName, currentKeyVersion);
await prisma.patient.update({
  where: { id: patientId },
  data: { firstName: encryptedFirstName, firstNameKeyVersion: currentKeyVersion },
});

// Audit every access
await auditService.log({
  action: 'PATIENT_VIEW',
  resourceType: 'Patient',
  resourceId: patient.id,
  userId: session.user.id,
  accessReason: 'clinical_encounter',
});
```

### PHI Field Reference

See `.claude/rules/security.md` for the complete inventory of PHI fields by model,
encryption requirements, and classification levels.

---

## 2. Adding New API Routes Securely

### Checklist

Before submitting a PR for any new API route:

- [ ] **Auth middleware applied** — use `createProtectedRoute` with appropriate roles
- [ ] **Zod input validation** — all `req.body`, `req.query`, `req.params` validated
- [ ] **Rate limiting** — route uses the rate limiter (default or custom bucket)
- [ ] **Audit logging** — PHI access creates audit log entry with `accessReason`
- [ ] **Error handling** — no PHI in error responses, proper status codes
- [ ] **CORS** — route respects CORS policy (automatic via middleware)
- [ ] **Integration test** — happy path + auth failure + validation failure + not found
- [ ] **Security test** — RBAC isolation (horizontal/vertical privilege escalation)
- [ ] **TypeScript strict** — no `any`, no `@ts-ignore`, proper return types

### Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { auditService } from '@/lib/services/audit-service';

const RequestSchema = z.object({
  patientId: z.string().cuid(),
});

async function handler(req: NextRequest, context: { session: Session }) {
  const body = RequestSchema.parse(await req.json());

  // Business logic here...

  await auditService.log({
    action: 'RESOURCE_ACCESS',
    resourceType: 'Patient',
    resourceId: body.patientId,
    userId: context.session.user.id,
    accessReason: 'api_request',
  });

  return NextResponse.json({ data: result });
}

export const POST = createProtectedRoute(handler, {
  roles: ['ADMIN', 'PHYSICIAN'],
});
```

### Threat Analysis for New Endpoints

Any PR that adds a network-facing endpoint must include in the PR description:

```markdown
## Threat Analysis
- **Authentication:** [How is the caller authenticated?]
- **Authorization:** [What roles can access? How is ownership verified?]
- **Input validation:** [What Zod schema? Max payload size?]
- **Data exposure:** [What data is returned? Is any PHI included?]
- **Rate limiting:** [What bucket? What limits?]
- **Abuse scenarios:** [How could this endpoint be misused?]
```

---

## 3. Running Security Checks Locally

### Pre-Commit Hook (Automatic)

The pre-commit hook at `.claude/hooks/pre-commit-security-check.sh` runs automatically
and checks for:
- Hardcoded secrets (AWS keys, API keys, JWTs, connection strings)
- PHI field names in log statements
- `.env` files in staged changes
- `--dangerously-skip-permissions` flags
- `SELECT *` on patient tables

### Manual Security Scan

```bash
# Run the pre-commit check manually on all files
./.claude/hooks/pre-commit-security-check.sh

# Run the pre-push validation
./.claude/hooks/pre-push-validation.sh

# npm audit
pnpm audit --audit-level=high

# Check for known vulnerabilities in dependencies
pnpm dlx better-npm-audit audit

# TypeScript strict check
cd apps/web && pnpm tsc --noEmit

# Run security-focused test suites
pnpm test -- --testPathPattern="rbac|consent|audit|habeas|erasure|rate-limit"
```

### Secret Scanning

```bash
# Install TruffleHog locally
brew install trufflehog

# Scan current branch diff against main
trufflehog git file://. --since-commit=$(git merge-base HEAD main) --only-verified

# Scan entire repo history (slow — run occasionally)
trufflehog git file://. --only-verified
```

---

## 4. Incident Response Playbook

Informed by CVE-2026-4747 (FreeBSD kernel RCE): AI systems can autonomously exploit
vulnerabilities at machine speed. Response must be equally fast for containment.

### Step 1: ISOLATE (0-15 minutes)

**Goal:** Stop the bleeding. Limit blast radius.

```bash
# Kill switch for affected service (if self-hosted)
doctl apps update $APP_ID --spec /dev/null  # Caution: removes app

# Or: scale to zero
doctl apps update-component $APP_ID web --instance-count 0

# Rotate all active sessions immediately
# In Redis:
redis-cli FLUSHDB  # Nuclear option — invalidates all sessions

# Block suspicious IPs at CDN/firewall level
# (Specific commands depend on your CDN — Cloudflare, DO Firewall, etc.)
```

**For DigitalOcean App Platform:**
- Use the DigitalOcean dashboard to pause the app
- Enable maintenance mode via environment variable `MAINTENANCE_MODE=true`

### Step 2: ASSESS (15-60 minutes)

**Goal:** Determine what was accessed and by whom.

```sql
-- Check audit logs for unauthorized access during the incident window
SELECT
  action,
  resource_type,
  resource_id,
  user_id,
  ip_address,
  access_reason,
  created_at
FROM audit_logs
WHERE created_at BETWEEN '[INCIDENT_START]' AND '[INCIDENT_END]'
  AND (
    action LIKE '%PATIENT%'
    OR action LIKE '%EXPORT%'
    OR action LIKE '%BULK%'
  )
ORDER BY created_at DESC;

-- Check for unusual access patterns
SELECT
  user_id,
  COUNT(*) as access_count,
  COUNT(DISTINCT resource_id) as unique_records
FROM audit_logs
WHERE created_at BETWEEN '[INCIDENT_START]' AND '[INCIDENT_END]'
GROUP BY user_id
HAVING COUNT(*) > 100  -- Abnormal volume
ORDER BY access_count DESC;
```

**Questions to answer:**
- Was PHI accessed? If so, how many records?
- Was it an authenticated or unauthenticated attack?
- What was the attack vector? (API, UI, direct DB, supply chain)
- Is the vulnerability still exploitable?

### Step 3: CONTAIN (1-4 hours)

**Goal:** Eliminate the attack vector and secure the environment.

```bash
# 1. Rotate ALL secrets
# Database password
doctl databases user reset-auth $DB_ID $USER --engine pg

# Application secrets (update in DO App Platform or Vault)
# - NEXTAUTH_SECRET
# - SESSION_SECRET
# - PHI_ENCRYPTION_KEY_V{n} (add new version, DON'T delete old)
# - All API keys (Anthropic, Deepgram, Sentry, etc.)

# 2. Invalidate all sessions (forces re-authentication)
redis-cli FLUSHDB

# 3. If dependency compromise: pin to last known good version
# Edit package.json to exact version, run pnpm install --frozen-lockfile

# 4. Deploy hotfix
git checkout -b hotfix/security-[CVE-ID]
# ... apply fix ...
# Fast-track: skip canary if P0, but MUST pass security scan
```

### Step 4: NOTIFY (Per regulatory SLA)

| Regulation | Who | Timeline | Method |
|-----------|-----|----------|--------|
| **LGPD** (Brazil) | ANPD (Autoridade Nacional) | **2 business days** from awareness | Official form on ANPD website |
| **LGPD** (Brazil) | Affected data subjects | **2 business days** (if risk to rights) | Email + in-app notification |
| **HIPAA** (US) | HHS OCR | **60 calendar days** from discovery | HHS breach portal |
| **HIPAA** (US) | Affected individuals | **60 calendar days** | Written notice |
| **HIPAA** (US) | Media (if > 500 individuals) | **60 calendar days** | Press release |

**Notification content must include:**
- Description of the incident
- Types of data involved
- Steps taken to contain
- Steps individuals can take to protect themselves
- Contact information for questions

### Step 5: REMEDIATE & POSTMORTEM (1-2 weeks)

**Postmortem template:**

```markdown
## Incident Postmortem: [TITLE]

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2
**Duration:** [detection] to [resolution]
**Impact:** [number of records/users affected]

### Timeline
- HH:MM — [event]

### Root Cause
[Technical root cause — be specific]

### What Went Well
- [Detection mechanism that worked]

### What Went Wrong
- [Gap that allowed the incident]

### Action Items
- [ ] [Specific fix with owner and deadline]

### Lessons Learned
[What changes to process/architecture/monitoring]
```

---

## 5. Patch Management SLA

| Severity | CVSS Score | Patch Deadline | Process |
|----------|-----------|---------------|---------|
| **Critical** | 9.0 - 10.0 | **24 hours** | P0 incident. Drop everything. Hotfix branch. |
| **High** | 7.0 - 8.9 | **72 hours** | P1. Scheduled within current sprint. |
| **Medium** | 4.0 - 6.9 | **2 weeks** | P2. Next sprint planning. |
| **Low** | 0.1 - 3.9 | **Next release** | P3. Backlog. |

### Process

1. **Detection:** `npm audit` in CI, Dependabot alerts, security-continuous.yml scans
2. **Triage:** Security Lead assesses CVSS + exploitability in our context
3. **Patch:** Create `security/<CVE-ID>` branch, apply fix, run full test suite
4. **Review:** Security-critical changes require 2 approvers
5. **Deploy:** Follow standard deploy pipeline (canary → production)
6. **Verify:** Post-deploy smoke tests confirm fix and no regression

### What NOT To Do

- Do NOT wait for the next scheduled release to patch critical vulnerabilities
- Do NOT disable security checks to "ship faster"
- Do NOT patch production directly — always go through CI/CD pipeline
- Do NOT assume a CVE "doesn't affect us" without verifying — document the analysis

---

## 6. Encryption Reference

### At Rest

| Data | Algorithm | Key Management |
|------|-----------|---------------|
| PHI fields (Patient model) | AES-256-GCM | Versioned keys (`PHI_ENCRYPTION_KEY_V{n}`) in env vars |
| Passwords | bcrypt (cost 12) | N/A (one-way hash) |
| MFA backup codes | AES-256-GCM | Same key rotation as PHI |
| Signing PINs | bcrypt (cost 12) | N/A (one-way hash) |
| API keys (BYOK) | AES-256-GCM | Per-user encryption |
| Database backups | AES-256 (provider-managed) | DigitalOcean managed keys |

### In Transit

| Path | Protocol | Certificate |
|------|----------|------------|
| Client → App | TLS 1.3 (minimum TLS 1.2) | Let's Encrypt via DO |
| App → Database | TLS 1.2+ (sslmode=require) | DO managed PostgreSQL |
| App → Redis | TLS 1.2+ | Upstash managed |
| App → External APIs | TLS 1.3 | Vendor certificates |

### Key Rotation

1. Generate new key, assign next version number
2. Set `PHI_ENCRYPTION_KEY_V{n+1}` and update `PHI_ENCRYPTION_KEY_VERSION`
3. New writes use the new key automatically (key version stored per field)
4. Reads decrypt using the key version stored with the ciphertext
5. Background job re-encrypts old records with new key (optional, recommended quarterly)
6. Old keys retained for read-back (NEVER delete old encryption keys)
