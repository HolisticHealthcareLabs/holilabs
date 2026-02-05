#!/bin/bash
#
# HoliLabs Cortex - macOS Installation Verification Script
#
# Usage: ./verify-install-mac.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# App paths
APP_PATH="/Applications/HoliLabs Clinical Assurance.app"
INFO_PLIST="$APP_PATH/Contents/Info.plist"
SUPPORT_DIR="$HOME/Library/Application Support/HoliLabs Cortex"
LOG_DIR="$HOME/Library/Logs/HoliLabs Cortex"

# Error counter
ERRORS=0
WARNINGS=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}HoliLabs Cortex Installation Verifier${NC}"
echo -e "${CYAN}========================================${NC}\n"

# 1. Check if app is installed
echo -n "Checking if app is installed... "
if [ -d "$APP_PATH" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "${RED}App not found at: $APP_PATH${NC}"
    ((ERRORS++))
    exit 1
fi

# 2. Check app bundle structure
echo -n "Checking app bundle structure... "
if [ -f "$INFO_PLIST" ] && [ -d "$APP_PATH/Contents/MacOS" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "${RED}Invalid app bundle structure${NC}"
    ((ERRORS++))
fi

# 3. Check app version
echo -n "Checking app version... "
if [ -f "$INFO_PLIST" ]; then
    VERSION=$(defaults read "$INFO_PLIST" CFBundleShortVersionString 2>/dev/null)
    if [ -n "$VERSION" ]; then
        echo -e "${GREEN}✓ OK${NC} (Version: $VERSION)"
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo -e "${RED}Could not read version from Info.plist${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
    ((ERRORS++))
fi

# 4. Check code signature
echo -n "Checking code signature... "
CODESIGN_OUTPUT=$(codesign -dv "$APP_PATH" 2>&1)
if echo "$CODESIGN_OUTPUT" | grep -q "Signature="; then
    echo -e "${GREEN}✓ OK${NC}"

    # Check if notarized
    if spctl -a -vv "$APP_PATH" 2>&1 | grep -q "source=Notarized Developer ID"; then
        echo -e "  ${GREEN}Notarized: Yes${NC}"
    else
        echo -e "  ${YELLOW}Notarized: No (app may show Gatekeeper warnings)${NC}"
        ((WARNINGS++))
    fi

    # Show signer info
    SIGNER=$(echo "$CODESIGN_OUTPUT" | grep "Authority=" | head -1 | sed 's/Authority=//')
    echo -e "  Signed by: $SIGNER"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "${RED}App is not code signed${NC}"
    ((ERRORS++))
fi

# 5. Check if app is running
echo -n "Checking if app is running... "
if pgrep -f "HoliLabs Clinical Assurance" > /dev/null; then
    PID=$(pgrep -f "HoliLabs Clinical Assurance")
    echo -e "${GREEN}✓ OK${NC} (PID: $PID)"
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo -e "${YELLOW}App is not currently running${NC}"
    ((WARNINGS++))
fi

# 6. Check Accessibility permission
echo -n "Checking Accessibility permission... "
if [ "$(sw_vers -productVersion | cut -d. -f1)" -ge 11 ]; then
    # macOS 11+ uses new TCC database location
    TCC_DB="$HOME/Library/Application Support/com.apple.TCC/TCC.db"

    if [ -f "$TCC_DB" ]; then
        AUTH=$(sqlite3 "$TCC_DB" \
            "SELECT auth_value FROM access WHERE service='kTCCServiceAccessibility' AND client LIKE '%holilabs%' LIMIT 1" 2>/dev/null)

        if [ "$AUTH" = "2" ]; then
            echo -e "${GREEN}✓ OK${NC}"
        elif [ "$AUTH" = "1" ]; then
            echo -e "${RED}✗ FAIL${NC}"
            echo -e "${RED}Accessibility permission denied${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ WARNING${NC}"
            echo -e "${YELLOW}Permission not yet requested (launch app to prompt)${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo -e "${YELLOW}Cannot verify (TCC database not found)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (macOS < 11)"
fi

# 7. Check Screen Recording permission
echo -n "Checking Screen Recording permission... "
if [ "$(sw_vers -productVersion | cut -d. -f1)" -ge 11 ]; then
    if [ -f "$TCC_DB" ]; then
        AUTH=$(sqlite3 "$TCC_DB" \
            "SELECT auth_value FROM access WHERE service='kTCCServiceScreenCapture' AND client LIKE '%holilabs%' LIMIT 1" 2>/dev/null)

        if [ "$AUTH" = "2" ]; then
            echo -e "${GREEN}✓ OK${NC}"
        elif [ "$AUTH" = "1" ]; then
            echo -e "${RED}✗ FAIL${NC}"
            echo -e "${RED}Screen Recording permission denied${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ WARNING${NC}"
            echo -e "${YELLOW}Permission not yet requested (launch app to prompt)${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (macOS < 11)"
fi

# 8. Check support directory
echo -n "Checking application support directory... "
if [ -d "$SUPPORT_DIR" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo -e "${YELLOW}Support directory not created yet (normal on first install)${NC}"
    ((WARNINGS++))
fi

# 9. Check log files
echo -n "Checking log files... "
if [ -d "$LOG_DIR" ] && [ "$(ls -A "$LOG_DIR" 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ OK${NC}"

    # Check for recent errors
    if [ -f "$LOG_DIR/main.log" ]; then
        ERROR_COUNT=$(grep -c "ERROR" "$LOG_DIR/main.log" 2>/dev/null || echo "0")
        if [ "$ERROR_COUNT" -gt 0 ]; then
            echo -e "  ${YELLOW}Found $ERROR_COUNT error(s) in logs${NC}"
            echo -e "  ${YELLOW}Last 3 errors:${NC}"
            grep "ERROR" "$LOG_DIR/main.log" | tail -3 | sed 's/^/    /'
            ((WARNINGS++))
        else
            echo -e "  ${GREEN}No errors in logs${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo -e "${YELLOW}No log files found yet (normal if app hasn't been launched)${NC}"
    ((WARNINGS++))
fi

# 10. Check entitlements
echo -n "Checking entitlements... "
ENTITLEMENTS=$(codesign -d --entitlements - "$APP_PATH" 2>/dev/null | plutil -p - 2>/dev/null)
if echo "$ENTITLEMENTS" | grep -q "com.apple.security"; then
    echo -e "${GREEN}✓ OK${NC}"

    # Check for required entitlements
    if ! echo "$ENTITLEMENTS" | grep -q "com.apple.security.automation.apple-events"; then
        echo -e "  ${YELLOW}Missing: com.apple.security.automation.apple-events${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo -e "${YELLOW}Could not read entitlements${NC}"
    ((WARNINGS++))
fi

# 11. Check file permissions
echo -n "Checking file permissions... "
if [ -x "$APP_PATH/Contents/MacOS/HoliLabs Clinical Assurance" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "${RED}Main executable is not executable${NC}"
    ((ERRORS++))
fi

# Summary
echo -e "\n${CYAN}========================================${NC}"
echo -e "${CYAN}Verification Summary${NC}"
echo -e "${CYAN}========================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Installation is valid and ready to use.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo -e "${YELLOW}Installation is functional but may have minor issues.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo -e "${RED}Installation has critical issues.${NC}"
    echo -e "\nRecommended actions:"
    echo -e "  1. Reinstall the application"
    echo -e "  2. Check system requirements"
    echo -e "  3. Contact support: support@holilabs.com"
    exit 1
fi
