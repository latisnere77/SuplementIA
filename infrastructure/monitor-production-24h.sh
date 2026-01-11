#!/bin/bash

# Monitor Production Deployment for 24 Hours
# This script provides continuous monitoring with alerts and reporting

set -e

ENVIRONMENT="production"
REGION="${AWS_REGION:-us-east-1}"
DURATION_HOURS=24
CHECK_INTERVAL_SECONDS=300  # 5 minutes

echo "📊 24-Hour Production Monitoring"
echo "================================"
echo "Environment: ${ENVIRONMENT}"
echo "Duration: ${DURATION_HOURS} hours"
echo "Check Interval: ${CHECK_INTERVAL_SECONDS} seconds ($(($CHECK_INTERVAL_SECONDS / 60)) minutes)"
echo "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Create monitoring log file
LOG_FILE="production-monitoring-$(date +%Y%m%d-%H%M%S).log"
echo "📝 Logging to: ${LOG_FILE}"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

# Function to get metric value
get_metric() {
    local namespace=$1
    local metric_name=$2
    local statistic=$3
    local period_minutes=$4
    
    aws cloudwatch get-metric-statistics \
        --namespace "${namespace}" \
        --metric-name "${metric_name}" \
        --start-time "$(date -u -d "${period_minutes} minutes ago" +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --statistics "${statistic}" \
        --region "${REGION}" \
        --query 'Datapoints[0].'"${statistic}" \
        --output text 2>/dev/null || echo "N/A"
}

# Function to get extended metric (percentiles)
get_extended_metric() {
    local namespace=$1
    local metric_name=$2
    local extended_stat=$3
    local period_minutes=$4
    
    aws cloudwatch get-metric-statistics \
        --namespace "${namespace}" \
        --metric-name "${metric_name}" \
        --start-time "$(date -u -d "${period_minutes} minutes ago" +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --extended-statistics "${extended_stat}" \
        --region "${REGION}" \
        --query 'Datapoints[0].ExtendedStatistics."'"${extended_stat}"'"' \
        --output text 2>/dev/null || echo "N/A"
}

# Function to check thresholds and alert
check_thresholds() {
    local error_rate=$1
    local p95_latency=$2
    local cache_hit_rate=$3
    local alerts=0
    
    # Check error rate (threshold: 1%)
    if [ "${error_rate}" != "N/A" ]; then
        if (( $(echo "${error_rate} > 1.0" | bc -l) )); then
            log "🚨 ALERT: Error rate (${error_rate}%) exceeds 1% threshold!"
            alerts=$((alerts + 1))
        fi
    fi
    
    # Check P95 latency (threshold: 300ms)
    if [ "${p95_latency}" != "N/A" ]; then
        if (( $(echo "${p95_latency} > 300" | bc -l) )); then
            log "🚨 ALERT: P95 latency (${p95_latency}ms) exceeds 300ms threshold!"
            alerts=$((alerts + 1))
        fi
    fi
    
    # Check cache hit rate (threshold: 80%)
    if [ "${cache_hit_rate}" != "N/A" ]; then
        if (( $(echo "${cache_hit_rate} < 80" | bc -l) )); then
            log "🚨 ALERT: Cache hit rate (${cache_hit_rate}%) below 80% threshold!"
            alerts=$((alerts + 1))
        fi
    fi
    
    return ${alerts}
}

# Function to collect and log metrics
collect_metrics() {
    local check_number=$1
    local total_checks=$2
    
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Check ${check_number}/${total_checks} - $(date '+%Y-%m-%d %H:%M:%S')"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Lambda metrics (last 5 minutes)
    local invocations=$(get_metric "AWS/Lambda" "Invocations" "Sum" 5)
    local errors=$(get_metric "AWS/Lambda" "Errors" "Sum" 5)
    local avg_duration=$(get_metric "AWS/Lambda" "Duration" "Average" 5)
    local p95_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p95" 5)
    local p99_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p99" 5)
    
    # Calculate error rate
    local error_rate="N/A"
    if [ "${invocations}" != "N/A" ] && [ "${errors}" != "N/A" ] && [ "${invocations}" != "0" ]; then
        error_rate=$(echo "scale=2; (${errors} / ${invocations}) * 100" | bc)
    fi
    
    # Cache metrics
    local cache_hit_rate=$(get_metric "IntelligentSearch" "CacheHitRate" "Average" 5)
    
    # CloudFront metrics
    local cf_requests=$(get_metric "AWS/CloudFront" "Requests" "Sum" 5)
    local cf_4xx=$(get_metric "AWS/CloudFront" "4xxErrorRate" "Average" 5)
    local cf_5xx=$(get_metric "AWS/CloudFront" "5xxErrorRate" "Average" 5)
    
    # Log metrics
    log "Lambda Metrics:"
    log "  Invocations: ${invocations}"
    log "  Errors: ${errors}"
    log "  Error Rate: ${error_rate}%"
    log "  Avg Latency: ${avg_duration}ms"
    log "  P95 Latency: ${p95_duration}ms"
    log "  P99 Latency: ${p99_duration}ms"
    log ""
    log "Cache Metrics:"
    log "  Hit Rate: ${cache_hit_rate}%"
    log ""
    log "CloudFront Metrics:"
    log "  Requests: ${cf_requests}"
    log "  4xx Error Rate: ${cf_4xx}%"
    log "  5xx Error Rate: ${cf_5xx}%"
    log ""
    
    # Check thresholds
    check_thresholds "${error_rate}" "${p95_duration}" "${cache_hit_rate}"
    local alert_count=$?
    
    if [ ${alert_count} -eq 0 ]; then
        log "✅ All metrics within acceptable thresholds"
    else
        log "⚠️  ${alert_count} metric(s) exceeded thresholds"
    fi
    
    log ""
}

