#!/usr/bin/env bash
###############################################################################
# Synthea Synthetic Patient Generation (Docker-based, no local Java required)
#
# Why Docker?
# - Reproducible: same Java runtime + invocation across machines/CI.
# - Zero local Java dependency: avoids version drift and “works on my machine”.
# - Safe demo data: Synthea generates synthetic (non-PHI) longitudinal records.
#
# Output:
#   ./synthea-output/fhir/*.json  (FHIR R4 Bundles)
#
# Usage:
#   ./scripts/generate-synthea-fhir-docker.sh [count] [state] [output_dir]
#
# Examples:
#   ./scripts/generate-synthea-fhir-docker.sh 200 "Massachusetts"
#   ./scripts/generate-synthea-fhir-docker.sh 50 "California" ./synthea-output
#
# Requirements:
# - Docker Desktop installed and running.
# - Network access to download the Synthea fat-jar (one-time).
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

PATIENT_COUNT="${1:-100}"
STATE="${2:-Massachusetts}"
OUTPUT_DIR="${3:-./synthea-output}"

if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed or not on PATH."
  log_info "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

# Sanity check Docker daemon
if ! docker info >/dev/null 2>&1; then
  log_error "Docker daemon is not running."
  log_info "Start Docker Desktop, then re-run this script."
  exit 1
fi

log_info "Configuration:"
log_info "  Patients to generate: $PATIENT_COUNT"
log_info "  State: $STATE"
log_info "  Output dir: $OUTPUT_DIR"
log_info "  Behavior: output dir will be cleaned unless KEEP_OUTPUT=1"

SYNTHEA_DIR="${SYNTHEA_DIR:-./synthea}"
SYNTHEA_JAR="${SYNTHEA_DIR}/synthea-with-dependencies.jar"
SYNTHEA_JAR_URL="https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar"

mkdir -p "$SYNTHEA_DIR"
mkdir -p "$OUTPUT_DIR"

abs_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    echo "$p"
  else
    echo "$(pwd)/$p"
  fi
}

HOST_SYNTHEA_DIR="$(abs_path "$SYNTHEA_DIR")"
HOST_OUTPUT_DIR="$(abs_path "$OUTPUT_DIR")"

if [ "${KEEP_OUTPUT:-0}" != "1" ]; then
  # Avoid confusing “stale data” scenarios where previous runs leave old bundles behind.
  # Synthea uses unique filenames, so re-running without cleanup can mix cohorts.
  rm -rf "${OUTPUT_DIR}/fhir" "${OUTPUT_DIR}/metadata"
fi

if [ ! -f "$SYNTHEA_JAR" ]; then
  log_warning "Synthea jar not found. Downloading (one-time)..."
  if ! command -v curl &> /dev/null; then
    log_error "curl is required to download Synthea jar."
    exit 1
  fi
  curl -fsSL "$SYNTHEA_JAR_URL" -o "$SYNTHEA_JAR"
  log_success "Downloaded: $SYNTHEA_JAR"
fi

START_TIME=$(date +%s)

log_info "Running Synthea via Docker (Java 11 runtime inside container)..."

# Use a pinned Java runtime image to avoid host drift.
# NOTE: pulling this image requires network the first time.
JAVA_IMAGE="eclipse-temurin:11-jre"

docker run --rm \
  -v "${HOST_SYNTHEA_DIR}:/synthea:ro" \
  -v "${HOST_OUTPUT_DIR}:/output" \
  -w /synthea \
  "$JAVA_IMAGE" \
  java -jar /synthea/synthea-with-dependencies.jar \
    -p "$PATIENT_COUNT" \
    --exporter.fhir.export=true \
    --exporter.practitioner.fhir.export=true \
    --exporter.hospital.fhir.export=true \
    --exporter.baseDirectory="/output" \
    --exporter.fhir.bulk_data=false \
    "$STATE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

FHIR_DIR="$OUTPUT_DIR/fhir"
if [ ! -d "$FHIR_DIR" ]; then
  log_error "FHIR output directory not found at: $FHIR_DIR"
  exit 1
fi

FHIR_FILES=$(find "$FHIR_DIR" -name "*.json" -type f | wc -l | xargs)

log_success "Generated $PATIENT_COUNT synthetic patients in ${DURATION}s"
log_success "FHIR JSON files: $FHIR_FILES"
log_info "FHIR output directory: $FHIR_DIR"

exit 0


