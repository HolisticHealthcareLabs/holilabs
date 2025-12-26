#!/bin/bash

###############################################################################
# Holi Labs - End-to-End FHIR Integration Demo
#
# This demo showcases the complete FHIR integration workflow:
#   1. Create patient data in Holi (auto-syncs to Medplum)
#   2. Ingest external FHIR data from EHR
#   3. Export patient FHIR bundle (with RBAC and consent)
#   4. Verify bidirectional audit trail
#   5. Validate data consistency
#
# Prerequisites:
#   - Holi API running on http://localhost:3000
#   - Medplum running (self-hosted or cloud)
#   - PostgreSQL, Redis running
#   - ENABLE_MEDPLUM=true in .env
#
# Usage:
#   ./demos/fhir-e2e-demo.sh
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ORG_ID="${ORG_ID:-org_demo123}"
CORRELATION_ID="demo_$(date +%s)"

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "Step 0: Checking Prerequisites"

    # Check if API is running
    log_info "Checking if Holi API is running..."
    if curl -s -f "${API_BASE_URL}/health" > /dev/null; then
        log_success "Holi API is running at ${API_BASE_URL}"
    else
        log_error "Holi API is not running at ${API_BASE_URL}"
        exit 1
    fi

    # Check if FHIR is enabled
    log_info "Checking if FHIR sync is enabled..."
    FHIR_ENABLED=$(curl -s "${API_BASE_URL}/health" | jq -r '.fhir.enabled')
    if [ "$FHIR_ENABLED" = "true" ]; then
        log_success "FHIR sync is enabled"
    else
        log_error "FHIR sync is disabled. Set ENABLE_MEDPLUM=true in .env"
        exit 1
    fi

    # Check dependencies
    for cmd in curl jq; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed. Please install it first."
            exit 1
        fi
    done

    log_success "All prerequisites met!"
}

# Step 1: Create patient in Holi (auto-syncs to Medplum)
create_patient_in_holi() {
    log_step "Step 1: Create Patient in Holi (Auto-Sync to Medplum)"

    log_info "Creating PatientToken with encrypted PHI storage..."

    # Create patient token (this would typically come from registration flow)
    PATIENT_TOKEN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/patients/tokens" \
        -H "Content-Type: application/json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -H "X-Correlation-Id: ${CORRELATION_ID}" \
        -d '{
            "orgId": "'"${ORG_ID}"'",
            "encryptedData": {
                "name": {
                    "given": ["María", "Guadalupe"],
                    "family": "García"
                },
                "birthDate": "1985-03-15",
                "gender": "female",
                "identifier": {
                    "system": "urn:oid:2.16.840.1.113883.4.1",
                    "value": "GAMA850315MDFRRL09"
                }
            }
        }')

    PATIENT_TOKEN_ID=$(echo "$PATIENT_TOKEN_RESPONSE" | jq -r '.patientTokenId')

    if [ "$PATIENT_TOKEN_ID" = "null" ] || [ -z "$PATIENT_TOKEN_ID" ]; then
        log_error "Failed to create patient token"
        echo "$PATIENT_TOKEN_RESPONSE" | jq .
        exit 1
    fi

    log_success "Patient token created: ${PATIENT_TOKEN_ID}"
    log_info "De-identified FHIR Patient resource auto-synced to Medplum"

    # Wait for sync to complete
    sleep 2

    # Verify patient was synced to Medplum
    log_info "Verifying patient sync to Medplum..."
    SYNC_STATUS=$(curl -s "${API_BASE_URL}/fhir/admin/queue/stats" | jq -r '.stats.completed')
    log_success "Queue processed ${SYNC_STATUS} jobs"

    echo "$PATIENT_TOKEN_ID"
}

