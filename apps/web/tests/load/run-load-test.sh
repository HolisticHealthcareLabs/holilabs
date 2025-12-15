#!/bin/bash
# CDSS Load Test Runner
# Automates the setup and execution of CDSS performance tests

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_DURATION="${TEST_DURATION:-full}"  # full, quick, stress

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}CDSS Load Test Runner${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to print colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if k6 is installed
info "Checking for k6..."
if ! command -v k6 &> /dev/null; then
    error "k6 is not installed"
    echo ""
    echo "Install k6:"
    echo "  macOS:  brew install k6"
    echo "  Linux:  See https://k6.io/docs/get-started/installation/"
    echo "  Docker: docker pull grafana/k6"
    exit 1
fi
success "k6 found: $(k6 version | head -1)"

# Check if Redis is running
info "Checking Redis connection..."
if redis-cli -h localhost -p 6379 ping &> /dev/null; then
    success "Redis is running"
else
    warning "Redis is not running"
    echo ""
    echo "Start Redis:"
    echo "  macOS:  brew services start redis"
    echo "  Linux:  sudo systemctl start redis"
    echo "  Docker: docker run -d -p 6379:6379 redis:7-alpine"
    echo ""
    read -p "Continue without Redis? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if application is running
info "Checking application at $BASE_URL..."
if curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
    success "Application is running"
else
    error "Application is not responding at $BASE_URL"
    echo ""
    echo "Start the application:"
    echo "  cd apps/web"
    echo "  pnpm dev"
    echo ""
    echo "Or set a different BASE_URL:"
    echo "  BASE_URL=https://your-app.com $0"
    exit 1
fi

# Determine test configuration
case $TEST_DURATION in
    quick)
        info "Running quick smoke test (5 users, 1 minute)"
        TEST_ARGS="--vus 5 --duration 1m"
        ;;
    stress)
        info "Running stress test (200 users, 10 minutes)"
        TEST_ARGS="--vus 200 --duration 10m"
        ;;
    full|*)
        info "Running full load test (~17 minutes)"
        TEST_ARGS=""
        ;;
esac

# Get baseline metrics before test
info "Getting baseline metrics..."
BASELINE=$(curl -s "$BASE_URL/api/cds/metrics")
BASELINE_CACHE_HITS=$(echo "$BASELINE" | jq -r '.metrics.engine.cacheHits // 0')
BASELINE_EVALUATIONS=$(echo "$BASELINE" | jq -r '.metrics.engine.totalEvaluations // 0')

echo ""
echo -e "${BLUE}Baseline Metrics:${NC}"
echo "  Total Evaluations: $BASELINE_EVALUATIONS"
echo "  Cache Hits: $BASELINE_CACHE_HITS"
echo ""

# Run the load test
info "Starting load test..."
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RESULTS_DIR="$SCRIPT_DIR/results"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/load-test-$TIMESTAMP.json"
SUMMARY_FILE="$RESULTS_DIR/load-test-summary-$TIMESTAMP.json"

if k6 run $TEST_ARGS \
    --out "json=$RESULTS_FILE" \
    --summary-export="$SUMMARY_FILE" \
    "$SCRIPT_DIR/cdss-load-test.js"; then

    success "Load test completed successfully"
else
    error "Load test failed"
    exit 1
fi

echo ""

# Parse and display results
info "Parsing results..."
echo ""

