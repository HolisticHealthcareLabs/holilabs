# Holi Labs - FHIR Integration End-to-End Demo

Comprehensive demonstration of Holi's privacy-preserving FHIR integration with Medplum, showcasing bidirectional sync, external EHR data ingestion, and complete audit trail.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Running the Demo](#running-the-demo)
5. [Expected Output](#expected-output)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Highlights](#architecture-highlights)

---

## Overview

This demo showcases the complete FHIR integration lifecycle:

```
┌─────────────────────────────────────────────────────────────┐
│                      DEMO WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Create Patient in Holi                            │
│           └─> Auto-syncs to Medplum via BullMQ queue       │
│           └─> Creates PatientToken (privacy-preserving)    │
│                                                             │
│  Step 2: Create Clinical Data                              │
│           └─> Encounter + 3 Observations in Holi           │
│           └─> Auto-syncs to Medplum within 60s             │
│                                                             │
│  Step 3: Ingest External FHIR Data                         │
│           └─> Lab results from external EHR                │
│           └─> FHIR Bundle → Holi internal models           │
│           └─> Preserves FHIR metadata in jsonb             │
│                                                             │
│  Step 4: Export FHIR Bundle ($everything)                  │
│           └─> Patient + all linked resources               │
│           └─> RBAC enforcement (4-tier)                    │
│           └─> Consent validation (CARE consent)            │
│                                                             │
│  Step 5: Verify Bidirectional Audit Trail                  │
│           └─> Holi audit events mirrored to Medplum        │
│           └─> Medplum AuditEvents mirrored to Holi         │
│           └─> Complete HIPAA compliance trail              │
│                                                             │
│  Step 6: Validate Data Consistency                         │
│           └─> Reconciliation job detects drift             │
│           └─> Automatic sync correction                    │
│           └─> Metrics updated                              │
│                                                             │
│  Step 7: Monitor Metrics                                   │
│           └─> Prometheus metrics (/metrics endpoint)       │
│           └─> Queue health, sync status, audit events      │
│           └─> Grafana dashboard visualization              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Features Demonstrated**:
- Privacy-preserving FHIR bridge (PatientToken pseudonymization)
- Automatic bidirectional sync (Holi ↔ Medplum)
- External FHIR data ingestion (EHR → Holi)
- RBAC and consent enforcement
- Complete HIPAA audit trail
- Real-time monitoring and alerting

---

## Prerequisites

### Required Services

1. **Holi API** running locally:
   ```bash
   cd apps/api
   pnpm dev
   ```
   Should be accessible at `http://localhost:3000`

2. **PostgreSQL** (version 14+):
   ```bash
   docker-compose up -d postgres
   ```
   Default: `postgresql://holi:holi_dev_password@localhost:5432/holi_protocol`

3. **Redis** (version 7+):
   ```bash
   docker-compose up -d redis
   ```
   Default: `redis://localhost:6379`

4. **Medplum Server** (optional but recommended):
   ```bash
   # Option A: Use Medplum Cloud (requires account)
   export MEDPLUM_BASE_URL="https://api.medplum.com"
   export MEDPLUM_CLIENT_ID="your-client-id"
   export MEDPLUM_CLIENT_SECRET="your-client-secret"

   # Option B: Use local Medplum server
   git clone https://github.com/medplum/medplum.git
   cd medplum
   docker-compose up -d
   export MEDPLUM_BASE_URL="http://localhost:8103"
   ```

### Required Tools

Install these command-line tools:

```bash
# Check if installed
curl --version
jq --version

# Install if missing (macOS)
brew install curl jq

# Install if missing (Ubuntu/Debian)
apt-get install curl jq
```

### Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure required variables:
   ```bash
   # Database
   DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public&sslmode=disable"

   # Redis
   REDIS_URL="redis://localhost:6379"

   # Medplum
   MEDPLUM_BASE_URL="https://api.medplum.com"
   MEDPLUM_CLIENT_ID="your-client-id"
   MEDPLUM_CLIENT_SECRET="your-client-secret"
   MEDPLUM_ENABLED="true"

   # Feature flags
   ENABLE_FHIR_SYNC="true"
   ENABLE_AUDIT_MIRROR="true"
   ```

3. Run database migrations:
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   ```

### Verification

Run the pre-flight checks:

```bash
# Check API is running
curl -f http://localhost:3000/health || echo "API not running"

# Check database connection
curl -f http://localhost:3000/health/ready || echo "Database not connected"

# Check Redis connection
redis-cli ping || echo "Redis not running"

# Check Medplum connection (if configured)
curl -f ${MEDPLUM_BASE_URL}/healthcheck || echo "Medplum not reachable"
```

---

## Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone repository
git clone https://github.com/HolisticHealthcareLabs/holilabs.git
cd holilabs

# Install dependencies
pnpm install

# Generate Prisma client
cd apps/api
pnpm prisma generate
```

### Step 2: Start Infrastructure

```bash
# Start database and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
sleep 5

# Run migrations
cd apps/api
pnpm prisma migrate dev
```

### Step 3: Start API Server

```bash
# In apps/api directory
pnpm dev

# Should see:
# [INFO] Server listening on http://localhost:3000
# [INFO] FHIR sync queue initialized
# [INFO] Audit mirror service initialized
```

### Step 4: Start Monitoring Stack (Optional)

```bash
# In project root
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana: http://localhost:3001 (admin/admin)
# Access Prometheus: http://localhost:9090
# Access Alertmanager: http://localhost:9093
```

---

## Running the Demo

### Quick Start (Automated)

```bash
# Make script executable
chmod +x demos/fhir-e2e-demo.sh

# Run full demo
./demos/fhir-e2e-demo.sh

# Run with custom configuration
ORG_ID="org_custom" API_BASE_URL="http://localhost:3000" ./demos/fhir-e2e-demo.sh

# Run specific step only
./demos/fhir-e2e-demo.sh --step 3  # Ingest external FHIR only
```

### Manual Execution (Step-by-Step)

Follow along to understand each step:

#### Step 0: Prerequisites Check

```bash
# Verify API health
curl -f http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"2024-01-15T10:00:00Z","checks":{...}}

# Verify FHIR sync is enabled
curl -s http://localhost:3000/health | jq '.checks.fhir_sync'
# Expected: "healthy"

# Verify dependencies
command -v curl >/dev/null 2>&1 || echo "curl not installed"
command -v jq >/dev/null 2>&1 || echo "jq not installed"
```

#### Step 1: Create Patient in Holi

```bash
# Create PatientToken
PATIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/patients/tokens \
  -H "Content-Type: application/json" \
  -H "X-Org-Id: org_demo123" \
  -H "X-Correlation-Id: demo_$(date +%s)" \
  -d '{
    "orgId": "org_demo123",
    "encryptedData": {
      "personalInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1985-06-15"
      }
    }
  }')

# Extract PatientToken ID
PATIENT_TOKEN_ID=$(echo "$PATIENT_RESPONSE" | jq -r '.patientTokenId')
echo "Patient created: $PATIENT_TOKEN_ID"

# Wait for sync to Medplum (queue processes every 15s)
sleep 20

# Verify sync status
curl -s "http://localhost:3000/fhir/admin/sync-status?patientTokenId=${PATIENT_TOKEN_ID}" | jq '.'
# Expected: {"resourceType":"Patient","syncStatus":"synced","lastSyncedAt":"2024-01-15T10:00:20Z"}
```

#### Step 2: Create Clinical Data

```bash
# Create Encounter
ENCOUNTER_RESPONSE=$(curl -s -X POST http://localhost:3000/encounters \
  -H "Content-Type: application/json" \
  -H "X-Org-Id: org_demo123" \
  -d '{
    "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
    "type": "ambulatory",
    "status": "finished",
    "startTime": "2024-01-10T09:00:00Z",
    "endTime": "2024-01-10T09:45:00Z"
  }')

ENCOUNTER_ID=$(echo "$ENCOUNTER_RESPONSE" | jq -r '.id')

# Create Observations
for OBS in "blood_pressure:120/80" "heart_rate:72" "weight:70"; do
  TYPE=$(echo $OBS | cut -d: -f1)
  VALUE=$(echo $OBS | cut -d: -f2)

  curl -s -X POST http://localhost:3000/observations \
    -H "Content-Type: application/json" \
    -d '{
      "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
      "encounterId": "'"${ENCOUNTER_ID}"'",
      "type": "'"${TYPE}"'",
      "value": "'"${VALUE}"'",
      "recordedAt": "2024-01-10T09:15:00Z"
    }'
done

# Wait for sync
sleep 20

# Verify observations synced
curl -s "http://localhost:3000/fhir/admin/sync-status?encounterId=${ENCOUNTER_ID}" | jq '.observations'
```

#### Step 3: Ingest External FHIR Data

```bash
# Load sample bundle
EXTERNAL_BUNDLE=$(cat demos/sample-fhir-bundles/external-ehr-lab-results.json)

# Replace placeholder with actual PatientToken ID
EXTERNAL_BUNDLE=$(echo "$EXTERNAL_BUNDLE" | sed "s/{{PATIENT_TOKEN_ID}}/${PATIENT_TOKEN_ID}/g")

# Ingest bundle
INGEST_RESPONSE=$(curl -s -X POST http://localhost:3000/fhir/inbound/bundle \
  -H "Content-Type: application/fhir+json" \
  -H "X-Org-Id: org_demo123" \
  -d "$EXTERNAL_BUNDLE")

echo "$INGEST_RESPONSE" | jq '.summary'
# Expected: {"resourcesProcessed":5,"observations":5,"errors":0}

# Verify observations created
curl -s "http://localhost:3000/observations?patientTokenId=${PATIENT_TOKEN_ID}" | jq '.data | length'
# Expected: 8 (3 from step 2 + 5 from external bundle)
```

#### Step 4: Export FHIR Bundle

```bash
# Export patient's complete FHIR bundle
EXPORT_BUNDLE=$(curl -s -X GET "http://localhost:3000/fhir/export/patient/${PATIENT_TOKEN_ID}/\$everything" \
  -H "X-Org-Id: org_demo123" \
  -H "X-User-Id: user_admin123" \
  -H "X-User-Role: ADMIN")

# Check bundle contents
echo "$EXPORT_BUNDLE" | jq '{
  resourceType: .resourceType,
  type: .type,
  total: .total,
  resourceTypes: [.entry[].resource.resourceType] | group_by(.) | map({type: .[0], count: length})
}'

# Expected output:
# {
#   "resourceType": "Bundle",
#   "type": "searchset",
#   "total": 10,
#   "resourceTypes": [
#     {"type": "Patient", "count": 1},
#     {"type": "Encounter", "count": 1},
#     {"type": "Observation", "count": 8}
#   ]
# }
```

#### Step 5: Verify Bidirectional Audit Trail

```bash
# Check Holi audit events
HOLI_AUDIT=$(curl -s "http://localhost:3000/admin/audit/events?correlationId=demo_*" \
  -H "X-Org-Id: org_demo123")

echo "$HOLI_AUDIT" | jq '.data | length'
# Expected: ~15 events (patient creation, observations, bundle export, etc.)

# Check Medplum audit events mirrored to Holi
MIRROR_STATS=$(curl -s http://localhost:3000/fhir/admin/audit-mirror/stats)

echo "$MIRROR_STATS" | jq '{
  eventsProcessed: .eventsProcessed,
  lastSync: .lastSyncAt,
  errors: .errors
}'

# Expected:
# {
#   "eventsProcessed": 10,
#   "lastSync": "2024-01-15T10:05:00Z",
#   "errors": 0
# }
```

#### Step 6: Validate Data Consistency

```bash
# Run reconciliation job
RECON_RESULT=$(curl -s -X POST http://localhost:3000/fhir/admin/reconciliation/run \
  -H "X-Org-Id: org_demo123")

echo "$RECON_RESULT" | jq '{
  totalChecked: .totalChecked,
  syncErrors: .syncErrors,
  corrected: .corrected
}'

# Expected (for successful demo):
# {
#   "totalChecked": 10,
#   "syncErrors": 0,
#   "corrected": 0
# }

# Check for drift (resources not synced in >1h)
curl -s http://localhost:3000/metrics | grep "holi_fhir_sync_stale"
# Expected: holi_fhir_sync_stale{resource_type="Patient"} 0
```

#### Step 7: Check Monitoring Metrics

```bash
# Get Prometheus metrics
METRICS=$(curl -s http://localhost:3000/metrics)

# Queue health
echo "$METRICS" | grep "holi_queue_jobs"
# Expected:
# holi_queue_jobs_active{queue_name="fhir-sync"} 0
# holi_queue_jobs_waiting{queue_name="fhir-sync"} 0
# holi_queue_jobs_failed{queue_name="fhir-sync"} 0
# holi_queue_jobs_completed_total{queue_name="fhir-sync"} 10

# FHIR sync metrics
echo "$METRICS" | grep "holi_fhir_sync_operations_total"
# Expected:
# holi_fhir_sync_operations_total{resource_type="Patient",operation="create",status="success"} 1
# holi_fhir_sync_operations_total{resource_type="Observation",operation="create",status="success"} 8

# HIPAA audit metrics
echo "$METRICS" | grep "holi_hipaa_audit_events_total"
# Expected:
# holi_hipaa_audit_events_total{event_type="patient_created",org_id="org_demo123"} 1

# Open Grafana dashboard
open http://localhost:3001/d/fhir-monitoring
```

---

## Expected Output

### Success Criteria

After running the demo, you should see:

1. **Patient Created**:
   - PatientToken created in Holi database
   - FHIR Patient resource created in Medplum
   - Audit event logged in both systems

2. **Clinical Data Synced**:
   - 1 Encounter synced to Medplum
   - 8 Observations synced (3 vitals + 5 lab results)
   - All sync operations completed within 60s

3. **External Data Ingested**:
   - 5 lab observations imported from external EHR
   - FHIR metadata preserved in jsonb fields
   - All LOINC codes correctly mapped

4. **Bundle Exported**:
   - Complete FHIR Bundle with 10 resources
   - RBAC enforced (no unauthorized access)
   - Consent validated (CARE consent present)

5. **Audit Trail Complete**:
   - ~15 audit events logged
   - Bidirectional mirroring working (Holi ↔ Medplum)
   - No missing or duplicate events

6. **No Sync Drift**:
   - Reconciliation job finds 0 errors
   - All resources have `lastSyncedAt` within last 5 minutes
   - `holi_fhir_sync_stale` metric = 0

7. **Monitoring Active**:
   - Prometheus scraping metrics every 15s
   - Grafana dashboard shows all green
   - No P1/P2 alerts firing

### Sample Output (Automated Script)

```
[INFO] ==========================================
[INFO] Holi Labs - FHIR Integration E2E Demo
[INFO] ==========================================

[INFO] Step 0: Checking prerequisites...
[SUCCESS] Holi API is running (v1.0.0)
[SUCCESS] PostgreSQL is connected
[SUCCESS] Redis is connected
[SUCCESS] Medplum is reachable
[SUCCESS] FHIR sync is enabled
[SUCCESS] All dependencies installed

[INFO] Step 1: Creating patient in Holi...
[SUCCESS] Patient created: pt_abc123def456
[INFO] Waiting for sync to Medplum (20s)...
[SUCCESS] Patient synced to Medplum (fhir_id: Patient/xyz789)

[INFO] Step 2: Creating clinical data...
[SUCCESS] Encounter created: enc_111222333
[SUCCESS] Observation created: obs_blood_pressure
[SUCCESS] Observation created: obs_heart_rate
[SUCCESS] Observation created: obs_weight
[INFO] Waiting for sync (20s)...
[SUCCESS] All resources synced to Medplum

[INFO] Step 3: Ingesting external FHIR data...
[SUCCESS] Bundle ingested: 5 observations processed
[SUCCESS] Lab results: Glucose, Cholesterol (Total, HDL, LDL), Triglycerides

[INFO] Step 4: Exporting FHIR bundle...
[SUCCESS] Bundle exported: 10 resources (1 Patient, 1 Encounter, 8 Observations)

[INFO] Step 5: Verifying audit trail...
[SUCCESS] Holi audit events: 15 events logged
[SUCCESS] Audit mirror stats: 10 Medplum events mirrored to Holi
[SUCCESS] Bidirectional sync working correctly

[INFO] Step 6: Validating data consistency...
[SUCCESS] Reconciliation complete: 10 resources checked, 0 errors, 0 corrected
[SUCCESS] No sync drift detected

[INFO] Step 7: Checking monitoring...
[SUCCESS] Queue metrics: 0 active, 0 waiting, 0 failed, 10 completed
[SUCCESS] FHIR sync metrics: 10 operations, 0 errors
[SUCCESS] HIPAA audit metrics: 15 events logged
[SUCCESS] All metrics healthy

[INFO] ==========================================
[SUCCESS] DEMO COMPLETED SUCCESSFULLY! 🎉
[INFO] ==========================================

[INFO] Next steps:
  - View Grafana dashboard: http://localhost:3001/d/fhir-monitoring
  - View Prometheus metrics: http://localhost:9090
  - Review audit events: curl http://localhost:3000/admin/audit/events
  - Export patient data: curl http://localhost:3000/fhir/export/patient/pt_abc123def456/\$everything

[INFO] Demo patient created: pt_abc123def456
[INFO] Encounter ID: enc_111222333
[INFO] Total observations: 8 (3 vitals + 5 lab results)
```

---

## Verification Steps

### Database Verification

```sql
-- Connect to database
psql $DATABASE_URL

-- Check patient token
SELECT id, org_id, fhir_patient_id, last_synced_at
FROM patient_tokens
WHERE id = 'pt_abc123def456';

-- Check observations
SELECT id, type, value, last_synced_at
FROM observations
WHERE patient_token_id = 'pt_abc123def456'
ORDER BY recorded_at;

-- Check audit events
SELECT event_type, actor_id, COUNT(*)
FROM audit.audit_events
WHERE correlation_id LIKE 'demo_%'
GROUP BY event_type, actor_id;

-- Check sync errors
SELECT resource_type, COUNT(*)
FROM fhir_sync_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY resource_type;
```

### Medplum Verification

```bash
# Get Medplum access token
TOKEN=$(curl -s -X POST ${MEDPLUM_BASE_URL}/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${MEDPLUM_CLIENT_ID}" \
  -d "client_secret=${MEDPLUM_CLIENT_SECRET}" | jq -r '.access_token')

# Search for patient
curl -s -H "Authorization: Bearer $TOKEN" \
  "${MEDPLUM_BASE_URL}/fhir/R4/Patient?identifier=holi-patient-token|${PATIENT_TOKEN_ID}" | jq '.'

# Search for observations
curl -s -H "Authorization: Bearer $TOKEN" \
  "${MEDPLUM_BASE_URL}/fhir/R4/Observation?subject:identifier=holi-patient-token|${PATIENT_TOKEN_ID}" | jq '.total'

# Check audit events
curl -s -H "Authorization: Bearer $TOKEN" \
  "${MEDPLUM_BASE_URL}/fhir/R4/AuditEvent?entity:identifier=holi-patient-token|${PATIENT_TOKEN_ID}" | jq '.total'
```

### Queue Verification

```bash
# Using Redis CLI
redis-cli

# Check queue keys
KEYS bull:fhir-sync:*

# Check failed jobs
LLEN bull:fhir-sync:failed
# Expected: 0

# Check completed jobs
LLEN bull:fhir-sync:completed
# Expected: 10+

# Get job details
HGETALL bull:fhir-sync:1
```

### Metrics Verification

```bash
# Queue metrics
curl -s http://localhost:3000/metrics | grep "holi_queue"

# FHIR sync metrics
curl -s http://localhost:3000/metrics | grep "holi_fhir_sync"

# Audit metrics
curl -s http://localhost:3000/metrics | grep "holi_hipaa"

# HTTP metrics
curl -s http://localhost:3000/metrics | grep "holi_http_requests_total"

# Query Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=holi_queue_jobs_failed' | jq '.data.result[0].value[1]'
# Expected: "0"
```

---

## Troubleshooting

### Problem: "API not running"

**Symptoms**: `curl http://localhost:3000/health` fails

**Solutions**:
1. Check API is started: `cd apps/api && pnpm dev`
2. Check port 3000 is not in use: `lsof -i :3000`
3. Check logs: `tail -f apps/api/logs/app.log`
4. Check environment: `cat apps/api/.env | grep MEDPLUM`

### Problem: "Patient sync failed"

**Symptoms**: `last_synced_at` is NULL after 60s

**Solutions**:
1. Check Medplum credentials:
   ```bash
   curl -s -X POST ${MEDPLUM_BASE_URL}/oauth2/token \
     -d "grant_type=client_credentials" \
     -d "client_id=${MEDPLUM_CLIENT_ID}" \
     -d "client_secret=${MEDPLUM_CLIENT_SECRET}"
   ```
   Should return access token, not error

2. Check queue is processing:
   ```bash
   curl -s http://localhost:3000/metrics | grep "holi_queue_jobs_active"
   # Should be 0 or low number, not stuck at high number
   ```

3. Check queue worker is running:
   ```bash
   curl -s http://localhost:3000/admin/queue/stats | jq '.workers'
   # Expected: {"active": 5, "idle": 5}
   ```

4. Check sync errors:
   ```bash
   curl -s http://localhost:3000/admin/queue/failed | jq '.jobs[0].error'
   ```

5. Retry failed jobs:
   ```bash
   curl -s -X POST http://localhost:3000/admin/queue/retry-failed
   ```

### Problem: "External bundle ingestion fails"

**Symptoms**: POST to `/fhir/inbound/bundle` returns error

**Solutions**:
1. Validate bundle format:
   ```bash
   cat demos/sample-fhir-bundles/external-ehr-lab-results.json | jq '.resourceType'
   # Expected: "Bundle"
   ```

2. Check PatientToken ID is replaced:
   ```bash
   grep "{{PATIENT_TOKEN_ID}}" demos/sample-fhir-bundles/external-ehr-lab-results.json
   # Should return nothing (no placeholders)
   ```

3. Check FHIR ingress is enabled:
   ```bash
   curl -s http://localhost:3000/health | jq '.checks.fhir_ingress'
   # Expected: "healthy"
   ```

4. Check bundle with smaller test:
   ```bash
   curl -s -X POST http://localhost:3000/fhir/inbound/bundle \
     -H "Content-Type: application/fhir+json" \
     -d '{
       "resourceType": "Bundle",
       "type": "transaction",
       "entry": [{
         "resource": {
           "resourceType": "Observation",
           "status": "final",
           "code": {"text": "Test"},
           "subject": {"reference": "Patient/'"${PATIENT_TOKEN_ID}"'"}
         }
       }]
     }'
   ```

### Problem: "Audit events not mirroring"

**Symptoms**: `eventsProcessed` stays at 0

**Solutions**:
1. Check audit mirror is enabled:
   ```bash
   curl -s http://localhost:3000/health | jq '.checks.audit_mirror'
   # Expected: "healthy"
   ```

2. Check cron job is running:
   ```bash
   curl -s http://localhost:3000/admin/cron/status | jq '.jobs.auditMirror'
   # Expected: {"enabled": true, "lastRun": "2024-01-15T10:00:00Z"}
   ```

3. Manually trigger sync:
   ```bash
   curl -s -X POST http://localhost:3000/fhir/admin/audit-mirror/sync
   ```

4. Check Medplum permissions:
   ```bash
   # Your Medplum credentials need AuditEvent read permission
   curl -s -H "Authorization: Bearer $TOKEN" \
     "${MEDPLUM_BASE_URL}/fhir/R4/AuditEvent?_count=1"
   # Should return AuditEvent, not 403 Forbidden
   ```

### Problem: "Reconciliation reports drift"

**Symptoms**: `syncErrors > 0`

**Solutions**:
1. Check which resources have drift:
   ```bash
   curl -s http://localhost:3000/metrics | grep "holi_fhir_sync_stale"
   # Shows resources not synced in >1h
   ```

2. Check failed queue jobs:
   ```bash
   curl -s http://localhost:3000/admin/queue/failed | jq '.jobs | length'
   ```

3. Retry failed jobs:
   ```bash
   curl -s -X POST http://localhost:3000/admin/queue/retry-failed
   ```

4. Force re-sync specific resource:
   ```bash
   curl -s -X POST http://localhost:3000/fhir/admin/force-sync \
     -d '{"resourceType": "Patient", "resourceId": "'"${PATIENT_TOKEN_ID}"'"}'
   ```

5. Check Medplum connection:
   ```bash
   curl -f ${MEDPLUM_BASE_URL}/healthcheck || echo "Medplum unreachable"
   ```

### Problem: "Metrics not showing in Grafana"

**Symptoms**: Grafana dashboard panels show "No data"

**Solutions**:
1. Check Prometheus is scraping:
   ```bash
   curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="holi-api") | .health'
   # Expected: "up"
   ```

2. Check metrics endpoint:
   ```bash
   curl -s http://localhost:3000/metrics | head -20
   # Should show metrics, not error
   ```

3. Check time range in Grafana (top-right corner):
   - Change to "Last 15 minutes" or "Last 1 hour"
   - Click refresh button

4. Query Prometheus directly:
   ```bash
   curl -s 'http://localhost:9090/api/v1/query?query=holi_queue_jobs_completed_total' | jq '.data.result'
   # Should return data points
   ```

5. Restart monitoring stack:
   ```bash
   cd infra/monitoring
   docker-compose -f docker-compose.monitoring.yml restart
   ```

### Problem: "Permission denied" errors

**Symptoms**: RBAC or consent validation fails

**Solutions**:
1. Check user headers:
   ```bash
   curl -v http://localhost:3000/fhir/export/patient/${PATIENT_TOKEN_ID}/\$everything \
     -H "X-User-Id: user_admin123" \
     -H "X-User-Role: ADMIN"
   # Should include these headers in request
   ```

2. Check consent exists:
   ```bash
   curl -s http://localhost:3000/consents?patientTokenId=${PATIENT_TOKEN_ID} | jq '.data[0].type'
   # Expected: "CARE" or appropriate consent type
   ```

3. Create consent if missing:
   ```bash
   curl -s -X POST http://localhost:3000/consents \
     -H "Content-Type: application/json" \
     -d '{
       "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
       "type": "CARE",
       "status": "active",
       "dataClasses": ["CLINICAL", "DEMOGRAPHICS"]
     }'
   ```

4. Check RBAC tier for endpoint:
   ```bash
   # Tier 1 (ADMIN only): /fhir/admin/*
   # Tier 2 (PATIENT): /fhir/export/patient/:id
   # Tier 3 (CLINICIAN): /fhir/resources/*
   # Tier 4 (RESEARCHER): /fhir/aggregated/*
   ```

---

## Architecture Highlights

### Privacy-Preserving FHIR Bridge

```
Holi Internal Models              FHIR Resources (Medplum)
─────────────────────            ────────────────────────

PatientToken                  ──▶ Patient
├─ id: pt_abc123                  ├─ id: auto-generated UUID
├─ orgId: org_demo123             ├─ identifier: [
├─ encryptedData: {...}           │   {system: "holi-patient-token",
└─ fhirPatientId: uuid            │    value: "pt_abc123"}
                                  │ ]
                                  ├─ name: [redacted] ◀─ Privacy!
                                  └─ meta.source: "holi-api-v1"

Observation                   ──▶ Observation
├─ id: obs_xyz                    ├─ id: auto-generated UUID
├─ type: "blood_pressure"         ├─ code: {LOINC 85354-9}
├─ value: "120/80"                ├─ component: [
├─ recordedAt: timestamp          │   {code: {LOINC 8480-6}, value: 120},
└─ fhirObservationId: uuid        │   {code: {LOINC 8462-4}, value: 80}
                                  │ ]
                                  └─ subject.reference: "Patient/uuid"
```

**Key Privacy Features**:
- PatientToken pseudonymization (pt_* never contains PII)
- FHIR Patient resource has minimal demographics
- Full PII stays encrypted in Holi's database
- Medplum only gets de-identified clinical data
- Audit trail tracks all data access

### Automatic Bidirectional Sync

```
┌─────────────┐              ┌──────────────┐
│  Holi DB    │              │  Medplum     │
│             │              │              │
│  CREATE     │              │              │
│  Patient    │──┐           │              │
└─────────────┘  │           └──────────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Prisma         │
         │ Middleware     │ ◀─ Intercepts all creates/updates
         └────────────────┘
                 │
                 ▼
         ┌────────────────┐
         │ BullMQ Queue   │
         │ Job: sync-     │ ◀─ Async processing
         │      patient   │
         └────────────────┘
                 │
                 ▼
         ┌────────────────┐
         │ FHIR Sync      │
         │ Service        │ ◀─ Maps to FHIR, calls Medplum API
         └────────────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Medplum API    │
         │ POST /Patient  │
         └────────────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Update Holi DB │
         │ last_synced_at │ ◀─ Confirms sync
         └────────────────┘
```

**Sync Guarantees**:
- < 60 seconds: 99.9% of syncs complete within 1 minute
- Exponential backoff: 5s, 30s, 2m, 10m retry intervals
- Automatic reconciliation: Nightly job detects and fixes drift
- Comprehensive monitoring: Real-time metrics and alerts

### 4-Tier RBAC Model

```
Tier 1: ADMIN
├─ Can access: Everything
├─ Use cases: Platform admins, support engineers
└─ Endpoints: /fhir/admin/*, /admin/*, all operations

Tier 2: PATIENT
├─ Can access: Own data only
├─ Use cases: Patient portal, mobile app
└─ Endpoints: /fhir/export/patient/:id (with consent)

Tier 3: CLINICIAN
├─ Can access: Assigned patients (org-scoped)
├─ Use cases: Doctors, nurses, care coordinators
└─ Endpoints: /fhir/resources/* (with org validation)

Tier 4: RESEARCHER
├─ Can access: De-identified aggregated data
├─ Use cases: Population health, analytics
└─ Endpoints: /fhir/aggregated/* (no PII)
```

**Enforcement Points**:
- API Gateway: Validates JWT and role
- Fastify Hooks: Pre-handler role check
- Consent Validation: Required for Tier 2/3
- Audit Logging: Every access logged

---

## Demo Videos

Record a demo video showing:

1. **Terminal screencast** (5 minutes):
   - Run `./demos/fhir-e2e-demo.sh`
   - Show colored output for each step
   - Highlight key success messages

2. **Grafana dashboard walkthrough** (3 minutes):
   - Open dashboard during demo run
   - Show real-time metrics updating
   - Explain key panels

3. **Database verification** (2 minutes):
   - SQL queries showing patient, observations
   - Show `last_synced_at` timestamps
   - Show audit events table

See [`RECORDING_GUIDE.md`](./RECORDING_GUIDE.md) for detailed narration script.

---

## Support

For questions or issues with the demo:

- **Documentation**: [MEDPLUM_INTEGRATION.md](../docs/MEDPLUM_INTEGRATION.md)
- **Slack**: `#engineering` or `#fhir-integration`
- **Email**: `engineering@holilabs.xyz`
- **GitHub Issues**: https://github.com/HolisticHealthcareLabs/holilabs/issues

---

## License

Copyright © 2024 Holi Labs. All rights reserved.