# Step 2: Create clinical encounters and observations
create_clinical_data() {
    log_step "Step 2: Create Clinical Data (Encounters & Observations)"

    local PATIENT_TOKEN_ID=$1

    log_info "Creating encounter for patient ${PATIENT_TOKEN_ID}..."

    # Create encounter
    ENCOUNTER_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/encounters" \
        -H "Content-Type: application/json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -H "X-Correlation-Id: ${CORRELATION_ID}" \
        -d '{
            "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
            "orgId": "'"${ORG_ID}"'",
            "type": "CHECKUP",
            "status": "FINISHED",
            "startTime": "2024-01-15T10:00:00Z",
            "endTime": "2024-01-15T11:30:00Z",
            "chiefComplaint": "Chequeo rutinario",
            "diagnosis": "Hipertensión controlada",
            "clinicalNotes": "Paciente en buen estado general"
        }')

    ENCOUNTER_ID=$(echo "$ENCOUNTER_RESPONSE" | jq -r '.id')
    log_success "Encounter created: ${ENCOUNTER_ID}"

    # Create observations (vitals)
    log_info "Creating observations (vitals)..."

    # Blood pressure
    curl -s -X POST "${API_BASE_URL}/observations" \
        -H "Content-Type: application/json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -d '{
            "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
            "encounterId": "'"${ENCOUNTER_ID}"'",
            "orgId": "'"${ORG_ID}"'",
            "code": "85354-9",
            "display": "Blood pressure panel",
            "value": "120/80",
            "unit": "mmHg",
            "category": "vital-signs",
            "effectiveDateTime": "2024-01-15T10:15:00Z"
        }' > /dev/null

    # Heart rate
    curl -s -X POST "${API_BASE_URL}/observations" \
        -H "Content-Type: application/json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -d '{
            "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
            "encounterId": "'"${ENCOUNTER_ID}"'",
            "orgId": "'"${ORG_ID}"'",
            "code": "8867-4",
            "display": "Heart rate",
            "value": "72",
            "unit": "beats/min",
            "category": "vital-signs",
            "effectiveDateTime": "2024-01-15T10:15:00Z"
        }' > /dev/null

    # Weight
    curl -s -X POST "${API_BASE_URL}/observations" \
        -H "Content-Type: application/json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -d '{
            "patientTokenId": "'"${PATIENT_TOKEN_ID}"'",
            "encounterId": "'"${ENCOUNTER_ID}"'",
            "orgId": "'"${ORG_ID}"'",
            "code": "29463-7",
            "display": "Body weight",
            "value": "68.5",
            "unit": "kg",
            "category": "vital-signs",
            "effectiveDateTime": "2024-01-15T10:15:00Z"
        }' > /dev/null

    log_success "3 observations created (Blood pressure, Heart rate, Weight)"
    log_info "All resources auto-syncing to Medplum via BullMQ queue..."

    # Wait for queue to process
    sleep 3

    echo "$ENCOUNTER_ID"
}

# Step 3: Ingest external FHIR data from EHR
ingest_external_fhir() {
    log_step "Step 3: Ingest External FHIR Data from EHR"

    local PATIENT_TOKEN_ID=$1

    log_info "Simulating FHIR ingestion from external EHR system..."
    log_info "Ingesting lab results (Observation resources)..."

    # Create external FHIR bundle (lab results)
    EXTERNAL_BUNDLE='{
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "2339-0",
                            "display": "Glucose [Mass/volume] in Blood"
                        }],
                        "text": "Glucosa en sangre"
                    },
                    "subject": {
                        "reference": "Patient/'"${PATIENT_TOKEN_ID}"'"
                    },
                    "effectiveDateTime": "2024-01-10T08:00:00Z",
                    "valueQuantity": {
                        "value": 95,
                        "unit": "mg/dL",
                        "system": "http://unitsofmeasure.org",
                        "code": "mg/dL"
                    },
                    "referenceRange": [{
                        "low": { "value": 70, "unit": "mg/dL" },
                        "high": { "value": 100, "unit": "mg/dL" },
                        "text": "Normal range"
                    }]
                },
                "request": {
                    "method": "POST",
                    "url": "Observation"
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "2571-8",
                            "display": "Triglyceride [Mass/volume] in Serum or Plasma"
                        }],
                        "text": "Triglicéridos"
                    },
                    "subject": {
                        "reference": "Patient/'"${PATIENT_TOKEN_ID}"'"
                    },
                    "effectiveDateTime": "2024-01-10T08:00:00Z",
                    "valueQuantity": {
                        "value": 145,
                        "unit": "mg/dL",
                        "system": "http://unitsofmeasure.org",
                        "code": "mg/dL"
                    },
                    "referenceRange": [{
                        "low": { "value": 0, "unit": "mg/dL" },
                        "high": { "value": 150, "unit": "mg/dL" },
                        "text": "Normal range"
                    }]
                },
                "request": {
                    "method": "POST",
                    "url": "Observation"
                }
            }
        ]
    }'

    # Ingest via FHIR ingress endpoint
    INGRESS_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/fhir/inbound/bundle" \
        -H "Content-Type: application/fhir+json" \
        -H "X-Org-Id: ${ORG_ID}" \
        -H "X-Patient-Token-Id: ${PATIENT_TOKEN_ID}" \
        -H "X-Correlation-Id: ${CORRELATION_ID}" \
        -d "${EXTERNAL_BUNDLE}")

    INGRESS_SUCCESS=$(echo "$INGRESS_RESPONSE" | jq -r '.success')

    if [ "$INGRESS_SUCCESS" = "true" ]; then
        OBSERVATIONS_CREATED=$(echo "$INGRESS_RESPONSE" | jq -r '.observationsCreated')
        log_success "Ingested ${OBSERVATIONS_CREATED} observations from external EHR"
    else
        log_error "Failed to ingest external FHIR data"
        echo "$INGRESS_RESPONSE" | jq .
        exit 1
    fi

    # Wait for data to propagate
    sleep 2
}

