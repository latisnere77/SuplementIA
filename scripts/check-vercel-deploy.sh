#!/bin/bash

# Script para verificar el estado del deploy en Vercel
# Uso: ./scripts/check-vercel-deploy.sh

echo "🚀 Verificando deploy en Vercel..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar último commit
LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s")
echo "📝 Último commit: $LAST_COMMIT"
echo ""

# URL de producción
PROD_URL="https://suplementia.vercel.app"

echo "🌐 Verificando producción: $PROD_URL"
echo ""

# Verificar que el sitio responde
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Sitio accesible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Sitio no accesible (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# Verificar endpoint de health (si existe)
HEALTH_URL="$PROD_URL/api/health"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HEALTH_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check OK (HTTP $HEALTH_CODE)${NC}"
elif [ "$HEALTH_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠️  Health endpoint no existe (HTTP $HEALTH_CODE)${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CODE)${NC}"
fi

echo ""
echo "📊 Verificando features implementadas..."
echo ""

# Verificar que los componentes existen
if [ -f "components/portal/StreamingResults.tsx" ]; then
    echo -e "${GREEN}✅ StreamingResults.tsx existe${NC}"
else
    echo -e "${RED}❌ StreamingResults.tsx NO existe${NC}"
fi

if [ -f "components/portal/ViewToggle.tsx" ]; then
    echo -e "${GREEN}✅ ViewToggle.tsx existe${NC}"
else
    echo -e "${RED}❌ ViewToggle.tsx NO existe${NC}"
fi

if [ -f "components/portal/ErrorState.tsx" ]; then
    echo -e "${GREEN}✅ ErrorState.tsx existe${NC}"
else
    echo -e "${RED}❌ ErrorState.tsx NO existe${NC}"
fi

if [ -f "lib/hooks/useOnlineStatus.ts" ]; then
    echo -e "${GREEN}✅ useOnlineStatus.ts existe${NC}"
else
    echo -e "${RED}❌ useOnlineStatus.ts NO existe${NC}"
fi

echo ""
echo "🎯 Próximos pasos:"
echo "1. Abrir $PROD_URL en el navegador"
echo "2. Buscar 'vitamin-d' para probar streaming"
echo "3. Verificar toggle entre vistas (standard ↔ examine)"
echo "4. Probar error con suplemento inexistente"
echo "5. Simular offline (DevTools → Network → Offline)"
echo ""
echo "📱 Para monitoreo continuo:"
echo "   vercel logs --follow"
echo ""
echo "✅ Verificación completada!"
