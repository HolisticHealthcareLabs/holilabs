#!/bin/bash
# Deployment Monitoring Script
# Monitors DigitalOcean App Platform deployment progress

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ID="$1"
MAX_WAIT_TIME=${2:-1800}  # Default: 30 minutes

if [ -z "$APP_ID" ]; then
  echo "Usage: $0 <app-id> [max-wait-seconds]"
  echo "Example: $0 abc123 1800"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed"
  exit 1
fi

# Get app name
APP_NAME=$(doctl apps get $APP_ID --format Spec.Name --no-header 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Could not get app information"
  echo "App ID: $APP_ID"
  exit 1
fi

echo "=========================================="
echo "  DEPLOYMENT MONITOR"
echo "=========================================="
echo "App: $APP_NAME"
echo "App ID: $APP_ID"
echo "Max wait time: $(($MAX_WAIT_TIME / 60)) minutes"
echo "Start time: $(date)"
echo "=========================================="
echo ""

# Get latest deployment
echo "Fetching latest deployment..."
DEPLOYMENT_ID=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -1)

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "Error: No deployments found for app $APP_ID"
  exit 1
fi

echo "Deployment ID: $DEPLOYMENT_ID"
echo ""

# Track deployment phases
START_TIME=$(date +%s)
LAST_PHASE=""
PHASE_START_TIME=$START_TIME

# Function to print phase transition
print_phase_transition() {
  local new_phase=$1
  local current_time=$(date +%s)
  local phase_duration=$((current_time - PHASE_START_TIME))

  if [ ! -z "$LAST_PHASE" ] && [ "$LAST_PHASE" != "$new_phase" ]; then
    echo ""
    echo -e "${GREEN}✓${NC} Phase completed: $LAST_PHASE (${phase_duration}s)"
    echo ""
  fi

  if [ "$LAST_PHASE" != "$new_phase" ]; then
    echo -e "${BLUE}▶${NC} Phase: $new_phase"
    LAST_PHASE=$new_phase
    PHASE_START_TIME=$current_time
  fi
}

# Monitor deployment
while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - START_TIME))

  # Check timeout
  if [ $ELAPSED_TIME -gt $MAX_WAIT_TIME ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⏰ DEPLOYMENT TIMEOUT${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Deployment exceeded maximum wait time of $(($MAX_WAIT_TIME / 60)) minutes"
    echo ""
    echo "Possible causes:"
    echo "- Build taking too long (optimize build process)"
    echo "- Deployment stuck (check DigitalOcean dashboard)"
    echo "- Health checks failing (check application logs)"
    echo ""
    echo "Next steps:"
    echo "1. Check deployment logs: doctl apps logs $APP_ID --follow"
    echo "2. Check DigitalOcean dashboard for details"
    echo "3. Consider cancelling deployment if stuck"
    echo ""
    exit 1
  fi

  # Get deployment status
  DEPLOYMENT_INFO=$(doctl apps get-deployment $APP_ID $DEPLOYMENT_ID --format Phase,Progress.Steps --no-header 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Could not get deployment status${NC}"
    sleep 10
    continue
  fi

  PHASE=$(echo "$DEPLOYMENT_INFO" | awk '{print $1}')
  print_phase_transition "$PHASE"

  # Check phase status
  case "$PHASE" in
    "PENDING_BUILD")
      echo -n "."
      ;;
    "BUILDING")
      echo -n "."
      ;;
    "PENDING_DEPLOY")
      echo -n "."
      ;;
    "DEPLOYING")
      echo -n "."
      ;;
    "ACTIVE")
      echo ""
      echo ""
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL${NC}"
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo ""
      echo "Total deployment time: $(($ELAPSED_TIME / 60))m $(($ELAPSED_TIME % 60))s"
      echo "Deployment ID: $DEPLOYMENT_ID"
      echo "App URL: https://$(doctl apps get $APP_ID --format DefaultIngress --no-header)"
      echo ""
      echo "Next steps:"
      echo "1. Run health checks: ./scripts/blue-green/health-check.sh <app-url>"
      echo "2. Run smoke tests: npm run test:smoke"
      echo "3. If all tests pass, switch traffic: ./scripts/blue-green/switch-traffic.sh"
      echo ""
      exit 0
      ;;
    "ERROR"|"FAILED"|"SUPERSEDED")
      echo ""
      echo ""
      echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
      echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo ""
      echo "Phase: $PHASE"
      echo "Deployment ID: $DEPLOYMENT_ID"
      echo ""
      echo "Check deployment logs:"
      echo "  doctl apps logs $APP_ID --type BUILD --follow"
      echo "  doctl apps logs $APP_ID --type DEPLOY --follow"
      echo ""

      # Get error details
      echo "Fetching error details..."
      ERROR_DETAILS=$(doctl apps get-deployment $APP_ID $DEPLOYMENT_ID --format Progress.ErrorSteps 2>/dev/null)

      if [ ! -z "$ERROR_DETAILS" ] && [ "$ERROR_DETAILS" != "0" ]; then
        echo ""
        echo "Error details:"
        echo "$ERROR_DETAILS"
      fi

      echo ""
      exit 1
      ;;
    *)
      echo -n "."
      ;;
  esac

  sleep 10
done
