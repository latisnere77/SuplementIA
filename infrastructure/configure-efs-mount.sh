#!/bin/bash

###############################################################################
# EFS Mount Configuration Script for Lambda Functions
# 
# This script verifies and configures EFS mount for Lambda functions:
# 1. Verifies EFS mount points are accessible from Lambda
# 2. Creates required directories (/mnt/efs/suplementia-lancedb/ and /mnt/efs/models/)
# 3. Tests read/write permissions from Lambda
# 4. Configures security groups for NFS (port 2049)
#
# Requirements: 1.2, 1.5
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Environment (staging or production)
ENVIRONMENT=${1:-staging}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EFS Mount Configuration for Lambda${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print test results
print_result() {
    local test_name=$1
    local result=$2
    local message=$3
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} - ${test_name}"
        ((PASSED++))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗ FAIL${NC} - ${test_name}"
        [ -n "$message" ] && echo -e "  ${RED}Error: ${message}${NC}"
        ((FAILED++))
    elif [ "$result" = "SKIP" ]; then
        echo -e "${YELLOW}○ SKIP${NC} - ${test_name}"
        [ -n "$message" ] && echo -e "  ${YELLOW}Reason: ${message}${NC}"
        ((SKIPPED++))
    fi
}

# Check AWS CLI
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v aws &> /dev/null; then
    print_result "AWS CLI installed" "FAIL" "AWS CLI not found"
    exit 1
fi
print_result "AWS CLI installed" "PASS"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_result "AWS credentials configured" "FAIL" "AWS credentials not configured"
    exit 1
fi
print_result "AWS credentials configured" "PASS"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 1: Verify EFS File System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get EFS file system ID from CloudFormation
STACK_NAME="${ENVIRONMENT}-intelligent-search"
EFS_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$EFS_ID" ]; then
    print_result "Get EFS File System ID" "FAIL" "Stack not found or EFS not created"
    echo ""
    echo -e "${YELLOW}Note: Run './deploy-lancedb-stack.sh ${ENVIRONMENT}' first${NC}"
    exit 1
fi

print_result "Get EFS File System ID" "PASS"
echo -e "  ${BLUE}EFS ID: ${EFS_ID}${NC}"

# Verify EFS exists and is available
EFS_STATE=$(aws efs describe-file-systems \
    --file-system-id "$EFS_ID" \
    --query 'FileSystems[0].LifeCycleState' \
    --output text 2>/dev/null || echo "")

if [ "$EFS_STATE" != "available" ]; then
    print_result "EFS File System available" "FAIL" "State: $EFS_STATE"
    exit 1
fi
print_result "EFS File System available" "PASS"

