#!/bin/bash

# OWASP ZAP Full Scan Script for TGS Backend
# Documentation: https://www.zaproxy.org/docs/docker/full-scan/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OWASP ZAP Full Scan ===${NC}"
echo -e "${YELLOW}⚠ Warning: This is a comprehensive active scan that may take 30-60 minutes${NC}"
echo ""

# Configuration
API_BASE_URL="${API_BASE_URL:-http://host.docker.internal:3000}"
REPORT_DIR="tests/security/reports"
CONFIG_FILE="tests/security/dast/zap-config.yaml"

# Create reports directory if it doesn't exist
mkdir -p "$REPORT_DIR"

echo -e "${YELLOW}Configuration:${NC}"
echo "  API URL: $API_BASE_URL"
echo "  Report Directory: $REPORT_DIR"
echo "  Config File: $CONFIG_FILE"
echo ""

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if curl -s -f "$API_BASE_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running at $API_BASE_URL${NC}"
    echo -e "${YELLOW}Please start the backend with: pnpm run start:dev${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting OWASP ZAP Full Scan...${NC}"
echo "This will perform:"
echo "  1. Spider crawl (5-10 minutes)"
echo "  2. Active security scanning (20-40 minutes)"
echo "  3. Report generation (1-2 minutes)"
echo ""
echo "Total estimated time: 30-60 minutes"
echo ""

# Prompt for confirmation
read -p "Do you want to continue? (yes/no): " -n 3 -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Scan cancelled by user${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting scan...${NC}"
echo ""

# Run ZAP full scan with automation framework
docker run --rm \
    -v "$(pwd):/zap/wrk/:rw" \
    -t ghcr.io/zaproxy/zaproxy:stable \
    zap-full-scan.py \
    -t "$API_BASE_URL" \
    -c "$CONFIG_FILE" \
    -r "$REPORT_DIR/zap-full-report.html" \
    -J "$REPORT_DIR/zap-full-report.json" \
    -w "$REPORT_DIR/zap-full-report.md" \
    -x "$REPORT_DIR/zap-full-report.xml" \
    -d \
    -I \
    -l INFO \
    -T 3600 \
    --hook=/zap/wrk/tests/security/dast/zap-hooks.py \
    || true

# Check exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ ZAP Full Scan completed successfully!${NC}"
    echo -e "${GREEN}  No high or medium risk vulnerabilities found.${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}⚠ ZAP Full Scan completed with warnings${NC}"
    echo -e "${YELLOW}  Some low risk vulnerabilities were found.${NC}"
elif [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}✗ ZAP Full Scan found vulnerabilities!${NC}"
    echo -e "${RED}  High or medium risk vulnerabilities detected.${NC}"
else
    echo -e "${RED}✗ ZAP Full Scan failed with exit code $EXIT_CODE${NC}"
fi

echo ""
echo -e "${GREEN}Reports generated:${NC}"
echo "  HTML: $REPORT_DIR/zap-full-report.html"
echo "  JSON: $REPORT_DIR/zap-full-report.json"
echo "  Markdown: $REPORT_DIR/zap-full-report.md"
echo "  XML: $REPORT_DIR/zap-full-report.xml"
echo ""

# Display detailed summary from JSON report if jq is available
if command -v jq &> /dev/null && [ -f "$REPORT_DIR/zap-full-report.json" ]; then
    echo -e "${GREEN}=== Comprehensive Vulnerability Summary ===${NC}"

    HIGH=$(jq '[.site[].alerts[] | select(.riskcode == "3")] | length' "$REPORT_DIR/zap-full-report.json")
    MEDIUM=$(jq '[.site[].alerts[] | select(.riskcode == "2")] | length' "$REPORT_DIR/zap-full-report.json")
    LOW=$(jq '[.site[].alerts[] | select(.riskcode == "1")] | length' "$REPORT_DIR/zap-full-report.json")
    INFO=$(jq '[.site[].alerts[] | select(.riskcode == "0")] | length' "$REPORT_DIR/zap-full-report.json")

    echo -e "  ${RED}High: $HIGH${NC}"
    echo -e "  ${YELLOW}Medium: $MEDIUM${NC}"
    echo -e "  ${GREEN}Low: $LOW${NC}"
    echo -e "  Info: $INFO"
    echo ""

    # Display high risk vulnerabilities with details
    if [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}=== High Risk Vulnerabilities ===${NC}"
        jq -r '.site[].alerts[] | select(.riskcode == "3") | "  - \(.name)\n    Description: \(.desc)\n    Instances: \(.count)\n    Solution: \(.solution)\n"' "$REPORT_DIR/zap-full-report.json"
        echo ""
    fi

    # Display medium risk vulnerabilities with details
    if [ "$MEDIUM" -gt 0 ]; then
        echo -e "${YELLOW}=== Medium Risk Vulnerabilities ===${NC}"
        jq -r '.site[].alerts[] | select(.riskcode == "2") | "  - \(.name)\n    Description: \(.desc)\n    Instances: \(.count)\n    Solution: \(.solution)\n"' "$REPORT_DIR/zap-full-report.json"
        echo ""
    fi

    # Display top 5 low risk vulnerabilities
    if [ "$LOW" -gt 0 ]; then
        echo -e "${GREEN}=== Top 5 Low Risk Vulnerabilities ===${NC}"
        jq -r '.site[].alerts[] | select(.riskcode == "1") | "\(.name) (\(.count) instances)"' "$REPORT_DIR/zap-full-report.json" | head -5 | sed 's/^/  - /'
        echo ""
    fi

    # Calculate and display confidence scores
    echo -e "${GREEN}=== Scan Statistics ===${NC}"
    TOTAL_ALERTS=$(jq '[.site[].alerts[]] | length' "$REPORT_DIR/zap-full-report.json")
    URLS_TESTED=$(jq '[.site[] | .@name] | length' "$REPORT_DIR/zap-full-report.json")

    echo "  Total Alerts: $TOTAL_ALERTS"
    echo "  URLs Tested: $URLS_TESTED"
    echo ""
fi

# Display next steps
echo -e "${GREEN}=== Next Steps ===${NC}"
if [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}1. Review the HTML report for detailed vulnerability information${NC}"
    echo -e "${RED}2. Fix high and medium risk vulnerabilities${NC}"
    echo -e "${RED}3. Re-run the scan to verify fixes${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}1. Review low risk vulnerabilities${NC}"
    echo -e "${YELLOW}2. Consider fixing based on risk tolerance${NC}"
    echo -e "${YELLOW}3. Document accepted risks${NC}"
else
    echo -e "${GREEN}1. Review the report for informational findings${NC}"
    echo -e "${GREEN}2. Maintain current security posture${NC}"
    echo -e "${GREEN}3. Schedule regular scans${NC}"
fi
echo ""

echo -e "${GREEN}=== Scan Complete ===${NC}"

exit $EXIT_CODE
