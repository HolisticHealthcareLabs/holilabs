#!/bin/bash

#
# OWASP ZAP DAST Scan Runner
#
# Runs dynamic application security testing against a running application
#
# Usage:
#   ./scripts/run-dast-scan.sh [scan-type] [target-url]
#
# Examples:
#   ./scripts/run-dast-scan.sh baseline http://localhost:3000
#   ./scripts/run-dast-scan.sh full https://staging.holilabs.xyz
#   ./scripts/run-dast-scan.sh api http://localhost:3000/api
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCAN_TYPE="${1:-baseline}"
TARGET_URL="${2:-http://localhost:3000}"
REPORT_DIR="./dast-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  OWASP ZAP DAST Scan${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Scan Type:${NC} $SCAN_TYPE"
echo -e "${BLUE}Target URL:${NC} $TARGET_URL"
echo -e "${BLUE}Report Directory:${NC} $REPORT_DIR"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if target is accessible
echo -e "${BLUE}Checking if target is accessible...${NC}"
if ! curl -f -s -o /dev/null "$TARGET_URL"; then
    echo -e "${RED}❌ Target URL is not accessible: $TARGET_URL${NC}"
    echo "Please ensure the application is running and accessible"
    exit 1
fi
echo -e "${GREEN}✓${NC} Target is accessible"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Pull latest ZAP Docker image
echo -e "${BLUE}Pulling latest OWASP ZAP Docker image...${NC}"
docker pull owasp/zap2docker-stable

echo ""
echo -e "${BLUE}Starting DAST scan...${NC}"
echo -e "${YELLOW}⚠️  This may take 10-60 minutes depending on scan type${NC}"
echo ""

# Run scan based on type
case $SCAN_TYPE in
    baseline)
        echo -e "${BLUE}Running baseline scan (quick, passive only)...${NC}"
        docker run --rm \
            -v "$(pwd)/.zap:/zap/wrk/:rw" \
            -v "$(pwd)/$REPORT_DIR:/zap/reports/:rw" \
            owasp/zap2docker-stable \
            zap-baseline.py \
            -t "$TARGET_URL" \
            -c .zap/rules.tsv \
            -r "baseline_report_$TIMESTAMP.html" \
            -J "baseline_report_$TIMESTAMP.json" \
            -w "baseline_report_$TIMESTAMP.md" \
            -a \
            -m 10 \
            -T 60
        ;;

    full)
        echo -e "${BLUE}Running full scan (thorough, active + passive)...${NC}"
        echo -e "${YELLOW}⚠️  Warning: This is an active scan that may modify data${NC}"
        echo -e "${YELLOW}⚠️  Only run against staging/development environments${NC}"
        echo ""
        read -p "Continue with full scan? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Scan cancelled"
            exit 1
        fi

        docker run --rm \
            -v "$(pwd)/.zap:/zap/wrk/:rw" \
            -v "$(pwd)/$REPORT_DIR:/zap/reports/:rw" \
            owasp/zap2docker-stable \
            zap-full-scan.py \
            -t "$TARGET_URL" \
            -c .zap/rules.tsv \
            -r "full_report_$TIMESTAMP.html" \
            -J "full_report_$TIMESTAMP.json" \
            -w "full_report_$TIMESTAMP.md" \
            -a \
            -T 120
        ;;

    api)
        echo -e "${BLUE}Running API scan (OpenAPI/GraphQL endpoints)...${NC}"
        docker run --rm \
            -v "$(pwd)/.zap:/zap/wrk/:rw" \
            -v "$(pwd)/$REPORT_DIR:/zap/reports/:rw" \
            owasp/zap2docker-stable \
            zap-api-scan.py \
            -t "$TARGET_URL" \
            -f openapi \
            -c .zap/rules.tsv \
            -r "api_report_$TIMESTAMP.html" \
            -J "api_report_$TIMESTAMP.json" \
            -w "api_report_$TIMESTAMP.md" \
            -a \
            -T 60
        ;;

    authenticated)
        echo -e "${BLUE}Running authenticated scan...${NC}"
        echo -e "${YELLOW}⚠️  Requires test credentials in .env${NC}"
        echo ""

        # Check for test credentials
        if [ -z "$TEST_USER_EMAIL" ] || [ -z "$TEST_USER_PASSWORD" ]; then
            echo -e "${RED}❌ Test credentials not found${NC}"
            echo "Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables"
            exit 1
        fi

        # Create authentication context
        cat > .zap/context.yaml <<EOF
