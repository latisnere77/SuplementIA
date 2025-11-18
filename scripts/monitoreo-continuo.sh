#!/bin/bash
# Monitoreo continuo del portal
# Uso: ./scripts/monitoreo-continuo.sh [recommendation_id]

REC_ID="${1:-rec_1763421948586_57gemvkf9}"

echo "🔄 Monitoreo continuo - Presiona Ctrl+C para salir"
echo "   Recommendation ID: $REC_ID"
echo ""

while true; do
  clear
  echo "📊 $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=================================="
  bash scripts/monitorear-portal.sh "$REC_ID"
  echo ""
  echo "⏳ Actualizando en 10 segundos..."
  sleep 10
done
