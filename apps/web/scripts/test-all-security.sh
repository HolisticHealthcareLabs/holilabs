#!/bin/bash
# Master Security Testing Script
# Runs all security tests in sequence

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     HOLI LABS - COMPREHENSIVE SECURITY TEST SUITE              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Target Application: $APP_URL"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "This test suite will validate:"
echo "  ✓ CORS Configuration"
echo "  ✓ CSRF Protection"
echo "  ✓ Security Headers"
echo "  ✓ Cookie Security"
echo ""
read -p "Press Enter to start testing... " -t 5 || echo ""
echo ""

# Track results
TOTAL_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Test 1: CORS Configuration
echo "═════════════════════════════════════════════════════════════════"
echo " Test Suite 1/3: CORS Configuration"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if bash "$SCRIPT_DIR/test-cors.sh"; then
  echo "✅ CORS tests completed successfully"
else
  echo "⚠️  Some CORS tests failed"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
sleep 2

# Test 2: CSRF Protection
echo "═════════════════════════════════════════════════════════════════"
echo " Test Suite 2/3: CSRF Protection"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if bash "$SCRIPT_DIR/test-csrf.sh"; then
  echo "✅ CSRF tests completed successfully"
else
  echo "⚠️  Some CSRF tests failed"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
sleep 2

# Test 3: Security Headers
echo "═════════════════════════════════════════════════════════════════"
echo " Test Suite 3/3: Security Headers"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if bash "$SCRIPT_DIR/test-security-headers.sh"; then
  echo "✅ Security headers tests completed successfully"
else
  echo "⚠️  Some security headers tests failed"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo " FINAL RESULTS"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ ALL SECURITY TESTS PASSED!"
  echo ""
  echo "🎉 Your application has strong security configurations"
  echo ""
  echo "Next steps:"
  echo "  1. Run Mozilla Observatory scan: https://observatory.mozilla.org/"
  echo "  2. Test with SecurityHeaders.com: https://securityheaders.com/"
  echo "  3. Review application logs for security events"
  echo "  4. Schedule regular security testing (weekly/monthly)"
  echo ""
  exit 0
else
  echo "⚠️  SOME TESTS FAILED"
  echo ""
  echo "Please review the test output above and address any failures."
  echo ""
  echo "Common issues:"
  echo "  - Application not running at $APP_URL"
  echo "  - Security headers not configured in middleware"
  echo "  - CSRF protection not enforced"
  echo "  - CORS origins not properly whitelisted"
  echo ""
  echo "Resources:"
  echo "  - docs/SECURITY_TESTING.md"
  echo "  - src/lib/security/"
  echo "  - middleware.ts"
  echo ""
  exit 1
fi
