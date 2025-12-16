#!/bin/bash

#
# Test Monitoring Setup Script
#
# Tests all monitoring endpoints and configurations
#
# Usage:
#   ./scripts/test-monitoring.sh [environment]
#
# Examples:
#   ./scripts/test-monitoring.sh production
#   ./scripts/test-monitoring.sh staging
#   ./scripts/test-monitoring.sh local
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT="${1:-production}"

# Set base URL based on environment
case $ENVIRONMENT in
    production)
        BASE_URL="https://holilabs.xyz"
        ;;
    staging)
        BASE_URL="https://staging.holilabs.xyz"
        ;;
    local)
        BASE_URL="http://localhost:3000"
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        echo "Valid options: production, staging, local"
        exit 1
        ;;
esac

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing Monitoring Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo -e "${BLUE}Base URL:${NC} $BASE_URL"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local keyword=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}Testing:${NC} $name"
    echo -e "  URL: $url"

    # Make request
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "failed\n000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # Check status code
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "  ${GREEN}✓${NC} Status code: $http_code"
    else
        echo -e "  ${RED}✗${NC} Status code: $http_code (expected: $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi

    # Check for keyword if provided
    if [ -n "$keyword" ]; then
        if echo "$body" | grep -q "$keyword"; then
            echo -e "  ${GREEN}✓${NC} Keyword found: '$keyword'"
        else
            echo -e "  ${RED}✗${NC} Keyword not found: '$keyword'"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    fi

    # Parse JSON if available
    if command -v jq &> /dev/null && echo "$body" | jq empty 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Valid JSON response"
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✓ PASSED${NC}"
    echo ""
    return 0
}

# Test basic health check
test_endpoint "Basic Health Check" "$BASE_URL/api/health" 200 "healthy"

# Test metrics endpoint
echo -e "${BLUE}Testing:${NC} Detailed Metrics"
echo -e "  URL: $BASE_URL/api/health/metrics"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

response=$(curl -s "$BASE_URL/api/health/metrics" 2>/dev/null || echo "{}")

if command -v jq &> /dev/null; then
    memory_pct=$(echo "$response" | jq -r '.memory.percentage // "N/A"')
    db_latency=$(echo "$response" | jq -r '.database.latency // "N/A"')
    alert_count=$(echo "$response" | jq -r '.alerts | length' 2>/dev/null || echo "0")
    db_healthy=$(echo "$response" | jq -r '.database.healthy')

    echo -e "  ${GREEN}✓${NC} Memory usage: $memory_pct%"
    echo -e "  ${GREEN}✓${NC} DB latency: ${db_latency}ms"
    echo -e "  ${GREEN}✓${NC} Active alerts: $alert_count"

    if [ "$db_healthy" == "true" ]; then
        echo -e "  ${GREEN}✓${NC} Database: Healthy"
    else
        echo -e "  ${YELLOW}⚠${NC} Database: Unhealthy"
    fi

    # Check thresholds
    if [ "$memory_pct" != "N/A" ]; then
        memory_int=$(echo "$memory_pct" | cut -d'.' -f1)
        if [ "$memory_int" -gt 85 ]; then
            echo -e "  ${YELLOW}⚠${NC} Memory usage is high (>85%)"
        fi
    fi

    if [ "$db_latency" != "N/A" ] && [ "$db_latency" != "null" ]; then
        db_latency_int=$(echo "$db_latency" | cut -d'.' -f1)
        if [ "$db_latency_int" -gt 500 ]; then
            echo -e "  ${YELLOW}⚠${NC} Database latency is high (>500ms)"
        fi
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✓ PASSED${NC}"
else
    echo -e "  ${YELLOW}⚠${NC} jq not installed, skipping JSON parsing"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Test liveness probe
test_endpoint "Liveness Probe" "$BASE_URL/api/health/live" 200

# Test readiness probe
test_endpoint "Readiness Probe" "$BASE_URL/api/health/ready" 200

# Test monitoring status
test_endpoint "Monitoring Status" "$BASE_URL/api/monitoring-status" 200

# Test main site
echo -e "${BLUE}Testing:${NC} Main Site"
echo -e "  URL: $BASE_URL"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

response=$(curl -s -w "\n%{http_code}" "$BASE_URL" 2>/dev/null || echo "failed\n000")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "200" ]; then
    echo -e "  ${GREEN}✓${NC} Main site is accessible"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✓ PASSED${NC}"
else
    echo -e "  ${RED}✗${NC} Main site returned status: $http_code"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test patient portal (allows 200 or 401)
echo -e "${BLUE}Testing:${NC} Patient Portal"
echo -e "  URL: $BASE_URL/portal/dashboard"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

response=$(curl -s -w "\n%{http_code}" "$BASE_URL/portal/dashboard" 2>/dev/null || echo "failed\n000")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "200" ] || [ "$http_code" == "401" ]; then
    echo -e "  ${GREEN}✓${NC} Portal is accessible (status: $http_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✓ PASSED${NC}"
else
    echo -e "  ${RED}✗${NC} Portal returned unexpected status: $http_code"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ "$FAILED_TESTS" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
else
    echo -e "Failed: 0"
fi
echo ""

# Pass/fail status
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your monitoring setup is working correctly!"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please review the failed tests above and investigate."
    exit 1
fi
