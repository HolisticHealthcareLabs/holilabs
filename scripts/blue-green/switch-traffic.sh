#!/bin/bash
# Traffic Switch Script
# Switches production traffic between blue and green environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LB_ID="${DO_LOAD_BALANCER_ID}"
TARGET_ENV="$1"

# Validate input
if [ -z "$TARGET_ENV" ]; then
  echo "Usage: $0 [blue|green]"
  exit 1
fi

if [ "$TARGET_ENV" != "blue" ] && [ "$TARGET_ENV" != "green" ]; then
  echo "Error: Target environment must be 'blue' or 'green'"
  exit 1
fi

if [ -z "$LB_ID" ]; then
  echo "Error: DO_LOAD_BALANCER_ID environment variable not set"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed"
  exit 1
fi

# Get current active environment
echo "Determining current active environment..."
CURRENT_ACTIVE=$(./scripts/blue-green/get-active-environment.sh | tail -1)

if [ "$CURRENT_ACTIVE" == "$TARGET_ENV" ]; then
  echo -e "${YELLOW}⚠️  Target environment '$TARGET_ENV' is already active${NC}"
  echo "No traffic switch needed."
  exit 0
fi

echo ""
echo "=========================================="
echo "  TRAFFIC SWITCH SUMMARY"
echo "=========================================="
echo -e "From: ${BLUE}$CURRENT_ACTIVE${NC}"
echo -e "To:   ${GREEN}$TARGET_ENV${NC}"
echo "=========================================="
echo ""

# Confirm switch
read -p "Are you sure you want to switch traffic? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Traffic switch cancelled"
  exit 0
fi

# Switch traffic
echo ""
echo "🔄 Switching traffic to $TARGET_ENV..."

# Update load balancer tag
doctl compute load-balancer update $LB_ID \
  --tag-name "holi-production-$TARGET_ENV" \
  --droplet-tag "holi-production-$TARGET_ENV"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Traffic switch successful!${NC}"
  echo ""
  echo "🌐 Production is now serving from: $TARGET_ENV"
  echo ""
else
  echo -e "${RED}❌ Traffic switch failed!${NC}"
  echo "Please check load balancer configuration manually"
  exit 1
fi

# Wait for DNS propagation
echo "⏳ Waiting 10 seconds for traffic switch to propagate..."
sleep 10

# Verify switch
echo ""
echo "🔍 Verifying traffic switch..."

VERIFICATION_ATTEMPTS=0
MAX_ATTEMPTS=5

while [ $VERIFICATION_ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  CURRENT_TAG=$(doctl compute load-balancer get $LB_ID --format Tag --no-header)

  if echo "$CURRENT_TAG" | grep -q "holi-production-$TARGET_ENV"; then
    echo -e "${GREEN}✅ Traffic switch verified${NC}"
    break
  else
    VERIFICATION_ATTEMPTS=$((VERIFICATION_ATTEMPTS + 1))
    echo "Verification attempt $VERIFICATION_ATTEMPTS/$MAX_ATTEMPTS..."
    sleep 2
  fi
done

if [ $VERIFICATION_ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo -e "${YELLOW}⚠️  Could not verify traffic switch${NC}"
  echo "Please verify manually: doctl compute load-balancer get $LB_ID"
fi

echo ""
echo "=========================================="
echo "  NEXT STEPS"
echo "=========================================="
echo "1. Monitor production for 5-10 minutes:"
echo "   ./scripts/blue-green/monitor-production.sh"
echo ""
echo "2. If issues occur, rollback immediately:"
echo "   ./scripts/blue-green/rollback.sh"
echo ""
echo "3. Check application metrics:"
echo "   - Error rate should be < 1%"
echo "   - Response time p95 < 500ms"
echo "   - No unusual spikes in traffic"
echo "=========================================="
