#!/bin/bash

#############################################################################
# Environment Variables Validation Script
#############################################################################
#
# Validates that all required environment variables are set before
# deployment or container startup.
#
# Usage:
#   ./scripts/check-env.sh
#
# Exit codes:
#   0 - All required variables are set
#   1 - One or more required variables are missing
#
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Required environment variables
REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
)

# Optional but recommended variables
RECOMMENDED_VARS=(
  "MEDPLUM_BASE_URL"
  "MEDPLUM_CLIENT_ID"
  "MEDPLUM_CLIENT_SECRET"
  "ENABLE_FHIR_SYNC"
)

echo ""
echo "🔍 Checking environment variables..."
echo ""

# Check required variables
missing_required=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗${NC} Missing required variable: $var"
    missing_required=1
  else
    echo -e "${GREEN}✓${NC} $var is set"
  fi
done

echo ""

# Check recommended variables
missing_recommended=0
for var in "${RECOMMENDED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}!${NC} Missing recommended variable: $var"
    missing_recommended=1
  else
    echo -e "${GREEN}✓${NC} $var is set"
  fi
done

echo ""

# Summary
if [ $missing_required -eq 0 ]; then
  echo -e "${GREEN}✓ All required environment variables are set${NC}"

  if [ $missing_recommended -eq 1 ]; then
    echo -e "${YELLOW}! Some recommended variables are missing (FHIR features may be disabled)${NC}"
  fi

  exit 0
else
  echo -e "${RED}✗ Missing required environment variables${NC}"
  echo ""
  echo "Set missing variables in your .env file or export them:"
  echo "  export DATABASE_URL=\"postgresql://user:pass@host:5432/dbname\""
  echo ""
  exit 1
fi
