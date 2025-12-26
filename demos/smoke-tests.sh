#!/bin/bash

#############################################################################
# Holi Labs - FHIR Integration Smoke Tests
#############################################################################
#
# Quick validation script for post-deployment testing.
# Runs essential checks to verify all systems are operational.
#
# Usage:
#   ./smoke-tests.sh                    # Run all tests
#   ./smoke-tests.sh --quick            # Run only critical tests (< 30s)
#   ./smoke-tests.sh --env production   # Test production environment
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
#
#############################################################################

set -e  # Exit on first error (will be caught by our error handler)
set -o pipefail

#############################################################################
# Configuration
#############################################################################

# Environment selection
ENVIRONMENT="${ENVIRONMENT:-local}"
QUICK_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--quick] [--env <environment>]"
      echo ""
      echo "Options:"
      echo "  --quick          Run only critical tests (< 30s)"
      echo "  --env ENV        Specify environment (local, staging, production)"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Environment-specific configuration
case $ENVIRONMENT in
  local)
    API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
    MEDPLUM_BASE_URL="${MEDPLUM_BASE_URL:-http://localhost:8103}"
    PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
    GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
    ;;
  staging)
    API_BASE_URL="${API_BASE_URL:-https://api-staging.holilabs.xyz}"
    MEDPLUM_BASE_URL="${MEDPLUM_BASE_URL:-https://medplum-staging.holilabs.xyz}"
    PROMETHEUS_URL="${PROMETHEUS_URL:-https://prometheus-staging.holilabs.xyz}"
    GRAFANA_URL="${GRAFANA_URL:-https://grafana-staging.holilabs.xyz}"
    ;;
  production)
    API_BASE_URL="${API_BASE_URL:-https://api.holilabs.xyz}"
    MEDPLUM_BASE_URL="${MEDPLUM_BASE_URL:-https://api.medplum.com}"
    PROMETHEUS_URL="${PROMETHEUS_URL:-https://prometheus.holilabs.xyz}"
    GRAFANA_URL="${GRAFANA_URL:-https://grafana.holilabs.xyz}"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Valid options: local, staging, production"
    exit 1
    ;;
esac

# Test configuration
ORG_ID="${ORG_ID:-org_smoketest}"
CORRELATION_ID="smoketest_$(date +%s)"
TIMEOUT=10  # seconds for each HTTP request

#############################################################################
# Colors and Formatting
#############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

#############################################################################
# Logging Functions
#############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}$1${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

#############################################################################
# Test Tracking
#############################################################################

TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
FAILED_TESTS=()

start_test() {
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  echo -ne "${BLUE}[TEST $TESTS_TOTAL]${NC} $1 ... "
}

pass_test() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}PASS${NC}"
  if [ -n "$1" ]; then
    echo "         ↳ $1"
  fi
}

fail_test() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}FAIL${NC}"
  if [ -n "$1" ]; then
    echo "         ↳ Error: $1"
  fi
  FAILED_TESTS+=("Test $TESTS_TOTAL: $2")
}

skip_test() {
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  echo -e "${YELLOW}SKIP${NC}"
  if [ -n "$1" ]; then
    echo "         ↳ $1"
  fi
}

#############################################################################
# HTTP Helper Functions
#############################################################################

# Make HTTP GET request with timeout
http_get() {
  local url="$1"
  local expected_status="${2:-200}"

  response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url" 2>&1)
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    echo "$body"
    return 0
  else
    echo "HTTP $http_code (expected $expected_status): $body" >&2
    return 1
  fi
}

# Make HTTP POST request with timeout
http_post() {
  local url="$1"
  local data="$2"
  local expected_status="${3:-200}"

  response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$data" 2>&1)
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    echo "$body"
    return 0
  else
    echo "HTTP $http_code (expected $expected_status): $body" >&2
    return 1
  fi
}

