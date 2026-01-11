#!/bin/bash

# SuplementIA - Post-Deployment Verification
# Run this after deployment to verify everything works

set -e

ENVIRONMENT=${1:-production}
REGION="us-east-1"
STACK_NAME="${ENVIRONMENT}-lancedb"

echo "=========================================="
echo "SuplementIA - Post-Deployment Verification"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo "Testing: $test_name"
    if eval "$test_command" &> /dev/null; then
        echo "  ✓ PASS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo "  ✗ FAIL"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "1. Verifying CloudFormation Stack"
echo "----------------------------------------"

# Check stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
    echo "✓ Stack status: $STACK_STATUS"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo "✗ Stack status: $STACK_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Get stack outputs
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region $REGION \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""

echo "2. Verifying EFS"
echo "----------------------------------------"

EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text 2>/dev/null)

if [ -n "$EFS_ID" ] && [ "$EFS_ID" != "None" ]; then
    echo "✓ EFS File System ID: $EFS_ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check EFS status
    EFS_STATUS=$(aws efs describe-file-systems \
        --file-system-id "$EFS_ID" \
        --region $REGION \
        --query 'FileSystems[0].LifeCycleState' \
        --output text)
    
    if [ "$EFS_STATUS" = "available" ]; then
        echo "✓ EFS Status: $EFS_STATUS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "✗ EFS Status: $EFS_STATUS"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check mount targets
    MOUNT_TARGETS=$(aws efs describe-mount-targets \
        --file-system-id "$EFS_ID" \
        --region $REGION \
        --query 'length(MountTargets)')
    
    if [ "$MOUNT_TARGETS" -ge 2 ]; then
        echo "✓ Mount Targets: $MOUNT_TARGETS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "✗ Mount Targets: $MOUNT_TARGETS (expected: 2)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo "✗ EFS File System not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

echo "3. Verifying DynamoDB Tables"
echo "----------------------------------------"

# Check cache table
CACHE_TABLE="${ENVIRONMENT}-supplement-cache"
if aws dynamodb describe-table --table-name "$CACHE_TABLE" --region $REGION &> /dev/null; then
    echo "✓ Cache table exists: $CACHE_TABLE"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check TTL
    TTL_STATUS=$(aws dynamodb describe-time-to-live \
        --table-name "$CACHE_TABLE" \
        --region $REGION \
        --query 'TimeToLiveDescription.TimeToLiveStatus' \
        --output text)
    
    if [ "$TTL_STATUS" = "ENABLED" ]; then
        echo "✓ TTL enabled on cache table"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "⚠ TTL status: $TTL_STATUS"
    fi
else
    echo "✗ Cache table not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check discovery table
DISCOVERY_TABLE="${ENVIRONMENT}-discovery-queue"
if aws dynamodb describe-table --table-name "$DISCOVERY_TABLE" --region $REGION &> /dev/null; then
    echo "✓ Discovery table exists: $DISCOVERY_TABLE"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check stream
    STREAM_ARN=$(aws dynamodb describe-table \
        --table-name "$DISCOVERY_TABLE" \
        --region $REGION \
        --query 'Table.LatestStreamArn' \
        --output text)
    
    if [ -n "$STREAM_ARN" ] && [ "$STREAM_ARN" != "None" ]; then
        echo "✓ DynamoDB Stream enabled"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "✗ DynamoDB Stream not enabled"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo "✗ Discovery table not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

echo "4. Verifying Lambda Functions"
echo "----------------------------------------"

