#!/bin/bash

# Weekly System Review Script
# Requirements: 9.1, 9.2
# Performs weekly health checks and generates a review report

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${SCRIPT_DIR}/reports"
REPORT_FILE="${REPORT_DIR}/weekly-review-$(date +%Y-%m-%d).md"

# Create reports directory if it doesn't exist
mkdir -p "${REPORT_DIR}"

echo "📊 Weekly System Review - $(date +%Y-%m-%d)"
echo "=================================================="
echo ""

# Start report
cat > "${REPORT_FILE}" << EOF
# Weekly System Review

**Date:** $(date +"%Y-%m-%d %H:%M:%S")  
**Period:** Last 7 days  
**Environment:** Production

## Executive Summary

EOF

# Function to check CloudWatch metrics
check_metrics() {
    echo "📈 Checking CloudWatch Metrics..."
    
    # Get Lambda metrics
    LAMBDA_ERRORS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Errors \
        --dimensions Name=FunctionName,Value=search-api-lancedb \
        --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 604800 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    LAMBDA_INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value=search-api-lancedb \
        --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 604800 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    # Calculate error rate
    if [ "$LAMBDA_INVOCATIONS" != "0" ] && [ "$LAMBDA_INVOCATIONS" != "None" ]; then
        ERROR_RATE=$(echo "scale=2; ($LAMBDA_ERRORS / $LAMBDA_INVOCATIONS) * 100" | bc)
    else
        ERROR_RATE="0"
    fi
    
    cat >> "${REPORT_FILE}" << EOF
### Key Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Invocations | ${LAMBDA_INVOCATIONS} | - | ℹ️ |
| Total Errors | ${LAMBDA_ERRORS} | < 1% | $([ $(echo "$ERROR_RATE < 1" | bc) -eq 1 ] && echo "✅" || echo "⚠️") |
| Error Rate | ${ERROR_RATE}% | < 1% | $([ $(echo "$ERROR_RATE < 1" | bc) -eq 1 ] && echo "✅" || echo "⚠️") |

EOF

    echo "  ✓ Invocations: ${LAMBDA_INVOCATIONS}"
    echo "  ✓ Errors: ${LAMBDA_ERRORS}"
    echo "  ✓ Error Rate: ${ERROR_RATE}%"
}

# Function to check alarms
check_alarms() {
    echo ""
    echo "🚨 Checking CloudWatch Alarms..."
    
    ALARM_COUNT=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "suplementia" \
        --state-value ALARM \
        --query 'length(MetricAlarms)' \
        --output text 2>/dev/null || echo "0")
    
    cat >> "${REPORT_FILE}" << EOF

### CloudWatch Alarms

- **Active Alarms:** ${ALARM_COUNT}
- **Status:** $([ "$ALARM_COUNT" -eq "0" ] && echo "✅ All alarms OK" || echo "⚠️ ${ALARM_COUNT} alarm(s) triggered")

EOF

    if [ "$ALARM_COUNT" != "0" ]; then
        echo "  ⚠️  ${ALARM_COUNT} alarm(s) in ALARM state"
        
        aws cloudwatch describe-alarms \
            --alarm-name-prefix "suplementia" \
            --state-value ALARM \
            --query 'MetricAlarms[*].[AlarmName,StateReason]' \
            --output text >> "${REPORT_FILE}"
    else
        echo "  ✓ All alarms OK"
    fi
}

# Function to check Lambda functions
check_lambda_health() {
    echo ""
    echo "⚡ Checking Lambda Functions..."
    
    cat >> "${REPORT_FILE}" << EOF

### Lambda Functions

EOF

    FUNCTIONS=("search-api-lancedb" "embedding-generator" "discovery-worker-lancedb")
    
    for func in "${FUNCTIONS[@]}"; do
        STATUS=$(aws lambda get-function \
            --function-name "$func" \
            --query 'Configuration.State' \
            --output text 2>/dev/null || echo "NotFound")
        
        LAST_MODIFIED=$(aws lambda get-function \
            --function-name "$func" \
            --query 'Configuration.LastModified' \
            --output text 2>/dev/null || echo "N/A")
        
        cat >> "${REPORT_FILE}" << EOF
- **${func}**
  - Status: ${STATUS}
  - Last Modified: ${LAST_MODIFIED}
  - Health: $([ "$STATUS" = "Active" ] && echo "✅" || echo "⚠️")

EOF

        echo "  ✓ ${func}: ${STATUS}"
    done
}

# Function to check DynamoDB tables
check_dynamodb() {
    echo ""
    echo "💾 Checking DynamoDB Tables..."
    
    cat >> "${REPORT_FILE}" << EOF

### DynamoDB Tables

EOF

    TABLES=("supplement-cache" "discovery-queue")
    
    for table in "${TABLES[@]}"; do
        STATUS=$(aws dynamodb describe-table \
            --table-name "$table" \
            --query 'Table.TableStatus' \
            --output text 2>/dev/null || echo "NotFound")
        
        ITEM_COUNT=$(aws dynamodb describe-table \
            --table-name "$table" \
            --query 'Table.ItemCount' \
            --output text 2>/dev/null || echo "0")
        
        cat >> "${REPORT_FILE}" << EOF
- **${table}**
  - Status: ${STATUS}
  - Item Count: ${ITEM_COUNT}
  - Health: $([ "$STATUS" = "ACTIVE" ] && echo "✅" || echo "⚠️")

EOF

        echo "  ✓ ${table}: ${STATUS} (${ITEM_COUNT} items)"
    done
}

