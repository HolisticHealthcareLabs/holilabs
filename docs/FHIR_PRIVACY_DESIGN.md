# Privacy-Preserving FHIR Architecture Design

## Executive Summary

This document describes how Holi Labs integrates Medplum (FHIR R4) while maintaining AEGIS privacy guarantees. The architecture balances **clinical interoperability** (FHIR standard) with **research-grade privacy** (zero-trust, de-identification).

---

## Design Principles

### 1. Consent-Gated Access
**Principle:** No FHIR resource created without explicit patient consent.

**Implementation:**
- Check `consent.state === 'ACTIVE'` before sync
- Sync only data classes authorized in `consent.dataClasses[]`
- Auto-revoke FHIR resources when consent revoked

### 2. De-Identification by Default
**Principle:** Medplum stores **operational identifiers only**, not raw PHI.

**FHIR Patient Resource Structure:**
```json
{
  "resourceType": "Patient",
  "id": "pt_abc123",  // PatientToken.id (pseudonymous)
  "identifier": [{
    "system": "https://holilabs.xyz/patient-token",
    "value": "pt_abc123"
  }],
  "name": [{
    "text": "Patient [ABC]",  // Anonymized display name
    "family": "***",
    "given": ["***"]
  }],
  "telecom": [],  // Empty - no contact info
  "address": [],  // Empty - no address
  "birthDate": null,  // Or age-range only (e.g., "1980-1989")
  "extension": [{
    "url": "https://holilabs.xyz/fhir/consent-state",
    "valueCode": "ACTIVE"
  }]
}
```

**Privacy Guarantee:** Even if Medplum is breached, attackers gain no exploitable PHI.

### 3. Encrypted Payload References
**Principle:** Clinical detail lives in S3 (encrypted), not FHIR resources.

**FHIR DocumentReference for Datasets:**
```json
{
  "resourceType": "DocumentReference",
  "id": "ds_xyz789",
  "subject": { "reference": "Patient/pt_abc123" },
  "content": [{
    "attachment": {
      "url": "s3://holi-documents/encrypted/dataset_xyz789.enc",
      "hash": "sha256:a1b2c3..."  // Integrity verification
    }
  }],
  "securityLabel": [{
    "system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
    "code": "R"  // Restricted
  }]
}
```

**Access Flow:**
1. Clinician requests `DocumentReference/ds_xyz789`
2. Holi API checks consent + RBAC
3. If authorized, generates pre-signed S3 URL (5-minute expiry)
4. Clinician downloads and decrypts locally

---

## Schema Extensions (Minimal Clinical Support)

### New Models

```prisma
model Encounter {
  id                String   @id @default(uuid())
  orgId             String   @map("org_id")
  patientTokenId    String   @map("patient_token_id")
  status            String   // planned | in-progress | finished | cancelled
  type              String   // office-visit | telehealth | emergency
  reasonCode        String?  @map("reason_code")
  start             DateTime?
  end               DateTime?
  locationDisplay   String?  @map("location_display")
  fhirResourceId    String?  @unique @map("fhir_resource_id")
  lastSyncedAt      DateTime? @map("last_synced_at")
  createdAt         DateTime @default(now()) @map("created_at")

  org              Org          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  patientToken     PatientToken @relation(fields: [patientTokenId], references: [id], onDelete: Cascade)
  observations     Observation[]

  @@index([orgId])
  @@index([patientTokenId])
  @@index([fhirResourceId])
  @@map("encounters")
  @@schema("public")
}

model Observation {
  id                String   @id @default(uuid())
  orgId             String   @map("org_id")
  patientTokenId    String   @map("patient_token_id")
  encounterId       String?  @map("encounter_id")
  code              String   // LOINC code (e.g., "8867-4" for heart rate)
  display           String   // Human-readable (e.g., "Heart rate")
  valueQuantity     Decimal? @map("value_quantity") @db.Decimal(10, 2)
  valueUnit         String?  @map("value_unit")
  valueString       String?  @map("value_string")
  effectiveDateTime DateTime @map("effective_date_time")
  fhirResourceId    String?  @unique @map("fhir_resource_id")
  lastSyncedAt      DateTime? @map("last_synced_at")
  createdAt         DateTime @default(now()) @map("created_at")

  org              Org          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  patientToken     PatientToken @relation(fields: [patientTokenId], references: [id], onDelete: Cascade)
  encounter        Encounter?   @relation(fields: [encounterId], references: [id], onDelete: SetNull)

  @@index([orgId])
  @@index([patientTokenId])
  @@index([encounterId])
  @@index([fhirResourceId])
  @@map("observations")
  @@schema("public")
}
```

