# HIPAA Compliance Quick Reference Guide

**Last Updated:** December 15, 2025
**For:** Holi Labs Development Team

---

## Quick Compliance Check

✅ **Overall Status: COMPLIANT (92/100)**

### Immediate Action Required (Next 2 Weeks)
1. Replace console.log statements in patient deletion route
2. Document backup retention policy

---

## Do's and Don'ts for Developers

### ✅ DO

1. **Always use the structured logger:**
   ```typescript
   // CORRECT
   logger.info({
     event: 'patient_created',
     patientTokenId: patient.tokenId, // Use tokenId, not ID
   });
   ```

2. **Use POST for PHI transmission:**
   ```typescript
   // CORRECT
   const response = await fetch('/api/patients', {
     method: 'POST',
     body: JSON.stringify({ firstName, lastName }),
   });
   ```

3. **Use tokenId in URLs, never PHI:**
   ```typescript
   // CORRECT
   router.push(`/patients/${patient.tokenId}`);
   ```

4. **Encrypt PHI automatically (Prisma handles it):**
   ```typescript
   // CORRECT - Encryption is automatic
   const patient = await prisma.patient.create({
     data: {
       firstName: 'John', // Automatically encrypted
       lastName: 'Doe',   // Automatically encrypted
     },
   });
   ```

5. **Check consent before operations:**
   ```typescript
   // CORRECT
   const result = await consentGuard.canBookAppointment(patientId);
   if (!result.allowed) {
     return Response.json({ error: 'Consent required' }, { status: 403 });
   }
   ```

6. **Audit all PHI access:**
   ```typescript
   // CORRECT
   await auditView('Patient', patientId, request);
   ```

---

### ❌ DON'T

1. **Never use console.log for PHI:**
   ```typescript
   // WRONG - HIPAA VIOLATION
   console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
   console.log(`Email: ${patient.email}`);
   ```

2. **Never put PHI in URLs:**
   ```typescript
   // WRONG - HIPAA VIOLATION
   router.push(`/patients?email=${patient.email}`);
   router.push(`/search?name=${firstName}`);
   ```

3. **Never store PHI in localStorage/sessionStorage:**
   ```typescript
   // WRONG - HIPAA VIOLATION
   localStorage.setItem('patientName', patient.firstName);
   sessionStorage.setItem('email', patient.email);
   ```

4. **Never bypass encryption:**
   ```typescript
   // WRONG
   await prisma.$executeRaw`INSERT INTO patients (firstName) VALUES (${plaintext})`;
   ```

5. **Never skip audit logging:**
   ```typescript
   // WRONG - Missing audit log
   await prisma.patient.update({
     where: { id },
     data: { email: newEmail },
   });
   // Should include: await auditUpdate('Patient', id, request);
   ```

6. **Never cache PHI responses:**
   ```typescript
   // WRONG
   const response = NextResponse.json(patient);
   response.headers.set('Cache-Control', 'public, max-age=3600');
   ```

---

## Common Tasks

### 1. Creating a Patient Record
```typescript
import { prisma } from '@/lib/prisma';
import { auditCreate } from '@/lib/audit';

// Encryption is automatic via Prisma extension
const patient = await prisma.patient.create({
  data: {
    firstName: 'John',      // Encrypted automatically
    lastName: 'Doe',        // Encrypted automatically
    email: 'john@email.com', // Encrypted automatically
    dateOfBirth: new Date('1990-01-01'),
  },
});

// Audit the creation
await auditCreate('Patient', patient.id, request);
```

---

### 2. Viewing Patient Data
```typescript
import { auditView } from '@/lib/audit';

// Decryption is automatic via Prisma extension
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
});

// Audit the access
await auditView('Patient', patientId, request, {
  fields: ['firstName', 'lastName', 'email'],
}, 'DIRECT_PATIENT_CARE');
```

---

### 3. Checking Consent
```typescript
import { consentGuard } from '@/lib/consent/consent-guard';

// Check if patient has granted required consents
const result = await consentGuard.canBookAppointment(patientId);

if (!result.allowed) {
  return NextResponse.json(
    {
      error: 'Consent required',
      missingConsents: result.missingConsents,
      message: result.message,
    },
    { status: 403 }
  );
}
```

---

### 4. Exporting Patient Data
```typescript
import { auditExport } from '@/lib/audit';

// Export patient data (encrypted)
const patientData = await prisma.patient.findUnique({
  where: { id: patientId },
  include: {
    consultations: true,
    prescriptions: true,
    labResults: true,
  },
});

// Audit the export
await auditExport('Patient', patientId, request, {
  format: 'JSON',
  includeRelations: true,
});
```

---

### 5. Deleting Patient Data (GDPR/LGPD)
```typescript
// Soft delete (preserves audit trail)
const patient = await prisma.patient.update({
  where: { id: patientId },
  data: {
    deletedAt: new Date(),
    firstName: '[REDACTED]',
    lastName: '[REDACTED]',
    email: null,
    phone: null,
  },
});

// Audit the deletion
await auditDelete('Patient', patientId, request, {
  reason: 'Patient-requested deletion',
});
```

