#!/bin/bash
# =============================================================================
# HoliLabs Pre-Commit Hook
# =============================================================================
# Install: cp sprint5-assets/ci/pre-commit-hooks.sh .husky/pre-commit
#   or: ln -sf ../../sprint5-assets/ci/pre-commit-hooks.sh .husky/pre-commit
#
# Checks staged files ONLY (fast path — <5 seconds for typical commits).
# =============================================================================
set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

STAGED=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)

if [ -z "$STAGED" ]; then
  echo -e "${GREEN}No TypeScript files staged. Skipping checks.${NC}"
  exit 0
fi

ERRORS=0

# ─── Check 1: No console.log ─────────────────────────────────────────────────
echo -n "Checking for console.log... "
CONSOLES=$(echo "$STAGED" | xargs grep -n 'console\.log' 2>/dev/null | grep -v '// eslint-disable' | grep -v '.test.' || true)
if [ -n "$CONSOLES" ]; then
  echo -e "${RED}FOUND${NC}"
  echo "$CONSOLES" | head -10
  echo -e "${RED}Remove console.log before committing (or add eslint-disable comment).${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}clean${NC}"
fi

# ─── Check 2: No hardcoded secrets ───────────────────────────────────────────
echo -n "Checking for hardcoded secrets... "
SECRET_PATTERNS='(sk_live_|pk_live_|sk_test_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|xox[bpas]-|password\s*[:=]\s*["\x27][^"\x27]{8,})'
SECRETS=$(echo "$STAGED" | xargs grep -nE "$SECRET_PATTERNS" 2>/dev/null | grep -v '.env' | grep -v '.example' || true)
if [ -n "$SECRETS" ]; then
  echo -e "${RED}FOUND${NC}"
  echo "$SECRETS" | head -5
  echo -e "${RED}Hardcoded secrets detected. Use environment variables.${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}clean${NC}"
fi

# ─── Check 3: No TODO markers (in non-test files) ────────────────────────────
echo -n "Checking for TODO markers... "
NON_TEST_STAGED=$(echo "$STAGED" | grep -v '.test.' | grep -v '__tests__' || true)
if [ -n "$NON_TEST_STAGED" ]; then
  TODOS=$(echo "$NON_TEST_STAGED" | xargs grep -n '\bTODO\b' 2>/dev/null || true)
  if [ -n "$TODOS" ]; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "$TODOS" | head -5
    echo -e "${YELLOW}TODO markers found. Consider resolving before committing.${NC}"
    # Warning only, not blocking
  else
    echo -e "${GREEN}clean${NC}"
  fi
else
  echo -e "${GREEN}clean${NC}"
fi

# ─── Check 4: Token lint on staged .tsx files ─────────────────────────────────
echo -n "Checking design tokens (staged files)... "
TSX_STAGED=$(echo "$STAGED" | grep '\.tsx$' || true)
if [ -n "$TSX_STAGED" ]; then
  TOKEN_VIOLATIONS=0
  for f in $TSX_STAGED; do
    COUNT=$(grep -cE '\b(text-xs|text-sm|text-base|text-lg|text-xl|text-2xl)\b' "$f" 2>/dev/null || true)
    TOKEN_VIOLATIONS=$((TOKEN_VIOLATIONS + COUNT))
    COUNT2=$(grep -cE '\b(p|px|py)-[0-9]+\b' "$f" 2>/dev/null || true)
    TOKEN_VIOLATIONS=$((TOKEN_VIOLATIONS + COUNT2))
  done
  if [ "$TOKEN_VIOLATIONS" -gt 0 ]; then
    echo -e "${YELLOW}${TOKEN_VIOLATIONS} raw Tailwind classes${NC} (run lint-tokens.sh for details)"
    # Warning only during migration
  else
    echo -e "${GREEN}clean${NC}"
  fi
else
  echo -e "${GREEN}no .tsx files${NC}"
fi

# ─── Check 5: Dead code (unused imports) ──────────────────────────────────────
echo -n "Checking for dead imports... "
DEAD=$(echo "$STAGED" | xargs grep -n "^import.*from '.*';\?$" 2>/dev/null | grep -v "type " | head -3 || true)
# This is a rough heuristic — real unused import detection needs TS compiler
echo -e "${GREEN}skipped (use ESLint for precise detection)${NC}"

# ─── Result ───────────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}═══════════════════════════════════════════${NC}"
  echo -e "${RED}  $ERRORS blocking issue(s) found.${NC}"
  echo -e "${RED}  Fix them before committing.${NC}"
  echo -e "${RED}═══════════════════════════════════════════${NC}"
  exit 1
else
  echo -e "${GREEN}═══════════════════════════════════════════${NC}"
  echo -e "${GREEN}  All pre-commit checks passed.${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════${NC}"
  exit 0
fi
