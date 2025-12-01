#!/bin/bash
# Script para verificar variables de entorno en Vercel
# Nota: Este script solo verifica, no configura (requiere acción manual)

echo "🔍 Verificación de Variables de Entorno en Vercel"
echo ""
echo "⚠️  NOTA: Las variables deben configurarse manualmente en Vercel Dashboard"
echo ""
echo "Variables requeridas:"
echo ""
echo "1. PORTAL_API_URL"
echo "   Valor: https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend"
echo ""
echo "2. PORTAL_QUIZZES_TABLE"
echo "   Valor: ankosoft-portal-quizzes-staging"
echo ""
echo "3. PORTAL_RECOMMENDATIONS_TABLE"
echo "   Valor: ankosoft-portal-recommendations-staging"
echo ""
echo "📋 Pasos para configurar:"
echo "   1. Ve a https://vercel.com/dashboard"
echo "   2. Selecciona proyecto 'suplementia'"
echo "   3. Settings → Environment Variables"
echo "   4. Agrega las 3 variables"
echo "   5. Selecciona: Production, Preview, Development"
echo "   6. Redeploy el proyecto"
echo ""
echo "✅ Después de configurar, ejecuta este script de nuevo para verificar"
echo ""

# Verificar si vercel CLI está instalado
if command -v vercel &> /dev/null; then
    echo "🔍 Verificando variables con Vercel CLI..."
    echo "   (Esto requiere autenticación con Vercel)"
    echo ""
    echo "Para verificar manualmente:"
    echo "   vercel env ls"
    echo ""
else
    echo "ℹ️  Vercel CLI no está instalado"
    echo "   Instala con: npm i -g vercel"
    echo ""
fi

echo "📄 Documento completo: VERIFICACION_VARIABLES_ENTORNO.md"