env:
  contexts:
    - name: "HoliLabs"
      urls:
        - "$TARGET_URL"
      includePaths:
        - "$TARGET_URL/.*"
      excludePaths:
        - "$TARGET_URL/logout"
        - "$TARGET_URL/api/auth/.*"
      authentication:
        method: "form"
        parameters:
          loginUrl: "$TARGET_URL/signin"
          loginRequestData: "email={\%username\%}&password={\%password\%}"
        verification:
          method: "response"
          loggedInRegex: "\\\\Qdashboard\\\\E"
          loggedOutRegex: "\\\\Qsignin\\\\E"
      users:
        - name: "test-user"
          credentials:
            username: "\${TEST_USER_EMAIL}"
            password: "\${TEST_USER_PASSWORD}"
EOF

        docker run --rm \
            -v "$(pwd)/.zap:/zap/wrk/:rw" \
            -v "$(pwd)/$REPORT_DIR:/zap/reports/:rw" \
            -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
            -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
            owasp/zap2docker-stable \
            zap-full-scan.py \
            -t "$TARGET_URL" \
            -n .zap/context.yaml \
            -c .zap/rules.tsv \
            -r "authenticated_report_$TIMESTAMP.html" \
            -J "authenticated_report_$TIMESTAMP.json" \
            -w "authenticated_report_$TIMESTAMP.md" \
            -a
        ;;

    *)
        echo -e "${RED}❌ Invalid scan type: $SCAN_TYPE${NC}"
        echo "Valid types: baseline, full, api, authenticated"
        exit 1
        ;;
esac

SCAN_EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Scan Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Parse results if JSON report exists
JSON_REPORT="$REPORT_DIR/${SCAN_TYPE}_report_${TIMESTAMP}.json"
HTML_REPORT="$REPORT_DIR/${SCAN_TYPE}_report_${TIMESTAMP}.html"

if [ -f "$JSON_REPORT" ]; then
    echo -e "${BLUE}Analyzing results...${NC}"

    # Count alerts by risk level
    if command -v jq &> /dev/null; then
        HIGH=$(jq '[.site[].alerts[] | select(.riskcode=="3")] | length' "$JSON_REPORT" 2>/dev/null || echo "0")
        MEDIUM=$(jq '[.site[].alerts[] | select(.riskcode=="2")] | length' "$JSON_REPORT" 2>/dev/null || echo "0")
        LOW=$(jq '[.site[].alerts[] | select(.riskcode=="1")] | length' "$JSON_REPORT" 2>/dev/null || echo "0")
        INFO=$(jq '[.site[].alerts[] | select(.riskcode=="0")] | length' "$JSON_REPORT" 2>/dev/null || echo "0")

        echo ""
        echo "Alert Summary:"
        echo -e "  ${RED}🔴 High:${NC} $HIGH"
        echo -e "  ${YELLOW}🟠 Medium:${NC} $MEDIUM"
        echo -e "  ${BLUE}🟡 Low:${NC} $LOW"
        echo -e "  ℹ️  Informational: $INFO"
        echo ""

        if [ "$HIGH" -gt "0" ]; then
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}  ❌ CRITICAL: High-risk vulnerabilities found!${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo "High-risk issues:"
            jq -r '.site[].alerts[] | select(.riskcode=="3") | "  - \(.name) (\(.count) instances)"' "$JSON_REPORT"
            echo ""
            SCAN_EXIT_CODE=1
        elif [ "$MEDIUM" -gt "5" ]; then
            echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}  ⚠️  WARNING: Multiple medium-risk issues found${NC}"
            echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo "Consider addressing these issues before production deployment"
            echo ""
        else
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GREEN}  ✅ No critical vulnerabilities found${NC}"
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        fi
    else
        echo -e "${YELLOW}⚠️  jq not installed, skipping detailed analysis${NC}"
        echo "Install jq for detailed results: brew install jq"
        echo ""
    fi
fi

# Show report locations
echo "Reports generated:"
if [ -f "$HTML_REPORT" ]; then
    echo -e "  ${GREEN}✓${NC} HTML Report: $HTML_REPORT"
fi
if [ -f "$JSON_REPORT" ]; then
    echo -e "  ${GREEN}✓${NC} JSON Report: $JSON_REPORT"
fi
if [ -f "$REPORT_DIR/${SCAN_TYPE}_report_${TIMESTAMP}.md" ]; then
    echo -e "  ${GREEN}✓${NC} Markdown Report: $REPORT_DIR/${SCAN_TYPE}_report_${TIMESTAMP}.md"
fi

echo ""
echo -e "Open HTML report: ${BLUE}open $HTML_REPORT${NC}"
echo ""

# Exit with appropriate code
if [ $SCAN_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Scan completed with issues${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Scan completed successfully${NC}"
    exit 0
fi
