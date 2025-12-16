#!/bin/bash

#
# HoliLabs k6 Load Testing Script
#
# Usage:
#   ./run-tests.sh [scenario] [environment] [duration]
#
# Examples:
#   ./run-tests.sh all staging
#   ./run-tests.sh login-surge production 5m
#   ./run-tests.sh api-stress local
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCENARIO="${1:-all}"
ENVIRONMENT="${2:-staging}"
DURATION="${3:-}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  HoliLabs Load Testing${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo ""
    echo "Install k6 with:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   See https://k6.io/docs/getting-started/installation/"
    echo "  Windows: choco install k6"
    exit 1
fi

echo -e "${GREEN}✓ k6 is installed ($(k6 version | head -1))${NC}"
echo ""

# Set environment URL
case $ENVIRONMENT in
    production)
        BASE_URL="https://holilabs.xyz"
        echo -e "${RED}⚠️  WARNING: Running tests against PRODUCTION${NC}"
        echo "Are you sure you want to continue? (yes/no)"
        read -r confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "Aborted."
            exit 0
        fi
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

echo -e "${BLUE}Environment:${NC} $ENVIRONMENT ($BASE_URL)"
echo -e "${BLUE}Scenario:${NC} $SCENARIO"
if [ -n "$DURATION" ]; then
    echo -e "${BLUE}Duration Override:${NC} $DURATION"
fi
echo ""

# Create results directory
mkdir -p k6/results

# API Key (load from .env or prompt)
if [ -z "$API_KEY" ]; then
    if [ -f ".env.test" ]; then
        export $(grep -v '^#' .env.test | xargs)
    else
        echo -e "${YELLOW}⚠️  API_KEY not set${NC}"
        echo "Some tests may fail without authentication."
        echo "Set API_KEY environment variable or create .env.test file"
        echo ""
    fi
fi

# Export environment variables for k6
export BASE_URL
export API_KEY

# Function to run a specific scenario
run_scenario() {
    local scenario_name=$1
    local scenario_file=$2
    local scenario_desc=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🚀 Running: ${scenario_desc}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    local k6_args=(
        "run"
        "$scenario_file"
        "--out" "json=k6/results/${scenario_name}.json"
    )

    if [ -n "$DURATION" ]; then
        k6_args+=("--duration" "$DURATION")
    fi

    if k6 "${k6_args[@]}"; then
        echo ""
        echo -e "${GREEN}✓ ${scenario_desc} completed${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠  ${scenario_desc} completed with issues${NC}"
    fi
    echo ""
}

# Run tests based on scenario
case $SCENARIO in
    all)
        run_scenario "login-surge" "k6/scenarios/01-login-surge.js" "Login Surge Test"
        run_scenario "appointment-booking" "k6/scenarios/02-appointment-booking-peak.js" "Appointment Booking Peak"
        run_scenario "soap-generation" "k6/scenarios/03-soap-note-generation.js" "SOAP Note Generation"
        run_scenario "portal-traffic" "k6/scenarios/04-patient-portal-traffic.js" "Patient Portal Traffic"
        run_scenario "api-stress" "k6/scenarios/05-api-stress-test.js" "API Stress Test"
        ;;
    login-surge)
        run_scenario "login-surge" "k6/scenarios/01-login-surge.js" "Login Surge Test"
        ;;
    appointment-booking)
        run_scenario "appointment-booking" "k6/scenarios/02-appointment-booking-peak.js" "Appointment Booking Peak"
        ;;
    soap-generation)
        run_scenario "soap-generation" "k6/scenarios/03-soap-note-generation.js" "SOAP Note Generation"
        ;;
    portal-traffic)
        run_scenario "portal-traffic" "k6/scenarios/04-patient-portal-traffic.js" "Patient Portal Traffic"
        ;;
    api-stress)
        run_scenario "api-stress" "k6/scenarios/05-api-stress-test.js" "API Stress Test"
        ;;
    *)
        echo -e "${RED}❌ Invalid scenario: $SCENARIO${NC}"
        echo ""
        echo "Valid scenarios:"
        echo "  - all (runs all scenarios)"
        echo "  - login-surge"
        echo "  - appointment-booking"
        echo "  - soap-generation"
        echo "  - portal-traffic"
        echo "  - api-stress"
        exit 1
        ;;
esac

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Load testing complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Results saved to: k6/results/"
echo ""
echo "To analyze results:"
echo "  - View JSON files in k6/results/"
echo "  - Use k6 Cloud for visualization (https://app.k6.io)"
echo "  - Integrate with Grafana/InfluxDB for real-time monitoring"
echo ""
