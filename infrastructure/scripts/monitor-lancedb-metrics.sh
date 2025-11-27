#!/bin/bash

# SuplementIA - Monitor LanceDB Metrics
# Usage: ./monitor-lancedb-metrics.sh [staging|production]

ENVIRONMENT=${1:-production}
REGION="us-east-1"
SEARCH_API_FUNCTION="${ENVIRONMENT}-search-api-lancedb"
DISCOVERY_WORKER_FUNCTION="${ENVIRONMENT}-discovery-worker-lancedb"

echo "=========================================="
echo "SuplementIA - LanceDB Metrics Monitor"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

# Get current time
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")
START_TIME=$(date -u -v-1H +"%Y-%m-%dT%H:%M:%S")

echo "Time Range: $START_TIME to $END_TIME"
echo ""

# Function to get metric statistics
get_metric() {
    local namespace=$1
    local metric_name=$2
    local dimension_name=$3
    local dimension_value=$4
    local statistic=$5
    
    aws cloudwatch get-metric-statistics \
        --namespace "$namespace" \
        --metric-name "$metric_name" \
        --dimensions Name="$dimension_name",Value="$dimension_value" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics "$statistic" \
        --region "$REGION" \
        --query 'Datapoints[0].'"$statistic" \
        --output text
}

# Lambda Metrics - Search API
echo "1. Search API Lambda Metrics"
echo "----------------------------------------"

INVOCATIONS=$(get_metric "AWS/Lambda" "Invocations" "FunctionName" "$SEARCH_API_FUNCTION" "Sum")
ERRORS=$(get_metric "AWS/Lambda" "Errors" "FunctionName" "$SEARCH_API_FUNCTION" "Sum")
DURATION_AVG=$(get_metric "AWS/Lambda" "Duration" "FunctionName" "$SEARCH_API_FUNCTION" "Average")
THROTTLES=$(get_metric "AWS/Lambda" "Throttles" "FunctionName" "$SEARCH_API_FUNCTION" "Sum")

echo "Invocations: ${INVOCATIONS:-0}"
echo "Errors: ${ERRORS:-0}"
echo "Avg Duration: ${DURATION_AVG:-0} ms"
echo "Throttles: ${THROTTLES:-0}"

if [ "$INVOCATIONS" != "None" ] && [ "$INVOCATIONS" != "0" ]; then
    ERROR_RATE=$(echo "scale=2; ($ERRORS / $INVOCATIONS) * 100" | bc)
    echo "Error Rate: ${ERROR_RATE}%"
fi

echo ""

# Lambda Metrics - Discovery Worker
echo "2. Discovery Worker Lambda Metrics"
echo "----------------------------------------"

INVOCATIONS=$(get_metric "AWS/Lambda" "Invocations" "FunctionName" "$DISCOVERY_WORKER_FUNCTION" "Sum")
ERRORS=$(get_metric "AWS/Lambda" "Errors" "FunctionName" "$DISCOVERY_WORKER_FUNCTION" "Sum")
DURATION_AVG=$(get_metric "AWS/Lambda" "Duration" "FunctionName" "$DISCOVERY_WORKER_FUNCTION" "Average")

echo "Invocations: ${INVOCATIONS:-0}"
echo "Errors: ${ERRORS:-0}"
echo "Avg Duration: ${DURATION_AVG:-0} ms"

echo ""

# DynamoDB Metrics
echo "3. DynamoDB Metrics"
echo "----------------------------------------"

CACHE_TABLE="${ENVIRONMENT}-supplement-cache"
DISCOVERY_TABLE="${ENVIRONMENT}-discovery-queue"

# Cache table
READ_CAPACITY=$(get_metric "AWS/DynamoDB" "ConsumedReadCapacityUnits" "TableName" "$CACHE_TABLE" "Sum")
WRITE_CAPACITY=$(get_metric "AWS/DynamoDB" "ConsumedWriteCapacityUnits" "TableName" "$CACHE_TABLE" "Sum")

echo "Cache Table ($CACHE_TABLE):"
echo "  Read Capacity: ${READ_CAPACITY:-0} units"
echo "  Write Capacity: ${WRITE_CAPACITY:-0} units"

# Discovery table
READ_CAPACITY=$(get_metric "AWS/DynamoDB" "ConsumedReadCapacityUnits" "TableName" "$DISCOVERY_TABLE" "Sum")
WRITE_CAPACITY=$(get_metric "AWS/DynamoDB" "ConsumedWriteCapacityUnits" "TableName" "$DISCOVERY_TABLE" "Sum")

echo ""
echo "Discovery Table ($DISCOVERY_TABLE):"
echo "  Read Capacity: ${READ_CAPACITY:-0} units"
echo "  Write Capacity: ${WRITE_CAPACITY:-0} units"

echo ""

# EFS Metrics
echo "4. EFS Metrics"
echo "----------------------------------------"

# Get EFS ID from CloudFormation
EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lancedb" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text 2>/dev/null)

if [ -n "$EFS_ID" ] && [ "$EFS_ID" != "None" ]; then
    echo "EFS File System: $EFS_ID"
    
    # Get EFS metrics
    DATA_READ=$(get_metric "AWS/EFS" "DataReadIOBytes" "FileSystemId" "$EFS_ID" "Sum")
    DATA_WRITE=$(get_metric "AWS/EFS" "DataWriteIOBytes" "FileSystemId" "$EFS_ID" "Sum")
    
    if [ "$DATA_READ" != "None" ]; then
        DATA_READ_MB=$(echo "scale=2; $DATA_READ / 1048576" | bc)
        echo "  Data Read: ${DATA_READ_MB} MB"
    fi
    
    if [ "$DATA_WRITE" != "None" ]; then
        DATA_WRITE_MB=$(echo "scale=2; $DATA_WRITE / 1048576" | bc)
        echo "  Data Write: ${DATA_WRITE_MB} MB"
    fi
else
    echo "EFS metrics not available"
fi

echo ""

# CloudWatch Alarms
echo "5. Active Alarms"
echo "----------------------------------------"

ALARMS=$(aws cloudwatch describe-alarms \
    --alarm-name-prefix "${ENVIRONMENT}-" \
    --state-value ALARM \
    --region "$REGION" \
    --query 'MetricAlarms[*].[AlarmName,StateReason]' \
    --output text)

if [ -n "$ALARMS" ]; then
    echo "$ALARMS"
else
    echo "✓ No active alarms"
fi

echo ""

# Recent Logs
echo "6. Recent Errors (Last 10)"
echo "----------------------------------------"

aws logs filter-log-events \
    --log-group-name "/aws/lambda/$SEARCH_API_FUNCTION" \
    --filter-pattern "ERROR" \
    --start-time $(($(date +%s) - 3600))000 \
    --limit 10 \
    --region "$REGION" \
    --query 'events[*].message' \
    --output text 2>/dev/null | head -10

echo ""
echo "=========================================="
echo "Monitoring complete!"
echo "=========================================="
