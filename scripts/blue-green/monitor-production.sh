#!/bin/bash
# Production Monitoring Script
# Continuously monitors production health after deployment or traffic switch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://api.holilabs.xyz}"
MONITOR_DURATION=${1:-300}  # Default: 5 minutes (300 seconds)
CHECK_INTERVAL=${2:-30}     # Default: 30 seconds

echo "=========================================="
echo "  PRODUCTION MONITORING"
echo "=========================================="
echo "URL: $PRODUCTION_URL"
echo "Duration: ${MONITOR_DURATION}s ($(($MONITOR_DURATION / 60)) minutes)"
echo "Check interval: ${CHECK_INTERVAL}s"
echo "Start time: $(date)"
echo "=========================================="
echo ""

# Track metrics
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Calculate end time
START_TIME=$(date +%s)
END_TIME=$((START_TIME + MONITOR_DURATION))

# Function to check health
check_health() {
  local check_num=$1

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "Check $check_num - $(date)"
  echo ""

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # Basic health check
  echo -n "Health endpoint... "
  HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 "$PRODUCTION_URL/api/health" 2>/dev/null)
  HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)

  if [ "$HEALTH_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $HEALTH_CODE)"
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $HEALTH_CODE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Database health
  echo -n "Database... "
  DB_RESPONSE=$(curl -s --max-time 10 "$PRODUCTION_URL/api/health/db" 2>/dev/null)

  if echo "$DB_RESPONSE" | grep -q '"healthy":true'; then
    DB_LATENCY=$(echo "$DB_RESPONSE" | grep -o '"latency":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ OK${NC} (${DB_LATENCY}ms)"
  else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Redis health
  echo -n "Redis... "
  REDIS_RESPONSE=$(curl -s --max-time 10 "$PRODUCTION_URL/api/health/redis" 2>/dev/null)

  if echo "$REDIS_RESPONSE" | grep -q '"healthy":true'; then
    REDIS_LATENCY=$(echo "$REDIS_RESPONSE" | grep -o '"latency":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ OK${NC} (${REDIS_LATENCY}ms)"
  else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Response time test
  echo -n "Response time... "
  START=$(date +%s%3N)
  curl -s --max-time 10 "$PRODUCTION_URL/api/health" > /dev/null 2>&1
  END=$(date +%s%3N)
  RESPONSE_TIME=$((END - START))

  if [ "$RESPONSE_TIME" -lt 500 ]; then
    echo -e "${GREEN}✓ GOOD${NC} (${RESPONSE_TIME}ms)"
  elif [ "$RESPONSE_TIME" -lt 1000 ]; then
    echo -e "${YELLOW}⚠ SLOW${NC} (${RESPONSE_TIME}ms)"
  else
    echo -e "${RED}✗ TOO SLOW${NC} (${RESPONSE_TIME}ms)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Calculate success rate
  if [ "$FAILED_CHECKS" -eq 0 ]; then
    PASSED_CHECKS=$TOTAL_CHECKS
    echo ""
    echo -e "Status: ${GREEN}All checks passing${NC}"
  else
    PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo ""
    echo -e "Status: ${YELLOW}$FAILED_CHECKS failures detected${NC} (${SUCCESS_RATE}% success rate)"
  fi

  echo ""
}

# Monitor continuously
CHECK_NUM=1

while [ $(date +%s) -lt $END_TIME ]; do
  check_health $CHECK_NUM
  CHECK_NUM=$((CHECK_NUM + 1))

  # Check if we should stop (high failure rate)
  if [ "$TOTAL_CHECKS" -gt 3 ] && [ "$FAILED_CHECKS" -gt $((TOTAL_CHECKS / 2)) ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  HIGH FAILURE RATE DETECTED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Failure rate: $((FAILED_CHECKS * 100 / TOTAL_CHECKS))%"
    echo "Failed checks: $FAILED_CHECKS / $TOTAL_CHECKS"
    echo ""
    echo -e "${YELLOW}RECOMMENDATION: ROLLBACK IMMEDIATELY${NC}"
    echo ""
    echo "To rollback:"
    echo "  ./scripts/blue-green/rollback.sh"
    echo ""
    exit 1
  fi

  # Wait for next check (unless we're at the end)
  CURRENT_TIME=$(date +%s)
  if [ $CURRENT_TIME -lt $END_TIME ]; then
    TIME_REMAINING=$((END_TIME - CURRENT_TIME))
    NEXT_CHECK=$(($CHECK_INTERVAL < $TIME_REMAINING ? $CHECK_INTERVAL : $TIME_REMAINING))

    if [ $NEXT_CHECK -gt 0 ]; then
      echo "Next check in ${NEXT_CHECK}s..."
      echo ""
      sleep $NEXT_CHECK
    fi
  fi
done

# Final summary
echo "=========================================="
echo "  MONITORING COMPLETE"
echo "=========================================="
echo "Duration: $(($MONITOR_DURATION / 60)) minutes"
echo "Total checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $FAILED_CHECKS"

if [ "$FAILED_CHECKS" -eq 0 ]; then
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo "Success rate: ${SUCCESS_RATE}%"
echo "End time: $(date)"
echo "=========================================="
echo ""

if [ "$SUCCESS_RATE" -eq 100 ]; then
  echo -e "${GREEN}✅ PRODUCTION IS HEALTHY${NC}"
  echo ""
  echo "All health checks passed during monitoring period."
  echo "Deployment appears successful."
  echo ""
elif [ "$SUCCESS_RATE" -ge 95 ]; then
  echo -e "${YELLOW}⚠️  MOSTLY HEALTHY WITH MINOR ISSUES${NC}"
  echo ""
  echo "Most health checks passed, but some failures detected."
  echo "Continue monitoring and investigate any patterns."
  echo ""
elif [ "$SUCCESS_RATE" -ge 80 ]; then
  echo -e "${YELLOW}⚠️  DEGRADED PERFORMANCE${NC}"
  echo ""
  echo "Significant number of health check failures."
  echo "Investigate logs and consider rollback if issues persist."
  echo ""
else
  echo -e "${RED}❌ PRODUCTION IS UNHEALTHY${NC}"
  echo ""
  echo "High failure rate detected during monitoring."
  echo -e "${RED}IMMEDIATE ACTION REQUIRED${NC}"
  echo ""
  echo "Recommended actions:"
  echo "1. Rollback immediately: ./scripts/blue-green/rollback.sh"
  echo "2. Check application logs"
  echo "3. Investigate root cause"
  echo ""
  exit 1
fi

echo "Next steps:"
echo "1. Continue monitoring via Grafana/DataDog"
echo "2. Check error logs for any anomalies"
echo "3. Monitor business metrics (user activity, etc.)"
echo ""
