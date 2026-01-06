#!/bin/bash

# Comment out references to missing Prisma models

echo "🔧 Commenting out missing Prisma model references..."

# Files with dataQualityEvent
FILES_DATA_QUALITY=(
  "apps/web/src/app/api/fhir/r4/Patient/route.ts"
  "apps/web/src/app/api/patients/import/route.ts"
)

# Files with userBehaviorEvent
FILES_USER_BEHAVIOR=(
  "apps/web/src/app/api/patients/route.ts"
  "apps/web/src/app/api/search/semantic/route.ts"
  "apps/web/src/app/api/research/query/route.ts"
  "apps/web/src/app/api/patients/[id]/fhir-pull/route.ts"
  "apps/web/src/app/api/patients/import/route.ts"
  "apps/web/src/app/api/patients/[id]/context/route.ts"
  "apps/web/src/app/api/patients/search/route.ts"
)

# Files with accessReasonAggregate
FILES_ACCESS_REASON=(
  "apps/web/src/app/api/patients/[id]/context/route.ts"
)

fix_count=0

# Function to comment out a block
comment_out_block() {
  local file=$1
  local pattern=$2
  local model_name=$3

  if [ ! -f "$file" ]; then
    echo "  ⚠️  File not found: $file"
    return
  fi

  # Create backup
  cp "$file" "$file.bak"

  # Use sed to comment out the block
  # This is a simple approach - add // TODO: Restore when model exists
  sed -i.tmp "s/await prisma\.${model_name}/\/\/ TODO: Restore when ${model_name} model exists\n      \/\/ await prisma.${model_name}/g" "$file"

  rm "$file.tmp" 2>/dev/null

  if grep -q "TODO: Restore when ${model_name}" "$file"; then
    echo "  ✅ Commented out ${model_name} in: $file"
    ((fix_count++))
  fi
}

# Comment out dataQualityEvent
for file in "${FILES_DATA_QUALITY[@]}"; do
  comment_out_block "$file" "dataQualityEvent" "dataQualityEvent"
done

# Comment out userBehaviorEvent
for file in "${FILES_USER_BEHAVIOR[@]}"; do
  comment_out_block "$file" "userBehaviorEvent" "userBehaviorEvent"
done

# Comment out accessReasonAggregate
for file in "${FILES_ACCESS_REASON[@]}"; do
  comment_out_block "$file" "accessReasonAggregate" "accessReasonAggregate"
done

echo ""
echo "🎉 Commented out $fix_count missing model references!"
echo ""
echo "Note: Look for '// TODO: Restore when X model exists' comments"
echo "These can be uncommented when the Prisma models are added"
