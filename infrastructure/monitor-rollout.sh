#!/bin/bash

# Monitor Intelligent Supplement Search System Rollout
# This script monitors key metrics during gradual traffic rollout

set -e

ENVIRONMENT="${1:-production}"
REGION="${AWS_REGION:-us-east-1}"
DURATION_MINUTES="${2:-60}"

echo "📊 Monitoring Intelligent Supplement Search Rollout"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo "Duration: ${DURATION_MINUTES} minutes"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Function to get metric statistics
get_metric() {
    local namespace=$1
    local metric_name=$2
    local statistic=$3
    local period=$4
    
    aws cloudwatch get-metric-statistics \
        --namespace "${namespace}" \
        --metric-name "${metric_name}" \
        --start-time "$(date -u -d "${period} minutes ago" +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --statistics "${statistic}" \
        --region "${REGION}" \
        --query 'Datapoints[0].'"${statistic}" \
        --output text 2>/dev/null || echo "N/A"
}

# Function to get extended metric statistics (percentiles)
get_extended_metric() {
    local namespace=$1
    local metric_name=$2
    local extended_stat=$3
    local period=$4
    
    aws cloudwatch get-metric-statistics \
        --namespace "${namespace}" \
        --metric-name "${metric_name}" \
        --start-time "$(date -u -d "${period} minutes ago" +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --extended-statistics "${extended_stat}" \
        --region "${REGION}" \
        --query 'Datapoints[0].ExtendedStatistics."'"${extended_stat}"'"' \
        --output text 2>/dev/null || echo "N/A"
}

# Function to display metrics
display_metrics() {
    echo ""
    echo "📈 Current Metrics (Last 5 minutes)"
    echo "=================================================="
    
    # Lambda Invocations
    local invocations=$(get_metric "AWS/Lambda" "Invocations" "Sum" 5)
    echo "Lambda Invocations: ${invocations}"
    
    # Lambda Errors
    local errors=$(get_metric "AWS/Lambda" "Errors" "Sum" 5)
    echo "Lambda Errors: ${errors}"
    
    # Calculate error rate
    if [ "${invocations}" != "N/A" ] && [ "${errors}" != "N/A" ] && [ "${invocations}" != "0" ]; then
        local error_rate=$(echo "scale=2; (${errors} / ${invocations}) * 100" | bc)
        echo "Error Rate: ${error_rate}%"
        
        # Check if error rate exceeds threshold
        if (( $(echo "${error_rate} > 1.0" | bc -l) )); then
            echo "⚠️  WARNING: Error rate exceeds 1% threshold!"
        fi
    else
        echo "Error Rate: N/A"
    fi
    
    # Lambda Duration (Average)
    local avg_duration=$(get_metric "AWS/Lambda" "Duration" "Average" 5)
    echo "Average Latency: ${avg_duration}ms"
    
    # Lambda Duration (P95)
    local p95_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p95" 5)
    echo "P95 Latency: ${p95_duration}ms"
    
    # Check if P95 latency exceeds threshold
    if [ "${p95_duration}" != "N/A" ]; then
        if (( $(echo "${p95_duration} > 300" | bc -l) )); then
            echo "⚠️  WARNING: P95 latency exceeds 300ms threshold!"
        fi
    fi
    
    # Lambda Duration (P99)
    local p99_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p99" 5)
    echo "P99 Latency: ${p99_duration}ms"
    
    # Cache Hit Rate (custom metric)
    local cache_hit_rate=$(get_metric "IntelligentSearch" "CacheHitRate" "Average" 5)
    echo "Cache Hit Rate: ${cache_hit_rate}%"
    
    # Check if cache hit rate is below threshold
    if [ "${cache_hit_rate}" != "N/A" ]; then
        if (( $(echo "${cache_hit_rate} < 80" | bc -l) )); then
            echo "⚠️  WARNING: Cache hit rate below 80% threshold!"
        fi
    fi
    
    # CloudFront Requests
    local cf_requests=$(get_metric "AWS/CloudFront" "Requests" "Sum" 5)
    echo "CloudFront Requests: ${cf_requests}"
    
    # CloudFront 4xx Error Rate
    local cf_4xx=$(get_metric "AWS/CloudFront" "4xxErrorRate" "Average" 5)
    echo "CloudFront 4xx Error Rate: ${cf_4xx}%"
    
    # CloudFront 5xx Error Rate
    local cf_5xx=$(get_metric "AWS/CloudFront" "5xxErrorRate" "Average" 5)
    echo "CloudFront 5xx Error Rate: ${cf_5xx}%"
    
    echo "=================================================="
}

