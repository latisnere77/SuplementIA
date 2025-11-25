#!/bin/bash

# Compare New System vs Legacy System Metrics
# This script compares key metrics between the new intelligent search system and legacy system

set -e

ENVIRONMENT="${1:-production}"
REGION="${AWS_REGION:-us-east-1}"
DURATION_HOURS="${2:-1}"

echo "📊 Comparing New System vs Legacy System"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo "Analysis Period: Last ${DURATION_HOURS} hour(s)"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Calculate time range
START_TIME=$(date -u -d "${DURATION_HOURS} hours ago" +%Y-%m-%dT%H:%M:%S)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)

# Function to get metric statistics
get_metric() {
    local namespace=$1
    local metric_name=$2
    local statistic=$3
    local dimensions=$4
    
    local cmd="aws cloudwatch get-metric-statistics \
        --namespace \"${namespace}\" \
        --metric-name \"${metric_name}\" \
        --start-time \"${START_TIME}\" \
        --end-time \"${END_TIME}\" \
        --period 300 \
        --statistics \"${statistic}\" \
        --region \"${REGION}\""
    
    if [ -n "${dimensions}" ]; then
        cmd="${cmd} --dimensions ${dimensions}"
    fi
    
    eval "${cmd}" --query 'Datapoints[*].'"${statistic}" --output text 2>/dev/null | \
        awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print "N/A"}'
}

# Function to get extended metric statistics
get_extended_metric() {
    local namespace=$1
    local metric_name=$2
    local extended_stat=$3
    local dimensions=$4
    
    local cmd="aws cloudwatch get-metric-statistics \
        --namespace \"${namespace}\" \
        --metric-name \"${metric_name}\" \
        --start-time \"${START_TIME}\" \
        --end-time \"${END_TIME}\" \
        --period 300 \
        --extended-statistics \"${extended_stat}\" \
        --region \"${REGION}\""
    
    if [ -n "${dimensions}" ]; then
        cmd="${cmd} --dimensions ${dimensions}"
    fi
    
    eval "${cmd}" --query 'Datapoints[*].ExtendedStatistics."'"${extended_stat}"'"' --output text 2>/dev/null | \
        awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print "N/A"}'
}

echo "📈 Collecting Metrics..."
echo ""

# New System Metrics (Lambda)
echo "🆕 New System (Intelligent Search)"
echo "=================================================="

new_invocations=$(get_metric "AWS/Lambda" "Invocations" "Sum" "Name=FunctionName,Value=${ENVIRONMENT}-search-api")
new_errors=$(get_metric "AWS/Lambda" "Errors" "Sum" "Name=FunctionName,Value=${ENVIRONMENT}-search-api")
new_avg_duration=$(get_metric "AWS/Lambda" "Duration" "Average" "Name=FunctionName,Value=${ENVIRONMENT}-search-api")
new_p95_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p95" "Name=FunctionName,Value=${ENVIRONMENT}-search-api")
new_p99_duration=$(get_extended_metric "AWS/Lambda" "Duration" "p99" "Name=FunctionName,Value=${ENVIRONMENT}-search-api")

echo "Invocations: ${new_invocations}"
echo "Errors: ${new_errors}"

# Calculate error rate
if [ "${new_invocations}" != "N/A" ] && [ "${new_errors}" != "N/A" ] && [ "${new_invocations}" != "0" ]; then
    new_error_rate=$(echo "scale=4; (${new_errors} / ${new_invocations}) * 100" | bc)
    echo "Error Rate: ${new_error_rate}%"
else
    new_error_rate="N/A"
    echo "Error Rate: N/A"
fi

echo "Average Latency: ${new_avg_duration}ms"
echo "P95 Latency: ${new_p95_duration}ms"
echo "P99 Latency: ${new_p99_duration}ms"

# Cache metrics
new_cache_hit_rate=$(get_metric "IntelligentSearch" "CacheHitRate" "Average" "")
echo "Cache Hit Rate: ${new_cache_hit_rate}%"

echo ""

# Legacy System Metrics (from CloudFront logs or Vercel)
echo "🔙 Legacy System"
echo "=================================================="
echo "Note: Legacy system metrics may not be directly comparable"
echo "      as they use different infrastructure (Vercel)"
echo ""

# Get CloudFront metrics (includes both systems)
cf_requests=$(get_metric "AWS/CloudFront" "Requests" "Sum" "")
cf_4xx_rate=$(get_metric "AWS/CloudFront" "4xxErrorRate" "Average" "")
cf_5xx_rate=$(get_metric "AWS/CloudFront" "5xxErrorRate" "Average" "")

echo "CloudFront Total Requests: ${cf_requests}"
echo "CloudFront 4xx Error Rate: ${cf_4xx_rate}%"
echo "CloudFront 5xx Error Rate: ${cf_5xx_rate}%"

echo ""

# Comparison Summary
echo "📊 Comparison Summary"
echo "=================================================="

# Error Rate Comparison
echo ""
echo "Error Rate:"
if [ "${new_error_rate}" != "N/A" ]; then
    echo "  New System: ${new_error_rate}%"
    if (( $(echo "${new_error_rate} < 1.0" | bc -l) )); then
        echo "  ✅ New system error rate is within target (< 1%)"
    else
        echo "  ⚠️  New system error rate exceeds target (< 1%)"
    fi