**Design Notes:**
- `fhirResourceId`: Tracks corresponding Medplum resource (nullable if sync disabled)
- `lastSyncedAt`: Detects drift during reconciliation
- Relations: `PatientToken` (privacy anchor), not a theoretical `Patient` model

---

## FHIR Sync Strategy

### Outbound (Holi → Medplum)

```typescript
// apps/api/src/services/fhir-sync.ts

export async function syncEncounterToFhir(encounter: Encounter, patientToken: PatientToken): Promise<void> {
  // 1. Check consent
  const consent = await prisma.consent.findFirst({
    where: {
      patientTokenId: encounter.patientTokenId,
      purpose: 'CARE',
      state: 'ACTIVE',
    },
  });
  if (!consent || !consent.dataClasses.includes('encounters')) {
    logger.warn({ encounterId: encounter.id }, '[FHIR] Skipping sync - no active consent');
    return;
  }

  // 2. Build de-identified FHIR resource
  const fhirEncounter: Encounter = {
    resourceType: 'Encounter',
    id: encounter.fhirResourceId || encounter.id,
    status: encounter.status as EncounterStatus,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: mapToActCode(encounter.type),
    },
    subject: {
      reference: `Patient/${patientToken.id}`,
      display: `Patient [${patientToken.id.slice(0, 6).toUpperCase()}]`,
    },
    period: {
      start: encounter.start?.toISOString(),
      end: encounter.end?.toISOString(),
    },
    reasonCode: encounter.reasonCode ? [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: encounter.reasonCode,
      }],
    }] : undefined,
  };

  // 3. Upsert to Medplum
  await upsertResource('Encounter', fhirEncounter);

  // 4. Update local sync metadata
  await prisma.encounter.update({
    where: { id: encounter.id },
    data: {
      fhirResourceId: fhirEncounter.id,
      lastSyncedAt: new Date(),
    },
  });

  // 5. Audit log
  await prisma.auditEvent.create({
    data: {
      orgId: encounter.orgId,
      eventType: 'FHIR_SYNC',
      payload: {
        resourceType: 'Encounter',
        resourceId: fhirEncounter.id,
        action: 'UPSERT',
      },
    },
  });
}
```

### Inbound (External EHR → Holi via Medplum)

```typescript
// apps/api/src/routes/fhir-ingress.ts

export async function ingestFhirObservation(fhirObs: FHIRObservation, orgId: string): Promise<void> {
  // 1. Validate + sanitize
  const validated = FhirObservationSchema.parse(fhirObs);

  // 2. Resolve patient (match FHIR Patient.id → PatientToken.id)
  const patientRef = validated.subject?.reference?.split('/')[1];
  const patientToken = await prisma.patientToken.findUnique({
    where: { id: patientRef },
  });
  if (!patientToken) {
    throw new Error(`Patient token not found: ${patientRef}`);
  }

  // 3. Transform to Holi model
  const observation = await prisma.observation.create({
    data: {
      orgId,
      patientTokenId: patientToken.id,
      code: validated.code.coding[0].code,
      display: validated.code.coding[0].display,
      valueQuantity: validated.valueQuantity?.value,
      valueUnit: validated.valueQuantity?.unit,
      effectiveDateTime: new Date(validated.effectiveDateTime),
      fhirResourceId: validated.id,
    },
  });

  // 4. Audit ingress
  await prisma.auditEvent.create({
    data: {
      orgId,
      eventType: 'FHIR_INGRESS',
      payload: {
        resourceType: 'Observation',
        externalId: validated.id,
        holiId: observation.id,
      },
    },
  });
}
```

---

## Security Controls

### 1. Consent Enforcement Matrix

| Data Class | Required Consent Purpose | FHIR Resources Allowed |
|------------|--------------------------|------------------------|
| `demographics` | `CARE` | Patient (limited) |
| `encounters` | `CARE` | Encounter |
| `vitals` | `CARE` | Observation (vital signs) |
| `labs` | `CARE` | Observation (lab results) |
| `documents` | `CARE` or `RESEARCH` | DocumentReference |
| `genetic` | `RESEARCH` (never `CARE`) | NOT synced to FHIR |

### 2. RBAC Filters

**Medplum Project Access:**
- **Clinician role:** Read/write Encounter, Observation (own patients only)
- **Researcher role:** Read DocumentReference (de-identified bundles only)
- **Admin role:** Read AuditEvent (no PHI access)

