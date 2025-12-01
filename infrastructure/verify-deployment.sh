#!/bin/bash

# Deployment Verification Script for SuplementIA Infrastructure
# This script verifies that all infrastructure components are deployed correctly
# Usage: ./verify-deployment.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
STACK_NAME="${ENVIRONMENT}-suplementia-lancedb"
REGION="${AWS_REGION:-us-east-1}"

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

echo -e "${BLUE}=========================================="
echo "SuplementIA Infrastructure Verification"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo -e "==========================================${NC}"
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

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo ""

# Test Suite 1: CloudFormation Stack
echo -e "${BLUE}Test Suite 1: CloudFormation Stack${NC}"
echo "===================================="
echo ""

run_test "CloudFormation stack exists" \
    "aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].StackStatus' --output text | grep -q 'CREATE_COMPLETE\|UPDATE_COMPLETE'"

run_test "All stack resources created" \
    "aws cloudformation describe-stack-resources --stack-name ${STACK_NAME} --region ${REGION} --query 'StackResources[?ResourceStatus!=\`CREATE_COMPLETE\` && ResourceStatus!=\`UPDATE_COMPLETE\`]' --output text | grep -q '^$'"

echo ""

# Test Suite 2: VPC and Networking
echo -e "${BLUE}Test Suite 2: VPC and Networking${NC}"
echo "===================================="
echo ""

VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$VPC_ID" ]; then
    run_test "VPC exists and is available" \
        "aws ec2 describe-vpcs --vpc-ids ${VPC_ID} --region ${REGION} --query 'Vpcs[0].State' --output text | grep -q 'available'"
    
    run_test "VPC has correct CIDR block" \
        "aws ec2 describe-vpcs --vpc-ids ${VPC_ID} --region ${REGION} --query 'Vpcs[0].CidrBlock' --output text | grep -q '10.0.0.0/16'"
else
    echo -e "${YELLOW}⊘ SKIP - VPC ID not found in stack outputs${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 2))
fi

SUBNET1_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1Id`].OutputValue' \
    --output text 2>/dev/null || echo "")

SUBNET2_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet2Id`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$SUBNET1_ID" ] && [ -n "$SUBNET2_ID" ]; then
    run_test "Private subnets exist" \
        "aws ec2 describe-subnets --subnet-ids ${SUBNET1_ID} ${SUBNET2_ID} --region ${REGION} --query 'Subnets | length(@)' --output text | grep -q '2'"
    
    run_test "Subnets are in different AZs" \
        "[ $(aws ec2 describe-subnets --subnet-ids ${SUBNET1_ID} ${SUBNET2_ID} --region ${REGION} --query 'Subnets[].AvailabilityZone' --output text | tr '\t' '\n' | sort -u | wc -l) -eq 2 ]"
else
    echo -e "${YELLOW}⊘ SKIP - Subnet IDs not found in stack outputs${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 2))
fi

echo ""

# Test Suite 3: DynamoDB Tables
echo -e "${BLUE}Test Suite 3: DynamoDB Tables${NC}"
echo "===================================="
echo ""

