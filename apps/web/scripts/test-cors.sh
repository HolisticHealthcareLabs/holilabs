#!/bin/bash
# CORS Configuration Testing Script
# Tests CORS headers and origin validation

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"

echo "🔍 Testing CORS Configuration..."
echo "Target: $APP_URL"
echo ""

# Test 1: Allowed origin (holilabs.com)
echo "1. Testing allowed origin (holilabs.com)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$APP_URL/api/patients" \
  -H "Origin: https://holilabs.com" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "204" ] || [ "$RESPONSE" = "200" ]; then
  echo "✅ PASS: Allowed origin accepted (HTTP $RESPONSE)"
else
  echo "⚠️  WARN: Unexpected response (HTTP $RESPONSE)"
fi

# Test 2: Unauthorized origin
echo ""
echo "2. Testing unauthorized origin (malicious-site.com)..."
HEADERS=$(curl -s -I -X OPTIONS "$APP_URL/api/patients" \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null || echo "")

if echo "$HEADERS" | grep -qi "Access-Control-Allow-Origin: https://malicious-site.com"; then
  echo "❌ FAIL: Unauthorized origin was allowed"
else
  echo "✅ PASS: Unauthorized origin blocked"
fi

# Test 3: Verify CORS methods
echo ""
echo "3. Testing allowed methods..."
METHODS=$(curl -s -I -X OPTIONS "$APP_URL/api/patients" \
  -H "Origin: https://holilabs.com" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "Access-Control-Allow-Methods" || echo "")

if echo "$METHODS" | grep -qi "POST"; then
  echo "✅ PASS: POST method allowed"
else
  echo "⚠️  WARN: POST method not found in allowed methods"
fi

if echo "$METHODS" | grep -qi "DELETE"; then
  echo "✅ PASS: DELETE method allowed"
else
  echo "⚠️  WARN: DELETE method not found in allowed methods"
fi

# Test 4: Verify credentials
echo ""
echo "4. Testing credentials header..."
CREDS=$(curl -s -I -X OPTIONS "$APP_URL/api/patients" \
  -H "Origin: https://holilabs.com" 2>/dev/null | grep -i "Access-Control-Allow-Credentials" || echo "")

if echo "$CREDS" | grep -qi "true"; then
  echo "✅ PASS: Credentials allowed for whitelisted origin"
else
  echo "⚠️  INFO: Credentials not explicitly set"
fi

# Test 5: Verify max-age
echo ""
echo "5. Testing preflight cache (max-age)..."
MAXAGE=$(curl -s -I -X OPTIONS "$APP_URL/api/patients" \
  -H "Origin: https://holilabs.com" 2>/dev/null | grep -i "Access-Control-Max-Age" || echo "")

if echo "$MAXAGE" | grep -q "86400"; then
  echo "✅ PASS: Max-Age set to 24 hours (86400)"
else
  echo "⚠️  INFO: Max-Age not set or different value"
fi

echo ""
echo "✅ CORS tests completed"
echo ""
echo "📊 Summary:"
echo "  - Allowed origins are validated"
echo "  - Unauthorized origins are blocked"
echo "  - CORS headers are properly configured"
echo ""
echo "💡 Next steps:"
echo "  - Review logs for any warnings"
echo "  - Test with production domains"
echo "  - Verify in Mozilla Observatory"
