#!/bin/bash
# Health Check Script
# Runs comprehensive health checks against a target environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="$1"
TIMEOUT=10

if [ -z "$TARGET_URL" ]; then
  echo "Usage: $0 <target-url>"
  echo "Example: $0 https://api.holilabs.xyz"
  exit 1
fi

# Remove trailing slash
TARGET_URL="${TARGET_URL%/}"

echo "=========================================="
echo "  HEALTH CHECK REPORT"
echo "=========================================="
echo "Target: $TARGET_URL"
echo "Time: $(date)"
echo "=========================================="
echo ""

# Track overall status
ALL_PASSED=true

# Function to run health check
check_endpoint() {
  local endpoint=$1
  local description=$2
  local expected_status=${3:-200}

  echo -n "Checking $description... "

  # Make request with timeout
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$TARGET_URL$endpoint" 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ FAILED${NC} (Connection timeout or error)"
    ALL_PASSED=false
    return 1
  fi

  # Extract HTTP status code (last line)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $HTTP_CODE)"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    ALL_PASSED=false
    return 1
  fi
}

# Function to check JSON response
check_json_field() {
  local endpoint=$1
  local description=$2
  local field=$3
  local expected_value=$4

  echo -n "Checking $description... "

  RESPONSE=$(curl -s --max-time $TIMEOUT "$TARGET_URL$endpoint" 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ FAILED${NC} (Connection timeout or error)"
    ALL_PASSED=false
    return 1
  fi

  # Check if field matches expected value
  if echo "$RESPONSE" | grep -q "\"$field\":$expected_value"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    return 0
  elif echo "$RESPONSE" | grep -q "\"$field\":\"$expected_value\""; then
    echo -e "${GREEN}✓ PASSED${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ALL_PASSED=false
    return 1
  fi
}

# Run health checks

echo "1. BASIC HEALTH CHECKS"
echo "─────────────────────────────────────"
check_endpoint "/api/health" "Basic health endpoint" 200
check_json_field "/api/health" "Health status is 'ok'" "status" "ok"
echo ""

echo "2. DATABASE HEALTH CHECKS"
echo "─────────────────────────────────────"
check_endpoint "/api/health/db" "Database connectivity" 200
check_json_field "/api/health/db" "Database is healthy" "healthy" true

# Check database latency
DB_RESPONSE=$(curl -s --max-time $TIMEOUT "$TARGET_URL/api/health/db" 2>/dev/null)
DB_LATENCY=$(echo "$DB_RESPONSE" | grep -o '"latency":[0-9]*' | cut -d':' -f2)

if [ ! -z "$DB_LATENCY" ]; then
  echo -n "Database latency... "
  if [ "$DB_LATENCY" -lt 1000 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (${DB_LATENCY}ms)"
  elif [ "$DB_LATENCY" -lt 2000 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (${DB_LATENCY}ms - slower than expected)"
  else
    echo -e "${RED}✗ FAILED${NC} (${DB_LATENCY}ms - too slow)"
    ALL_PASSED=false
  fi
fi

echo ""

echo "3. REDIS HEALTH CHECKS"
echo "─────────────────────────────────────"
check_endpoint "/api/health/redis" "Redis connectivity" 200
check_json_field "/api/health/redis" "Redis is healthy" "healthy" true

# Check Redis latency
REDIS_RESPONSE=$(curl -s --max-time $TIMEOUT "$TARGET_URL/api/health/redis" 2>/dev/null)
REDIS_LATENCY=$(echo "$REDIS_RESPONSE" | grep -o '"latency":[0-9]*' | cut -d':' -f2)

if [ ! -z "$REDIS_LATENCY" ]; then
  echo -n "Redis latency... "
  if [ "$REDIS_LATENCY" -lt 100 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (${REDIS_LATENCY}ms)"
  elif [ "$REDIS_LATENCY" -lt 500 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (${REDIS_LATENCY}ms - slower than expected)"
  else
    echo -e "${RED}✗ FAILED${NC} (${REDIS_LATENCY}ms - too slow)"
    ALL_PASSED=false
  fi
fi

echo ""

echo "4. APPLICATION ENDPOINTS"
echo "─────────────────────────────────────"
check_endpoint "/api" "API root" 200
check_endpoint "/login" "Login page" 200

echo ""

# Overall summary
echo "=========================================="
if [ "$ALL_PASSED" = true ]; then
  echo -e "${GREEN}✅ ALL HEALTH CHECKS PASSED${NC}"
  echo "=========================================="
  exit 0
else
  echo -e "${RED}❌ SOME HEALTH CHECKS FAILED${NC}"
  echo "=========================================="
  echo ""
  echo "⚠️  DO NOT PROCEED WITH DEPLOYMENT"
  echo "Review failed checks above and fix issues before continuing."
  echo ""
  exit 1
fi
