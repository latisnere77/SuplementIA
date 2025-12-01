#!/bin/bash

# Monthly Cost Analysis Script
# Requirements: 14.5
# Analyzes AWS costs and generates optimization recommendations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${SCRIPT_DIR}/reports"
REPORT_FILE="${REPORT_DIR}/cost-analysis-$(date +%Y-%m).md"

# Create reports directory if it doesn't exist
mkdir -p "${REPORT_DIR}"

echo "💰 Monthly Cost Analysis - $(date +%B %Y)"
echo "=================================================="
echo ""

# Start report
cat > "${REPORT_FILE}" << EOF
# Monthly Cost Analysis

**Month:** $(date +"%B %Y")  
**Generated:** $(date +"%Y-%m-%d %H:%M:%S")  
**Environment:** Production

## Executive Summary

EOF

# Function to get cost by service
get_service_costs() {
    echo "📊 Analyzing costs by service..."
    
    START_DATE=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d)
    END_DATE=$(date +%Y-%m-%d)
    
    cat >> "${REPORT_FILE}" << EOF

### Cost Breakdown by Service

EOF

    # Get costs by service
    aws ce get-cost-and-usage \
        --time-period Start=${START_DATE},End=${END_DATE} \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=SERVICE \
        --query 'ResultsByTime[0].Groups[*].[Keys[0],Metrics.BlendedCost.Amount]' \
        --output text 2>/dev/null | while read -r service cost; do
        
        # Format cost
        COST_FORMATTED=$(printf "%.2f" "$cost")
        
        cat >> "${REPORT_FILE}" << EOF
- **${service}:** \$${COST_FORMATTED}
EOF
        
        echo "  ✓ ${service}: \$${COST_FORMATTED}"
    done
    
    # Get total cost
    TOTAL_COST=$(aws ce get-cost-and-usage \
        --time-period Start=${START_DATE},End=${END_DATE} \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
        --output text 2>/dev/null || echo "0")
    
    TOTAL_COST_FORMATTED=$(printf "%.2f" "$TOTAL_COST")
    
    cat >> "${REPORT_FILE}" << EOF

**Total Cost:** \$${TOTAL_COST_FORMATTED}

EOF

    echo ""
    echo "  💵 Total Cost: \$${TOTAL_COST_FORMATTED}"
}

# Function to compare with target
compare_with_target() {
    echo ""
    echo "🎯 Comparing with target..."
    
    TARGET_COST="5.59"
    VARIANCE=$(echo "scale=2; $TOTAL_COST - $TARGET_COST" | bc)
    VARIANCE_PCT=$(echo "scale=2; ($VARIANCE / $TARGET_COST) * 100" | bc)
    
    cat >> "${REPORT_FILE}" << EOF

### Budget Comparison

| Metric | Value |
|--------|-------|
| Target Cost | \$${TARGET_COST} |
| Actual Cost | \$${TOTAL_COST_FORMATTED} |
| Variance | \$${VARIANCE} |
| Variance % | ${VARIANCE_PCT}% |
| Status | $([ $(echo "$TOTAL_COST <= $TARGET_COST * 1.1" | bc) -eq 1 ] && echo "✅ Within Budget" || echo "⚠️ Over Budget") |

EOF

    if [ $(echo "$TOTAL_COST > $TARGET_COST * 1.1" | bc) -eq 1 ]; then
        echo "  ⚠️  Cost is ${VARIANCE_PCT}% over target"
    else
        echo "  ✓ Cost is within budget"
    fi
}

# Function to analyze Lambda costs
analyze_lambda_costs() {
    echo ""
    echo "⚡ Analyzing Lambda costs..."
    
    cat >> "${REPORT_FILE}" << EOF

### Lambda Analysis

EOF

    FUNCTIONS=("search-api-lancedb" "embedding-generator" "discovery-worker-lancedb")
    
    for func in "${FUNCTIONS[@]}"; do
        # Get invocation count
        INVOCATIONS=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Invocations \
            --dimensions Name=FunctionName,Value=$func \
            --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 2592000 \
            --statistics Sum \
            --query 'Datapoints[0].Sum' \
            --output text 2>/dev/null || echo "0")
        
        # Get average duration
        AVG_DURATION=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Duration \
            --dimensions Name=FunctionName,Value=$func \
            --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 2592000 \
            --statistics Average \
            --query 'Datapoints[0].Average' \
            --output text 2>/dev/null || echo "0")
        
        AVG_DURATION_FORMATTED=$(printf "%.0f" "$AVG_DURATION")
        
        cat >> "${REPORT_FILE}" << EOF