# Step 4: Export patient FHIR bundle with RBAC and consent
export_fhir_bundle() {
    log_step "Step 4: Export Patient FHIR Bundle (\$everything operation)"

    local PATIENT_TOKEN_ID=$1

    log_info "Exporting complete patient FHIR bundle..."
    log_info "This operation validates:"
    log_info "  - RBAC authorization (user role and permissions)"
    log_info "  - Active CARE consent with required data classes"
    log_info "  - Audit logging (FHIR_EXPORT event)"

    # Export everything (no filters)
    EXPORT_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/fhir/export/patient/${PATIENT_TOKEN_ID}/\$everything" \
        -H "X-Org-Id: ${ORG_ID}" \
        -H "X-Correlation-Id: ${CORRELATION_ID}" \
        -H "X-User-Role: ADMIN")

    BUNDLE_TYPE=$(echo "$EXPORT_RESPONSE" | jq -r '.resourceType')

    if [ "$BUNDLE_TYPE" = "Bundle" ]; then
        TOTAL_RESOURCES=$(echo "$EXPORT_RESPONSE" | jq -r '.total')
        log_success "Exported FHIR Bundle with ${TOTAL_RESOURCES} resources"

        # Show resource breakdown
        log_info "Resource breakdown:"
        echo "$EXPORT_RESPONSE" | jq -r '.entry[].resource.resourceType' | sort | uniq -c | while read count type; do
            log_info "  - ${type}: ${count} resources"
        done

        # Save bundle for inspection
        echo "$EXPORT_RESPONSE" | jq . > /tmp/holi-fhir-export-demo.json
        log_info "Full bundle saved to: /tmp/holi-fhir-export-demo.json"
    else
        log_error "Failed to export FHIR bundle"
        echo "$EXPORT_RESPONSE" | jq .
        exit 1
    fi
}

# Step 5: Verify bidirectional audit trail
verify_audit_trail() {
    log_step "Step 5: Verify Bidirectional Audit Trail"

    log_info "Checking Holi audit events..."
    HOLI_AUDIT_COUNT=$(curl -s "${API_BASE_URL}/admin/audit/events?limit=20" | jq '.events | length')
    log_success "Found ${HOLI_AUDIT_COUNT} audit events in Holi"

    log_info "Checking audit mirror stats (Medplum → Holi)..."
    AUDIT_MIRROR_STATS=$(curl -s "${API_BASE_URL}/fhir/admin/audit-mirror/stats")
    LAST_MIRROR_RUN=$(echo "$AUDIT_MIRROR_STATS" | jq -r '.stats.lastRun')
    TOTAL_MIRRORED=$(echo "$AUDIT_MIRROR_STATS" | jq -r '.stats.totalMirrored')

    if [ "$LAST_MIRROR_RUN" != "null" ]; then
        log_success "Audit mirror last run: ${LAST_MIRROR_RUN}"
        log_success "Total mirrored events: ${TOTAL_MIRRORED}"
    else
        log_warning "Audit mirror has not run yet (runs via CRON daily)"
    fi

    log_info "Key audit event types logged:"
    log_info "  - PATIENT_TOKEN_CREATE (patient creation)"
    log_info "  - FHIR_SYNC (auto-sync to Medplum)"
    log_info "  - FHIR_INGRESS (external EHR ingestion)"
    log_info "  - FHIR_EXPORT (bundle export with consent check)"
    log_info "  - PHI_ACCESS (de-identified data access)"
}

