# Medplum FHIR Integration - Architecture & Runbook

**Status**: Production-Ready (Phase 3 Complete)
**Last Updated**: January 2025
**Maintainer**: Holi Labs Engineering

This document captures the privacy-preserving FHIR integration architecture using [Medplum](https://github.com/medplum/medplum) as the FHIR R4 server, aligned with Holi Labs' AEGIS principles.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core Components](#2-core-components)
3. [Privacy-Preserving FHIR Design](#3-privacy-preserving-fhir-design)
4. [Local Development Setup](#4-local-development-setup)
5. [Production Deployment](#5-production-deployment)
6. [API Documentation](#6-api-documentation)
7. [Operational Runbook](#7-operational-runbook)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Troubleshooting Guide](#9-troubleshooting-guide)
10. [Security & Compliance](#10-security--compliance)

---

## 1. Architecture Overview

### 1.1 Design Principles

**North Star**: Enable FHIR interoperability while maintaining Holi's "Data is Toxic" principle (AEGIS Law 1).

**Key Decisions**:
- **De-identified FHIR Resources**: All FHIR Patient resources contain only pseudonymous IDs, no PHI
- **Consent-Gated Access**: Every FHIR operation validates active CARE consent with required data classes
- **Encrypted Payload References**: Clinical data lives in S3 (encrypted), FHIR resources only reference URIs
- **Async Sync Pattern**: BullMQ job queue with retry logic ensures resilient sync without blocking DB operations
- **Reconciliation Loop**: Nightly job detects and repairs sync drift

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Holi API Server                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Prisma     │───▶│  Middleware  │───▶│  BullMQ      │     │
│  │  Encounter/  │    │  Auto-Sync   │    │  Job Queue   │     │
│  │  Observation │    └──────────────┘    └──────┬───────┘     │
│  └──────────────┘                                │             │
│                                                  │             │
│  ┌──────────────────────────────────────────────▼───────────┐ │
│  │            FHIR Sync Service (Enhanced)                   │ │
│  │  • OAuth2 Token Caching                                   │ │
│  │  • Exponential Backoff + Jitter                           │ │
│  │  • Consent Validation                                     │ │
│  │  • Structured Audit Logging                               │ │
│  └──────────────────────────┬────────────────────────────────┘ │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │   Medplum FHIR Server  │
                 │   (Self-Hosted)        │
                 │   • Patient            │
                 │   • Encounter          │
                 │   • Observation        │
                 └────────────────────────┘
                              ▲
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    ┌───────▼───────┐               ┌──────────▼──────────┐
    │  FHIR Ingress │               │   FHIR Export       │
    │  (External    │               │   ($everything)     │
    │   EHR → Holi) │               │   with RBAC         │
    └───────────────┘               └─────────────────────┘
```

### 1.3 Data Flow

**Outbound Sync (Holi → Medplum)**:
1. User creates/updates Encounter or Observation in Holi
2. Prisma middleware intercepts operation (non-blocking)
3. Job enqueued in BullMQ with encounter/observation data
4. Worker picks up job, validates consent
5. Maps Holi data → de-identified FHIR resource
6. Syncs to Medplum via OAuth2-authenticated PUT request
7. Updates `lastSyncedAt` timestamp in Holi DB
8. Audit event logged with correlation ID

**Inbound Ingress (External EHR → Holi)**:
1. External system POSTs FHIR resource to `/fhir/inbound/*`
2. Validates request authentication + organization membership
3. Parses FHIR resource, resolves PatientToken
4. Transforms FHIR → Holi data model
5. Creates record with `fhirSyncEnabled=false` (prevent loop)
6. Audit event logged
7. Returns Holi resource ID

**Export (Holi → User)**:
1. User requests `/fhir/export/patient/:patientTokenId/$everything`
2. Authenticates user, validates RBAC authorization
3. Checks consent for CARE purpose with required data classes
4. Fetches FHIR Bundle from Medplum
5. Applies date/resource type filters
6. Audit event logged
7. Returns filtered FHIR Bundle

---

## 2. Core Components

### 2.1 FHIR Sync Service (`fhir-sync-enhanced.ts`)

**Purpose**: Production-grade FHIR sync with resilience patterns

**Key Features**:
- **Exponential Backoff**: 1s → 10s max with ±25% jitter
- **OAuth2 Token Caching**: Reuses tokens until 60s before expiry
- **Consent Enforcement**: Validates CARE consent + data class authorization
- **Correlation IDs**: Distributed tracing across all operations
- **Structured Logging**: JSON logs with timestamp, level, service, context

**Functions**:
```typescript
syncPatientToFhir(data: PatientSyncData): Promise<Patient>
syncEncounterToFhir(data: EncounterSyncData): Promise<Encounter>
syncObservationToFhir(data: ObservationSyncData): Promise<Observation>
fetchPatientEverything(patientTokenId: string): Promise<Bundle>
```

**Environment Variables**:
- `MEDPLUM_BASE_URL`: Medplum server URL
- `MEDPLUM_CLIENT_ID`: OAuth2 client ID
- `MEDPLUM_CLIENT_SECRET`: OAuth2 client secret
- `MEDPLUM_PROJECT_ID`: Medplum project ID

### 2.2 BullMQ Job Queue (`fhir-queue.ts`)

**Purpose**: Async FHIR sync with retry logic and observability

**Configuration**:
```typescript
{
  concurrency: 5,              // 5 parallel workers
  rateLimit: {
    max: 10,                   // 10 jobs per second
    duration: 1000
  },
  attempts: 3,                 // Retry failed jobs 3x
  backoff: {
    type: 'exponential',
    delay: 1000                // 1s → 2s → 4s
  },
  retention: {
    completed: 7 days,
    failed: 30 days
  }
}
```

**Job Types**:
- `encounter-sync`: Sync Encounter to Medplum
- `observation-sync`: Sync Observation to Medplum

**Functions**:
```typescript
initFhirQueue(prisma: PrismaClient): Promise<void>
shutdownFhirQueue(): Promise<void>
enqueueEncounterSync(data): Promise<Job>
enqueueObservationSync(data): Promise<Job>
getQueueStats(): Promise<QueueStats>
getFailedJobs(limit: number): Promise<Job[]>
retryFailedJob(jobId: string): Promise<void>
cleanOldJobs(): Promise<void>
pauseQueue(): Promise<void>
resumeQueue(): Promise<void>
```

### 2.3 Prisma Middleware (`prisma-fhir-middleware.ts`)

**Purpose**: Auto-sync Holi DB changes to Medplum

**Trigger Events**:
- `encounter.create` → enqueue sync job
- `encounter.update` → enqueue sync job
- `observation.create` → enqueue sync job
- `observation.update` → enqueue sync job

**Behavior**:
- Non-blocking (doesn't fail original DB operation)
- Only syncs if `fhirSyncEnabled=true`
- Skips if `ENABLE_MEDPLUM=false`

**Usage**:
```typescript
import { registerFhirSyncMiddleware } from './lib/prisma-fhir-middleware';
registerFhirSyncMiddleware(prisma);
```

### 2.4 Reconciliation Service (`fhir-reconciliation.ts`)

**Purpose**: Detect and repair sync drift

**Detection Logic**:
- **Never Synced**: `lastSyncedAt IS NULL`
- **Stale**: `updatedAt > lastSyncedAt + staleDays`

**Reconciliation Result**:
```typescript
{
  startTime: Date,
  endTime: Date,
  durationMs: number,
  encounters: {
    total: number,
    notSynced: number,
    stale: number,
    enqueued: number,
    errors: number
  },
  observations: { /* same structure */ },
  errors: string[]
}
```

**Functions**:
```typescript
runReconciliation(prisma, options): Promise<ReconciliationResult>
getReconciliationStats(prisma, orgId?): Promise<Stats>
getReconciliationHistory(prisma, limit): Promise<History[]>
```

**Recommended Schedule**: Nightly at 3 AM via CRON job

### 2.5 Environment Validation (`env-validation.ts`)

**Purpose**: Fail-fast startup with comprehensive validation

**Validation Layers**:
1. **Core Config**: DATABASE_URL, REDIS_URL, JWT_SECRET, S3 config
2. **Medplum Config** (if `ENABLE_MEDPLUM=true`): URLs, credentials, project ID
3. **Optional Services**: Email, Twilio, AI services (non-blocking warnings)
4. **Production Checks**: Detects placeholder secrets, localhost URLs

**Usage**:
```typescript
import { env } from './lib/env-validation';
// Access validated, typed environment variables
console.log(env.MEDPLUM_BASE_URL);
```

### 2.6 Audit Mirror Service (`fhir-audit-mirror.ts`)

**Purpose**: Bidirectional audit trail synchronization

**Key Features**:
- **Incremental Sync**: Fetches only new AuditEvents since last run
- **De-duplication**: Checks for existing events via `fhirAuditEventId`
- **Organization Extraction**: Parses org ID from FHIR extensions or entity references
- **Action Mapping**: C/R/U/D/E → FHIR_CREATE/READ/UPDATE/DELETE/EXECUTE
- **Structured Logging**: Correlation IDs for distributed tracing

**Mirror Result**:
```typescript
{
  startTime: Date,
  endTime: Date,
  durationMs: number,
  fetched: number,      // Total AuditEvents fetched from Medplum
  mirrored: number,     // New events created in Holi
  skipped: number,      // Duplicates skipped
  errors: number,       // Failed to mirror
  lastSyncedAt: Date    // Most recent audit event timestamp
}
```

**Functions**:
```typescript
runAuditMirror(prisma, options): Promise<MirrorResult>
getAuditMirrorStats(prisma): Promise<Stats>
searchMirroredAuditEvents(prisma, options): Promise<Event[]>
```

**Recommended Schedule**: Nightly at 4 AM via CRON job (after reconciliation)

**Audit Event Mapping**:
- **Source**: `medplum` (stored in `payload.source`)
- **Event Types**: Maps FHIR action codes to Holi event types
- **Payload**: Includes agent info, source info, entities, outcome
- **Organization**: Extracted from extensions or entity references

---

## 3. Privacy-Preserving FHIR Design

### 3.1 De-identified FHIR Patient

**Holi Model**: PatientToken (pseudonymous)

**FHIR Mapping**:
```json
{
  "resourceType": "Patient",
  "id": "pt_abc123",
  "identifier": [{
    "system": "https://holilabs.xyz/patient-token",
    "value": "pt_abc123"
  }],
  "name": [{
    "text": "Patient [ABC]",
    "family": "***",
    "given": ["***"]
  }],
  "telecom": [],
  "address": [],
  "birthDate": null,
  "extension": [{
    "url": "https://holilabs.xyz/fhir/encrypted-payload",
    "valueReference": {
      "reference": "s3://bucket/path/to/encrypted/data"
    }
  }]
}
```

**Key Points**:
- No PHI (name, DOB, address, phone, email)
- Only pseudonymous ID (`pt_abc123`)
- Clinical data reference in S3 (encrypted at rest)
- Consent-gated access to decrypt payload

### 3.2 Consent Enforcement

**Required for ALL FHIR Operations**:
```typescript
const consent = await prisma.consent.findFirst({
  where: {
    patientTokenId,
    orgId,
    purpose: 'CARE',
    state: 'ACTIVE'
  }
});

// Check data class authorization
const hasConsent = consent.dataClasses.includes(dataClass);
```

**Required Data Classes for Export**:
- `CLINICAL_NOTES`
- `LAB_RESULTS`
- `MEDICATIONS`

**Consent Revocation**: Immediately blocks all FHIR sync/export operations

### 3.3 Audit Trail

**All FHIR Operations Logged**:
```typescript
await prisma.auditEvent.create({
  data: {
    orgId,
    eventType: 'FHIR_SYNC' | 'FHIR_INGRESS' | 'FHIR_EXPORT' | 'FHIR_RECONCILIATION',
    payload: {
      correlationId,
      resourceType,
      resourceId,
      userId,
      userRole,
      timestamp
    }
  }
});
```

**Audit Event Types**:
- `FHIR_SYNC`: Encounter/Observation synced to Medplum
- `FHIR_INGRESS`: External FHIR resource ingested
- `FHIR_EXPORT`: User exported FHIR Bundle
- `FHIR_RECONCILIATION`: Nightly reconciliation run

**Retention**: Stored in `audit.audit_events` table, retained per compliance policy (7 years typical)

---

## 4. Local Development Setup

### 4.1 Prerequisites

```bash
- Docker Desktop
- Node.js 20+
- pnpm
- PostgreSQL 15+ (via Docker)
- Redis 7+ (via Docker)
```

### 4.2 Start Infrastructure

```bash
# Start all services (Postgres, Redis, Medplum, MinIO)
pnpm docker:up

# Verify Medplum health
curl http://localhost:8103/healthcheck
```

### 4.3 Environment Variables

Create `apps/api/.env`:

```env
# Core
NODE_ENV=development
DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public&sslmode=disable"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="dev_jwt_secret_32_chars_long!!!!"
NEXTAUTH_SECRET="dev_nextauth_secret_32_chars!!!"
NEXTAUTH_URL="http://localhost:3000"

# S3/MinIO
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_NAME="holi-dev"
S3_REGION="us-east-1"

# FHIR (Medplum)
ENABLE_MEDPLUM=true
MEDPLUM_BASE_URL="http://localhost:8103"
MEDPLUM_CLIENT_ID="holi-service-client"
MEDPLUM_CLIENT_SECRET="super-secure-dev-secret"
MEDPLUM_PROJECT_ID="holi-labs-dev"
```

### 4.4 Database Migration

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 4.5 Start API Server

```bash
cd apps/api
pnpm dev
```

**Expected Output**:
```
🚀 Starting Holi API Server...
📦 Environment: development
🔧 FHIR Sync: ENABLED
✅ Medplum configuration validated
✅ Core environment validation passed
✅ API server listening on http://0.0.0.0:3001
```

### 4.6 Verify FHIR Integration

```bash
# Health check (includes queue stats)
curl http://localhost:3001/health

# FHIR admin health
curl http://localhost:3001/fhir/admin/health

# Queue stats (requires auth headers)
curl -H "Authorization: Bearer test" \
     -H "X-User-ID: user_test" \
     -H "X-Org-ID: org_test" \
     http://localhost:3001/fhir/admin/queue/stats
```

---

## 5. Production Deployment

### 5.1 Infrastructure Requirements

**Medplum Server**:
- **Compute**: 2 vCPU, 4GB RAM minimum (recommend 4 vCPU, 8GB for prod)
- **Database**: Managed PostgreSQL 15+ (separate `medplum` database)
- **Storage**: Persistent volume for uploads (if not using S3)
- **Network**: TLS certificate, private VPC

**Holi API**:
- **Redis**: Managed Redis 7+ (required for BullMQ)
- **Postgres**: Add FHIR tables via Prisma migration

### 5.2 Environment Variables (Production)

```env
# Enable FHIR
ENABLE_MEDPLUM=true

# Medplum (use production Medplum instance)
MEDPLUM_BASE_URL="https://medplum.holilabs.com"
MEDPLUM_CLIENT_ID="holi-prod-client"
MEDPLUM_CLIENT_SECRET="[ROTATE_MONTHLY]"
MEDPLUM_PROJECT_ID="holi-labs-prod"

# CRON Protection (for reconciliation endpoint)
CRON_SECRET="[64_HEX_CHARS]"

# Generate secrets:
# openssl rand -hex 32
```

### 5.3 Deployment Steps

#### Step 1: Deploy Medplum

**Option A: DigitalOcean App Platform**

1. Create new App: `medplum-prod`
2. Use Docker Hub image: `medplum/medplum-server:latest`
3. Environment variables:
   ```
   DATABASE_URL=postgresql://[managed_db]
   MEDPLUM_BASE_URL=https://medplum.holilabs.com
   ```
4. Expose port `8103`
5. Configure custom domain + TLS

**Option B: Docker Compose (Droplet)**

```bash
# On production server
git clone https://github.com/HolisticHealthcareLabs/holilabs.git
cd infra/docker
docker-compose -f docker-compose.prod.yml up -d medplum
```

#### Step 2: Create Medplum OAuth Client

1. Login to Medplum: `https://medplum.holilabs.com`
2. Navigate to: Project Settings → Clients
3. Create new Client:
   - Name: `holi-api-prod`
   - Type: `Client Credentials`
   - Scopes: `system/*.read`, `system/*.write`
4. Save `client_id` and `client_secret` to DO secrets

#### Step 3: Update Holi API

```bash
# Add environment variables to DO App Platform
doctl apps update [app-id] --spec .do/app.yaml

# Run Prisma migration
doctl apps run [app-id] --component api -- pnpm prisma migrate deploy
```

#### Step 4: Initial Bulk Sync

```bash
# Sync existing encounters (one-time)
curl -X POST https://api.holilabs.com/fhir/admin/bulk-sync/encounters \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "X-User-ID: admin_user" \
  -H "X-Org-ID: org_prod" \
  -d '{"orgId": "org_prod", "limit": 5000}'

# Sync existing observations
curl -X POST https://api.holilabs.com/fhir/admin/bulk-sync/observations \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "X-User-ID: admin_user" \
  -H "X-Org-ID: org_prod" \
  -d '{"orgId": "org_prod", "limit": 10000}'
```

#### Step 5: Setup CRON Jobs

**5A. Nightly Reconciliation**

**Using GitHub Actions** (Recommended):

`.github/workflows/fhir-reconciliation.yml`:
```yaml
name: FHIR Nightly Reconciliation

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily

jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reconciliation
        run: |
          curl -X POST https://api.holilabs.com/fhir/admin/reconciliation/cron \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            -d '{"staleDays": 1, "batchSize": 1000}'
```

**Using DigitalOcean Functions**:
```bash
doctl serverless deploy --trigger scheduled --cron "0 3 * * *"
```

**5B. Nightly Audit Mirror**

**Using GitHub Actions** (Recommended):

`.github/workflows/fhir-audit-mirror.yml`:
```yaml
name: FHIR Nightly Audit Mirror

on:
  schedule:
    - cron: '0 4 * * *'  # 4 AM daily (after reconciliation)

jobs:
  audit-mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Audit Mirror
        run: |
          curl -X POST https://api.holilabs.com/fhir/admin/audit-mirror/cron \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            -d '{"limit": 1000}'
```

**Using DigitalOcean Functions**:
```bash
doctl serverless deploy --trigger scheduled --cron "0 4 * * *"
```

#### Step 6: Verify Production

```bash
# Health check
curl https://api.holilabs.com/health

# Medplum health
curl https://medplum.holilabs.com/healthcheck

# Queue stats
curl -H "Authorization: Bearer [TOKEN]" \
     https://api.holilabs.com/fhir/admin/queue/stats
```

---

## 6. API Documentation

### 6.1 FHIR Ingress Endpoints

#### POST `/fhir/inbound/observation`

Ingest single FHIR Observation from external EHR.

**Request**:
```http
POST /fhir/inbound/observation
Authorization: Bearer [token]
X-Org-ID: org_abc123
Content-Type: application/fhir+json

{
  "resourceType": "Observation",
  "id": "obs_external_123",
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "8310-5",
      "display": "Body temperature"
    }]
  },
  "subject": {
    "reference": "Patient/pt_abc123"
  },
  "effectiveDateTime": "2024-01-15T10:00:00Z",
  "valueQuantity": {
    "value": 37.2,
    "unit": "Cel"
  }
}
```

**Response** (`201 Created`):
```json
{
  "success": true,
  "resourceType": "Observation",
  "id": "obs_holi_xyz789"
}
```

#### POST `/fhir/inbound/encounter`

Ingest single FHIR Encounter from external EHR.

**Request**: Similar to Observation, see `fhir-ingress.ts`

#### POST `/fhir/inbound/batch`

Batch ingest FHIR Bundle (multiple resources).

**Request**:
```http
POST /fhir/inbound/batch
Authorization: Bearer [token]
X-Org-ID: org_abc123
Content-Type: application/fhir+json

{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    { "resource": { /* Encounter */ } },
    { "resource": { /* Observation */ } }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "results": [
    { "resourceType": "Encounter", "id": "enc_123", "success": true },
    { "resourceType": "Observation", "id": "obs_456", "success": true }
  ]
}
```

### 6.2 FHIR Export Endpoints

#### GET `/fhir/export/patient/:patientTokenId/$everything`

Export comprehensive FHIR Bundle for patient (FHIR `$everything` operation).

**Authorization**: Requires RBAC check + consent validation.

**Query Parameters**:
- `start` (optional): ISO 8601 date, filter resources after this date
- `end` (optional): ISO 8601 date, filter resources before this date
- `type` (optional): Resource type filter (e.g., `Observation`, `Encounter`)

**Request**:
```http
GET /fhir/export/patient/pt_abc123/$everything?start=2024-01-01&type=Observation
Authorization: Bearer [token]
X-User-ID: user_123
X-Org-ID: org_abc
X-Role: CLINICIAN
```

**Response** (`200 OK`):
```http
Content-Type: application/fhir+json

{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 15,
  "entry": [
    { "resource": { "resourceType": "Patient", ... } },
    { "resource": { "resourceType": "Observation", ... } },
    ...
  ]
}
```

**RBAC Rules**:
- **ADMIN**: Access all patients in org
- **PATIENT**: Access only own data
- **CLINICIAN**: Access patients with active encounter
- **RESEARCHER**: Denied (use de-identified bulk export)

#### GET `/fhir/export/exports`

List recent export operations (audit trail).

**Response**:
```json
{
  "success": true,
  "count": 10,
  "exports": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "correlationId": "export-abc123",
      "userId": "user_123",
      "patientTokenId": "pt_abc",
      "resourceCount": 15
    }
  ]
}
```

### 6.3 FHIR Admin Endpoints

#### GET `/fhir/admin/queue/stats`

Real-time queue metrics.

**Response**:
```json
{
  "success": true,
  "stats": {
    "waiting": 0,
    "active": 2,
    "completed": 15234,
    "failed": 12,
    "delayed": 0,
    "paused": 0
  }
}
```

#### GET `/fhir/admin/queue/failed`

Inspect failed jobs.

**Query**: `?limit=50`

**Response**:
```json
{
  "success": true,
  "count": 2,
  "jobs": [
    {
      "id": "job_123",
      "name": "encounter-sync",
      "data": { "encounterId": "enc_abc" },
      "failedReason": "Medplum connection timeout",
      "attemptsMade": 3,
      "timestamp": "2024-01-15T09:00:00Z"
    }
  ]
}
```

#### POST `/fhir/admin/queue/retry/:jobId`

Manually retry failed job.

#### POST `/fhir/admin/queue/clean`

Clean old completed/failed jobs.

#### POST `/fhir/admin/queue/pause` / `POST /fhir/admin/queue/resume`

Pause/resume queue for maintenance.

#### GET `/fhir/admin/reconciliation/stats`

Sync health metrics.

**Response**:
```json
{
  "success": true,
  "stats": {
    "encounters": {
      "total": 1000,
      "synced": 950,
      "notSynced": 30,
      "stale": 20
    },
    "observations": {
      "total": 5000,
      "synced": 4850,
      "notSynced": 100,
      "stale": 50
    }
  }
}
```

#### GET `/fhir/admin/reconciliation/history`

Past reconciliation runs.

#### POST `/fhir/admin/reconciliation/run`

Manually trigger reconciliation.

#### POST `/fhir/admin/reconciliation/cron`

**CRON-protected** automated reconciliation endpoint.

**Headers**: `X-Cron-Secret: [64_HEX_CHARS]`

#### GET `/fhir/admin/audit-mirror/stats`

Get audit mirror statistics.

**Response**:
```json
{
  "success": true,
  "stats": {
    "lastRun": "2024-01-15T03:00:00Z",
    "lastSyncedAt": "2024-01-15T02:59:45Z",
    "totalMirrored": 15234,
    "recentRuns": [
      {
        "timestamp": "2024-01-15T03:00:00Z",
        "mirrored": 145,
        "skipped": 12,
        "errors": 0
      }
    ]
  }
}
```

#### POST `/fhir/admin/audit-mirror/run`

Manually trigger audit mirror sync.

**Request Body**:
```json
{
  "limit": 1000,
  "forceSince": "2024-01-01T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T10:01:23Z",
    "durationMs": 83000,
    "fetched": 450,
    "mirrored": 438,
    "skipped": 12,
    "errors": 0,
    "lastSyncedAt": "2024-01-15T09:59:45Z"
  }
}
```

#### POST `/fhir/admin/audit-mirror/cron`

**CRON-protected** automated audit mirror endpoint.

**Headers**: `X-Cron-Secret: [64_HEX_CHARS]`

**Request Body**: Same as `/audit-mirror/run`

#### GET `/fhir/admin/audit-mirror/search`

Search mirrored audit events with filters.

**Query Parameters**:
- `orgId` (optional): Filter by organization ID
- `eventTypes` (optional): Comma-separated list (e.g., `FHIR_CREATE,FHIR_UPDATE`)
- `since` (optional): ISO 8601 date
- `until` (optional): ISO 8601 date
- `agentReference` (optional): Filter by agent who reference (e.g., `Practitioner/prac_123`)
- `entityReference` (optional): Filter by entity reference (e.g., `Patient/pt_abc`)
- `limit` (optional): Max results (default 100)

**Response**:
```json
{
  "success": true,
  "count": 25,
  "events": [
    {
      "id": "audit_xyz789",
      "ts": "2024-01-15T10:00:00Z",
      "eventType": "FHIR_UPDATE",
      "orgId": "org_abc123",
      "action": "U",
      "outcome": "0",
      "agent": {
        "type": "humanuser",
        "who": "Practitioner/prac_123",
        "name": "Dr. Smith",
        "requestor": true
      },
      "entities": [
        {
          "what": "Patient/pt_abc",
          "type": "1",
          "role": "1",
          "lifecycle": "2"
        }
      ]
    }
  ]
}
```

---

## 7. Operational Runbook

### 7.1 Daily Operations

**Morning Check (9 AM)**:
```bash
# 1. Check queue health
curl https://api.holilabs.com/fhir/admin/queue/stats

# 2. Review failed jobs (should be near 0)
curl https://api.holilabs.com/fhir/admin/queue/failed?limit=10

# 3. Check reconciliation stats
curl https://api.holilabs.com/fhir/admin/reconciliation/stats

# 4. Check audit mirror stats
curl https://api.holilabs.com/fhir/admin/audit-mirror/stats
```

**Expected Healthy State**:
- Failed jobs: < 5
- Not synced: < 50 (catches up via reconciliation)
- Stale: < 20
- Audit mirror: Last run within 24h, errors = 0

### 7.2 Incident Response

#### Scenario 1: High Failed Job Count (>50)

**Symptoms**: `/queue/stats` shows `failed > 50`

**Diagnosis**:
```bash
# Check failed jobs
curl https://api.holilabs.com/fhir/admin/queue/failed?limit=50

# Common causes:
# - Medplum server down
# - Network connectivity issues
# - Invalid FHIR data
# - Consent issues
```

**Resolution**:
```bash
# 1. Verify Medplum health
curl https://medplum.holilabs.com/healthcheck

# 2. Check Medplum logs
docker logs medplum-server --tail 100

# 3. If transient issue, retry all failed jobs
for jobId in $(curl .../queue/failed | jq -r '.jobs[].id'); do
  curl -X POST .../queue/retry/$jobId
done

# 4. If persistent, pause queue and investigate
curl -X POST .../queue/pause
```

#### Scenario 2: Sync Drift Detected

**Symptoms**: `/reconciliation/stats` shows high `notSynced` or `stale` counts

**Diagnosis**:
```bash
# Check reconciliation history
curl https://api.holilabs.com/fhir/admin/reconciliation/history?limit=5

# Verify recent reconciliation runs succeeded
```

**Resolution**:
```bash
# 1. Manually trigger reconciliation
curl -X POST https://api.holilabs.com/fhir/admin/reconciliation/run \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"batchSize": 2000, "staleDays": 1}'

# 2. Monitor queue to see jobs being processed
watch -n 5 'curl .../queue/stats'

# 3. If large backlog, increase batch size
curl -X POST .../reconciliation/run \
  -d '{"batchSize": 5000}'
```

#### Scenario 3: Medplum Server Down

**Symptoms**: All sync jobs failing, health check timeout

**Diagnosis**:
```bash
# Check Medplum health
curl https://medplum.holilabs.com/healthcheck

# Check container status
docker ps | grep medplum
```

**Resolution**:
```bash
# 1. Pause Holi queue (prevent job spam)
curl -X POST .../queue/pause

# 2. Restart Medplum
docker restart medplum-server

# 3. Verify health
curl https://medplum.holilabs.com/healthcheck

# 4. Resume queue
curl -X POST .../queue/resume

# 5. Clean old failed jobs
curl -X POST .../queue/clean
```

### 7.3 Planned Maintenance

**Before Maintenance**:
```bash
# 1. Pause queue
curl -X POST .../queue/pause

# 2. Wait for active jobs to complete (max 2 min)
watch -n 10 'curl .../queue/stats | jq .stats.active'

# 3. Perform maintenance (Medplum upgrade, DB migration, etc.)
```

**After Maintenance**:
```bash
# 1. Verify health
curl https://medplum.holilabs.com/healthcheck

# 2. Resume queue
curl -X POST .../queue/resume

# 3. Monitor for 10 minutes
watch -n 30 'curl .../queue/stats'

# 4. Trigger reconciliation (catch up any missed syncs)
curl -X POST .../reconciliation/run
```

### 7.4 Backup & Disaster Recovery

**Medplum Backup**:
```bash
# Backup Medplum database (daily via cron)
pg_dump -h medplum-db-host -U medplum medplum > medplum_backup_$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp medplum_backup_*.sql s3://holi-backups/medplum/
```

**Restore Procedure**:
```bash
# 1. Stop Medplum
docker stop medplum-server

# 2. Restore database
psql -h medplum-db-host -U medplum medplum < medplum_backup_20240115.sql

# 3. Restart Medplum
docker start medplum-server

# 4. Verify data
curl https://medplum.holilabs.com/fhir/R4/Patient?_count=10

# 5. Run reconciliation to sync any gaps
curl -X POST .../reconciliation/run
```

---

## 8. Monitoring & Alerting

Production-grade observability with Prometheus metrics, Grafana dashboards, and PagerDuty alerting.

### 8.1 Monitoring Architecture

```
Holi API (/metrics) → Prometheus (scrape 15s) → Grafana (visualize)
                                                ↓
                                          Alertmanager → PagerDuty
                                                       → Slack
                                                       → Email
```

### 8.2 Metrics Endpoints

#### GET `/metrics`

Prometheus-format metrics endpoint (scraped every 15 seconds).

**Key Metric Categories**:
- HTTP request metrics (rate, latency, errors)
- Queue health metrics (BullMQ)
- FHIR sync health metrics (drift detection)
- HIPAA audit metrics (compliance tracking)
- Database connection metrics
- Node.js process metrics (memory, CPU)

**Example Output**:
```
# HELP holi_queue_jobs_active Number of active jobs in the queue
# TYPE holi_queue_jobs_active gauge
holi_queue_jobs_active{queue_name="fhir-sync"} 3

# HELP holi_fhir_sync_not_synced Number of resources that have never been synced
# TYPE holi_fhir_sync_not_synced gauge
holi_fhir_sync_not_synced{resource_type="Encounter"} 12
holi_fhir_sync_not_synced{resource_type="Observation"} 45

# HELP holi_http_request_duration_seconds HTTP request duration in seconds
# TYPE holi_http_request_duration_seconds histogram
holi_http_request_duration_seconds_bucket{method="GET",route="/fhir/export/patient/:id",status_code="200",le="0.1"} 234
holi_http_request_duration_seconds_bucket{method="GET",route="/fhir/export/patient/:id",status_code="200",le="0.3"} 456
```

#### GET `/metrics/json`

JSON-format metrics (for debugging).

#### GET `/health`, `/health/ready`, `/health/live`, `/health/startup`

Kubernetes-style health check endpoints.

**Health Check Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "medplum": "healthy"
  }
}
```

### 8.3 Key Metrics Reference

#### Queue Metrics

| Metric | Type | Labels | Description | Alert Threshold |
|--------|------|--------|-------------|-----------------|
| `holi_queue_jobs_active` | Gauge | `queue_name` | Active jobs | - |
| `holi_queue_jobs_waiting` | Gauge | `queue_name` | Waiting jobs | >100 (P2) |
| `holi_queue_jobs_failed` | Gauge | `queue_name` | Failed jobs | >10 (P2) |
| `holi_queue_job_duration_seconds` | Histogram | `queue_name`, `job_type` | Job processing time | p95 >10s (P4) |
| `holi_queue_job_errors_total` | Counter | `queue_name`, `error_type` | Job error count | rate >5/min (P2) |

#### FHIR Sync Metrics

| Metric | Type | Labels | Description | Alert Threshold |
|--------|------|--------|-------------|-----------------|
| `holi_fhir_sync_operations_total` | Counter | `resource_type`, `operation`, `status` | Sync operations | - |
| `holi_fhir_sync_duration_seconds` | Histogram | `resource_type`, `operation` | Sync duration | p95 >5s (P4) |
| `holi_fhir_sync_errors_total` | Counter | `resource_type`, `error_type` | Sync errors | rate >5/min (P2) |
| `holi_fhir_sync_not_synced` | Gauge | `resource_type` | Never synced count | >100 (P3) |
| `holi_fhir_sync_stale` | Gauge | `resource_type` | Stale sync (>1h) | >50 (P3) |

#### HIPAA Audit Metrics

| Metric | Type | Labels | Description | Alert Threshold |
|--------|------|--------|-------------|-----------------|
| `holi_hipaa_audit_events_total` | Counter | `event_type`, `org_id` | Audit events logged | - |
| `holi_hipaa_phi_access_total` | Counter | `user_role`, `access_type`, `org_id` | PHI access events | - |
| `holi_hipaa_consent_validations_total` | Counter | `status`, `org_id` | Consent validations | rate(denied) >5/min (P1) |

#### HTTP Metrics

| Metric | Type | Labels | Description | Alert Threshold |
|--------|------|--------|-------------|-----------------|
| `holi_http_requests_total` | Counter | `method`, `route`, `status_code` | HTTP requests | - |
| `holi_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency | p95 >300ms (P2) |
| `holi_http_request_errors_total` | Counter | `method`, `route`, `error_type` | HTTP errors | rate(5xx) >5% (P2) |

### 8.4 Alert Rules

Production alerts are configured in **4 severity levels** (P1-P4):

#### P1 - Critical (Immediate Response)

- **API Server Down**: `up{job="holi-api"} == 0` for 2m
- **Database Connection Failure**: `holi_database_connections_active == 0` for 1m
- **Redis Queue Down**: Queue metrics absent for 2m
- **HIPAA Audit Log Failure**: Audit write errors >0.1/s for 2m
- **Unauthorized PHI Access**: >5 denied consent validations/min for 1m

**Escalation**: PagerDuty (immediate) + Slack (#alerts-critical) + Email (oncall@holilabs.xyz)

#### P2 - High Priority (30min Response)

- **Excessive Queue Failures**: >10 failed jobs for 5m
- **High Queue Backlog**: >100 waiting jobs for 5m
- **FHIR Sync Error Spike**: >5 errors/min for 5m
- **High API Error Rate**: >5% 5xx errors for 3m
- **Slow API Response**: p95 latency >300ms for 5m

**Escalation**: PagerDuty (30min SLA) + Slack (#engineering-alerts)

#### P3 - Medium Priority (2h Response)

- **Unsynced FHIR Resources**: >100 resources never synced for 10m
- **Stale FHIR Resources**: >50 resources stale (>1h) for 15m
- **Reconciliation Failures**: Any reconciliation failure in past hour
- **Audit Mirror Failures**: Any audit mirror failure in past hour
- **High Memory Usage**: >85% memory usage for 10m
- **Database Pool Saturation**: >15 active connections for 5m

**Escalation**: Slack (#engineering-alerts) + Email (platform@holilabs.xyz)

#### P4 - Low Priority (24h Response)

- **Queue Processing Slow**: p95 job duration >10s for 30m
- **FHIR Sync Duration Increase**: p95 sync time >5s for 30m

**Escalation**: Email (platform@holilabs.xyz)

Full alert definitions: [`infra/monitoring/alerts/fhir-alerts.yml`](../infra/monitoring/alerts/fhir-alerts.yml)

### 8.5 Grafana Dashboard

Pre-configured dashboard with **21 panels**:

**Row 1: System Health**
- System health overview (API, Database, Queue status)

**Row 2: API Performance**
- HTTP request rate (requests/min by method)
- HTTP response time (p50, p95 by route)

**Row 3: Queue Health**
- Active jobs (active, waiting)
- Failed jobs (count, error rate)
- Job duration (p95 by job type)

**Row 4: FHIR Sync Health**
- Not synced resources (Encounter, Observation)
- Stale resources (>1h old)
- Sync operations rate (success/failure)

**Row 5: FHIR Sync Performance**
- Sync duration (p95 by resource type)
- Sync error rate (by error type)

**Row 6: Reconciliation**
- Reconciliation runs (success/failure)
- Reconciliation duration (p50, p95)

**Row 7: Audit Mirror**
- Audit events processed (mirrored, skipped, errors)
- Audit mirror duration

**Row 8: HIPAA Compliance**
- Audit events by type
- PHI access events by role
- Consent validations (granted/denied/missing)

**Row 9: Database**
- Active connections
- Query duration (p95)

**Row 10: FHIR Operations**
- Operations by type ($everything, $search, etc.)

**Access**: `http://localhost:3001` (local) or `https://grafana.holilabs.xyz` (production)

**Import**: Upload `infra/monitoring/grafana-dashboard.json` via Grafana UI.

### 8.6 PagerDuty Integration

#### Escalation Policies

**HIPAA Critical Incidents**:
1. On-call Security Lead (immediate)
2. CISO (after 5 minutes)
3. CTO (after 10 minutes)

**Infrastructure Critical**:
1. On-call Platform Team (immediate)
2. Platform Lead (after 15 minutes)

**FHIR Integration Alerts**:
1. On-call Backend Team (immediate)
2. Backend Lead (after 30 minutes)

#### Configuration

1. Create PagerDuty services for each escalation policy
2. Add Prometheus integration to each service
3. Copy integration keys
4. Set environment variables in Alertmanager:

```bash
export PAGERDUTY_SERVICE_KEY_CRITICAL="your-key-here"
export PAGERDUTY_SERVICE_KEY_HIPAA="your-key-here"
export PAGERDUTY_SERVICE_KEY_HIGH="your-key-here"
```

5. Deploy Alertmanager with `infra/monitoring/alertmanager.yml`

### 8.7 Slack Integration

Create webhooks for channels:
- `#alerts-critical` (P1 alerts)
- `#compliance-alerts` (HIPAA incidents)
- `#engineering-alerts` (P2/P3 alerts)
- `#fhir-integration` (FHIR-specific alerts)
- `#database-alerts` (Database issues)

Configure webhook URL in Alertmanager:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 8.8 Monitoring Setup

#### Local Development

```bash
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

Access:
- Grafana: `http://localhost:3001` (admin/admin)
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`

#### Production Deployment

See comprehensive guide: [`infra/monitoring/README.md`](../infra/monitoring/README.md)

**Quick Steps**:
1. Deploy Prometheus (scrape API `/metrics` endpoint every 15s)
2. Deploy Alertmanager (route alerts to PagerDuty/Slack/Email)
3. Import Grafana dashboard from JSON
4. Configure PagerDuty integration keys
5. Set up Slack webhooks
6. Verify alert delivery with test alert

### 8.9 Daily Monitoring Checklist

**Morning Review** (5 minutes):

```bash
# 1. Check Grafana dashboard
open https://grafana.holilabs.xyz/d/holi-fhir-monitoring

# 2. Check queue health
curl https://api.holilabs.com/fhir/admin/queue/stats | jq

# 3. Check sync health
curl https://api.holilabs.com/fhir/admin/reconciliation/stats | jq

# 4. Check audit mirror stats
curl https://api.holilabs.com/fhir/admin/audit-mirror/stats | jq

# 5. Review PagerDuty incidents
open https://holilabs.pagerduty.com/incidents
```

**Thresholds for Investigation**:
- Failed jobs >5
- Not synced count >50
- Stale count >20
- Any reconciliation failures
- Any audit mirror errors

---

## 9. Troubleshooting Guide

### 9.1 Common Issues

#### Issue: "FHIR sync disabled"

**Cause**: `ENABLE_MEDPLUM=false` or missing Medplum config

**Fix**:
```bash
# Verify env variables
echo $ENABLE_MEDPLUM  # Should be 'true'
echo $MEDPLUM_BASE_URL  # Should be valid URL

# Restart API server
doctl apps restart [app-id]
```

#### Issue: "Patient token not found" in ingress

**Cause**: External system using wrong PatientToken ID

**Fix**:
- Verify PatientToken exists: `SELECT * FROM patient_tokens WHERE id = 'pt_xyz'`
- Check X-Org-ID matches patient's org
- Ensure external system using correct patient mapping

#### Issue: "Consent not granted" in export

**Cause**: Patient hasn't granted CARE consent or missing data classes

**Fix**:
```sql
-- Check consent
SELECT * FROM consents
WHERE patient_token_id = 'pt_xyz'
  AND purpose = 'CARE'
  AND state = 'ACTIVE';

-- Verify data classes
-- Should include: CLINICAL_NOTES, LAB_RESULTS, MEDICATIONS
```

#### Issue: "OAuth2 authentication failed"

**Cause**: Invalid Medplum credentials or expired client secret

**Fix**:
- Verify credentials in Medplum admin: Project Settings → Clients
- Check `MEDPLUM_CLIENT_SECRET` is current (rotate if expired)
- Test OAuth2 flow:
  ```bash
  curl -X POST https://medplum.holilabs.com/oauth2/token \
    -d "grant_type=client_credentials" \
    -d "client_id=$MEDPLUM_CLIENT_ID" \
    -d "client_secret=$MEDPLUM_CLIENT_SECRET"
  ```

#### Issue: Jobs stuck in "active" state

**Cause**: Worker crashed mid-job

**Fix**:
```bash
# 1. Restart API server (workers restart)
doctl apps restart [app-id]

# 2. If persists, manually move stuck jobs
# Connect to Redis
redis-cli -h [redis-host]

# Find stuck jobs
LRANGE bull:fhir-sync:active 0 -1

# Move to failed (will retry)
# This requires BullMQ admin tool or manual Redis commands
```

### 9.2 Debug Logging

**Enable Verbose Logging**:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

**View Structured Logs**:
```bash
# Filter by service
docker logs holi-api | jq 'select(.service == "fhir-sync")'

# Filter by correlation ID
docker logs holi-api | jq 'select(.correlationId == "sync-abc123")'

# Filter by error level
docker logs holi-api | jq 'select(.level == "error")'
```

### 9.3 Performance Issues

**High Queue Latency (>5s per job)**:
- Check Medplum server CPU/memory
- Increase worker concurrency:
  ```typescript
  // fhir-queue.ts
  concurrency: 10  // Default is 5
  ```
- Check network latency: `ping medplum.holilabs.com`

**Reconciliation Taking Too Long (>5min)**:
- Reduce batch size: `{"batchSize": 500}`
- Run multiple reconciliation jobs for different orgs in parallel
- Index optimization:
  ```sql
  CREATE INDEX CONCURRENTLY idx_encounters_last_synced
  ON encounters (last_synced_at, updated_at);
  ```

---

## 10. Security & Compliance

### 10.1 HIPAA Compliance

**BAA Requirements**:
- Medplum is a Covered Entity subcontractor → Execute BAA
- Ensure Medplum deployment meets HIPAA technical safeguards:
  - TLS 1.2+ for all traffic
  - Encrypted database (PostgreSQL with encryption at rest)
  - Audit logging enabled
  - Access controls (OAuth2 scopes)

**PHI Handling**:
- Holi NEVER sends PHI to Medplum (only pseudonymous IDs)
- Clinical data stored in S3 (encrypted, separate from FHIR)
- Consent enforcement prevents unauthorized access

### 10.2 Security Hardening

**Medplum Server**:
```yaml
# Security headers (Medplum config)
security:
  contentSecurityPolicy: true
  hsts: true
  frameguard: true
  xssFilter: true
```

**Network Isolation**:
- Medplum in private VPC (not internet-exposed)
- API server → Medplum via private network
- External EHRs → Holi API via TLS + API key auth

**Credential Rotation**:
```bash
# Rotate Medplum client secret (quarterly)
# 1. Generate new secret in Medplum admin
# 2. Update MEDPLUM_CLIENT_SECRET in DO secrets
# 3. Deploy API server
# 4. Verify health
# 5. Revoke old secret after 24 hours
```

**CRON Secret Protection**:
```bash
# Generate CRON secret (one-time)
openssl rand -hex 32

# Add to DO secrets
doctl apps update [app-id] --env CRON_SECRET=[secret]

# Verify protection
curl -X POST .../reconciliation/cron  # Should return 403

curl -X POST .../reconciliation/cron \
  -H "X-Cron-Secret: wrong_secret"    # Should return 403

curl -X POST .../reconciliation/cron \
  -H "X-Cron-Secret: [correct_secret]" # Should return 200
```

### 10.3 Audit & Compliance

**Audit Log Retention**:
```sql
-- Audit events retained for 7 years (HIPAA requirement)
-- Implement automated archival
CREATE TABLE audit_events_archive AS
SELECT * FROM audit_events WHERE ts < NOW() - INTERVAL '1 year';

DELETE FROM audit_events WHERE ts < NOW() - INTERVAL '1 year';
```

**Compliance Reports**:
```bash
# Export FHIR export audit log (for compliance review)
psql -h [db-host] -c "
  SELECT
    ts,
    (payload->>'userId') AS user_id,
    (payload->>'patientTokenId') AS patient,
    (payload->>'resourceCount') AS resources
  FROM audit_events
  WHERE event_type = 'FHIR_EXPORT'
    AND ts > NOW() - INTERVAL '90 days'
  ORDER BY ts DESC
" > fhir_exports_q4_2024.csv
```

---

## Appendix

### A. Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_MEDPLUM` | Yes | `false` | Enable/disable FHIR integration |
| `MEDPLUM_BASE_URL` | Yes* | - | Medplum server URL |
| `MEDPLUM_CLIENT_ID` | Yes* | - | OAuth2 client ID |
| `MEDPLUM_CLIENT_SECRET` | Yes* | - | OAuth2 client secret (min 20 chars) |
| `MEDPLUM_PROJECT_ID` | Yes* | - | Medplum project ID |
| `REDIS_URL` | Yes | - | Redis connection string (for BullMQ) |
| `CRON_SECRET` | Recommended | - | CRON endpoint protection (64 hex chars) |

\* Required if `ENABLE_MEDPLUM=true`

### B. Database Schema

```sql
-- Key FHIR-related fields added to existing models

-- encounters table
ALTER TABLE encounters ADD COLUMN fhir_resource_id TEXT UNIQUE;
ALTER TABLE encounters ADD COLUMN fhir_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE encounters ADD COLUMN last_synced_at TIMESTAMPTZ;

-- observations table
ALTER TABLE observations ADD COLUMN fhir_resource_id TEXT UNIQUE;
ALTER TABLE observations ADD COLUMN fhir_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE observations ADD COLUMN last_synced_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX idx_encounters_fhir_sync ON encounters (fhir_sync_enabled, last_synced_at);
CREATE INDEX idx_observations_fhir_sync ON observations (fhir_sync_enabled, last_synced_at);
```

### C. Testing

**Run Integration Tests**:
```bash
cd apps/api
pnpm test
```

**Test Coverage**:
- FHIR Ingress: 45 test cases
- FHIR Export: 40 test cases
- FHIR Reconciliation: 35 test cases
- **Total**: 120+ test cases

**Manual E2E Test**:
```bash
# 1. Create encounter
curl -X POST http://localhost:3001/patients/pt_test/encounters \
  -d '{"type": "OFFICE_VISIT", "reasonCode": "Z00.00"}'

# 2. Check queue processed job
curl http://localhost:3001/fhir/admin/queue/stats

# 3. Verify in Medplum
curl http://localhost:8103/fhir/R4/Encounter?patient=Patient/pt_test

# 4. Export $everything
curl http://localhost:3001/fhir/export/patient/pt_test/$everything
```

### D. Support Contacts

- **Holi Labs Engineering**: engineering@holilabs.xyz
- **Medplum Support**: https://github.com/medplum/medplum/discussions
- **On-Call**: PagerDuty escalation policy

---

**Document Version**: 2.0
**Last Reviewed**: January 2025
**Next Review**: April 2025
