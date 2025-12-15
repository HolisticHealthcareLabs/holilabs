#!/bin/bash
# Security Headers Testing Script
# Tests all security headers (CSP, HSTS, X-Frame-Options, etc.)

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
IS_HTTPS=false

if [[ "$APP_URL" == https://* ]]; then
  IS_HTTPS=true
fi

echo "🔐 Testing Security Headers..."
echo "Target: $APP_URL"
echo "HTTPS: $IS_HTTPS"
echo ""

# Get all headers
HEADERS=$(curl -s -I "$APP_URL" 2>/dev/null || echo "")

if [ -z "$HEADERS" ]; then
  echo "❌ FAIL: Could not fetch headers from $APP_URL"
  exit 1
fi

# Test 1: Content-Security-Policy
echo "1. Content-Security-Policy (CSP)..."
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | head -1)
  echo "✅ PASS: CSP header present"

  # Check for unsafe directives in production
  if [[ "$APP_URL" == https://* ]]; then
    if echo "$CSP" | grep -q "unsafe-inline"; then
      echo "   ⚠️  WARN: 'unsafe-inline' found in CSP (review if necessary)"
    fi
    if echo "$CSP" | grep -q "unsafe-eval"; then
      echo "   ⚠️  WARN: 'unsafe-eval' found in CSP (should be removed in production)"
    fi
  fi

  # Check for default-src
  if echo "$CSP" | grep -q "default-src"; then
    echo "   ✅ default-src directive present"
  fi

  # Check for script-src
  if echo "$CSP" | grep -q "script-src"; then
    echo "   ✅ script-src directive present"
  fi
else
  echo "❌ FAIL: Content-Security-Policy header missing"
fi

# Test 2: X-Frame-Options
echo ""
echo "2. X-Frame-Options (Clickjacking Protection)..."
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  XFO=$(echo "$HEADERS" | grep -i "x-frame-options" | head -1)
  echo "✅ PASS: X-Frame-Options header present"

  if echo "$XFO" | grep -qi "DENY"; then
    echo "   ✅ Set to DENY (strictest)"
  elif echo "$XFO" | grep -qi "SAMEORIGIN"; then
    echo "   ⚠️  Set to SAMEORIGIN (consider DENY for better protection)"
  fi
else
  echo "❌ FAIL: X-Frame-Options header missing"
fi

# Test 3: X-Content-Type-Options
echo ""
echo "3. X-Content-Type-Options (MIME Sniffing Protection)..."
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  XCTO=$(echo "$HEADERS" | grep -i "x-content-type-options" | head -1)
  echo "✅ PASS: X-Content-Type-Options header present"

  if echo "$XCTO" | grep -qi "nosniff"; then
    echo "   ✅ Set to nosniff"
  fi
else
  echo "❌ FAIL: X-Content-Type-Options header missing"
fi

# Test 4: X-XSS-Protection
echo ""
echo "4. X-XSS-Protection..."
if echo "$HEADERS" | grep -qi "x-xss-protection"; then
  XXP=$(echo "$HEADERS" | grep -i "x-xss-protection" | head -1)
  echo "✅ PASS: X-XSS-Protection header present"

  if echo "$XXP" | grep -q "1; mode=block"; then
    echo "   ✅ Set to '1; mode=block'"
  fi
else
  echo "⚠️  INFO: X-XSS-Protection header missing (legacy browsers only)"
fi

# Test 5: Strict-Transport-Security (HSTS)
echo ""
echo "5. Strict-Transport-Security (HSTS)..."
if [ "$IS_HTTPS" = true ]; then
  if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    HSTS=$(echo "$HEADERS" | grep -i "strict-transport-security" | head -1)
    echo "✅ PASS: HSTS header present"

    # Check max-age
    if echo "$HSTS" | grep -q "max-age=31536000"; then
      echo "   ✅ max-age set to 1 year (31536000)"
    else
      echo "   ⚠️  WARN: max-age not set to 1 year"
    fi

    # Check includeSubDomains
    if echo "$HSTS" | grep -qi "includeSubDomains"; then
      echo "   ✅ includeSubDomains present"
    else
      echo "   ⚠️  INFO: includeSubDomains not set"
    fi

    # Check preload
    if echo "$HSTS" | grep -qi "preload"; then
      echo "   ✅ preload directive present"
    else
      echo "   ℹ️  INFO: preload not set (optional)"
    fi
  else
    echo "❌ FAIL: HSTS header missing (required for HTTPS)"
  fi
else
  echo "ℹ️  SKIP: HSTS only applies to HTTPS connections"
fi

# Test 6: Referrer-Policy
echo ""
echo "6. Referrer-Policy..."
if echo "$HEADERS" | grep -qi "referrer-policy"; then
  RP=$(echo "$HEADERS" | grep -i "referrer-policy" | head -1)
  echo "✅ PASS: Referrer-Policy header present"

  if echo "$RP" | grep -qi "no-referrer-when-downgrade\|strict-origin-when-cross-origin\|no-referrer"; then
    echo "   ✅ Set to privacy-preserving value"
  fi
else
  echo "❌ FAIL: Referrer-Policy header missing"
fi

# Test 7: Permissions-Policy
echo ""
echo "7. Permissions-Policy..."
if echo "$HEADERS" | grep -qi "permissions-policy"; then
  PP=$(echo "$HEADERS" | grep -i "permissions-policy" | head -1)
  echo "✅ PASS: Permissions-Policy header present"

  # Check for restricted features
  if echo "$PP" | grep -q "camera=()"; then
    echo "   ✅ camera access disabled"
  fi

  if echo "$PP" | grep -q "microphone=()"; then
    echo "   ✅ microphone access disabled"
  fi

  if echo "$PP" | grep -q "geolocation="; then
    echo "   ✅ geolocation policy set"
  fi
else
  echo "⚠️  WARN: Permissions-Policy header missing (recommended)"
fi

# Test 8: Cache-Control (for PHI/sensitive data)
echo ""
echo "8. Cache-Control (HIPAA Compliance)..."
if echo "$HEADERS" | grep -qi "cache-control"; then
  CC=$(echo "$HEADERS" | grep -i "cache-control" | head -1)
  echo "✅ PASS: Cache-Control header present"

  if echo "$CC" | grep -q "no-store"; then
    echo "   ✅ no-store directive present (prevents caching)"
  else
    echo "   ⚠️  WARN: no-store not set (PHI may be cached)"
  fi

  if echo "$CC" | grep -q "no-cache"; then
    echo "   ✅ no-cache directive present"
  fi

  if echo "$CC" | grep -q "private"; then
    echo "   ✅ private directive present"
  fi
else
  echo "⚠️  WARN: Cache-Control header missing"
fi

# Test 9: Cookie security attributes
echo ""
echo "9. Cookie Security Attributes..."
COOKIES=$(curl -s -I "$APP_URL/api/csrf" 2>/dev/null | grep -i "set-cookie" || echo "")

if [ -n "$COOKIES" ]; then
  echo "✅ Cookies found, checking attributes..."

  # Check HttpOnly
  if echo "$COOKIES" | grep -qi "HttpOnly"; then
    echo "   ✅ HttpOnly flag present"
  else
    echo "   ❌ FAIL: HttpOnly flag missing"
  fi

  # Check Secure (for HTTPS)
  if [ "$IS_HTTPS" = true ]; then
    if echo "$COOKIES" | grep -qi "Secure"; then
      echo "   ✅ Secure flag present"
    else
      echo "   ❌ FAIL: Secure flag missing (required for HTTPS)"
    fi
  fi

  # Check SameSite
  if echo "$COOKIES" | grep -qi "SameSite"; then
    if echo "$COOKIES" | grep -qi "SameSite=Strict\|SameSite=Lax"; then
      echo "   ✅ SameSite attribute present (Strict or Lax)"
    fi
  else
    echo "   ⚠️  WARN: SameSite attribute missing"
  fi
else
  echo "ℹ️  INFO: No cookies to check (test /api/csrf endpoint)"
fi

# Summary
echo ""
echo "═════════════════════════════════════════════════════════"
echo "📊 Security Headers Summary"
echo "═════════════════════════════════════════════════════════"

PASS_COUNT=$(echo "$HEADERS" | grep -ci "content-security-policy\|x-frame-options\|x-content-type-options\|referrer-policy" || echo "0")
TOTAL_COUNT=7

echo ""
echo "Essential Headers: $PASS_COUNT/$TOTAL_COUNT present"
echo ""

if [ "$PASS_COUNT" -ge 6 ]; then
  echo "✅ Overall Status: GOOD"
  echo "   Most security headers are configured correctly"
elif [ "$PASS_COUNT" -ge 4 ]; then
  echo "⚠️  Overall Status: MODERATE"
  echo "   Some security headers are missing"
else
  echo "❌ Overall Status: NEEDS IMPROVEMENT"
  echo "   Critical security headers are missing"
fi

echo ""
echo "💡 Next Steps:"
echo "  1. Run Mozilla Observatory scan: https://observatory.mozilla.org/"
echo "  2. Test with SecurityHeaders.com: https://securityheaders.com/"
echo "  3. Review CSP violations in browser console"
echo "  4. Test in production environment"
echo ""
echo "🎯 Target Score: A+ on Mozilla Observatory"
echo ""