CACHE_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`SupplementCacheTableName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CACHE_TABLE" ]; then
    run_test "Supplement cache table exists" \
        "aws dynamodb describe-table --table-name ${CACHE_TABLE} --region ${REGION} --query 'Table.TableStatus' --output text | grep -q 'ACTIVE'"
    
    run_test "Cache table has TTL enabled" \
        "aws dynamodb describe-table --table-name ${CACHE_TABLE} --region ${REGION} --query 'Table.TimeToLiveDescription.TimeToLiveStatus' --output text | grep -q 'ENABLED'"
    
    run_test "Cache table has streams enabled" \
        "aws dynamodb describe-table --table-name ${CACHE_TABLE} --region ${REGION} --query 'Table.StreamSpecification.StreamEnabled' --output text | grep -q 'True'"
else
    echo -e "${YELLOW}⊘ SKIP - Cache table name not found${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 3))
fi

QUEUE_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DiscoveryQueueTableName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$QUEUE_TABLE" ]; then
    run_test "Discovery queue table exists" \
        "aws dynamodb describe-table --table-name ${QUEUE_TABLE} --region ${REGION} --query 'Table.TableStatus' --output text | grep -q 'ACTIVE'"
    
    run_test "Queue table has streams enabled" \
        "aws dynamodb describe-table --table-name ${QUEUE_TABLE} --region ${REGION} --query 'Table.StreamSpecification.StreamEnabled' --output text | grep -q 'True'"
else
    echo -e "${YELLOW}⊘ SKIP - Queue table name not found${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 2))
fi

echo ""

# Test Suite 4: EFS File System
echo -e "${BLUE}Test Suite 4: EFS File System${NC}"
echo "===================================="
echo ""

EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$EFS_ID" ]; then
    run_test "EFS file system exists" \
        "aws efs describe-file-systems --file-system-id ${EFS_ID} --region ${REGION} --query 'FileSystems[0].LifeCycleState' --output text | grep -q 'available'"
    
    run_test "EFS is encrypted" \
        "aws efs describe-file-systems --file-system-id ${EFS_ID} --region ${REGION} --query 'FileSystems[0].Encrypted' --output text | grep -q 'True'"
    
    run_test "EFS has mount targets" \
        "[ $(aws efs describe-mount-targets --file-system-id ${EFS_ID} --region ${REGION} --query 'MountTargets | length(@)' --output text) -ge 2 ]"
else
    echo -e "${YELLOW}⊘ SKIP - EFS ID not found${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 3))
fi

echo ""

# Test Suite 5: Lambda Functions
echo -e "${BLUE}Test Suite 5: Lambda Functions${NC}"
echo "===================================="
echo ""

SEARCH_API_FUNCTION="${ENVIRONMENT}-search-api-lancedb"
run_test "Search API Lambda exists" \
    "aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} --query 'Configuration.State' --output text | grep -q 'Active'"

if aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} &> /dev/null; then
    run_test "Search API uses Python 3.11" \
        "aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} --query 'Configuration.Runtime' --output text | grep -q 'python3.11'"
    
    run_test "Search API uses ARM64" \
        "aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} --query 'Configuration.Architectures[0]' --output text | grep -q 'arm64'"
    
    run_test "Search API has VPC config" \
        "aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} --query 'Configuration.VpcConfig.VpcId' --output text | grep -v 'None'"
    
    run_test "Search API has EFS mount" \
        "aws lambda get-function --function-name ${SEARCH_API_FUNCTION} --region ${REGION} --query 'Configuration.FileSystemConfigs | length(@)' --output text | grep -q '1'"
else
    echo -e "${YELLOW}⊘ SKIP - Search API Lambda not found${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 4))
fi

DISCOVERY_WORKER_FUNCTION="${ENVIRONMENT}-discovery-worker-lancedb"
run_test "Discovery Worker Lambda exists" \
    "aws lambda get-function --function-name ${DISCOVERY_WORKER_FUNCTION} --region ${REGION} --query 'Configuration.State' --output text | grep -q 'Active'"

if aws lambda get-function --function-name ${DISCOVERY_WORKER_FUNCTION} --region ${REGION} &> /dev/null; then
    run_test "Discovery Worker uses Python 3.11" \
        "aws lambda get-function --function-name ${DISCOVERY_WORKER_FUNCTION} --region ${REGION} --query 'Configuration.Runtime' --output text | grep -q 'python3.11'"
    
    run_test "Discovery Worker uses ARM64" \
        "aws lambda get-function --function-name ${DISCOVERY_WORKER_FUNCTION} --region ${REGION} --query 'Configuration.Architectures[0]' --output text | grep -q 'arm64'"
    
    run_test "Discovery Worker has EFS mount" \
        "aws lambda get-function --function-name ${DISCOVERY_WORKER_FUNCTION} --region ${REGION} --query 'Configuration.FileSystemConfigs | length(@)' --output text | grep -q '1'"
else
    echo -e "${YELLOW}⊘ SKIP - Discovery Worker Lambda not found${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 3))
fi

echo ""

# Test Suite 6: CloudWatch Monitoring
echo -e "${BLUE}Test Suite 6: CloudWatch Monitoring${NC}"
echo "===================================="
echo ""

run_test "Search API log group exists" \
    "aws logs describe-log-groups --log-group-name-prefix /aws/lambda/${SEARCH_API_FUNCTION} --region ${REGION} --query 'logGroups[0].logGroupName' --output text | grep -q 'search-api'"

run_test "Discovery Worker log group exists" \
    "aws logs describe-log-groups --log-group-name-prefix /aws/lambda/${DISCOVERY_WORKER_FUNCTION} --region ${REGION} --query 'logGroups[0].logGroupName' --output text | grep -q 'discovery-worker'"

run_test "Error rate alarm exists" \
    "aws cloudwatch describe-alarms --alarm-name-prefix ${ENVIRONMENT} --region ${REGION} --query 'MetricAlarms[?contains(AlarmName, \`error\`) || contains(AlarmName, \`Error\`)] | length(@)' --output text | grep -v '^0$'"

run_test "Latency alarm exists" \
    "aws cloudwatch describe-alarms --alarm-name-prefix ${ENVIRONMENT} --region ${REGION} --query 'MetricAlarms[?contains(AlarmName, \`latency\`) || contains(AlarmName, \`Latency\`)] | length(@)' --output text | grep -v '^0$'"

echo ""

# Summary
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo -e "==========================================${NC}"
echo ""
echo "Total Tests: ${TESTS_TOTAL}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${GREEN}Infrastructure is ready for use${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please review the failed tests and fix any issues"
    exit 1
fi
