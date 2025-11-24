#!/bin/bash

# Full Flow Tracer
# 
# Executes both CloudWatch and X-Ray tracing scripts and generates a consolidated report.
#
# Usage:
#   ./scripts/trace-full-flow.sh "jengibre"
#   ./scripts/trace-full-flow.sh "jengibre" --hours 48
#   ./scripts/trace-full-flow.sh --requestId "abc-123"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SEARCH_TERM=""
REQUEST_ID=""
HOURS=24
ARGS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --requestId)
      REQUEST_ID="$2"
      ARGS="$ARGS --requestId $2"
      shift 2
      ;;
    --hours)
      HOURS="$2"
      ARGS="$ARGS --hours $2"
      shift 2
      ;;
    *)
      if [ -z "$SEARCH_TERM" ]; then
        SEARCH_TERM="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "$SEARCH_TERM" ] && [ -z "$REQUEST_ID" ]; then
  echo -e "${RED}Error:${NC} Please provide a search term or request ID"
  echo ""
  echo "Usage:"
  echo "  ./scripts/trace-full-flow.sh <searchTerm> [--hours <hours>]"
  echo "  ./scripts/trace-full-flow.sh --requestId <id> [--hours <hours>]"
  exit 1
fi

# Set search term for display
DISPLAY_TERM="${SEARCH_TERM:-$REQUEST_ID}"

echo -e "${GREEN}=== Full Flow Tracer ===${NC}"
echo ""
echo "Search Term: $DISPLAY_TERM"
echo "Time Range: Last $HOURS hours"
echo ""

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}Error:${NC} AWS credentials not configured"
  echo "Please configure AWS credentials using:"
  echo "  aws configure"
  echo "  or"
  echo "  export AWS_ACCESS_KEY_ID=..."
  echo "  export AWS_SECRET_ACCESS_KEY=..."
  exit 1
fi

# Check if required packages are installed
if ! command -v npx &> /dev/null; then
  echo -e "${RED}Error:${NC} npx not found. Please install Node.js"
  exit 1
fi

# Create reports directory
REPORTS_DIR="trace-reports"
mkdir -p "$REPORTS_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="$REPORTS_DIR/$DISPLAY_TERM-$TIMESTAMP"
mkdir -p "$REPORT_DIR"

echo -e "${YELLOW}Step 1: Querying CloudWatch Logs...${NC}"
echo ""

if [ -n "$REQUEST_ID" ]; then
  npx tsx scripts/trace-search-cloudwatch.ts --requestId "$REQUEST_ID" --hours "$HOURS" || {
    echo -e "${RED}CloudWatch tracing failed${NC}"
  }
else
  npx tsx scripts/trace-search-cloudwatch.ts "$SEARCH_TERM" --hours "$HOURS" || {
    echo -e "${RED}CloudWatch tracing failed${NC}"
  }
fi

# Move CloudWatch report if it exists
if ls trace-report-*.md 1> /dev/null 2>&1; then
  LATEST_CW_REPORT=$(ls -t trace-report-*.md | head -1)
  mv "$LATEST_CW_REPORT" "$REPORT_DIR/cloudwatch-report.md"
  echo -e "${GREEN}✓ CloudWatch report saved${NC}"
else
  echo -e "${YELLOW}⚠ No CloudWatch report generated${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Querying X-Ray Traces...${NC}"
echo ""

if [ -n "$REQUEST_ID" ]; then
  npx tsx scripts/trace-search-xray.ts --requestId "$REQUEST_ID" --hours "$HOURS" || {
    echo -e "${RED}X-Ray tracing failed${NC}"
  }
else
  npx tsx scripts/trace-search-xray.ts "$SEARCH_TERM" --hours "$HOURS" || {
    echo -e "${RED}X-Ray tracing failed${NC}"
  }
fi

# Move X-Ray report if it exists
if ls xray-trace-report-*.md 1> /dev/null 2>&1; then
  LATEST_XRAY_REPORT=$(ls -t xray-trace-report-*.md | head -1)
  mv "$LATEST_XRAY_REPORT" "$REPORT_DIR/xray-report.md"
  echo -e "${GREEN}✓ X-Ray report saved${NC}"
else
  echo -e "${YELLOW}⚠ No X-Ray report generated${NC}"
fi

# Generate consolidated report
echo ""
echo -e "${YELLOW}Step 3: Generating consolidated report...${NC}"

CONSOLIDATED_REPORT="$REPORT_DIR/consolidated-report.md"

cat > "$CONSOLIDATED_REPORT" << EOF
# Full Flow Trace Report

**Search Term:** $DISPLAY_TERM
**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Time Range:** Last $HOURS hours

## Overview

This report consolidates traces from both CloudWatch Logs and AWS X-Ray to provide a complete view of the request flow.

## Reports

EOF

if [ -f "$REPORT_DIR/cloudwatch-report.md" ]; then
  echo "- [CloudWatch Logs Report](./cloudwatch-report.md)" >> "$CONSOLIDATED_REPORT"
fi

if [ -f "$REPORT_DIR/xray-report.md" ]; then
  echo "- [X-Ray Traces Report](./xray-report.md)" >> "$CONSOLIDATED_REPORT"
fi

cat >> "$CONSOLIDATED_REPORT" << EOF

## How to Use This Report

1. **Start with CloudWatch Logs**: Review the CloudWatch report to see detailed logs from each Lambda function
2. **Check X-Ray Traces**: Review the X-Ray report to see the service map and timing information
3. **Look for Errors**: Both reports highlight errors - check the Errors sections
4. **Timeline Analysis**: Use the timeline sections to understand the flow and identify bottlenecks

## Common Issues

### No Studies Found
- Check if the query was translated correctly (e.g., "jengibre" → "ginger")
- Verify PubMed search filters in CloudWatch logs
- Check if all 3 search attempts (strict/relaxed/ultra-relaxed) failed

### No Real Data
- Verify that studies were found (check `studiesFound` in logs)
- Check if content-enricher received the studies
- Verify `hasRealData` flag in metadata

### Timeouts
- Check X-Ray traces for slow segments
- Look for Bedrock API calls taking too long
- Verify Lambda timeout settings

## Next Steps

If you found an issue:
1. Note the requestId or correlationId from the reports
2. Use these IDs to search for more specific traces
3. Check AWS Console for additional details:
   - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
   - X-Ray: https://console.aws.amazon.com/xray/home?region=us-east-1#/traces

EOF

echo -e "${GREEN}✓ Consolidated report generated${NC}"
echo ""

# Print summary
echo -e "${GREEN}=== Report Summary ===${NC}"
echo ""
echo "Report directory: $REPORT_DIR"
echo ""

if [ -f "$REPORT_DIR/cloudwatch-report.md" ]; then
  echo -e "${GREEN}✓${NC} CloudWatch Logs Report"
fi

if [ -f "$REPORT_DIR/xray-report.md" ]; then
  echo -e "${GREEN}✓${NC} X-Ray Traces Report"
fi

echo -e "${GREEN}✓${NC} Consolidated Report"
echo ""
echo "View the consolidated report:"
echo "  cat $CONSOLIDATED_REPORT"
echo ""
echo "Or open the directory:"
echo "  open $REPORT_DIR"
echo ""

