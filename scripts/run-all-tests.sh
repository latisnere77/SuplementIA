#!/bin/bash

# Run All Tests for Intelligent Supplement Search
# This script runs all unit tests and property-based tests

set -e

echo "🧪 Running All Tests for Intelligent Supplement Search"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run a test suite
run_test_suite() {
    local SUITE_NAME=$1
    local TEST_COMMAND=$2
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    echo "📦 Running: ${SUITE_NAME}"
    echo "----------------------------------------"
    
    if eval "$TEST_COMMAND"; then
        echo -e "${GREEN}✅ PASS${NC} - ${SUITE_NAME}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        echo ""
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - ${SUITE_NAME}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        echo ""
        return 1
    fi
}

# Check if Jest is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
    exit 1
fi

# Run TypeScript type checking
echo "🔍 Step 1: Type Checking"
echo "========================================================"
run_test_suite "TypeScript Type Check" "npm run type-check"

# Run linting
echo "🔍 Step 2: Linting"
echo "========================================================"
run_test_suite "ESLint" "npm run lint"

# Run Jest tests
echo "🔍 Step 3: Unit Tests"
echo "========================================================"
run_test_suite "Jest Unit Tests" "npm test -- --passWithNoTests --coverage"

# Check if property-based tests exist
if [ -d "__tests__/properties" ] || [ -d "lib/__tests__/properties" ]; then
    echo "🔍 Step 4: Property-Based Tests"
    echo "========================================================"
    run_test_suite "Property-Based Tests" "npm test -- --testPathPattern=properties --passWithNoTests"
else
    echo "⚠️  No property-based tests found (this is expected if not yet implemented)"
    echo ""
fi

# Summary
echo "========================================================"
echo "📊 Test Summary"
echo "========================================================"
echo ""
echo "Total Test Suites: ${TOTAL_SUITES}"
echo -e "Passed: ${GREEN}${PASSED_SUITES}${NC}"
echo -e "Failed: ${RED}${FAILED_SUITES}${NC}"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