# Get EFS Access Point
EFS_AP_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`EFSAccessPointId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$EFS_AP_ID" ]; then
    print_result "Get EFS Access Point ID" "FAIL" "Access Point not found"
    exit 1
fi
print_result "Get EFS Access Point ID" "PASS"
echo -e "  ${BLUE}Access Point ID: ${EFS_AP_ID}${NC}"

# Verify mount targets
MOUNT_TARGETS=$(aws efs describe-mount-targets \
    --file-system-id "$EFS_ID" \
    --query 'MountTargets[*].LifeCycleState' \
    --output text 2>/dev/null || echo "")

if [ -z "$MOUNT_TARGETS" ]; then
    print_result "EFS Mount Targets exist" "FAIL" "No mount targets found"
    exit 1
fi

# Check if all mount targets are available
if echo "$MOUNT_TARGETS" | grep -qv "available"; then
    print_result "EFS Mount Targets available" "FAIL" "Some mount targets not available"
    exit 1
fi
print_result "EFS Mount Targets available" "PASS"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 2: Verify Security Groups${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get Lambda Security Group
LAMBDA_SG=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaSecurityGroupId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_SG" ]; then
    print_result "Get Lambda Security Group" "FAIL" "Security group not found"
    exit 1
fi
print_result "Get Lambda Security Group" "PASS"
echo -e "  ${BLUE}Lambda SG: ${LAMBDA_SG}${NC}"

# Get EFS Security Group from mount targets
EFS_SG=$(aws efs describe-mount-targets \
    --file-system-id "$EFS_ID" \
    --query 'MountTargets[0].SecurityGroups[0]' \
    --output text 2>/dev/null || echo "")

if [ -z "$EFS_SG" ]; then
    print_result "Get EFS Security Group" "FAIL" "Security group not found"
    exit 1
fi
print_result "Get EFS Security Group" "PASS"
echo -e "  ${BLUE}EFS SG: ${EFS_SG}${NC}"

# Verify NFS port 2049 is open from Lambda SG to EFS SG
NFS_RULE=$(aws ec2 describe-security-groups \
    --group-ids "$EFS_SG" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`2049\` && ToPort==\`2049\`].UserIdGroupPairs[?GroupId==\`${LAMBDA_SG}\`]" \
    --output text 2>/dev/null || echo "")

if [ -z "$NFS_RULE" ]; then
    print_result "NFS port 2049 configured" "FAIL" "Port 2049 not open from Lambda to EFS"
    
    echo -e "${YELLOW}Attempting to add NFS rule...${NC}"
    if aws ec2 authorize-security-group-ingress \
        --group-id "$EFS_SG" \
        --protocol tcp \
        --port 2049 \
        --source-group "$LAMBDA_SG" 2>/dev/null; then
        print_result "Add NFS rule" "PASS"
    else
        print_result "Add NFS rule" "FAIL" "Failed to add security group rule"
        exit 1
    fi
else
    print_result "NFS port 2049 configured" "PASS"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 3: Verify Lambda EFS Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Lambda functions exist
LAMBDA_FUNCTIONS=(
    "${ENVIRONMENT}-search-api-lancedb"
    "${ENVIRONMENT}-discovery-worker-lancedb"
    "${ENVIRONMENT}-embedding-generator"
)

for FUNCTION_NAME in "${LAMBDA_FUNCTIONS[@]}"; do
    # Check if function exists
    if ! aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
        print_result "Lambda function exists: $FUNCTION_NAME" "SKIP" "Function not deployed yet"
        continue
    fi
    
    print_result "Lambda function exists: $FUNCTION_NAME" "PASS"
    
    # Check EFS configuration
    EFS_CONFIG=$(aws lambda get-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --query 'FileSystemConfigs[0].LocalMountPath' \
        --output text 2>/dev/null || echo "")
    
    if [ "$EFS_CONFIG" = "/mnt/efs" ]; then
        print_result "EFS mounted at /mnt/efs: $FUNCTION_NAME" "PASS"
    else
        print_result "EFS mounted at /mnt/efs: $FUNCTION_NAME" "FAIL" "EFS not configured or wrong mount path"
    fi
    
    # Check VPC configuration
    VPC_CONFIG=$(aws lambda get-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --query 'VpcConfig.VpcId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$VPC_CONFIG" ] && [ "$VPC_CONFIG" != "None" ]; then
        print_result "VPC configured: $FUNCTION_NAME" "PASS"
    else
        print_result "VPC configured: $FUNCTION_NAME" "FAIL" "Lambda not in VPC"
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 4: Test EFS Access from Lambda${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create a test Lambda function to verify EFS access
TEST_FUNCTION_NAME="${ENVIRONMENT}-efs-test-function"

echo -e "${YELLOW}Creating test Lambda function...${NC}"

# Create test function code
cat > /tmp/test_efs.py << 'EOF'
import os
import json

def lambda_handler(event, context):
    """Test EFS access and create directories"""
    results = {
        'efs_mounted': False,
        'directories_created': False,
        'write_test': False,
        'read_test': False,
        'errors': []
    }
    
    # Check if EFS is mounted
    if os.path.exists('/mnt/efs'):
        results['efs_mounted'] = True
    else:
        results['errors'].append('EFS not mounted at /mnt/efs')
        return results
    
    # Create required directories
    try:
        os.makedirs('/mnt/efs/suplementia-lancedb', exist_ok=True)
        os.makedirs('/mnt/efs/models', exist_ok=True)
        results['directories_created'] = True
    except Exception as e:
        results['errors'].append(f'Failed to create directories: {str(e)}')
        return results
    
    # Test write permissions
    try:
        test_file = '/mnt/efs/test_write.txt'
        with open(test_file, 'w') as f:
            f.write('EFS write test successful')
        results['write_test'] = True
    except Exception as e:
        results['errors'].append(f'Failed to write to EFS: {str(e)}')
        return results
    
    # Test read permissions
    try:
        with open(test_file, 'r') as f:
            content = f.read()
        if content == 'EFS write test successful':
            results['read_test'] = True
        os.remove(test_file)
    except Exception as e:
        results['errors'].append(f'Failed to read from EFS: {str(e)}')
    
    return results
EOF

# Zip the test function
cd /tmp
zip -q test_efs.zip test_efs.py

# Get Lambda execution role
LAMBDA_ROLE=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_ROLE" ]; then
    print_result "Get Lambda execution role" "FAIL" "Role not found"
    rm -f /tmp/test_efs.py /tmp/test_efs.zip
    exit 1
fi

# Get VPC subnets
SUBNET_IDS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?contains(OutputKey, `PrivateSubnet`)].OutputValue' \
    --output text 2>/dev/null | tr '\t' ',')

# Create or update test function
if aws lambda get-function --function-name "$TEST_FUNCTION_NAME" &> /dev/null; then
    echo -e "${YELLOW}Updating existing test function...${NC}"
    aws lambda update-function-code \
        --function-name "$TEST_FUNCTION_NAME" \
        --zip-file fileb:///tmp/test_efs.zip \
        --output text &> /dev/null
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name "$TEST_FUNCTION_NAME"
else
    echo -e "${YELLOW}Creating new test function...${NC}"
    aws lambda create-function \
        --function-name "$TEST_FUNCTION_NAME" \
        --runtime python3.11 \
        --role "$LAMBDA_ROLE" \
        --handler test_efs.lambda_handler \
        --zip-file fileb:///tmp/test_efs.zip \
        --timeout 30 \
        --memory-size 256 \
        --architectures arm64 \
        --vpc-config SubnetIds="$SUBNET_IDS",SecurityGroupIds="$LAMBDA_SG" \
        --file-system-configs Arn="arn:aws:elasticfilesystem:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):access-point/${EFS_AP_ID}",LocalMountPath=/mnt/efs \
        --output text &> /dev/null
    
    # Wait for function to be active
    echo -e "${YELLOW}Waiting for function to be active...${NC}"
    aws lambda wait function-active --function-name "$TEST_FUNCTION_NAME"
fi

print_result "Test function created/updated" "PASS"

# Invoke test function
echo -e "${YELLOW}Invoking test function...${NC}"
INVOKE_RESULT=$(aws lambda invoke \
    --function-name "$TEST_FUNCTION_NAME" \
    --payload '{}' \
    --output text \
    /tmp/test_result.json 2>&1)

if [ $? -ne 0 ]; then
    print_result "Invoke test function" "FAIL" "$INVOKE_RESULT"
    rm -f /tmp/test_efs.py /tmp/test_efs.zip /tmp/test_result.json
    exit 1
fi

print_result "Invoke test function" "PASS"

# Parse results
TEST_RESULTS=$(cat /tmp/test_result.json)
echo -e "${BLUE}Test Results:${NC}"
echo "$TEST_RESULTS" | jq '.'

# Check individual test results
EFS_MOUNTED=$(echo "$TEST_RESULTS" | jq -r '.efs_mounted')
DIRS_CREATED=$(echo "$TEST_RESULTS" | jq -r '.directories_created')
WRITE_TEST=$(echo "$TEST_RESULTS" | jq -r '.write_test')
READ_TEST=$(echo "$TEST_RESULTS" | jq -r '.read_test')

if [ "$EFS_MOUNTED" = "true" ]; then
    print_result "EFS accessible from Lambda" "PASS"
else
    print_result "EFS accessible from Lambda" "FAIL"
fi

if [ "$DIRS_CREATED" = "true" ]; then
    print_result "Directories created (/mnt/efs/suplementia-lancedb/, /mnt/efs/models/)" "PASS"
else
    print_result "Directories created" "FAIL"
fi

if [ "$WRITE_TEST" = "true" ]; then
    print_result "Write permissions verified" "PASS"
else
    print_result "Write permissions verified" "FAIL"
fi

if [ "$READ_TEST" = "true" ]; then
    print_result "Read permissions verified" "PASS"
else
    print_result "Read permissions verified" "FAIL"
fi

# Cleanup
echo -e "${YELLOW}Cleaning up test function...${NC}"
aws lambda delete-function --function-name "$TEST_FUNCTION_NAME" &> /dev/null
rm -f /tmp/test_efs.py /tmp/test_efs.zip /tmp/test_result.json

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "${YELLOW}Skipped: ${SKIPPED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All EFS mount configuration checks passed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Upload ML model to /mnt/efs/models/"
    echo "2. Initialize LanceDB at /mnt/efs/suplementia-lancedb/"
    echo "3. Deploy Lambda functions with EFS configuration"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
