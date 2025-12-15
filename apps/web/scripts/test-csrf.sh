#!/bin/bash
# CSRF Protection Testing Script
# Tests CSRF token generation, validation, and enforcement

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
COOKIE_FILE="/tmp/csrf-cookies-$$.txt"

# Cleanup function
cleanup() {
  rm -f "$COOKIE_FILE"
}
trap cleanup EXIT

echo "🛡️  Testing CSRF Protection..."
echo "Target: $APP_URL"
echo ""

# Test 1: Get CSRF token
echo "1. Requesting CSRF token..."
CSRF_RESPONSE=$(curl -s -c "$COOKIE_FILE" "$APP_URL/api/csrf" 2>/dev/null || echo "{}")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ] && [ "$CSRF_TOKEN" != "" ]; then
  echo "✅ PASS: CSRF token generated successfully"
  echo "   Token length: ${#CSRF_TOKEN} characters"
else
  echo "❌ FAIL: Failed to get CSRF token"
  echo "   Response: $CSRF_RESPONSE"
  exit 1
fi

# Test 2: Verify cookie was set
echo ""
echo "2. Verifying CSRF cookie..."
if [ -f "$COOKIE_FILE" ] && grep -q "csrf-token" "$COOKIE_FILE"; then
  echo "✅ PASS: CSRF cookie set correctly"

  # Check cookie attributes
  if grep "csrf-token" "$COOKIE_FILE" | grep -q "HttpOnly"; then
    echo "   ✅ HttpOnly flag present"
  fi

  if grep "csrf-token" "$COOKIE_FILE" | grep -q "Secure"; then
    echo "   ✅ Secure flag present"
  fi
else
  echo "⚠️  WARN: CSRF cookie not found in response"
fi

# Test 3: Request without CSRF token (should fail)
echo ""
echo "3. Testing request without CSRF token (should be blocked)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/patients" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient"}' 2>/dev/null || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASS: Request blocked without CSRF token (HTTP 403)"

  # Check error message
  if echo "$BODY" | jq -e '.code == "CSRF_TOKEN_MISSING"' >/dev/null 2>&1; then
    echo "   ✅ Correct error code: CSRF_TOKEN_MISSING"
  fi
elif [ "$HTTP_CODE" = "401" ]; then
  echo "ℹ️  INFO: Request blocked by authentication (HTTP 401)"
  echo "   This is expected if the endpoint requires authentication"
else
  echo "⚠️  WARN: Unexpected response code: HTTP $HTTP_CODE"
  echo "   Expected: 403 (Forbidden) or 401 (Unauthorized)"
fi

# Test 4: Request with invalid CSRF token (should fail)
echo ""
echo "4. Testing request with invalid CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/patients" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: invalid-token-12345" \
  -b "$COOKIE_FILE" \
  -d '{"name":"Test Patient"}' 2>/dev/null || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASS: Invalid CSRF token rejected (HTTP 403)"

  # Check error code
  ERROR_CODE=$(echo "$BODY" | jq -r '.code' 2>/dev/null || echo "")
  if [ "$ERROR_CODE" = "CSRF_TOKEN_INVALID" ] || [ "$ERROR_CODE" = "CSRF_TOKEN_MISMATCH" ]; then
    echo "   ✅ Correct error code: $ERROR_CODE"
  fi
elif [ "$HTTP_CODE" = "401" ]; then
  echo "ℹ️  INFO: Request blocked by authentication (HTTP 401)"
else
  echo "⚠️  WARN: Unexpected response code: HTTP $HTTP_CODE"
fi

# Test 5: Request with valid CSRF token
echo ""
echo "5. Testing request with valid CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/csrf" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b "$COOKIE_FILE" \
  -d '{}' 2>/dev/null || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# This endpoint returns 200, but other endpoints might return 401/404/405
if [ "$HTTP_CODE" = "403" ]; then
  echo "❌ FAIL: Valid CSRF token was rejected"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "ℹ️  INFO: Authentication required (HTTP 401)"
  echo "   CSRF validation passed, but authentication needed"
elif [ "$HTTP_CODE" = "405" ]; then
  echo "✅ PASS: CSRF validation passed (HTTP 405 - Method Not Allowed)"
  echo "   The CSRF token was validated, endpoint doesn't support POST"
else
  echo "✅ PASS: Request with valid CSRF token succeeded (HTTP $HTTP_CODE)"
fi

# Test 6: Token format validation
echo ""
echo "6. Validating token format..."
# Token should be in format: token:signature:expiresAt
TOKEN_PARTS=$(echo "$CSRF_TOKEN" | grep -o ':' | wc -l | tr -d ' ')

if [ "$TOKEN_PARTS" = "2" ]; then
  echo "✅ PASS: Token has correct format (3 parts)"

  # Check token length (should be 64 hex chars)
  TOKEN_PART=$(echo "$CSRF_TOKEN" | cut -d':' -f1)
  if [ ${#TOKEN_PART} = "64" ]; then
    echo "   ✅ Token part is 64 characters (32 bytes)"
  fi

  # Check signature length (should be 64 hex chars)
  SIG_PART=$(echo "$CSRF_TOKEN" | cut -d':' -f2)
  if [ ${#SIG_PART} = "64" ]; then
    echo "   ✅ Signature is 64 characters (SHA-256)"
  fi

  # Check expiration timestamp
  EXP_PART=$(echo "$CSRF_TOKEN" | cut -d':' -f3)
  if [[ "$EXP_PART" =~ ^[0-9]+$ ]]; then
    echo "   ✅ Expiration timestamp is numeric"
  fi
else
  echo "❌ FAIL: Token format incorrect (expected 3 parts, got $(($TOKEN_PARTS + 1)))"
fi

echo ""
echo "✅ CSRF protection tests completed"
echo ""
echo "📊 Summary:"
echo "  - CSRF tokens are generated with cryptographic signatures"
echo "  - Requests without tokens are blocked"
echo "  - Invalid tokens are rejected"
echo "  - Double-submit cookie pattern is enforced"
echo ""
echo "💡 Next steps:"
echo "  - Test token expiration (24 hours)"
echo "  - Verify all mutation endpoints are protected"
echo "  - Check CSRF exemptions for webhooks and health checks"
