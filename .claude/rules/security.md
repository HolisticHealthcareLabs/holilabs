# Security Rules — Holi Labs Healthcare Platform

## Data Classification

All data in this system falls into one of four classifications. Every field, log entry,
API response, and export must be handled according to its classification level.

| Level | Label | Description | Handling Requirements |
|-------|-------|-------------|----------------------|
| **L1** | `PUBLIC` | Marketing content, public API docs, open-source code | No restrictions |
| **L2** | `INTERNAL` | Internal metrics, non-PHI configs, workspace metadata | No external sharing. Audit log optional. |
| **L3** | `CONFIDENTIAL` | Business data, billing, financial records, API keys | Encrypted at rest + in transit. Audit logged. Access restricted by role. |
| **L4** | `PHI` | Any data that can identify a patient or their health status | Encrypted (AES-256-GCM). Audit logged with `accessReason`. Consent-gated. De-identified for analytics. Erasure-capable (LGPD Art. 18). |

---

## PHI Fields — Complete Inventory

### Patient Model (L4 — PHI)
| Field | Type | Encryption | Notes |
|-------|------|-----------|-------|
| `firstName` | String | AES-256-GCM, key-versioned (`firstNameKeyVersion`) | Never log. Use `tokenId` in logs. |
| `lastName` | String | AES-256-GCM, key-versioned (`lastNameKeyVersion`) | Never log. |
| `dateOfBirth` | DateTime | Context-encrypted | Age band (`ageBand`) for de-identified use. |
| `gender` | String | Context-encrypted | |
| `email` | String | AES-256-GCM, key-versioned (`emailKeyVersion`) | |
| `phone` | String | AES-256-GCM, key-versioned (`phoneKeyVersion`) | |
| `address` | String | AES-256-GCM, key-versioned (`addressKeyVersion`) | |
| `city`, `state`, `postalCode` | String | Context-encrypted | Use `region` for de-identified. |
| `mrn` | String | AES-256-GCM, key-versioned (`mrnKeyVersion`) | Primary internal identifier. |
| `externalMrn` | String | AES-256-GCM, key-versioned | External system linkage. |
| `cpf` | String | AES-256-GCM, key-versioned (`cpfKeyVersion`) | Brazilian tax ID — LGPD sensitive. |
| `cns` | String | AES-256-GCM, key-versioned (`cnsKeyVersion`) | Cartão Nacional de Saúde. |
| `rg` | String | AES-256-GCM, key-versioned (`rgKeyVersion`) | Brazilian identity document. |
| `municipalityCode` | String | — | IBGE code — quasi-identifier. |
| `healthUnitCNES` | String | — | Facility code — quasi-identifier. |

### User Model (L3 — CONFIDENTIAL)
| Field | Type | Encryption | Notes |
|-------|------|-----------|-------|
| `passwordHash` | String | bcrypt hashed | Never log, never return in API. |
| `signingPinHash` | String | bcrypt hashed | Prescription signing PIN. |
| `mfaPhoneNumber` | String | Encrypted | Never log. |
| `mfaBackupCodes` | String[] | Encrypted | Single-use. Never log. |
| `licenseNumber` | String | — | Professional credential. |
| `npi` | String | — | US provider identifier. |

### Clinical Models (L4 — PHI)
| Model | PHI Fields | Notes |
|-------|-----------|-------|
| `Medication` | `name`, `dose`, `frequency`, `instructions`, `notes` | Linked to patient via FK. |
| `Prescription` | `medications` (JSON), `instructions`, `diagnosis` | Tamper-proof hash required. |
| `SOAPNote` | `subjective`, `objective`, `assessment`, `plan`, `chiefComplaint`, `vitalSigns` | Clinical narrative — highest sensitivity. |
| `ScribeSession` | `audioFileUrl`, `audioFileName` | Voice recordings are PHI (HIPAA §160.103). |
| `ClinicalEncounter` | `chiefComplaint`, diagnosis fields | Linked to patient and provider. |

---

## Prohibited Patterns

### Code Patterns — BLOCKED by pre-commit hook
```typescript
// 1. Logging PHI fields
console.log(patient.firstName);                    // BLOCKED
console.log(`Patient: ${patient.cpf}`);            // BLOCKED
logger.info({ mrn: patient.mrn });                 // BLOCKED

// 2. SELECT * on patient tables
prisma.$queryRaw`SELECT * FROM patients`;          // BLOCKED
prisma.$queryRaw`SELECT * FROM soap_notes`;        // BLOCKED

// 3. Returning PHI in error messages
throw new Error(`Patient ${patient.firstName} not found`); // BLOCKED

// 4. Storing PHI in localStorage/sessionStorage
localStorage.setItem('patientName', patient.firstName);    // BLOCKED
```

### Architecture Patterns — BLOCKED by code review
```typescript
// 1. Direct Prisma patient queries outside service layer
// All patient data access must go through PatientService
const patient = await prisma.patient.findUnique(...); // BLOCKED in route handlers

// 2. API routes without Zod validation
export async function POST(req: Request) {
  const body = await req.json(); // BLOCKED — must use Zod schema
}

// 3. API routes without auth middleware
export async function GET(req: Request) { // BLOCKED — must use createProtectedRoute
  return NextResponse.json(data);
}

// 4. Unencrypted PHI storage
await prisma.patient.create({
  data: { firstName: rawFirstName } // BLOCKED — must encrypt first
});
```

---

## Correct Patterns

```typescript
// Logging with tokenized identifiers
logger.info({ tokenId: patient.tokenId, action: 'record_viewed' });

// Zod-validated API input
const schema = z.object({ patientId: z.string().cuid() });
const { patientId } = schema.parse(await req.json());

// Service layer access with audit
const patient = await patientService.getById(patientId, {
  accessReason: 'clinical_encounter',
  requestedBy: session.user.id,
});

// Encrypted field storage
const encrypted = await encryptField(rawFirstName, keyVersion);
await prisma.patient.create({
  data: { firstName: encrypted, firstNameKeyVersion: keyVersion }
});
```

---

## Incident Response Classification

### What Constitutes a Security Incident

| Category | Examples | Severity |
|----------|---------|----------|
| **Data Breach** | PHI exposed via API, logs, or export. Unauthorized patient data access. | P0 |
| **Auth Bypass** | Session hijack, privilege escalation, MFA bypass, RBAC failure. | P0 |
| **Injection** | SQL injection, XSS, command injection found in production. | P0 |
| **Secret Exposure** | API keys, database URLs, or encryption keys committed or logged. | P1 |
| **Dependency Vuln** | Critical CVE in production dependency (CVSS >= 9.0). | P1 |
| **Misconfiguration** | Open CORS, missing CSP, rate limit disabled. | P2 |
| **Compliance Gap** | Missing audit log, consent not checked, encryption key not rotated. | P2 |

### Contact Chain

1. **Immediate (P0/P1):** Incident Commander (on-call) → Security Lead → CTO → Compliance Officer
2. **Business Hours (P2/P3):** Security Lead → Engineering Manager → Compliance Officer
3. **Regulatory:** LGPD DPO within 2 business days. HIPAA Compliance Officer within 60 calendar days.

### Response SLA

| Severity | Acknowledge | Contain | Resolve | Notify Regulators |
|----------|------------|---------|---------|-------------------|
| P0 | 15 min | 1 hour | 24 hours | LGPD: 2 biz days / HIPAA: 60 days |
| P1 | 1 hour | 4 hours | 72 hours | If PHI involved |
| P2 | 4 hours | 24 hours | 1 sprint | N/A unless PHI |
| P3 | Next standup | Next sprint | Backlog | N/A |