**Implementation:** Medplum AccessPolicy resources

### 3. Audit Trail

**All FHIR operations logged to `audit.audit_events`:**
- `FHIR_SYNC`: Holi → Medplum
- `FHIR_INGRESS`: External → Holi
- `FHIR_ACCESS`: User read FHIR resource
- `FHIR_EXPORT`: Bundle download

**Immutable log:** Append-only, cryptographically chained (Helix-Ledger)

---

## Deployment Architecture

### Infrastructure

```
┌─────────────────┐
│  External EHR   │
│  (HL7/FHIR)     │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│  Holi API (Fastify)                 │
│  ┌─────────────────────────────┐   │
│  │ FHIR Ingress Route          │   │
│  │ /api/fhir/inbound           │   │
│  └────────┬────────────────────┘   │
│           │                         │
│           ▼                         │
│  ┌─────────────────────────────┐   │
│  │ FHIR Sync Service           │   │
│  │ (BullMQ Worker)             │   │
│  └────────┬────────────────────┘   │
│           │                         │
└───────────┼─────────────────────────┘
            │ OAuth2 + mTLS
            ▼
┌─────────────────────────────────────┐
│  Medplum (Docker)                   │
│  http://localhost:8100              │
│  ┌─────────────────────────────┐   │
│  │ FHIR R4 API                 │   │
│  │ PostgreSQL (medplum DB)     │   │
│  │ AuditEvent logging          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Security Hardening

**Production deployment (DO App Platform):**
1. **Network isolation:** Medplum in private VPC, not internet-facing
2. **mTLS:** Holi API ↔ Medplum (certificate-based auth)
3. **Secret rotation:** OAuth credentials rotated every 90 days
4. **WAF rules:** Block all traffic except from Holi API IP ranges
5. **Rate limiting:** 1000 req/min per service account

---

## Compliance Guarantees

### HIPAA
- ✅ Encryption at rest (PostgreSQL TDE, S3 SSE-KMS)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Audit logging (all FHIR operations)
- ✅ Access controls (RBAC + consent gates)
- ✅ BAA with Medplum (open-source, self-hosted)

### GDPR / LGPD
- ✅ Right to erasure: Delete FHIR resources + revoke consent
- ✅ Data minimization: Only pseudonymous IDs in Medplum
- ✅ Purpose limitation: Consent-specific data classes
- ✅ Data portability: FHIR $everything export

### ONC 21st Century Cures (USCDI)
- ✅ FHIR R4 compliance
- ✅ Patient access API (`/fhir/R4/Patient/{id}/$everything`)
- ✅ No information blocking (patient-controlled consent)

---

## Rollout Phases

### Phase 1: Foundation (Week 1)
- [ ] Schema migration: Add `Encounter`, `Observation` models
- [ ] Enhanced `fhir-sync.ts` with retry + logging
- [ ] BullMQ job queue setup
- [ ] Prisma middleware for auto-sync

### Phase 2: Ingress (Week 2)
- [ ] FHIR ingress route (`/api/fhir/inbound`)
- [ ] HL7 → FHIR adapter (external EHR integration)
- [ ] Validation + sanitization (prevent malicious payloads)
- [ ] Integration tests

### Phase 3: UI & Export (Week 3)
- [ ] Next.js FHIR resource viewer (patient portal)
- [ ] Bundle export API (`$everything`)
- [ ] RBAC enforcement in UI
- [ ] Consent management UI

### Phase 4: Production (Week 4)
- [ ] DO App Platform deployment
- [ ] Monitoring (Prometheus, Grafana)
- [ ] PagerDuty alerts
- [ ] Load testing (1000 concurrent users)
- [ ] Runbook documentation

---

## Success Metrics (from Mission Brief)

| KPI | Target | Measurement |
|-----|--------|-------------|
| Medplum uptime | >99.9% | DO healthcheck monitoring |
| FHIR read latency | <300ms | Prometheus histogram |
| Sync lag (Holi → Medplum) | <60s | BullMQ job completion time |
| Zero unresolved sync failures | 0 | Dead letter queue depth |
| Audit log completeness | 100% | Reconciliation job (nightly) |

---

## Next Steps

1. **User Approval:** Review this design, approve or request changes
2. **Schema Migration:** Run Prisma migration to add clinical models
3. **Implementation:** Execute Phase 1 tasks from todo list

**Ready to proceed?**