# Function to check EFS
check_efs() {
    echo ""
    echo "📁 Checking EFS File System..."
    
    EFS_ID=$(aws efs describe-file-systems \
        --query 'FileSystems[?Name==`suplementia-lancedb`].FileSystemId' \
        --output text 2>/dev/null || echo "NotFound")
    
    if [ "$EFS_ID" != "NotFound" ] && [ -n "$EFS_ID" ]; then
        EFS_STATUS=$(aws efs describe-file-systems \
            --file-system-id "$EFS_ID" \
            --query 'FileSystems[0].LifeCycleState' \
            --output text 2>/dev/null || echo "Unknown")
        
        EFS_SIZE=$(aws efs describe-file-systems \
            --file-system-id "$EFS_ID" \
            --query 'FileSystems[0].SizeInBytes.Value' \
            --output text 2>/dev/null || echo "0")
        
        EFS_SIZE_MB=$(echo "scale=2; $EFS_SIZE / 1024 / 1024" | bc)
        
        cat >> "${REPORT_FILE}" << EOF

### EFS File System

- **File System ID:** ${EFS_ID}
- **Status:** ${EFS_STATUS}
- **Size:** ${EFS_SIZE_MB} MB
- **Health:** $([ "$EFS_STATUS" = "available" ] && echo "✅" || echo "⚠️")

EOF

        echo "  ✓ EFS: ${EFS_STATUS} (${EFS_SIZE_MB} MB)"
    else
        cat >> "${REPORT_FILE}" << EOF

### EFS File System

- **Status:** ⚠️ Not Found

EOF
        echo "  ⚠️  EFS not found"
    fi
}

# Function to check recent errors
check_recent_errors() {
    echo ""
    echo "🔍 Checking Recent Errors..."
    
    cat >> "${REPORT_FILE}" << EOF

### Recent Errors (Last 7 Days)

EOF

    # Get recent error logs
    ERROR_LOGS=$(aws logs filter-log-events \
        --log-group-name /aws/lambda/search-api-lancedb \
        --start-time $(($(date +%s) - 604800))000 \
        --filter-pattern "ERROR" \
        --max-items 5 \
        --query 'events[*].message' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$ERROR_LOGS" ]; then
        echo "$ERROR_LOGS" | head -5 >> "${REPORT_FILE}"
        echo ""
        echo "  ⚠️  Found recent errors (see report)"
    else
        echo "No recent errors found" >> "${REPORT_FILE}"
        echo "  ✓ No recent errors"
    fi
}

# Function to generate recommendations
generate_recommendations() {
    cat >> "${REPORT_FILE}" << EOF

## Recommendations

EOF

    # Check error rate
    if [ $(echo "$ERROR_RATE > 1" | bc) -eq 1 ]; then
        cat >> "${REPORT_FILE}" << EOF
- ⚠️ **High Error Rate:** Error rate is ${ERROR_RATE}%, exceeding 1% target. Investigate error logs.
EOF
    fi
    
    # Check alarms
    if [ "$ALARM_COUNT" != "0" ]; then
        cat >> "${REPORT_FILE}" << EOF
- ⚠️ **Active Alarms:** ${ALARM_COUNT} alarm(s) triggered. Review and resolve.
EOF
    fi
    
    # Add standard recommendations
    cat >> "${REPORT_FILE}" << EOF
- ✅ Continue monitoring metrics daily
- ✅ Review cost analysis monthly
- ✅ Run performance tests quarterly
- ✅ Update documentation as needed

EOF
}

# Function to add action items
add_action_items() {
    cat >> "${REPORT_FILE}" << EOF

## Action Items

- [ ] Review error logs if error rate > 1%
- [ ] Investigate and resolve any active alarms
- [ ] Check cache hit rate (target ≥ 85%)
- [ ] Verify all Lambda functions are healthy
- [ ] Review DynamoDB table sizes
- [ ] Check EFS storage usage
- [ ] Update team on system status

## Next Review

**Date:** $(date -d '+7 days' +%Y-%m-%d)  
**Reviewer:** DevOps Team

---

*Generated by weekly-review.sh*
EOF
}

# Run all checks
check_metrics
check_alarms
check_lambda_health
check_dynamodb
check_efs
check_recent_errors
generate_recommendations
add_action_items

echo ""
echo "✅ Weekly review complete!"
echo ""
echo "Report saved to: ${REPORT_FILE}"
echo ""
echo "Summary:"
echo "  - Error Rate: ${ERROR_RATE}%"
echo "  - Active Alarms: ${ALARM_COUNT}"
echo "  - Lambda Functions: Checked"
echo "  - DynamoDB Tables: Checked"
echo "  - EFS: Checked"
echo ""
echo "Next steps:"
echo "  1. Review the full report: cat ${REPORT_FILE}"
echo "  2. Address any warnings or recommendations"
echo "  3. Share with team if needed"
echo ""
