#!/bin/bash

# OWASP ZAP Baseline Scan Script for TGS Backend
# Documentation: https://www.zaproxy.org/docs/docker/baseline-scan/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OWASP ZAP Baseline Scan ===${NC}"
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
echo -e "${YELLOW}Starting OWASP ZAP Baseline Scan...${NC}"
echo "This will take approximately 5-10 minutes..."
echo ""

# Run ZAP baseline scan
docker run --rm \
    -v "$(pwd):/zap/wrk/:rw" \
    -t ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t "$API_BASE_URL" \
    -c "$CONFIG_FILE" \
    -r "$REPORT_DIR/zap-baseline-report.html" \
    -J "$REPORT_DIR/zap-baseline-report.json" \
    -w "$REPORT_DIR/zap-baseline-report.md" \
    -d \
    -I \
    -l INFO \
    --hook=/zap/wrk/tests/security/dast/zap-hooks.py \
    || true

# Check exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ ZAP Baseline Scan completed successfully!${NC}"
    echo -e "${GREEN}  No high or medium risk vulnerabilities found.${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}⚠ ZAP Baseline Scan completed with warnings${NC}"
    echo -e "${YELLOW}  Some low risk vulnerabilities were found.${NC}"
elif [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}✗ ZAP Baseline Scan found vulnerabilities!${NC}"
    echo -e "${RED}  High or medium risk vulnerabilities detected.${NC}"
else
    echo -e "${RED}✗ ZAP Baseline Scan failed with exit code $EXIT_CODE${NC}"
fi

echo ""
echo -e "${GREEN}Reports generated:${NC}"
echo "  HTML: $REPORT_DIR/zap-baseline-report.html"
echo "  JSON: $REPORT_DIR/zap-baseline-report.json"
echo "  Markdown: $REPORT_DIR/zap-baseline-report.md"
echo ""

# Display summary from JSON report if jq is available
if command -v jq &> /dev/null && [ -f "$REPORT_DIR/zap-baseline-report.json" ]; then
    echo -e "${GREEN}=== Vulnerability Summary ===${NC}"

    HIGH=$(jq '[.site[].alerts[] | select(.riskcode == "3")] | length' "$REPORT_DIR/zap-baseline-report.json")
    MEDIUM=$(jq '[.site[].alerts[] | select(.riskcode == "2")] | length' "$REPORT_DIR/zap-baseline-report.json")
    LOW=$(jq '[.site[].alerts[] | select(.riskcode == "1")] | length' "$REPORT_DIR/zap-baseline-report.json")
    INFO=$(jq '[.site[].alerts[] | select(.riskcode == "0")] | length' "$REPORT_DIR/zap-baseline-report.json")

    echo -e "  ${RED}High: $HIGH${NC}"
    echo -e "  ${YELLOW}Medium: $MEDIUM${NC}"
    echo -e "  ${GREEN}Low: $LOW${NC}"
    echo -e "  Info: $INFO"
    echo ""

    # Display high risk vulnerabilities
    if [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}=== High Risk Vulnerabilities ===${NC}"
        jq -r '.site[].alerts[] | select(.riskcode == "3") | "  - \(.name) (\(.count) instances)"' "$REPORT_DIR/zap-baseline-report.json"
        echo ""
    fi

    # Display medium risk vulnerabilities
    if [ "$MEDIUM" -gt 0 ]; then
        echo -e "${YELLOW}=== Medium Risk Vulnerabilities ===${NC}"
        jq -r '.site[].alerts[] | select(.riskcode == "2") | "  - \(.name) (\(.count) instances)"' "$REPORT_DIR/zap-baseline-report.json"
        echo ""
    fi
fi

echo -e "${GREEN}=== Scan Complete ===${NC}"

exit $EXIT_CODE
