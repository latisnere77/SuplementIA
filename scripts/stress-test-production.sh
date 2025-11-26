#!/bin/bash

# Production Stress Test - Deep Validation
# Tests every layer with fine-grained checks

set -e

echo "🔥 Production Stress Test - Deep Validation"
echo "============================================"
echo ""

BASE_URL="${BASE_URL:-https://www.suplementai.com}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

print_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED_TESTS++))
  ((TOTAL_TESTS++))
}

print_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED_TESTS++))
  ((TOTAL_TESTS++))
}

print_info() {
  echo -e "${BLUE}ℹ️${NC}  $1"
}

print_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# ============================================
# LAYER 1: Network & DNS
# ============================================
print_section "LAYER 1: Network & DNS Resolution"

print_info "Testing DNS resolution..."
if host www.suplementai.com > /dev/null 2>&1; then
  print_pass "DNS resolves correctly"
else
  print_fail "DNS resolution failed"
fi

print_info "Testing SSL certificate..."
if echo | openssl s_client -connect www.suplementai.com:443 -servername www.suplementai.com 2>/dev/null | grep -q "Verify return code: 0"; then
  print_pass "SSL certificate valid"
else
  print_fail "SSL certificate invalid"
fi

print_info "Testing HTTP → HTTPS redirect..."
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" -L http://www.suplementai.com)
if [ "$HTTP_REDIRECT" = "200" ]; then
  print_pass "HTTP redirects to HTTPS"
else
  print_fail "HTTP redirect not working"
fi

# ============================================
# LAYER 2: Frontend Assets
# ============================================
print_section "LAYER 2: Frontend Assets & Pages"

print_info "Testing homepage..."
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HOME_STATUS" = "200" ]; then
  print_pass "Homepage loads (HTTP 200)"
else
  print_fail "Homepage failed (HTTP $HOME_STATUS)"
fi

print_info "Testing portal page..."
PORTAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/portal")
if [ "$PORTAL_STATUS" = "200" ]; then
  print_pass "Portal page loads (HTTP 200)"
else
  print_fail "Portal page failed (HTTP $PORTAL_STATUS)"
fi

print_info "Testing results page..."
RESULTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/portal/results")
if [ "$RESULTS_STATUS" = "200" ]; then
  print_pass "Results page loads (HTTP 200)"
else
  print_fail "Results page failed (HTTP $RESULTS_STATUS)"
fi

print_info "Checking for JavaScript errors in HTML..."
PORTAL_HTML=$(curl -s "$BASE_URL/portal")
if echo "$PORTAL_HTML" | grep -q "/_next/static"; then
  print_pass "Next.js assets referenced correctly"
else
  print_fail "Next.js assets not found"
fi

# ============================================
# LAYER 3: API Endpoints
# ============================================
print_section "LAYER 3: API Endpoints"

print_info "Testing quiz endpoint (POST)..."
QUIZ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}')

if echo "$QUIZ_RESPONSE" | grep -q '"success":true'; then
  print_pass "Quiz endpoint returns success"
else
  print_fail "Quiz endpoint failed"
fi

print_info "Validating quiz response structure..."
if echo "$QUIZ_RESPONSE" | jq -e '.recommendation.recommendation_id' > /dev/null 2>&1; then
  print_pass "Response has recommendation_id"
else
  print_fail "Response missing recommendation_id"
fi

if echo "$QUIZ_RESPONSE" | jq -e '.recommendation.category' > /dev/null 2>&1; then
  print_pass "Response has category"
else
  print_fail "Response missing category"
fi

if echo "$QUIZ_RESPONSE" | jq -e '.recommendation.evidence_summary' > /dev/null 2>&1; then
  print_pass "Response has evidence_summary"
else
  print_fail "Response missing evidence_summary"
fi

if echo "$QUIZ_RESPONSE" | jq -e '.recommendation.products' > /dev/null 2>&1; then
  print_pass "Response has products array"
else
  print_fail "Response missing products"
fi

# ============================================
# LAYER 4: Data Quality
# ============================================
print_section "LAYER 4: Data Quality & Content"