# Function to check alarms
check_alarms() {
    echo ""
    echo "🚨 Active Alarms"
    echo "=================================================="
    
    local alarms=$(aws cloudwatch describe-alarms \
        --state-value ALARM \
        --alarm-name-prefix "${ENVIRONMENT}" \
        --region "${REGION}" \
        --query 'MetricAlarms[*].[AlarmName,StateReason]' \
        --output text)
    
    if [ -z "${alarms}" ]; then
        echo "✅ No active alarms"
    else
        echo "${alarms}"
    fi
    
    echo "=================================================="
}

# Function to get traffic distribution from CloudFront logs
get_traffic_distribution() {
    echo ""
    echo "🔀 Traffic Distribution"
    echo "=================================================="
    
    # Get CloudFront distribution ID
    local dist_id=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT}-intelligent-search-cloudfront" \
        --region "${REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "${dist_id}" ]; then
        echo "⚠️  CloudFront distribution not found"
        return
    fi
    
    # Get traffic percentage from stack parameters
    local traffic_pct=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT}-intelligent-search-cloudfront" \
        --region "${REGION}" \
        --query 'Stacks[0].Parameters[?ParameterKey==`TrafficPercentage`].ParameterValue' \
        --output text 2>/dev/null)
    
    echo "Configured Traffic Split:"
    echo "  New System: ${traffic_pct}%"
    echo "  Legacy System: $((100 - traffic_pct))%"
    echo ""
    echo "Note: Actual traffic distribution can be analyzed from CloudFront logs"
    echo "=================================================="
}

# Main monitoring loop
echo "Starting monitoring... (Press Ctrl+C to stop)"
echo ""

END_TIME=$(($(date +%s) + (DURATION_MINUTES * 60)))

while [ $(date +%s) -lt ${END_TIME} ]; do
    clear
    echo "📊 Monitoring Intelligent Supplement Search Rollout"
    echo "=================================================="
    echo "Environment: ${ENVIRONMENT}"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Monitoring for: ${DURATION_MINUTES} minutes"
    echo "Time remaining: $(( (END_TIME - $(date +%s)) / 60 )) minutes"
    
    display_metrics
    check_alarms
    get_traffic_distribution
    
    echo ""
    echo "Next update in 60 seconds..."
    sleep 60
done

echo ""
echo "✅ Monitoring complete!"
echo ""
echo "📊 Summary Report"
echo "=================================================="
display_metrics
check_alarms
get_traffic_distribution

echo ""
echo "📝 Recommendations:"
echo ""

# Get final metrics for recommendations
final_error_rate=$(get_metric "AWS/Lambda" "Errors" "Sum" 60)
final_invocations=$(get_metric "AWS/Lambda" "Invocations" "Sum" 60)
final_p95=$(get_extended_metric "AWS/Lambda" "Duration" "p95" 60)
final_cache_hit=$(get_metric "IntelligentSearch" "CacheHitRate" "Average" 60)

# Calculate error rate percentage
if [ "${final_invocations}" != "N/A" ] && [ "${final_error_rate}" != "N/A" ] && [ "${final_invocations}" != "0" ]; then
    error_pct=$(echo "scale=2; (${final_error_rate} / ${final_invocations}) * 100" | bc)
else
    error_pct="N/A"
fi

# Provide recommendations
all_good=true

if [ "${error_pct}" != "N/A" ] && (( $(echo "${error_pct} > 1.0" | bc -l) )); then
    echo "⚠️  Error rate (${error_pct}%) exceeds 1% threshold"
    echo "   → Investigate errors before increasing traffic"
    all_good=false
fi

if [ "${final_p95}" != "N/A" ] && (( $(echo "${final_p95} > 300" | bc -l) )); then
    echo "⚠️  P95 latency (${final_p95}ms) exceeds 300ms threshold"
    echo "   → Optimize performance before increasing traffic"
    all_good=false
fi

if [ "${final_cache_hit}" != "N/A" ] && (( $(echo "${final_cache_hit} < 80" | bc -l) )); then
    echo "⚠️  Cache hit rate (${final_cache_hit}%) below 80% threshold"
    echo "   → Investigate cache configuration"
    all_good=false
fi

if [ "${all_good}" = true ]; then
    echo "✅ All metrics within acceptable thresholds"
    echo "   → Safe to increase traffic to next level (50%)"
    echo ""
    echo "To increase traffic to 50%, run:"
    echo "   ./infrastructure/deploy-production-50-percent.sh"
else
    echo ""
    echo "⚠️  Some metrics need attention before increasing traffic"
    echo "   → Review CloudWatch logs and dashboards"
    echo "   → Fix issues and monitor for stability"
fi

echo ""
