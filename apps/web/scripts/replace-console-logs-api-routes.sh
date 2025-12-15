#!/bin/bash

# Script to replace console.error/log/warn with structured logger in API routes
# Usage: ./scripts/replace-console-logs-api-routes.sh

set -e

API_DIR="/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/src/app/api"
COUNT=0

echo "Replacing console statements with structured logger in API routes..."

# Find all route.ts files
find "$API_DIR" -name "route.ts" -type f | while read -r file; do
  # Check if file already imports logger
  if grep -q "from '@/lib/logger'" "$file"; then
    # Logger already imported, skip adding import
    :
  else
    # Check if file has console statements
    if grep -qE "console\.(error|log|warn)" "$file"; then
      # Add logger import after other imports
      if grep -q "import.*from 'next/server'" "$file"; then
        # Add after next/server import
        sed -i '' "/import.*from 'next\/server'/a\\
import { logger } from '@/lib/logger';
" "$file"
        echo "✓ Added logger import to: $file"
        COUNT=$((COUNT + 1))
      fi
    fi
  fi
done

echo ""
echo "Processed $COUNT files"
echo "Note: You still need to manually replace console.* calls with logger.* calls"
echo "Run: grep -r 'console\.(error|log|warn)' src/app/api --include='*.ts' to find remaining instances"
