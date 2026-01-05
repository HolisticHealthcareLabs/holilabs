#!/bin/bash
# Script to fix error.message exposure in API routes
# Replaces { error: '...', details: error.message } with conditional development-only exposure

# Critical PHI-heavy endpoints to fix
CRITICAL_FILES=(
  "apps/web/src/app/api/patients/deletion/confirm/[token]/route.ts"
  "apps/web/src/app/api/patients/[id]/request-deletion/route.ts"
  "apps/web/src/app/api/patients/import/route.ts"
  "apps/web/src/app/api/clinical-notes/[id]/route.ts"
  "apps/web/src/app/api/appointments/[id]/route.ts"
  "apps/web/src/app/api/portal/auth/magic-link/verify/route.ts"
  "apps/web/src/app/api/portal/auth/otp/verify/route.ts"
  "apps/web/src/app/api/portal/appointments/route.ts"
  "apps/web/src/app/api/consents/route.ts"
  "apps/web/src/app/api/lab-results/[id]/route.ts"
)

echo "Fixing error.message exposure in ${#CRITICAL_FILES[@]} critical endpoints..."

for file in "${CRITICAL_FILES[@]}"; do
  filepath="/Users/nicolacapriroloteran/prototypes/holilabsv2/$file"

  if [ -f "$filepath" ]; then
    echo "Processing: $file"

    # Use sed to replace the pattern (macOS compatible)
    sed -i '' -E 's/\{ error: ([^,]+), details: error\.message \}/{ error: \1, ...(process.env.NODE_ENV === '\''development'\'' \&\& { details: error.message }) }/g' "$filepath"

    echo "  ✅ Fixed: $file"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

echo ""
echo "✅ Completed! Fixed error exposure in critical endpoints."
echo "⚠️  Note: Some files may need manual review for complex error handling."
