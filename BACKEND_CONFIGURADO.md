# ✅ Backend Configurado para SuplementIA

## 🎯 Endpoint Configurado

**URL del API Gateway:**
```
https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

## ✅ Estado

- ✅ Recurso `/portal` creado en API Gateway
- ✅ Recurso `/portal/recommend` creado
- ✅ Método POST configurado
- ✅ Integración con Lambda configurada
- ✅ Permisos de Lambda configurados
- ✅ CORS configurado
- ✅ Deployment realizado
- ⚠️ Lambda tiene error interno (módulo faltante) - necesita redeploy

## 📋 Configuración en Vercel

### Variables de Entorno Requeridas

1. Ve a: https://vercel.com/dashboard → `suplementia` → Settings → Environment Variables

2. Agrega estas variables:

```bash
# Backend API (REQUERIDO para datos reales)
PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend

# DynamoDB Tables (opcional por ahora, usa staging)
PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging
PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging
PORTAL_SUBSCRIPTIONS_TABLE=ankosoft-portal-subscriptions-staging
```

3. Selecciona todos los ambientes: **Production**, **Preview**, **Development**

4. Guarda y espera el redeploy automático

## ⚠️ Nota Importante

El Lambda tiene un error interno relacionado con un módulo faltante (`redis-cache.mjs`). Esto necesita ser corregido en el deployment del Lambda. El endpoint está configurado correctamente, pero el Lambda necesita ser actualizado.

## 🧪 Prueba del Endpoint

```bash
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "category": "muscle-gain",
    "age": 35,
    "gender": "male",
    "location": "CDMX"
  }'
```

**Respuesta esperada:** Error 502 (Lambda error) hasta que se corrija el Lambda, pero el endpoint está funcionando.

## 🔄 Próximos Pasos

1. ✅ Endpoint configurado en API Gateway
2. ⏳ Corregir error del Lambda (módulo faltante)
3. ⏳ Agregar variables de entorno en Vercel
4. ⏳ Probar desde el portal
5. ⏳ Verificar que los datos se guardan en DynamoDB

