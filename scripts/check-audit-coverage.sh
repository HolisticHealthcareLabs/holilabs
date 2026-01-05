#!/bin/bash
# Check which PHI-related API routes are missing audit logging

cd "$(dirname "$0")/../apps/web/src/app/api"

echo "=== Checking PHI Routes for Audit Logging ==="
echo ""

find . -name "route.ts" | grep -v "__tests__" | grep -E "(patient|prescription|clinical|soap|encounter|lab|document|scribe|fhir)" | while read file; do
  if ! grep -q "audit:" "$file"; then
    echo "❌ MISSING: $file"
  else
    echo "✅ HAS AUDIT: $file"
  fi
done

echo ""
echo "=== Summary ==="
total=$(find . -name "route.ts" | grep -v "__tests__" | grep -E "(patient|prescription|clinical|soap|encounter|lab|document|scribe|fhir)" | wc -l)
with_audit=$(find . -name "route.ts" | grep -v "__tests__" | grep -E "(patient|prescription|clinical|soap|encounter|lab|document|scribe|fhir)" | xargs grep -l "audit:" 2>/dev/null | wc -l)
missing=$((total - with_audit))

echo "Total PHI routes: $total"
echo "With audit logging: $with_audit"
echo "Missing audit logging: $missing"
echo "Coverage: $((with_audit * 100 / total))%"
