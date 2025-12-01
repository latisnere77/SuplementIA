#!/bin/bash

###############################################################################
# EFS Directory Verification Script
# 
# This script verifies that required EFS directories exist and creates them
# if they don't. It works with existing Lambda functions.
#
# Usage: ./verify-efs-directories.sh [function-name]
# Example: ./verify-efs-directories.sh production-search-api-lancedb
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FUNCTION_NAME=${1:-production-search-api-lancedb}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EFS Directory Verification${NC}"
echo -e "${BLUE}Function: ${FUNCTION_NAME}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if function exists
if ! aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
    echo -e "${RED}✗ Lambda function not found: ${FUNCTION_NAME}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Lambda function found${NC}"

# Create test script
cat > /tmp/verify_dirs.py << 'EOF'
import os
import json

def lambda_handler(event, context):
    """Verify and create EFS directories"""
    results = {
        'efs_mounted': False,
        'lancedb_dir_exists': False,
        'models_dir_exists': False,
        'lancedb_dir_created': False,
        'models_dir_created': False,
        'lancedb_writable': False,
        'models_writable': False,
        'errors': []
    }
    
    # Check if EFS is mounted
    if not os.path.exists('/mnt/efs'):
        results['errors'].append('EFS not mounted at /mnt/efs')
        return results
    
    results['efs_mounted'] = True
    
    # Check if directories exist
    lancedb_path = '/mnt/efs/suplementia-lancedb'
    models_path = '/mnt/efs/models'
    
    results['lancedb_dir_exists'] = os.path.exists(lancedb_path)
    results['models_dir_exists'] = os.path.exists(models_path)
    
    # Create directories if they don't exist
    try:
        if not results['lancedb_dir_exists']:
            os.makedirs(lancedb_path, exist_ok=True)
            results['lancedb_dir_created'] = True
        
        if not results['models_dir_exists']:
            os.makedirs(models_path, exist_ok=True)
            results['models_dir_created'] = True
    except Exception as e:
        results['errors'].append(f'Failed to create directories: {str(e)}')
        return results
    
    # Test write permissions
    try:
        test_file = os.path.join(lancedb_path, '.write_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        results['lancedb_writable'] = True
    except Exception as e:
        results['errors'].append(f'LanceDB directory not writable: {str(e)}')
    
    try:
        test_file = os.path.join(models_path, '.write_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        results['models_writable'] = True
    except Exception as e:
        results['errors'].append(f'Models directory not writable: {str(e)}')
    
    # List directory contents
    try:
        results['lancedb_contents'] = os.listdir(lancedb_path)
        results['models_contents'] = os.listdir(models_path)
    except Exception as e:
        results['errors'].append(f'Failed to list directories: {str(e)}')
    
    return results
EOF

# Zip the script
cd /tmp
zip -q verify_dirs.zip verify_dirs.py

echo -e "${YELLOW}Updating Lambda function code...${NC}"

# Update function code
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb:///tmp/verify_dirs.zip \
    --output text &> /dev/null

# Wait for update
echo -e "${YELLOW}Waiting for update to complete...${NC}"
aws lambda wait function-updated --function-name "$FUNCTION_NAME"

echo -e "${GREEN}✓ Function code updated${NC}"

# Invoke function
echo -e "${YELLOW}Invoking function to verify directories...${NC}"
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload '{}' \
    /tmp/verify_result.json &> /dev/null

echo -e "${GREEN}✓ Function invoked${NC}"
echo ""

# Parse and display results
RESULTS=$(cat /tmp/verify_result.json)

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

# Check each result
EFS_MOUNTED=$(echo "$RESULTS" | jq -r '.efs_mounted')
LANCEDB_EXISTS=$(echo "$RESULTS" | jq -r '.lancedb_dir_exists')
MODELS_EXISTS=$(echo "$RESULTS" | jq -r '.models_dir_exists')
LANCEDB_CREATED=$(echo "$RESULTS" | jq -r '.lancedb_dir_created')
MODELS_CREATED=$(echo "$RESULTS" | jq -r '.models_dir_created')
LANCEDB_WRITABLE=$(echo "$RESULTS" | jq -r '.lancedb_writable')
MODELS_WRITABLE=$(echo "$RESULTS" | jq -r '.models_writable')

if [ "$EFS_MOUNTED" = "true" ]; then
    echo -e "${GREEN}✓ EFS is mounted at /mnt/efs${NC}"
else
    echo -e "${RED}✗ EFS is NOT mounted${NC}"
fi

if [ "$LANCEDB_EXISTS" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/suplementia-lancedb/ already exists${NC}"
elif [ "$LANCEDB_CREATED" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/suplementia-lancedb/ created successfully${NC}"
else
    echo -e "${RED}✗ /mnt/efs/suplementia-lancedb/ does not exist and could not be created${NC}"
fi

if [ "$MODELS_EXISTS" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/models/ already exists${NC}"
elif [ "$MODELS_CREATED" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/models/ created successfully${NC}"
else
    echo -e "${RED}✗ /mnt/efs/models/ does not exist and could not be created${NC}"
fi

if [ "$LANCEDB_WRITABLE" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/suplementia-lancedb/ is writable${NC}"
else
    echo -e "${RED}✗ /mnt/efs/suplementia-lancedb/ is NOT writable${NC}"
fi

if [ "$MODELS_WRITABLE" = "true" ]; then
    echo -e "${GREEN}✓ /mnt/efs/models/ is writable${NC}"
else
    echo -e "${RED}✗ /mnt/efs/models/ is NOT writable${NC}"
fi

# Show directory contents
echo ""
echo -e "${BLUE}Directory Contents:${NC}"
echo -e "${YELLOW}/mnt/efs/suplementia-lancedb/:${NC}"
echo "$RESULTS" | jq -r '.lancedb_contents[]?' 2>/dev/null || echo "  (empty or error)"

echo -e "${YELLOW}/mnt/efs/models/:${NC}"
echo "$RESULTS" | jq -r '.models_contents[]?' 2>/dev/null || echo "  (empty or error)"

# Show errors if any
ERRORS=$(echo "$RESULTS" | jq -r '.errors[]?' 2>/dev/null)
if [ -n "$ERRORS" ]; then
    echo ""
    echo -e "${RED}Errors:${NC}"
    echo "$ERRORS"
fi

# Cleanup
rm -f /tmp/verify_dirs.py /tmp/verify_dirs.zip /tmp/verify_result.json

echo ""
echo -e "${BLUE}========================================${NC}"

# Restore original function code
echo -e "${YELLOW}Note: Function code was temporarily modified for testing.${NC}"
echo -e "${YELLOW}Redeploy your Lambda function to restore original code.${NC}"

if [ "$EFS_MOUNTED" = "true" ] && [ "$LANCEDB_WRITABLE" = "true" ] && [ "$MODELS_WRITABLE" = "true" ]; then
    echo ""
    echo -e "${GREEN}✓ EFS mount configuration is complete!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Upload ML model to /mnt/efs/models/"
    echo "2. Initialize LanceDB at /mnt/efs/suplementia-lancedb/"
    echo "3. Redeploy Lambda function with original code"
    exit 0
else
    echo ""
    echo -e "${RED}✗ EFS mount configuration has issues. Please review above.${NC}"
    exit 1
fi