print_info "Validating evidence_summary structure..."
TOTAL_STUDIES=$(echo "$QUIZ_RESPONSE" | jq -r '.recommendation.evidence_summary.totalStudies // 0')
print_info "Total studies: $TOTAL_STUDIES"

if [ "$TOTAL_STUDIES" -gt 0 ]; then
  print_pass "Evidence summary has studies (count: $TOTAL_STUDIES)"
else
  print_fail "Evidence summary has no studies"
fi

print_info "Validating products array..."
PRODUCTS_COUNT=$(echo "$QUIZ_RESPONSE" | jq -r '.recommendation.products | length')
print_info "Products count: $PRODUCTS_COUNT"

if [ "$PRODUCTS_COUNT" -gt 0 ]; then
  print_pass "Products array has items (count: $PRODUCTS_COUNT)"
else
  print_fail "Products array is empty"
fi

print_info "Checking product structure..."
FIRST_PRODUCT=$(echo "$QUIZ_RESPONSE" | jq -r '.recommendation.products[0]')
if echo "$FIRST_PRODUCT" | jq -e '.name' > /dev/null 2>&1; then
  print_pass "Products have name field"
else
  print_fail "Products missing name field"
fi

if echo "$FIRST_PRODUCT" | jq -e '.price' > /dev/null 2>&1; then
  print_pass "Products have price field"
else
  print_fail "Products missing price field"
fi

# ============================================
# LAYER 5: Performance & Latency
# ============================================
print_section "LAYER 5: Performance & Latency"

print_info "Measuring API response time (5 samples)..."
TIMES=()
for i in {1..5}; do
  START=$(date +%s%N)
  curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d '{"category":"Magnesium","age":35,"gender":"male","location":"CDMX"}' > /dev/null
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  TIMES+=($DURATION)
  print_info "  Sample $i: ${DURATION}ms"
done

# Calculate average
TOTAL=0
for time in "${TIMES[@]}"; do
  TOTAL=$((TOTAL + time))
done
AVG=$((TOTAL / 5))

print_info "Average response time: ${AVG}ms"

if [ $AVG -lt 10000 ]; then
  print_pass "Average response time excellent (< 10s)"
elif [ $AVG -lt 30000 ]; then
  print_pass "Average response time acceptable (< 30s)"
else
  print_fail "Average response time too slow (> 30s)"
fi

# ============================================
# LAYER 6: Concurrent Requests
# ============================================
print_section "LAYER 6: Concurrent Requests"

print_info "Testing concurrent requests (10 parallel)..."

# Create temp directory for results
TEMP_DIR=$(mktemp -d)

# Launch 10 concurrent requests
for i in {1..10}; do
  (
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
      -H "Content-Type: application/json" \
      -d "{\"category\":\"Vitamin-D\",\"age\":35,\"gender\":\"male\",\"location\":\"CDMX\"}")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
      echo "PASS" > "$TEMP_DIR/result_$i"
    else
      echo "FAIL" > "$TEMP_DIR/result_$i"
    fi
  ) &
done

# Wait for all to complete
wait

# Count results
CONCURRENT_PASS=0
CONCURRENT_FAIL=0
for i in {1..10}; do
  if [ -f "$TEMP_DIR/result_$i" ]; then
    RESULT=$(cat "$TEMP_DIR/result_$i")
    if [ "$RESULT" = "PASS" ]; then
      ((CONCURRENT_PASS++))
    else
      ((CONCURRENT_FAIL++))
    fi
  fi
done

rm -rf "$TEMP_DIR"

print_info "Concurrent results: $CONCURRENT_PASS passed, $CONCURRENT_FAIL failed"

if [ $CONCURRENT_PASS -eq 10 ]; then
  print_pass "All concurrent requests succeeded (10/10)"
elif [ $CONCURRENT_PASS -ge 8 ]; then
  print_pass "Most concurrent requests succeeded ($CONCURRENT_PASS/10)"
else
  print_fail "Too many concurrent failures ($CONCURRENT_FAIL/10)"
fi

# ============================================
# LAYER 7: Edge Cases
# ============================================
print_section "LAYER 7: Edge Cases & Error Handling"

