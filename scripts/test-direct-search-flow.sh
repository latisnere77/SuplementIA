#!/bin/bash

# Direct Search Flow Test - The Critical Path
# Tests the exact flow that was failing with 404s

set -e

echo "🎯 Direct Search Flow Test"
echo "==========================="
echo ""

BASE_URL="${BASE_URL:-https://www.suplementai.com}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
}

print_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  exit 1
}

print_info() {
  echo -e "${YELLOW}ℹ️${NC}  $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST: Direct Search for 'Calcium'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# The critical test: Can we search for a supplement and get results?
print_info "Calling quiz endpoint with 'Calcium'..."

RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}')

print_info "Response received (${#RESPONSE} bytes)"

# Test 1: Success flag
if echo "$RESPONSE" | grep -q '"success":true'; then
  print_pass "API returns success=true"
else
  print_fail "API did not return success=true"
fi

# Test 2: Has recommendation
if echo "$RESPONSE" | grep -q '"recommendation"'; then
  print_pass "Response contains recommendation"
else
  print_fail "Response missing recommendation"
fi

# Test 3: Has recommendation_id
if echo "$RESPONSE" | grep -q '"recommendation_id"'; then
  print_pass "Recommendation has ID"
else
  print_fail "Recommendation missing ID"
fi

# Test 4: Has category
if echo "$RESPONSE" | grep -q '"category"'; then
  print_pass "Recommendation has category"
else
  print_fail "Recommendation missing category"
fi

# Test 5: Has evidence_summary
if echo "$RESPONSE" | grep -q '"evidence_summary"'; then
  print_pass "Recommendation has evidence_summary"
else
  print_info "Recommendation missing evidence_summary (may be expected)"
fi

# Test 6: Has products
if echo "$RESPONSE" | grep -q '"products"'; then
  print_pass "Recommendation has products"
else
  print_info "Recommendation missing products (may be expected)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST: Response Time"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Measuring response time..."

START=$(date +%s%N)
curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"Magnesium","age":35,"gender":"male","location":"CDMX"}' > /dev/null
END=$(date +%s%N)

DURATION=$(( (END - START) / 1000000 ))

print_info "Response time: ${DURATION}ms"

if [ $DURATION -lt 30000 ]; then
  print_pass "Response time acceptable (< 30s)"
else
  print_fail "Response time too slow (${DURATION}ms > 30s)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST: Multiple Searches (No 404s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUPPLEMENTS=("Calcium" "Magnesium" "Vitamin-D" "Omega-3")

for SUPP in "${SUPPLEMENTS[@]}"; do
  print_info "Testing $SUPP..."
  
  RESP=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d "{\"category\":\"$SUPP\",\"age\":35,\"gender\":\"male\",\"location\":\"CDMX\"}")
  
  if echo "$RESP" | grep -q '"success":true'; then
    print_pass "$SUPP search successful"
  else
    print_fail "$SUPP search failed"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
echo ""
echo "Verified:"
echo "  ✅ Direct search works"
echo "  ✅ No 404 errors"
echo "  ✅ Recommendations returned"
echo "  ✅ Response times acceptable"
echo "  ✅ Multiple searches work"
echo ""
echo "🎉 Direct search flow is working at 100%"
echo ""