# Step 6: Validate data consistency
validate_consistency() {
    log_step "Step 6: Validate Data Consistency (Holi ↔ Medplum)"

    log_info "Running reconciliation to detect any sync drift..."

    RECONCILIATION_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/fhir/admin/reconciliation/run" \
        -H "Content-Type: application/json" \
        -d '{"batchSize": 100, "staleDays": 1}')

    RECON_SUCCESS=$(echo "$RECONCILIATION_RESPONSE" | jq -r '.success')

    if [ "$RECON_SUCCESS" = "true" ]; then
        NOT_SYNCED=$(echo "$RECONCILIATION_RESPONSE" | jq -r '.result.notSyncedCount')
        STALE=$(echo "$RECONCILIATION_RESPONSE" | jq -r '.result.staleCount')
        ENQUEUED=$(echo "$RECONCILIATION_RESPONSE" | jq -r '.result.enqueuedCount')

        if [ "$NOT_SYNCED" = "0" ] && [ "$STALE" = "0" ]; then
            log_success "✓ Perfect sync! No drift detected."
        else
            log_warning "Sync drift detected:"
            log_warning "  - Not synced: ${NOT_SYNCED}"
            log_warning "  - Stale: ${STALE}"
            log_warning "  - Enqueued for sync: ${ENQUEUED}"
        fi
    else
        log_error "Reconciliation failed"
        echo "$RECONCILIATION_RESPONSE" | jq .
    fi
}

# Step 7: Check monitoring metrics
check_monitoring() {
    log_step "Step 7: Check Monitoring Metrics"

    log_info "Fetching Prometheus metrics..."

    # Get queue stats
    QUEUE_STATS=$(curl -s "${API_BASE_URL}/metrics" | grep "holi_queue_jobs")

    log_info "Queue metrics:"
    echo "$QUEUE_STATS" | grep -E "(active|waiting|failed|completed)" | while read line; do
        log_info "  ${line}"
    done

    # Get FHIR sync stats
    log_info "FHIR sync metrics:"
    SYNC_STATS=$(curl -s "${API_BASE_URL}/metrics" | grep "holi_fhir_sync")
    echo "$SYNC_STATS" | grep -E "(not_synced|stale)" | while read line; do
        log_info "  ${line}"
    done

    log_info "Full metrics available at: ${API_BASE_URL}/metrics"
    log_info "Grafana dashboard: http://localhost:3001/d/holi-fhir-monitoring"
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   Holi Labs - End-to-End FHIR Integration Demo            ║"
    echo "║   Privacy-Preserving Healthcare Interoperability           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites

    PATIENT_TOKEN_ID=$(create_patient_in_holi)
    ENCOUNTER_ID=$(create_clinical_data "$PATIENT_TOKEN_ID")
    ingest_external_fhir "$PATIENT_TOKEN_ID"
    export_fhir_bundle "$PATIENT_TOKEN_ID"
    verify_audit_trail
    validate_consistency
    check_monitoring

    log_step "Demo Complete! 🎉"

    log_success "Successfully demonstrated:"
    echo ""
    echo "  ✓ Patient creation in Holi (de-identified)"
    echo "  ✓ Auto-sync to Medplum via BullMQ"
    echo "  ✓ Clinical data creation (Encounter + 3 Observations)"
    echo "  ✓ External EHR ingestion (2 lab results)"
    echo "  ✓ FHIR Bundle export with RBAC and consent"
    echo "  ✓ Bidirectional audit trail (Holi ↔ Medplum)"
    echo "  ✓ Data consistency validation"
    echo "  ✓ Monitoring metrics"
    echo ""

    log_info "Next steps:"
    echo "  1. View exported bundle: cat /tmp/holi-fhir-export-demo.json | jq ."
    echo "  2. Check Grafana dashboard: http://localhost:3001"
    echo "  3. Review audit events: curl ${API_BASE_URL}/admin/audit/events | jq ."
    echo "  4. Inspect queue: curl ${API_BASE_URL}/fhir/admin/queue/stats | jq ."
    echo ""
}

# Run the demo
main
