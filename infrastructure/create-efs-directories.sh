#!/bin/bash

###############################################################################
# EFS Directory Creation Script
# 
# This script creates required EFS directories using a temporary Lambda function.
# It's safer than modifying existing production functions.
#
# Usage: ./create-efs-directories.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EFS Directory Creation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get production Lambda configuration
FUNCTION_NAME="production-search-api-lancedb"

echo -e "${YELLOW}Getting EFS configuration from ${FUNCTION_NAME}...${NC}"

# Get EFS configuration
EFS_CONFIG=$(aws lambda get-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --query '{FileSystemArn: FileSystemConfigs[0].Arn, VpcSubnets: VpcConfig.SubnetIds, SecurityGroups: VpcConfig.SecurityGroupIds, Role: Role}' \
    --output json)

EFS_ARN=$(echo "$EFS_CONFIG" | jq -r '.FileSystemArn')
VPC_SUBNETS=$(echo "$EFS_CONFIG" | jq -r '.VpcSubnets | join(",")')
SECURITY_GROUPS=$(echo "$EFS_CONFIG" | jq -r '.SecurityGroups | join(",")')
LAMBDA_ROLE=$(echo "$EFS_CONFIG" | jq -r '.Role')

if [ "$EFS_ARN" = "null" ] || [ -z "$EFS_ARN" ]; then
    echo -e "${RED}✗ Could not get EFS configuration from Lambda function${NC}"
    exit 1
fi

echo -e "${GREEN}✓ EFS configuration retrieved${NC}"
echo -e "  ${BLUE}EFS ARN: ${EFS_ARN}${NC}"
echo -e "  ${BLUE}VPC Subnets: ${VPC_SUBNETS}${NC}"
echo -e "  ${BLUE}Security Groups: ${SECURITY_GROUPS}${NC}"

# Create test function code
echo -e "${YELLOW}Creating test function code...${NC}"

cat > /tmp/create_dirs.py << 'EOF'
import os
import json

def lambda_handler(event, context):
    """Create required EFS directories"""
    results = {
        'success': False,
        'efs_mounted': False,
        'directories': {},
        'errors': []
    }
    
    # Check if EFS is mounted
    if not os.path.exists('/mnt/efs'):
        results['errors'].append('EFS not mounted at /mnt/efs')
        return results
    
    results['efs_mounted'] = True
    
    # Directories to create
    directories = {
        'suplementia-lancedb': '/mnt/efs/suplementia-lancedb',
        'models': '/mnt/efs/models'
    }
    
    # Create each directory
    for name, path in directories.items():
        dir_info = {
            'path': path,
            'existed': False,
            'created': False,
            'writable': False,
            'contents': []
        }
        
        try:
            # Check if exists
            if os.path.exists(path):
                dir_info['existed'] = True
            else:
                # Create directory
                os.makedirs(path, mode=0o755, exist_ok=True)
                dir_info['created'] = True
            
            # Test write permissions
            test_file = os.path.join(path, '.write_test')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            dir_info['writable'] = True
            
            # List contents
            dir_info['contents'] = os.listdir(path)
            
        except Exception as e:
            dir_info['error'] = str(e)
            results['errors'].append(f'{name}: {str(e)}')
        
        results['directories'][name] = dir_info
    
    # Check if all succeeded
    all_writable = all(
        d.get('writable', False) 
        for d in results['directories'].values()
    )
    
    results['success'] = results['efs_mounted'] and all_writable
    
    return results
EOF

# Zip the function
cd /tmp
zip -q create_dirs.zip create_dirs.py

echo -e "${GREEN}✓ Test function code created${NC}"

# Create temporary test function
TEST_FUNCTION="temp-efs-directory-creator"

echo -e "${YELLOW}Creating temporary Lambda function...${NC}"

# Delete if exists
aws lambda delete-function --function-name "$TEST_FUNCTION" 2>/dev/null || true

