#!/usr/bin/env bash
###############################################################################
# End-to-end demo seeding: Synthea (FHIR) -> Postgres (Prisma) -> UI Search
#
# This script:
#  1) Generates synthetic FHIR Bundles via Dockerized Synthea
#  2) Seeds them into the Holi Labs database via scripts/seed-patients.ts
#
# Usage:
#   ./scripts/seed-synthea-demo.sh [count] [state]
#
# Example:
#   ./scripts/seed-synthea-demo.sh 100 "Massachusetts"
###############################################################################

set -euo pipefail

COUNT="${1:-100}"
STATE="${2:-Massachusetts}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${REPO_ROOT}/synthea-output"
FHIR_DIR="${OUTPUT_DIR}/fhir"

echo "[INFO] Generating Synthea FHIR data..."
"${REPO_ROOT}/scripts/generate-synthea-fhir-docker.sh" "$COUNT" "$STATE" "$OUTPUT_DIR"

echo "[INFO] Seeding Holi Labs DB from FHIR output..."
cd "$REPO_ROOT"

# Ensure we run with development dependency behavior even if user's shell has NODE_ENV=production.
NODE_ENV=development pnpm --filter @holi/web exec tsx ../../scripts/seed-patients.ts \
  --input "$FHIR_DIR" \
  --limit "$COUNT"

echo "[SUCCESS] Seed complete."
echo "[INFO] Validate in UI: open http://localhost:3000 and use Cmd+K -> search for \"MRN-SYN\" or \"PT-\"."


