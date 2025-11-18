# 🔧 Variables de Entorno Requeridas en Vercel

Para que el portal funcione con datos reales del backend, necesitas configurar estas variables en Vercel:

## Variables Requeridas

### 1. Backend API URL
```
PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

### 2. DynamoDB Tables
```
PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging
PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging
```

## Cómo Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto "suplementia"
3. Ve a **Settings** → **Environment Variables**
4. Agrega las variables arriba mencionadas
5. Asegúrate de seleccionar los ambientes correctos (Production, Preview, Development)
6. **Redeploy** el proyecto para que los cambios surtan efecto

## Verificación

Después de configurar las variables:

1. Haz una búsqueda en el portal (ej: "Aloe Vera")
2. Revisa los logs de Vercel (Functions → Logs)
3. Deberías ver:
   - `🔗 Calling backend API: https://...`
   - `📥 Backend response status: 200`
   - `✅ Backend response received`

Si ves errores, revisa:
- Que la URL del backend sea correcta
- Que el Lambda tenga permisos para escribir en DynamoDB
- Que las tablas de DynamoDB existan

## Demo Mode

El demo mode solo se activa si:
- `PORTAL_API_URL === 'DISABLED'` o `PORTAL_API_URL === 'false'`

Si `PORTAL_API_URL` tiene cualquier otro valor (incluyendo la URL de staging), el sistema intentará usar el backend real.

