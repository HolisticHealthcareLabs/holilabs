# PHI Handling Guidelines for Developers
**Version:** 1.0
**Last Updated:** 2026-01-03
**Owner:** Privacy Officer & Engineering Team
**Classification:** Internal - HIPAA Critical

---

## Overview

This document provides practical guidelines for developers on how to handle Protected Health Information (PHI) correctly in code, ensuring HIPAA compliance and patient privacy protection.

**⚠️ CRITICAL**: Improper PHI handling can result in:
- HIPAA violations ($100 - $50,000 per violation)
- Data breach notification requirements
- Patient harm
- Loss of reputation
- Criminal liability (in severe cases)

**🎯 Goal**: Write code that protects patient privacy by default.

---

## Table of Contents

1. [What is PHI?](#what-is-phi)
2. [PHI Access Rules](#phi-access-rules)
3. [PHI in Code](#phi-in-code)
4. [PHI Storage](#phi-storage)
5. [PHI Transmission](#phi-transmission)
6. [PHI Display](#phi-display)
7. [PHI Disposal](#phi-disposal)
8. [De-identification](#de-identification)
9. [Audit Logging](#audit-logging)
10. [Common Mistakes](#common-mistakes)
11. [Code Examples](#code-examples)
12. [Checklist](#checklist)

---

## What is PHI?

### HIPAA Definition

**Protected Health Information (PHI)** is any information that:
1. Relates to an individual's **past, present, or future** health condition, treatment, or payment
2. Can be used to **identify** the individual

### 18 HIPAA Identifiers

**Direct Identifiers:**
1. ✅ **Names** (first, last, maiden)
2. ✅ **Geographic subdivisions smaller than state** (address, city, ZIP+4)
3. ✅ **Dates** directly related to an individual (DOB, admission date, discharge date, death date)
4. ✅ **Telephone numbers**
5. ✅ **Fax numbers**
6. ✅ **Email addresses**
7. ✅ **Social Security Numbers (SSN)**
8. ✅ **Medical Record Numbers (MRN)**
9. ✅ **Health Plan Beneficiary Numbers**
10. ✅ **Account Numbers**
11. ✅ **Certificate/License Numbers**
12. ✅ **Vehicle identifiers and serial numbers** (VIN, license plates)
13. ✅ **Device identifiers and serial numbers** (pacemaker serial, implant ID)
14. ✅ **Web URLs**
15. ✅ **IP addresses**
16. ✅ **Biometric identifiers** (fingerprints, retinal scans, voice prints)
17. ✅ **Full-face photographs**
18. ✅ **Any other unique identifying number, characteristic, or code**

**Clinical Identifiers:**
- ✅ **Diagnoses** (ICD-10 codes with patient link)
- ✅ **Prescriptions** (medications with patient link)
- ✅ **Lab results** (with patient link)
- ✅ **Vital signs** (with patient link)
- ✅ **Clinical notes** (SOAP notes, progress notes)

### What is NOT PHI?

**De-identified Data:**
- ❌ Aggregate statistics (no patient link)
- ❌ Anonymous surveys
- ❌ Medical knowledge (diseases, treatments) without patient context

**Health Information Alone (No Identifier):**
- ❌ "Blood pressure: 120/80" (no patient link)
- ❌ "Diagnosis: Diabetes Type 2" (no patient link)

**Public Information:**
- ❌ Hospital directory (if patient consented)
- ❌ Published research with de-identified data

---

## PHI Access Rules

### Minimum Necessary Rule

**HIPAA Requirement**: Access only the **minimum necessary** PHI to perform your job.

**✅ DO:**
- Access PHI only for assigned tasks (e.g., fixing patient search bug)
- Use test data for non-PHI tasks (e.g., styling, layout)
- Close database GUIs when done

**❌ DON'T:**
- Browse patient records out of curiosity
- Access your own medical record via production database
- Share PHI screenshots in Slack
- Export PHI to personal laptop

### Role-Based Access Control (RBAC)

**Your Role Determines Your Access:**

| Role | PHI Access |
|------|-----------|
| **Engineer (Dev)** | None (test data only) |
| **Engineer (On-Call)** | Read-only logs (no PHI) |
| **System Admin** | Database access (audit logged) |
| **Physician** | Full patient records (assigned patients) |
| **Nurse** | Limited patient records (assigned patients) |
| **Receptionist** | Scheduling only (no clinical data) |

**Check Your Access:**
```bash
# In development: No access to production PHI
# In production: Access is logged and monitored
```

### Access Logging

**All PHI Access is Logged:**
- Who accessed (user ID)
- What accessed (patient ID, resource)
- When accessed (timestamp)
- Why accessed (action: READ, UPDATE, DELETE)
- Result (success/failure)

**Audit Trail is Immutable:**
- Logs cannot be deleted
- Logs cannot be modified
- Logs are retained for 6 years (HIPAA requirement)

---

## PHI in Code

### Logging PHI

**❌ NEVER Use console.log with PHI:**

```typescript
// ❌ BAD: PHI in console.log
console.log('Patient:', patient.name, patient.ssn);
console.log(patient);  // Contains PHI

// ❌ BAD: PHI in debug statements
console.debug('Loading patient', patientId, patient.email);

// ❌ BAD: PHI in error messages
throw new Error(`Failed to update patient ${patient.name}`);
```

**✅ ALWAYS Use Structured Logger (Auto-Scrubbed):**

```typescript
// ✅ GOOD: Use logger with safe fields
import { logger } from '@/lib/logger';

logger.info({
  userId: user.id,           // ✅ Safe: Internal ID
  patientId: patient.id,     // ✅ Safe: Internal ID
  action: 'UPDATE',
}, 'Patient record updated');

// ✅ GOOD: Logger auto-scrubs sensitive fields
logger.info({ patient }, 'Patient loaded');
// Output: { patient: { id: 'xxx', name: '[REDACTED]', ... } }

// ✅ GOOD: Use error codes, not PHI
throw new AppError('PATIENT_UPDATE_FAILED', { patientId: patient.id });
```

**Logger Auto-Scrubs These Fields:**
- `name`, `firstName`, `lastName`, `middleName`
- `email`
- `phone`, `phoneNumber`, `mobile`
- `ssn`, `socialSecurityNumber`
- `address`, `street`, `city` (if granular)
- `dob`, `dateOfBirth`
- `password`, `token`, `apiKey`

### Debugging with PHI

**❌ DON'T:**
- Set breakpoints and inspect PHI in production
- Copy PHI to local files for debugging
- Share PHI screenshots in bug reports

**✅ DO:**
- Use test data in development
- Use patient IDs (internal), not names
- Reproduce bugs with synthetic data

**Debugging Example:**
```typescript
// ❌ BAD: Debugging with real PHI
debugger;  // Pauses on production with real patient data
console.log(patient.name, patient.ssn);  // PHI exposed

// ✅ GOOD: Debugging with IDs only
logger.debug({
  patientId: patient.id,  // ✅ Internal ID (not PHI)
  action: 'search',
  resultCount: results.length,
}, 'Patient search completed');

// ✅ GOOD: Use debugger in development only
if (process.env.NODE_ENV === 'development') {
  debugger;
}
```

### PHI in Variables

**✅ DO: Use Clear Variable Names:**

```typescript
// ✅ GOOD: Clear distinction
const patientId = 'cuid-123';         // Internal ID (not PHI)
const patientName = patient.name;     // PHI (handle carefully)
const patientSSN = patient.ssn;       // PHI (encrypt at rest)
const patientEmail = patient.email;   // PHI (audit access)

// ✅ GOOD: Type annotations for clarity
type PHI_Patient = {
  id: string;                          // Not PHI
  name: string;                        // PHI
  email: string;                       // PHI
  dob: Date;                           // PHI
};
```

### PHI in Comments

**❌ NEVER Include Real PHI in Comments:**

```typescript
// ❌ BAD: Real PHI in comment
// Bug: Patient "John Doe" (SSN: 123-45-6789) has duplicate record

// ✅ GOOD: Use internal ID or generic example
// Bug: Patient ID cuid-123 has duplicate record
// Bug: Some patients have duplicate records (see JIRA-456)
```

### PHI in Git Commits

**❌ NEVER Commit PHI:**

```bash
# ❌ BAD: PHI in commit message
git commit -m "Fix bug for patient John Doe (john@example.com)"

# ✅ GOOD: Use internal ID or generic description
git commit -m "fix(patients): resolve duplicate record issue (PATIENT-123)"
```

**If You Accidentally Commit PHI:**
1. 🚨 **Immediately** notify Security Team
2. Rewrite Git history (git filter-branch or BFG Repo-Cleaner)
3. Force push to remote (requires admin)
4. Rotate any exposed credentials
5. Document incident in security log

---

## PHI Storage

### Encryption at Rest

**All PHI MUST Be Encrypted at Rest:**

```typescript
// ✅ GOOD: Use encrypted fields (automatic via Prisma extension)
import { prisma } from '@/lib/prisma';

const patient = await prisma.patient.create({
  data: {
    name: 'John Doe',          // ✅ Encrypted via Prisma extension
    email: 'john@example.com', // ✅ Encrypted
    ssn: '123-45-6789',        // ✅ Encrypted
    dob: new Date('1980-01-01'),
  },
});

// ❌ BAD: Storing PHI in plaintext (unencrypted field)
const patient = await prisma.patient.create({
  data: {
    notes: 'Patient has diabetes',  // ❌ If not encrypted
  },
});
```

**Encryption Implementation:**
- Algorithm: AES-256-GCM
- Key: Stored in environment variable (`ENCRYPTION_KEY`)
- Automatic: Prisma extension handles encryption/decryption
- Fields: See `/apps/web/src/lib/db/encryption-extension.ts`

### Database Access

**✅ DO:**
- Use Prisma ORM (prevents SQL injection)
- Use parameterized queries
- Apply row-level security (RLS)
- Use database connection pooling

**❌ DON'T:**
- Use raw SQL with string interpolation
- Store PHI in logs table
- Export PHI to CSV without encryption

**Example:**
```typescript
// ✅ GOOD: Prisma ORM (safe)
const patients = await prisma.patient.findMany({
  where: { organizationId: user.organizationId },
});

// ❌ BAD: Raw SQL with interpolation (SQL injection risk)
const patients = await prisma.$queryRaw`
  SELECT * FROM patients WHERE id = ${patientId}
`;
// If patientId = "1 OR 1=1", returns all patients!

// ✅ GOOD: Raw SQL with parameterization (safe)
const patients = await prisma.$queryRaw`
  SELECT * FROM patients WHERE id = ${patientId}::text
`;
```

### Caching PHI

**⚠️ WARNING**: Caching PHI requires encryption.

```typescript
// ❌ BAD: PHI in plaintext cache
await redis.set(`patient:${patientId}`, JSON.stringify(patient));

// ✅ GOOD: Cache internal IDs only (not PHI)
await redis.set(`patient:${patientId}:computed`, JSON.stringify({
  riskScore: 0.75,
  lastVisit: '2025-01-01',
}));

// ✅ GOOD: Encrypted PHI in cache
import { encrypt, decrypt } from '@/lib/crypto';
const encryptedPatient = encrypt(JSON.stringify(patient));
await redis.set(`patient:${patientId}`, encryptedPatient);
```

---

## PHI Transmission

### HTTPS/TLS Required

**All PHI Transmission MUST Use HTTPS:**

```typescript
// ✅ GOOD: HTTPS enforced via security headers
// See /apps/web/next.config.js
// Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

// ❌ BAD: HTTP (unencrypted)
const response = await fetch('http://api.holilabs.com/patients');

// ✅ GOOD: HTTPS (encrypted)
const response = await fetch('https://api.holilabs.com/patients');
```

### API Requests

**✅ DO:**
- Use HTTPS for all API calls
- Include authentication token (JWT)
- Validate SSL certificates
- Use CORS headers to restrict origins

**❌ DON'T:**
- Send PHI in URL query parameters
- Send PHI in GET requests (use POST)
- Include PHI in HTTP headers

**Example:**
```typescript
// ❌ BAD: PHI in URL query params (visible in logs)
const response = await fetch(
  `https://api.holilabs.com/search?name=John+Doe&ssn=123-45-6789`
);

// ✅ GOOD: PHI in POST body (encrypted via HTTPS)
const response = await fetch('https://api.holilabs.com/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: 'John Doe',
    ssn: '123-45-6789',
  }),
});
```

### Email with PHI

**⚠️ HIPAA Rules for Email:**
- Email PHI only with patient consent
- Use encrypted email (TLS 1.2+)
- Include disclaimer in signature
- Use secure patient portal links (preferred)

```typescript
// ❌ BAD: PHI in email body (unencrypted)
await sendEmail({
  to: 'patient@example.com',
  subject: 'Your Lab Results',
  body: 'Your blood glucose is 150 mg/dL',
});

// ✅ GOOD: Secure portal link (no PHI in email)
await sendEmail({
  to: 'patient@example.com',
  subject: 'Lab Results Available',
  body: `
    Your lab results are ready to view.
    Login to view: https://portal.holilabs.com/results

    This email does not contain PHI for your privacy.
  `,
});
```

---

## PHI Display

### Masking/Redaction

**Mask PHI When Full Value Not Needed:**

```typescript
// ✅ GOOD: Mask SSN
function maskSSN(ssn: string): string {
  return `***-**-${ssn.slice(-4)}`;
}
// Input: "123-45-6789"
// Output: "***-**-6789"

// ✅ GOOD: Mask email
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
// Input: "john.doe@example.com"
// Output: "jo***@example.com"

// ✅ GOOD: Mask phone
function maskPhone(phone: string): string {
  return `(***) ***-${phone.slice(-4)}`;
}
// Input: "555-123-4567"
// Output: "(***) ***-4567"
```

### UI Display

**Best Practices:**
- Show only necessary PHI
- Use click-to-reveal for sensitive fields
- Auto-hide PHI after timeout
- Never display PHI in URL

**React Component Example:**
```tsx
// ✅ GOOD: Click-to-reveal SSN
export function SSNField({ ssn }: { ssn: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <span>{revealed ? ssn : maskSSN(ssn)}</span>
      <button onClick={() => setRevealed(!revealed)}>
        {revealed ? 'Hide' : 'Reveal'}
      </button>
    </div>
  );
}

// ✅ GOOD: Auto-hide after timeout
useEffect(() => {
  if (revealed) {
    const timer = setTimeout(() => setRevealed(false), 30000); // 30s
    return () => clearTimeout(timer);
  }
}, [revealed]);
```

### Screenshots/Screen Sharing

**⚠️ WARNING**: Screenshots may contain PHI.

**✅ DO:**
- Blur/redact PHI before sharing
- Use test data for demos
- Notify attendees before screen sharing

**❌ DON'T:**
- Share screenshots with real PHI
- Screen share production database
- Record meetings with PHI visible

---

## PHI Disposal

### Secure Deletion

**HIPAA Requirement**: PHI must be securely destroyed.

```typescript
// ✅ GOOD: Soft delete with audit log
const patient = await prisma.patient.update({
  where: { id: patientId },
  data: {
    deletedAt: new Date(),
    deletedBy: user.id,
  },
});

await createAuditLog({
  action: 'DELETE',
  resource: 'Patient',
  resourceId: patientId,
  userId: user.id,
});

// ✅ GOOD: Hard delete (when legally required)
await prisma.patient.delete({
  where: { id: patientId },
});
// Database uses encrypted storage, overwrite on delete
```

### Data Retention

**HIPAA Requirement**: Retain medical records for 6 years.

```typescript
// ✅ GOOD: Automated retention policy
// See /apps/web/src/lib/cron/data-retention.ts

// Patients: 6 years after last visit
// Audit logs: 6 years
// Backups: 6 years
// Temporary files: 30 days
```

---

## De-identification

### HIPAA Safe Harbor Method

**Remove All 18 Identifiers:**

```typescript
// ✅ GOOD: De-identification function
import { deidentify } from '@holi/deid';

const deidentifiedPatient = deidentify(patient, {
  method: 'safe-harbor',
  removeFields: [
    'name', 'email', 'phone', 'ssn', 'address',
    'dob', 'mrn', 'accountNumber',
  ],
  dateShift: true,  // Shift dates by random offset
  zipTruncation: 3, // Truncate ZIP to 3 digits
});

// Output:
// {
//   id: 'anonymous-123',
//   age: 45,          // ✅ Year only (not DOB)
//   zipCode: '90210', // ✅ Truncated to 90***
//   diagnosis: 'Diabetes',
//   admitDate: '2025-Q1',  // ✅ Quarter, not exact date
// }
```

### Use Cases

**When to De-identify:**
- ✅ Data exports for research
- ✅ Analytics and reporting
- ✅ Public datasets
- ✅ Third-party analysis (non-covered entity)

**When NOT to De-identify:**
- ❌ Treatment/care coordination
- ❌ Payment/billing
- ❌ Healthcare operations (quality improvement)

---

## Audit Logging

### Required for All PHI Access

**HIPAA §164.312(b) - Audit Controls:**

```typescript
// ✅ GOOD: Audit log for READ
import { createAuditLog } from '@/lib/audit';

const patient = await prisma.patient.findUnique({
  where: { id: patientId },
});

await createAuditLog({
  action: 'READ',
  resource: 'Patient',
  resourceId: patientId,
  userId: user.id,
  metadata: {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    source: 'patient_portal',
  },
});

// ✅ GOOD: Audit log for UPDATE
await prisma.patient.update({
  where: { id: patientId },
  data: { name: newName },
});

await createAuditLog({
  action: 'UPDATE',
  resource: 'Patient',
  resourceId: patientId,
  userId: user.id,
  metadata: {
    changes: { name: { from: oldName, to: newName } },
  },
});

// ✅ GOOD: Audit log for failed access
try {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });
} catch (error) {
  await createAuditLog({
    action: 'READ',
    resource: 'Patient',
    resourceId: patientId,
    userId: user.id,
    status: 'FAILURE',
    metadata: { error: error.message },
  });
}
```

### What to Log

**Required Audit Fields:**
- ✅ Who (user ID, role)
- ✅ What (action: READ, UPDATE, DELETE)
- ✅ When (timestamp, timezone)
- ✅ Where (resource: Patient, resourceId)
- ✅ How (IP address, user agent)
- ✅ Result (success/failure, error message)

**Audit Trail Properties:**
- ✅ Immutable (cannot modify/delete logs)
- ✅ Tamper-proof (cryptographic hash chain)
- ✅ Retained 6 years minimum
- ✅ Available for HIPAA audits

---

## Common Mistakes

### Mistake #1: PHI in Error Messages

**❌ BAD:**
```typescript
throw new Error(`Patient ${patient.name} not found`);
// Error logged with PHI

// ❌ BAD: PHI in validation error
if (!patient.email) {
  throw new Error(`Email missing for patient ${patient.name}`);
}
```

**✅ GOOD:**
```typescript
throw new AppError('PATIENT_NOT_FOUND', { patientId: patient.id });
// Error code + internal ID (not PHI)

// ✅ GOOD: Use error codes
if (!patient.email) {
  throw new ValidationError('EMAIL_REQUIRED', { patientId: patient.id });
}
```

### Mistake #2: PHI in URLs

**❌ BAD:**
```typescript
// PHI visible in browser history, server logs
router.push(`/patients?name=${patient.name}&dob=${patient.dob}`);
```

**✅ GOOD:**
```typescript
// Use internal ID only
router.push(`/patients/${patient.id}`);

// Use POST for search (PHI in body, not URL)
await fetch('/api/patients/search', {
  method: 'POST',
  body: JSON.stringify({ name: patient.name }),
});
```

### Mistake #3: PHI in Local Storage

**❌ BAD:**
```typescript
// PHI in plaintext local storage (accessible via XSS)
localStorage.setItem('patient', JSON.stringify(patient));
```

**✅ GOOD:**
```typescript
// Use server-side session (encrypted cookie)
// NextAuth handles this automatically

// Or use short-lived cache with internal ID
sessionStorage.setItem('patientId', patient.id);  // ✅ Not PHI
```

### Mistake #4: PHI in Analytics

**❌ BAD:**
```typescript
// Send PHI to Google Analytics
gtag('event', 'patient_search', {
  patient_name: patient.name,  // ❌ PHI
  patient_email: patient.email, // ❌ PHI
});
```

**✅ GOOD:**
```typescript
// Send anonymized events
gtag('event', 'patient_search', {
  patient_id_hash: hashId(patient.id),  // ✅ Hashed ID
  organization_id: user.organizationId,
  search_duration_ms: 150,
});
```

### Mistake #5: Insufficient Access Control

**❌ BAD:**
```typescript
// No authorization check
export async function GET(request: Request) {
  const patients = await prisma.patient.findMany();
  return Response.json(patients);  // ❌ Returns all patients
}
```

**✅ GOOD:**
```typescript
// Authorization + audit logging
export const GET = createProtectedRoute(
  async (request, { user }) => {
    // Automatic RBAC check
    const patients = await prisma.patient.findMany({
      where: { organizationId: user.organizationId },  // ✅ Scoped
    });

    // Automatic audit log
    return Response.json(patients);
  },
  {
    requiredPermissions: ['patient:read'],
    audit: { action: 'READ', resource: 'Patient' },
  }
);
```

---

## Code Examples

### Complete Example: Patient Search API

```typescript
// /apps/web/src/app/api/patients/search/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ✅ Input validation (prevent injection)
const searchSchema = z.object({
  name: z.string().min(2).max(100),
  dob: z.string().optional(),
  mrn: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, { user }) => {
    try {
      // ✅ Validate input
      const body = await request.json();
      const { name, dob, mrn } = searchSchema.parse(body);

      // ✅ Log search attempt (no PHI)
      logger.info({
        userId: user.id,
        action: 'SEARCH',
        resource: 'Patient',
      }, 'Patient search initiated');

      // ✅ Scoped query (organization-level isolation)
      const patients = await prisma.patient.findMany({
        where: {
          organizationId: user.organizationId,
          name: { contains: name, mode: 'insensitive' },
          ...(dob && { dob: new Date(dob) }),
          ...(mrn && { mrn }),
        },
        take: 50, // ✅ Limit results
      });

      // ✅ Audit log (required for PHI access)
      await createAuditLog({
        action: 'SEARCH',
        resource: 'Patient',
        userId: user.id,
        metadata: {
          searchCriteria: { nameLength: name.length }, // ✅ No PHI
          resultCount: patients.length,
          ipAddress: request.ip,
        },
      });

      // ✅ Return encrypted PHI (decrypted by Prisma extension)
      return Response.json({
        patients: patients.map(p => ({
          id: p.id,
          name: p.name,         // ✅ Decrypted automatically
          dob: p.dob,
          mrn: p.mrn,
        })),
      });
    } catch (error) {
      // ✅ Log error without PHI
      logger.error({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown',
      }, 'Patient search failed');

      return Response.json(
        { error: 'SEARCH_FAILED' },
        { status: 500 }
      );
    }
  },
  {
    requiredPermissions: ['patient:read'],
    rateLimit: 'search', // 20 requests/minute
  }
);
```

---

## Checklist

### Before Committing Code

**PHI Handling Checklist:**
- [ ] No console.log with PHI
- [ ] All PHI access has audit log
- [ ] No PHI in error messages
- [ ] No PHI in URLs
- [ ] No PHI in localStorage
- [ ] PHI encrypted at rest (Prisma extension)
- [ ] PHI transmitted via HTTPS
- [ ] Input validation (SQL injection prevention)
- [ ] Authorization checks (RBAC)
- [ ] Rate limiting applied
- [ ] Use structured logger (Pino)
- [ ] Test with synthetic data

### Before Deploying

**Deployment Checklist:**
- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enforced (HSTS header)
- [ ] Database backups configured
- [ ] Audit logs retained 6 years
- [ ] Monitoring alerts configured
- [ ] Security headers configured (A+ rating)
- [ ] HIPAA training completed
- [ ] Code reviewed (2+ approvals)

---

## Additional Resources

**HIPAA Guidance:**
- [HHS HIPAA for Professionals](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HIPAA Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)

**De-identification:**
- [HHS De-identification Guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)
- [Safe Harbor Method (45 CFR §164.514(b)(2))](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html#safeharborguidance)

**Internal Documentation:**
- [HIPAA Compliance Checklist](/docs/HIPAA_COMPLIANCE_CHECKLIST.md)
- [Security Guidelines](/docs/SECURITY_GUIDELINES.md)
- [Developer Setup Guide](/docs/DEV_SETUP.md)
- [Workforce Training Plan](/docs/WORKFORCE_TRAINING_PLAN.md)
- [Incident Response Plan](/docs/INCIDENT_RESPONSE_PLAN.md)

---

## Getting Help

**Privacy Questions:**
- Email: privacy@holilabs.com
- Privacy Officer: (contact info)

**Security Questions:**
- Email: security@holilabs.com
- Security Team Slack: #security

**Report PHI Exposure:**
- 🚨 **Immediately**: security@holilabs.com
- PagerDuty: For P1 incidents only
- Don't discuss publicly (Slack, email)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Next Review:** 2026-04-03 (quarterly)
**Owner:** Privacy Officer & Engineering Team
**Classification:** Internal - HIPAA Critical
