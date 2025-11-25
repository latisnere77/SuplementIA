#!/bin/bash

# Smoke Tests for Intelligent Supplement Search - Staging Environment
# This script runs basic tests to verify the system is working correctly

set -e

ENVIRONMENT="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${ENVIRONMENT}-intelligent-search"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

echo "🧪 Running Smoke Tests for ${ENVIRONMENT}"
echo "=================================================="
echo ""

# Helper function to run a test
run_test() {
    local TEST_NAME=$1
    local TEST_COMMAND=$2
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -n "Testing: ${TEST_NAME}... "
    
    if eval "$TEST_COMMAND" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to run a test with output
run_test_with_output() {
    local TEST_NAME=$1
    local TEST_COMMAND=$2
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo "Testing: ${TEST_NAME}..."
    
    if OUTPUT=$(eval "$TEST_COMMAND" 2>&1); then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "$OUTPUT"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "$OUTPUT"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

echo "📋 Test Suite 1: Infrastructure"
echo "================================"
echo ""

# Test 1: CloudFormation Stack
run_test "CloudFormation stack exists" \
    "aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].StackStatus' --output text | grep -q 'CREATE_COMPLETE\|UPDATE_COMPLETE'"

# Test 2: RDS Instance
run_test "RDS instance is available" \
    "aws rds describe-db-instances --db-instance-identifier ${ENVIRONMENT}-supplements-db --region ${REGION} --query 'DBInstances[0].DBInstanceStatus' --output text | grep -q 'available'"

# Test 3: DynamoDB Tables
run_test "DynamoDB cache table exists" \
    "aws dynamodb describe-table --table-name ${ENVIRONMENT}-supplement-cache --region ${REGION} --query 'Table.TableStatus' --output text | grep -q 'ACTIVE'"

run_test "DynamoDB discovery queue exists" \
    "aws dynamodb describe-table --table-name ${ENVIRONMENT}-discovery-queue --region ${REGION} --query 'Table.TableStatus' --output text | grep -q 'ACTIVE'"

# Test 4: ElastiCache Redis
run_test "ElastiCache Redis cluster is available" \
    "aws elasticache describe-cache-clusters --cache-cluster-id ${ENVIRONMENT}-supplements-redis --region ${REGION} --query 'CacheClusters[0].CacheClusterStatus' --output text | grep -q 'available'"

# Test 5: EFS
run_test "EFS file system is available" \
    "aws efs describe-file-systems --region ${REGION} --query 'FileSystems[?Tags[?Key==\`Environment\` && Value==\`${ENVIRONMENT}\`]].LifeCycleState' --output text | grep -q 'available'"

echo ""
echo "📋 Test Suite 2: Lambda Functions"
echo "=================================="
echo ""

# Test 6: Lambda Functions Exist
run_test "Embedding generator Lambda exists" \
    "aws lambda get-function --function-name ${ENVIRONMENT}-embedding-generator --region ${REGION} --query 'Configuration.State' --output text | grep -q 'Active'"

run_test "Search API Lambda exists" \
    "aws lambda get-function --function-name ${ENVIRONMENT}-search-api --region ${REGION} --query 'Configuration.State' --output text | grep -q 'Active'"

run_test "Discovery worker Lambda exists" \
    "aws lambda get-function --function-name ${ENVIRONMENT}-discovery-worker --region ${REGION} --query 'Configuration.State' --output text | grep -q 'Active'"

echo ""
echo "📋 Test Suite 3: Functional Tests"
echo "=================================="
echo ""

# Test 7: Embedding Generator
echo "Testing: Embedding generator Lambda..."
EMBEDDING_RESULT=$(aws lambda invoke \
    --function-name ${ENVIRONMENT}-embedding-generator \
    --payload '{"text":"vitamin d"}' \
    --region ${REGION} \
    /tmp/embedding-test.json \
    --no-cli-pager 2>&1)

if [ -f /tmp/embedding-test.json ]; then
    EMBEDDING_DIMS=$(cat /tmp/embedding-test.json | python3 -c "import sys, json; data=json.load(sys.stdin); body=json.loads(data.get('body','{}')); print(body.get('dimensions',0))" 2>/dev/null || echo "0")
    
    if [ "$EMBEDDING_DIMS" = "384" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Generated 384-dimensional embedding"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected 384 dimensions, got ${EMBEDDING_DIMS}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    rm -f /tmp/embedding-test.json
else
    echo -e "${RED}✗ FAIL${NC} - Could not invoke Lambda"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi
echo ""

# Test 8: Search API (will fail if no data, but should not error)
echo "Testing: Search API Lambda..."
SEARCH_RESULT=$(aws lambda invoke \
    --function-name ${ENVIRONMENT}-search-api \
    --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
    --region ${REGION} \
    /tmp/search-test.json \
    --no-cli-pager 2>&1)

if [ -f /tmp/search-test.json ]; then
    STATUS_CODE=$(cat /tmp/search-test.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('statusCode',0))" 2>/dev/null || echo "0")
    
    if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "404" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Search API responded (status: ${STATUS_CODE})"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Unexpected status code: ${STATUS_CODE}"
        cat /tmp/search-test.json
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    rm -f /tmp/search-test.json
else
    echo -e "${RED}✗ FAIL${NC} - Could not invoke Lambda"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi
echo ""

echo "📋 Test Suite 4: Database Connectivity"
echo "======================================="
echo ""

# Test 9: RDS Connectivity (requires psql)
if command -v psql &> /dev/null; then
    echo "Testing: RDS Postgres connectivity..."
    
    RDS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
        --output text)
    
    echo "RDS Endpoint: ${RDS_ENDPOINT}"
    echo "Note: This test requires database credentials"
    echo -e "${YELLOW}⊘ SKIP${NC} - Manual verification required"
    echo ""
else
    echo -e "${YELLOW}⊘ SKIP${NC} - psql not installed"
    echo ""
fi

echo "📋 Test Suite 5: CloudWatch Monitoring"
echo "======================================="
echo ""

# Test 10: CloudWatch Log Groups
run_test "Search API log group exists" \
    "aws logs describe-log-groups --log-group-name-prefix /aws/lambda/${ENVIRONMENT}-search-api --region ${REGION} --query 'logGroups[0].logGroupName' --output text | grep -q 'search-api'"

run_test "Embedding generator log group exists" \
    "aws logs describe-log-groups --log-group-name-prefix /aws/lambda/${ENVIRONMENT}-embedding-generator --region ${REGION} --query 'logGroups[0].logGroupName' --output text | grep -q 'embedding-generator'"

run_test "Discovery worker log group exists" \
    "aws logs describe-log-groups --log-group-name-prefix /aws/lambda/${ENVIRONMENT}-discovery-worker --region ${REGION} --query 'logGroups[0].logGroupName' --output text | grep -q 'discovery-worker'"

# Test 11: CloudWatch Alarms
run_test "High error rate alarm exists" \
    "aws cloudwatch describe-alarms --alarm-names ${ENVIRONMENT}-high-error-rate --region ${REGION} --query 'MetricAlarms[0].AlarmName' --output text | grep -q 'high-error-rate'"

run_test "High latency alarm exists" \
    "aws cloudwatch describe-alarms --alarm-names ${ENVIRONMENT}-high-latency --region ${REGION} --query 'MetricAlarms[0].AlarmName' --output text | grep -q 'high-latency'"

echo ""
echo "📋 Test Suite 6: Cache Performance"
echo "==================================="
echo ""

# Test 12: Redis Connectivity (requires redis-cli)
if command -v redis-cli &> /dev/null; then
    echo "Testing: Redis connectivity..."
    
    REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
        --output text)
    
    echo "Redis Endpoint: ${REDIS_ENDPOINT}"
    echo "Note: This test requires VPC access"
    echo -e "${YELLOW}⊘ SKIP${NC} - Manual verification required"
    echo ""
else
    echo -e "${YELLOW}⊘ SKIP${NC} - redis-cli not installed"
    echo ""
fi

# Test 13: DynamoDB Cache Operations
echo "Testing: DynamoDB cache write/read..."
TEST_KEY="SUPPLEMENT#test$(date +%s)"
TEST_DATA='{"name":"test supplement","similarity":0.95}'

# Write to cache
aws dynamodb put-item \
    --table-name ${ENVIRONMENT}-supplement-cache \
    --item "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"},\"supplementData\":{\"S\":\"${TEST_DATA}\"},\"ttl\":{\"N\":\"$(( $(date +%s) + 3600 ))\"}}" \
    --region ${REGION} \
    --no-cli-pager > /dev/null 2>&1

# Read from cache
READ_RESULT=$(aws dynamodb get-item \
    --table-name ${ENVIRONMENT}-supplement-cache \
    --key "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"}}" \
    --region ${REGION} \
    --query 'Item.supplementData.S' \
    --output text 2>/dev/null || echo "")

if [ "$READ_RESULT" = "$TEST_DATA" ]; then
    echo -e "${GREEN}✓ PASS${NC} - DynamoDB cache write/read successful"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - DynamoDB cache operation failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Clean up test data
aws dynamodb delete-item \
    --table-name ${ENVIRONMENT}-supplement-cache \
    --key "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"}}" \
    --region ${REGION} \
    --no-cli-pager > /dev/null 2>&1

echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo ""
echo "Total Tests: ${TESTS_TOTAL}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Staging environment is ready for use"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please review the failed tests and fix any issues"
    exit 1
fi
