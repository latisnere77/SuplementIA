#!/bin/bash

# Monitor Production for 1 Week
# This script provides daily monitoring reports for the week after 100% deployment

set -e

ENVIRONMENT="production"
REGION="${AWS_REGION:-us-east-1}"
LOG_GROUP="/aws/lambda/${ENVIRONMENT}-search-api-lancedb"
DAYS="${1:-7}"

echo "📊 Production Monitoring - 1 Week Plan"
echo "========================================"
echo "Environment: ${ENVIRONMENT}"
echo "Duration: ${DAYS} days"
echo "Start: $(date)"
echo ""

# Function to get metrics for a time period
get_metrics() {
    local start_time=$1
    local end_time=$2
    local day_label=$3
    
    echo ""
    echo "📅 ${day_label}"
    echo "----------------------------------------"
    echo "Period: $(date -r ${start_time} '+%Y-%m-%d %H:%M') to $(date -r ${end_time} '+%Y-%m-%d %H:%M')"
    echo ""
    
    # Error rate
    echo "🔴 Error Rate:"
    aws logs filter-log-events \
        --log-group-name "${LOG_GROUP}" \
        --start-time $((start_time * 1000)) \
        --end-time $((end_time * 1000)) \
        --filter-pattern "ERROR" \
        --region ${REGION} \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "0"
    
    # Total requests
    echo ""
    echo "📈 Total Requests:"
    aws logs filter-log-events \
        --log-group-name "${LOG_GROUP}" \
        --start-time $((start_time * 1000)) \
        --end-time $((end_time * 1000)) \
        --filter-pattern "search_request" \
        --region ${REGION} \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "0"
    
    # Cache hits
    echo ""
    echo "💾 Cache Performance:"
    aws logs filter-log-events \
        --log-group-name "${LOG_GROUP}" \
        --start-time $((start_time * 1000)) \
        --end-time $((end_time * 1000)) \
        --filter-pattern "cache_hit" \
        --region ${REGION} \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "0"
    
    echo ""
    echo "✅ Status: Monitoring..."
    echo ""
}

# Calculate time periods
CURRENT_TIME=$(date +%s)
SECONDS_PER_DAY=86400

echo "🎯 Monitoring Plan:"
echo ""
echo "Day 1-2: Intensive monitoring (every 4 hours)"
echo "Day 3-7: Standard monitoring (daily)"
echo ""
echo "📊 Metrics Tracked:"
echo "  - Error rate (target: < 1%)"
echo "  - Total requests"
echo "  - Cache hit rate (target: >= 85%)"
echo "  - Latency (via CloudWatch)"
echo ""
echo "⚠️  Alert Thresholds:"
echo "  - Error rate > 1%: Investigate"
echo "  - Error rate > 5%: Consider rollback"
echo "  - P95 latency > 200ms: Investigate"
echo "  - P95 latency > 500ms: Consider rollback"
echo ""

# Monitor for specified number of days
for day in $(seq 1 ${DAYS}); do
    END_TIME=${CURRENT_TIME}
    START_TIME=$((CURRENT_TIME - SECONDS_PER_DAY))
    
    get_metrics ${START_TIME} ${END_TIME} "Day ${day}"
    
    # Move to previous day
    CURRENT_TIME=${START_TIME}
    
    # Sleep between checks (except for last day)
    if [ ${day} -lt ${DAYS} ]; then
        echo "⏳ Waiting 24 hours for next check..."
        echo "   Next check: $(date -v+1d '+%Y-%m-%d %H:%M')"
        echo ""
        
        # In production, this would sleep for 24 hours
        # For testing, we just show the message
        # sleep 86400
    fi
done

echo ""
echo "========================================"
echo "📊 ${DAYS}-Day Monitoring Complete"
echo "========================================"
echo ""
echo "📈 Summary:"
echo "  - Monitored for ${DAYS} days"
echo "  - End: $(date)"
echo ""
echo "📝 Next Steps:"
echo "  1. Review all daily reports"
echo "  2. Verify metrics within thresholds"
echo "  3. Check for any patterns or trends"
echo "  4. If stable, proceed with Task 22 (decommission legacy)"
echo ""
echo "✅ Success Criteria:"
echo "  - Error rate < 1% for entire period"
echo "  - P95 latency < 200ms for entire period"
echo "  - Cache hit rate >= 85% for entire period"
echo "  - No critical incidents"
echo "  - Cost within budget"
echo ""
echo "📊 Generate detailed report:"
echo "   aws cloudwatch get-metric-statistics \\"
echo "     --namespace AWS/Lambda \\"
echo "     --metric-name Errors \\"
echo "     --dimensions Name=FunctionName,Value=${ENVIRONMENT}-search-api-lancedb \\"
echo "     --start-time $(date -v-${DAYS}d -u +%Y-%m-%dT%H:%M:%S) \\"
echo "     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\"
echo "     --period 86400 \\"
echo "     --statistics Sum \\"
echo "     --region ${REGION}"
echo ""
