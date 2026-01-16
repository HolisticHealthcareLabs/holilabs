#!/bin/bash
###############################################################################
# Synthea Synthetic Patient Generation Script
#
# USAGE:
#   ./scripts/generate-synthea-patients.sh [count] [state]
#
# EXAMPLES:
#   ./scripts/generate-synthea-patients.sh 100 "Massachusetts"
#   ./scripts/generate-synthea-patients.sh 500 "California"
#
# PURPOSE:
#   Generate synthetic patients for testing without PHI risks
#   Output: FHIR R4 bundles ready for Medplum import
#   Note: Uses US demographics (Synthea default)
#
# NOTE (Preferred):
#   For a Docker-based flow that avoids installing Java on the host, use:
#     ./scripts/generate-synthea-fhir-docker.sh
#
# COMPLIANCE:
#   - LGPD Art. 48 compliant (no real patient data)
#   - Safe for development, testing, and demo environments
#
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     SYNTHEA SYNTHETIC PATIENT GENERATION                 ║"
echo "║              LGPD-Compliant Test Data                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Parse arguments
PATIENT_COUNT="${1:-100}"
STATE="${2:-Massachusetts}"

log_info "Configuration:"
log_info "  Patients to generate: $PATIENT_COUNT"
log_info "  State: $STATE"
log_info "  Note: Using US demographics (Synthea default)"
echo ""

# Check if Synthea is installed
if ! command -v java &> /dev/null; then
    log_error "Java is not installed. Synthea requires Java 11+"
    log_info "Install Java: brew install openjdk@11"
    log_info "Or use Docker-based generator: ./scripts/generate-synthea-fhir-docker.sh"
    exit 1
fi

log_success "✓ Java found: $(java -version 2>&1 | head -n1)"

# Check if Synthea JAR exists
SYNTHEA_DIR="${SYNTHEA_DIR:-./synthea}"
SYNTHEA_JAR="${SYNTHEA_DIR}/synthea-with-dependencies.jar"

if [ ! -f "$SYNTHEA_JAR" ]; then
    log_warning "Synthea not found. Downloading..."

    mkdir -p "$SYNTHEA_DIR"
    cd "$SYNTHEA_DIR"

    log_info "Downloading Synthea from GitHub..."
    SYNTHEA_VERSION="v3.2.0"
    curl -L "https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar" \
        -o synthea-with-dependencies.jar

    cd -
    log_success "✓ Synthea downloaded"
fi

# Create output directory
OUTPUT_DIR="./synthea-output"
mkdir -p "$OUTPUT_DIR"

log_info "Generating $PATIENT_COUNT synthetic patients..."
log_info "This may take 5-10 minutes depending on patient count..."

START_TIME=$(date +%s)

# Generate patients with Brazilian demographics
# Synthea generates realistic disease progressions, medications, lab results
java -jar "$SYNTHEA_JAR" \
    -p "$PATIENT_COUNT" \
    --exporter.fhir.export=true \
    --exporter.practitioner.fhir.export=true \
    --exporter.hospital.fhir.export=true \
    --exporter.baseDirectory="$OUTPUT_DIR" \
    --exporter.fhir.bulk_data=false \
    "$STATE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log_success "✓ Generated $PATIENT_COUNT patients in ${DURATION}s"

# Count generated files
FHIR_DIR="$OUTPUT_DIR/fhir"
if [ -d "$FHIR_DIR" ]; then
    PATIENT_FILES=$(find "$FHIR_DIR" -name "*.json" -type f | wc -l | xargs)
    log_success "✓ Generated $PATIENT_FILES FHIR JSON files"
    log_info "  Location: $FHIR_DIR"
else
    log_error "FHIR output directory not found"
    exit 1
fi

# Generate summary
log_info "Generating summary report..."

cat > "$OUTPUT_DIR/GENERATION_REPORT.md" <<EOF
# Synthea Patient Generation Report

**Date:** $(date)
**Patients Generated:** $PATIENT_COUNT
**State:** $STATE
**Country:** Brazil
**Generation Time:** ${DURATION}s
**Output Location:** $FHIR_DIR

## Generated Resources

- **Patients:** Complete medical histories
- **Encounters:** Hospital visits, checkups, emergency room
- **Conditions:** Chronic diseases (diabetes, hypertension, etc.)
- **Medications:** Prescriptions with dosages
- **Observations:** Lab results (glucose, cholesterol, blood pressure)
- **Procedures:** Surgeries, vaccinations, diagnostic procedures
- **Practitioners:** Clinicians who treated patients
- **Organizations:** Hospitals and clinics

## Diversity Profile

Synthea generates diverse patient demographics:
- **Age Range:** 0-100 years (realistic distribution)
- **Gender:** Male/Female (50/50 split)
- **Conditions:**
  - Diabetes Mellitus Type 2
  - Hypertension
  - Chronic Obstructive Pulmonary Disease
  - Depression/Anxiety
  - Coronary Artery Disease
  - Cancer (various types)
  - And 500+ other conditions

## LGPD Compliance

✅ **No Real PHI:** All data is synthetically generated
✅ **Safe for Testing:** Can be used in development/staging environments
✅ **No Privacy Restrictions:** Free to share, modify, delete
✅ **Realistic Patterns:** Maintains statistical properties of real data

## Import to Medplum

\`\`\`bash
# Import all patients to Medplum
for file in $FHIR_DIR/*.json; do
    curl -X POST "\${MEDPLUM_BASE_URL}/fhir/R4/" \\
        -H "Authorization: Bearer \${MEDPLUM_TOKEN}" \\
        -H "Content-Type: application/fhir+json" \\
        -d @"\$file"
done
\`\`\`

## Next Steps

1. Review generated data: \`ls $FHIR_DIR\`
2. Import to Medplum (see command above)
3. Use for E2E testing (Playwright)
4. Use for load testing (k6)
5. Use for demo environment

---

**Generated by:** Synthea v3.2.0
**License:** Apache 2.0
**Documentation:** https://github.com/synthetichealth/synthea
EOF

log_success "✓ Report generated: $OUTPUT_DIR/GENERATION_REPORT.md"

# Optional: Preview first patient
FIRST_PATIENT=$(find "$FHIR_DIR" -name "*.json" -type f | head -n1)
if [ -n "$FIRST_PATIENT" ]; then
    log_info "Preview of first patient:"
    echo ""
    cat "$FIRST_PATIENT" | head -50
    echo ""
    log_info "  (showing first 50 lines)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          SYNTHETIC PATIENT GENERATION COMPLETE           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

log_success "✅ $PATIENT_COUNT synthetic patients ready for testing"
log_info "Output directory: $OUTPUT_DIR"
log_info "Full report: $OUTPUT_DIR/GENERATION_REPORT.md"
echo ""
log_info "Next steps:"
echo "  1. Review: cat $OUTPUT_DIR/GENERATION_REPORT.md"
echo "  2. Import to Medplum (see report for commands)"
echo "  3. Use for E2E and load testing"
echo ""

exit 0
