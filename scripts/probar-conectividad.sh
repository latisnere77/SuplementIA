#!/bin/bash
# Script para probar conectividad entre frontend y backend

set -e

API_URL="${PORTAL_API_URL:-https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend}"

echo "🔍 FASE 4: Prueba de Conectividad"
echo ""
echo "Backend URL: $API_URL"
echo ""

# Test 1: Búsqueda de ingrediente
echo "1️⃣  Probando búsqueda de ingrediente: 'Aloe Vera'"
TEST_PAYLOAD='{
  "category": "Aloe Vera",
  "age": 35,
  "gender": "male",
  "location": "CDMX",
  "sensitivities": []
}'

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$TEST_PAYLOAD" \
  --max-time 30)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "   Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "   ✅ Backend responde correctamente"
  
  # Verificar estructura de respuesta
  REC_ID=$(echo "$BODY" | jq -r '.recommendation.recommendation_id // empty' 2>/dev/null || echo "")
  CATEGORY=$(echo "$BODY" | jq -r '.recommendation.category // empty' 2>/dev/null || echo "")
  
  if [ -n "$REC_ID" ]; then
    echo "   ✅ Recommendation ID: $REC_ID"
    if [[ "$REC_ID" == rec_* ]]; then
      echo "   ✅ ID formato correcto (empieza con 'rec_')"
    else
      echo "   ⚠️  ID formato inesperado (debería empezar con 'rec_')"
    fi
  else
    echo "   ❌ No se encontró recommendation_id en la respuesta"
  fi
  
  if [ -n "$CATEGORY" ]; then
    echo "   ✅ Category: $CATEGORY"
    if [ "$CATEGORY" = "Aloe Vera" ] || [ "$CATEGORY" = "aloe vera" ]; then
      echo "   ✅ Categoría preservada correctamente"
    else
      echo "   ⚠️  Categoría no coincide con la búsqueda"
    fi
  fi
else
  echo "   ❌ Backend respondió con error: $HTTP_STATUS"
  echo "   Response: $BODY"
fi
echo ""

# Test 2: Búsqueda de categoría
echo "2️⃣  Probando búsqueda de categoría: 'muscle-gain'"
TEST_PAYLOAD2='{
  "category": "muscle-gain",
  "age": 30,
  "gender": "male",
  "location": "CDMX",
  "sensitivities": []
}'

RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$TEST_PAYLOAD2" \
  --max-time 30)

HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS/d')

echo "   Status: $HTTP_STATUS2"
if [ "$HTTP_STATUS2" = "200" ]; then
  echo "   ✅ Backend responde correctamente"
  
  REC_ID2=$(echo "$BODY2" | jq -r '.recommendation.recommendation_id // empty' 2>/dev/null || echo "")
  if [ -n "$REC_ID2" ]; then
    echo "   ✅ Recommendation ID: $REC_ID2"
  fi
else
  echo "   ❌ Backend respondió con error: $HTTP_STATUS2"
fi
echo ""

echo "✅ Pruebas de conectividad completadas"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Revisar logs de CloudWatch del Lambda"
echo "   2. Revisar logs de Vercel Functions"
echo "   3. Probar búsquedas desde el portal web"

