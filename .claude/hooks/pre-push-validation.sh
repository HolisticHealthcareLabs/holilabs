#!/usr/bin/env bash
# Pre-push validation for Holi Labs healthcare monorepo.
# Runs typecheck + tests (blocking) and checks for TODO/FIXME (warning only).

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "Running pre-push validation..."

# ---------------------------------------------------------------------------
# 1. TypeScript type check
# ---------------------------------------------------------------------------
echo -n "  Running type check... "

if ! pnpm --dir "$PROJECT_ROOT" typecheck 2>/dev/null; then
  if ! (cd "$PROJECT_ROOT/apps/web" && pnpm tsc --noEmit 2>/dev/null); then
    echo -e "${RED}FAILED${NC}"
    echo -e "${RED}  TypeScript errors detected. Fix before pushing.${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}OK${NC}"
  fi
else
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 2. Test suite (fail fast)
# ---------------------------------------------------------------------------
echo -n "  Running tests (bail on first failure)... "

if pnpm --dir "$PROJECT_ROOT" test --bail --silent 2>/dev/null; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo -e "${RED}  Tests failed. Fix before pushing.${NC}"
  ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# 3. TODO/FIXME/HACK check (warning only — does not block)
# ---------------------------------------------------------------------------
echo -n "  Checking for TODO/FIXME/HACK markers... "

# Only check production code paths, not tests or config
TODO_COUNT=$(grep -rE '\b(TODO|FIXME|HACK)\b' \
  "$PROJECT_ROOT/apps/web/src/" \
  "$PROJECT_ROOT/apps/api/src/" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="__tests__" \
  --exclude-dir="__mocks__" \
  --exclude-dir="node_modules" \
  -c 2>/dev/null | awk -F: '{sum+=$2} END{print sum+0}')

if [ "$TODO_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}WARNING: $TODO_COUNT TODO/FIXME/HACK markers in production code${NC}"
  # List first 5 for visibility
  grep -rnE '\b(TODO|FIXME|HACK)\b' \
    "$PROJECT_ROOT/apps/web/src/" \
    "$PROJECT_ROOT/apps/api/src/" \
    --include="*.ts" --include="*.tsx" \
    --exclude-dir="__tests__" \
    --exclude-dir="__mocks__" \
    --exclude-dir="node_modules" \
    2>/dev/null | head -5 | while IFS= read -r line; do
    echo -e "    ${YELLOW}$line${NC}"
  done
  if [ "$TODO_COUNT" -gt 5 ]; then
    echo -e "    ${YELLOW}... and $((TODO_COUNT - 5)) more${NC}"
  fi
else
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 4. Check for console.log in production code (warning)
# ---------------------------------------------------------------------------
echo -n "  Checking for console.log in production code... "

CONSOLE_COUNT=$(grep -rE 'console\.(log|debug)' \
  "$PROJECT_ROOT/apps/web/src/" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="__tests__" \
  --exclude-dir="__mocks__" \
  --exclude-dir="node_modules" \
  -c 2>/dev/null | awk -F: '{sum+=$2} END{print sum+0}')

if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}WARNING: $CONSOLE_COUNT console.log/debug calls in production code${NC}"
else
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Pre-push validation FAILED: $ERRORS blocking error(s).${NC}"
  echo -e "${RED}Fix the issues above before pushing.${NC}"
  exit 1
else
  echo -e "${GREEN}Pre-push validation PASSED.${NC}"
  exit 0
fi