# Check search API Lambda
SEARCH_API_FUNCTION="${ENVIRONMENT}-search-api-lancedb"
if aws lambda get-function --function-name "$SEARCH_API_FUNCTION" --region $REGION &> /dev/null; then
    echo "✓ Search API Lambda exists: $SEARCH_API_FUNCTION"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check runtime
    RUNTIME=$(aws lambda get-function-configuration \
        --function-name "$SEARCH_API_FUNCTION" \
        --region $REGION \
        --query 'Runtime' \
        --output text)
    
    echo "  Runtime: $RUNTIME"
    
    # Check architecture
    ARCH=$(aws lambda get-function-configuration \
        --function-name "$SEARCH_API_FUNCTION" \
        --region $REGION \
        --query 'Architectures[0]' \
        --output text)
    
    if [ "$ARCH" = "arm64" ]; then
        echo "  ✓ Architecture: $ARCH"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ⚠ Architecture: $ARCH (expected: arm64)"
    fi
    
    # Test invocation
    echo "  Testing invocation..."
    RESPONSE=$(aws lambda invoke \
        --function-name "$SEARCH_API_FUNCTION" \
        --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
        --region $REGION \
        /tmp/lambda-response.json 2>&1)
    
    if [ $? -eq 0 ]; then
        STATUS_CODE=$(jq -r '.statusCode' /tmp/lambda-response.json 2>/dev/null || echo "0")
        if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "404" ]; then
            echo "  ✓ Lambda invocation successful (status: $STATUS_CODE)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo "  ✗ Lambda returned status: $STATUS_CODE"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo "  ✗ Lambda invocation failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    rm -f /tmp/lambda-response.json
else
    echo "✗ Search API Lambda not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check discovery worker Lambda
DISCOVERY_WORKER_FUNCTION="${ENVIRONMENT}-discovery-worker-lancedb"
if aws lambda get-function --function-name "$DISCOVERY_WORKER_FUNCTION" --region $REGION &> /dev/null; then
    echo "✓ Discovery Worker Lambda exists: $DISCOVERY_WORKER_FUNCTION"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check event source mapping
    MAPPINGS=$(aws lambda list-event-source-mappings \
        --function-name "$DISCOVERY_WORKER_FUNCTION" \
        --region $REGION \
        --query 'length(EventSourceMappings)')
    
    if [ "$MAPPINGS" -ge 1 ]; then
        echo "  ✓ Event source mapping configured"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ✗ Event source mapping not found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo "✗ Discovery Worker Lambda not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

echo "5. Verifying CloudWatch Alarms"
echo "----------------------------------------"

ALARMS=$(aws cloudwatch describe-alarms \
    --alarm-name-prefix "${ENVIRONMENT}-" \
    --region $REGION \
    --query 'length(MetricAlarms)')

if [ "$ALARMS" -ge 2 ]; then
    echo "✓ CloudWatch Alarms configured: $ALARMS"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # List alarms
    aws cloudwatch describe-alarms \
        --alarm-name-prefix "${ENVIRONMENT}-" \
        --region $REGION \
        --query 'MetricAlarms[*].[AlarmName,StateValue]' \
        --output table
else
    echo "✗ CloudWatch Alarms: $ALARMS (expected: >= 2)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

echo "6. Verifying SNS Topic"
echo "----------------------------------------"

SNS_TOPIC=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPIC" ] && [ "$SNS_TOPIC" != "None" ]; then
    echo "✓ SNS Topic: $SNS_TOPIC"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check subscriptions
    SUBSCRIPTIONS=$(aws sns list-subscriptions-by-topic \
        --topic-arn "$SNS_TOPIC" \
        --region $REGION \
        --query 'length(Subscriptions)')
    
    if [ "$SUBSCRIPTIONS" -ge 1 ]; then
        echo "✓ SNS Subscriptions: $SUBSCRIPTIONS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "⚠ SNS Subscriptions: $SUBSCRIPTIONS (check email confirmation)"
    fi
else
    echo "⚠ SNS Topic not found in outputs"
fi

echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "✅ All verification tests passed!"
    echo ""
    echo "Next steps:"
    echo "  1. Download ML model to EFS"
    echo "  2. Migrate data to LanceDB"
    echo "  3. Deploy Lambda functions"
    echo "  4. Monitor metrics: make monitor"
    echo ""
    exit 0
else
    echo "❌ Some verification tests failed"
    echo ""
    echo "Please review failures above and fix issues."
    echo ""
    exit 1
fi
