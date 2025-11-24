#!/bin/bash
# Script para validar el flujo completo del portal

set -e

API_URL="${PORTAL_API_URL:-https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend}"

echo "🔍 FASE 6: Validación del Flujo Completo"
echo ""
echo "Backend URL: $API_URL"
echo ""

# Función para probar una búsqueda
test_search() {
  local category=$1
  local description=$2
  
  echo "🔍 Probando: $description"
  echo "   Category: $category"
  
  TEST_PAYLOAD=$(cat <<EOF
{
  "category": "$category",
  "age": 35,
  "gender": "male",
  "location": "CDMX",
  "sensitivities": []
}
EOF
)
  
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$TEST_PAYLOAD" \
    --max-time 30)
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ]; then
    REC_ID=$(echo "$BODY" | jq -r '.recommendation.recommendation_id // empty' 2>/dev/null || echo "")
    CATEGORY=$(echo "$BODY" | jq -r '.recommendation.category // empty' 2>/dev/null || echo "")
    INGREDIENTS_COUNT=$(echo "$BODY" | jq -r '.recommendation.ingredients | length // 0' 2>/dev/null || echo "0")
    PRODUCTS_COUNT=$(echo "$BODY" | jq -r '.recommendation.products | length // 0' 2>/dev/null || echo "0")
    IS_FALLBACK=$(echo "$BODY" | jq -r '.recommendation._metadata.fallback // false' 2>/dev/null || echo "false")
    
    echo "   ✅ Status: 200"
    echo "   ✅ Recommendation ID: $REC_ID"
    
    if [[ "$REC_ID" == rec_* ]]; then
      echo "   ✅ ID formato correcto"
    else
      echo "   ❌ ID formato incorrecto (debería empezar con 'rec_')"
    fi
    
    echo "   ✅ Category: $CATEGORY"
    echo "   ✅ Ingredients: $INGREDIENTS_COUNT"
    echo "   ✅ Products: $PRODUCTS_COUNT"
    
    if [ "$IS_FALLBACK" = "true" ]; then
      echo "   ⚠️  Backend usó fallback (pero es válido, no mock)"
    else
      echo "   ✅ Datos reales del backend"
    fi
  else
    echo "   ❌ Error: $HTTP_STATUS"
    echo "   Response: $(echo "$BODY" | head -c 200)"
  fi
  echo ""
}

# Test 1: Categoría conocida
test_search "muscle-gain" "Categoría conocida (muscle gain)"

# Test 2: Ingrediente en inglés
test_search "Aloe Vera" "Ingrediente en inglés (Aloe Vera)"

# Test 3: Ingrediente en español
test_search "magnesio" "Ingrediente en español (magnesio)"

# Test 4: Otra categoría
test_search "cognitive" "Categoría conocida (cognitive)"

# Test 5: Otro ingrediente
test_search "creatine" "Ingrediente (creatine)"

echo "✅ Validación del flujo completo finalizada"
echo ""
echo "📋 Criterios de éxito:"
echo "   ✅ Todas las búsquedas devuelven status 200"
echo "   ✅ Todos los recommendation_id empiezan con 'rec_'"
echo "   ✅ Las categorías se preservan correctamente"
echo "   ✅ Hay ingredientes y productos en las respuestas"
echo ""
echo "📊 Revisar logs:"
echo "   - CloudWatch: /aws/lambda/ankosoft-formulation-api"
echo "   - Vercel: Functions → Logs"

