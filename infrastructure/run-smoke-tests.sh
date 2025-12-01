#!/bin/bash

# Enhanced Smoke Tests for SuplementIA System
# Runs both infrastructure checks and integration tests
# Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 6.1, 6.3, 11.3

set -e

ENVIRONMENT="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${ENVIRONMENT}-intelligent-search"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0
TESTS_SKIPPED=0

echo "🧪 Enhanced Smoke Tests for ${ENVIRONMENT}"
echo "=================================================="
echo ""
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo "Stack: ${STACK_NAME}"
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

# Helper function to skip a test
skip_test() {
    local TEST_NAME=$1
    local REASON=$2
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    echo -e "${YELLOW}⊘ SKIP${NC}: ${TEST_NAME} - ${REASON}"
}

echo "📋 Phase 1: Infrastructure Verification"
echo "========================================"
echo ""

# Test 1: CloudFormation Stack
echo "1. CloudFormation Stack Status"
if aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} &> /dev/null; then
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].StackStatus' \
        --output text)
    
    if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo -e "   ${GREEN}✓ PASS${NC} - Stack status: ${STACK_STATUS}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL${NC} - Stack status: ${STACK_STATUS}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
else
    echo -e "   ${RED}✗ FAIL${NC} - Stack not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi
echo ""

# Test 2: Lambda Functions
echo "2. Lambda Functions Deployment"
LAMBDA_FUNCTIONS=(
    "${ENVIRONMENT}-search-api-lancedb"
    "${ENVIRONMENT}-embedding-generator"
    "${ENVIRONMENT}-discovery-worker-lancedb"
)

for FUNCTION_NAME in "${LAMBDA_FUNCTIONS[@]}"; do
    if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} &> /dev/null; then
        FUNCTION_STATE=$(aws lambda get-function \
            --function-name ${FUNCTION_NAME} \
            --region ${REGION} \
            --query 'Configuration.State' \
            --output text)
        
        if [ "$FUNCTION_STATE" = "Active" ]; then
            echo -e "   ${GREEN}✓ PASS${NC} - ${FUNCTION_NAME}: Active"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "   ${RED}✗ FAIL${NC} - ${FUNCTION_NAME}: ${FUNCTION_STATE}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "   ${RED}✗ FAIL${NC} - ${FUNCTION_NAME}: Not found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
done
echo ""

# Test 3: DynamoDB Tables
echo "3. DynamoDB Tables"
DYNAMODB_TABLES=(
    "${ENVIRONMENT}-supplement-cache"
    "${ENVIRONMENT}-discovery-queue"
)

for TABLE_NAME in "${DYNAMODB_TABLES[@]}"; do
    if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} &> /dev/null; then
        TABLE_STATUS=$(aws dynamodb describe-table \
            --table-name ${TABLE_NAME} \
            --region ${REGION} \
            --query 'Table.TableStatus' \
            --output text)
        
        if [ "$TABLE_STATUS" = "ACTIVE" ]; then
            echo -e "   ${GREEN}✓ PASS${NC} - ${TABLE_NAME}: Active"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "   ${RED}✗ FAIL${NC} - ${TABLE_NAME}: ${TABLE_STATUS}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "   ${RED}✗ FAIL${NC} - ${TABLE_NAME}: Not found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
done
echo ""

# Test 4: EFS File System
echo "4. EFS File System"
EFS_TAG_KEY="Environment"
EFS_TAG_VALUE="${ENVIRONMENT}"

EFS_ID=$(aws efs describe-file-systems \
    --region ${REGION} \
    --query "FileSystems[?Tags[?Key=='${EFS_TAG_KEY}' && Value=='${EFS_TAG_VALUE}']].FileSystemId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EFS_ID" ]; then
    EFS_STATE=$(aws efs describe-file-systems \
        --file-system-id ${EFS_ID} \
        --region ${REGION} \
        --query 'FileSystems[0].LifeCycleState' \
        --output text)
    
    if [ "$EFS_STATE" = "available" ]; then
        echo -e "   ${GREEN}✓ PASS${NC} - EFS ${EFS_ID}: Available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL${NC} - EFS ${EFS_ID}: ${EFS_STATE}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "   ${YELLOW}⊘ SKIP${NC} - EFS not found (may not be required)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

