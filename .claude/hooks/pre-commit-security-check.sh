#!/usr/bin/env bash
# Pre-commit security check for Holi Labs healthcare monorepo.
# Scans staged files for secrets, PHI logging, .env leaks, and unsafe flags.
# Exit 1 = block commit.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Get staged files (only added/modified, not deleted)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  echo -e "${GREEN}No staged files to check.${NC}"
  exit 0
fi

echo "Running pre-commit security checks..."

# ---------------------------------------------------------------------------
# 1. Hardcoded secrets detection
# ---------------------------------------------------------------------------
echo -n "  Checking for hardcoded secrets... "

SECRET_PATTERNS=(
  'AKIA[0-9A-Z]{16}'                          # AWS Access Key
  'sk-[a-zA-Z0-9]{20,}'                       # OpenAI / Stripe secret key
  'sk-ant-[a-zA-Z0-9-]{20,}'                  # Anthropic API key
  'ghp_[a-zA-Z0-9]{36}'                       # GitHub PAT
  'gho_[a-zA-Z0-9]{36}'                       # GitHub OAuth token
  'github_pat_[a-zA-Z0-9_]{22,}'              # GitHub fine-grained PAT
  'xox[bpras]-[a-zA-Z0-9-]+'                  # Slack tokens
  'ya29\.[0-9A-Za-z_-]+'                      # Google OAuth token
  'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.'   # JWT tokens
  'postgres(ql)?://[^@]+@[^/\s]+'             # PostgreSQL connection strings
  'mongodb(\+srv)?://[^@]+@[^/\s]+'           # MongoDB connection strings
  'redis://[^@]*@[^/\s]+'                     # Redis connection strings
  'PRIVATE KEY-----'                           # Private keys
  'password\s*[:=]\s*["\x27][^"\x27]{8,}'     # Hardcoded passwords
  'secret\s*[:=]\s*["\x27][^"\x27]{8,}'       # Hardcoded secrets
  'token\s*[:=]\s*["\x27][^"\x27]{20,}'       # Hardcoded tokens
)

for file in $STAGED_FILES; do
  # Skip binary files, lock files, and test fixtures
  if [[ "$file" == *.lock ]] || [[ "$file" == *.png ]] || [[ "$file" == *.jpg ]] || \
     [[ "$file" == *.ico ]] || [[ "$file" == *.woff* ]] || [[ "$file" == *__fixtures__* ]] || \
     [[ "$file" == *playwright-report* ]] || [[ "$file" == *.tsbuildinfo ]]; then
    continue
  fi

  # Only check if file exists (not deleted)
  if [ ! -f "$file" ]; then
    continue
  fi

  STAGED_CONTENT=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)

  for pattern in "${SECRET_PATTERNS[@]}"; do
    if echo "$STAGED_CONTENT" | grep -qE "$pattern"; then
      echo -e "\n${RED}  BLOCKED: Potential secret in $file matching pattern: $pattern${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 2. PHI field logging detection
# ---------------------------------------------------------------------------
echo -n "  Checking for PHI in log statements... "

PHI_FIELDS=(
  'firstName' 'lastName' 'dateOfBirth' 'gender'
  'email' 'phone' 'address' 'city' 'state' 'postalCode'
  'mrn' 'externalMrn'
  'cpf' 'cns' 'rg'
  'mfaPhoneNumber' 'mfaBackupCodes' 'signingPinHash' 'passwordHash'
  'licenseNumber' 'npi'
  'subjective' 'objective' 'assessment' 'chiefComplaint' 'vitalSigns'
  'audioFileUrl' 'audioFileName'
  'diagnosis' 'instructions'
  'ssn' 'dob' 'socialSecurity'
)

PHI_REGEX=$(IFS='|'; echo "${PHI_FIELDS[*]}")
PREV_ERRORS=$ERRORS

for file in $STAGED_FILES; do
  if [[ "$file" != *.ts ]] && [[ "$file" != *.tsx ]] && [[ "$file" != *.js ]] && [[ "$file" != *.jsx ]]; then
    continue
  fi

  if [ ! -f "$file" ]; then
    continue
  fi

  # Check for console.log/warn/error/debug/info containing PHI fields
  STAGED_CONTENT=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)

  if echo "$STAGED_CONTENT" | grep -qE "console\.(log|warn|error|debug|info).*($PHI_REGEX)"; then
    echo -e "\n${RED}  BLOCKED: PHI field reference in log statement in $file${NC}"
    echo -e "  ${YELLOW}Use tokenId or anonymized identifiers in logs instead.${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  if echo "$STAGED_CONTENT" | grep -qE "logger\.(log|warn|error|debug|info).*($PHI_REGEX)"; then
    echo -e "\n${RED}  BLOCKED: PHI field reference in logger call in $file${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq $PREV_ERRORS ]; then
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 3. .env file commit prevention
# ---------------------------------------------------------------------------
echo -n "  Checking for .env files... "
PREV_ERRORS=$ERRORS

for file in $STAGED_FILES; do
  if [[ "$file" == .env ]] || [[ "$file" == .env.local ]] || [[ "$file" == .env.production ]] || \
     [[ "$file" == .env.staging ]] || [[ "$file" == */.env ]] || [[ "$file" == */.env.local ]]; then
    echo -e "\n${RED}  BLOCKED: Attempting to commit environment file: $file${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq $PREV_ERRORS ]; then
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 4. Dangerous flags detection
# ---------------------------------------------------------------------------
echo -n "  Checking for unsafe flags... "
PREV_ERRORS=$ERRORS

for file in $STAGED_FILES; do
  if [ ! -f "$file" ]; then
    continue
  fi

  STAGED_CONTENT=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)

  if echo "$STAGED_CONTENT" | grep -q '\-\-dangerously-skip-permissions'; then
    echo -e "\n${RED}  BLOCKED: --dangerously-skip-permissions found in $file${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  if echo "$STAGED_CONTENT" | grep -qE '\-\-no-verify|\-\-no-gpg-sign'; then
    if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]] || [[ "$file" == *.jsx ]]; then
      echo -e "\n${RED}  BLOCKED: --no-verify or --no-gpg-sign in source code: $file${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ $ERRORS -eq $PREV_ERRORS ]; then
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# 5. SELECT * on patient/clinical tables
# ---------------------------------------------------------------------------
echo -n "  Checking for SELECT * on patient tables... "
PREV_ERRORS=$ERRORS

for file in $STAGED_FILES; do
  if [[ "$file" != *.ts ]] && [[ "$file" != *.tsx ]] && [[ "$file" != *.sql ]]; then
    continue
  fi

  if [ ! -f "$file" ]; then
    continue
  fi

  STAGED_CONTENT=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)

  if echo "$STAGED_CONTENT" | grep -qiE "SELECT\s+\*\s+FROM\s+(patients|medications|prescriptions|soap_notes|clinical_encounters|scribe_sessions)"; then
    echo -e "\n${RED}  BLOCKED: SELECT * on PHI table in $file — use explicit column lists${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq $PREV_ERRORS ]; then
  echo -e "${GREEN}OK${NC}"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Pre-commit security check FAILED: $ERRORS error(s) found.${NC}"
  echo -e "${RED}Fix the issues above before committing.${NC}"
  exit 1
else
  echo -e "${GREEN}Pre-commit security check PASSED.${NC}"
  exit 0
fi
