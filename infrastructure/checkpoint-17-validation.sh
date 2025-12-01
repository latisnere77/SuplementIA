#!/bin/bash

# Task 17: Checkpoint - Staging Validation Complete
# This script runs all tests to verify the staging environment is ready for production deployment

set -e

ENVIRONMENT="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         Task 17: Staging Validation Checkpoint                ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${CYAN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${CYAN}Region:${NC} ${REGION}"
echo ""

# Test results tracking
TOTAL_TEST_SUITES=0
PASSED_TEST_SUITES=0
FAILED_TEST_SUITES=0
SKIPPED_TEST_SUITES=0

# Helper function to run a test suite
run_test_suite() {
    local SUITE_NAME=$1
    local TEST_COMMAND=$2
    local REQUIRED=$3  # "required" or "optional"
    
    TOTAL_TEST_SUITES=$((TOTAL_TEST_SUITES + 1))
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}▶${NC} Running: ${SUITE_NAME}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if eval "$TEST_COMMAND"; then
        echo ""
        echo -e "${GREEN}✅ PASSED${NC}: ${SUITE_NAME}"
        PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
        return 0
    else
        echo ""
        if [ "$REQUIRED" = "required" ]; then
            echo -e "${RED}❌ FAILED${NC}: ${SUITE_NAME} (REQUIRED)"
            FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
            return 1
        else
            echo -e "${YELLOW}⚠️  FAILED${NC}: ${SUITE_NAME} (OPTIONAL)"
            SKIPPED_TEST_SUITES=$((SKIPPED_TEST_SUITES + 1))
            return 0
        fi
    fi
}

# Export environment variables for tests
export ENVIRONMENT=${ENVIRONMENT}
export AWS_REGION=${REGION}

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 1: Infrastructure Smoke Tests                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Infrastructure Smoke Tests" \
    "./infrastructure/run-smoke-tests.sh ${ENVIRONMENT}" \
    "required"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 2: Property-Based Tests                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Embedding Properties (Property 3)" \
    "python3 -m pytest backend/lambda/test_embedding_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "LanceDB Properties (Properties 1, 2)" \
    "python3 -m pytest backend/lambda/test_lancedb_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Cache Properties (Properties 13, 14, 15, 16)" \
    "python3 -m pytest backend/lambda/test_cache_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Discovery Queue Properties (Properties 8, 9)" \
    "python3 -m pytest backend/lambda/test_discovery_queue_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Discovery Worker Properties (Properties 10, 11, 12)" \
    "python3 -m pytest backend/lambda/test_discovery_worker_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Migration Properties (Properties 19, 20)" \
    "python3 -m pytest backend/lambda/test_migration_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "API Gateway Properties (Properties 6, 7, 22)" \
    "python3 -m pytest backend/lambda/test_api_gateway_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Structured Logging Properties (Property 17)" \
    "python3 -m pytest backend/lambda/test_structured_logging_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Error Logging Properties (Property 18)" \
    "python3 -m pytest backend/lambda/test_error_logging_properties.py -v --tb=short" \
    "required"

run_test_suite \
    "Secrets Management (Property 21)" \
    "python3 -m pytest backend/lambda/test_secrets_management.py -v --tb=short" \
    "required"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 3: Integration Tests                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Integration Test Suite" \
    "python3 -m pytest backend/lambda/test_integration_suite.py -v --tb=short" \
    "required"

run_test_suite \
    "Model Integration Tests" \
    "python3 -m pytest backend/lambda/test_model_integration.py -v --tb=short" \
    "optional"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 4: Performance Tests                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Performance Tests" \
    "python3 -m pytest backend/lambda/test_performance.py -v --tb=short" \
    "optional"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 5: Security Audit                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Security Audit Tests" \
    "python3 -m pytest backend/lambda/test_security_audit.py -v --tb=short" \
    "optional"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 6: Frontend Integration Tests                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

run_test_suite \
    "Frontend Error Message Tests" \
    "npm test -- scripts/test-error-message-property.ts --run" \
    "optional"

run_test_suite \
    "Frontend Search Integration Tests" \
    "npm test -- scripts/test-search-integration.ts --run" \
    "optional"

# Summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║                    VALIDATION SUMMARY                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${CYAN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${CYAN}Region:${NC} ${REGION}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Suite Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  Total Test Suites:    ${TOTAL_TEST_SUITES}"
echo -e "  ${GREEN}Passed:${NC}               ${PASSED_TEST_SUITES}"
echo -e "  ${RED}Failed (Required):${NC}    ${FAILED_TEST_SUITES}"
echo -e "  ${YELLOW}Skipped (Optional):${NC}   ${SKIPPED_TEST_SUITES}"
echo ""

# Calculate pass rate
if [ $TOTAL_TEST_SUITES -gt 0 ]; then
    PASS_RATE=$(( (PASSED_TEST_SUITES * 100) / TOTAL_TEST_SUITES ))
    echo -e "  Pass Rate:            ${PASS_RATE}%"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final verdict
if [ $FAILED_TEST_SUITES -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo -e "║  ${GREEN}✅ STAGING VALIDATION COMPLETE${NC}                            ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}🎉 All required tests passed!${NC}"
    echo ""
    echo "The staging environment is validated and ready for production deployment."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Next Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1. Review CloudWatch metrics and logs"
    echo "  2. Verify cost estimates in AWS Cost Explorer"
    echo "  3. Prepare production deployment plan"
    echo "  4. Schedule production deployment window"
    echo ""
    echo "  To deploy to production (10% traffic):"
    echo -e "    ${CYAN}cd infrastructure${NC}"
    echo -e "    ${CYAN}./deploy-production-10-percent.sh${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 0
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo -e "║  ${RED}❌ STAGING VALIDATION FAILED${NC}                              ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${RED}Some required tests failed.${NC}"
    echo ""
    echo "Please review the failed tests above and fix any issues before"
    echo "proceeding to production deployment."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Common Issues:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  • Lambda functions not deployed"
    echo "    → Run: cd backend/lambda && ./deploy-staging-lambdas.sh"
    echo ""
    echo "  • DynamoDB tables missing"
    echo "    → Run: cd infrastructure && ./deploy-staging.sh"
    echo ""
    echo "  • EFS not mounted"
    echo "    → Verify Lambda VPC configuration"
    echo ""
    echo "  • Model not loaded"
    echo "    → Run: python3 backend/lambda/download-model-to-efs.py"
    echo ""
    echo "  • LanceDB not initialized"
    echo "    → Run: python3 backend/lambda/initialize-lancedb.py"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 1
fi
