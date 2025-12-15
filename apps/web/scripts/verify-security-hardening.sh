#!/bin/bash
# Verification Script for Agent 5 Security Hardening
# Checks that all security configurations are properly implemented

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Agent 5 - Security Hardening Verification             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

# Helper functions
check_pass() {
  echo "✅ PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
  echo "❌ FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_warn() {
  echo "⚠️  WARN: $1"
}

# 1. Check CORS configuration
echo "1. Verifying CORS Configuration..."
if grep -q "holilabs.com" "$PROJECT_ROOT/src/lib/api/cors.ts"; then
  check_pass "Production domains configured"
else
  check_fail "Production domains not found in CORS config"
fi

if grep -q "getAllowedOrigins" "$PROJECT_ROOT/src/lib/api/cors.ts"; then
  check_pass "Origin filtering function exists"
else
  check_fail "Origin filtering function missing"
fi

# 2. Check middleware.ts
echo ""
echo "2. Verifying Middleware Configuration..."
if [ -f "$PROJECT_ROOT/middleware.ts" ]; then
  check_pass "middleware.ts exists"

  if grep -q "CSRF Protection" "$PROJECT_ROOT/middleware.ts"; then
    check_pass "CSRF protection in middleware"
  else
    check_fail "CSRF protection not found in middleware"
  fi

  if grep -q "applySecurityHeaders" "$PROJECT_ROOT/middleware.ts"; then
    check_pass "Security headers application in middleware"
  else
    check_fail "Security headers not applied in middleware"
  fi

  if grep -q "csrfExemptPaths" "$PROJECT_ROOT/middleware.ts"; then
    check_pass "CSRF exemption paths configured"
  else
    check_fail "CSRF exemption paths not configured"
  fi
else
  check_fail "middleware.ts not found"
fi

# 3. Check CSRF enhancements
echo ""
echo "3. Verifying CSRF Protection..."
if grep -q "withCsrfProtection" "$PROJECT_ROOT/src/lib/security/csrf.ts"; then
  check_pass "withCsrfProtection helper exists"
else
  check_fail "withCsrfProtection helper not found"
fi

if grep -q "verifyCsrfToken" "$PROJECT_ROOT/src/lib/security/csrf.ts"; then
  check_pass "CSRF token verification function exists"
else
  check_fail "CSRF token verification function missing"
fi

# 4. Check rate limiting
echo ""
echo "4. Verifying Rate Limiting Configuration..."
if grep -q "passwordReset" "$PROJECT_ROOT/src/lib/rate-limit.ts"; then
  check_pass "Password reset rate limiter configured"
else
  check_fail "Password reset rate limiter not found"
fi

if grep -q "rateLimiters" "$PROJECT_ROOT/src/lib/rate-limit.ts"; then
  check_pass "Rate limiters object exists"
else
  check_fail "Rate limiters object missing"
fi

# 5. Check documentation
echo ""
echo "5. Verifying Documentation..."
if [ -f "$PROJECT_ROOT/docs/SECURITY_TESTING.md" ]; then
  check_pass "SECURITY_TESTING.md exists"
else
  check_fail "SECURITY_TESTING.md not found"
fi

if [ -f "$PROJECT_ROOT/SECURITY_QUICK_REFERENCE.md" ]; then
  check_pass "SECURITY_QUICK_REFERENCE.md exists"
else
  check_fail "SECURITY_QUICK_REFERENCE.md not found"
fi

if [ -f "$PROJECT_ROOT/AGENT_5_SECURITY_HARDENING_COMPLETE.md" ]; then
  check_pass "Agent 5 completion report exists"
else
  check_fail "Agent 5 completion report not found"
fi

# 6. Check test scripts
echo ""
echo "6. Verifying Test Scripts..."
for script in test-cors.sh test-csrf.sh test-security-headers.sh test-all-security.sh; do
  if [ -f "$PROJECT_ROOT/scripts/$script" ]; then
    if [ -x "$PROJECT_ROOT/scripts/$script" ]; then
      check_pass "$script exists and is executable"
    else
      check_warn "$script exists but not executable"
    fi
  else
    check_fail "$script not found"
  fi
done

# 7. Check environment configuration
echo ""
echo "7. Verifying Environment Configuration..."
if [ -f "$PROJECT_ROOT/.env.example" ]; then
  check_pass ".env.example exists"

  if grep -q "ALLOWED_ORIGINS" "$PROJECT_ROOT/.env.example"; then
    check_pass "ALLOWED_ORIGINS documented in .env.example"
  else
    check_fail "ALLOWED_ORIGINS not in .env.example"
  fi

  if grep -q "SESSION_SECRET" "$PROJECT_ROOT/.env.example"; then
    check_pass "SESSION_SECRET documented"
  else
    check_fail "SESSION_SECRET not documented"
  fi
else
  check_fail ".env.example not found"
fi

# 8. Check security headers
echo ""
echo "8. Verifying Security Headers Configuration..."
if [ -f "$PROJECT_ROOT/src/lib/security-headers.ts" ]; then
  check_pass "security-headers.ts exists"

  if grep -q "Content-Security-Policy" "$PROJECT_ROOT/src/lib/security-headers.ts"; then
    check_pass "CSP configured"
  else
    check_fail "CSP not configured"
  fi

  if grep -q "X-Frame-Options" "$PROJECT_ROOT/src/lib/security-headers.ts"; then
    check_pass "X-Frame-Options configured"
  else
    check_fail "X-Frame-Options not configured"
  fi
else
  check_fail "security-headers.ts not found"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Checks: $((PASS_COUNT + FAIL_COUNT))"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ ALL SECURITY HARDENING CHECKS PASSED!"
  echo ""
  echo "🎉 Agent 5 implementation verified successfully"
  echo ""
  echo "Next steps:"
  echo "  1. Run security test suite: ./scripts/test-all-security.sh"
  echo "  2. Test CORS with production domains"
  echo "  3. Verify CSRF tokens in browser console"
  echo "  4. Run Mozilla Observatory scan post-deployment"
  echo ""
  exit 0
else
  echo "⚠️  SOME CHECKS FAILED"
  echo ""
  echo "Please review the failures above and ensure all security"
  echo "configurations are properly implemented."
  echo ""
  echo "Resources:"
  echo "  - AGENT_5_SECURITY_HARDENING_COMPLETE.md"
  echo "  - docs/SECURITY_TESTING.md"
  echo "  - SECURITY_QUICK_REFERENCE.md"
  echo ""
  exit 1
fi
