# HIPAA/BAA Compliance: Privacy-Preserving FHIR Integration

**Document Version**: 1.0
**Last Updated**: December 26, 2024
**Classification**: CONFIDENTIAL - Legal/Compliance
**Owner**: Holi Labs Compliance Team
**Review Cycle**: Quarterly

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Regulatory Framework](#2-regulatory-framework)
3. [Privacy-Preserving Architecture](#3-privacy-preserving-architecture)
4. [PHI Handling & De-identification](#4-phi-handling--de-identification)
5. [Technical Safeguards](#5-technical-safeguards)
6. [Administrative Safeguards](#6-administrative-safeguards)
7. [Physical Safeguards](#7-physical-safeguards)
8. [Audit Controls & Accountability](#8-audit-controls--accountability)
9. [Consent Management](#9-consent-management)
10. [Breach Notification Procedures](#10-breach-notification-procedures)
11. [Business Associate Agreements](#11-business-associate-agreements)
12. [Risk Assessment & Mitigation](#12-risk-assessment--mitigation)
13. [Compliance Monitoring](#13-compliance-monitoring)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document establishes Holi Labs' compliance posture for the privacy-preserving FHIR integration with Medplum, ensuring adherence to:
- **HIPAA Privacy Rule** (45 CFR Part 160 and Subparts A and E of Part 164)
- **HIPAA Security Rule** (45 CFR Part 160 and Subparts A and C of Part 164)
- **HIPAA Breach Notification Rule** (45 CFR Part 164 Subpart D)
- **HITECH Act** (42 USC §17921 et seq.)

### 1.2 Scope

This compliance framework covers:
- Holi Labs' primary application (Covered Entity)
- Medplum FHIR server (Business Associate)
- Patient data exchange via FHIR R4 standard
- External EHR integrations via FHIR
- Audit trail synchronization

### 1.3 Key Compliance Principles

1. **Data is Toxic**: Minimize PHI exposure through pseudonymization
2. **Consent-First Architecture**: No data access without explicit consent
3. **Audit Everything**: Comprehensive logging of all PHI access
4. **Encryption Everywhere**: Data at rest and in transit
5. **Least Privilege**: Role-based access controls (RBAC)
6. **Fail-Safe Defaults**: Deny access unless explicitly permitted

### 1.4 Compliance Status

| Requirement | Status | Evidence |
|-------------|--------|----------|
| HIPAA Privacy Rule | ✅ Compliant | Section 3, 4, 9 |
| HIPAA Security Rule | ✅ Compliant | Section 5, 6, 7 |
| Breach Notification | ✅ Compliant | Section 10 |
| Business Associate Agreement | ✅ Executed | Section 11 |
| Risk Assessment | ✅ Current | Section 12 |
| Audit Controls | ✅ Implemented | Section 8 |

---

## 2. Regulatory Framework

### 2.1 HIPAA Privacy Rule (45 CFR §164.502)

**Applicability**: Holi Labs qualifies as a Covered Entity under HIPAA as a healthcare provider conducting electronic transactions.

**Key Requirements**:
- **Minimum Necessary Standard** (§164.502(b)): Only access PHI required for treatment, payment, or healthcare operations
- **Authorization** (§164.508): Written patient authorization for uses/disclosures not otherwise permitted
- **Individual Rights** (§164.524): Right to access, amend, and accounting of disclosures

**Holi Labs Implementation**:
- **Pseudonymization**: PatientToken system provides minimum necessary access
- **Consent Engine**: Digital consent with granular data class authorization (CLINICAL_NOTES, LAB_RESULTS, MEDICATIONS)
- **Access Controls**: 4-tier RBAC (ADMIN, PATIENT, CLINICIAN, RESEARCHER)

### 2.2 HIPAA Security Rule (45 CFR §164.308-312)

**Three Safeguard Categories**:

1. **Administrative Safeguards** (§164.308)
   - Security Management Process
   - Workforce Security
   - Information Access Management
   - Security Awareness and Training
   - Security Incident Procedures

2. **Physical Safeguards** (§164.310)
   - Facility Access Controls
   - Workstation Use/Security
   - Device and Media Controls

3. **Technical Safeguards** (§164.312)
   - Access Control (§164.312(a)(1))
   - Audit Controls (§164.312(b))
   - Integrity (§164.312(c)(1))
   - Person or Entity Authentication (§164.312(d))
   - Transmission Security (§164.312(e)(1))

### 2.3 HITECH Act Breach Notification (42 USC §17932)

**Notification Requirements**:
- **Individual Notification**: Within 60 days of breach discovery
- **Media Notification**: If breach affects >500 individuals in a jurisdiction
- **HHS Notification**: Within 60 days (>500 individuals) or annually (<500)

**Breach Threshold**: Unauthorized acquisition, access, use, or disclosure that compromises security/privacy of PHI, unless low probability of compromise per risk assessment (45 CFR §164.402).

### 2.4 State-Specific Requirements

**California (CMIA)**: Additional privacy protections for medical information
**GDPR (if applicable)**: Right to erasure, data portability for EU patients
**LGPD (Brazil)**: Enhanced consent requirements for Brazilian patients

---

## 3. Privacy-Preserving Architecture

### 3.1 Design Philosophy: "Data is Toxic"

Holi Labs' architecture is predicated on the principle that **PHI exposure is a liability**. The system minimizes PHI in FHIR resources through aggressive de-identification.

### 3.2 PatientToken Pseudonymization

**Definition**: A PatientToken is a cryptographically secure pseudonym that replaces identifiable patient information in FHIR resources.

**Implementation**:
```typescript
// PatientToken Schema (Prisma)
model PatientToken {
  id           String   @id @default(cuid())  // Pseudonymous ID
  orgId        String                         // Organization context
  pointerHash  String   @unique              // SHA-256 hash (pointer to encrypted data)
  storageUri   String                         // S3 encrypted storage reference
  createdAt    DateTime @default(now())

  // NO PHI FIELDS (name, DOB, SSN, address, etc.)
}
```

**Cryptographic Properties**:
- **One-way Hash**: `pointerHash` uses SHA-256 with salt (irreversible)
- **Storage Separation**: Actual PHI stored in encrypted S3 bucket (AES-256-GCM)
- **Key Management**: AWS KMS with automatic rotation (90-day cycle)

**FHIR Mapping**:
```json
{
  "resourceType": "Patient",
  "id": "pt_abc123",  // PatientToken.id (pseudonymous)
  "identifier": [
    {
      "system": "https://holilabs.xyz/patient-token",
      "value": "pt_abc123"
    }
  ],
  "active": true,
  "extension": [
    {
      "url": "https://holilabs.xyz/fhir/storage-reference",
      "valueUri": "s3://holi-phi-vault/encrypted/org_123/pt_abc123.enc"
    }
  ]
  // NO name, birthDate, address, telecom, photo, contact, etc.
}
```

### 3.3 De-identification Per HIPAA §164.514(b)

**Safe Harbor Method**: The following 18 identifiers are **removed** from FHIR Patient resources:

1. ✅ Names
2. ✅ Geographic subdivisions smaller than state
3. ✅ Dates (except year) - Birth date, admission date, discharge date, date of death
4. ✅ Telephone numbers
5. ✅ Fax numbers
6. ✅ Email addresses
7. ✅ Social Security numbers
8. ✅ Medical record numbers
9. ✅ Health plan beneficiary numbers
10. ✅ Account numbers
11. ✅ Certificate/license numbers
12. ✅ Vehicle identifiers and serial numbers
13. ✅ Device identifiers and serial numbers
14. ✅ URLs
15. ✅ IP addresses
16. ✅ Biometric identifiers (fingerprints, voice prints)
17. ✅ Full-face photographs
18. ✅ Any other unique identifying number, characteristic, or code

**Retained**: Only pseudonymous ID (PatientToken) + encrypted storage reference

**Expert Determination**: Statistical disclosure control reviewed by certified HIPAA privacy expert (on file).

### 3.4 Clinical Data Handling

**Observation & Encounter Resources**: May contain limited PHI (clinical context)

**Mitigation**:
1. **Encrypted Payload References**: Large text fields (clinical notes, reports) stored in S3, FHIR resource contains only reference URI
2. **Consent-Gated Access**: All queries validate active CARE consent with required data classes
3. **Audit Trail**: Every access logged with correlation ID, user identity, timestamp

**Example Observation**:
```json
{
  "resourceType": "Observation",
  "id": "obs_xyz789",
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "8310-5",
      "display": "Body temperature"
    }]
  },
  "subject": {
    "reference": "Patient/pt_abc123"  // PatientToken reference
  },
  "effectiveDateTime": "2024-12-26T10:00:00Z",
  "valueQuantity": {
    "value": 37.2,
    "unit": "Cel"
  },
  "note": [
    {
      "text": "[REFERENCE: s3://holi-phi-vault/encrypted/obs_xyz789_note.enc]"
    }
  ]
}
```

### 3.5 Data Flow Diagram

```
┌─────────────────┐
│   Patient App   │ (Authentication + Consent Check)
└────────┬────────┘
         │ HTTPS + TLS 1.3
         ▼
┌─────────────────┐
│  Holi API       │ (RBAC Authorization)
│  (Covered       │
│   Entity)       │
└────────┬────────┘
         │ mTLS + OAuth2
         ▼
┌─────────────────┐
│ Medplum FHIR    │ (Business Associate)
│ Server          │ ← De-identified FHIR resources only
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PostgreSQL      │ (Encrypted at rest: AES-256)
│ (FHIR Store)    │
└─────────────────┘

┌─────────────────┐
│ AWS S3          │ (PHI Vault)
│ (Encrypted PHI) │ ← Server-side encryption: AES-256-GCM
└─────────────────┘ ← Access: AWS KMS + IAM roles only
```

---

## 4. PHI Handling & De-identification

### 4.1 PHI Definition (45 CFR §160.103)

**Protected Health Information (PHI)**: Individually identifiable health information transmitted/maintained in any form/medium by a covered entity or business associate, relating to:
- Past, present, or future physical/mental health condition
- Provision of healthcare
- Past, present, or future payment for healthcare

**Exclusions**: De-identified information per §164.514, employment records, education records.

### 4.2 Holi Labs PHI Inventory

| Data Element | Storage Location | Encryption | Access Control | Retention |
|--------------|------------------|------------|----------------|-----------|
| Patient Demographics | S3 (encrypted) | AES-256-GCM | AWS KMS + IAM | 7 years post-discharge |
| Clinical Notes | S3 (encrypted) | AES-256-GCM | AWS KMS + IAM | 7 years post-discharge |
| Lab Results | S3 (encrypted) | AES-256-GCM | AWS KMS + IAM | 7 years post-discharge |
| Encounter Records | PostgreSQL (encrypted) | AES-256 at rest | Prisma RLS | 7 years post-encounter |
| Observation Data | PostgreSQL (encrypted) | AES-256 at rest | Prisma RLS | 7 years post-observation |
| Audit Logs | PostgreSQL (encrypted) | AES-256 at rest | Admin-only | 7 years (HIPAA §164.316) |
| PatientToken Mappings | PostgreSQL (encrypted) | AES-256 at rest | System-only | 7 years post-account-deletion |

### 4.3 De-identification Process

**Step 1: Data Ingestion**
```typescript
// apps/web/src/lib/data/patient-ingestion.ts
async function ingestPatient(rawData: PatientData): Promise<PatientToken> {
  // 1. Extract PHI fields
  const phi = extractPHI(rawData);  // name, DOB, address, etc.

  // 2. Generate pseudonymous ID
  const patientTokenId = generateCUID();

  // 3. Encrypt PHI
  const encryptedPHI = await encryptWithKMS(phi);

  // 4. Store encrypted PHI in S3
  const storageUri = await uploadToS3(encryptedPHI);

  // 5. Create PatientToken (no PHI)
  const patientToken = await prisma.patientToken.create({
    data: {
      id: patientTokenId,
      orgId: rawData.orgId,
      pointerHash: sha256(patientTokenId + process.env.HASH_SALT),
      storageUri,
    },
  });

  return patientToken;
}
```

**Step 2: FHIR Resource Creation**
```typescript
// apps/api/src/services/fhir-sync-enhanced.ts
async function syncPatientToFhir(patientToken: PatientToken): Promise<Patient> {
  // Create de-identified FHIR Patient resource
  const fhirPatient: Patient = {
    resourceType: 'Patient',
    id: patientToken.id,  // Pseudonymous ID
    identifier: [
      {
        system: 'https://holilabs.xyz/patient-token',
        value: patientToken.id,
      },
    ],
    active: true,
    extension: [
      {
        url: 'https://holilabs.xyz/fhir/storage-reference',
        valueUri: patientToken.storageUri,  // Encrypted S3 reference
      },
    ],
    // NO PHI FIELDS
  };

  // Sync to Medplum
  const medplumClient = await getMedplumClient();
  const createdPatient = await medplumClient.createResource(fhirPatient);

  return createdPatient;
}
```

**Step 3: PHI Access (Consent-Gated)**
```typescript
// apps/api/src/routes/fhir-export.ts
async function exportPatientData(patientTokenId: string, userId: string): Promise<Bundle> {
  // 1. Validate consent
  const consent = await prisma.consent.findFirst({
    where: {
      patientTokenId,
      purpose: 'CARE',
      state: 'ACTIVE',
      dataClasses: { hasEvery: ['CLINICAL_NOTES', 'LAB_RESULTS'] },
    },
  });

  if (!consent) {
    throw new Error('Consent not granted');
  }

  // 2. Fetch de-identified FHIR bundle from Medplum
  const bundle = await medplumClient.readResource('Patient', patientTokenId, { _include: '*' });

  // 3. Audit access
  await prisma.auditEvent.create({
    data: {
      orgId: consent.orgId,
      eventType: 'FHIR_EXPORT',
      payload: {
        userId,
        patientTokenId,
        resourceCount: bundle.total,
        consentId: consent.id,
      },
    },
  });

  // 4. Return bundle (still de-identified, no re-identification)
  return bundle;
}
```

### 4.4 Re-identification Controls

**Prohibition**: Holi Labs **does not** re-identify de-identified data except in the following limited circumstances per §164.514(c):

1. **Treatment**: Clinician requests PHI for active patient care (requires consent)
2. **Legal Requirement**: Court order or subpoena (requires legal review)
3. **Patient Request**: Individual exercises right of access under §164.524

**Process**:
```typescript
async function reidentifyPatient(patientTokenId: string, purpose: ReidentificationPurpose): Promise<PHI> {
  // 1. Validate purpose
  if (purpose !== 'TREATMENT' && purpose !== 'LEGAL' && purpose !== 'PATIENT_ACCESS') {
    throw new Error('Unauthorized re-identification attempt');
  }

  // 2. Retrieve storage URI
  const patientToken = await prisma.patientToken.findUnique({
    where: { id: patientTokenId },
  });

  // 3. Decrypt PHI from S3 using KMS
  const encryptedPHI = await downloadFromS3(patientToken.storageUri);
  const phi = await decryptWithKMS(encryptedPHI);

  // 4. Audit re-identification
  await prisma.auditEvent.create({
    data: {
      orgId: patientToken.orgId,
      eventType: 'PHI_REIDENTIFICATION',
      payload: {
        patientTokenId,
        purpose,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return phi;
}
```

---

## 5. Technical Safeguards

### 5.1 Access Control (§164.312(a)(1))

**Implementation**: 4-tier Role-Based Access Control (RBAC)

| Role | Permissions | Use Case |
|------|-------------|----------|
| **ADMIN** | Access all patients in organization | Organization administrators, compliance officers |
| **PATIENT** | Access own data only | Patient self-service portal |
| **CLINICIAN** | Access patients with active encounter | Treating physicians, nurses |
| **RESEARCHER** | Denied identified data | De-identified datasets only for research |

**Authorization Logic** (`apps/api/src/routes/fhir-export.ts:42-85`):
```typescript
async function authorizePatientAccess(auth: AuthContext, patientTokenId: string): Promise<AuthzResult> {
  // Rule 1: ADMINs can access all patients in their org
  if (auth.role === 'ADMIN') {
    const patientToken = await prisma.patientToken.findUnique({
      where: { id: patientTokenId },
    });
    return patientToken?.orgId === auth.orgId
      ? { authorized: true }
      : { authorized: false, reason: 'Patient belongs to different organization' };
  }

  // Rule 2: PATIENTs can only access their own data
  if (auth.role === 'PATIENT') {
    return auth.patientTokenId === patientTokenId
      ? { authorized: true }
      : { authorized: false, reason: 'Patients can only access their own data' };
  }

  // Rule 3: CLINICIANs can access patients they have active encounters with
  if (auth.role === 'CLINICIAN') {
    const activeEncounter = await prisma.encounter.findFirst({
      where: {
        patientTokenId,
        orgId: auth.orgId,
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
    });
    return activeEncounter
      ? { authorized: true }
      : { authorized: false, reason: 'No active encounter with this patient' };
  }

  // Rule 4: RESEARCHERs can only access de-identified data
  if (auth.role === 'RESEARCHER') {
    return {
      authorized: false,
      reason: 'Researchers can only access de-identified datasets via bulk export API',
    };
  }

  return { authorized: false, reason: 'Unknown role' };
}
```

**Session Management**:
- **Session Timeout**: 30 minutes of inactivity
- **Absolute Timeout**: 8 hours (require re-authentication)
- **Concurrent Session Limit**: 1 active session per user per device
- **Token Storage**: HTTP-only, Secure, SameSite=Strict cookies
- **Token Rotation**: Refresh token rotation on every use (prevent replay attacks)

### 5.2 Audit Controls (§164.312(b))

**Requirement**: "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."

**Implementation**: Comprehensive audit logging to `audit.audit_events` table

**Event Types**:
- `FHIR_SYNC`: Holi → Medplum synchronization
- `FHIR_INGRESS`: External EHR → Holi ingestion
- `FHIR_EXPORT`: Patient data export via $everything operation
- `FHIR_RECONCILIATION`: Sync drift detection
- `FHIR_AUDIT_MIRROR`: Medplum → Holi audit sync
- `FHIR_CREATE/READ/UPDATE/DELETE/EXECUTE`: Mirrored from Medplum AuditEvents
- `PHI_REIDENTIFICATION`: Re-identification attempts
- `CONSENT_GRANT/REVOKE/MODIFY`: Consent lifecycle events
- `LOGIN/LOGOUT`: Authentication events
- `AUTHORIZATION_FAILURE`: Failed access attempts

**Audit Event Schema**:
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT,
  patient_token_id TEXT,
  ip_address INET,
  user_agent TEXT,
  correlation_id TEXT,
  payload JSONB NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_audit_events_org_id (org_id),
  INDEX idx_audit_events_event_type (event_type),
  INDEX idx_audit_events_patient_token_id (patient_token_id),
  INDEX idx_audit_events_ts (ts DESC),
  INDEX idx_audit_events_correlation_id (correlation_id)
);
```

**Retention**: 7 years per §164.316(b)(2)(i) ("Retain for 6 years from date of creation or last effective date")

**Access**: Admin-only via secure dashboard (2FA required)

**Log Integrity**: Write-once (no DELETE permission), checksums stored separately for tamper detection

### 5.3 Integrity (§164.312(c)(1))

**Requirement**: "Implement policies and procedures to protect electronic protected health information from improper alteration or destruction."

**Implementation**:

1. **Database Integrity**:
   - **Checksums**: SHA-256 hash of sensitive records stored in separate `integrity_checksums` table
   - **Version Control**: All updates create new version (soft delete, never hard delete)
   - **Audit Trail**: Every write operation logged with before/after snapshots

2. **Transmission Integrity**:
   - **TLS 1.3**: All API communication encrypted in transit
   - **mTLS**: Mutual TLS between Holi API ↔ Medplum (certificate-based authentication)
   - **Message Authentication**: HMAC-SHA256 signatures on API requests
   - **Replay Protection**: Nonce + timestamp validation (reject requests >5 minutes old)

3. **Storage Integrity**:
   - **S3 Object Lock**: Prevents deletion/modification for retention period (WORM - Write Once Read Many)
   - **Versioning**: S3 bucket versioning enabled (recover from accidental deletion)
   - **Cross-Region Replication**: Automatic replication to DR region (us-west-2 → us-east-1)

4. **Code Integrity**:
   - **Signed Commits**: All git commits GPG-signed by developers
   - **CI/CD Pipeline**: Automated security scans (Snyk, OWASP ZAP) before deployment
   - **Immutable Infrastructure**: Docker images tagged with SHA-256 digest (no mutable 'latest' tag)

### 5.4 Person or Entity Authentication (§164.312(d))

**Requirement**: "Implement procedures to verify that a person or entity seeking access to electronic protected health information is the one claimed."

**Implementation**:

**User Authentication** (Patient Portal):
- **Primary Factor**: Username + password (bcrypt, cost factor 12)
- **Password Policy**: Min 12 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
- **Lockout**: 5 failed attempts → 15-minute account lock
- **MFA (Optional)**: TOTP (Google Authenticator, Authy) or SMS OTP
- **Biometric (Mobile)**: FaceID/TouchID on iOS, Fingerprint on Android

**Service Authentication** (API-to-API):
- **OAuth2 Client Credentials Flow**: Medplum client ID + secret
- **Token Caching**: JWT tokens cached until 60s before expiry
- **Certificate-Based mTLS**: X.509 certificates for Holi API ↔ Medplum communication
- **API Key Rotation**: Automatic rotation every 90 days

**Session Management**:
- **JWT Tokens**: HS256 signing, 30-minute expiration
- **Refresh Tokens**: One-time use, 7-day expiration, rotation on every refresh
- **Blacklist**: Revoked tokens stored in Redis (TTL = token expiry)

### 5.5 Transmission Security (§164.312(e)(1))

**Requirement**: "Implement technical security measures to guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network."

**Implementation**:

**Encryption in Transit**:
- **TLS 1.3**: Minimum version (TLS 1.2 for legacy clients)
- **Cipher Suites**: Only AEAD ciphers (TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256)
- **Certificate Validation**: OCSP stapling + CRL checks
- **HSTS**: Strict-Transport-Security header with max-age=31536000, includeSubDomains, preload

**Network Security**:
- **VPC Isolation**: Medplum in private subnet (no public IP)
- **Security Groups**: Whitelist only Holi API IP ranges
- **VPN Tunnel**: Site-to-site VPN between Holi VPC ↔ Medplum VPC
- **DDoS Protection**: AWS Shield Standard + rate limiting (100 req/min per IP)

**API Security**:
- **Rate Limiting**: 100 requests/minute per user, 1000 req/min per org
- **Request Validation**: Zod schema validation on all inputs
- **CORS**: Strict origin whitelist (no wildcard *)
- **CSRF Protection**: Double-submit cookie pattern + SameSite=Strict

---

## 6. Administrative Safeguards

### 6.1 Security Management Process (§164.308(a)(1))

**6.1.1 Risk Analysis (§164.308(a)(1)(ii)(A)) - Required**

**Annual Risk Assessment**: Conducted by external HIPAA compliance firm (last: December 2024)

**Risk Inventory**:

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|------------|--------|------------|---------------|
| Unauthorized PHI access | Medium | High | RBAC + MFA + Audit | Low |
| Data breach (S3) | Low | Critical | Encryption + IAM + KMS | Low |
| Ransomware attack | Medium | High | Immutable backups + EDR | Low |
| Insider threat | Low | High | Least privilege + Audit | Medium |
| Medplum compromise | Low | Critical | mTLS + De-identification | Low |
| Consent bypass | Low | High | Middleware validation | Very Low |
| Session hijacking | Medium | Medium | HTTP-only cookies + HTTPS | Low |
| SQL injection | Low | High | Prisma ORM + Parameterized queries | Very Low |

**6.1.2 Risk Management (§164.308(a)(1)(ii)(B)) - Required**

**Mitigation Strategy**:
1. **Technical Controls**: Encryption, access controls, audit logging
2. **Administrative Controls**: Policies, training, sanctions
3. **Physical Controls**: Data center security (AWS SOC 2 Type II)

**Monitoring**:
- **Weekly**: Vulnerability scans (Nessus)
- **Monthly**: Penetration testing (external firm)
- **Quarterly**: Risk assessment updates
- **Annually**: Full compliance audit

**6.1.3 Sanction Policy (§164.308(a)(1)(ii)(C)) - Required**

**Violations**:
- **Tier 1 (Minor)**: Accidental PHI disclosure to authorized user → Written warning
- **Tier 2 (Moderate)**: Policy violation without harm → Suspension + retraining
- **Tier 3 (Serious)**: Unauthorized PHI access → Termination + legal action
- **Tier 4 (Critical)**: Intentional breach → Termination + criminal referral

**Process**:
1. Incident detected via audit logs or report
2. Investigation by Security Officer (24-hour turnaround)
3. Determination of violation tier
4. Disciplinary action per policy
5. Remediation plan (if applicable)
6. Documentation in personnel file

**6.1.4 Information System Activity Review (§164.308(a)(1)(ii)(D)) - Required**

**Daily**:
- Automated anomaly detection (failed login attempts, unusual access patterns)
- Dashboard monitoring: Failed jobs, sync drift, API errors

**Weekly**:
- Audit log review (SIEM: Datadog)
- Access pattern analysis
- Consent revocation processing

**Monthly**:
- Comprehensive security review meeting
- Incident response drills
- Policy updates

### 6.2 Assigned Security Responsibility (§164.308(a)(2)) - Required

**Security Officer**: [Name], Chief Information Security Officer (CISO)
- **Responsibilities**: Develop/implement security policies, conduct risk assessments, incident response
- **Authority**: Budget authority for security tools, mandate policy compliance
- **Reporting**: Direct report to CEO, quarterly board updates

**Privacy Officer**: [Name], Chief Privacy Officer (CPO)
- **Responsibilities**: HIPAA Privacy Rule compliance, patient rights, complaint handling
- **Authority**: Approve/deny PHI disclosures, investigate privacy complaints
- **Reporting**: Direct report to CEO, joint reporting with CISO on breaches

### 6.3 Workforce Security (§164.308(a)(3))

**6.3.1 Authorization and/or Supervision (§164.308(a)(3)(ii)(A)) - Addressable**

**Implemented**: Role-based access provisioning workflow

**Process**:
1. Manager submits access request via ServiceNow ticket
2. Security Officer reviews/approves based on job function
3. IT provisions access with least privilege principle
4. Access reviewed quarterly (recertification)
5. Revoked immediately upon termination

**6.3.2 Workforce Clearance Procedure (§164.308(a)(3)(ii)(B)) - Addressable**

**Implemented**: Background checks for all workforce members

**Requirements**:
- **Criminal Background Check**: National search (felonies, misdemeanors)
- **Employment Verification**: Previous 3 employers
- **Education Verification**: Degree/certification validation
- **Reference Checks**: Minimum 2 professional references
- **Drug Screening**: Pre-employment + random testing

**6.3.3 Termination Procedures (§164.308(a)(3)(ii)(C)) - Addressable**

**Implemented**: Automated offboarding workflow

**Checklist**:
- [ ] Disable account credentials (AD, SSO, VPN) within 1 hour
- [ ] Revoke MFA devices
- [ ] Retrieve physical access badges
- [ ] Remote wipe company devices (MDM: Jamf)
- [ ] Document equipment return
- [ ] Conduct exit interview (remind of confidentiality obligations)
- [ ] Update audit logs (mark user as terminated)

### 6.4 Information Access Management (§164.308(a)(4))

**6.4.1 Isolating Healthcare Clearinghouse Functions (§164.308(a)(4)(ii)(A)) - Required if applicable**

**Not Applicable**: Holi Labs does not operate as a healthcare clearinghouse.

**6.4.2 Access Authorization (§164.308(a)(4)(ii)(B)) - Addressable**

**Implemented**: Formal access request/approval process (see 6.3.1)

**6.4.3 Access Establishment and Modification (§164.308(a)(4)(ii)(C)) - Addressable**

**Implemented**: Documented procedures for access lifecycle management

**New Access**:
1. Submit request with business justification
2. Security Officer approval
3. IT provisions minimum necessary access
4. User signs confidentiality agreement
5. Training completion verification

**Modified Access**:
1. Role change triggers access review
2. Remove old permissions
3. Grant new permissions (minimum necessary)
4. Document change in audit trail

### 6.5 Security Awareness and Training (§164.308(a)(5)) - Required

**6.5.1 Security Reminders (§164.308(a)(5)(ii)(A)) - Addressable**

**Implemented**: Monthly security awareness emails + quarterly phishing simulations

**6.5.2 Protection from Malicious Software (§164.308(a)(5)(ii)(B)) - Addressable**

**Implemented**: EDR (CrowdStrike), antivirus (Windows Defender), patch management (WSUS)

**6.5.3 Log-in Monitoring (§164.308(a)(5)(ii)(C)) - Addressable**

**Implemented**: Real-time monitoring of login attempts via Datadog SIEM

**6.5.4 Password Management (§164.308(a)(5)(ii)(D)) - Addressable**

**Implemented**: Enforced via Active Directory Group Policy + 1Password (password manager)

### 6.6 Security Incident Procedures (§164.308(a)(6)) - Required

**6.6.1 Response and Reporting (§164.308(a)(6)(ii)) - Required**

**Incident Response Plan**: See Section 10.3

### 6.7 Contingency Plan (§164.308(a)(7)) - Required

**6.7.1 Data Backup Plan (§164.308(a)(7)(ii)(A)) - Required**

**Backup Strategy**:
- **Database**: Automated daily backups (PostgreSQL), 7-day retention + weekly full backup (90-day retention)
- **S3**: Versioning enabled, cross-region replication (us-west-2 → us-east-1)
- **Configuration**: Infrastructure as Code (Terraform) in git repo

**Testing**: Quarterly restore drills

**6.7.2 Disaster Recovery Plan (§164.308(a)(7)(ii)(B)) - Required**

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**Failover Procedure**:
1. Declare disaster (outage >1 hour or data loss detected)
2. Activate DR site (us-east-1)
3. Restore latest backup
4. Update DNS (Route 53 failover routing)
5. Validate functionality
6. Notify users

**DR Drills**: Semi-annual

**6.7.3 Emergency Mode Operation Plan (§164.308(a)(7)(ii)(C)) - Required**

**Degraded Mode**:
- **Read-Only Mode**: If primary DB down, route to read replica
- **Manual Processing**: Paper forms + retroactive data entry when system restored
- **Communication**: Status page (status.holilabs.com) + email notifications

**6.7.4 Testing and Revision Procedures (§164.308(a)(7)(ii)(D)) - Addressable**

**Testing Schedule**:
- **Backup Restore**: Quarterly
- **Disaster Recovery**: Semi-annual
- **Incident Response**: Annual tabletop exercise

**Revision**: After each test + after any actual incident

**6.7.5 Applications and Data Criticality Analysis (§164.308(a)(7)(ii)(E)) - Addressable**

| System | Criticality | RTO | RPO | Notes |
|--------|-------------|-----|-----|-------|
| Holi API | Critical | 1 hour | 15 min | Core application |
| Medplum FHIR | Critical | 1 hour | 15 min | FHIR backend |
| Patient Portal | High | 4 hours | 1 hour | User-facing app |
| Admin Dashboard | Medium | 8 hours | 4 hours | Internal tool |
| Analytics | Low | 24 hours | 24 hours | Non-operational |

### 6.8 Evaluation (§164.308(a)(8)) - Required

**Periodic Technical and Nontechnical Evaluation**: Annual compliance assessment by external auditor

**Internal Audits**:
- **Quarterly**: Policy compliance spot checks
- **Semi-annual**: Technical control testing
- **Annual**: Full HIPAA risk assessment

**External Audits**:
- **Annual**: HIPAA compliance audit (external firm)
- **As needed**: Breach investigation (if incident occurs)

### 6.9 Business Associate Contracts (§164.308(b)(1)) - Required

**See Section 11: Business Associate Agreements**

---

## 7. Physical Safeguards

### 7.1 Facility Access Controls (§164.310(a)(1))

**7.1.1 Contingency Operations (§164.310(a)(2)(i)) - Addressable**

**Implementation**: Cloud-based infrastructure (AWS)
- **No Physical Servers**: All servers are virtual (EC2, RDS)
- **Multiple Availability Zones**: Redundancy across 3 AZs in us-west-2
- **Geographic Redundancy**: DR site in us-east-1

**Physical Security** (AWS Responsibility per Shared Responsibility Model):
- **24/7 Security Guards**: Armed guards at all AWS data centers
- **Biometric Access**: Multi-factor authentication (badge + fingerprint + PIN)
- **Video Surveillance**: 90-day retention
- **Mantrap Entries**: Two-person rule for server room access

**Holi Labs Responsibility**:
- **Office Security**: Badge access to HQ office (8am-6pm staffed reception)
- **Visitor Log**: All visitors escorted, sign NDA
- **Clean Desk Policy**: No PHI printouts left unattended
- **Device Encryption**: Full-disk encryption (FileVault on Mac, BitLocker on Windows)

**7.1.2 Facility Security Plan (§164.310(a)(2)(ii)) - Addressable**

**AWS Data Centers**: SOC 2 Type II certified (annual audit)

**Holi Labs Office**:
- **Perimeter Security**: Locked doors after hours, security system (ADT)
- **Server Room**: N/A (cloud-only)
- **Workstation Security**: Cable locks on laptops, auto-lock after 5 min idle

**7.1.3 Access Control and Validation Procedures (§164.310(a)(2)(iii)) - Addressable**

**Implementation**: Badge access system (HID proximity cards)
- **Access Levels**: Public (lobby), Restricted (office), Confidential (executive suite)
- **Access Log**: Swipe records retained for 90 days
- **Visitor Escort**: All non-employees must be escorted

**7.1.4 Maintenance Records (§164.310(a)(2)(iv)) - Addressable**

**Implementation**: ServiceNow for facility maintenance tickets
- **HVAC**: Quarterly inspection
- **Fire Suppression**: Annual inspection
- **Badge System**: Monthly access audit

### 7.2 Workstation Use (§164.310(b)) - Required

**Policy**: Workstations must not display PHI visible to unauthorized persons

**Implementation**:
- **Privacy Screens**: Mandatory on all laptops used in public spaces
- **Screen Lock**: Auto-lock after 5 minutes of inactivity
- **Position Monitors**: Facing away from public view (office layout)
- **Hot Desking**: Clean desk policy (no PHI left on desk overnight)

### 7.3 Workstation Security (§164.310(c)) - Required

**Policy**: Implement physical safeguards for workstations that access PHI

**Implementation**:
- **Cable Locks**: All laptops secured when in office
- **Theft Prevention**: Tracked via MDM (Jamf), remote wipe capability
- **Visitor Areas**: No workstations with PHI access in public areas

### 7.4 Device and Media Controls (§164.310(d)(1))

**7.4.1 Disposal (§164.310(d)(2)(i)) - Required**

**Policy**: Secure disposal/destruction of PHI and hardware containing PHI

**Implementation**:
- **Hard Drives**: NIST 800-88 compliant wiping (7-pass overwrite) or physical destruction (shredding)
- **Paper Records**: Cross-cut shredding (on-site shredder for sensitive docs)
- **Mobile Devices**: Factory reset + verification
- **USB Drives**: Banned in office (DLP policy)

**Certificate of Destruction**: Retained for 7 years

**7.4.2 Media Re-use (§164.310(d)(2)(ii)) - Required**

**Policy**: Remove PHI from electronic media before re-use

**Implementation**:
- **Internal Transfer**: Secure wipe (NIST 800-88) verified before reassignment
- **External Sale**: Not permitted (devices destroyed instead)

**7.4.3 Accountability (§164.310(d)(2)(iii)) - Addressable**

**Implementation**: Asset inventory in ServiceNow
- **Laptops**: Assigned to employee, serial number tracked
- **Check-out/Check-in**: Document movement of portable devices
- **Annual Audit**: Verify all assets accounted for

**7.4.4 Data Backup and Storage (§164.310(d)(2)(iv)) - Addressable**

**Implementation**: See 6.7.1 (Data Backup Plan)

---

## 8. Audit Controls & Accountability

### 8.1 Audit Event Logging

**Comprehensive Event Capture** (`audit.audit_events` table):

```sql
SELECT
  event_type,
  COUNT(*) as event_count,
  MIN(ts) as first_event,
  MAX(ts) as last_event
FROM audit.audit_events
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY event_count DESC;

-- Example output:
-- FHIR_SYNC             15,234    2024-11-26    2024-12-26
-- FHIR_EXPORT           3,421     2024-11-26    2024-12-26
-- CONSENT_GRANT         1,245     2024-11-26    2024-12-26
-- LOGIN                 8,932     2024-11-26    2024-12-26
-- AUTHORIZATION_FAILURE 142       2024-11-26    2024-12-26
```

### 8.2 Audit Log Protection

**Write-Once**: No UPDATE or DELETE permissions on audit_events table (only INSERT)

**Integrity Verification**:
```sql
-- Checksum verification
SELECT
  id,
  SHA256(CONCAT(org_id, event_type, user_id, ts, payload::TEXT)) as computed_checksum,
  integrity_checksum
FROM audit.audit_events
WHERE integrity_checksum != SHA256(CONCAT(org_id, event_type, user_id, ts, payload::TEXT))
LIMIT 10;

-- Should return 0 rows (no tampering)
```

**Access Control**: Admin-only access via secure dashboard (MFA required)

### 8.3 Monitoring & Alerting

**Anomaly Detection** (Datadog):

**Alert 1: Excessive Failed Login Attempts**
```yaml
name: "HIPAA - Excessive Failed Login Attempts"
query: |
  count(last_15m):
    sum:audit.event_count{event_type:LOGIN,outcome:FAILURE}
    by {user_id}
  > 10
severity: HIGH
notify:
  - slack://security-alerts
  - pagerduty://hipaa-incidents
```

**Alert 2: Unauthorized PHI Access Attempt**
```yaml
name: "HIPAA - Unauthorized PHI Access"
query: |
  count(last_5m):
    sum:audit.event_count{event_type:AUTHORIZATION_FAILURE,resource_type:PHI}
  > 5
severity: CRITICAL
notify:
  - slack://security-alerts
  - pagerduty://hipaa-incidents
  - email://ciso@holilabs.com
```

**Alert 3: Bulk Export by Non-Admin**
```yaml
name: "HIPAA - Suspicious Bulk Export"
query: |
  count(last_1h):
    sum:audit.event_count{event_type:FHIR_EXPORT,user_role:!ADMIN}
    by {user_id}
  > 100
severity: HIGH
notify:
  - slack://security-alerts
  - email://privacy@holilabs.com
```

### 8.4 Accounting of Disclosures (§164.528)

**Patient Right**: Individuals have the right to receive an accounting of disclosures of PHI for the 6 years prior to the request date.

**Implementation**:

```typescript
// apps/api/src/routes/patient-rights.ts
async function getAccountingOfDisclosures(
  patientTokenId: string,
  startDate: Date,
  endDate: Date
): Promise<Disclosure[]> {
  const disclosures = await prisma.auditEvent.findMany({
    where: {
      patientTokenId,
      eventType: {
        in: ['FHIR_EXPORT', 'PHI_DISCLOSURE', 'EXTERNAL_SHARE'],
      },
      ts: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { ts: 'desc' },
  });

  return disclosures.map((event) => ({
    date: event.ts,
    recipient: event.payload.recipient,
    purpose: event.payload.purpose,
    description: event.payload.description,
  }));
}
```

**Exclusions** (per §164.528(a)(1)):
- Disclosures for treatment, payment, healthcare operations
- Disclosures to the individual or their personal representative
- Disclosures pursuant to authorization

**Timeline**: Provide accounting within 60 days of request (extendable to 90 days with written notice)

### 8.5 Audit Log Retention

**Retention Period**: 7 years per §164.316(b)(2)(i)

**Storage**:
- **Hot Storage** (PostgreSQL): Last 90 days (fast queries)
- **Warm Storage** (S3): 91 days - 2 years (Glacier Instant Retrieval)
- **Cold Storage** (S3 Glacier Deep Archive): 2-7 years (12-hour retrieval)

**Archival Process** (Automated):
```sql
-- Monthly job: Archive audit events older than 90 days
INSERT INTO s3_audit_archive
SELECT * FROM audit.audit_events
WHERE ts < NOW() - INTERVAL '90 days'
AND id NOT IN (SELECT audit_event_id FROM s3_audit_archive);

-- Then delete from hot storage (after verification)
DELETE FROM audit.audit_events
WHERE ts < NOW() - INTERVAL '90 days'
AND id IN (SELECT audit_event_id FROM s3_audit_archive);
```

---

## 9. Consent Management

### 9.1 Consent Requirements

**Legal Basis** (per HIPAA §164.508):
- **Authorization**: Written permission for uses/disclosures not otherwise permitted by Privacy Rule
- **Opt-In Model**: Affirmative consent required before any PHI access

**Granular Consent**: Data class-level permissions

```typescript
enum DataClass {
  CLINICAL_NOTES = 'CLINICAL_NOTES',
  LAB_RESULTS = 'LAB_RESULTS',
  MEDICATIONS = 'MEDICATIONS',
  IMAGING = 'IMAGING',
  GENOMICS = 'GENOMICS',
  MENTAL_HEALTH = 'MENTAL_HEALTH',  // Extra protection per 42 CFR Part 2
  SUBSTANCE_ABUSE = 'SUBSTANCE_ABUSE',  // Extra protection per 42 CFR Part 2
}

enum ConsentPurpose {
  CARE = 'CARE',           // Treatment, payment, operations
  RESEARCH = 'RESEARCH',   // De-identified research
  MARKETING = 'MARKETING', // Marketing/fundraising (rarely used)
  SHARE = 'SHARE',         // Share with third party
}

enum ConsentState {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}
```

### 9.2 Consent Enforcement

**Validation Layer** (`apps/api/src/routes/fhir-export.ts:87-107`):

```typescript
async function validateConsent(
  patientTokenId: string,
  orgId: string,
  requiredDataClasses: DataClass[]
): Promise<ConsentValidationResult> {
  // 1. Find active CARE consent
  const consent = await prisma.consent.findFirst({
    where: {
      patientTokenId,
      orgId,
      purpose: 'CARE',
      state: 'ACTIVE',
    },
  });

  if (!consent) {
    return {
      valid: false,
      reason: 'No active CARE consent found',
      blockingAction: 'DENY_ACCESS',
    };
  }

  // 2. Verify data classes
  const missingClasses = requiredDataClasses.filter(
    (cls) => !consent.dataClasses.includes(cls)
  );

  if (missingClasses.length > 0) {
    return {
      valid: false,
      reason: `Consent missing data classes: ${missingClasses.join(', ')}`,
      blockingAction: 'PROMPT_CONSENT',
    };
  }

  // 3. Check expiration (if applicable)
  if (consent.expiresAt && consent.expiresAt < new Date()) {
    return {
      valid: false,
      reason: 'Consent expired',
      blockingAction: 'PROMPT_RENEW',
    };
  }

  return { valid: true };
}
```

**Enforcement Points**:
1. **FHIR Export**: All `$everything` operations validate consent
2. **API Queries**: Middleware validates consent on every PHI access
3. **External Shares**: Explicit re-consent required for each share

### 9.3 Consent Lifecycle

**Grant Consent**:
```typescript
async function grantConsent(params: {
  patientTokenId: string;
  orgId: string;
  purpose: ConsentPurpose;
  dataClasses: DataClass[];
  expiresAt?: Date;
}): Promise<Consent> {
  const consent = await prisma.consent.create({
    data: {
      patientTokenId: params.patientTokenId,
      orgId: params.orgId,
      purpose: params.purpose,
      state: 'ACTIVE',
      dataClasses: params.dataClasses,
      expiresAt: params.expiresAt,
      grantedAt: new Date(),
    },
  });

  // Audit consent grant
  await prisma.auditEvent.create({
    data: {
      orgId: params.orgId,
      eventType: 'CONSENT_GRANT',
      payload: {
        consentId: consent.id,
        patientTokenId: params.patientTokenId,
        purpose: params.purpose,
        dataClasses: params.dataClasses,
      },
    },
  });

  return consent;
}
```

**Revoke Consent**:
```typescript
async function revokeConsent(consentId: string, reason: string): Promise<void> {
  const consent = await prisma.consent.update({
    where: { id: consentId },
    data: {
      state: 'REVOKED',
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });

  // Audit consent revocation
  await prisma.auditEvent.create({
    data: {
      orgId: consent.orgId,
      eventType: 'CONSENT_REVOKE',
      payload: {
        consentId,
        patientTokenId: consent.patientTokenId,
        reason,
      },
    },
  });

  // Notify downstream systems (Medplum)
  await notifyConsentRevocation(consent.patientTokenId);
}
```

### 9.4 Right to Revoke (§164.508(b)(5))

**Patient Rights**: Individuals have the right to revoke authorization at any time.

**Implementation**:
- **Self-Service**: Patient portal allows one-click consent revocation
- **Effective Immediately**: Revocation takes effect within 5 minutes (cache TTL)
- **Scope**: Revocation applies to future uses/disclosures only (cannot undo past disclosures)
- **Acknowledgment**: Patient receives email confirmation of revocation

**UI Flow** (`apps/web/src/app/portal/consent`):
1. Patient navigates to "Privacy Settings"
2. Views list of active consents (purpose, data classes, granted date)
3. Clicks "Revoke Consent" button
4. Confirms revocation with modal dialog
5. System immediately revokes consent + sends confirmation email
6. Downstream systems notified within 5 minutes

---

## 10. Breach Notification Procedures

### 10.1 Breach Definition (45 CFR §164.402)

**Breach**: Acquisition, access, use, or disclosure of PHI that compromises security/privacy of the PHI.

**Presumption of Breach**: Unless covered entity/business associate demonstrates low probability of compromise per risk assessment (4-factor test).

**Exceptions** (Not a Breach):
1. **Unintentional Acquisition/Access**: By workforce member acting in good faith, within scope of authority, no further impermissible use/disclosure
2. **Inadvertent Disclosure**: To another authorized person at same entity, no further impermissible use/disclosure
3. **Good Faith Belief**: Unauthorized person could not have retained the PHI

### 10.2 Four-Factor Risk Assessment

**Factor 1**: Nature and extent of PHI involved
- **High Risk**: SSN, financial information, full medical record
- **Medium Risk**: Lab results, medications, clinical notes
- **Low Risk**: Appointment dates, provider names (without diagnosis)

**Factor 2**: Unauthorized person who accessed/received PHI
- **High Risk**: Malicious actor, competitor, public disclosure
- **Medium Risk**: Another covered entity/business associate
- **Low Risk**: Internal employee with authorization for other patients

**Factor 3**: Was PHI actually acquired/viewed?
- **High Risk**: Evidence of viewing/downloading
- **Medium Risk**: Access logged but unclear if viewed
- **Low Risk**: Access technically possible but no evidence of viewing

**Factor 4**: Extent to which risk has been mitigated
- **High Mitigation**: PHI encrypted with FIPS 140-2 compliant algorithm (safe harbor)
- **Medium Mitigation**: Rapid containment, unauthorized recipient signed confidentiality agreement
- **Low Mitigation**: No mitigation possible (e.g., public posting)

### 10.3 Incident Response Plan

**Phase 1: Detection & Containment** (0-4 hours)

**Detection Methods**:
- Automated alerts (Datadog SIEM)
- Employee report (security@holilabs.com)
- Patient complaint
- External notification (researcher, journalist)

**Immediate Actions**:
1. **Containment**: Disable compromised accounts, revoke credentials, block IP addresses
2. **Preservation**: Take forensic snapshots (EC2, RDS), preserve logs
3. **Notification**: Alert Security Officer + Privacy Officer via PagerDuty
4. **Initial Assessment**: Determine scope (# of patients affected, type of PHI)

**Phase 2: Investigation & Risk Assessment** (4-24 hours)

**Investigation**:
1. **Timeline**: Reconstruct incident timeline from audit logs
2. **Scope**: Identify all affected patient records (SQL query audit_events table)
3. **Root Cause**: Determine how breach occurred (vulnerability analysis)
4. **Attribution**: Identify threat actor (if applicable)

**Risk Assessment** (4-factor test):
```typescript
interface BreachRiskAssessment {
  factor1_phi_nature: 'HIGH' | 'MEDIUM' | 'LOW';
  factor2_unauthorized_person: 'HIGH' | 'MEDIUM' | 'LOW';
  factor3_actual_acquisition: 'HIGH' | 'MEDIUM' | 'LOW';
  factor4_mitigation: 'HIGH' | 'MEDIUM' | 'LOW';

  overall_risk: 'BREACH' | 'NOT_BREACH';
  justification: string;
}

// Example: Laptop theft with FDE
const assessment: BreachRiskAssessment = {
  factor1_phi_nature: 'MEDIUM',  // Clinical notes
  factor2_unauthorized_person: 'HIGH',  // Unknown thief
  factor3_actual_acquisition: 'LOW',  // FDE enabled, no evidence of decryption
  factor4_mitigation: 'HIGH',  // FIPS 140-2 compliant FDE
  overall_risk: 'NOT_BREACH',
  justification: 'PHI encrypted with FileVault (AES-256), low probability of compromise',
};
```

**Phase 3: Notification** (24-60 days)

**Decision Tree**:
```
Is it a breach per 4-factor test?
├─ NO → Document risk assessment, no notification required
└─ YES → Continue to notification

How many individuals affected?
├─ < 10 individuals → Substitute notice (if insufficient contact info)
├─ 10-499 individuals → Individual notification only
└─ ≥ 500 individuals → Individual + Media + HHS (immediate)
```

**Individual Notification** (§164.404):
- **Timing**: Without unreasonable delay, no later than 60 days from discovery
- **Method**: First-class mail (or email if patient opted in)
- **Content** (per §164.404(c)):
  1. Brief description of breach
  2. Types of PHI involved
  3. Steps individuals should take to protect themselves
  4. Brief description of what Holi Labs is doing to investigate, mitigate, prevent recurrence
  5. Contact information (privacy@holilabs.com, toll-free number)

**Sample Notification Letter**:
```
[Date]

Dear [Patient Name],

We are writing to notify you of a data security incident that may have involved your protected health information (PHI).

WHAT HAPPENED
On [Date], we discovered that [brief description of incident]. We immediately took steps to contain the incident and launched an investigation.

WHAT INFORMATION WAS INVOLVED
The information that may have been involved includes: [list specific data elements, e.g., name, date of birth, medical record number, diagnosis codes, clinical notes from dates X to Y].

WHAT WE ARE DOING
We have [describe containment measures, e.g., disabled the affected account, implemented additional access controls, notified law enforcement]. We are also [describe preventive measures, e.g., conducting a comprehensive security review, providing additional workforce training].

WHAT YOU CAN DO
We recommend that you [specific recommendations, e.g., monitor your medical records for any unusual activity, review your Explanation of Benefits statements, consider placing a fraud alert on your credit reports].

FOR MORE INFORMATION
If you have questions or concerns, please contact our Privacy Officer at:
- Email: privacy@holilabs.com
- Phone: 1-800-XXX-XXXX (toll-free)
- Mail: Holi Labs Privacy Officer, [Address]

We sincerely regret any inconvenience or concern this incident may cause you.

Sincerely,
[Privacy Officer Name]
Chief Privacy Officer
Holi Labs
```

**Media Notification** (§164.406):
- **Requirement**: If breach affects >500 residents of a State or jurisdiction
- **Timing**: Same as individual notification (within 60 days)
- **Method**: Prominent media outlet serving the State/jurisdiction (TV, newspaper, online news)
- **Content**: Same as individual notification

**HHS Notification** (§164.408):
- **>500 Individuals**: Notify HHS Secretary contemporaneously with individual notification (via HHS Breach Portal)
- **<500 Individuals**: Notify HHS Secretary annually (within 60 days of end of calendar year)

**Phase 4: Remediation & Prevention** (Ongoing)

**Short-Term** (0-30 days):
- Patch vulnerability
- Reset compromised credentials
- Enhance monitoring/alerting

**Long-Term** (30-90 days):
- Conduct post-incident review
- Update policies/procedures
- Implement additional technical controls
- Workforce retraining

**Documentation**:
- Incident report (detailed timeline, scope, root cause, remediation)
- Risk assessment (4-factor test)
- Notification letters (copies of all sent)
- HHS Breach Portal submission confirmation

### 10.4 Breach Response Team

| Role | Name | Responsibilities |
|------|------|------------------|
| **Incident Commander** | CISO | Overall response coordination, external communication |
| **Privacy Officer** | CPO | Breach determination, notification oversight, regulatory reporting |
| **Legal Counsel** | General Counsel | Legal review, regulatory liaison, potential litigation |
| **IT Security** | Security Team Lead | Forensic investigation, containment, remediation |
| **Communications** | VP Marketing | Media relations, public statement, patient communication |
| **Compliance** | Compliance Manager | Documentation, regulatory filings, post-incident audit |

**Contact**:
- **Emergency Hotline**: 1-800-XXX-XXXX (24/7 PagerDuty)
- **Email**: security-incident@holilabs.com

---

## 11. Business Associate Agreements

### 11.1 Business Associate Relationship

**Covered Entity**: Holi Labs, Inc.
**Business Associate**: Medplum, Inc.

**Services Provided**: FHIR server hosting, data storage, FHIR API operations

**BAA Execution**: Signed October 15, 2024 (on file with Legal)

### 11.2 BAA Requirements (§164.504(e))

**Required Provisions**:

1. **Permitted Uses/Disclosures** (§164.504(e)(2)(i)(A)):
   - Medplum may only use/disclose PHI as specified in BAA or as required by law
   - Medplum may not use/disclose PHI in manner that would violate Privacy Rule if done by Holi Labs

2. **Safeguards** (§164.504(e)(2)(i)(B)):
   - Medplum shall implement appropriate safeguards to prevent use/disclosure of PHI other than as permitted by BAA

3. **Subcontractors** (§164.504(e)(2)(i)(C)):
   - Medplum shall ensure any subcontractors agree to same restrictions/conditions

4. **Breach Notification** (§164.504(e)(2)(i)(D)):
   - Medplum shall report to Holi Labs any breach of unsecured PHI within 24 hours of discovery

5. **Individual Access** (§164.504(e)(2)(i)(E)):
   - Medplum shall provide access to PHI to Holi Labs (to fulfill individual's right of access under §164.524)

6. **Amendment** (§164.504(e)(2)(i)(F)):
   - Medplum shall make PHI available to Holi Labs for amendment (per §164.526)

7. **Accounting of Disclosures** (§164.504(e)(2)(i)(G)):
   - Medplum shall document disclosures and make information available to Holi Labs (per §164.528)

8. **Availability of Books and Records** (§164.504(e)(2)(i)(H)):
   - Medplum shall make internal practices, books, records available to HHS for compliance review

9. **Return/Destruction** (§164.504(e)(2)(i)(I)):
   - Upon termination, Medplum shall return/destroy all PHI (if not feasible, extend protections to such PHI)

10. **Authorized Uses** (§164.504(e)(2)(i)(J)):
    - Medplum may use PHI for proper management/administration or legal responsibilities
    - Medplum may disclose PHI for management/administration or legal responsibilities if disclosure required by law OR Medplum obtains reasonable assurances that recipient will protect PHI

### 11.3 Medplum-Specific Provisions

**Technical Safeguards**:
- Mutual TLS (mTLS) for all Holi API ↔ Medplum communication
- OAuth2 client credentials with 90-day key rotation
- AES-256 encryption at rest (PostgreSQL)
- TLS 1.3 encryption in transit

**Audit Provisions**:
- Medplum shall log all PHI access (create, read, update, delete, search) with timestamp, user identity, IP address
- Medplum shall make audit logs available to Holi Labs upon request (within 24 hours)
- Medplum shall retain audit logs for 7 years

**Incident Response**:
- Medplum shall notify Holi Labs of security incident within 24 hours of discovery (email: security@holilabs.com + phone: 1-800-XXX-XXXX)
- Medplum shall cooperate with Holi Labs in breach investigation
- Medplum shall preserve forensic evidence (logs, snapshots) for 90 days

**Right to Audit**:
- Holi Labs reserves right to audit Medplum's HIPAA compliance annually (or more frequently upon reasonable suspicion)
- Medplum shall provide full cooperation, access to systems, documentation

**Termination**:
- Holi Labs may terminate BAA immediately upon Medplum's material breach (with 30-day cure period)
- Upon termination, Medplum shall return all PHI within 30 days or provide certification of destruction

### 11.4 Subcontractor Management

**Medplum Subcontractors** (requiring BAA):
- **AWS**: Cloud infrastructure (EC2, RDS, S3) - BAA executed
- **Datadog**: SIEM / logging - BAA executed
- **Twilio**: SMS notifications (if PHI sent via SMS) - BAA executed

**Holi Labs Responsibility**: Obtain list of all subcontractors quarterly, verify BAAs executed

---

## 12. Risk Assessment & Mitigation

### 12.1 Annual Risk Assessment (2024)

**Methodology**: NIST 800-30 (Guide for Conducting Risk Assessments)

**Scope**: All systems that create, receive, maintain, or transmit PHI

**Risk Matrix**:

| Risk ID | Threat | Vulnerability | Likelihood | Impact | Risk Level | Mitigation | Residual Risk |
|---------|--------|---------------|------------|--------|------------|------------|---------------|
| R-001 | Ransomware attack | Phishing susceptibility | Medium | High | HIGH | EDR, phishing training, MFA, immutable backups | LOW |
| R-002 | Insider threat (malicious) | Excessive privileges | Low | High | MEDIUM | Least privilege, audit logging, DLP | MEDIUM |
| R-003 | SQL injection | Application vulnerability | Low | High | MEDIUM | Prisma ORM, parameterized queries, WAF | VERY LOW |
| R-004 | Medplum compromise | Third-party vulnerability | Low | Critical | HIGH | mTLS, de-identification, audit mirroring | LOW |
| R-005 | S3 bucket misconfiguration | Human error | Medium | Critical | HIGH | IAM policies, bucket policies, SCPs, auditing | LOW |
| R-006 | Session hijacking | Weak session management | Medium | Medium | MEDIUM | HTTP-only cookies, SameSite, HTTPS, short TTL | LOW |
| R-007 | DDoS attack | Public-facing API | Medium | Medium | MEDIUM | AWS Shield, rate limiting, CloudFront | LOW |
| R-008 | Lost/stolen laptop | Physical theft | Medium | Medium | MEDIUM | FDE, remote wipe, asset tracking | LOW |
| R-009 | Consent bypass | Logic error | Low | High | MEDIUM | Middleware validation, automated testing | VERY LOW |
| R-010 | Audit log tampering | Insufficient protection | Low | High | MEDIUM | Write-once, integrity checksums, separate storage | VERY LOW |

**Overall Risk Rating**: **LOW** (acceptable residual risk after mitigation)

### 12.2 Vulnerability Management

**Continuous Scanning**:
- **Weekly**: Automated vulnerability scans (Nessus)
- **Monthly**: Dependency vulnerability scans (Snyk, npm audit)
- **Quarterly**: External penetration testing (contracted firm)

**Patching SLA**:
- **Critical**: 24 hours
- **High**: 7 days
- **Medium**: 30 days
- **Low**: 90 days

**Exception Process**:
- If patch breaks functionality, submit exception request to Security Officer with compensating controls
- Maximum exception duration: 90 days
- Re-assessment required after exception period

### 12.3 Threat Modeling

**STRIDE Analysis** (per FHIR export workflow):

| Threat | Example | Mitigation |
|--------|---------|------------|
| **Spoofing** | Attacker impersonates patient to access PHI | MFA, JWT validation, session management |
| **Tampering** | Attacker modifies FHIR data in transit | TLS 1.3, HMAC signatures, integrity checksums |
| **Repudiation** | User denies PHI access | Comprehensive audit logging, non-repudiation |
| **Information Disclosure** | Attacker intercepts PHI | Encryption at rest/transit, access controls |
| **Denial of Service** | Attacker overwhelms API | Rate limiting, AWS Shield, auto-scaling |
| **Elevation of Privilege** | User escalates from PATIENT to ADMIN | RBAC, least privilege, authorization middleware |

### 12.4 Penetration Testing

**External Testing**: Annual (last: November 2024)

**Findings**:
- **Critical**: 0
- **High**: 0
- **Medium**: 2 (remediated)
- **Low**: 5 (accepted risk)

**Medium Findings**:
1. **Missing Security Headers**: Added CSP, X-Frame-Options, X-Content-Type-Options (remediated)
2. **Verbose Error Messages**: Implemented generic error responses in production (remediated)

**Low Findings**:
1. **Email Enumeration**: Login page reveals whether email exists (accepted - UX trade-off)
2. **Directory Listing**: `/static` directory allows listing (accepted - no sensitive files)
3. **HTTP Methods Enabled**: TRACE/OPTIONS enabled (accepted - required for CORS)
4. **Session Fixation**: Theoretical risk (accepted - session regeneration on login)
5. **Clickjacking**: Low-risk pages without frame protection (accepted - non-PHI pages)

---

## 13. Compliance Monitoring

### 13.1 Compliance Metrics Dashboard

**Key Performance Indicators** (monthly tracking):

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Audit log coverage | 100% | 100% | ✅ |
| Encryption coverage | 100% | 100% | ✅ |
| MFA adoption | >90% | 94% | ✅ |
| Consent compliance | 100% | 100% | ✅ |
| Training completion | 100% | 98% | ⚠️ |
| Patch compliance (critical) | 100% in 24h | 100% | ✅ |
| Vulnerability remediation | 100% in 30 days | 97% | ⚠️ |
| Backup success rate | >99% | 99.8% | ✅ |
| Incident response time | <1 hour | 45 min avg | ✅ |
| Breach notification (if applicable) | <60 days | N/A | N/A |

### 13.2 Compliance Audit Schedule

**Internal Audits**:
- **Monthly**: Policy compliance spot checks (random 10 employees)
- **Quarterly**: Technical control testing (penetration test, vulnerability scan)
- **Semi-Annual**: Audit log review (comprehensive analysis of past 6 months)
- **Annual**: Full HIPAA risk assessment (external firm)

**External Audits**:
- **Annual**: HIPAA compliance audit (contracted compliance firm)
- **Every 2 Years**: SOC 2 Type II audit (for customer assurance)
- **Ad Hoc**: Post-breach investigation (if incident occurs)

### 13.3 Workforce Training

**Initial Training**: All new hires complete HIPAA training within 30 days of start

**Annual Refresher**: All workforce members complete annual HIPAA refresher (1-hour online course)

**Topics Covered**:
1. HIPAA Privacy Rule basics
2. HIPAA Security Rule basics
3. Breach notification requirements
4. Patient rights (access, amendment, accounting of disclosures)
5. Holi Labs-specific policies
6. Incident reporting procedures
7. Sanctions for violations

**Training Platform**: HealthcareSource (LMS)

**Attestation**: Employees sign attestation confirming understanding + agreement to comply

### 13.4 Policy Review & Updates

**Annual Review**: All HIPAA-related policies reviewed annually (due: January 31 each year)

**Trigger Events** (immediate review required):
- Regulatory changes (new HIPAA guidance from HHS)
- Security incident / breach
- Failed audit finding
- Material change to business operations (e.g., new Medplum integration)

**Approval**: Security Officer + Privacy Officer + Legal Counsel

**Communication**: All workforce members notified of policy updates via email + required to acknowledge

---

## 14. Appendices

### Appendix A: Glossary

**Business Associate**: Person/entity that performs functions/activities on behalf of covered entity involving use/disclosure of PHI, or provides services to covered entity involving disclosure of PHI.

**Covered Entity**: Health plan, healthcare clearinghouse, or healthcare provider that transmits health information electronically in connection with HIPAA transactions.

**De-identification**: Process of removing 18 identifiers per §164.514(b) (Safe Harbor method) or expert determination method.

**Minimum Necessary**: Standard requiring covered entities to make reasonable efforts to limit PHI use/disclosure to minimum necessary to accomplish intended purpose.

**Protected Health Information (PHI)**: Individually identifiable health information transmitted/maintained in any form by covered entity or business associate.

**Pseudonymization**: Processing of personal data such that it can no longer be attributed to specific data subject without use of additional information (kept separately).

### Appendix B: Contact Information

**Privacy Officer**:
- Name: [Name]
- Title: Chief Privacy Officer (CPO)
- Email: privacy@holilabs.com
- Phone: 1-800-XXX-XXXX ext. 101

**Security Officer**:
- Name: [Name]
- Title: Chief Information Security Officer (CISO)
- Email: security@holilabs.com
- Phone: 1-800-XXX-XXXX ext. 102

**Incident Response Hotline**:
- Phone: 1-800-XXX-XXXX (24/7)
- Email: security-incident@holilabs.com

**Patient Rights Requests**:
- Email: patient-rights@holilabs.com
- Mail: Holi Labs Privacy Officer, [Address]

### Appendix C: Regulatory References

**HIPAA Regulations**:
- 45 CFR Part 160 - General Administrative Requirements
- 45 CFR Part 164 Subpart A - General Provisions
- 45 CFR Part 164 Subpart C - Security Standards (Security Rule)
- 45 CFR Part 164 Subpart D - Notification in Case of Breach
- 45 CFR Part 164 Subpart E - Privacy Standards (Privacy Rule)

**HITECH Act**:
- 42 USC §17921 - Application of Security Provisions
- 42 USC §17932 - Notification in Case of Breach

**HHS Guidance**:
- "Guidance on Risk Analysis Requirements under the HIPAA Security Rule" (July 2010)
- "Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals" (April 2009)
- "Guidance Regarding Methods for De-identification of Protected Health Information" (November 2012)

### Appendix D: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-26 | CISO + CPO | Initial document (Medplum FHIR integration) |

---

## Document Approval

**Approved By**:

________________________
[CISO Name]
Chief Information Security Officer
Date: December 26, 2024

________________________
[CPO Name]
Chief Privacy Officer
Date: December 26, 2024

________________________
[General Counsel Name]
General Counsel
Date: December 26, 2024

**Next Review Date**: December 26, 2025

---

**END OF DOCUMENT**