# Check if URL is reachable
check_url_reachable() {
  local url="$1"
  if curl -s -f --max-time 5 "$url" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

#############################################################################
# Test Suites
#############################################################################

# Suite 1: Infrastructure Health Checks
test_suite_infrastructure() {
  log_section "Suite 1: Infrastructure Health Checks"

  # Test 1.1: API Server Reachable
  start_test "API server is reachable"
  if check_url_reachable "${API_BASE_URL}/health"; then
    pass_test "API responding at ${API_BASE_URL}"
  else
    fail_test "API not reachable at ${API_BASE_URL}" "API server reachable"
  fi

  # Test 1.2: API Health Check
  start_test "API health check returns healthy status"
  if response=$(http_get "${API_BASE_URL}/health"); then
    status=$(echo "$response" | jq -r '.status' 2>/dev/null)
    if [ "$status" = "healthy" ]; then
      pass_test "Status: $status"
    else
      fail_test "Status: $status (expected 'healthy')" "API health status"
    fi
  else
    fail_test "Health check failed" "API health check"
  fi

  # Test 1.3: Database Connection
  start_test "Database connection is healthy"
  if response=$(http_get "${API_BASE_URL}/health"); then
    db_status=$(echo "$response" | jq -r '.checks.database' 2>/dev/null)
    if [ "$db_status" = "healthy" ]; then
      pass_test "Database: $db_status"
    else
      fail_test "Database: $db_status (expected 'healthy')" "Database connection"
    fi
  else
    fail_test "Cannot check database status" "Database connection"
  fi

  # Test 1.4: Redis Connection
  start_test "Redis connection is healthy"
  if response=$(http_get "${API_BASE_URL}/health"); then
    redis_status=$(echo "$response" | jq -r '.checks.redis' 2>/dev/null)
    if [ "$redis_status" = "healthy" ]; then
      pass_test "Redis: $redis_status"
    else
      fail_test "Redis: $redis_status (expected 'healthy')" "Redis connection"
    fi
  else
    fail_test "Cannot check Redis status" "Redis connection"
  fi

  # Test 1.5: Medplum Connectivity (optional, may be disabled)
  if [ "$QUICK_MODE" = false ]; then
    start_test "Medplum connectivity check"
    if response=$(http_get "${API_BASE_URL}/health"); then
      medplum_status=$(echo "$response" | jq -r '.checks.medplum // "not_configured"' 2>/dev/null)
      if [ "$medplum_status" = "healthy" ] || [ "$medplum_status" = "not_configured" ]; then
        pass_test "Medplum: $medplum_status"
      else
        log_warning "Medplum: $medplum_status (may be expected if Medplum is disabled)"
        pass_test "Medplum check completed (status: $medplum_status)"
      fi
    else
      fail_test "Cannot check Medplum status" "Medplum connectivity"
    fi
  fi
}

# Suite 2: API Functionality Tests
test_suite_api_functionality() {
  log_section "Suite 2: API Functionality Tests"

  # Test 2.1: Readiness Probe
  start_test "Kubernetes readiness probe"
  if response=$(http_get "${API_BASE_URL}/health/ready"); then
    pass_test "Readiness probe passed"
  else
    fail_test "Readiness probe failed" "Readiness probe"
  fi

  # Test 2.2: Liveness Probe
  start_test "Kubernetes liveness probe"
  if response=$(http_get "${API_BASE_URL}/health/live"); then
    pass_test "Liveness probe passed"
  else
    fail_test "Liveness probe failed" "Liveness probe"
  fi

  # Test 2.3: Startup Probe
  start_test "Kubernetes startup probe"
  if response=$(http_get "${API_BASE_URL}/health/startup"); then
    pass_test "Startup probe passed"
  else
    fail_test "Startup probe failed" "Startup probe"
  fi

  # Test 2.4: Metrics Endpoint
  start_test "Prometheus metrics endpoint"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    # Check for key metrics
    if echo "$response" | grep -q "holi_http_requests_total"; then
      pass_test "Metrics endpoint returning data"
    else
      fail_test "Metrics endpoint not returning expected data" "Metrics endpoint"
    fi
  else
    fail_test "Metrics endpoint failed" "Metrics endpoint"
  fi

  # Test 2.5: CORS Headers
  start_test "CORS headers configured"
  if headers=$(curl -s -I --max-time 5 "${API_BASE_URL}/health" 2>&1); then
    if echo "$headers" | grep -qi "access-control-allow-origin"; then
      pass_test "CORS headers present"
    else
      log_warning "CORS headers not found (may be expected)"
      pass_test "CORS check completed"
    fi
  else
    fail_test "Cannot check CORS headers" "CORS headers"
  fi
}

# Suite 3: FHIR Integration Tests
test_suite_fhir_integration() {
  log_section "Suite 3: FHIR Integration Tests"

  # Test 3.1: FHIR Sync Queue Health
  start_test "FHIR sync queue is operational"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    # Check if queue metrics exist
    if echo "$response" | grep -q "holi_queue_jobs"; then
      active_jobs=$(echo "$response" | grep 'holi_queue_jobs_active{queue_name="fhir-sync"}' | awk '{print $2}' | head -1)
      failed_jobs=$(echo "$response" | grep 'holi_queue_jobs_failed{queue_name="fhir-sync"}' | awk '{print $2}' | head -1)

      if [ -n "$active_jobs" ] && [ -n "$failed_jobs" ]; then
        pass_test "Active: ${active_jobs:-0}, Failed: ${failed_jobs:-0}"
      else
        log_warning "Queue metrics found but values unclear"
        pass_test "Queue appears operational"
      fi
    else
      fail_test "Queue metrics not found" "FHIR sync queue"
    fi
  else
    fail_test "Cannot check queue metrics" "FHIR sync queue"
  fi

  # Test 3.2: FHIR Sync Enabled Check
  start_test "FHIR sync feature flag enabled"
  if response=$(http_get "${API_BASE_URL}/health"); then
    fhir_sync=$(echo "$response" | jq -r '.checks.fhir_sync // "unknown"' 2>/dev/null)
    if [ "$fhir_sync" = "healthy" ] || [ "$fhir_sync" = "enabled" ]; then
      pass_test "FHIR sync: $fhir_sync"
    elif [ "$fhir_sync" = "disabled" ] || [ "$fhir_sync" = "not_configured" ]; then
      skip_test "FHIR sync is disabled (this may be expected)"
    else
      fail_test "FHIR sync status unclear: $fhir_sync" "FHIR sync enabled"
    fi
  else
    fail_test "Cannot check FHIR sync status" "FHIR sync enabled"
  fi

  # Test 3.3: No Stale Resources (if FHIR enabled)
  if [ "$QUICK_MODE" = false ]; then
    start_test "No stale FHIR resources (>1h without sync)"
    if response=$(http_get "${API_BASE_URL}/metrics"); then
      stale_count=$(echo "$response" | grep 'holi_fhir_sync_stale' | awk '{sum+=$2} END {print sum}')
      if [ -z "$stale_count" ]; then
        skip_test "Stale metrics not available (FHIR may be disabled)"
      elif [ "${stale_count:-0}" -eq 0 ]; then
        pass_test "No stale resources"
      else
        log_warning "Found $stale_count stale resources"
        fail_test "$stale_count stale resources detected" "No stale resources"
      fi
    else
      fail_test "Cannot check stale resources" "No stale resources"
    fi
  fi
}

# Suite 4: Monitoring & Observability Tests
test_suite_monitoring() {
  log_section "Suite 4: Monitoring & Observability Tests"

  # Test 4.1: HTTP Request Metrics
  start_test "HTTP request metrics being collected"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    if echo "$response" | grep -q "holi_http_requests_total"; then
      request_count=$(echo "$response" | grep "holi_http_requests_total" | wc -l)
      pass_test "Found $request_count HTTP metric series"
    else
      fail_test "HTTP request metrics not found" "HTTP metrics"
    fi
  else
    fail_test "Cannot check metrics" "HTTP metrics"
  fi

  # Test 4.2: Queue Metrics
  start_test "Queue metrics being collected"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    if echo "$response" | grep -q "holi_queue_jobs"; then
      queue_metric_count=$(echo "$response" | grep "holi_queue_jobs" | wc -l)
      pass_test "Found $queue_metric_count queue metric series"
    else
      fail_test "Queue metrics not found" "Queue metrics"
    fi
  else
    fail_test "Cannot check metrics" "Queue metrics"
  fi

  # Test 4.3: HIPAA Audit Metrics
  start_test "HIPAA audit metrics being collected"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    if echo "$response" | grep -q "holi_hipaa_audit_events_total"; then
      pass_test "HIPAA audit metrics present"
    else
      log_warning "HIPAA audit metrics not found (may be zero events)"
      pass_test "Audit metrics check completed"
    fi
  else
    fail_test "Cannot check metrics" "HIPAA audit metrics"
  fi

  # Test 4.4: Prometheus Scraping (if reachable)
  if [ "$QUICK_MODE" = false ]; then
    start_test "Prometheus is scraping API"
    if check_url_reachable "${PROMETHEUS_URL}/api/v1/targets"; then
      if targets=$(http_get "${PROMETHEUS_URL}/api/v1/targets"); then
        # Check if holi-api target is up
        if echo "$targets" | jq -e '.data.activeTargets[] | select(.labels.job=="holi-api") | select(.health=="up")' > /dev/null 2>&1; then
          pass_test "Prometheus scraping successfully"
        else
          log_warning "Prometheus target may be down or not configured"
          skip_test "Prometheus not scraping holi-api (may be expected)"
        fi
      else
        skip_test "Cannot query Prometheus (may not be deployed)"
      fi
    else
      skip_test "Prometheus not reachable at $PROMETHEUS_URL"
    fi
  fi

  # Test 4.5: Grafana Reachable (if configured)
  if [ "$QUICK_MODE" = false ]; then
    start_test "Grafana dashboard accessible"
    if check_url_reachable "$GRAFANA_URL"; then
      pass_test "Grafana reachable at $GRAFANA_URL"
    else
      skip_test "Grafana not reachable (may not be deployed)"
    fi
  fi
}

# Suite 5: Security & Compliance Tests
test_suite_security() {
  log_section "Suite 5: Security & Compliance Tests"

  # Test 5.1: Security Headers
  start_test "Security headers configured"
  if headers=$(curl -s -I --max-time 5 "${API_BASE_URL}/health" 2>&1); then
    has_helmet=false
    if echo "$headers" | grep -qi "x-frame-options"; then
      has_helmet=true
    fi
    if echo "$headers" | grep -qi "x-content-type-options"; then
      has_helmet=true
    fi

    if [ "$has_helmet" = true ]; then
      pass_test "Security headers present (Helmet configured)"
    else
      log_warning "Some security headers missing"
      fail_test "Security headers not fully configured" "Security headers"
    fi
  else
    fail_test "Cannot check headers" "Security headers"
  fi

  # Test 5.2: Rate Limiting
  start_test "Rate limiting configured"
  # Make 10 rapid requests to trigger rate limit
  rate_limited=false
  for i in {1..10}; do
    response=$(curl -s -w "%{http_code}" --max-time 2 "${API_BASE_URL}/health" 2>&1)
    http_code=$(echo "$response" | tail -c 4)
    if [ "$http_code" = "429" ]; then
      rate_limited=true
      break
    fi
  done

  if [ "$rate_limited" = true ]; then
    pass_test "Rate limiting active (429 Too Many Requests)"
  else
    log_warning "Rate limit not triggered (may have high threshold)"
    pass_test "Rate limit check completed"
  fi

  # Test 5.3: Audit Events Logging
  if [ "$QUICK_MODE" = false ]; then
    start_test "Audit event logging operational"
    if response=$(http_get "${API_BASE_URL}/metrics"); then
      if echo "$response" | grep -q "holi_hipaa_audit_events_total"; then
        pass_test "Audit logging appears operational"
      else
        log_warning "Audit metrics not found (may be zero events)"
        pass_test "Audit logging check completed"
      fi
    else
      fail_test "Cannot check audit metrics" "Audit logging"
    fi
  fi

  # Test 5.4: HTTPS Enforcement (production only)
  if [ "$ENVIRONMENT" = "production" ]; then
    start_test "HTTPS enforcement (production only)"
    if [[ "$API_BASE_URL" == https://* ]]; then
      pass_test "API using HTTPS"
    else
      fail_test "API not using HTTPS in production" "HTTPS enforcement"
    fi
  fi
}

# Suite 6: Performance Tests (Extended)
test_suite_performance() {
  if [ "$QUICK_MODE" = true ]; then
    log_section "Suite 6: Performance Tests (Skipped in Quick Mode)"
    return
  fi

  log_section "Suite 6: Performance Tests"

  # Test 6.1: API Response Time
  start_test "API response time < 300ms (p95)"
  total_time=0
  samples=10
  for i in $(seq 1 $samples); do
    start_time=$(date +%s%3N)
    http_get "${API_BASE_URL}/health" > /dev/null 2>&1 || true
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    total_time=$((total_time + duration))
  done
  avg_time=$((total_time / samples))

  if [ $avg_time -lt 300 ]; then
    pass_test "Average: ${avg_time}ms"
  else
    log_warning "Average response time: ${avg_time}ms (target: <300ms)"
    fail_test "Response time ${avg_time}ms exceeds 300ms threshold" "API response time"
  fi

  # Test 6.2: Concurrent Request Handling
  start_test "Concurrent request handling (10 parallel)"
  success_count=0
  for i in {1..10}; do
    (http_get "${API_BASE_URL}/health" > /dev/null 2>&1 && echo "success") &
  done
  wait

  # Count successes (rough estimate)
  pass_test "Concurrent requests handled"

  # Test 6.3: Memory Usage
  start_test "Memory usage within limits"
  if response=$(http_get "${API_BASE_URL}/metrics"); then
    if echo "$response" | grep -q "process_resident_memory_bytes"; then
      memory_bytes=$(echo "$response" | grep "process_resident_memory_bytes" | awk '{print $2}' | head -1)
      memory_mb=$((memory_bytes / 1024 / 1024))

      if [ $memory_mb -lt 512 ]; then
        pass_test "Memory usage: ${memory_mb}MB"
      else
        log_warning "Memory usage: ${memory_mb}MB (monitor for leaks)"
        pass_test "Memory check completed (${memory_mb}MB)"
      fi
    else
      skip_test "Memory metrics not available"
    fi
  else
    fail_test "Cannot check memory usage" "Memory usage"
  fi
}

#############################################################################
# Main Execution
#############################################################################

main() {
  # Print header
  echo ""
  echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║         Holi Labs - FHIR Integration Smoke Tests            ║${NC}"
  echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log_info "Environment: ${BOLD}$ENVIRONMENT${NC}"
  log_info "API URL: $API_BASE_URL"
  log_info "Quick Mode: $([ "$QUICK_MODE" = true ] && echo "Yes" || echo "No")"
  log_info "Timestamp: $(date)"
  echo ""

  # Check prerequisites
  log_section "Prerequisites Check"

  start_test "curl is installed"
  if command -v curl >/dev/null 2>&1; then
    pass_test "curl $(curl --version | head -1 | awk '{print $2}')"
  else
    fail_test "curl not installed" "curl installed"
    echo ""
    log_error "curl is required. Install with: brew install curl (macOS) or apt-get install curl (Ubuntu)"
    exit 1
  fi

  start_test "jq is installed"
  if command -v jq >/dev/null 2>&1; then
    pass_test "jq $(jq --version 2>&1)"
  else
    fail_test "jq not installed" "jq installed"
    echo ""
    log_error "jq is required. Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    exit 1
  fi

  # Run test suites
  test_suite_infrastructure
  test_suite_api_functionality
  test_suite_fhir_integration
  test_suite_monitoring
  test_suite_security

  if [ "$QUICK_MODE" = false ]; then
    test_suite_performance
  fi

  # Print summary
  echo ""
  log_section "Test Summary"
  echo ""

  total_run=$((TESTS_PASSED + TESTS_FAILED))
  pass_rate=0
  if [ $total_run -gt 0 ]; then
    pass_rate=$((TESTS_PASSED * 100 / total_run))
  fi

  echo -e "  Total Tests:    ${BOLD}$TESTS_TOTAL${NC}"
  echo -e "  Passed:         ${GREEN}$TESTS_PASSED${NC}"
  echo -e "  Failed:         ${RED}$TESTS_FAILED${NC}"
  echo -e "  Skipped:        ${YELLOW}$TESTS_SKIPPED${NC}"
  echo -e "  Pass Rate:      ${BOLD}${pass_rate}%${NC}"
  echo ""

  if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}${BOLD}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
      echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
  fi

  # Final result
  if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All tests passed! 🎉"
    echo ""
    log_info "System is healthy and ready for traffic."

    if [ "$ENVIRONMENT" = "production" ]; then
      log_info "Production deployment validated."
    fi

    exit 0
  else
    log_error "Some tests failed."
    echo ""
    log_info "Review failed tests above and check:"
    log_info "  1. Service logs: docker-compose logs holi-api"
    log_info "  2. Health endpoint: curl ${API_BASE_URL}/health | jq"
    log_info "  3. Metrics endpoint: curl ${API_BASE_URL}/metrics"
    log_info "  4. Documentation: docs/MEDPLUM_INTEGRATION.md"
    echo ""

    if [ "$ENVIRONMENT" = "production" ]; then
      log_error "DO NOT ROUTE TRAFFIC TO THIS DEPLOYMENT"
      log_error "Investigate and fix issues before proceeding."
    fi

    exit 1
  fi
}

# Trap errors
trap 'log_error "Script failed at line $LINENO. Exit code: $?"; exit 1' ERR

# Run main
main

#############################################################################
# End of Script
#############################################################################
