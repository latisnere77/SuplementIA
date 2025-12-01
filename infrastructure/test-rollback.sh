#!/bin/bash

# Test Rollback Capability
# This script tests the rollback functionality without actually deploying

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_SCRIPT="${SCRIPT_DIR}/rollback-traffic.sh"

echo "🧪 Testing Rollback Capability"
echo "================================"
echo ""

# Test 1: Script exists and is executable
echo "Test 1: Checking if rollback script exists..."
if [ ! -f "${ROLLBACK_SCRIPT}" ]; then
    echo "❌ FAIL: Rollback script not found at ${ROLLBACK_SCRIPT}"
    exit 1
fi
echo "✅ PASS: Rollback script exists"
echo ""

# Test 2: Script is executable
echo "Test 2: Checking if rollback script is executable..."
if [ ! -x "${ROLLBACK_SCRIPT}" ]; then
    echo "❌ FAIL: Rollback script is not executable"
    exit 1
fi
echo "✅ PASS: Rollback script is executable"
echo ""

# Test 3: Script validates input (invalid percentage)
echo "Test 3: Testing input validation (invalid percentage)..."
OUTPUT=$(bash "${ROLLBACK_SCRIPT}" 150 2>&1 || true)
if echo "${OUTPUT}" | grep -q "Invalid traffic percentage"; then
    echo "✅ PASS: Script correctly rejects invalid percentage (150)"
else
    echo "❌ FAIL: Script did not reject invalid percentage"
    echo "Output: ${OUTPUT}"
    exit 1
fi
echo ""

# Test 4: Script validates input (negative percentage)
echo "Test 4: Testing input validation (negative percentage)..."
OUTPUT=$(bash "${ROLLBACK_SCRIPT}" -10 2>&1 || true)
if echo "${OUTPUT}" | grep -q "Invalid traffic percentage"; then
    echo "✅ PASS: Script correctly rejects negative percentage"
else
    echo "❌ FAIL: Script did not reject negative percentage"
    echo "Output: ${OUTPUT}"
    exit 1
fi
echo ""

# Test 5: Script validates input (non-numeric)
echo "Test 5: Testing input validation (non-numeric)..."
OUTPUT=$(bash "${ROLLBACK_SCRIPT}" abc 2>&1 || true)
if echo "${OUTPUT}" | grep -q "Invalid traffic percentage"; then
    echo "✅ PASS: Script correctly rejects non-numeric input"
else
    echo "❌ FAIL: Script did not reject non-numeric input"
    echo "Output: ${OUTPUT}"
    exit 1
fi
echo ""

# Test 6: Check AWS CLI availability
echo "Test 6: Checking AWS CLI availability..."
if ! command -v aws &> /dev/null; then
    echo "⚠️  WARNING: AWS CLI not installed (expected for local testing)"
else
    echo "✅ PASS: AWS CLI is available"
fi
echo ""

# Test 7: Verify script structure
echo "Test 7: Verifying script structure..."
REQUIRED_COMMANDS=(
    "aws cloudformation describe-stacks"
    "aws cloudformation update-stack"
    "aws cloudformation wait stack-update-complete"
)

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if grep -q "${cmd}" "${ROLLBACK_SCRIPT}"; then
        echo "✅ Found: ${cmd}"
    else
        echo "❌ FAIL: Missing required command: ${cmd}"
        exit 1
    fi
done
echo ""

# Test 8: Verify error handling
echo "Test 8: Verifying error handling..."
if grep -q "set -e" "${ROLLBACK_SCRIPT}"; then
    echo "✅ PASS: Script has error handling (set -e)"
else
    echo "❌ FAIL: Script missing error handling"
    exit 1
fi
echo ""

# Test 9: Verify confirmation prompt
echo "Test 9: Verifying confirmation prompt..."
if grep -q "Do you want to continue" "${ROLLBACK_SCRIPT}"; then
    echo "✅ PASS: Script has confirmation prompt"
else
    echo "❌ FAIL: Script missing confirmation prompt"
    exit 1
fi
echo ""

# Test 10: Verify monitoring guidance
echo "Test 10: Verifying monitoring guidance..."
if grep -q "monitor-rollout.sh" "${ROLLBACK_SCRIPT}"; then
    echo "✅ PASS: Script provides monitoring guidance"
else
    echo "❌ FAIL: Script missing monitoring guidance"
    exit 1
fi
echo ""

echo "================================"
echo "🎉 All Rollback Tests Passed!"
echo "================================"
echo ""
echo "✅ Rollback capability is properly implemented"
echo ""
echo "📝 Rollback Procedures:"
echo "   1. Identify target traffic percentage (0-100)"
echo "   2. Run: ./infrastructure/rollback-traffic.sh <percentage>"
echo "   3. Confirm the rollback when prompted"
echo "   4. Monitor the system after rollback"
echo ""
echo "🔄 Common Rollback Scenarios:"
echo "   - Full rollback to legacy: ./rollback-traffic.sh 0"
echo "   - Rollback to 50%: ./rollback-traffic.sh 50"
echo "   - Rollback to 10%: ./rollback-traffic.sh 10"
echo ""
echo "⚠️  Note: Actual rollback requires:"
echo "   - AWS credentials configured"
echo "   - CloudFront stack deployed"
echo "   - Appropriate IAM permissions"
echo ""