# Create function
aws lambda create-function \
    --function-name "$TEST_FUNCTION" \
    --runtime python3.11 \
    --role "$LAMBDA_ROLE" \
    --handler create_dirs.lambda_handler \
    --zip-file fileb:///tmp/create_dirs.zip \
    --timeout 30 \
    --memory-size 256 \
    --architectures arm64 \
    --vpc-config SubnetIds="$VPC_SUBNETS",SecurityGroupIds="$SECURITY_GROUPS" \
    --file-system-configs Arn="$EFS_ARN",LocalMountPath=/mnt/efs \
    --output text &> /dev/null

echo -e "${GREEN}✓ Temporary function created${NC}"

# Wait for function to be active
echo -e "${YELLOW}Waiting for function to be active (this may take 30-60 seconds)...${NC}"
aws lambda wait function-active --function-name "$TEST_FUNCTION"

echo -e "${GREEN}✓ Function is active${NC}"

# Invoke function
echo -e "${YELLOW}Invoking function to create directories...${NC}"
aws lambda invoke \
    --function-name "$TEST_FUNCTION" \
    --payload '{}' \
    /tmp/create_result.json &> /dev/null

echo -e "${GREEN}✓ Function invoked${NC}"
echo ""

# Parse and display results
RESULTS=$(cat /tmp/create_result.json)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Pretty print results
echo "$RESULTS" | jq '.'

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check results
SUCCESS=$(echo "$RESULTS" | jq -r '.success')
EFS_MOUNTED=$(echo "$RESULTS" | jq -r '.efs_mounted')

if [ "$EFS_MOUNTED" = "true" ]; then
    echo -e "${GREEN}✓ EFS is mounted at /mnt/efs${NC}"
else
    echo -e "${RED}✗ EFS is NOT mounted${NC}"
fi

# Check each directory
for dir in "suplementia-lancedb" "models"; do
    EXISTED=$(echo "$RESULTS" | jq -r ".directories.\"$dir\".existed")
    CREATED=$(echo "$RESULTS" | jq -r ".directories.\"$dir\".created")
    WRITABLE=$(echo "$RESULTS" | jq -r ".directories.\"$dir\".writable")
    PATH=$(echo "$RESULTS" | jq -r ".directories.\"$dir\".path")
    
    if [ "$EXISTED" = "true" ]; then
        echo -e "${GREEN}✓ ${PATH} already existed${NC}"
    elif [ "$CREATED" = "true" ]; then
        echo -e "${GREEN}✓ ${PATH} created successfully${NC}"
    else
        echo -e "${RED}✗ ${PATH} could not be created${NC}"
    fi
    
    if [ "$WRITABLE" = "true" ]; then
        echo -e "${GREEN}✓ ${PATH} is writable${NC}"
    else
        echo -e "${RED}✗ ${PATH} is NOT writable${NC}"
    fi
    
    # Show contents
    CONTENTS=$(echo "$RESULTS" | jq -r ".directories.\"$dir\".contents[]?" 2>/dev/null)
    if [ -n "$CONTENTS" ]; then
        echo -e "  ${BLUE}Contents:${NC}"
        echo "$CONTENTS" | sed 's/^/    /'
    fi
done

# Show errors if any
ERRORS=$(echo "$RESULTS" | jq -r '.errors[]?' 2>/dev/null)
if [ -n "$ERRORS" ]; then
    echo ""
    echo -e "${RED}Errors:${NC}"
    echo "$ERRORS"
fi

# Cleanup
echo ""
echo -e "${YELLOW}Cleaning up temporary function...${NC}"
aws lambda delete-function --function-name "$TEST_FUNCTION" &> /dev/null
rm -f /tmp/create_dirs.py /tmp/create_dirs.zip /tmp/create_result.json

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"

if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo -e "${GREEN}✓ EFS directories created successfully!${NC}"
    echo ""
    echo -e "${BLUE}Created directories:${NC}"
    echo "  • /mnt/efs/suplementia-lancedb/ (for LanceDB database)"
    echo "  • /mnt/efs/models/ (for ML models)"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Upload ML model to /mnt/efs/models/"
    echo "2. Initialize LanceDB at /mnt/efs/suplementia-lancedb/"
    echo "3. Deploy Lambda functions"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Failed to create EFS directories. Please review errors above.${NC}"
    exit 1
fi