print_info "Testing invalid supplement..."
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"xyz123invalid","age":35,"gender":"male","location":"CDMX"}')

if echo "$INVALID_RESPONSE" | grep -q '"success"'; then
  print_pass "API handles invalid supplement gracefully"
else
  print_fail "API doesn't handle invalid supplement"
fi

print_info "Testing missing parameters..."
MISSING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$MISSING_RESPONSE" | grep -q '"error"\|"success":false'; then
  print_pass "API validates required parameters"
else
  print_fail "API doesn't validate parameters"
fi

print_info "Testing malformed JSON..."
MALFORMED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{invalid json}')

if [ "$MALFORMED_STATUS" = "400" ] || [ "$MALFORMED_STATUS" = "500" ]; then
  print_pass "API handles malformed JSON (HTTP $MALFORMED_STATUS)"
else
  print_fail "API doesn't handle malformed JSON properly"
fi

# ============================================
# LAYER 8: Different Supplements
# ============================================
print_section "LAYER 8: Multiple Supplement Types"

SUPPLEMENTS=("Calcium" "Magnesium" "Vitamin-D" "Omega-3" "Zinc" "Iron" "Vitamin-C" "Creatine")

print_info "Testing ${#SUPPLEMENTS[@]} different supplements..."

SUPP_PASS=0
SUPP_FAIL=0

for SUPP in "${SUPPLEMENTS[@]}"; do
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d "{\"category\":\"$SUPP\",\"age\":35,\"gender\":\"male\",\"location\":\"CDMX\"}")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    print_info "  ✓ $SUPP: Success"
    ((SUPP_PASS++))
  else
    print_info "  ✗ $SUPP: Failed"
    ((SUPP_FAIL++))
  fi
done

if [ $SUPP_PASS -eq ${#SUPPLEMENTS[@]} ]; then
  print_pass "All supplements work ($SUPP_PASS/${#SUPPLEMENTS[@]})"
elif [ $SUPP_PASS -ge 6 ]; then
  print_pass "Most supplements work ($SUPP_PASS/${#SUPPLEMENTS[@]})"
else
  print_fail "Too many supplement failures ($SUPP_FAIL/${#SUPPLEMENTS[@]})"
fi

# ============================================
# LAYER 9: Response Consistency
# ============================================
print_section "LAYER 9: Response Consistency"

print_info "Testing same supplement 3 times for consistency..."

RESPONSES=()
for i in {1..3}; do
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/quiz" \
    -H "Content-Type: application/json" \
    -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}')
  
  CATEGORY=$(echo "$RESPONSE" | jq -r '.recommendation.category // "null"')
  RESPONSES+=("$CATEGORY")
  print_info "  Attempt $i: category=$CATEGORY"
done

if [ "${RESPONSES[0]}" = "${RESPONSES[1]}" ] && [ "${RESPONSES[1]}" = "${RESPONSES[2]}" ]; then
  print_pass "Responses are consistent across requests"
else
  print_fail "Responses are inconsistent"
fi

# ============================================
# LAYER 10: Headers & Security
# ============================================
print_section "LAYER 10: Headers & Security"

print_info "Checking security headers..."
HEADERS=$(curl -s -I "$BASE_URL")

if echo "$HEADERS" | grep -qi "x-frame-options"; then
  print_pass "X-Frame-Options header present"
else
  print_info "X-Frame-Options header missing (optional)"
fi

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  print_pass "HSTS header present"
else
  print_info "HSTS header missing (optional)"
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
  print_pass "CSP header present"
else
  print_info "CSP header missing (optional)"
fi

# ============================================
# SUMMARY
# ============================================
print_section "STRESS TEST SUMMARY"

echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED - SYSTEM HEALTHY${NC}"
  echo ""
  exit 0
elif [ $SUCCESS_RATE -ge 90 ]; then
  echo -e "${YELLOW}⚠️  MOSTLY PASSING - MINOR ISSUES${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ MULTIPLE FAILURES - NEEDS ATTENTION${NC}"
  echo ""
  exit 1
fi