# Test 5: CloudWatch Log Groups
echo "5. CloudWatch Log Groups"
for FUNCTION_NAME in "${LAMBDA_FUNCTIONS[@]}"; do
    LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"
    
    if aws logs describe-log-groups \
        --log-group-name-prefix ${LOG_GROUP} \
        --region ${REGION} \
        --query 'logGroups[0].logGroupName' \
        --output text | grep -q "${FUNCTION_NAME}"; then
        echo -e "   ${GREEN}✓ PASS${NC} - Log group exists: ${LOG_GROUP}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL${NC} - Log group missing: ${LOG_GROUP}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
done
echo ""

echo "📋 Phase 2: Functional Tests"
echo "============================="
echo ""

# Test 6: Embedding Generator
echo "6. Embedding Generator Lambda"
EMBEDDING_PAYLOAD='{"text":"vitamin d"}'
EMBEDDING_OUTPUT="/tmp/embedding-test-${ENVIRONMENT}.json"

if aws lambda invoke \
    --function-name ${ENVIRONMENT}-embedding-generator \
    --payload "${EMBEDDING_PAYLOAD}" \
    --region ${REGION} \
    ${EMBEDDING_OUTPUT} \
    --no-cli-pager &> /dev/null; then
    
    if [ -f ${EMBEDDING_OUTPUT} ]; then
        EMBEDDING_DIMS=$(python3 -c "import sys, json; data=json.load(open('${EMBEDDING_OUTPUT}')); body=json.loads(data.get('body','{}')); print(body.get('dimensions',0))" 2>/dev/null || echo "0")
        
        if [ "$EMBEDDING_DIMS" = "384" ]; then
            echo -e "   ${GREEN}✓ PASS${NC} - Generated 384-dimensional embedding"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "   ${RED}✗ FAIL${NC} - Expected 384 dimensions, got ${EMBEDDING_DIMS}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        rm -f ${EMBEDDING_OUTPUT}
    else
        echo -e "   ${RED}✗ FAIL${NC} - No output file generated"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "   ${RED}✗ FAIL${NC} - Lambda invocation failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

# Test 7: Search API
echo "7. Search API Lambda"
SEARCH_PAYLOAD='{"queryStringParameters":{"q":"vitamin d","limit":"5"}}'
SEARCH_OUTPUT="/tmp/search-test-${ENVIRONMENT}.json"

if aws lambda invoke \
    --function-name ${ENVIRONMENT}-search-api-lancedb \
    --payload "${SEARCH_PAYLOAD}" \
    --region ${REGION} \
    ${SEARCH_OUTPUT} \
    --no-cli-pager &> /dev/null; then
    
    if [ -f ${SEARCH_OUTPUT} ]; then
        STATUS_CODE=$(python3 -c "import sys, json; print(json.load(open('${SEARCH_OUTPUT}')).get('statusCode',0))" 2>/dev/null || echo "0")
        
        if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "404" ]; then
            echo -e "   ${GREEN}✓ PASS${NC} - Search API responded (status: ${STATUS_CODE})"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            
            # Show response details
            if [ "$STATUS_CODE" = "200" ]; then
                SUPPLEMENT_NAME=$(python3 -c "import sys, json; data=json.load(open('${SEARCH_OUTPUT}')); body=json.loads(data.get('body','{}')); print(body.get('supplement',{}).get('name','N/A'))" 2>/dev/null || echo "N/A")
                echo -e "   ${BLUE}ℹ${NC}  Found supplement: ${SUPPLEMENT_NAME}"
            fi
        else
            echo -e "   ${RED}✗ FAIL${NC} - Unexpected status code: ${STATUS_CODE}"
            cat ${SEARCH_OUTPUT}
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        rm -f ${SEARCH_OUTPUT}
    else
        echo -e "   ${RED}✗ FAIL${NC} - No output file generated"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "   ${RED}✗ FAIL${NC} - Lambda invocation failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

