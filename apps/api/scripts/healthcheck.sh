#!/bin/sh
#############################################################################
# Docker Health Check Script
#############################################################################
#
# This script is used by Docker's HEALTHCHECK instruction to verify
# the container is healthy and ready to serve traffic.
#
# Exit codes:
#   0 - Healthy
#   1 - Unhealthy
#
#############################################################################

set -e

# Configuration
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-3000}"
HEALTH_ENDPOINT="/health"
TIMEOUT=5

# Health check
if curl -f -s --max-time $TIMEOUT "http://${API_HOST}:${API_PORT}${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
  exit 0  # Healthy
else
  exit 1  # Unhealthy
fi
