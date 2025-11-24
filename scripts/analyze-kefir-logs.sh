#!/bin/bash
# Script para analizar logs de CloudWatch relacionados con Kefir

echo "============================================================"
echo "🔍 Análisis de Logs de CloudWatch para Kefir"
echo "============================================================"
echo ""

# Estudios encontrados
echo "📊 Estudios Encontrados (Studies-Fetcher):"
aws logs filter-log-events \
  --log-group-name "/aws/lambda/suplementia-studies-fetcher-dev" \
  --region us-east-1 \
  --filter-pattern "kefir" \
  --start-time $(($(date +%s) - 86400))000 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "studiesFound" | head -5
echo ""

# Content-enricher requests
echo "📊 Requests a Content-Enricher:"
aws logs filter-log-events \
  --log-group-name "/aws/lambda/suplementia-content-enricher-dev" \
  --region us-east-1 \
  --filter-pattern "Kefir" \
  --start-time $(($(date +%s) - 86400))000 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -E "(REQUEST|CACHE_HIT|CONTENT_ENRICH)" | head -10
echo ""

# Metadata en respuestas
echo "📊 Metadata en Respuestas:"
aws logs filter-log-events \
  --log-group-name "/aws/lambda/suplementia-content-enricher-dev" \
  --region us-east-1 \
  --filter-pattern "Kefir" \
  --start-time $(($(date +%s) - 86400))000 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -E "(hasRealData|studiesUsed)" | head -10
echo ""

echo "============================================================"
echo "✅ Análisis completado"
echo "============================================================"