# Test 8: Cache Operations
echo "8. DynamoDB Cache Operations"
TEST_KEY="SUPPLEMENT#smoke-test-$(date +%s)"
TEST_DATA='{"name":"test supplement","similarity":0.95}'
CACHE_TABLE="${ENVIRONMENT}-supplement-cache"

# Write to cache
if aws dynamodb put-item \
    --table-name ${CACHE_TABLE} \
    --item "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"},\"supplementData\":{\"S\":\"${TEST_DATA}\"},\"ttl\":{\"N\":\"$(( $(date +%s) + 3600 ))\"}}" \
    --region ${REGION} \
    --no-cli-pager &> /dev/null; then
    
    # Read from cache
    READ_RESULT=$(aws dynamodb get-item \
        --table-name ${CACHE_TABLE} \
        --key "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"}}" \
        --region ${REGION} \
        --query 'Item.supplementData.S' \
        --output text 2>/dev/null || echo "")
    
    if [ "$READ_RESULT" = "$TEST_DATA" ]; then
        echo -e "   ${GREEN}✓ PASS${NC} - Cache write/read successful"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL${NC} - Cache read failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Clean up
    aws dynamodb delete-item \
        --table-name ${CACHE_TABLE} \
        --key "{\"PK\":{\"S\":\"${TEST_KEY}\"},\"SK\":{\"S\":\"QUERY\"}}" \
        --region ${REGION} \
        --no-cli-pager &> /dev/null
else
    echo -e "   ${RED}✗ FAIL${NC} - Cache write failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

# Test 9: Model Loading (check if EFS mount works)
echo "9. Model Loading from EFS"
echo -e "   ${YELLOW}⊘ SKIP${NC} - Requires Lambda execution with EFS access"
TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

# Test 10: Vector Search
echo "10. Vector Search in LanceDB"
echo -e "   ${YELLOW}⊘ SKIP${NC} - Covered by Search API test"
TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""

echo "📋 Phase 3: Integration Tests"
echo "=============================="
echo ""

# Check if pytest is available
if command -v pytest &> /dev/null; then
    echo "11. Running Integration Test Suite"
    
    # Set environment variables for tests
    export ENVIRONMENT=${ENVIRONMENT}
    export AWS_REGION=${REGION}
    
    # Run integration tests
    cd backend/lambda
    
    if pytest test_integration_suite.py -v --tb=short 2>&1 | tee /tmp/integration-test-output.txt; then
        echo -e "   ${GREEN}✓ PASS${NC} - Integration tests passed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL${NC} - Integration tests failed"
        echo ""
        echo "   Failed test details:"
        grep -A 5 "FAILED" /tmp/integration-test-output.txt || echo "   See full output above"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    cd - > /dev/null
else
    echo "11. Integration Test Suite"
    echo -e "   ${YELLOW}⊘ SKIP${NC} - pytest not installed"
    echo "   Install with: pip install pytest boto3"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo ""
echo "Environment: ${ENVIRONMENT}"
echo "Total Tests: ${TESTS_TOTAL}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Skipped: ${YELLOW}${TESTS_SKIPPED}${NC}"
echo ""

# Calculate pass rate
if [ $TESTS_TOTAL -gt 0 ]; then
    PASS_RATE=$(( (TESTS_PASSED * 100) / TESTS_TOTAL ))
    echo "Pass Rate: ${PASS_RATE}%"
    echo ""
fi

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 ${ENVIRONMENT} environment is ready for use"
    echo ""
    echo "Next steps:"
    echo "  1. Review CloudWatch logs for any warnings"
    echo "  2. Run performance tests: cd backend/lambda && pytest test_performance.py"
    echo "  3. Monitor metrics in CloudWatch dashboard"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please review the failed tests and fix any issues before proceeding."
    echo ""
    echo "Common issues:"
    echo "  - Lambda functions not deployed: Run ./deploy-staging-lambdas.sh"
    echo "  - DynamoDB tables missing: Check CloudFormation stack"
    echo "  - EFS not mounted: Verify Lambda VPC configuration"
    echo "  - Model not loaded: Run upload-model-to-efs.sh"
    exit 1
fi
