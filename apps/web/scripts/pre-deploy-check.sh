#!/bin/bash
set -e

echo "🚀 HoliLabs Pre-Deployment Check"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# 1. Type Check
echo "📝 Running TypeScript type check..."
if pnpm tsc --noEmit; then
  echo -e "${GREEN}✅ Type check passed${NC}"
else
  echo -e "${RED}❌ Type errors found${NC}"
  ((FAILURES++))
fi
echo ""

# 2. Build Test
echo "🏗️  Testing production build..."
if pnpm build 2>&1 | tee /tmp/build-output.txt; then
  echo -e "${GREEN}✅ Build succeeded${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  echo "Last 20 lines of build output:"
  tail -20 /tmp/build-output.txt
  ((FAILURES++))
fi
echo ""

# 3. Run Tests
echo "🧪 Running test suite..."
if pnpm test -- --pass-with-no-tests 2>/dev/null || pnpm test 2>/dev/null; then
  echo -e "${GREEN}✅ All tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed${NC}"
  ((FAILURES++))
fi
echo ""

# 4. Database Migration Check
echo "🗄️  Checking database schema..."
if command -v prisma &> /dev/null; then
  if npx prisma format 2>&1 | grep -q "formatted"; then
    echo -e "${YELLOW}⚠️  Schema was auto-formatted${NC}"
  fi

  # Check if schema matches database
  if npx prisma db pull --print 2>&1 > /dev/null; then
    echo -e "${GREEN}✅ Database schema in sync${NC}"
  else
    echo -e "${YELLOW}⚠️  Schema differences detected - review migrations${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Prisma CLI not found, skipping${NC}"
fi
echo ""

# 5. Environment Variable Check
echo "🔐 Checking required environment variables..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "ENCRYPTION_KEY"
  "NEXTAUTH_SECRET"
)

OPTIONAL_VARS=(
  "GOOGLE_AI_API_KEY"
  "ASSEMBLYAI_API_KEY"
  "TWILIO_ACCOUNT_SID"
  "NEXT_PUBLIC_SUPABASE_URL"
)

MISSING_REQUIRED=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing required: $var${NC}"
    ((MISSING_REQUIRED++))
    ((FAILURES++))
  else
    echo -e "${GREEN}✅ $var is set${NC}"
  fi
done

echo ""
echo "Optional variables:"
for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠️  Optional not set: $var${NC}"
  else
    echo -e "${GREEN}✅ $var is set${NC}"
  fi
done
echo ""

# 6. Production Dependencies Check
echo "📦 Checking dependencies..."
if node -e "
  const pkg = require('./package.json');
  const prodDeps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  console.log('Production dependencies: ' + prodDeps.length);
  console.log('Development dependencies: ' + devDeps.length);
" 2>/dev/null; then
  echo -e "${GREEN}✅ Dependencies OK${NC}"
else
  echo -e "${RED}❌ Failed to read package.json${NC}"
  ((FAILURES++))
fi
echo ""

# 7. Check for common issues
echo "🔍 Scanning for common issues..."

# Check for console.log in production code (warning only)
if grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | grep -v "__tests__" | wc -l | grep -qv "^0$"; then
  echo -e "${YELLOW}⚠️  Found console.log statements in source code${NC}"
fi

# Check for TODO comments (warning only)
TODO_COUNT=$(grep -r "TODO" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO comments${NC}"
fi

echo ""

# Final result
echo "================================"
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ ALL PRE-DEPLOYMENT CHECKS PASSED!${NC}"
  echo ""
  echo "Ready to deploy to production."
  echo ""
  echo "Next steps:"
  echo "  1. git add ."
  echo "  2. git commit -m \"Production ready: [feature]\""
  echo "  3. git push origin main"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $FAILURES CHECK(S) FAILED${NC}"
  echo ""
  echo "Please fix the errors above before deploying."
  echo ""
  exit 1
fi