if [ -f "$SUMMARY_FILE" ]; then
    P50=$(jq -r '.metrics.http_req_duration.values.med' "$SUMMARY_FILE")
    P95=$(jq -r '.metrics.http_req_duration.values.p95' "$SUMMARY_FILE")
    P99=$(jq -r '.metrics.http_req_duration.values.p99' "$SUMMARY_FILE")
    ERROR_RATE=$(jq -r '.metrics.http_req_failed.values.rate' "$SUMMARY_FILE")
    CACHE_HIT_RATE=$(jq -r '.metrics.cache_hits.values.rate // 0' "$SUMMARY_FILE")
    TOTAL_REQUESTS=$(jq -r '.metrics.http_reqs.values.count' "$SUMMARY_FILE")

    # Convert to percentages
    ERROR_RATE_PCT=$(echo "$ERROR_RATE * 100" | bc -l | awk '{printf "%.2f", $0}')
    CACHE_HIT_RATE_PCT=$(echo "$CACHE_HIT_RATE * 100" | bc -l | awk '{printf "%.1f", $0}')

    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}Load Test Results${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""

    # Response Times
    echo "Response Times:"
    echo "  p50 (median): ${P50}ms"

    if (( $(echo "$P95 < 2000" | bc -l) )); then
        echo -e "  p95: ${GREEN}${P95}ms${NC} (target: <2000ms) ✓"
    else
        echo -e "  p99: ${RED}${P95}ms${NC} (target: <2000ms) ✗"
    fi

    if (( $(echo "$P99 < 3000" | bc -l) )); then
        echo -e "  p99: ${GREEN}${P99}ms${NC} (target: <3000ms) ✓"
    else
        echo -e "  p99: ${YELLOW}${P99}ms${NC} (target: <3000ms) ⚠"
    fi

    echo ""

    # Error Rate
    echo "Reliability:"
    if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
        echo -e "  Error rate: ${GREEN}${ERROR_RATE_PCT}%${NC} (target: <1%) ✓"
    else
        echo -e "  Error rate: ${RED}${ERROR_RATE_PCT}%${NC} (target: <1%) ✗"
    fi
    echo "  Total requests: $TOTAL_REQUESTS"

    echo ""

    # Cache Performance
    echo "Cache Performance:"
    if (( $(echo "$CACHE_HIT_RATE > 0.7" | bc -l) )); then
        echo -e "  Cache hit rate: ${GREEN}${CACHE_HIT_RATE_PCT}%${NC} (target: >70%) ✓"
    else
        echo -e "  Cache hit rate: ${YELLOW}${CACHE_HIT_RATE_PCT}%${NC} (target: >70%) ⚠"
    fi

    echo ""

    # Overall Status
    if (( $(echo "$P95 < 2000" | bc -l) )) && (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
        echo -e "${GREEN}✓ All performance thresholds passed!${NC}"
    else
        echo -e "${RED}✗ Performance regression detected${NC}"
        echo ""
        echo "Recommendations:"
        if (( $(echo "$P95 > 2000" | bc -l) )); then
            echo "  • High latency detected - check database indexes and cache effectiveness"
        fi
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "  • High error rate - review application logs"
        fi
        if (( $(echo "$CACHE_HIT_RATE < 0.7" | bc -l) )); then
            echo "  • Low cache hit rate - consider increasing TTL or reviewing cache key logic"
        fi
    fi

    echo ""
    echo "Full results saved to:"
    echo "  $RESULTS_FILE"
    echo "  $SUMMARY_FILE"
else
    warning "Summary file not found - results may be incomplete"
fi

# Get final metrics
info "Getting final metrics..."
FINAL=$(curl -s "$BASE_URL/api/cds/metrics")
FINAL_CACHE_HITS=$(echo "$FINAL" | jq -r '.metrics.engine.cacheHits // 0')
FINAL_EVALUATIONS=$(echo "$FINAL" | jq -r '.metrics.engine.totalEvaluations // 0')
FINAL_HIT_RATE=$(echo "$FINAL" | jq -r '.metrics.engine.cacheHitRate // 0')

echo ""
echo "Final Metrics:"
echo "  Total Evaluations: $FINAL_EVALUATIONS (Δ $((FINAL_EVALUATIONS - BASELINE_EVALUATIONS)))"
echo "  Cache Hits: $FINAL_CACHE_HITS (Δ $((FINAL_CACHE_HITS - BASELINE_CACHE_HITS)))"
echo "  Cache Hit Rate: ${FINAL_HIT_RATE}%"
echo ""

echo -e "${BLUE}======================================${NC}"
success "Load test complete!"
echo -e "${BLUE}======================================${NC}"