# Function to generate summary report
generate_summary() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "24-Hour Monitoring Summary"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log ""
    
    # Get metrics for last 24 hours
    local total_invocations=$(get_metric "AWS/Lambda" "Invocations" "Sum" 1440)
    local total_errors=$(get_metric "AWS/Lambda" "Errors" "Sum" 1440)
    local avg_p95=$(get_extended_metric "AWS/Lambda" "Duration" "p95" 1440)
    local avg_cache_hit=$(get_metric "IntelligentSearch" "CacheHitRate" "Average" 1440)
    
    # Calculate overall error rate
    local overall_error_rate="N/A"
    if [ "${total_invocations}" != "N/A" ] && [ "${total_errors}" != "N/A" ] && [ "${total_invocations}" != "0" ]; then
        overall_error_rate=$(echo "scale=2; (${total_errors} / ${total_invocations}) * 100" | bc)
    fi
    
    log "Overall Metrics (24 hours):"
    log "  Total Invocations: ${total_invocations}"
    log "  Total Errors: ${total_errors}"
    log "  Error Rate: ${overall_error_rate}%"
    log "  Average P95 Latency: ${avg_p95}ms"
    log "  Average Cache Hit Rate: ${avg_cache_hit}%"
    log ""
    
    # Determine if ready for 50% rollout
    local ready_for_50=true
    
    if [ "${overall_error_rate}" != "N/A" ] && (( $(echo "${overall_error_rate} > 1.0" | bc -l) )); then
        log "❌ Error rate exceeds 1% threshold"
        ready_for_50=false
    fi
    
    if [ "${avg_p95}" != "N/A" ] && (( $(echo "${avg_p95} > 300" | bc -l) )); then
        log "❌ P95 latency exceeds 300ms threshold"
        ready_for_50=false
    fi
    
    if [ "${avg_cache_hit}" != "N/A" ] && (( $(echo "${avg_cache_hit} < 80" | bc -l) )); then
        log "❌ Cache hit rate below 80% threshold"
        ready_for_50=false
    fi
    
    log ""
    if [ "${ready_for_50}" = true ]; then
        log "✅ RECOMMENDATION: System is stable and ready for 50% traffic rollout"
        log ""
        log "Next Steps:"
        log "  1. Review this monitoring log: ${LOG_FILE}"
        log "  2. Check CloudWatch dashboards for detailed analysis"
        log "  3. Verify no user-reported issues"
        log "  4. Deploy 50% traffic:"
        log "     ./infrastructure/deploy-production-50-percent.sh"
    else
        log "⚠️  RECOMMENDATION: System needs attention before increasing traffic"
        log ""
        log "Next Steps:"
        log "  1. Review CloudWatch logs for error details"
        log "  2. Investigate performance issues"
        log "  3. Fix identified problems"
        log "  4. Continue monitoring at 10% traffic"
        log "  5. Consider rollback if issues persist:"
        log "     ./infrastructure/rollback-traffic.sh 0"
    fi
    
    log ""
    log "Full monitoring log saved to: ${LOG_FILE}"
}

# Main monitoring loop
log "Starting 24-hour monitoring..."
log "Press Ctrl+C to stop early (summary will be generated)"
log ""

# Calculate total checks
TOTAL_SECONDS=$((DURATION_HOURS * 3600))
TOTAL_CHECKS=$((TOTAL_SECONDS / CHECK_INTERVAL_SECONDS))

# Trap Ctrl+C to generate summary before exit
trap 'echo ""; log "Monitoring interrupted by user"; generate_summary; exit 0' INT

# Run monitoring loop
for ((i=1; i<=TOTAL_CHECKS; i++)); do
    collect_metrics ${i} ${TOTAL_CHECKS}
    
    # Sleep until next check (unless it's the last check)
    if [ ${i} -lt ${TOTAL_CHECKS} ]; then
        sleep ${CHECK_INTERVAL_SECONDS}
    fi
done

# Generate final summary
generate_summary

echo ""
echo "✅ 24-hour monitoring complete!"
echo "📝 Full log saved to: ${LOG_FILE}"
echo ""
