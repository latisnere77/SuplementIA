#!/bin/bash

# SuplementIA - Calculate LanceDB Stack Costs
# Usage: ./calculate-costs.sh [staging|production]

ENVIRONMENT=${1:-production}
REGION="us-east-1"

echo "=========================================="
echo "SuplementIA - Cost Calculator"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

# Get last 30 days
END_DATE=$(date +"%Y-%m-%d")
START_DATE=$(date -v-30d +"%Y-%m-%d")

echo "Period: $START_DATE to $END_DATE"
echo ""

# Get costs by service
echo "Costs by Service (Last 30 days):"
echo "----------------------------------------"

aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --filter file:/dev/stdin <<EOF | jq -r '.ResultsByTime[0].Groups[] | "\(.Keys[0]): $\(.Metrics.BlendedCost.Amount | tonumber | . * 100 | round / 100)"'
{
  "Tags": {
    "Key": "Environment",
    "Values": ["$ENVIRONMENT"]
  }
}
EOF

echo ""

# Estimated monthly costs based on usage
echo "Estimated Monthly Costs:"
echo "----------------------------------------"

# DynamoDB
CACHE_TABLE="${ENVIRONMENT}-supplement-cache"
DISCOVERY_TABLE="${ENVIRONMENT}-discovery-queue"

echo "DynamoDB:"

# Get read/write units for cache table
READ_UNITS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ConsumedReadCapacityUnits \
    --dimensions Name=TableName,Value="$CACHE_TABLE" \
    --start-time "$(date -u -v-1d +"%Y-%m-%dT%H:%M:%S")" \
    --end-time "$(date -u +"%Y-%m-%dT%H:%M:%S")" \
    --period 86400 \
    --statistics Sum \
    --region "$REGION" \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)

if [ "$READ_UNITS" != "None" ] && [ -n "$READ_UNITS" ]; then
    # Calculate monthly cost (on-demand: $0.25 per million reads)
    MONTHLY_READS=$(echo "$READ_UNITS * 30" | bc)
    READ_COST=$(echo "scale=2; ($MONTHLY_READS / 1000000) * 0.25" | bc)
    echo "  Cache reads: \$$READ_COST/month ($MONTHLY_READS units)"
else
    echo "  Cache reads: \$0.00/month (no data)"
fi

# EFS
echo ""
echo "EFS:"

EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lancedb" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text 2>/dev/null)

if [ -n "$EFS_ID" ] && [ "$EFS_ID" != "None" ]; then
    # Get EFS size
    SIZE_BYTES=$(aws efs describe-file-systems \
        --file-system-id "$EFS_ID" \
        --region "$REGION" \
        --query 'FileSystems[0].SizeInBytes.Value' \
        --output text 2>/dev/null)
    
    if [ -n "$SIZE_BYTES" ] && [ "$SIZE_BYTES" != "None" ]; then
        SIZE_GB=$(echo "scale=2; $SIZE_BYTES / 1073741824" | bc)
        # EFS Standard: $0.30/GB/month
        STORAGE_COST=$(echo "scale=2; $SIZE_GB * 0.30" | bc)
        # Bursting throughput: ~$1/month baseline
        THROUGHPUT_COST="1.00"
        TOTAL_EFS=$(echo "scale=2; $STORAGE_COST + $THROUGHPUT_COST" | bc)
        
        echo "  Storage: \$$STORAGE_COST/month (${SIZE_GB} GB)"
        echo "  Throughput: \$$THROUGHPUT_COST/month (bursting)"
        echo "  Total EFS: \$$TOTAL_EFS/month"
    else
        echo "  Estimated: \$4.00/month (10GB + throughput)"
    fi
else
    echo "  Estimated: \$4.00/month (10GB + throughput)"
fi

# Lambda
echo ""
echo "Lambda:"

SEARCH_API_FUNCTION="${ENVIRONMENT}-search-api-lancedb"

INVOCATIONS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value="$SEARCH_API_FUNCTION" \
    --start-time "$(date -u -v-1d +"%Y-%m-%dT%H:%M:%S")" \
    --end-time "$(date -u +"%Y-%m-%dT%H:%M:%S")" \
    --period 86400 \
    --statistics Sum \
    --region "$REGION" \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)

if [ "$INVOCATIONS" != "None" ] && [ -n "$INVOCATIONS" ]; then
    MONTHLY_INVOCATIONS=$(echo "$INVOCATIONS * 30" | bc)
    
    # Free tier: 1M requests/month
    if [ $(echo "$MONTHLY_INVOCATIONS > 1000000" | bc) -eq 1 ]; then
        BILLABLE=$(echo "$MONTHLY_INVOCATIONS - 1000000" | bc)
        # $0.20 per 1M requests
        LAMBDA_COST=$(echo "scale=2; ($BILLABLE / 1000000) * 0.20" | bc)
        echo "  Invocations: \$$LAMBDA_COST/month ($MONTHLY_INVOCATIONS total, $BILLABLE billable)"
    else
        echo "  Invocations: \$0.00/month ($MONTHLY_INVOCATIONS total, within free tier)"
    fi
else
    echo "  Invocations: \$0.00/month (within free tier)"
fi

# CloudWatch
echo ""
echo "CloudWatch:"
echo "  Logs: \$1.20/month (estimated 5GB ingestion)"

# Total
echo ""
echo "=========================================="
echo "Estimated Total: \$5.59/month"
echo "=========================================="
echo ""
echo "Breakdown:"
echo "  DynamoDB:   \$0.39"
echo "  EFS:        \$4.00"
echo "  Lambda:     \$0.00 (free tier)"
echo "  CloudWatch: \$1.20"
echo ""
echo "Note: Actual costs may vary based on usage"
echo "=========================================="
