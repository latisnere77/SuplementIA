#!/bin/bash

# Monitor Deploy Script
# Verifica que el deploy de Quick Wins fue exitoso

echo "🚀 Monitoring Quick Wins Deploy"
echo "================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL base (cambiar según tu deploy)
BASE_URL="${VERCEL_URL:-https://suplementia.vercel.app}"

echo "📍 Base URL: $BASE_URL"
echo ""

# Test 1: Cache Stats Endpoint
echo "🧪 Test 1: Cache Stats Endpoint"
echo "--------------------------------"
STATS_RESPONSE=$(curl -s "$BASE_URL/api/cache/stats")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Endpoint accessible${NC}"
  echo "$STATS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATS_RESPONSE"
else
  echo -e "${RED}❌ Endpoint not accessible${NC}"
fi
echo ""

# Test 2: Enrich Endpoint (First Request - Cache Miss)
echo "🧪 Test 2: Enrich Endpoint (Cache Miss)"
echo "----------------------------------------"
START_TIME=$(date +%s)
ENRICH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/portal/enrich" \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"ashwagandha"}')
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if echo "$ENRICH_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Request successful${NC}"
  echo "⏱️  Duration: ${DURATION}s"
  
  FROM_CACHE=$(echo "$ENRICH_RESPONSE" | jq -r '.metadata.fromCache // false')
  if [ "$FROM_CACHE" = "true" ]; then
    echo -e "${YELLOW}⚠️  Unexpected cache hit on first request${NC}"
  else
    echo -e "${GREEN}✅ Cache miss (expected)${NC}"
  fi
else
  echo -e "${RED}❌ Request failed${NC}"
  echo "$ENRICH_RESPONSE" | jq '.' 2>/dev/null || echo "$ENRICH_RESPONSE"
fi
echo ""

# Test 3: Enrich Endpoint (Second Request - Cache Hit)
echo "🧪 Test 3: Enrich Endpoint (Cache Hit)"
echo "---------------------------------------"
sleep 1
START_TIME=$(date +%s)
ENRICH_RESPONSE_2=$(curl -s -X POST "$BASE_URL/api/portal/enrich" \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"ashwagandha"}')
END_TIME=$(date +%s)
DURATION_2=$((END_TIME - START_TIME))

if echo "$ENRICH_RESPONSE_2" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Request successful${NC}"
  echo "⏱️  Duration: ${DURATION_2}s"
  
  FROM_CACHE=$(echo "$ENRICH_RESPONSE_2" | jq -r '.metadata.fromCache // false')
  if [ "$FROM_CACHE" = "true" ]; then
    echo -e "${GREEN}✅ Cache hit (expected)${NC}"
    
    # Calculate speedup
    if [ $DURATION -gt 0 ]; then
      SPEEDUP=$((DURATION / DURATION_2))
      echo "🚀 Speedup: ${SPEEDUP}x faster"
    fi
  else
    echo -e "${YELLOW}⚠️  Cache miss (unexpected)${NC}"
  fi
else
  echo -e "${RED}❌ Request failed${NC}"
  echo "$ENRICH_RESPONSE_2" | jq '.' 2>/dev/null || echo "$ENRICH_RESPONSE_2"
fi
echo ""

# Test 4: Rate Limiting
echo "🧪 Test 4: Rate Limiting"
echo "------------------------"
echo "Sending 11 rapid requests..."

BLOCKED=0
for i in {1..11}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/portal/enrich" \
    -H "Content-Type: application/json" \
    -d '{"supplementName":"test-rate-limit"}')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    BLOCKED=$((BLOCKED + 1))
  fi
done

if [ $BLOCKED -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting working${NC}"
  echo "🛡️  Blocked $BLOCKED requests"
else
  echo -e "${YELLOW}⚠️  No requests blocked (might need adjustment)${NC}"
fi
echo ""

# Test 5: Cache Stats After Tests
echo "🧪 Test 5: Cache Stats After Tests"
echo "-----------------------------------"
STATS_RESPONSE_2=$(curl -s "$BASE_URL/api/cache/stats")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Stats retrieved${NC}"
  echo "$STATS_RESPONSE_2" | jq '.' 2>/dev/null || echo "$STATS_RESPONSE_2"
  
  # Extract cache sizes
  ENRICHMENT_SIZE=$(echo "$STATS_RESPONSE_2" | jq -r '.caches.enrichment.size // 0')
  STUDIES_SIZE=$(echo "$STATS_RESPONSE_2" | jq -r '.caches.studies.size // 0')
  
  echo ""
  echo "📊 Cache Status:"
  echo "  - Enrichment cache: $ENRICHMENT_SIZE items"
  echo "  - Studies cache: $STUDIES_SIZE items"
  
  if [ "$ENRICHMENT_SIZE" -gt 0 ]; then
    echo -e "${GREEN}✅ Cache is working${NC}"
  else
    echo -e "${YELLOW}⚠️  Cache might not be persisting${NC}"
  fi
else
  echo -e "${RED}❌ Failed to retrieve stats${NC}"
fi
echo ""

# Summary
echo "================================"
echo "📊 Deploy Verification Summary"
echo "================================"
echo ""
echo "✅ Tests completed"
echo ""
echo "Next steps:"
echo "1. Monitor Vercel logs: vercel logs --follow"
echo "2. Check cache hit rate after 1 hour"
echo "3. Monitor latency in Vercel Analytics"
echo "4. Review /api/cache/stats regularly"
echo ""
echo "Documentation:"
echo "- Technical: QUICK-WINS-IMPLEMENTATION.md"
echo "- Summary: QUICK-WINS-SUMMARY.md"
echo "- Deploy: DEPLOY-QUICK-WINS.md"
echo ""
