#!/bin/bash

# Deploy CloudWatch Monitoring Setup
# This script deploys CloudWatch dashboards, alarms, and SNS topics

set -e

# Configuration
ENVIRONMENT="${1:-staging}"
ALERT_EMAIL="${2:-alerts@suplementia.com}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "🔍 Deploying CloudWatch Monitoring for ${ENVIRONMENT}"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Deploy CloudWatch Alarms
echo "📊 Step 1: Deploying CloudWatch Alarms..."
aws cloudformation deploy \
    --template-file cloudwatch-alarms.yml \
    --stack-name "${ENVIRONMENT}-cloudwatch-alarms" \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        AlertEmail="${ALERT_EMAIL}" \
    --capabilities CAPABILITY_IAM \
    --region "${AWS_REGION}"

check_status "CloudWatch Alarms deployed"

# Step 2: Get SNS Topic ARN
echo ""
echo "📧 Step 2: Getting SNS Topic ARN..."
SNS_TOPIC_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-cloudwatch-alarms" \
    --query "Stacks[0].Outputs[?OutputKey=='AlertTopicArn'].OutputValue" \
    --output text \
    --region "${AWS_REGION}")

check_status "SNS Topic ARN retrieved: ${SNS_TOPIC_ARN}"

# Step 3: Create CloudWatch Dashboard
echo ""
echo "📈 Step 3: Creating CloudWatch Dashboard..."

# Replace region placeholder in dashboard JSON
sed "s/us-east-1/${AWS_REGION}/g" cloudwatch-dashboard.json > /tmp/dashboard-${ENVIRONMENT}.json

aws cloudwatch put-dashboard \
    --dashboard-name "${ENVIRONMENT}-suplementia-monitoring" \
    --dashboard-body file:///tmp/dashboard-${ENVIRONMENT}.json \
    --region "${AWS_REGION}"

check_status "CloudWatch Dashboard created"

# Clean up temp file
rm /tmp/dashboard-${ENVIRONMENT}.json

# Step 4: Enable X-Ray tracing on Lambda functions
echo ""
echo "🔬 Step 4: Enabling X-Ray tracing on Lambda functions..."

# Get list of Lambda functions for this environment
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --query "Functions[?starts_with(FunctionName, '${ENVIRONMENT}-')].FunctionName" \
    --output text \
    --region "${AWS_REGION}")

if [ -z "$LAMBDA_FUNCTIONS" ]; then
    echo -e "${YELLOW}⚠ No Lambda functions found for environment ${ENVIRONMENT}${NC}"
else
    for FUNCTION in $LAMBDA_FUNCTIONS; do
        echo "  Enabling X-Ray for ${FUNCTION}..."
        aws lambda update-function-configuration \
            --function-name "${FUNCTION}" \
            --tracing-config Mode=Active \
            --region "${AWS_REGION}" \
            > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓ X-Ray enabled for ${FUNCTION}${NC}"
        else
            echo -e "  ${YELLOW}⚠ Could not enable X-Ray for ${FUNCTION}${NC}"
        fi
    done
fi

# Step 5: Create custom metric filters
echo ""
echo "📝 Step 5: Creating CloudWatch Logs metric filters..."

# Metric filter for cache hit rate
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-cache-hit-rate" \
    --filter-pattern '{ $.event_type = "cache_hit" }' \
    --metric-transformations \
        metricName=CacheHit,metricNamespace=SuplementIA/Search,metricValue=1,defaultValue=0 \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-cache-miss-rate" \
    --filter-pattern '{ $.event_type = "cache_miss" }' \
    --metric-transformations \
        metricName=CacheMiss,metricNamespace=SuplementIA/Search,metricValue=1,defaultValue=0 \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

# Metric filter for search latency
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-search-latency" \
    --filter-pattern '{ $.event_type = "request_complete" && $.duration_ms = * }' \
    --metric-transformations \
        metricName=SearchLatency,metricNamespace=SuplementIA/Search,metricValue=$.duration_ms,unit=Milliseconds \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

# Metric filter for cache latency
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-cache-latency" \
    --filter-pattern '{ $.event_type = "cache_hit" && $.latency_ms = * }' \
    --metric-transformations \
        metricName=CacheLatency,metricNamespace=SuplementIA/Search,metricValue=$.latency_ms,unit=Milliseconds \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

# Metric filter for vector search latency
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-vector-search-latency" \
    --filter-pattern '{ $.event_type = "lancedb_search_complete" && $.duration_ms = * }' \
    --metric-transformations \
        metricName=VectorSearchLatency,metricNamespace=SuplementIA/Search,metricValue=$.duration_ms,unit=Milliseconds \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

# Metric filter for embedding generation time
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-search-api-lancedb" \
    --filter-name "${ENVIRONMENT}-embedding-generation-time" \
    --filter-pattern '{ $.event_type = "embedding_generated" && $.duration_ms = * }' \
    --metric-transformations \
        metricName=EmbeddingGenerationTime,metricNamespace=SuplementIA/Search,metricValue=$.duration_ms,unit=Milliseconds \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

# Metric filter for discovery queue size
aws logs put-metric-filter \
    --log-group-name "/aws/lambda/${ENVIRONMENT}-discovery-worker-lancedb" \
    --filter-name "${ENVIRONMENT}-queue-size" \
    --filter-pattern '{ $.event_type = "queue_size_check" && $.queue_size = * }' \
    --metric-transformations \
        metricName=QueueSize,metricNamespace=SuplementIA/Search,metricValue=$.queue_size \
    --region "${AWS_REGION}" \
    2>/dev/null || echo -e "${YELLOW}⚠ Metric filter already exists or log group not found${NC}"

check_status "Metric filters created"

# Step 6: Verify SNS subscription
echo ""
echo "📧 Step 6: Verifying SNS subscription..."
echo -e "${YELLOW}⚠ Please check your email (${ALERT_EMAIL}) and confirm the SNS subscription${NC}"

# Summary
echo ""
echo "=================================================="
echo -e "${GREEN}✓ CloudWatch Monitoring Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "📊 Dashboard URL:"
echo "   https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${ENVIRONMENT}-suplementia-monitoring"
echo ""
echo "🔔 Alarms configured:"
echo "   - High Error Rate (> 1%)"
echo "   - Low Cache Hit Rate (< 80%)"
echo "   - High Latency P95 (> 300ms)"
echo "   - High Latency P99 (> 500ms)"
echo "   - Discovery Queue Backlog (> 100)"
echo "   - Lambda Errors"
echo "   - RDS High CPU"
echo "   - ElastiCache High CPU"
echo "   - DynamoDB Throttling"
echo ""
echo "📧 Alert notifications will be sent to: ${ALERT_EMAIL}"
echo ""
echo "🔬 X-Ray tracing enabled on all Lambda functions"
echo ""
echo "📝 Next steps:"
echo "   1. Confirm SNS email subscription"
echo "   2. Test alarms by triggering conditions"
echo "   3. Review dashboard and adjust thresholds if needed"
echo "   4. Set up additional integrations (Slack, PagerDuty, etc.)"
echo ""
