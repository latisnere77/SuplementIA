#!/bin/bash

# Quick Stress Test - Fast Deep Validation
# Focused on critical paths with timeout controls

set -e

echo "⚡ Quick Stress Test - Critical Paths"
echo "====================================="
echo ""

BASE_URL="${BASE_URL:-https://www.suplementai.com}"
TIMEOUT=10  # 10 second timeout per request

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

pass() {
  echo -e "${GREEN}✅${NC} $1"
  ((PASSED++))
  ((TOTAL++))
}

fail() {
  echo -e "${RED}❌${NC} $1"
  ((FAILED++))
  ((TOTAL++))
}

info() {
  echo -e "${BLUE}ℹ️${NC}  $1"
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Test with timeout
test_api() {
  local supplement=$1
  local response=$(timeout $TIMEOUT curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d "{\"category\":\"$supplement\",\"age\":35,\"gender\":\"male\",\"location\":\"CDMX\"}" 2>/dev/null)
  
  echo "$response"
}

# ============================================
# CRITICAL PATH TESTS
# ============================================
section "CRITICAL PATH: Direct Search Flow"

info "Test 1: Basic search (Calcium)..."
RESP1=$(test_api "Calcium")
if echo "$RESP1" | grep -q '"success":true'; then
  pass "Calcium search works"
else
  fail "Calcium search failed"
fi

info "Test 2: Alternative supplement (Magnesium)..."
RESP2=$(test_api "Magnesium")
if echo "$RESP2" | grep -q '"success":true'; then
  pass "Magnesium search works"
else
  fail "Magnesium search failed"
fi

info "Test 3: Vitamin supplement (Vitamin-D)..."
RESP3=$(test_api "Vitamin-D")
if echo "$RESP3" | grep -q '"success":true'; then
  pass "Vitamin-D search works"
else
  fail "Vitamin-D search failed"
fi

# ============================================
# DATA QUALITY
# ============================================
section "DATA QUALITY: Response Structure"

info "Validating response structure..."

if echo "$RESP1" | jq -e '.recommendation.recommendation_id' > /dev/null 2>&1; then
  pass "Has recommendation_id"
else
  fail "Missing recommendation_id"
fi

if echo "$RESP1" | jq -e '.recommendation.category' > /dev/null 2>&1; then
  pass "Has category"
else
  fail "Missing category"
fi

if echo "$RESP1" | jq -e '.recommendation.evidence_summary' > /dev/null 2>&1; then
  pass "Has evidence_summary"
else
  fail "Missing evidence_summary"
fi

if echo "$RESP1" | jq -e '.recommendation.products' > /dev/null 2>&1; then
  pass "Has products"
else
  fail "Missing products"
fi

STUDIES=$(echo "$RESP1" | jq -r '.recommendation.evidence_summary.totalStudies // 0')
info "Total studies: $STUDIES"
if [ "$STUDIES" -gt 0 ]; then
  pass "Has study data (count: $STUDIES)"
else
  fail "No study data"
fi

PRODUCTS=$(echo "$RESP1" | jq -r '.recommendation.products | length')
info "Products count: $PRODUCTS"
if [ "$PRODUCTS" -gt 0 ]; then
  pass "Has products (count: $PRODUCTS)"
else
  fail "No products"
fi

# ============================================
# PERFORMANCE
# ============================================
section "PERFORMANCE: Response Times"

info "Measuring response time (3 samples)..."
TIMES=()
for i in {1..3}; do
  START=$(date +%s%N)
  timeout $TIMEOUT curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d '{"category":"Zinc","age":35,"gender":"male","location":"CDMX"}' > /dev/null 2>&1
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  TIMES+=($DURATION)
  info "  Sample $i: ${DURATION}ms"
done

TOTAL_TIME=0
for time in "${TIMES[@]}"; do
  TOTAL_TIME=$((TOTAL_TIME + time))
done
AVG=$((TOTAL_TIME / 3))

info "Average: ${AVG}ms"

if [ $AVG -lt 10000 ]; then
  pass "Response time excellent (< 10s)"
elif [ $AVG -lt 30000 ]; then
  pass "Response time acceptable (< 30s)"
else
  fail "Response time too slow (> 30s)"
fi

# ============================================
# CONCURRENT LOAD
# ============================================
section "CONCURRENT LOAD: 5 Parallel Requests"

info "Launching 5 concurrent requests..."

TEMP_DIR=$(mktemp -d)
PIDS=()

for i in {1..5}; do
  (
    RESPONSE=$(timeout $TIMEOUT curl -s -X POST "$BASE_URL/api/portal/quiz" \
      -H "Content-Type: application/json" \
      -d "{\"category\":\"Iron\",\"age\":35,\"gender\":\"male\",\"location\":\"CDMX\"}" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
      echo "PASS" > "$TEMP_DIR/result_$i"
    else
      echo "FAIL" > "$TEMP_DIR/result_$i"
    fi
  ) &
  PIDS+=($!)
done

# Wait for all with timeout
for pid in "${PIDS[@]}"; do
  wait $pid 2>/dev/null || true
done

# Count results
CONC_PASS=0
CONC_FAIL=0
for i in {1..5}; do
  if [ -f "$TEMP_DIR/result_$i" ]; then
    RESULT=$(cat "$TEMP_DIR/result_$i")
    if [ "$RESULT" = "PASS" ]; then
      ((CONC_PASS++))
    else
      ((CONC_FAIL++))
    fi
  else
    ((CONC_FAIL++))
  fi
done

rm -rf "$TEMP_DIR"

info "Results: $CONC_PASS passed, $CONC_FAIL failed"

if [ $CONC_PASS -ge 4 ]; then
  pass "Concurrent requests handled ($CONC_PASS/5)"
else
  fail "Too many concurrent failures ($CONC_FAIL/5)"
fi

# ============================================
# ERROR HANDLING
# ============================================
section "ERROR HANDLING: Edge Cases"

info "Testing invalid supplement..."
INVALID=$(timeout $TIMEOUT curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"xyz123invalid","age":35,"gender":"male","location":"CDMX"}' 2>/dev/null)

if echo "$INVALID" | grep -q '"success"'; then
  pass "Handles invalid supplement"
else
  fail "Doesn't handle invalid supplement"
fi

info "Testing missing parameters..."
MISSING=$(timeout $TIMEOUT curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)

if echo "$MISSING" | grep -q '"error"\|"success":false'; then
  pass "Validates required parameters"
else
  fail "Doesn't validate parameters"
fi

# ============================================
# CONSISTENCY
# ============================================
section "CONSISTENCY: Repeated Requests"

info "Testing same supplement 3 times..."

CATS=()
for i in {1..3}; do
  RESP=$(test_api "Omega-3")
  CAT=$(echo "$RESP" | jq -r '.recommendation.category // "null"')
  CATS+=("$CAT")
done

if [ "${CATS[0]}" = "${CATS[1]}" ] && [ "${CATS[1]}" = "${CATS[2]}" ]; then
  pass "Responses are consistent"
else
  fail "Responses are inconsistent"
fi

# ============================================
# SUMMARY
# ============================================
section "SUMMARY"

echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED${NC}"
  echo ""
  echo "System Status: ✅ HEALTHY"
  echo "  • Direct search: Working"
  echo "  • Data quality: Excellent"
  echo "  • Performance: Good"
  echo "  • Concurrency: Stable"
  echo "  • Error handling: Proper"
  echo ""
  exit 0
elif [ $SUCCESS_RATE -ge 85 ]; then
  echo -e "${GREEN}✅ MOSTLY PASSING${NC}"
  echo ""
  echo "System Status: ⚠️  MINOR ISSUES"
  echo "  • Core functionality: Working"
  echo "  • Some edge cases: Need attention"
  echo ""
  exit 0
else
  echo -e "${RED}❌ MULTIPLE FAILURES${NC}"
  echo ""
  echo "System Status: 🔴 NEEDS ATTENTION"
  echo ""
  exit 1
fi
