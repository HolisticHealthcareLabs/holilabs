#!/bin/bash
# Emergency Rollback Script
# Instantly rolls back to the previous environment (blue/green switch)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LB_ID="${DO_LOAD_BALANCER_ID}"

if [ -z "$LB_ID" ]; then
  echo "Error: DO_LOAD_BALANCER_ID environment variable not set"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed"
  exit 1
fi

echo ""
echo "=========================================="
echo -e "  ${RED}EMERGENCY ROLLBACK${NC}"
echo "=========================================="
echo ""

# Get current active environment
echo "Determining current active environment..."
CURRENT_ACTIVE=$(./scripts/blue-green/get-active-environment.sh | tail -1)

# Determine rollback target
if [ "$CURRENT_ACTIVE" == "blue" ]; then
  ROLLBACK_TARGET="green"
elif [ "$CURRENT_ACTIVE" == "green" ]; then
  ROLLBACK_TARGET="blue"
else
  echo "Error: Could not determine current active environment"
  exit 1
fi

echo ""
echo "Current active: $CURRENT_ACTIVE"
echo "Rollback target: $ROLLBACK_TARGET"
echo ""

# Confirm rollback
echo -e "${YELLOW}⚠️  WARNING: This will immediately switch all production traffic${NC}"
echo ""
read -p "Are you sure you want to rollback to $ROLLBACK_TARGET? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Log rollback
ROLLBACK_LOG="/tmp/rollback-$(date +%Y%m%d-%H%M%S).log"
echo "Logging rollback to: $ROLLBACK_LOG"
exec > >(tee -a "$ROLLBACK_LOG") 2>&1

echo ""
echo "🚨 INITIATING EMERGENCY ROLLBACK"
echo "Time: $(date)"
echo ""

# Switch traffic
echo "🔄 Switching traffic from $CURRENT_ACTIVE to $ROLLBACK_TARGET..."

doctl compute load-balancer update $LB_ID \
  --tag-name "holi-production-$ROLLBACK_TARGET" \
  --droplet-tag "holi-production-$ROLLBACK_TARGET"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Rollback complete!${NC}"
  echo "🌐 Production now serving from: $ROLLBACK_TARGET"
else
  echo -e "${RED}❌ Rollback failed!${NC}"
  echo "CRITICAL: Manual intervention required!"
  echo "Please switch traffic manually in DigitalOcean dashboard"
  exit 1
fi

# Wait for traffic switch to propagate
echo ""
echo "⏳ Waiting 10 seconds for traffic switch to propagate..."
sleep 10

# Verify rollback
echo ""
echo "🔍 Verifying rollback..."

# Run health checks
echo ""
./scripts/blue-green/health-check.sh https://api.holilabs.xyz

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ ROLLBACK VERIFIED - PRODUCTION IS HEALTHY${NC}"
  echo ""
  echo "=========================================="
  echo "  POST-ROLLBACK ACTIONS"
  echo "=========================================="
  echo "1. Monitor production for next 30 minutes"
  echo "2. Investigate root cause of issue"
  echo "3. Fix issue in $CURRENT_ACTIVE environment"
  echo "4. Test thoroughly before next deployment"
  echo "5. Document incident in /docs/incidents/"
  echo "=========================================="
else
  echo ""
  echo -e "${RED}❌ ROLLBACK VERIFICATION FAILED${NC}"
  echo ""
  echo "CRITICAL: Production may still have issues!"
  echo ""
  echo "Immediate actions:"
  echo "1. Check application logs: doctl apps logs <app-id> --follow"
  echo "2. Verify database connectivity"
  echo "3. Check for configuration issues"
  echo "4. Consider manual intervention"
  echo ""
  echo "Escalation:"
  echo "- Notify on-call engineer immediately"
  echo "- Open war room if needed"
  echo "- Follow incident response runbook"
  echo ""
  exit 1
fi

echo ""
echo "Rollback log saved to: $ROLLBACK_LOG"
echo ""
