#!/bin/bash

# Test del Lambda con múltiples suplementos
# Para confirmar que funciona consistentemente

echo "🧪 Testing Lambda con múltiples suplementos"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Array de suplementos para probar
supplements=(
  "vitamin-d"
  "omega-3"
  "magnesium"
  "creatine"
)

success_count=0
error_count=0

for supplement in "${supplements[@]}"; do
  echo "📦 Testing: $supplement"
  echo "────────────────────────────────────────────────────────────────────────────"
  
  # Crear payload
  payload="{\"httpMethod\":\"POST\",\"body\":\"{\\\"supplementId\\\":\\\"$supplement\\\",\\\"studies\\\":[{\\\"pmid\\\":\\\"12345\\\",\\\"title\\\":\\\"Test study on $supplement\\\",\\\"abstract\\\":\\\"Test abstract about $supplement benefits.\\\",\\\"authors\\\":[\\\"Smith J\\\"],\\\"journal\\\":\\\"Test Journal\\\",\\\"year\\\":2023}]}\"}"
  
  # Invocar Lambda
  start_time=$(date +%s)
  
  aws lambda invoke \
    --function-name suplementia-content-enricher-dev \
    --cli-binary-format raw-in-base64-out \
    --payload "$payload" \
    /tmp/response-$supplement.json \
    --query 'StatusCode' \
    --output text > /dev/null 2>&1
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  
  # Verificar respuesta
  if [ -f "/tmp/response-$supplement.json" ]; then
    status=$(cat /tmp/response-$supplement.json | jq -r '.statusCode' 2>/dev/null)
    success=$(cat /tmp/response-$supplement.json | jq -r '.body' 2>/dev/null | jq -r '.success' 2>/dev/null)
    error_msg=$(cat /tmp/response-$supplement.json | jq -r '.body' 2>/dev/null | jq -r '.error' 2>/dev/null)
    
    if [ "$success" = "true" ]; then
      echo "   ✅ Success (${duration}s)"
      echo "   Status: $status"
      
      # Extraer algunos datos
      mechanisms=$(cat /tmp/response-$supplement.json | jq -r '.body' | jq -r '.data.mechanisms | length' 2>/dev/null)
      works_for=$(cat /tmp/response-$supplement.json | jq -r '.body' | jq -r '.data.worksFor | length' 2>/dev/null)
      
      echo "   Mechanisms: $mechanisms"
      echo "   WorksFor: $works_for"
      
      ((success_count++))
    else
      echo "   ❌ Failed (${duration}s)"
      echo "   Status: $status"
      echo "   Error: $error_msg"
      ((error_count++))
    fi
    
    rm -f /tmp/response-$supplement.json
  else
    echo "   ❌ No response file"
    ((error_count++))
  fi
  
  echo ""
done

echo "════════════════════════════════════════════════════════════════════════════"
echo "📊 RESULTADOS:"
echo "   ✅ Exitosos: $success_count"
echo "   ❌ Fallidos: $error_count"
echo "   📈 Tasa de éxito: $((success_count * 100 / (success_count + error_count)))%"
echo ""

if [ $error_count -eq 0 ]; then
  echo "🎉 Todos los tests pasaron!"
  exit 0
else
  echo "⚠️  Algunos tests fallaron"
  exit 1
fi
