#!/bin/bash
# Get Active Environment Script
# Determines which environment (blue or green) is currently serving production traffic

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LB_ID="${DO_LOAD_BALANCER_ID}"

if [ -z "$LB_ID" ]; then
  echo "Error: DO_LOAD_BALANCER_ID environment variable not set"
  echo "Please set it in your .env file or export it:"
  echo "  export DO_LOAD_BALANCER_ID=<your-load-balancer-id>"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed"
  echo "Install with: brew install doctl"
  exit 1
fi

# Get load balancer tags
echo "Checking load balancer tags..."
TAGS=$(doctl compute load-balancer get $LB_ID --format Tag --no-header 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Failed to get load balancer information"
  echo "Load Balancer ID: $LB_ID"
  exit 1
fi

# Determine active environment from tags
if echo "$TAGS" | grep -q "holi-production-blue"; then
  ACTIVE="blue"
  COLOR=$BLUE
elif echo "$TAGS" | grep -q "holi-production-green"; then
  ACTIVE="green"
  COLOR=$GREEN
else
  echo "Error: Could not determine active environment from tags: $TAGS"
  exit 1
fi

# Output active environment
echo -e "${COLOR}Active environment: $ACTIVE${NC}"

# Return just the environment name (for use in other scripts)
echo "$ACTIVE"
