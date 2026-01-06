#!/bin/bash

# Script to fix audit logging issues across the codebase

echo "🔧 Fixing audit logging issues..."

# Find all TypeScript files in src/app/api
API_DIR="apps/web/src/app/api"
LIB_DIR="apps/web/src/lib"

if [ ! -d "$API_DIR" ]; then
  echo "❌ API directory not found: $API_DIR"
  exit 1
fi

# Counter for fixes
FIXED=0

# Pattern 1: Remove userId from audit log calls
# Find lines with createAuditLog/logAuditEvent that have userId in the data object
echo "📝 Fixing userId in audit log calls..."
find "$API_DIR" -type f -name "*.ts" | while read -r file; do
  # Check if file contains the problematic pattern
  if grep -q "userId:" "$file" 2>/dev/null; then
    # Create backup
    cp "$file" "$file.bak"

    # Remove userId from audit log data objects
    # This is tricky because we need to preserve the structure
    # For now, let's just flag these files
    echo "  - Found userId in: $file"
    ((FIXED++))
  fi
done

# Pattern 2: Fix patientUserId -> patientId
echo "📝 Fixing patientUserId -> patientId..."
find "$API_DIR" -type f -name "*.ts" -exec grep -l "patientUserId" {} \; | while read -r file; do
  echo "  - Fixing: $file"
  sed -i.bak 's/patientUserId/patientId/g' "$file"
  ((FIXED++))
done

# Pattern 3: Fix createdAt -> timestamp in AuditLog queries
echo "📝 Fixing createdAt -> timestamp in audit queries..."
find "$API_DIR" -type f -name "*.ts" -exec grep -l "createdAt.*AuditLog\|AuditLog.*createdAt" {} \; | while read -r file; do
  echo "  - Fixing: $file"
  # This is context-dependent, so we'll flag these
  if grep -q "orderBy.*createdAt" "$file"; then
    sed -i.bak "s/orderBy.*createdAt/orderBy: { timestamp: 'desc' }/g" "$file"
    ((FIXED++))
  fi
done

# Pattern 4: Fix LOGIN_ATTEMPT -> LOGIN in audit actions
echo "📝 Fixing LOGIN_ATTEMPT -> LOGIN..."
find "$API_DIR" -type f -name "*.ts" -exec grep -l "LOGIN_ATTEMPT" {} \; | while read -r file; do
  echo "  - Fixing: $file"
  sed -i.bak 's/"LOGIN_ATTEMPT"/"LOGIN"/g' "$file"
  sed -i.bak "s/'LOGIN_ATTEMPT'/'LOGIN'/g" "$file"
  ((FIXED++))
done

echo ""
echo "✅ Audit logging fixes applied!"
echo "   Files processed: $FIXED"
echo ""
echo "⚠️  Manual fixes still needed for:"
echo "   1. Remove 'userId:' from createAuditLog data objects"
echo "   2. Fix missing Prisma models (dataQualityEvent, userBehaviorEvent, accessReasonAggregate)"
echo "   3. Fix Patient include queries (appointments, medications, clinicalNotes)"
echo ""
echo "🔍 Run 'pnpm tsc --noEmit' to check remaining errors"
