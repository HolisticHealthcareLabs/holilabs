#!/bin/bash

# Script to replace console.log/error/warn with structured logging
# Agent 13 - Batch 1 (First 83 files)

set -e

echo "🔧 Starting console.log replacement for Batch 1..."

WEBROOT="/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/src"
LOGGER_IMPORT="import { logger } from '@/lib/logger';"

# Counter
FILES_PROCESSED=0
TOTAL_REPLACEMENTS=0

# Function to add logger import if not present
add_logger_import() {
  local file=$1

  if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
    # Find the last import statement and add logger import after it
    sed -i '' '/^import/!b;:a;n;/^import/ba;i\
'"$LOGGER_IMPORT"'
' "$file"
    echo "  ✓ Added logger import to $(basename $file)"
  fi
}

# Function to replace console statements with logger
replace_console_statements() {
  local file=$1
  local count=0

  # Replace console.error with logger.error
  if grep -q "console\.error" "$file"; then
    # This is a simplified replacement - in production, you'd want more sophisticated parsing
    perl -i -pe 's/console\.error\(/logger.error(/g' "$file"
    count=$((count + $(grep -c "logger.error" "$file" || echo "0")))
  fi

  # Replace console.log with logger.info
  if grep -q "console\.log" "$file"; then
    perl -i -pe 's/console\.log\(/logger.info(/g' "$file"
    count=$((count + $(grep -c "logger.info" "$file" || echo "0")))
  fi

  # Replace console.warn with logger.warn
  if grep -q "console\.warn" "$file"; then
    perl -i -pe 's/console\.warn\(/logger.warn(/g' "$file"
    count=$((count + $(grep -c "logger.warn" "$file" || echo "0")))
  fi

  if [ $count -gt 0 ]; then
    echo "  ✓ Replaced $count console statements in $(basename $file)"
    TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + count))
  fi
}

# Get the list of first 83 files
echo "📋 Finding files with console statements..."
FILES=$(grep -rl "console\\.log\|console\\.error\|console\\.warn" "$WEBROOT/app/api" --include="*.ts" --include="*.tsx" | sort | head -83)

echo "📝 Processing files..."
for file in $FILES; do
  if [ -f "$file" ]; then
    echo "Processing: $(basename $file)"
    add_logger_import "$file"
    replace_console_statements "$file"
    FILES_PROCESSED=$((FILES_PROCESSED + 1))
  fi
done

echo ""
echo "✅ Batch processing complete!"
echo "   Files processed: $FILES_PROCESSED"
echo "   Total replacements: $TOTAL_REPLACEMENTS"
echo ""
echo "⚠️  NOTE: This script performs basic replacements."
echo "   Manual review recommended for:"
echo "   - Ensuring proper structured logging format"
echo "   - Adding event names and context objects"
echo "   - Verifying log levels (info/warn/error)"
echo ""
echo "Next steps:"
echo "1. Review changes with: git diff"
echo "2. Test the application"
echo "3. Manually enhance log statements with structured context"