---

## PHI Fields Reference

### Automatically Encrypted Fields (via Prisma extension)

**Patient Model:**
- `firstName`
- `lastName`
- `email`
- `phone`
- `address`
- `primaryContactPhone`
- `primaryContactEmail`
- `primaryContactAddress`
- `secondaryContactPhone`
- `secondaryContactEmail`
- `emergencyContactPhone`

**Prescription Model:**
- `patientInstructions`
- `pharmacyNotes`

**Consultation Model:**
- `chiefComplaint`
- `historyOfPresentIllness`
- `reviewOfSystems`
- `physicalExamination`
- `assessmentAndPlan`
- `notes`

**LabResult Model:**
- `interpretation`
- `notes`

---

## Security Checklist for New Features

- [ ] PHI transmitted via POST (not GET)
- [ ] PHI encrypted at rest (automatic via Prisma)
- [ ] PHI encrypted in transit (HTTPS enforced)
- [ ] Access requires authentication
- [ ] Access checked via RBAC (Casbin)
- [ ] Consent verified before operation
- [ ] All PHI access audited
- [ ] No PHI in logs (use logger, not console.log)
- [ ] No PHI in URLs
- [ ] No PHI in cache headers
- [ ] CSRF token validated
- [ ] Rate limiting applied
- [ ] Input validation performed
- [ ] Error messages don't leak PHI

---

## Audit Logging Examples

### Viewing Patient Record
```typescript
await auditView('Patient', patientId, request, {
  fields: ['firstName', 'lastName', 'email'],
}, 'DIRECT_PATIENT_CARE', 'Viewing patient profile');
```

### Creating Prescription
```typescript
await auditCreate('Prescription', prescriptionId, request, {
  patientId,
  medication: medicationName,
});
```

### Updating Medical Record
```typescript
await auditUpdate('Patient', patientId, request, {
  updatedFields: ['email', 'phone'],
});
```

### Denying Access
```typescript
await auditAccessDenied('Patient', patientId, 'Insufficient permissions', request);
```

---

## Common Violations to Avoid

### 🔴 Critical Violations (Immediate Fix Required)

1. **PHI in Console Logs:**
   ```typescript
   // VIOLATION
   console.log(`Patient ${patient.firstName} checked in`);

   // FIX
   logger.info({
     event: 'patient_checkin',
     patientTokenId: patient.tokenId,
   });
   ```

2. **PHI in GET Parameters:**
   ```typescript
   // VIOLATION
   fetch(`/api/search?name=${firstName}&email=${email}`);

   // FIX
   fetch('/api/search', {
     method: 'POST',
     body: JSON.stringify({ name: firstName, email }),
   });
   ```

3. **Unencrypted PHI Storage:**
   ```typescript
   // VIOLATION
   localStorage.setItem('patient', JSON.stringify(patient));

   // FIX
   // Don't store PHI client-side. If needed, use secure session storage
   // with encrypted values and automatic expiration.
   ```

---

## Emergency Contacts

**Security Incidents:**
- Email: security@holilabs.com
- Slack: #security-incidents

**HIPAA Questions:**
- Email: compliance@holilabs.com
- Slack: #hipaa-compliance

**On-Call Security:**
- Phone: +1-XXX-XXX-XXXX (24/7)

---

## Quick Links

- [Full HIPAA Audit Report](./HIPAA_COMPLIANCE_AUDIT_REPORT.md)
- [Security Documentation](./SECURITY_AUDIT_SUMMARY.md)
- [Encryption Guide](./src/lib/security/encryption.ts)
- [Audit Logging Guide](./src/lib/audit.ts)
- [Consent Management](./src/lib/consent/consent-guard.ts)

---

## Testing Your Code for HIPAA Compliance

### Pre-Commit Checklist
```bash
# 1. Check for console.log statements
grep -r "console.log" src/app/api

# 2. Check for PHI in URLs
grep -r "params\\.get.*email\|firstName\|lastName" src/app/api

# 3. Check for audit logging
grep -r "auditView\|auditCreate\|auditUpdate" src/app/api

# 4. Run tests
npm run test

# 5. Check encryption is working
npm run test:encryption
```

---

## Key Takeaways

1. **Encryption is automatic** - Prisma extension handles it
2. **Always audit PHI access** - Use audit functions
3. **Check consent before operations** - Use consent guard
4. **Use logger, never console.log** - Structured logging only
5. **POST for PHI, GET for public data** - Never PHI in URLs
6. **TokenId in URLs, never PHI** - Use public identifiers
7. **RBAC for access control** - Casbin enforces permissions
8. **MFA for sensitive accounts** - Enable for all admins

---

**Questions? Ask in #hipaa-compliance on Slack**
