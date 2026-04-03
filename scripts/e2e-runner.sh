#!/bin/bash

##############################################################################
# e2e-runner.sh - Automated E2E Test Orchestrator
# Purpose: Run Playwright E2E tests with configurable options (suite, browser)
# Handles dev server lifecycle and generates comprehensive test reports
##############################################################################

set -euo pipefail

# ============================================================================
# Configuration & Constants
# ============================================================================
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_SERVER_PORT=3000
DEV_SERVER_URL="http://localhost:${DEV_SERVER_PORT}"
MAX_WAIT_ATTEMPTS=30
WAIT_INTERVAL=2
PLAYWRIGHT_REPORT_DIR="${PROJECT_ROOT}/playwright-report"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ============================================================================
# Default Options
# ============================================================================
SUITE="all"
BROWSER="all"
HEADED_MODE=false
FIX_FAILURES=false

# ============================================================================
# Color Output
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Logging Functions
# ============================================================================
log_info() {
  echo -e "${BLUE}ℹ  $*${NC}"
}

log_success() {
  echo -e "${GREEN}✓  $*${NC}"
}

log_error() {
  echo -e "${RED}✗  $*${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠  $*${NC}"
}

# ============================================================================
# Parse Arguments
# ============================================================================
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --suite)
        if [[ -n "${2:-}" ]]; then
          SUITE="$2"
          shift 2
        else
          log_error "Missing value for --suite"
          usage
          exit 1
        fi
        ;;
      --browser)
        if [[ -n "${2:-}" ]]; then
          BROWSER="$2"
          shift 2
        else
          log_error "Missing value for --browser"
          usage
          exit 1
        fi
        ;;
      --headed)
        HEADED_MODE=true
        shift
        ;;
      --fix-and-retry)
        FIX_FAILURES=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

# ============================================================================
# Usage
# ============================================================================
usage() {
  cat <<EOF
Usage: ${BASH_SOURCE[0]} [OPTIONS]

Options:
  --suite SUITE              Test suite to run
                             Choices: all, auth, dashboard, portal, clinical, enterprise, public, a11y
                             Default: all

  --browser BROWSER          Browser to test with
                             Choices: all, chromium, firefox, webkit
                             Default: all

  --headed                   Run in headed mode (show browser window)
                             Default: false (headless)

  --fix-and-retry            Re-run failed tests once (requires custom reporter)
                             Default: false

  --help, -h                 Show this help message

Examples:
  # Run all tests on all browsers (headless)
  ${BASH_SOURCE[0]}

  # Run auth tests only on chromium in headed mode
  ${BASH_SOURCE[0]} --suite auth --browser chromium --headed

  # Run dashboard tests on all browsers
  ${BASH_SOURCE[0]} --suite dashboard

  # Run clinical tests on firefox
  ${BASH_SOURCE[0]} --suite clinical --browser firefox

EOF
}

# ============================================================================
# Check Prerequisites
# ============================================================================
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if Node.js is installed
  if ! command -v node &>/dev/null; then
    log_error "Node.js not found. Please install Node.js."
    exit 1
  fi
  log_success "Node.js found: $(node --version)"

  # Check if pnpm is installed
  if ! command -v pnpm &>/dev/null; then
    log_error "pnpm not found. Please install pnpm."
    exit 1
  fi
  log_success "pnpm found: $(pnpm --version)"

  # Check if Playwright is installed
  if [[ ! -d "${PROJECT_ROOT}/node_modules/@playwright" ]]; then
    log_warn "Playwright not installed. Running pnpm install..."
    cd "${PROJECT_ROOT}"
    pnpm install --frozen-lockfile || {
      log_error "pnpm install failed"
      exit 1
    }
  fi
  log_success "Playwright dependencies available"
}

# ============================================================================
# Check Dev Server
# ============================================================================
is_server_ready() {
  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "${DEV_SERVER_URL}" 2>/dev/null || echo "000")
  [[ "$status_code" == "200" || "$status_code" == "307" ]] # 307 for redirects
}

# ============================================================================
# Start Dev Server (if needed)
# ============================================================================
ensure_dev_server() {
  log_info "Checking dev server on port ${DEV_SERVER_PORT}..."

  if is_server_ready; then
    log_success "Dev server already running"
    return 0
  fi

  log_info "Dev server not running. Starting..."
  cd "${PROJECT_ROOT}"

  # Start dev server in background and capture its PID
  pnpm dev >/tmp/dev-server.log 2>&1 &
  DEV_SERVER_PID=$!
  export DEV_SERVER_PID

  # Wait for server to be ready
  log_info "Waiting for dev server to be ready (timeout: ${MAX_WAIT_ATTEMPTS}s)..."
  local attempt=0
  while [[ $attempt -lt $MAX_WAIT_ATTEMPTS ]]; do
    if is_server_ready; then
      log_success "Dev server ready at ${DEV_SERVER_URL}"
      return 0
    fi
    sleep "$WAIT_INTERVAL"
    ((attempt++))
  done

  log_error "Dev server failed to start. Check /tmp/dev-server.log"
  kill "$DEV_SERVER_PID" 2>/dev/null || true
  cat /tmp/dev-server.log
  exit 1
}