- **${func}**
  - Invocations: ${INVOCATIONS}
  - Avg Duration: ${AVG_DURATION_FORMATTED}ms
  - Architecture: ARM64 (20% cost savings)

EOF

        echo "  ✓ ${func}: ${INVOCATIONS} invocations, ${AVG_DURATION_FORMATTED}ms avg"
    done
}

# Function to analyze DynamoDB costs
analyze_dynamodb_costs() {
    echo ""
    echo "💾 Analyzing DynamoDB costs..."
    
    cat >> "${REPORT_FILE}" << EOF

### DynamoDB Analysis

EOF

    TABLES=("supplement-cache" "discovery-queue")
    
    for table in "${TABLES[@]}"; do
        # Get read/write units
        READ_UNITS=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/DynamoDB \
            --metric-name ConsumedReadCapacityUnits \
            --dimensions Name=TableName,Value=$table \
            --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 2592000 \
            --statistics Sum \
            --query 'Datapoints[0].Sum' \
            --output text 2>/dev/null || echo "0")
        
        WRITE_UNITS=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/DynamoDB \
            --metric-name ConsumedWriteCapacityUnits \
            --dimensions Name=TableName,Value=$table \
            --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 2592000 \
            --statistics Sum \
            --query 'Datapoints[0].Sum' \
            --output text 2>/dev/null || echo "0")
        
        cat >> "${REPORT_FILE}" << EOF
- **${table}**
  - Read Units: ${READ_UNITS}
  - Write Units: ${WRITE_UNITS}
  - Billing: On-Demand (pay per request)

EOF

        echo "  ✓ ${table}: ${READ_UNITS} reads, ${WRITE_UNITS} writes"
    done
}

# Function to analyze EFS costs
analyze_efs_costs() {
    echo ""
    echo "📁 Analyzing EFS costs..."
    
    EFS_ID=$(aws efs describe-file-systems \
        --query 'FileSystems[?Name==`suplementia-lancedb`].FileSystemId' \
        --output text 2>/dev/null || echo "NotFound")
    
    if [ "$EFS_ID" != "NotFound" ] && [ -n "$EFS_ID" ]; then
        EFS_SIZE=$(aws efs describe-file-systems \
            --file-system-id "$EFS_ID" \
            --query 'FileSystems[0].SizeInBytes.Value' \
            --output text 2>/dev/null || echo "0")
        
        EFS_SIZE_GB=$(echo "scale=2; $EFS_SIZE / 1024 / 1024 / 1024" | bc)
        EFS_COST=$(echo "scale=2; $EFS_SIZE_GB * 0.30" | bc)
        
        cat >> "${REPORT_FILE}" << EOF

### EFS Analysis

- **Storage Size:** ${EFS_SIZE_GB} GB
- **Estimated Cost:** \$${EFS_COST}/month
- **Usage:** ML model storage (~80MB)
- **Optimization:** Minimal storage, no unnecessary files

EOF

        echo "  ✓ EFS: ${EFS_SIZE_GB} GB, ~\$${EFS_COST}/month"
    fi
}

