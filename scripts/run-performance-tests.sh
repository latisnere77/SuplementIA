#!/bin/bash

# Performance Test Suite Runner
# Runs all performance tests for System Completion Audit
# Requirements: 11.4

set -e

echo "======================================================================"
echo "PERFORMANCE TEST SUITE - System Completion Audit"
echo "======================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment
echo "Checking environment..."

if [ -z "$AWS_REGION" ]; then
    echo -e "${YELLOW}⚠️  AWS_REGION not set, using default: us-east-1${NC}"
    export AWS_REGION=us-east-1
fi

if [ -z "$NEXT_PUBLIC_SEARCH_API_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SEARCH_API_URL not set${NC}"
    echo "Please set it to your API Gateway URL"
    echo "Example: export NEXT_PUBLIC_SEARCH_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod"
fi

echo -e "${GREEN}✓ Environment check complete${NC}"
echo ""

# Track results
BACKEND_RESULT=0
FRONTEND_RESULT=0

# Run backend performance tests
echo "======================================================================"
echo "BACKEND PERFORMANCE TESTS"
echo "======================================================================"
echo ""

if [ -f "backend/lambda/test_performance.py" ]; then
    cd backend/lambda
    
    # Check if running in Lambda environment or local
    if [ -d "/mnt/efs" ]; then
        echo "Running in Lambda/EFS environment..."
        python3 test_performance.py
        BACKEND_RESULT=$?
    else
        echo -e "${YELLOW}⚠️  Not in Lambda/EFS environment${NC}"
        echo "Backend performance tests require:"
        echo "  - Access to /mnt/efs/suplementia-lancedb/"
        echo "  - Access to /mnt/efs/models/all-MiniLM-L6-v2/"
        echo "  - DynamoDB tables: supplement-cache, discovery-queue"
        echo ""
        echo "Skipping backend tests. Run these tests from Lambda or EC2 with EFS mounted."
        BACKEND_RESULT=2  # Skip code
    fi
    
    cd ../..
else
    echo -e "${RED}❌ Backend test file not found${NC}"
    BACKEND_RESULT=1
fi

echo ""

# Run frontend performance tests
echo "======================================================================"
echo "FRONTEND PERFORMANCE TESTS"
echo "======================================================================"
echo ""

if [ -f "scripts/test-performance-frontend.ts" ]; then
    if command -v tsx &> /dev/null; then
        tsx scripts/test-performance-frontend.ts
        FRONTEND_RESULT=$?
    elif command -v ts-node &> /dev/null; then
        ts-node scripts/test-performance-frontend.ts
        FRONTEND_RESULT=$?
    else
        echo -e "${RED}❌ tsx or ts-node not found${NC}"
        echo "Install with: npm install -g tsx"
        FRONTEND_RESULT=1
    fi
else
    echo -e "${RED}❌ Frontend test file not found${NC}"
    FRONTEND_RESULT=1
fi

echo ""

# Summary
echo "======================================================================"
echo "PERFORMANCE TEST SUITE SUMMARY"
echo "======================================================================"
echo ""

if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Backend performance tests: PASSED${NC}"
elif [ $BACKEND_RESULT -eq 2 ]; then
    echo -e "${YELLOW}⏭️  Backend performance tests: SKIPPED${NC}"
else
    echo -e "${RED}❌ Backend performance tests: FAILED${NC}"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend performance tests: PASSED${NC}"
else
    echo -e "${RED}❌ Frontend performance tests: FAILED${NC}"
fi

echo ""

# Exit with appropriate code
if [ $BACKEND_RESULT -eq 0 ] && [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All performance tests passed!${NC}"
    exit 0
elif [ $BACKEND_RESULT -eq 2 ] && [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Backend tests skipped, frontend tests passed${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some performance tests failed${NC}"
    exit 1
fi