# ============================================================================
# Validate Suite & Browser Options
# ============================================================================
validate_options() {
  local valid_suites=("all" "auth" "dashboard" "portal" "clinical" "enterprise" "public" "a11y")
  local valid_browsers=("all" "chromium" "firefox" "webkit")

  if [[ ! " ${valid_suites[@]} " =~ " ${SUITE} " ]]; then
    log_error "Invalid suite: ${SUITE}"
    log_info "Valid suites: ${valid_suites[*]}"
    exit 1
  fi

  if [[ ! " ${valid_browsers[@]} " =~ " ${BROWSER} " ]]; then
    log_error "Invalid browser: ${BROWSER}"
    log_info "Valid browsers: ${valid_browsers[*]}"
    exit 1
  fi

  log_success "Options validated: suite=${SUITE}, browser=${BROWSER}, headed=${HEADED_MODE}"
}

# ============================================================================
# Build Playwright Command
# ============================================================================
build_playwright_command() {
  local cmd="pnpm exec playwright test"

  # Append grep filter for suite if not "all"
  if [[ "$SUITE" != "all" ]]; then
    cmd+=" --grep @${SUITE}"
  fi

  # Append project filter for browser if not "all"
  if [[ "$BROWSER" != "all" ]]; then
    cmd+=" --project=${BROWSER}"
  fi

  # Append headed flag if requested
  if [[ "$HEADED_MODE" == "true" ]]; then
    cmd+=" --headed"
  fi

  # Set reporter to html and json
  cmd+=" --reporter=html --reporter=json"

  echo "$cmd"
}

# ============================================================================
# Run Playwright Tests
# ============================================================================
run_tests() {
  log_info "Running E2E tests..."
  local cmd
  cmd=$(build_playwright_command)

  log_info "Command: $cmd"
  cd "${PROJECT_ROOT}"

  if eval "$cmd"; then
    return 0
  else
    return $?
  fi
}

# ============================================================================
# Parse Test Results
# ============================================================================
parse_test_results() {
  local json_report="${PROJECT_ROOT}/test-results/index.json"

  if [[ ! -f "$json_report" ]]; then
    log_warn "Test results JSON not found at $json_report"
    return
  fi

  # Extract stats using jq if available, otherwise basic grep
  if command -v jq &>/dev/null; then
    local total
    local passed
    local failed

    total=$(jq '.stats.expected + .stats.unexpected' "$json_report" 2>/dev/null || echo "?")
    passed=$(jq '.stats.expected' "$json_report" 2>/dev/null || echo "?")
    failed=$(jq '.stats.unexpected' "$json_report" 2>/dev/null || echo "?")

    echo ""
    log_success "Test Results Summary"
    echo "  Total:  $total"
    echo "  Passed: ${GREEN}$passed${NC}"
    echo "  Failed: ${RED}$failed${NC}"
  fi
}

# ============================================================================
# Generate HTML Report
# ============================================================================
generate_report() {
  local html_report="${PROJECT_ROOT}/playwright-report/index.html"

  if [[ -f "$html_report" ]]; then
    log_success "HTML report generated at:"
    echo "  ${html_report}"
    echo ""
    echo "  To view: open ${html_report}"
  fi
}

# ============================================================================
# Cleanup
# ============================================================================
cleanup() {
  log_info "Cleaning up..."

  # Kill dev server if we started it
  if [[ -n "${DEV_SERVER_PID:-}" ]]; then
    log_info "Stopping dev server (PID: ${DEV_SERVER_PID})..."
    kill "$DEV_SERVER_PID" 2>/dev/null || true
    wait "$DEV_SERVER_PID" 2>/dev/null || true
  fi
}

# ============================================================================
# Signal Handlers
# ============================================================================
trap cleanup EXIT INT TERM

# ============================================================================
# Main Execution
# ============================================================================
main() {
  echo ""
  log_info "=========================================="
  log_info "  E2E Test Runner - holilabsv2"
  log_info "=========================================="
  echo ""

  parse_arguments "$@"
  check_prerequisites
  validate_options
  ensure_dev_server

  # Run tests
  TEST_EXIT_CODE=0
  run_tests || TEST_EXIT_CODE=$?

  # Parse and display results
  echo ""
  parse_test_results
  generate_report

  echo ""
  if [[ $TEST_EXIT_CODE -eq 0 ]]; then
    log_success "All tests passed!"
    exit 0
  else
    log_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
    exit "$TEST_EXIT_CODE"
  fi
}

# Run main if script is executed directly
main "$@"