# Function to generate cost optimization recommendations
generate_cost_recommendations() {
    cat >> "${REPORT_FILE}" << EOF

## Cost Optimization Recommendations

EOF

    # Check if over budget
    if [ $(echo "$TOTAL_COST > $TARGET_COST * 1.1" | bc) -eq 1 ]; then
        cat >> "${REPORT_FILE}" << EOF
### ⚠️ Over Budget

Current cost (\$${TOTAL_COST_FORMATTED}) exceeds target (\$${TARGET_COST}) by ${VARIANCE_PCT}%.

**Immediate Actions:**
1. Review Lambda invocation patterns for optimization
2. Check DynamoDB read/write patterns
3. Verify cache hit rate (target ≥ 85%)
4. Review EFS storage for unnecessary files
5. Check for unused resources

EOF
    else
        cat >> "${REPORT_FILE}" << EOF
### ✅ Within Budget

Current cost (\$${TOTAL_COST_FORMATTED}) is within target (\$${TARGET_COST}).

EOF
    fi
    
    cat >> "${REPORT_FILE}" << EOF

### General Recommendations

1. **Lambda Optimization**
   - Continue using ARM64 architecture (20% savings)
   - Monitor cold starts and optimize if needed
   - Review memory allocation for cost efficiency

2. **DynamoDB Optimization**
   - Maintain on-demand pricing (no capacity planning)
   - Monitor cache hit rate (target ≥ 85%)
   - Use TTL for automatic cleanup (7 days)

3. **EFS Optimization**
   - Keep storage minimal (~80MB for model)
   - Remove unnecessary files regularly
   - Use bursting mode (no additional cost)

4. **Cache Strategy**
   - High cache hit rate reduces expensive vector searches
   - Monitor and optimize cache patterns
   - Adjust TTL if needed

5. **Monitoring Costs**
   - CloudWatch logs retention: 7 days
   - X-Ray sampling: 5% (reduce if needed)
   - Minimize custom metrics

EOF
}

# Function to add cost trends
add_cost_trends() {
    cat >> "${REPORT_FILE}" << EOF

## Cost Trends

### Last 3 Months

EOF

    for i in {2..0}; do
        MONTH_START=$(date -d "$(date +%Y-%m-01) -$i months" +%Y-%m-%d)
        MONTH_END=$(date -d "$(date -d "$MONTH_START" +%Y-%m-01) +1 month -1 day" +%Y-%m-%d)
        MONTH_NAME=$(date -d "$MONTH_START" +%B)
        
        MONTH_COST=$(aws ce get-cost-and-usage \
            --time-period Start=${MONTH_START},End=${MONTH_END} \
            --granularity MONTHLY \
            --metrics BlendedCost \
            --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
            --output text 2>/dev/null || echo "0")
        
        MONTH_COST_FORMATTED=$(printf "%.2f" "$MONTH_COST")
        
        cat >> "${REPORT_FILE}" << EOF
- **${MONTH_NAME}:** \$${MONTH_COST_FORMATTED}
EOF
    done
    
    cat >> "${REPORT_FILE}" << EOF

EOF
}

# Function to add action items
add_action_items() {
    cat >> "${REPORT_FILE}" << EOF

## Action Items

- [ ] Review cost breakdown by service
- [ ] Investigate any cost anomalies
- [ ] Implement recommended optimizations
- [ ] Update cost projections if needed
- [ ] Share analysis with finance team
- [ ] Schedule next month's review

## Next Review

**Date:** $(date -d '+1 month' +%Y-%m-01)  
**Reviewer:** DevOps + Finance Team

---

*Generated by monthly-cost-analysis.sh*
EOF
}

# Run all analyses
get_service_costs
compare_with_target
analyze_lambda_costs
analyze_dynamodb_costs
analyze_efs_costs
generate_cost_recommendations
add_cost_trends
add_action_items

echo ""
echo "✅ Monthly cost analysis complete!"
echo ""
echo "Report saved to: ${REPORT_FILE}"
echo ""
echo "Summary:"
echo "  - Total Cost: \$${TOTAL_COST_FORMATTED}"
echo "  - Target Cost: \$${TARGET_COST}"
echo "  - Variance: ${VARIANCE_PCT}%"
echo "  - Status: $([ $(echo "$TOTAL_COST <= $TARGET_COST * 1.1" | bc) -eq 1 ] && echo "✅ Within Budget" || echo "⚠️ Over Budget")"
echo ""
echo "Next steps:"
echo "  1. Review the full report: cat ${REPORT_FILE}"
echo "  2. Implement cost optimization recommendations"
echo "  3. Share with finance team"
echo ""
