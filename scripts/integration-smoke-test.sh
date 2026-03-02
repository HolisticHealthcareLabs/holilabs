#!/usr/bin/env bash
#
# Integration Smoke Test
#
# Requires:
#   1. Dev server running at http://localhost:3000
#   2. Integration seed applied (pnpm tsx prisma/seeds/integration-seed.ts)
#   3. Valid session cookie (or set AUTH_COOKIE below)
#
# Usage: bash scripts/integration-smoke-test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_COOKIE="${AUTH_COOKIE:-}"
PASS=0
FAIL=0
SKIP=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_pass() { ((PASS++)); echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { ((FAIL++)); echo -e "${RED}[FAIL]${NC} $1: $2"; }
log_skip() { ((SKIP++)); echo -e "${YELLOW}[SKIP]${NC} $1"; }

# Build curl options
CURL_OPTS=(-s -o /tmp/smoke-response.json -w "%{http_code}")
if [[ -n "$AUTH_COOKIE" ]]; then
  CURL_OPTS+=(-H "Cookie: $AUTH_COOKIE")
fi

echo "================================================"
echo " CDSS + Prevention Integration Smoke Test"
echo " Server: $BASE_URL"
echo "================================================"
echo ""

# -------------------------------------------------------
# Test 0: Server Health
# -------------------------------------------------------
echo "--- Test 0: Server Health ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" "$BASE_URL/api/health")
if [[ "$HTTP_CODE" == "200" ]]; then
  log_pass "Server is healthy"
else
  log_fail "Server health check" "HTTP $HTTP_CODE"
  echo "Is the dev server running at $BASE_URL?"
  exit 1
fi

# -------------------------------------------------------
# Test 1: POST /api/cds/evaluate (patient-view)
# -------------------------------------------------------
echo ""
echo "--- Test 1: CDS Evaluate (patient-view with screening gaps) ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" \
  -X POST "$BASE_URL/api/cds/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-smoke-001",
    "hookType": "patient-view",
    "context": {
      "patientId": "test-smoke-001",
      "demographics": {
        "age": 55,
        "gender": "male",
        "birthDate": "1971-01-01"
      },
      "labResults": [],
      "medications": [
        {"id": "m1", "name": "Rivaroxaban 20mg", "genericName": "rivaroxaban", "status": "active"},
        {"id": "m2", "name": "Aspirin 100mg", "genericName": "aspirin", "status": "active"}
      ]
    }
  }')

if [[ "$HTTP_CODE" == "200" ]]; then
  ALERTS=$(jq -r '.data.alerts | length' /tmp/smoke-response.json 2>/dev/null || echo "0")
  PREVENTION=$(jq -r '.data.prevention.screeningGaps // 0' /tmp/smoke-response.json 2>/dev/null || echo "0")
  log_pass "CDS evaluate returned HTTP 200 (alerts: $ALERTS, prevention gaps: $PREVENTION)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "CDS evaluate (auth required — set AUTH_COOKIE)"
else
  log_fail "CDS evaluate" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Test 2: POST /api/cds/attestation
# -------------------------------------------------------
echo ""
echo "--- Test 2: CDS Attestation Check ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" \
  -X POST "$BASE_URL/api/cds/attestation" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-smoke-001",
    "medication": "rivaroxaban",
    "creatinineClearance": 45,
    "labTimestamp": "2025-11-01T00:00:00Z"
  }')

if [[ "$HTTP_CODE" == "200" ]]; then
  ATTESTATION=$(jq -r '.attestationRequired // false' /tmp/smoke-response.json 2>/dev/null || echo "unknown")
  log_pass "CDS attestation returned HTTP 200 (attestationRequired: $ATTESTATION)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "CDS attestation (auth required)"
else
  log_fail "CDS attestation" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Test 3: GET /api/review-queue
# -------------------------------------------------------
echo ""
echo "--- Test 3: Review Queue ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" "$BASE_URL/api/review-queue")

if [[ "$HTTP_CODE" == "200" ]]; then
  ITEMS=$(jq -r '.data | length' /tmp/smoke-response.json 2>/dev/null || echo "0")
  log_pass "Review queue returned HTTP 200 (items: $ITEMS)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "Review queue (auth required)"
else
  log_fail "Review queue" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Test 4: POST /api/cds/override
# -------------------------------------------------------
echo ""
echo "--- Test 4: CDS Override ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" \
  -X POST "$BASE_URL/api/cds/override" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "drug-interaction-check",
    "severity": "FLAG",
    "reasonCode": "CLINICAL_JUDGMENT_PALLIATIVE_CARE",
    "patientId": "test-smoke-001",
    "notes": "Smoke test override"
  }')

if [[ "$HTTP_CODE" == "200" ]]; then
  EVENT_ID=$(jq -r '.eventId // "none"' /tmp/smoke-response.json 2>/dev/null || echo "none")
  log_pass "CDS override returned HTTP 200 (eventId: $EVENT_ID)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "CDS override (auth required)"
else
  log_fail "CDS override" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Test 5: GET /api/clinical-command/summary
# -------------------------------------------------------
echo ""
echo "--- Test 5: Clinical Command Center Summary ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" "$BASE_URL/api/clinical-command/summary")

if [[ "$HTTP_CODE" == "200" ]]; then
  RQ_PENDING=$(jq -r '.data.reviewQueue.pending // 0' /tmp/smoke-response.json 2>/dev/null || echo "0")
  GOV_24H=$(jq -r '.data.governanceFeed.last24h // 0' /tmp/smoke-response.json 2>/dev/null || echo "0")
  log_pass "Clinical Command summary returned HTTP 200 (reviewQueue.pending: $RQ_PENDING, governance.last24h: $GOV_24H)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "Clinical Command summary (auth required)"
else
  log_fail "Clinical Command summary" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Test 6: GET /api/cds/evaluate (API docs)
# -------------------------------------------------------
echo ""
echo "--- Test 6: CDS Evaluate API Docs ---"
HTTP_CODE=$(curl "${CURL_OPTS[@]}" "$BASE_URL/api/cds/evaluate")

if [[ "$HTTP_CODE" == "200" ]]; then
  RULES=$(jq -r '.currentRules | length' /tmp/smoke-response.json 2>/dev/null || echo "0")
  log_pass "CDS API docs returned HTTP 200 (registered rules: $RULES)"
elif [[ "$HTTP_CODE" == "401" ]]; then
  log_skip "CDS API docs (auth required)"
else
  log_fail "CDS API docs" "HTTP $HTTP_CODE"
fi

# -------------------------------------------------------
# Summary
# -------------------------------------------------------
echo ""
echo "================================================"
echo " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${SKIP} skipped${NC}"
echo "================================================"

# Clean up
rm -f /tmp/smoke-response.json

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

exit 0