else
    echo "  New System: N/A"
fi

# Latency Comparison
echo ""
echo "Latency:"
echo "  New System Average: ${new_avg_duration}ms"
echo "  New System P95: ${new_p95_duration}ms"
echo "  New System P99: ${new_p99_duration}ms"

if [ "${new_p95_duration}" != "N/A" ]; then
    if (( $(echo "${new_p95_duration} < 200" | bc -l) )); then
        echo "  ✅ New system P95 latency is within target (< 200ms)"
    else
        echo "  ⚠️  New system P95 latency exceeds target (< 200ms)"
    fi
fi

# Cache Performance
echo ""
echo "Cache Performance:"
echo "  New System Cache Hit Rate: ${new_cache_hit_rate}%"

if [ "${new_cache_hit_rate}" != "N/A" ]; then
    if (( $(echo "${new_cache_hit_rate} >= 85" | bc -l) )); then
        echo "  ✅ Cache hit rate meets target (>= 85%)"
    else
        echo "  ⚠️  Cache hit rate below target (>= 85%)"
    fi
fi

# Overall Assessment
echo ""
echo "📋 Overall Assessment"
echo "=================================================="

all_good=true

if [ "${new_error_rate}" != "N/A" ] && (( $(echo "${new_error_rate} > 1.0" | bc -l) )); then
    echo "⚠️  Error rate needs improvement"
    all_good=false
fi

if [ "${new_p95_duration}" != "N/A" ] && (( $(echo "${new_p95_duration} > 200" | bc -l) )); then
    echo "⚠️  Latency needs optimization"
    all_good=false
fi

if [ "${new_cache_hit_rate}" != "N/A" ] && (( $(echo "${new_cache_hit_rate} < 85" | bc -l) )); then
    echo "⚠️  Cache hit rate needs improvement"
    all_good=false
fi

if [ "${all_good}" = true ]; then
    echo "✅ All metrics are within acceptable thresholds"
    echo ""
    echo "Recommendation: Safe to proceed with traffic increase"
else
    echo ""
    echo "Recommendation: Address issues before increasing traffic"
fi

echo ""
echo "📊 Detailed Analysis"
echo "=================================================="

# Cost Estimate
echo ""
echo "Cost Estimate (based on current usage):"
if [ "${new_invocations}" != "N/A" ]; then
    # Estimate monthly cost based on current invocations
    invocations_per_hour=$(echo "scale=0; ${new_invocations} / ${DURATION_HOURS}" | bc)
    invocations_per_month=$(echo "scale=0; ${invocations_per_hour} * 730" | bc)
    
    # Lambda cost: $0.20 per 1M requests + $0.0000166667 per GB-second
    lambda_cost=$(echo "scale=2; (${invocations_per_month} / 1000000) * 0.20" | bc)
    
    # DynamoDB cost: ~$1.25 per million write requests
    dynamodb_cost=$(echo "scale=2; (${invocations_per_month} / 1000000) * 1.25" | bc)
    
    # Fixed costs
    rds_cost=15
    redis_cost=12
    efs_cost=1
    
    total_cost=$(echo "scale=2; ${lambda_cost} + ${dynamodb_cost} + ${rds_cost} + ${redis_cost} + ${efs_cost}" | bc)
    
    echo "  Estimated Monthly Cost: \$${total_cost}"
    echo "    - Lambda: \$${lambda_cost}"
    echo "    - DynamoDB: \$${dynamodb_cost}"
    echo "    - RDS: \$${rds_cost}"
    echo "    - Redis: \$${redis_cost}"
    echo "    - EFS: \$${efs_cost}"
    
    if (( $(echo "${total_cost} <= 60" | bc -l) )); then
        echo "  ✅ Cost is within budget (<= \$60/month)"
    else
        echo "  ⚠️  Cost exceeds budget (> \$60/month)"
    fi
fi

echo ""
echo "📝 Recommendations"
echo "=================================================="

if [ "${new_error_rate}" != "N/A" ] && (( $(echo "${new_error_rate} > 1.0" | bc -l) )); then
    echo "• Investigate error logs to identify root cause"
    echo "• Check database connectivity and query performance"
    echo "• Verify Lambda function configuration"
fi

if [ "${new_p95_duration}" != "N/A" ] && (( $(echo "${new_p95_duration} > 200" | bc -l) )); then
    echo "• Optimize database queries and indexes"
    echo "• Increase cache hit rate to reduce database load"
    echo "• Consider increasing Lambda memory allocation"
fi

if [ "${new_cache_hit_rate}" != "N/A" ] && (( $(echo "${new_cache_hit_rate} < 85" | bc -l) )); then
    echo "• Review cache key generation strategy"
    echo "• Adjust cache TTL settings"
    echo "• Implement cache warming for popular queries"
fi

if [ "${all_good}" = true ]; then
    echo "• Continue monitoring for at least 4 hours"
    echo "• Verify no user-reported issues"
    echo "• Proceed with traffic increase when ready"
fi

echo ""

