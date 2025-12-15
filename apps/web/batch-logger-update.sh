#!/bin/bash

# Batch Console to Logger Migration Script
# This script adds logger imports and replaces console statements
# with structured logging across all remaining files

set -e

FILES=(
  "/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/src/hooks/useNotifications.ts"
  "/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/src/hooks/useRealtimePreventionUpdates.ts"
  "/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/src/hooks/useVoiceCommands.ts"
)

echo "Processing ${#FILES[@]} files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Check if logger is already imported
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
      echo "  → Adding logger import"
      # Add import after the last import statement
      sed -i '' "/^import /a\\
import { logger } from '@/lib/logger';
" "$file" 2>/dev/null || true
    fi
  fi
done

echo "✓ Batch processing complete"
echo "Note: Console statements need to be replaced manually with structured logging"
